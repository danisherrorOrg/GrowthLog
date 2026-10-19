import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import API from '../../utils/api';
import TodayPlan from './TodayPlan';

jest.mock('../../utils/api', () => ({ get: jest.fn() }));

function renderCard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/dashboard" element={<TodayPlan />} />
        <Route path="/plan" element={<p>plan page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => jest.clearAllMocks());

test('asks to plan when to-dos are waiting and links to /plan', async () => {
  API.get.mockResolvedValue({ data: { items: [], candidates: [{ id: 'a' }, { id: 'b' }] } });
  renderCard();

  expect(await screen.findByText('Plan your day ☀️')).toBeInTheDocument();
  expect(screen.getByText(/2 to-dos waiting/)).toBeInTheDocument();
  expect(API.get).toHaveBeenCalledWith('/day-plan', { params: { date: expect.any(String) } });

  fireEvent.click(screen.getByRole('button', { name: 'Plan now →' }));
  expect(await screen.findByText('plan page')).toBeInTheDocument();
});

test('shows progress and open "do now" tasks once the day is planned', async () => {
  API.get.mockResolvedValue({
    data: {
      items: [
        { todo_id: '1', title: 'Write report', verdict: 'do_now', todo_status: 'pending' },
        { todo_id: '2', title: 'Call bank', verdict: 'do_now', todo_status: 'done' },
        { todo_id: '3', title: 'Clean garage', verdict: 'schedule', todo_status: 'pending' },
      ],
      candidates: [],
    },
  });
  renderCard();

  expect(await screen.findByText("Today's plan ☀️")).toBeInTheDocument();
  expect(screen.getByText('1 of 2 "do now" tasks done.')).toBeInTheDocument();
  expect(screen.getByText(/Write report/)).toBeInTheDocument();
  expect(screen.queryByText(/Call bank/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Clean garage/)).not.toBeInTheDocument();
});

test('still links to the Morning Plan when the request fails', async () => {
  API.get.mockRejectedValue(new Error('offline'));
  renderCard();
  expect(await screen.findByRole('button', { name: 'Open →' })).toBeInTheDocument();
});
