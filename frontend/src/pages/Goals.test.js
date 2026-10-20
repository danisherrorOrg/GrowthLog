import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { localDate } from '../utils/dates';
import Goals from './Goals';

jest.mock('../utils/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: {} }) }));
jest.mock('../components/ui/MarkdownRenderer', () => ({ content }) => content);
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const CATEGORY = { id: 'c1', name: 'Mind', icon: '🧠', color: '#6b8c6b' };

beforeEach(() => {
  API.get.mockImplementation((url) => Promise.resolve({ data: url === '/categories' ? [CATEGORY] : [] }));
});
afterEach(() => jest.clearAllMocks());

const openNewGoal = async () => {
  const { container } = render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Goals /></MemoryRouter>
  );
  await waitFor(() => expect(API.get).toHaveBeenCalledWith('/categories'));
  fireEvent.click(await screen.findByRole('button', { name: '+ New Goal' }));
  fireEvent.change(screen.getByPlaceholderText('What do you want to achieve?'), { target: { value: 'Run 10k' } });
  return container.querySelector('input[type="date"]');
};

test('a new goal needs a deadline, and not one in the past', async () => {
  const deadline = await openNewGoal();
  expect(deadline).toHaveAttribute('min', localDate());
  expect(deadline).toBeRequired();

  fireEvent.click(screen.getByRole('button', { name: 'Create Goal' }));
  expect(toast.error).toHaveBeenLastCalledWith('Pick a target deadline');

  fireEvent.change(deadline, { target: { value: '2020-01-01' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Goal' }));
  expect(toast.error).toHaveBeenLastCalledWith("The deadline can't be in the past");
  expect(API.post).not.toHaveBeenCalled();
});

test('a goal due today can be created', async () => {
  API.post.mockResolvedValue({ data: {} });
  const deadline = await openNewGoal();
  fireEvent.change(deadline, { target: { value: localDate() } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Goal' }));
  await waitFor(() => expect(API.post).toHaveBeenCalledWith('/goals', {
    category_id: 'c1', title: 'Run 10k', description: '', deadline: localDate(),
  }));
});
