export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'TEAM';
export type TaskType = 'NORMAL' | 'MEETING';
export type TaskStatus = 'NEW' | 'IN_PROGRESS' | 'DONE' | 'DELAYED';
export type TaskQuality = 'UNRATED' | 'LOW' | 'HIGH';
export type TaskDelayReason = 'MANUAL' | 'AUTO_OVERDUE';
export type TaskEventType =
  | 'CREATED'
  | 'UPDATED'
  | 'ASSIGNED'
  | 'IMPORTANCE_CHANGED'
  | 'STATUS_CHANGED'
  | 'DELAYED'
  | 'AUTO_DELAYED'
  | 'COMPLETED'
  | 'QUALITY_RATED'
  | 'BOOKING_LINKED'
  | 'DELETED';

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role: UserRole;
  mustChangePassword?: boolean;
}

export interface TaskOwnerUser {
  id: string;
  name: string | null;
  email: string;
}

export interface TaskDelay {
  id: string;
  taskId: string;
  fromDay: string;
  toDay: string;
  reason: TaskDelayReason;
  note: string | null;
  delayedAt: string;
  delayedById: string | null;
}

export interface TaskEvent {
  id: string;
  taskId: string;
  type: TaskEventType;
  payload: unknown;
  createdAt: string;
  actor?: { id: string; name: string | null; email: string } | null;
}

export interface BookingSummary {
  id: string;
  calendarType: string;
  scheduledAt: string;
  durationMinutes: number;
  clientName: string;
  clientEmail: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  type: TaskType;
  ownerUserId: string | null;
  ownerUser: TaskOwnerUser | null;
  ownerName: string | null;
  important: boolean;
  deadlineAt: string;
  deadlineHasTime: boolean;
  status: TaskStatus;
  quality: TaskQuality;
  qualityRatedAt: string | null;
  qualityRatedBy?: { id: string; name: string | null } | null;
  createdAt: string;
  updatedAt: string;
  creationDay: string;
  scheduledDay: string;
  completedAt: string | null;
  completionImageUrl: string | null;
  completionFileUrl: string | null;
  completionFileType: 'image' | 'pdf' | 'html' | 'file' | null;
  completionLinkUrl: string | null;
  completionNote: string | null;
  bookingId: string | null;
  booking?: BookingSummary | null;
  meetingAttendees: string[];
  urgent: boolean;
  overdue: boolean;
  delays: TaskDelay[];
  events?: TaskEvent[];
  createdBy?: { id: string; name: string | null } | null;
}

export interface DailyTemplate {
  id: string;
  title: string;
  description: string | null;
  important: boolean;
  ownerUserId: string | null;
  ownerName: string | null;
  ownerUser?: TaskOwnerUser | null;
  order: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
}

export interface AssessmentDoneTask {
  id: string;
  title: string;
  deadlineAt: string;
  completedAt: string | null;
  onTime: boolean;
  quality: TaskQuality;
  completionImageUrl: string | null;
  completionFileUrl: string | null;
  completionFileType: 'image' | 'pdf' | 'html' | 'file' | null;
  completionLinkUrl: string | null;
  completionNote: string | null;
}

export interface AssessmentBucket {
  userId: string | null;
  name: string;
  totals: { total: number; done: number; onTime: number; highQuality: number };
  ratios: { accomplishing: number; onTime: number; quality: number; overall: number };
  doneTasks: AssessmentDoneTask[];
}

export interface AssessmentResponse {
  month: string;
  buckets: AssessmentBucket[];
}

export interface HistoryDay {
  day: string;
  dayEnd: string;
  created: Task[];
  movedIn: Task[];
  movedOut: Task[];
}
