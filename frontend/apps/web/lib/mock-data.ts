/**
 * Test User Credentials Reference
 * 
 * These credentials are provided for testing and development purposes.
 * For demos, use the generate_demo_data.py script to populate live data.
 * 
 * Usage:
 *   python scripts/generate_demo_data.py --api-url http://localhost:8000/api/v1
 */

import { UserRole } from '@jctc/types'

/**
 * Test Users - One for each role
 * Use these credentials to test different user flows
 */
export const TEST_USERS = {
  admin: {
    id: '1',
    email: 'admin@jctc.gov.ng',
    password: 'Admin@123',
    full_name: 'Administrator User',
    role: UserRole.ADMIN,
    org_unit: 'HQ - Administration',
    permissions: ['*'], // All permissions
  },
  supervisor: {
    id: '2',
    email: 'supervisor@jctc.gov.ng',
    password: 'Supervisor@123',
    full_name: 'Sarah Williams',
    role: UserRole.SUPERVISOR,
    org_unit: 'Lagos State Office',
    permissions: ['cases:*', 'evidence:*', 'users:view', 'reports:*'],
  },
  prosecutor: {
    id: '3',
    email: 'prosecutor@jctc.gov.ng',
    password: 'Prosecutor@123',
    full_name: 'Michael Okonkwo',
    role: UserRole.PROSECUTOR,
    org_unit: 'Prosecution Division',
    permissions: ['cases:view', 'cases:update', 'evidence:view', 'reports:view'],
  },
  investigator: {
    id: '4',
    email: 'investigator@jctc.gov.ng',
    password: 'Investigator@123',
    full_name: 'John Adebayo',
    role: UserRole.INVESTIGATOR,
    org_unit: 'Investigation Unit',
    permissions: ['cases:view', 'cases:create', 'cases:update', 'evidence:*'],
  },
  forensic: {
    id: '5',
    email: 'forensic@jctc.gov.ng',
    password: 'Forensic@123',
    full_name: 'Dr. Amina Hassan',
    role: UserRole.FORENSIC,
    org_unit: 'Forensic Analysis Lab',
    permissions: ['evidence:view', 'evidence:create', 'evidence:update', 'cases:view'],
  },
  liaison: {
    id: '6',
    email: 'liaison@jctc.gov.ng',
    password: 'Liaison@123',
    full_name: 'Emmanuel Nwosu',
    role: UserRole.LIAISON,
    org_unit: 'International Cooperation',
    permissions: ['cases:view', 'evidence:view', 'reports:view'],
  },
  intake: {
    id: '7',
    email: 'intake@jctc.gov.ng',
    password: 'Intake@123',
    full_name: 'Grace Okoro',
    role: UserRole.INTAKE,
    org_unit: 'Case Intake Office',
    permissions: ['cases:create', 'cases:view'],
  },
}

/**
 * User Login Helper
 */
export function getUserCredentials(roleKey: keyof typeof TEST_USERS) {
  const user = TEST_USERS[roleKey]
  return {
    email: user.email,
    password: user.password,
    full_name: user.full_name,
    role: user.role,
  }
}
