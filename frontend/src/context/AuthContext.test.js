import { render, screen } from '@testing-library/react';
import API from '../utils/api';
import { AuthProvider, useAuth } from './AuthContext';

jest.mock('../utils/api');

function WhoAmI() {
  const { user, loading } = useAuth();
  if (loading) return <p>loading</p>;
  return <p>{user ? `signed in as ${user.name}` : 'signed out'}</p>;
}

const renderWithAuth = () => render(<AuthProvider><WhoAmI /></AuthProvider>);

test('restores the session from the cookie via /auth/me', async () => {
  API.get.mockResolvedValue({ data: { name: 'Asha' } });
  renderWithAuth();
  expect(await screen.findByText('signed in as Asha')).toBeInTheDocument();
  expect(API.get).toHaveBeenCalledWith('/auth/me', { skipAuthRedirect: true });
});

test('treats a failed /auth/me as signed out', async () => {
  API.get.mockRejectedValue({ response: { status: 401 } });
  renderWithAuth();
  expect(await screen.findByText('signed out')).toBeInTheDocument();
});

test('sends the browser timezone on login and sign-up', async () => {
  API.get.mockRejectedValue({ response: { status: 401 } });
  API.post.mockResolvedValue({ data: { user: { name: 'Asha' } } });
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let auth;
  function Grab() { auth = useAuth(); return null; }
  render(<AuthProvider><Grab /></AuthProvider>);

  await auth.login('a@example.com', 'pw');
  expect(API.post).toHaveBeenLastCalledWith('/auth/login', { email: 'a@example.com', password: 'pw', timezone: tz });
  await auth.register('Asha', 'a@example.com', 'pw');
  expect(API.post).toHaveBeenLastCalledWith('/auth/register', { name: 'Asha', email: 'a@example.com', password: 'pw', timezone: tz });
});
