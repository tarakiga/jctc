/**
 * User and Authentication Types
 * Matches backend Pydantic schemas
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',  // Backend-only, full access
  INTAKE = 'INTAKE',
  INVESTIGATOR = 'INVESTIGATOR',
  FORENSIC = 'FORENSIC',
  PROSECUTOR = 'PROSECUTOR',
  LIAISON = 'LIAISON',
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  org_unit: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface UserCreate {
  email: string
  full_name: string
  password: string
  role: UserRole
  org_unit?: string | null
}

export interface UserUpdate {
  email?: string
  full_name?: string
  role?: UserRole
  org_unit?: string | null
  is_active?: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface TokenRefreshRequest {
  refresh_token: string
}

export interface TokenRefreshResponse {
  access_token: string
  token_type: string
}
