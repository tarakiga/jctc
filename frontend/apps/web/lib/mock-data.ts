import { UserRole, CaseStatus } from '@jctc/types'

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
 * Mock Cases - Various scenarios
 */
export const MOCK_CASES = [
  // Critical - Active Investigation
  {
    id: 'case-001',
    case_number: 'JCTC-2024-A7B3C',
    title: 'Business Email Compromise - N50M Fraud',
    description: 'A sophisticated BEC attack targeting a major Nigerian bank. Attackers impersonated the CEO and requested fraudulent wire transfers totaling N50 million. Investigation ongoing with cooperation from FBI Cyber Division.',
    status: CaseStatus.UNDER_INVESTIGATION,
    severity: 5,
    date_reported: '2024-01-15T09:30:00Z',
    date_occurred: '2024-01-10T14:20:00Z',
    lead_investigator: 'John Adebayo',
    assigned_to: 'John Adebayo',
    location: 'Lagos, Nigeria',
    jurisdiction: 'Lagos State',
    suspects: [
      {
        name: 'Unknown - Email: ceo.impersonator@fakeemail.com',
        details: 'Used spoofed email domain. IP traces to proxy servers in Eastern Europe.',
      },
    ],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T16:45:00Z',
  },

  // High - Pending Prosecution
  {
    id: 'case-002',
    case_number: 'JCTC-2024-B8C4D',
    title: 'Romance Scam Network - Multiple Victims',
    description: 'International romance scam operation targeting elderly victims through dating platforms. At least 15 confirmed victims with total losses exceeding N20 million. Evidence includes fake profiles, chat logs, and transaction records.',
    status: CaseStatus.PENDING_PROSECUTION,
    severity: 4,
    date_reported: '2024-01-08T11:15:00Z',
    date_occurred: '2023-11-01T00:00:00Z',
    lead_investigator: 'Sarah Williams',
    assigned_to: 'Michael Okonkwo',
    location: 'Abuja, Nigeria',
    jurisdiction: 'Federal Capital Territory',
    suspects: [
      {
        name: 'Chukwudi Okafor',
        details: 'Primary suspect. Operates under alias "David Johnson". Currently in custody.',
      },
      {
        name: 'Blessing Eze',
        details: 'Accomplice. Provided bank accounts for money laundering. At large.',
      },
    ],
    created_at: '2024-01-08T12:00:00Z',
    updated_at: '2024-01-25T09:20:00Z',
  },

  // Critical - In Court
  {
    id: 'case-003',
    case_number: 'JCTC-2023-C9D5E',
    title: 'Corporate Data Breach - 500K Records Stolen',
    description: 'Major data breach at telecommunications company exposing personal information of 500,000 customers. Insider threat suspected. Case currently in Federal High Court.',
    status: CaseStatus.IN_COURT,
    severity: 5,
    date_reported: '2023-09-20T08:00:00Z',
    date_occurred: '2023-09-15T22:00:00Z',
    lead_investigator: 'Sarah Williams',
    assigned_to: 'Michael Okonkwo',
    location: 'Port Harcourt, Rivers State',
    jurisdiction: 'Rivers State',
    suspects: [
      {
        name: 'Ibrahim Musa',
        details: 'Former IT Administrator. Accessed systems after termination using backdoor.',
      },
    ],
    created_at: '2023-09-20T09:30:00Z',
    updated_at: '2024-01-15T14:00:00Z',
  },

  // Medium - Open
  {
    id: 'case-004',
    case_number: 'JCTC-2024-D1E6F',
    title: 'Phishing Campaign - Banking Credentials',
    description: 'Widespread phishing campaign mimicking major Nigerian banks. Fake websites set up to harvest login credentials. Initial report from bank security team.',
    status: CaseStatus.OPEN,
    severity: 3,
    date_reported: '2024-01-22T13:45:00Z',
    date_occurred: '2024-01-20T00:00:00Z',
    lead_investigator: 'Grace Okoro',
    assigned_to: 'John Adebayo',
    location: 'Online - National',
    jurisdiction: 'Federal',
    suspects: [],
    created_at: '2024-01-22T14:00:00Z',
    updated_at: '2024-01-22T14:00:00Z',
  },

  // High - Under Investigation
  {
    id: 'case-005',
    case_number: 'JCTC-2024-E2F7G',
    title: 'Cryptocurrency Investment Fraud',
    description: 'Ponzi scheme disguised as cryptocurrency trading platform. Over 200 investors defrauded of approximately N30 million. Platform operators disappeared after final withdrawal lockout.',
    status: CaseStatus.UNDER_INVESTIGATION,
    severity: 4,
    date_reported: '2024-01-18T10:30:00Z',
    date_occurred: '2023-12-15T00:00:00Z',
    lead_investigator: 'John Adebayo',
    assigned_to: 'John Adebayo',
    location: 'Lagos, Nigeria',
    jurisdiction: 'Lagos State',
    suspects: [
      {
        name: 'Unknown - Trading as "CryptoMax Nigeria"',
        details: 'Company registered with fake documents. Investigation into beneficial owners ongoing.',
      },
    ],
    created_at: '2024-01-18T11:00:00Z',
    updated_at: '2024-01-26T10:15:00Z',
  },

  // Low - Closed
  {
    id: 'case-006',
    case_number: 'JCTC-2023-F3G8H',
    title: 'Identity Theft - Social Media Account Hack',
    description: 'Individual social media account compromised and used to solicit money from contacts. Perpetrator identified and prosecuted successfully.',
    status: CaseStatus.CLOSED,
    severity: 2,
    date_reported: '2023-11-05T09:00:00Z',
    date_occurred: '2023-11-01T18:00:00Z',
    lead_investigator: 'John Adebayo',
    assigned_to: 'Michael Okonkwo',
    location: 'Ibadan, Oyo State',
    jurisdiction: 'Oyo State',
    suspects: [
      {
        name: 'Tunde Ajayi',
        details: 'Convicted. Sentenced to 2 years imprisonment.',
      },
    ],
    created_at: '2023-11-05T10:00:00Z',
    updated_at: '2023-12-20T15:30:00Z',
  },

  // Medium - Open
  {
    id: 'case-007',
    case_number: 'JCTC-2024-G4H9J',
    title: 'E-commerce Payment Fraud',
    description: 'Multiple reports of fraudulent transactions on e-commerce platform. Stolen credit card details used for purchases. Platform cooperating with investigation.',
    status: CaseStatus.OPEN,
    severity: 3,
    date_reported: '2024-01-25T15:20:00Z',
    date_occurred: '2024-01-22T00:00:00Z',
    lead_investigator: 'Grace Okoro',
    assigned_to: null,
    location: 'Online - Lagos',
    jurisdiction: 'Lagos State',
    suspects: [],
    created_at: '2024-01-25T16:00:00Z',
    updated_at: '2024-01-25T16:00:00Z',
  },

  // Critical - International
  {
    id: 'case-008',
    case_number: 'JCTC-2024-H5J1K',
    title: 'International Money Laundering Network',
    description: 'Cross-border money laundering operation using cryptocurrency and shell companies. Working with INTERPOL and FBI. Nigerian connection identified through financial intelligence.',
    status: CaseStatus.UNDER_INVESTIGATION,
    severity: 5,
    date_reported: '2024-01-12T08:00:00Z',
    date_occurred: '2023-10-01T00:00:00Z',
    lead_investigator: 'Emmanuel Nwosu',
    assigned_to: 'Sarah Williams',
    location: 'Lagos, Nigeria / International',
    jurisdiction: 'Federal',
    suspects: [
      {
        name: 'Syndicate - Multiple actors',
        details: 'Complex network spanning 5 countries. Investigation coordinated by INTERPOL.',
      },
    ],
    created_at: '2024-01-12T09:00:00Z',
    updated_at: '2024-01-27T11:30:00Z',
  },

  // High - Pending
  {
    id: 'case-009',
    case_number: 'JCTC-2023-J6K2L',
    title: 'Ransomware Attack - Hospital Systems',
    description: 'Ransomware attack on hospital management system in Kano. Patient data encrypted. Ransom of $50,000 in Bitcoin demanded. Hospital declined to pay. Working with cybersecurity firms for recovery.',
    status: CaseStatus.PENDING_PROSECUTION,
    severity: 5,
    date_reported: '2023-12-10T07:30:00Z',
    date_occurred: '2023-12-08T03:00:00Z',
    lead_investigator: 'Dr. Amina Hassan',
    assigned_to: 'Michael Okonkwo',
    location: 'Kano, Kano State',
    jurisdiction: 'Kano State',
    suspects: [
      {
        name: 'Unknown - RansomXX Group',
        details: 'International cybercrime group. Bitcoin wallet traced but laundered through mixers.',
      },
    ],
    created_at: '2023-12-10T08:00:00Z',
    updated_at: '2024-01-20T13:45:00Z',
  },

  // Low - Archived
  {
    id: 'case-010',
    case_number: 'JCTC-2023-K7L3M',
    title: 'SIM Swap Fraud - Single Victim',
    description: 'SIM swap attack on individual leading to unauthorized bank transfers. Case resolved with full recovery of funds. Archived as reference case.',
    status: CaseStatus.ARCHIVED,
    severity: 2,
    date_reported: '2023-02-15T10:00:00Z',
    date_occurred: '2023-02-14T16:30:00Z',
    lead_investigator: 'John Adebayo',
    assigned_to: null,
    location: 'Enugu, Enugu State',
    jurisdiction: 'Enugu State',
    suspects: [
      {
        name: 'Adamu Bello',
        details: 'Telecom employee. Convicted and sentenced.',
      },
    ],
    created_at: '2023-02-15T11:00:00Z',
    updated_at: '2023-05-20T14:00:00Z',
  },
]

