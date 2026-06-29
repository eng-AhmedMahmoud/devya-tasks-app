import { appConfig } from './config';
import type {
  AssessmentResponse,
  AuthUser,
  DailyTemplate,
  HistoryDay,
  Task,
  TaskQuality,
  TaskStatus,
  TaskType,
  TeamMember,
} from './types';

export class ApiError extends Error {
  constructor(public status: number, public body: unknown, message: string) {
    super(message);
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit & { cookieHeader?: string }): Promise<T> {
  const { cookieHeader, ...rest } = init ?? {};
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(rest.headers as Record<string, string> | undefined),
  };
  if (cookieHeader) headers['cookie'] = cookieHeader;

  const isServer = typeof window === 'undefined';
  const base = isServer
    ? process.env.API_PROXY_TARGET ?? 'https://api.devya-solutions.com'
    : appConfig.apiUrl;

  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers,
    credentials: 'include',
    cache: 'no-store',
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {}
    const message =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Request failed with ${res.status}`;
    throw new ApiError(res.status, body, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  type: TaskType;
  ownerUserId?: string | null;
  ownerName?: string | null;
  important: boolean;
  deadlineAt: string;
  deadlineHasTime: boolean;
  meeting?: {
    date: string;
    time: string;
    calendarSlug: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    company?: string;
    attendees?: string[];
  };
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string | null;
  ownerUserId?: string | null;
  ownerName?: string | null;
  important?: boolean;
  deadlineAt?: string;
  deadlineHasTime?: boolean;
  status?: Exclude<TaskStatus, 'DONE'>;
}

export interface UploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
}

// ── Meeting requests (booking lifecycle, spec §4)

export type BookingStatus =
  | 'PENDING'
  | 'COUNTER_PROPOSED'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED';

export interface MeetingRequest {
  id: string;
  calendarSlug: string;
  calendarLabel: string;
  calendarColor: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  company: string | null;
  notes: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: BookingStatus;
  acceptedByName: string | null;
  proposedSlots:
    | Array<{ scheduledAt: string; durationMinutes: number }>
    | null;
  clientPickUrl: string | null;
  createdAt: string;
}

export interface AcceptBookingBody {
  acceptedByName: string;
  ownerUserId?: string;
}

export interface CounterProposeBookingBody {
  slots: Array<{ date: string; time: string; durationMinutes?: number }>;
  acceptedByName: string;
  note?: string;
}

export const api = {
  me: (cookieHeader?: string) => apiFetch<{ user: AuthUser }>('/api/auth/me', { cookieHeader }),
  login: (email: string, password: string) =>
    apiFetch<{ user: AuthUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiFetch<void>('/api/auth/logout', { method: 'POST' }),

  team: (cookieHeader?: string) =>
    apiFetch<TeamMember[]>('/api/admin/task-team/members', { cookieHeader }),

  listTasks: (params: { day?: string; from?: string; to?: string; ownerUserId?: string; status?: TaskStatus; active?: boolean } = {}, cookieHeader?: string) => {
    const q = new URLSearchParams();
    if (params.day) q.set('day', params.day);
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    if (params.ownerUserId) q.set('ownerUserId', params.ownerUserId);
    if (params.status) q.set('status', params.status);
    if (params.active !== undefined) q.set('active', String(params.active));
    return apiFetch<Task[]>(`/api/admin/tasks${q.toString() ? '?' + q.toString() : ''}`, { cookieHeader });
  },
  getTask: (id: string, cookieHeader?: string) =>
    apiFetch<Task>(`/api/admin/tasks/${id}`, { cookieHeader }),
  createTask: (body: CreateTaskPayload) =>
    apiFetch<Task>('/api/admin/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: string, body: UpdateTaskPayload) =>
    apiFetch<Task>(`/api/admin/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delayTask: (id: string, body: { toDay: string; reason: string }) =>
    apiFetch<Task>(`/api/admin/tasks/${id}/delay`, { method: 'POST', body: JSON.stringify(body) }),
  completeTask: (id: string, body: { fileUrl?: string; fileType?: 'image' | 'pdf' | 'html' | 'file'; linkUrl?: string; note?: string }) =>
    apiFetch<Task>(`/api/admin/tasks/${id}/complete`, { method: 'POST', body: JSON.stringify(body) }),
  rateQuality: (id: string, quality: TaskQuality) =>
    apiFetch<Task>(`/api/admin/tasks/${id}/quality`, { method: 'POST', body: JSON.stringify({ quality }) }),
  deleteTask: (id: string) =>
    apiFetch<void>(`/api/admin/tasks/${id}`, { method: 'DELETE' }),

