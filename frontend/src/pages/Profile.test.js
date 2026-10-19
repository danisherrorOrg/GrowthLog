import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Profile from './Profile';

jest.mock('../utils/api', () => ({ get: jest.fn(), put: jest.fn(), post: jest.fn(), delete: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../components/ui/MarkdownRenderer', () => ({ content }) => content);
jest.mock('../utils/pdfExport', () => ({ generateGrowthLogPDF: jest.fn() }));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn(), loading: jest.fn() }));

const USER = {
  id: 'u1', name: 'Sam', email: 'sam@example.com', bio: '', streak: 4, longest_streak: 9,
  category_colors: ['#6b8c6b'], category_icons: ['🧠', '💼'],
};
const STATS = {
  total_logs: 12, total_goals: 4, completed_goals: 1, days_since_join: 30, total_manifestations: 0,
  completed_manifestations: 0, total_snapshots: 1, total_categories: 3, longest_streak: 9,
};

const refreshUser = jest.fn().mockResolvedValue();

function renderProfile() {
  useAuth.mockReturnValue({ user: USER, refreshUser, logout: jest.fn() });
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Profile />
    </MemoryRouter>
  );
}

beforeEach(() => {
  API.get.mockImplementation(url => Promise.resolve({ data: url === '/auth/stats' ? STATS : {} }));
  API.put.mockResolvedValue({ data: {} });
});
afterEach(() => jest.clearAllMocks());

test('shows stats and badge progress', async () => {
  renderProfile();
  expect(await screen.findByText('25% Goal Completion Rate')).toBeInTheDocument();
  expect(screen.getByText('First Step')).toBeInTheDocument();
  expect(screen.getByText('88 more days to go')).toBeInTheDocument();
});

test('saves profile edits, keeping at least one theme color', async () => {
  renderProfile();
  fireEvent.click(screen.getByRole('button', { name: '✎ Edit Profile' }));

  fireEvent.click(screen.getByTitle('Click to remove color'));
  expect(toast.error).toHaveBeenCalledWith('Keep at least one color');

  fireEvent.change(screen.getByPlaceholderText('Your name'), { target: { value: 'Sam R' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

  await waitFor(() => expect(API.put).toHaveBeenCalledWith('/auth/profile', expect.objectContaining({
    name: 'Sam R', category_colors: ['#6b8c6b'], category_icons: ['🧠', '💼'],
  })));
  expect(refreshUser).toHaveBeenCalled();
});

test('checks the new password before sending it', async () => {
  renderProfile();
  fireEvent.click(screen.getByRole('button', { name: '🔒 Change Password' }));

  fireEvent.change(screen.getByPlaceholderText('At least 6 characters'), { target: { value: 'newpass1' } });
  fireEvent.change(screen.getByPlaceholderText('Repeat new password'), { target: { value: 'different' } });
  fireEvent.change(screen.getAllByPlaceholderText('••••••••')[0], { target: { value: 'oldpass' } });
  fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
  expect(toast.error).toHaveBeenCalledWith('New passwords do not match');
  expect(API.put).not.toHaveBeenCalledWith('/auth/password', expect.anything());

  fireEvent.change(screen.getByPlaceholderText('Repeat new password'), { target: { value: 'newpass1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
  await waitFor(() => expect(API.put).toHaveBeenCalledWith('/auth/password', { current_password: 'oldpass', new_password: 'newpass1' }));
  await waitFor(() => expect(screen.queryByPlaceholderText('Repeat new password')).not.toBeInTheDocument());
});
