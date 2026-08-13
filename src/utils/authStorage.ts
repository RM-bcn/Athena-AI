import { UserAccount } from '../types';

export const AUTH_TOKEN_KEY = 'athena_auth_token';
export const ACTIVE_USER_KEY = 'athena_active_user';
export const GUEST_MODE_KEY = 'athena_guest_mode';

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getActiveUser(): UserAccount | null {
  for (const store of [window.localStorage, sessionStore()]) {
    if (!store) continue;
    try {
      const raw = store.getItem(ACTIVE_USER_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export function isGuestMode(): boolean {
  try {
    return window.localStorage.getItem(GUEST_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveLogin(user: UserAccount, token: string | undefined, remember: boolean): void {
  const store = remember ? window.localStorage : sessionStore();
  if (!store) return;
  try {
    if (remember) {
      sessionStore()?.removeItem(ACTIVE_USER_KEY);
    } else {
      window.localStorage.removeItem(ACTIVE_USER_KEY);
    }
    store.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    if (token) store.setItem(AUTH_TOKEN_KEY, token);
  } catch (e) {
    console.error(e);
  }
}

export function saveAuthToken(token: string, remember: boolean): void {
  try {
    if (remember) {
      sessionStore()?.removeItem(AUTH_TOKEN_KEY);
      window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStore()?.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch (e) {
    console.error(e);
  }
}

export function updateActiveUser(user: UserAccount): void {
  for (const store of [window.localStorage, sessionStore()]) {
    if (!store || !store.getItem(ACTIVE_USER_KEY)) continue;
    try {
      store.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
  }
}

export function clearSession(): void {
  for (const store of [window.localStorage, sessionStore()]) {
    if (!store) continue;
    try {
      store.removeItem(ACTIVE_USER_KEY);
      store.removeItem(AUTH_TOKEN_KEY);
    } catch (e) {
      console.error(e);
    }
  }
  try {
    window.localStorage.removeItem(GUEST_MODE_KEY);
  } catch (e) {
    console.error(e);
  }
}
