/**
 * Case Management Types
 * Matches backend Pydantic schemas
 */

export enum CaseStatus {
  OPEN = 'OPEN',
  UNDER_INVESTIGATION = 'UNDER_INVESTIGATION',
  PENDING_PROSECUTION = 'PENDING_PROSECUTION',
  IN_COURT = 'IN_COURT',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum CaseSeverity {
  MINIMAL = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  CRITICAL = 5,
}

export interface CaseType {
  id: string
  code: string
  label: string
  description: string | null
}

export interface Case {
  id: string
  case_number: string
  title: string
  description: string | null
  case_type_id: string | null
  case_type?: CaseType
  status: CaseStatus
  severity: number | null
  local_or_international: 'LOCAL' | 'INTERNATIONAL'
  originating_country: string
  cooperating_countries: string[] | null
  mlat_reference: string | null
  date_reported: string
  date_assigned: string | null
  created_by: string | null
  lead_investigator: string | null
  created_at: string
  updated_at: string
}

export interface CaseCreate {
  title: string
  description?: string | null
  case_type_id?: string | null
  severity?: number | null
  local_or_international: 'LOCAL' | 'INTERNATIONAL'
  originating_country?: string
  cooperating_countries?: string[] | null
  mlat_reference?: string | null
}

export interface CaseUpdate {
  title?: string
  description?: string | null
  case_type_id?: string | null
  status?: CaseStatus
  severity?: number | null
  local_or_international?: 'LOCAL' | 'INTERNATIONAL'
  originating_country?: string
  cooperating_countries?: string[] | null
  mlat_reference?: string | null
  lead_investigator?: string | null
}

export interface CaseAssignment {
  id: string
  case_id: string
  user_id: string
  role: string
  assigned_at: string
  assigned_by: string
}

export interface CaseListFilters {
  status?: CaseStatus
  local_or_international?: 'LOCAL' | 'INTERNATIONAL'
  severity?: CaseSeverity
  search?: string
  skip?: number
  limit?: number
}
