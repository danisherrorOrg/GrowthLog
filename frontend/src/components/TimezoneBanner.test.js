import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { browserTimezone } from '../utils/dates';
import TimezoneBanner from './TimezoneBanner';

jest.mock('../utils/api');
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('../utils/dates', () => ({ browserTimezone: jest.fn() }));

const refreshUser = jest.fn();

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  browserTimezone.mockReturnValue('Asia/Kolkata');
});

test('stays hidden when the device and account use the same clock', () => {
  useAuth.mockReturnValue({ user: { timezone: 'Asia/Calcutta' }, refreshUser });
  const { container } = render(<TimezoneBanner />);
  expect(container).toBeEmptyDOMElement();
});

test('switches the account to the device timezone', async () => {
  useAuth.mockReturnValue({ user: { timezone: 'UTC' }, refreshUser });
  API.put.mockResolvedValue({ data: { success: true } });
  render(<TimezoneBanner />);

  fireEvent.click(screen.getByRole('button', { name: 'Use Asia/Kolkata' }));
  await waitFor(() => expect(API.put).toHaveBeenCalledWith('/auth/profile', { timezone: 'Asia/Kolkata' }));
  expect(refreshUser).toHaveBeenCalledWith(true);
});

test('"Keep" hides it and remembers the choice for this pair of zones', () => {
  useAuth.mockReturnValue({ user: { timezone: 'UTC' }, refreshUser });
  const { container, unmount } = render(<TimezoneBanner />);
  fireEvent.click(screen.getByRole('button', { name: 'Keep UTC' }));
  expect(container).toBeEmptyDOMElement();
  unmount();

  const again = render(<TimezoneBanner />);
  expect(again.container).toBeEmptyDOMElement();
  expect(API.put).not.toHaveBeenCalled();
});
