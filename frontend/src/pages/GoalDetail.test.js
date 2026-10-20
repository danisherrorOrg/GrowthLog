import { StrictMode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../utils/api';
import GoalDetail from './GoalDetail';

jest.mock('../utils/api', () => ({ get: jest.fn() }));
jest.mock('../components/ui/MarkdownRenderer', () => ({ content }) => content);
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

test('a missing goal shows one "not found" toast', async () => {
  API.get.mockImplementation((url) => (url === '/categories'
    ? Promise.resolve({ data: [] })
    : Promise.reject({ response: { status: 404, data: { detail: 'Goal not found' } } })));

  // StrictMode runs the load effect twice in development, which used to toast twice
  render(
    <StrictMode>
      <MemoryRouter initialEntries={['/goals/abc']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/goals/:goalId" element={<GoalDetail />} />
          <Route path="/goals" element={<div>goals list</div>} />
        </Routes>
      </MemoryRouter>
    </StrictMode>
  );

  expect(await screen.findByText('goals list')).toBeInTheDocument();
  expect(toast.error).toHaveBeenCalledTimes(1);
  expect(toast.error).toHaveBeenCalledWith('Goal not found', { id: 'goal-load-error' });
});
