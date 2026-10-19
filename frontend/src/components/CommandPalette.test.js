import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import API from '../utils/api';
import CommandPalette from './CommandPalette';

jest.mock('../utils/api', () => ({ get: jest.fn() }));

const PAGES = [
  { to: '/dashboard', icon: '◈', label: 'Dashboard' },
  { to: '/goals', icon: '◇', label: 'Goals' },
];

function renderPalette(onClose = jest.fn()) {
  render(
    <MemoryRouter initialEntries={['/dashboard']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/dashboard" element={<CommandPalette pages={PAGES} onClose={onClose} />} />
        <Route path="/goals" element={<p>goals page</p>} />
        <Route path="/goals/:id" element={<p>goal detail page</p>} />
      </Routes>
    </MemoryRouter>
  );
  return onClose;
}

const input = () => screen.getByRole('combobox');

afterEach(() => jest.clearAllMocks());

test('filters pages locally and opens one with Enter', async () => {
  const onClose = renderPalette();
  fireEvent.change(input(), { target: { value: 'go' } });
  API.get.mockResolvedValue({ data: { results: [] } });

  expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  fireEvent.keyDown(input(), { key: 'Enter' });

  expect(onClose).toHaveBeenCalled();
  expect(await screen.findByText('goals page')).toBeInTheDocument();
});

test('searches entries and opens the highlighted result', async () => {
  API.get.mockResolvedValue({
    data: {
      results: [{
        id: 'g1', type: 'goal', label: 'Goal', title: 'Learn sailing',
        snippet: '', date: '2026-02-01', link: '/goals/g1',
      }],
    },
  });
  renderPalette();
  fireEvent.change(input(), { target: { value: 'sailing' } });

  expect(await screen.findByText('Learn sailing')).toBeInTheDocument();
  expect(API.get).toHaveBeenCalledWith('/search', { params: { q: 'sailing' } });

  fireEvent.keyDown(input(), { key: 'ArrowDown' }); // wraps back to the only row
  fireEvent.keyDown(input(), { key: 'Enter' });
  expect(await screen.findByText('goal detail page')).toBeInTheDocument();
});

test('shows an empty state and closes on Escape', async () => {
  API.get.mockResolvedValue({ data: { results: [] } });
  const onClose = renderPalette();
  fireEvent.change(input(), { target: { value: 'zzzz' } });

  await waitFor(() => expect(screen.getByText('No results for "zzzz"')).toBeInTheDocument());
  fireEvent.keyDown(input(), { key: 'Escape' });
  expect(onClose).toHaveBeenCalled();
});