/**
 * Mock Evidence Items
 */
export const MOCK_EVIDENCE = [
  // Digital Evidence - Case 001
  {
    id: 'ev-001',
    item_number: 'EV-2024-001-A',
    case_id: 'case-001',
    description: 'Email server logs showing spoofed communications from fake CEO account',
    type: 'DIGITAL',
    collection_date: '2024-01-15T14:00:00Z',
    collected_by: 'John Adebayo',
    storage_location: 'Digital Forensics Lab - Server Room A',
    hash_value: 'SHA256:a3b2c1d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    chain_of_custody: [
      {
        action: 'Initial Collection',
        timestamp: '2024-01-15T14:00:00Z',
        transferred_from: 'Bank IT Department',
        transferred_to: 'John Adebayo',
        purpose: 'Evidence collection from crime scene',
        notes: 'Complete email server logs for January 10-15, 2024',
      },
      {
        action: 'Transfer to Forensics',
        timestamp: '2024-01-16T09:00:00Z',
        transferred_from: 'John Adebayo',
        transferred_to: 'Dr. Amina Hassan',
        purpose: 'Digital forensic analysis',
        notes: 'Secure transfer via encrypted drive',
      },
      {
        action: 'Analysis Complete',
        timestamp: '2024-01-18T16:30:00Z',
        transferred_from: 'Dr. Amina Hassan',
        transferred_to: 'Evidence Vault',
        purpose: 'Secure storage',
        notes: 'Analysis report attached. Hash verified.',
      },
    ],
    notes: 'Critical evidence showing timestamp of fraudulent emails and IP addresses',
    files: [
      { name: 'email_logs_full.zip', size: 25600000 },
      { name: 'forensic_report.pdf', size: 2048000 },
    ],
    created_at: '2024-01-15T14:30:00Z',
    updated_at: '2024-01-18T17:00:00Z',
  },

  // Financial Evidence - Case 001
  {
    id: 'ev-002',
    item_number: 'EV-2024-001-B',
    case_id: 'case-001',
    description: 'Bank transaction records for fraudulent wire transfers',
    type: 'FINANCIAL',
    collection_date: '2024-01-15T15:30:00Z',
    collected_by: 'John Adebayo',
    storage_location: 'Evidence Room B - Cabinet 12',
    chain_of_custody: [
      {
        action: 'Initial Collection',
        timestamp: '2024-01-15T15:30:00Z',
        transferred_from: 'Bank Compliance Officer',
        transferred_to: 'John Adebayo',
        purpose: 'Financial evidence collection',
        notes: 'Transaction records for account ending in 7890',
      },
    ],
    notes: 'Shows three fraudulent transfers totaling N50 million',
    files: [
      { name: 'transaction_records.xlsx', size: 512000 },
      { name: 'account_statements.pdf', size: 1024000 },
    ],
    created_at: '2024-01-15T16:00:00Z',
    updated_at: '2024-01-15T16:00:00Z',
  },

  // Physical Evidence - Case 002
  {
    id: 'ev-003',
    item_number: 'EV-2024-002-A',
    case_id: 'case-002',
    description: 'Seized laptop containing fake dating profiles and victim communications',
    type: 'PHYSICAL',
    collection_date: '2024-01-09T10:00:00Z',
    collected_by: 'Sarah Williams',
    storage_location: 'Evidence Vault - Section C, Shelf 5',
    hash_value: 'SHA256:b4c5d6e7f8g9h0i1j2k3l4m5n6o7p8q9r0s1t2u3v4w5x6y7z8a9',
    chain_of_custody: [
      {
        action: 'Seizure',
        timestamp: '2024-01-09T10:00:00Z',
        transferred_from: 'Suspect Residence',
        transferred_to: 'Sarah Williams',
        purpose: 'Evidence seizure during arrest',
        notes: 'Dell Latitude laptop, serial number DL1234567',
      },
      {
        action: 'Forensic Imaging',
        timestamp: '2024-01-10T08:00:00Z',
        transferred_from: 'Sarah Williams',
        transferred_to: 'Dr. Amina Hassan',
        purpose: 'Create forensic image',
        notes: 'Complete disk image created. Chain of custody maintained.',
      },
      {
        action: 'Return to Storage',
        timestamp: '2024-01-12T14:00:00Z',
        transferred_from: 'Dr. Amina Hassan',
        transferred_to: 'Evidence Vault',
        purpose: 'Secure storage',
        notes: 'Original device secured. Working copy with investigators.',
      },
    ],
    notes: 'Contains extensive chat logs and 47 fake profile identities',
    created_at: '2024-01-09T11:00:00Z',
    updated_at: '2024-01-12T14:30:00Z',
  },

  // Document Evidence - Case 002
  {
    id: 'ev-004',
    item_number: 'EV-2024-002-B',
    case_id: 'case-002',
    description: 'Printed victim statements and money transfer receipts',
    type: 'DOCUMENT',
    collection_date: '2024-01-10T13:00:00Z',
    collected_by: 'Sarah Williams',
    storage_location: 'Evidence Room A - File Cabinet 3',
    chain_of_custody: [
      {
        action: 'Collection from Victims',
        timestamp: '2024-01-10T13:00:00Z',
        transferred_from: 'Multiple Victims',
        transferred_to: 'Sarah Williams',
        purpose: 'Victim statement collection',
        notes: 'Statements from 15 victims with supporting documents',
      },
    ],
    notes: '15 victim statements documenting total losses of N20 million',
    files: [
      { name: 'victim_statements_compiled.pdf', size: 5120000 },
      { name: 'money_transfer_receipts.pdf', size: 3072000 },
    ],
    created_at: '2024-01-10T14:00:00Z',
    updated_at: '2024-01-10T14:00:00Z',
  },

  // Digital Evidence - Case 003
  {
    id: 'ev-005',
    item_number: 'EV-2023-045-A',
    case_id: 'case-003',
    description: 'Database dump showing unauthorized access logs and exfiltrated data',
    type: 'DIGITAL',
    collection_date: '2023-09-21T11:00:00Z',
    collected_by: 'Dr. Amina Hassan',
    storage_location: 'Digital Forensics Lab - Secure Server 2',
    hash_value: 'SHA256:c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9a0b1',
    chain_of_custody: [
      {
        action: 'Database Acquisition',
        timestamp: '2023-09-21T11:00:00Z',
        transferred_from: 'Telecom Company IT',
        transferred_to: 'Dr. Amina Hassan',
        purpose: 'Forensic acquisition of compromised database',
        notes: 'Complete database dump with access logs',
      },
      {
        action: 'Analysis',
        timestamp: '2023-09-25T16:00:00Z',
        transferred_from: 'Dr. Amina Hassan',
        transferred_to: 'Michael Okonkwo',
        purpose: 'Prosecution preparation',
        notes: 'Analysis complete. Evidence shows clear unauthorized access patterns.',
      },
    ],
    notes: 'Conclusive evidence of insider threat. 500K customer records compromised.',
    files: [
      { name: 'database_dump.sql', size: 102400000 },
      { name: 'access_logs_analysis.pdf', size: 4096000 },
    ],
    created_at: '2023-09-21T12:00:00Z',
    updated_at: '2023-09-25T17:00:00Z',
  },

  // Digital Evidence - Case 004
  {
    id: 'ev-006',
    item_number: 'EV-2024-003-A',
    case_id: 'case-004',
    description: 'Screenshots and source code of phishing websites',
    type: 'DIGITAL',
    collection_date: '2024-01-22T16:00:00Z',
    collected_by: 'John Adebayo',
    storage_location: 'Digital Evidence Archive - Cloud Storage',
    hash_value: 'SHA256:d8e9f0g1h2i3j4k5l6m7n8o9p0q1r2s3t4u5v6w7x8y9z0a1b2c3',
    chain_of_custody: [
      {
        action: 'Web Scraping',
        timestamp: '2024-01-22T16:00:00Z',
        transferred_from: 'Internet',
        transferred_to: 'John Adebayo',
        purpose: 'Preserve phishing site evidence',
        notes: 'Complete mirror of 5 phishing domains before takedown',
      },
    ],
    notes: 'Sites mimicked Access Bank, GTBank, and First Bank login pages',
    files: [
      { name: 'phishing_sites_archive.zip', size: 15360000 },
      { name: 'screenshots.zip', size: 2560000 },
    ],
    created_at: '2024-01-22T17:00:00Z',
    updated_at: '2024-01-22T17:00:00Z',
  },

  // Financial Evidence - Case 005
  {
    id: 'ev-007',
    item_number: 'EV-2024-004-A',
    case_id: 'case-005',
    description: 'Cryptocurrency wallet addresses and transaction records',
    type: 'FINANCIAL',
    collection_date: '2024-01-19T09:00:00Z',
    collected_by: 'John Adebayo',
    storage_location: 'Digital Evidence - Blockchain Analysis',
    chain_of_custody: [
      {
        action: 'Blockchain Analysis',
        timestamp: '2024-01-19T09:00:00Z',
        transferred_from: 'Blockchain Explorer',
        transferred_to: 'John Adebayo',
        purpose: 'Trace cryptocurrency flows',
        notes: 'Traced 47 Bitcoin transactions totaling 2.3 BTC',
      },
    ],
    notes: 'Wallet addresses linked to CryptoMax platform operators',
    files: [
      { name: 'blockchain_analysis.pdf', size: 3584000 },
      { name: 'wallet_transactions.xlsx', size: 768000 },
    ],
    created_at: '2024-01-19T10:00:00Z',
    updated_at: '2024-01-19T10:00:00Z',
  },

  // Physical Evidence - Case 009
  {
    id: 'ev-008',
    item_number: 'EV-2023-098-A',
    case_id: 'case-009',
    description: 'Hospital server hard drives affected by ransomware',
    type: 'PHYSICAL',
    collection_date: '2023-12-10T12:00:00Z',
    collected_by: 'Dr. Amina Hassan',
    storage_location: 'Forensics Lab - Climate Controlled Room',
    hash_value: 'SHA256:e0f1g2h3i4j5k6l7m8n9o0p1q2r3s4t5u6v7w8x9y0z1a2b3c4d5',
    chain_of_custody: [
      {
        action: 'Server Seizure',
        timestamp: '2023-12-10T12:00:00Z',
        transferred_from: 'Hospital IT Department',
        transferred_to: 'Dr. Amina Hassan',
        purpose: 'Forensic analysis of ransomware',
        notes: '3 server hard drives. Hospital operations moved to backup systems.',
      },
      {
        action: 'Forensic Analysis Started',
        timestamp: '2023-12-11T08:00:00Z',
        transferred_from: 'Dr. Amina Hassan',
        transferred_to: 'Forensics Lab',
        purpose: 'Malware analysis and recovery attempts',
        notes: 'Working with international cybersecurity firms',
      },
    ],
    notes: 'Contains encrypted patient data. Decryption attempts ongoing.',
    created_at: '2023-12-10T13:00:00Z',
    updated_at: '2023-12-20T15:00:00Z',
  },
]

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

