import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from './Login';

jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));

function renderLogin(path = '/login') {
  render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<p>dashboard page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

test('signs in and goes to the dashboard', async () => {
  const login = jest.fn().mockResolvedValue({});
  useAuth.mockReturnValue({ login });
  renderLogin();

  fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.co' } });
  fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'Password123!' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign In →' }));

  await waitFor(() => expect(login).toHaveBeenCalledWith('a@b.co', 'Password123!'));
  expect(await screen.findByText('dashboard page')).toBeInTheDocument();
});

test('shows the expired-session notice', () => {
  useAuth.mockReturnValue({ login: jest.fn() });
  renderLogin('/login?expired=true');
  expect(screen.getByText(/Session Expired/)).toBeInTheDocument();
});
