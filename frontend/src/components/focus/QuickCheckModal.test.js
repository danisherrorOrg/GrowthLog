import { act, fireEvent, render, screen } from '@testing-library/react';
import API from '../../utils/api';
import QuickCheckModal from './QuickCheckModal';

jest.mock('../../utils/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));

const CHECK = { id: 'c1', verdict: 'go', reason: 'It moves today.', score: 80, text: 'Fix the bug' };

async function getVerdict() {
  API.get.mockResolvedValue({ data: [] });
  API.post.mockResolvedValue({ data: CHECK });
  API.put.mockResolvedValue({ data: {} });
  render(<QuickCheckModal onClose={() => { }} />);
  fireEvent.change(screen.getByLabelText('What are you about to do?'), { target: { value: 'Fix the bug' } });
  for (const group of screen.getAllByRole('radiogroup')) fireEvent.click(group.querySelector('button'));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Check it' })); });
  expect(await screen.findByText('🟢 Go ahead')).toBeInTheDocument();
}

afterEach(() => jest.clearAllMocks());

test('sends the expected time when starting it', async () => {
  await getVerdict();
  fireEvent.click(screen.getByRole('radio', { name: '15m' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '▶ Start it' })); });
  expect(API.put).toHaveBeenCalledWith('/quick-checks/c1', { action: 'doing', expected_minutes: 15 });
});

test('the expected time is optional and not sent when parking', async () => {
  await getVerdict();
  fireEvent.click(screen.getByRole('radio', { name: '15m' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '🅿 Park for later' })); });
  expect(API.put).toHaveBeenCalledWith('/quick-checks/c1', { action: 'parked' });
});
