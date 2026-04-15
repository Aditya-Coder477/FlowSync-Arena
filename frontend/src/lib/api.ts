// API client — all backend calls go through here

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })

  if (!res.ok) {
    let detail = `Request failed: ${res.status}`
    try {
      const json = await res.json()
      detail = json.detail ?? detail
    } catch {}
    throw new Error(detail)
  }

  return res.json() as Promise<T>
}

// ── Zones ──────────────────────────────────────────────────────────────────

import type {
  ZoneStatus, Zone, QueueLive, RouteRecommendation,
  Alert, StaffTask, AdminAnalytics, ControlRoomData
} from './types'

export const api = {
  zones: {
    status: () => request<ZoneStatus>('/zones/status'),
    detail: (id: string) => request<Zone>(`/zones/${id}`),
  },

  routes: {
    recommend: (from_zone: string, to_zone: string) =>
      request<RouteRecommendation>('/routes/recommend', {
        method: 'POST',
        body: JSON.stringify({ from_zone, to_zone }),
      }),
  },

  queues: {
    live: () => request<QueueLive>('/queues/live'),
  },

  alerts: {
    list: () => request<Alert[]>('/alerts'),
    create: (body: { severity: string; title: string; message: string; zone_id?: string }) =>
      request<{ id: string; message: string }>('/alerts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    resolve: (id: string) =>
      request<{ id: string; message: string }>(`/alerts/${id}/resolve`, { method: 'POST' }),
  },

  admin: {
    analytics: () => request<AdminAnalytics>('/admin/analytics'),
    tasks: (status?: string) => request<StaffTask[]>(`/admin/tasks${status ? `?status=${status}` : ''}`),
    createTask: (body: { priority: string; title: string; description?: string; zone_id?: string }) =>
      request<{ id: string; message: string }>('/admin/tasks', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    updateTaskStatus: (id: string, status: string) =>
      request<{ id: string; status: string }>(`/admin/tasks/${id}/status?status=${status}`, {
        method: 'PATCH',
      }),
    controlRoom: () => request<ControlRoomData>('/admin/control-room'),
  },
}
