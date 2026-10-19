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
