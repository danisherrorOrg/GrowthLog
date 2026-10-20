import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import toast from 'react-hot-toast';
import API from '../utils/api';
import Thoughts from './Thoughts';

jest.mock('../utils/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() }));
jest.mock('../components/ui/MarkdownRenderer', () => ({ content }) => content);
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const THOUGHTS = [
  { id: 't1', content: 'Feeling stuck on the report', sentiment: 'Negative', is_bookmarked: false, created_at: '2026-10-20T10:00:00+00:00' },
  { id: 't2', content: 'Great walk this morning', sentiment: 'Positive', is_bookmarked: true, created_at: '2026-10-20T08:00:00+00:00' },
];

beforeEach(() => {
  API.get.mockResolvedValue({ data: THOUGHTS });
  API.post.mockImplementation((url, body) => Promise.resolve({ data: { id: body.content, is_bookmarked: false, ...body } }));
});
afterEach(() => jest.clearAllMocks());

const renderPage = async () => {
  render(<Thoughts />);
  await screen.findByText('Great walk this morning');
};

test('"All" is not shown as selected while the Pinned filter hides thoughts', async () => {
  await renderPage();
  const all = screen.getByRole('button', { name: 'All' });
  expect(all).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(screen.getByRole('button', { name: /Pinned/ }));
  expect(all).toHaveAttribute('aria-pressed', 'false');

  fireEvent.change(screen.getByPlaceholderText('Search thoughts…'), { target: { value: 'stuck' } });
  expect(screen.getByText('No pinned thoughts match "stuck".')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Show all thoughts' }));
  expect(screen.getByText('stuck')).toBeInTheDocument();
  expect(all).toHaveAttribute('aria-pressed', 'true');
});

test('planting an empty thought says why nothing happened', async () => {
  await renderPage();
  fireEvent.change(screen.getByLabelText('New thought'), { target: { value: '   ' } });
  fireEvent.click(screen.getByRole('button', { name: 'Plant Thought ✦' }));
  expect(toast.error).toHaveBeenCalledWith('Write a thought first.');
  expect(API.post).not.toHaveBeenCalled();
});

test('Cmd+Enter or Ctrl+Enter plants the thought', async () => {
  await renderPage();
  const box = screen.getByLabelText('New thought');
  fireEvent.change(box, { target: { value: 'An idea' } });
  fireEvent.keyDown(box, { key: 'Enter', metaKey: true });
  await waitFor(() => expect(API.post).toHaveBeenCalledWith('/thoughts', { content: 'An idea', sentiment: 'Neutral' }));

  fireEvent.change(box, { target: { value: 'Another' } });
  fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true });
  await waitFor(() => expect(API.post).toHaveBeenCalledTimes(2));

  fireEvent.keyDown(box, { key: 'Enter' });
  expect(API.post).toHaveBeenCalledTimes(2);
});
