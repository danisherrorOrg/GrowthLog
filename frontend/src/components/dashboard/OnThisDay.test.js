import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import API from '../../utils/api';
import OnThisDay from './OnThisDay';

jest.mock('../../utils/api', () => ({ get: jest.fn() }));

function LogPage() {
  return <p>log page {useLocation().search}</p>;
}

function renderCard() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/dashboard" element={<OnThisDay />} />
        <Route path="/log" element={<LogPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const MEMORIES = [
  {
    date: '2025-10-20', years_ago: 1, highlight: 'Finished the marathon', overall_rating: 9,
    gratitude: ['Friends'], entry_count: 4,
    entries: [{ text: 'Ran 42k', category: { name: 'Body', icon: '💪', color: '#6b8c6b' } }],
  },
  {
    date: '2023-10-20', years_ago: 3, highlight: 'First day at the new job', overall_rating: 7,
    gratitude: [], entry_count: 0, entries: [],
  },
];

afterEach(() => jest.clearAllMocks());

test('renders nothing when there are no memories', async () => {
  API.get.mockResolvedValue({ data: [] });
  const { container } = renderCard();
  await act(async () => { });
  expect(API.get).toHaveBeenCalledWith('/dashboard/on-this-day');
  expect(container).toBeEmptyDOMElement();
});

test('shows the newest memory and switches years', async () => {
  API.get.mockResolvedValue({ data: MEMORIES });
  renderCard();

  expect(await screen.findByText('Finished the marathon')).toBeInTheDocument();
  expect(screen.getByText('Ran 42k')).toBeInTheDocument();
  expect(screen.getByText('+3 more entries')).toBeInTheDocument();
  expect(screen.getByText(/Grateful for: Friends/)).toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: '3 years ago' }));
  expect(screen.getByText('First day at the new job')).toBeInTheDocument();
  expect(screen.queryByText('Ran 42k')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Open that day →' }));
  expect(await screen.findByText('log page ?date=2023-10-20')).toBeInTheDocument();
});
