import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import API from '../utils/api';
import MorningPlan from './MorningPlan';

jest.mock('../utils/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const taskA = { id: 'a', title: 'Clean the garage', priority: 'low', urgent: false };
const taskB = { id: 'b', title: 'Call the bank', priority: 'medium', urgent: false };

afterEach(() => jest.clearAllMocks());

const renderPage = () => render(
  <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><MorningPlan /></MemoryRouter>
);

test('adding a task while rating another keeps the ratings on the task being rated', async () => {
  API.get.mockResolvedValueOnce({ data: { items: [], candidates: [taskA] } });
  renderPage();
  expect(await screen.findByRole('heading', { name: 'Clean the garage' })).toBeInTheDocument();

  const goals = screen.getByRole('radiogroup', { name: 'Does it move one of my goals?' });
  fireEvent.click(within(goals).getByRole('radio', { name: '4' }));

  // The API sorts the new medium-priority task ahead of the low-priority one.
  API.get.mockResolvedValueOnce({ data: { items: [], candidates: [taskB, taskA] } });
  API.post.mockResolvedValueOnce({ data: {} });
  fireEvent.change(screen.getByLabelText('Add a task'), { target: { value: 'Call the bank' } });
  fireEvent.click(screen.getByRole('button', { name: '+ Add' }));
  await waitFor(() => expect(API.get).toHaveBeenCalledTimes(2));

  expect(screen.getByRole('heading', { name: 'Clean the garage' })).toBeInTheDocument();
  expect(screen.getByText('Task 1 of 2')).toBeInTheDocument();
  const goalsAfter = screen.getByRole('radiogroup', { name: 'Does it move one of my goals?' });
  expect(within(goalsAfter).getByRole('radio', { name: '4' })).toHaveAttribute('aria-checked', 'true');
});

test('after skipping, the card moves to the next task in the list', async () => {
  API.get.mockResolvedValueOnce({ data: { items: [], candidates: [taskA, taskB] } });
  renderPage();
  expect(await screen.findByRole('heading', { name: 'Clean the garage' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Skip for now →' }));
  expect(screen.getByRole('heading', { name: 'Call the bank' })).toBeInTheDocument();
});
