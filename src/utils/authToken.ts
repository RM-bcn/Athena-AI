export const AUTH_TOKEN_KEY = 'athena_auth_token';

export function getToken(): string {
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      const token = store.getItem(AUTH_TOKEN_KEY);
      if (token) return token;
    } catch {
      // storage niet beschikbaar
    }
  }
  return '';
}

export function setToken(token: string): void {
  try {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // storage niet beschikbaar
  }
}

export function clearToken(): void {
  for (const store of [window.localStorage, window.sessionStorage]) {
    try {
      store.removeItem(AUTH_TOKEN_KEY);
    } catch {
      // storage niet beschikbaar
    }
  }
}
