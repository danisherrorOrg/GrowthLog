import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import VerifyEmail from './VerifyEmail';

jest.mock('../utils/api', () => ({ get: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const renderAt = () => render(
  <MemoryRouter initialEntries={['/verify/tok123']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/verify/:token" element={<VerifyEmail />} /></Routes>
  </MemoryRouter>
);

afterEach(() => jest.clearAllMocks());

test('verifies without being signed in and offers sign-in', async () => {
  const refreshUser = jest.fn();
  useAuth.mockReturnValue({ user: null, loading: false, refreshUser });
  API.get.mockResolvedValue({ data: { success: true } });

  renderAt();
  expect(await screen.findByRole('heading', { name: 'Email Verified!' })).toBeInTheDocument();
  expect(API.get).toHaveBeenCalledWith('/auth/verify/tok123');
  expect(refreshUser).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
});

test('refreshes the signed-in user after verifying', async () => {
  const refreshUser = jest.fn().mockResolvedValue({});
  useAuth.mockReturnValue({ user: { id: 'u1' }, loading: false, refreshUser });
  API.get.mockResolvedValue({ data: { success: true } });

  renderAt();
  expect(await screen.findByRole('button', { name: 'Go to Dashboard' })).toBeInTheDocument();
  await waitFor(() => expect(refreshUser).toHaveBeenCalledWith(true));
});