  historyForDay: (day: string, cookieHeader?: string) =>
    apiFetch<HistoryDay>(`/api/admin/tasks/history/${day}`, { cookieHeader }),

  listTemplates: (cookieHeader?: string) =>
    apiFetch<DailyTemplate[]>('/api/admin/task-templates', { cookieHeader }),
  createTemplate: (body: {
    title: string;
    description?: string;
    important: boolean;
    ownerUserId?: string | null;
    ownerName?: string | null;
    order?: number;
    active?: boolean;
  }) =>
    apiFetch<DailyTemplate>('/api/admin/task-templates', { method: 'POST', body: JSON.stringify(body) }),
  updateTemplate: (id: string, body: Partial<{
    title: string;
    description: string | null;
    important: boolean;
    ownerUserId: string | null;
    ownerName: string | null;
    order: number;
    active: boolean;
  }>) =>
    apiFetch<DailyTemplate>(`/api/admin/task-templates/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteTemplate: (id: string) =>
    apiFetch<void>(`/api/admin/task-templates/${id}`, { method: 'DELETE' }),
  insertTemplates: (templateIds: string[]) =>
    apiFetch<{ inserted: number; taskIds: string[] }>(`/api/admin/task-templates/insert`, {
      method: 'POST',
      body: JSON.stringify({ templateIds }),
    }),

  assessment: (month: string, cookieHeader?: string) =>
    apiFetch<AssessmentResponse>(`/api/admin/assessment/${month}`, { cookieHeader }),

  // ── Booking / Meeting Requests bar (spec §4)
  listMeetingRequests: (cookieHeader?: string) =>
    apiFetch<{ items: MeetingRequest[] }>(`/api/admin/bookings/requests`, {
      cookieHeader,
    }),
  acceptBooking: (id: string, body: AcceptBookingBody) =>
    apiFetch<{ booking: MeetingRequest }>(
      `/api/admin/bookings/${id}/accept`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  counterProposeBooking: (id: string, body: CounterProposeBookingBody) =>
    apiFetch<{ booking: MeetingRequest }>(
      `/api/admin/bookings/${id}/counter-propose`,
      { method: 'POST', body: JSON.stringify(body) },
    ),
  declineBooking: (id: string) =>
    apiFetch<{ booking: MeetingRequest }>(
      `/api/admin/bookings/${id}/decline`,
      { method: 'POST' },
    ),

  uploadProof: async (file: File): Promise<UploadResult> => {
    const fd = new FormData();
    fd.append('file', file);
    const base = appConfig.apiUrl;
    const res = await fetch(`${base}/api/admin/uploads`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    if (!res.ok) {
      let body: unknown = null;
      try { body = await res.json(); } catch {}
      throw new ApiError(res.status, body, 'Upload failed');
    }
    return res.json();
  },
  uploadProofFile: async (file: File): Promise<UploadResult> => {
    const fd = new FormData();
    fd.append('file', file);
    const base = appConfig.apiUrl;
    const res = await fetch(`${base}/api/admin/uploads/file`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    if (!res.ok) {
      let body: unknown = null;
      try { body = await res.json(); } catch {}
      throw new ApiError(res.status, body, 'Upload failed');
    }
    return res.json();
  },
};
