import { act, fireEvent, render, screen } from '@testing-library/react';
import API from '../../utils/api';
import WeeklyRitual from './WeeklyRitual';

jest.mock('../../utils/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const PERIOD = { start: '2026-10-12', end: '2026-10-18', label: 'Week of Oct 12, 2026' };

const STATS = {
  log_count: 5, total_days: 7, avg_mood: 7.2, avg_energy: 6.5, goals_completed: 1,
  top_category: { icon: '💼', name: 'Career' },
  highlights: ['Shipped search'],
  quick_checks: { total: 4, go: 2, not_now: 2, caught: 1, done_anyway: 1, worth_it: 0, not_worth_it: 0 },
  decisions: [{ id: 'd1', task: 'Take the course', verdict_title: 'Schedule it', worth_it: true }],
  previous_intentions: { period_label: 'Week of Oct 5, 2026', intentions: 'Finish the ritual' },
};

afterEach(() => jest.clearAllMocks());

// From the Wins step to the last step
function fillInSteps() {
  fireEvent.change(screen.getByLabelText(/What went well/), { target: { value: 'Shipped it' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
  fireEvent.change(screen.getByLabelText(/What was hard/), { target: { value: 'Late nights' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
  fireEvent.change(screen.getByLabelText(/focus on next week/), { target: { value: 'Sleep by 11' } });
}

test('shows the week, then saves a new review', async () => {
  API.get.mockResolvedValue({ data: STATS });
  API.post.mockResolvedValue({ data: {} });
  const onSaved = jest.fn();
  render(<WeeklyRitual period={PERIOD} onClose={() => { }} onSaved={onSaved} />);

  expect(await screen.findByText('Finish the ritual')).toBeInTheDocument();
  expect(API.get).toHaveBeenCalledWith('/reviews/stats', {
    params: { start_date: '2026-10-12', end_date: '2026-10-18', period_type: 'weekly' },
  });
  expect(screen.getByText(/4 quick checks: 2 worth doing/)).toBeInTheDocument();
  expect(screen.getByText('Take the course')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Start reflecting →' }));
  fillInSteps();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '✦ Save review' })); });

  expect(API.post).toHaveBeenCalledWith('/reviews', {
    wins: 'Shipped it', challenges: 'Late nights', learnings: '', intentions: 'Sleep by 11', rating: 7,
    period_type: 'weekly', period_label: PERIOD.label, start_date: PERIOD.start, end_date: PERIOD.end,
  });
  expect(onSaved).toHaveBeenCalled();
});

test('edits the existing review for the week instead of creating another', async () => {
  API.get.mockResolvedValue({ data: { ...STATS, previous_intentions: null } });
  API.put.mockResolvedValue({ data: { success: true } });
  const existing = { id: 'r1', wins: 'Old wins', challenges: '', learnings: 'Rest matters', intentions: '', rating: 8 };
  render(<WeeklyRitual period={PERIOD} existing={existing} onClose={() => { }} onSaved={() => { }} />);

  await screen.findByText('Take the course');
  fireEvent.click(screen.getByRole('button', { name: 'Start reflecting →' }));
  expect(screen.getByLabelText(/What went well/)).toHaveValue('Old wins');
  fillInSteps();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '✦ Save review' })); });

  expect(API.put).toHaveBeenCalledWith('/reviews/r1', {
    wins: 'Shipped it', challenges: 'Late nights', learnings: 'Rest matters', intentions: 'Sleep by 11', rating: 8,
  });
  expect(API.post).not.toHaveBeenCalled();
});
