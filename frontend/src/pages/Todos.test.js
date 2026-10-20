import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import API from '../utils/api';
import Todos from './Todos';

jest.mock('../utils/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() }));
jest.mock('../components/ui/MarkdownRenderer', () => ({ content }) => content);
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const KEY = 'growthlog.focusSession.anon';
const TODO = { id: 't1', title: 'Write tests', description: '', status: 'pending', priority: 'high', estimated_minutes: 30 };

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = jest.fn();
  API.get.mockResolvedValue({ data: [TODO] });
});
afterEach(() => { jest.clearAllMocks(); jest.useRealTimers(); });

test('adds a task from the new-task form', async () => {
  API.post.mockResolvedValue({ data: { ...TODO, id: 't2', title: 'Ship it', priority: 'medium' } });
  render(<Todos />);
  expect(await screen.findByText('Write tests')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '+ New Task' }));
  fireEvent.change(screen.getByPlaceholderText('What needs to be done?'), { target: { value: 'Ship it' } });
  fireEvent.click(screen.getByRole('button', { name: '1h' }));
  fireEvent.click(screen.getByRole('button', { name: 'Capture Task ✦' }));

  await waitFor(() => expect(API.post).toHaveBeenCalledWith('/todos', {
    title: 'Ship it', description: '', priority: 'medium', due_date: '', estimated_minutes: 60,
  }));
  expect(await screen.findByText('Ship it')).toBeInTheDocument();
  expect(screen.queryByPlaceholderText('What needs to be done?')).not.toBeInTheDocument();
});

test('completes the focused task with the actual time', async () => {
  API.patch.mockResolvedValue({ data: { ...TODO, status: 'done', actual_minutes: 45 } });
  render(<Todos />);

  fireEvent.click(await screen.findByRole('button', { name: '⏱️ Focus' }));
  expect(screen.getByText('"Write tests"')).toBeInTheDocument();
  expect(screen.getByText('Focus Mode Active')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '✓ Complete Task' }));
  fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
  fireEvent.change(screen.getByPlaceholderText('mins'), { target: { value: '45' } });
  fireEvent.click(screen.getByRole('button', { name: 'Mark as Done ✓' }));

  await waitFor(() => expect(API.patch).toHaveBeenCalledWith('/todos/t1/complete', { actual_minutes: 45 }));
  expect(await screen.findByText(/Select a task below/)).toBeInTheDocument();
});


test('a running focus session survives leaving the page and keeps counting', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-20T10:00:00Z'));
  const first = render(<Todos />);
  fireEvent.click(await screen.findByRole('button', { name: '⏱️ Focus' }));
  expect(screen.getByText('25:00')).toBeInTheDocument();
  first.unmount();

  // Ten minutes pass on another page
  jest.setSystemTime(JSON.parse(localStorage.getItem(KEY)).runningSince + 10 * 60 * 1000);
  render(<Todos />);
  expect(await screen.findByText('"Write tests"')).toBeInTheDocument();
  expect(screen.getByText('15:00')).toBeInTheDocument();
  expect(screen.getByText('Focus Mode Active')).toBeInTheDocument();

  act(() => { jest.advanceTimersByTime(5000); });
  expect(screen.getByText('14:55')).toBeInTheDocument();
});

test('a session that ran out while away opens the complete dialog with the time', async () => {
  localStorage.setItem(KEY, JSON.stringify({
    todo: { id: 't1', title: 'Write tests' }, duration: 1500, bankedRound: 0, bankedTotal: 0,
    runningSince: Date.now() - 2 * 3600 * 1000,
  }));
  API.patch.mockResolvedValue({ data: { ...TODO, status: 'done', actual_minutes: 25 } });
  render(<Todos />);

  expect(await screen.findByText('Focus Session Paused')).toBeInTheDocument();
  expect(screen.getByText('00:00')).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Mark as Done ✓' }));
  // Only the 25-minute countdown counts, not the two hours away
  await waitFor(() => expect(API.patch).toHaveBeenCalledWith('/todos/t1/complete', { actual_minutes: 25 }));
});

test('switching presets mid-session asks first', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-20T10:00:00Z'));
  render(<Todos />);
  fireEvent.click(await screen.findByRole('button', { name: '⏱️ Focus' }));
  act(() => { jest.advanceTimersByTime(90 * 1000); });
  expect(screen.getByText('23:30')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '50m' }));
  expect(screen.getByText('Restart the timer?')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
  expect(screen.getByText('23:30')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '50m' }));
  fireEvent.click(screen.getByRole('button', { name: 'Switch to 50m' }));
  expect(screen.getByText('50:00')).toBeInTheDocument();
  // Time already focused still counts toward the task
  expect(JSON.parse(localStorage.getItem(KEY)).bankedTotal).toBe(90);
});

test('a saved session for a task that no longer exists is dropped', async () => {
  localStorage.setItem(KEY, JSON.stringify({
    todo: { id: 'gone', title: 'Old task' }, duration: 1500, bankedRound: 60, bankedTotal: 60, runningSince: null,
  }));
  render(<Todos />);
  expect(await screen.findByText(/Select a task below/)).toBeInTheDocument();
  expect(localStorage.getItem(KEY)).toBeNull();
});
