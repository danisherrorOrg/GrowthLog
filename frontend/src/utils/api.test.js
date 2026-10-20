import API, { setSigningOut } from './api';

const onError = API.interceptors.response.handlers[0].rejected;
const realLocation = window.location;

function setPath(pathname) {
  delete window.location;
  window.location = { pathname, href: pathname };
}

afterEach(() => {
  window.location = realLocation;
});

test('sends the session cookie and the CSRF header', () => {
  expect(API.defaults.withCredentials).toBe(true);
  expect(API.defaults.headers['X-Requested-With']).toBe('XMLHttpRequest');
});

test('a 401 on an app page redirects to login', async () => {
  setPath('/dashboard');
  await expect(onError({ response: { status: 401 }, config: {} })).rejects.toBeTruthy();
  expect(window.location.href).toBe('/login?expired=true');
});

test('a 401 on a signed-out page or a session probe does not redirect', async () => {
  setPath('/reset-password/abc');
  await expect(onError({ response: { status: 401 }, config: {} })).rejects.toBeTruthy();
  expect(window.location.href).toBe('/reset-password/abc');

  setPath('/dashboard');
  await expect(onError({ response: { status: 401 }, config: { skipAuthRedirect: true } })).rejects.toBeTruthy();
  expect(window.location.href).toBe('/dashboard');
});

test('a 401 while signing out does not show "Session Expired"', async () => {
  setPath('/dashboard');
  setSigningOut(true);
  try {
    await expect(onError({ response: { status: 401 }, config: {} })).rejects.toBeTruthy();
    expect(window.location.href).toBe('/dashboard');
  } finally {
    setSigningOut(false);
  }
});
