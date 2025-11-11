/**
 * Evidence Management Types
 * Matches backend Pydantic schemas
 */

export enum EvidenceType {
  DIGITAL = 'DIGITAL',
  PHYSICAL = 'PHYSICAL',
  DOCUMENTARY = 'DOCUMENTARY',
  TESTIMONIAL = 'TESTIMONIAL',
}

export interface Evidence {
  id: string
  case_id: string
  evidence_number: string
  evidence_type: EvidenceType
  description: string
  file_path: string | null
  file_hash: string | null
  file_size: number | null
  collected_by: string
  collection_date: string
  collection_location: string | null
  tags: string[] | null
  is_verified: boolean
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

export interface EvidenceCreate {
  case_id: string
  evidence_type: EvidenceType
  description: string
  file_path?: string | null
  file_hash?: string | null
  file_size?: number | null
  collection_date: string
  collection_location?: string | null
  tags?: string[] | null
}

export interface EvidenceUpdate {
  description?: string
  tags?: string[] | null
  is_verified?: boolean
}

export interface ChainOfCustody {
  id: string
  evidence_id: string
  from_user_id: string
  to_user_id: string
  transfer_date: string
  location: string | null
  purpose: string | null
  notes: string | null
  created_at: string
}

export interface ChainOfCustodyCreate {
  evidence_id: string
  to_user_id: string
  location?: string | null
  purpose?: string | null
  notes?: string | null
}
