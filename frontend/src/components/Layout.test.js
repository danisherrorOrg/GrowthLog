import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Layout from './Layout';

jest.mock('../utils/api', () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() }));
jest.mock('../context/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('react-hot-toast', () => ({ success: jest.fn(), error: jest.fn() }));
jest.mock('./TimezoneBanner', () => () => null);

const setWidth = (width) => {
  act(() => {
    window.innerWidth = width;
    window.dispatchEvent(new Event('resize'));
  });
};

const renderLayout = (path = '/todos') => render(
  <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes>
      <Route element={<Layout />}>
        <Route path="*" element={<div>page</div>} />
      </Route>
    </Routes>
  </MemoryRouter>
);

const sidebar = () => document.getElementById('app-sidebar');

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  window.innerWidth = 1400;
  // Notifications never arrive, so they can't update state after a test ends
  API.get.mockReturnValue(new Promise(() => {}));
  useAuth.mockReturnValue({
    user: { id: 'u1', name: 'Sam', is_verified: true, streak: 3 },
    logout: jest.fn(),
    refreshUser: jest.fn().mockResolvedValue(),
  });
});

test('resizing on desktop keeps a hidden sidebar hidden', () => {
  renderLayout();
  fireEvent.click(screen.getByRole('button', { name: 'Hide sidebar' }));
  expect(sidebar()).toHaveClass('hidden');

  setWidth(1200);
  expect(sidebar()).toHaveClass('hidden');
  expect(screen.getByRole('button', { name: 'Show sidebar' })).toBeInTheDocument();
});

test('the desktop show/hide choice is remembered across reloads', () => {
  const { unmount } = renderLayout();
  fireEvent.click(screen.getByRole('button', { name: 'Hide sidebar' }));
  unmount();

  renderLayout();
  expect(sidebar()).toHaveClass('hidden');
});

test('resizing on a phone does not close the open drawer', () => {
  window.innerWidth = 390;
  renderLayout();
  fireEvent.click(screen.getByRole('button', { name: 'More pages' }));
  expect(sidebar()).toHaveClass('visible');

  // The browser bar collapsing on scroll changes the size without crossing the breakpoint
  setWidth(391);
  expect(sidebar()).toHaveClass('visible');

  setWidth(1200);
  expect(sidebar()).toHaveClass('visible');
  setWidth(390);
  expect(sidebar()).toHaveClass('hidden');
});

test('a hidden sidebar is inert, and a shown one is not', () => {
  renderLayout();
  expect(sidebar()).not.toHaveAttribute('inert');
  const hide = screen.getByRole('button', { name: 'Hide sidebar' });
  hide.focus();
  fireEvent.click(hide);
  expect(sidebar()).toHaveAttribute('inert');
  // Focus moves to the button that brings it back
  expect(screen.getByRole('button', { name: 'Show sidebar' })).toHaveFocus();
});

test('Escape closes the phone drawer and returns focus to "More"', () => {
  window.innerWidth = 390;
  renderLayout();
  const more = screen.getByRole('button', { name: 'More pages' });
  fireEvent.click(more);
  expect(more).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus();

  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(sidebar()).toHaveClass('hidden');
  expect(more).toHaveAttribute('aria-expanded', 'false');
  expect(more).toHaveFocus();
});

test('the profile link highlights on /profile', () => {
  renderLayout('/profile');
  expect(screen.getByRole('link', { name: /Sam/ })).toHaveClass('active');
});

test('every nav item has a keyboard shortcut', () => {
  renderLayout();
  fireEvent.keyDown(document.body, { key: 'y' });
  expect(screen.getByRole('link', { name: 'Growth Analytics' })).toHaveClass('active');
});

test('reopening the desktop sidebar moves focus into it', () => {
  renderLayout();
  fireEvent.click(screen.getByRole('button', { name: 'Hide sidebar' }));
  fireEvent.click(screen.getByRole('button', { name: 'Show sidebar' }));
  expect(screen.getByRole('button', { name: 'Hide sidebar' })).toHaveFocus();
});

test('loading the page does not steal focus into the sidebar', () => {
  renderLayout();
  expect(document.body).toHaveFocus();
});

test('the open phone drawer is a modal: the page behind is inert and does not scroll', () => {
  window.innerWidth = 390;
  renderLayout();
  const main = document.querySelector('main');
  fireEvent.click(screen.getByRole('button', { name: 'More pages' }));

  expect(screen.getByRole('dialog', { name: 'Menu' })).toBe(sidebar());
  expect(main).toHaveAttribute('inert');
  expect(document.querySelector('.top-navbar')).toHaveAttribute('inert');
  expect(document.body.style.overflow).toBe('hidden');

  fireEvent.keyDown(document.body, { key: 'Escape' });
  expect(main).not.toHaveAttribute('inert');
  expect(document.body.style.overflow).toBe('');
  expect(sidebar()).not.toHaveAttribute('role');
});

