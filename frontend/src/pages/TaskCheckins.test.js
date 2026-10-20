import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import API from '../utils/api';
import TaskCheckins from './TaskCheckins';

jest.mock('../utils/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));
jest.mock('../components/ui/MarkdownRenderer', () => ({ content }) => content);
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

beforeEach(() => {
  API.get.mockResolvedValue({ data: [] });
  API.post.mockResolvedValue({ data: {} });
});
afterEach(() => jest.clearAllMocks());

test('quick mode asks as many questions as its label says and saves each answer', async () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><TaskCheckins /></MemoryRouter>);
  await waitFor(() => expect(API.get).toHaveBeenCalledWith('/checkins'));

  fireEvent.click(screen.getByRole('button', { name: '+ New Check-In' }));
  expect(screen.getByRole('button', { name: /Full \(18 questions\)/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Quick \(4 questions\)/ }));
  fireEvent.change(screen.getByPlaceholderText(/Refactor auth module/), { target: { value: 'Write report' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Questions →' }));

  const answers = screen.getAllByPlaceholderText('Your honest answer... (markdown supported)');
  expect(answers).toHaveLength(4);
  answers.forEach((box, i) => fireEvent.change(box, { target: { value: `answer ${i + 1}` } }));

  fireEvent.click(screen.getByRole('button', { name: 'Go to Verdict →' }));
  fireEvent.click(screen.getByRole('button', { name: '✦ Save Check-In' }));

  await waitFor(() => expect(API.post).toHaveBeenCalled());
  expect(API.post.mock.calls[0][1]).toMatchObject({
    mode: 'quick',
    quick_most_important: 'answer 1',
    quick_real_progress: 'answer 2',
    quick_show_for_30: 'answer 3',
    quick_energy_suited: 'answer 4',
  });
});

test('the verdict is a radio group that works without a mouse', async () => {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><TaskCheckins /></MemoryRouter>);
  await waitFor(() => expect(API.get).toHaveBeenCalledWith('/checkins'));

  fireEvent.click(screen.getByRole('button', { name: '+ New Check-In' }));
  fireEvent.click(screen.getByRole('button', { name: /Quick \(4 questions\)/ }));
  fireEvent.change(screen.getByPlaceholderText(/Refactor auth module/), { target: { value: 'Write report' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to Questions →' }));
  fireEvent.click(screen.getByRole('button', { name: 'Go to Verdict →' }));

  const group = screen.getByRole('radiogroup', { name: /Final Verdict/ });
  const radios = within(group).getAllByRole('radio');
  expect(radios).toHaveLength(3);
  expect(within(group).getByRole('radio', { name: /Continue/ })).toBeChecked();

  const drop = within(group).getByRole('radio', { name: /Drop \/ Delegate/ });
  fireEvent.click(drop);
  expect(drop).toBeChecked();

  fireEvent.click(screen.getByRole('button', { name: '✦ Save Check-In' }));
  await waitFor(() => expect(API.post).toHaveBeenCalled());
  expect(API.post.mock.calls[0][1]).toMatchObject({ verdict: 'drop' });
});

test('the stat cards are buttons that show which filter is on', async () => {
  API.get.mockImplementation(url => Promise.resolve({
    data: url === '/checkins/stats/summary' ? { total: 3, continue_count: 1, pause_count: 1, drop_count: 1 } : [],
  }));
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><TaskCheckins /></MemoryRouter>);

  const paused = await screen.findByRole('button', { name: /^Paused: 1/ });
  expect(paused).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(paused);
  expect(paused).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: /^Total Check-ins: 3/ })).toHaveAttribute('aria-pressed', 'false');
});
