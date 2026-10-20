import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import DailyLog from './DailyLog';

jest.mock('../utils/api', () => ({ get: jest.fn(), post: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: () => ({ refreshUser: jest.fn().mockResolvedValue({}) }) }));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const CATEGORIES = [
  { id: 'c1', name: 'Mind', icon: '🧠', color: '#c9a84c' },
  { id: 'c2', name: 'Body', icon: '💪', color: '#6b8c6b' },
];
const LOGS = {
  '2026-10-01': {
    date: '2026-10-01', highlight: 'Read a lot', overall_rating: 7, gratitude: ['Books'],
    entries: [{ category_id: 'c1', text: 'Finished a book', mood: 8, energy: 6, emotions: [] }],
  },
  '2026-10-02': {
    date: '2026-10-02', highlight: 'Long run', overall_rating: 8, gratitude: [],
    entries: [{ category_id: 'c2', text: 'Ran 10k', mood: 9, energy: 7, emotions: [] }],
  },
};

beforeEach(() => {
  localStorage.clear();
  API.get.mockImplementation((url) => {
    if (url === '/categories') return Promise.resolve({ data: CATEGORIES });
    if (url === '/prompts/daily') return Promise.resolve({ data: {} });
    return Promise.resolve({ data: LOGS[url.replace('/logs/', '')] || null });
  });
});
afterEach(() => jest.clearAllMocks());

// Stands in for the search palette: navigates to another day while the log page stays mounted
function JumpTo({ date }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(`/log?date=${date}`)}>jump</button>;
}

const renderLog = (date) => render(
  <MemoryRouter initialEntries={[`/log?date=${date}`]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <JumpTo date="2026-10-02" />
    <Routes>
      <Route path="/log" element={<DailyLog />} />
      <Route path="/dashboard" element={<div>dashboard</div>} />
    </Routes>
  </MemoryRouter>
);

test('a saved day opens with its written categories expanded', async () => {
  renderLog('2026-10-01');
  expect(await screen.findByDisplayValue('Finished a book')).toBeInTheDocument();
  // Body has nothing written, so it stays collapsed
  expect(screen.queryByPlaceholderText(/How did your body show up/)).not.toBeInTheDocument();
});

test('opening another day from search loads that day', async () => {
  renderLog('2026-10-01');
  await screen.findByDisplayValue('Finished a book');
  fireEvent.click(screen.getByRole('button', { name: 'jump' }));
  expect(await screen.findByDisplayValue('Ran 10k')).toBeInTheDocument();
  expect(screen.queryByDisplayValue('Finished a book')).not.toBeInTheDocument();
  expect(screen.getByDisplayValue('Long run')).toBeInTheDocument();
});

test('blank gratitude lines are not sent', async () => {
  API.post.mockResolvedValue({ data: { streak: 1 } });
  renderLog('2026-10-01');
  await screen.findByDisplayValue('Finished a book');
  fireEvent.click(screen.getByRole('button', { name: /Update Today's Log/ }));
  await waitFor(() => expect(API.post).toHaveBeenCalled());
  expect(API.post.mock.calls[0][1].gratitude).toEqual(['Books']);
});
