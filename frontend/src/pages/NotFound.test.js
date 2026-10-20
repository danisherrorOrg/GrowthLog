import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import NotFound from './NotFound';

test('unknown URLs show a not-found page with a way back', () => {
  render(
    <MemoryRouter initialEntries={['/no-such-page']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/dashboard" element={<p>Dashboard</p>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument();
  expect(screen.getByText('/no-such-page')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Go to Dashboard' })).toHaveAttribute('href', '/dashboard');
});
