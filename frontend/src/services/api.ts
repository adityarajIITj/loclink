const API_BASE = '/api';

// ── Token Management ──

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function removeToken(): void {
  localStorage.removeItem('token');
}

// ── Fetch Helpers ──

async function apiFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Auth ──

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  email: string;
  is_active: boolean;
  created_at: string;
}

export async function register(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<TokenResponse> {
  return apiFetch<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe(): Promise<UserResponse> {
  return apiFetch<UserResponse>('/auth/me');
}

// ── Links ──

export interface LinkResponse {
  id: number;
  name: string;
  token: string;
  url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  visit_count: number;
  location_count: number;
}

export interface LinkListResponse {
  links: LinkResponse[];
  total: number;
}

export async function createLink(name: string, expiresInHours?: number): Promise<LinkResponse> {
  return apiFetch<LinkResponse>('/links', {
    method: 'POST',
    body: JSON.stringify({ name, expires_in_hours: expiresInHours || null }),
  });
}

export async function getLinks(): Promise<LinkListResponse> {
  return apiFetch<LinkListResponse>('/links');
}

export async function getLink(id: number): Promise<LinkResponse> {
  return apiFetch<LinkResponse>(`/links/${id}`);
}

export async function updateLink(id: number, name: string): Promise<LinkResponse> {
  return apiFetch<LinkResponse>(`/links/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

export async function deleteLink(id: number): Promise<void> {
  await apiFetch(`/links/${id}`, { method: 'DELETE' });
}

export async function disableLink(id: number): Promise<LinkResponse> {
  return apiFetch<LinkResponse>(`/links/${id}/disable`, { method: 'POST' });
}

export async function enableLink(id: number): Promise<LinkResponse> {
  return apiFetch<LinkResponse>(`/links/${id}/enable`, { method: 'POST' });
}

export async function getLinkLocations(id: number): Promise<{ locations: LocationResponse[]; total: number }> {
  return apiFetch(`/links/${id}/locations`);
}

// ── Public ──

export async function getPublicLink(token: string): Promise<{ valid: boolean; link_name: string }> {
  const response = await fetch(`${API_BASE}/public/link/${token}`);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Link unavailable' }));
    throw new Error(error.detail || 'Link unavailable');
  }
  return response.json();
}

export async function submitLocation(
  token: string,
  data: { latitude: number; longitude: number; accuracy?: number | null }
): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE}/public/location/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Submission failed' }));
    throw new Error(error.detail || 'Submission failed');
  }
  return response.json();
}

// ── Dashboard ──

export interface DashboardStats {
  total_links: number;
  active_links: number;
  total_visits: number;
  total_locations: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/dashboard/stats');
}

// ── Location ──

export interface LocationResponse {
  id: number;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  captured_at: string;
}

// ── Health ──

export interface HealthResponse {
  status: string;
  database: string;
}

export async function healthCheck(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`);
  return response.json();
}