test('the desktop sidebar is not a modal', () => {
  renderLayout();
  expect(sidebar()).not.toHaveAttribute('role');
  expect(document.querySelector('main')).not.toHaveAttribute('inert');
});

test('the current page link is scrolled into view', () => {
  const box = (top, height) => ({ top, bottom: top + height, height, left: 0, right: 240, width: 240, x: 0, y: top });
  const spy = jest.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
    if (this.classList.contains('sidebar-nav')) return box(100, 500);
    if (this.classList.contains('active')) return box(1400, 44);
    return box(0, 0);
  });
  renderLayout('/history');
  // Scrolled just enough for the link's bottom (1444) to meet the nav's bottom (600)
  expect(document.querySelector('.sidebar-nav').scrollTop).toBe(844);
  spy.mockRestore();
});

test('nav groups are headings and the bell has a label', () => {
  renderLayout();
  expect(screen.getByRole('heading', { name: 'Daily Actions' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
});

test('at exactly 900px the sidebar uses the phone layout, like the CSS', () => {
  window.innerWidth = 900;
  renderLayout();
  expect(sidebar()).toHaveClass('hidden');
  expect(screen.getByRole('button', { name: 'More pages' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Show sidebar' })).not.toBeInTheDocument();
});

test.each([
  ['/checkins', 'Decision Matrix'],
  ['/checkins/abc', 'Decision Matrix'],
  ['/books/abc', 'Knowledge Vault'],
  ['/snapshots/abc', 'Temporal Space'],
  ['/goals/abc', 'Goals'],
])('%s highlights %s in the sidebar', (path, label) => {
  renderLayout(path);
  const link = screen.getByRole('link', { name: label });
  expect(link).toHaveClass('active');
  expect(link).toHaveAttribute('aria-current', 'page');
  expect(document.querySelectorAll('.nav-item.active')).toHaveLength(1);
});

test('/growth-hub does not also highlight Growth Analytics', () => {
  renderLayout('/growth-hub');
  expect(screen.getByRole('link', { name: 'Growth Analytics' })).not.toHaveClass('active');
  expect(screen.getByRole('link', { name: 'Growth Hub' })).toHaveClass('active');
});

test('"More" lights up on phones for pages that are not in the bottom bar', () => {
  window.innerWidth = 390;
  const { unmount } = renderLayout('/goals');
  expect(screen.getByRole('button', { name: 'More pages' })).toHaveClass('active');
  unmount();

  renderLayout('/todos');
  expect(screen.getByRole('button', { name: 'More pages' })).not.toHaveClass('active');
});

test('the profile link keeps a long name on one line and shows it in full on hover', () => {
  useAuth.mockReturnValue({
    user: { id: 'u1', name: 'Alexandria Konstantinopoulou-Vanderbilt', is_verified: true },
    logout: jest.fn(),
    refreshUser: jest.fn().mockResolvedValue(),
  });
  renderLayout();
  const link = screen.getByRole('link', { name: /Alexandria/ });
  expect(link.querySelector('.nav-profile-name')).toHaveTextContent('Alexandria Konstantinopoulou-Vanderbilt');
  expect(link).toHaveAttribute('title', 'Profile: Alexandria Konstantinopoulou-Vanderbilt');
});

test('the keyboard shortcuts button is only shown on desktop', () => {
  const { unmount } = renderLayout();
  expect(screen.getByRole('button', { name: 'Keyboard shortcuts' })).toBeInTheDocument();
  unmount();

  window.innerWidth = 390;
  renderLayout();
  expect(screen.queryByRole('button', { name: 'Keyboard shortcuts' })).not.toBeInTheDocument();
});

test('"Skip to content" is the first link and moves focus to the page', () => {
  renderLayout();
  const skip = screen.getByRole('link', { name: 'Skip to content' });
  expect(document.querySelector('.app-shell').firstElementChild).toBe(skip);
  fireEvent.click(skip);
  expect(document.querySelector('main')).toHaveFocus();
});

test('"Skip to content" is not offered while the phone drawer is open', () => {
  window.innerWidth = 390;
  renderLayout();
  fireEvent.click(screen.getByRole('button', { name: 'More pages' }));
  expect(screen.queryByRole('link', { name: 'Skip to content' })).not.toBeInTheDocument();
});

test('the layout leaves the <h1> to the page, so the logo is not a heading', () => {
  renderLayout();
  expect(screen.getByText('GrowthLog').tagName).toBe('P');
  expect(document.querySelector('.app-shell h1')).toBeNull();
});
