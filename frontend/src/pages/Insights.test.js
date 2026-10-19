import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import API from '../utils/api';
import Insights from './Insights';

jest.mock('../utils/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: {} }) }));
jest.mock('../components/ui/MarkdownRenderer', () => ({ content }) => content);
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const DATA = {
  '/insights/anti-goals': [{ id: 'a1', text: 'Doomscrolling', reason: 'Wastes evenings', created_at: '2026-10-01' }],
  '/insights/time-entries': [{ id: 't1', date: '2026-10-19', category: 'Deep work', hours: 3, notes: '' }],
  '/insights/screen-time': [],
};

beforeEach(() => {
  API.get.mockImplementation(url => Promise.resolve({ data: DATA[url] || [] }));
  API.post.mockResolvedValue({ data: {} });
  API.put.mockResolvedValue({ data: {} });
});
afterEach(() => jest.clearAllMocks());

test('lists anti-goals and adds a new one', async () => {
  render(<Insights />);
  expect(await screen.findByText('Doomscrolling')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '+ Add Anti-Goal' }));
  fireEvent.change(screen.getByPlaceholderText('e.g. Mindless scrolling before bed…'), { target: { value: 'Late coffee' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add Anti-Goal' }));

  await waitFor(() => expect(API.post).toHaveBeenCalledWith('/insights/anti-goals', { text: 'Late coffee', reason: '' }));
});

test('edits a time entry from the Time Tracking tab', async () => {
  render(<Insights />);
  fireEvent.click(screen.getByRole('button', { name: /Time Tracking/ }));
  expect(await screen.findByText('Deep work')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: '✎' }));
  fireEvent.change(screen.getByDisplayValue('3'), { target: { value: '4' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

  await waitFor(() => expect(API.put).toHaveBeenCalledWith(
    '/insights/time-entries/t1', { date: '2026-10-19', category: 'Deep work', hours: 4, notes: '' }
  ));
});

test('logs screen time using a quick-pick category', async () => {
  render(<Insights />);
  fireEvent.click(screen.getByRole('button', { name: /Screen Time/ }));
  fireEvent.click(await screen.findByRole('button', { name: '+ Log Today' }));

  fireEvent.click(screen.getByRole('button', { name: '+ Social' }));
  fireEvent.change(screen.getAllByPlaceholderText('hrs')[1], { target: { value: '1.5' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log Screen Time' }));

  await waitFor(() => expect(API.post).toHaveBeenCalledWith(
    '/insights/screen-time', expect.objectContaining({ app_category: 'Social', hours: 1.5 })
  ));
  expect(API.get).not.toHaveBeenCalledWith('/insights/weaknesses');
});
