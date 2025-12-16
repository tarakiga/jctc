/**
 * Team Activity Types
 * Matches backend Pydantic schemas
 */

export enum WorkActivity {
  MEETING = 'MEETING',
  TRAVEL = 'TRAVEL',
  TRAINING = 'TRAINING',
  LEAVE = 'LEAVE',
}

export enum TeamActivityType {
  MEETING = 'MEETING',
  TRAVEL = 'TRAVEL',
  TRAINING = 'TRAINING',
  LEAVE = 'LEAVE',
}

// Simple user summary for attendee lists
export interface UserSummary {
  id: string
  full_name: string
  email: string
}

export interface TeamActivity {
  id: string
  user_id: string
  activity_type: TeamActivityType
  title: string
  description: string | null
  start_time: string
  end_time: string
  created_at: string
  updated_at: string
  attendees?: UserSummary[]
}

export interface TeamActivityWithUser extends TeamActivity {
  user_name?: string
  user_email?: string
  user_work_activity?: WorkActivity | null
  attendees: UserSummary[]
}

export interface TeamActivityCreate {
  activity_type: TeamActivityType
  title: string
  description?: string | null
  start_time: string
  end_time: string
  user_id?: string
  attendee_ids?: string[]
}

export interface TeamActivityUpdate {
  activity_type?: TeamActivityType
  title?: string
  description?: string | null
  start_time?: string
  end_time?: string
  attendee_ids?: string[]
}

export interface TeamActivityFilter {
  activity_type?: TeamActivityType
  user_id?: string
  start_date?: string
  end_date?: string
}

export interface TeamActivityList {
  items: TeamActivityWithUser[]
  total: number
  page: number
  size: number
}