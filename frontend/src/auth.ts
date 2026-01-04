import { apiFetch } from './api';

//defined types
type User = {
  id: number;
  name: string;
  email: string;
}; 

type Token = {
  access_token: string;
  token_type: string;
};

type LoginRequest = {
  email: string;
  password: string;
};

type RegisterRequest = {
  name: string;
  email: string;
  password: string;
};

//fetches current user info
export async function fetchMe(token: string) {
  const res = await apiFetch("/auth/me", {}, token);
  if (!res.ok) return null;
  return (await res.json()) as User;
}

//logs in user and returns token
export async function login(email: string, password: string) {
  const res = await apiFetch("/auth/token", {
    method: "POST",
    body: JSON.stringify({ email, password } satisfies LoginRequest),
  });
  if (!res.ok) return null;
  return (await res.json()) as Token;
}

//registers new user and returns user info
export async function register(name: string, email: string, password: string) {
  const res = await apiFetch("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password } satisfies RegisterRequest),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || `Register failed (${res.status})`);
  }
  return (await res.json()) as User;
}