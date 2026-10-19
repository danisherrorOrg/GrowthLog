import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import API from '../utils/api';
import Todos from './Todos';

jest.mock('../utils/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() }));
jest.mock('../components/ui/MarkdownRenderer', () => ({ content }) => content);
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const TODO = { id: 't1', title: 'Write tests', description: '', status: 'pending', priority: 'high', estimated_minutes: 30 };

beforeEach(() => {
  window.scrollTo = jest.fn();
  API.get.mockResolvedValue({ data: [TODO] });
});
afterEach(() => jest.clearAllMocks());

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