/**
 * Get cases visible to specific role
 */
export function getCasesForRole(role: UserRole) {
  // Admins and Supervisors see all cases
  if (role === UserRole.ADMIN || role === UserRole.SUPERVISOR) {
    return MOCK_CASES
  }

  // Investigators see all active cases
  if (role === UserRole.INVESTIGATOR) {
    return MOCK_CASES.filter(
      (c) =>
        c.status === CaseStatus.OPEN ||
        c.status === CaseStatus.UNDER_INVESTIGATION ||
        c.assigned_to === 'John Adebayo'
    )
  }

  // Prosecutors see cases ready for prosecution and in court
  if (role === UserRole.PROSECUTOR) {
    return MOCK_CASES.filter(
      (c) =>
        c.status === CaseStatus.PENDING_PROSECUTION ||
        c.status === CaseStatus.IN_COURT ||
        c.assigned_to === 'Michael Okonkwo'
    )
  }

  // Forensic analysts see cases with evidence they're analyzing
  if (role === UserRole.FORENSIC) {
    const evidenceCaseIds = MOCK_EVIDENCE.map((e) => e.case_id)
    return MOCK_CASES.filter((c) => evidenceCaseIds.includes(c.id))
  }

  // Liaison officers see international cases
  if (role === UserRole.LIAISON) {
    return MOCK_CASES.filter(
      (c) =>
        c.location?.includes('International') ||
        c.jurisdiction === 'Federal' ||
        c.assigned_to === 'Emmanuel Nwosu'
    )
  }

  // Intake officers see new/open cases
  if (role === UserRole.INTAKE) {
    return MOCK_CASES.filter(
      (c) => c.status === CaseStatus.OPEN || c.lead_investigator === 'Grace Okoro'
    )
  }

  return []
}

/**
 * Get evidence visible to specific role
 */
export function getEvidenceForRole(role: UserRole, caseId?: string) {
  if (caseId) {
    return MOCK_EVIDENCE.filter((e) => e.case_id === caseId)
  }

  // Admins, Supervisors, and Forensics see all evidence
  if (
    role === UserRole.ADMIN ||
    role === UserRole.SUPERVISOR ||
    role === UserRole.FORENSIC
  ) {
    return MOCK_EVIDENCE
  }

  // Others see evidence for cases they have access to
  const visibleCases = getCasesForRole(role)
  const visibleCaseIds = visibleCases.map((c) => c.id)
  return MOCK_EVIDENCE.filter((e) => visibleCaseIds.includes(e.case_id))
}
