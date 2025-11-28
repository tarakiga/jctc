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
}

export interface TeamActivityWithUser extends TeamActivity {
  user: {
    id: string
    full_name: string
    email: string
  }
}

export interface TeamActivityCreate {
  activity_type: TeamActivityType
  title: string
  description?: string | null
  start_time: string
  end_time: string
}

export interface TeamActivityUpdate {
  activity_type?: TeamActivityType
  title?: string
  description?: string | null
  start_time?: string
  end_time?: string
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