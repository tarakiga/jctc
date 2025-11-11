'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export type CollaborationStatus = 'INITIATED' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED';

export interface Collaboration {
  id: string;
  case_id: string;
  partner_org: string;
  partner_type: 'LAW_ENFORCEMENT' | 'REGULATOR' | 'ISP' | 'BANK' | 'INTERNATIONAL' | 'OTHER';
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  reference_no?: string;
  scope: string;
  mou_reference?: string;
  status: CollaborationStatus;
  initiated_at: string;
  completed_at?: string;
  notes?: string;
}

// Partner organizations with types
export const PARTNER_ORGANIZATIONS = [
  // Law Enforcement
  { value: 'EFCC', label: 'Economic and Financial Crimes Commission (EFCC)', type: 'LAW_ENFORCEMENT' },
  { value: 'NPF', label: 'Nigeria Police Force (NPF)', type: 'LAW_ENFORCEMENT' },
  { value: 'DSS', label: 'Department of State Services (DSS)', type: 'LAW_ENFORCEMENT' },
  { value: 'ICPC', label: 'Independent Corrupt Practices Commission (ICPC)', type: 'LAW_ENFORCEMENT' },
  
  // International Law Enforcement
  { value: 'INTERPOL', label: 'INTERPOL', type: 'INTERNATIONAL' },
  { value: 'FBI', label: 'Federal Bureau of Investigation (FBI)', type: 'INTERNATIONAL' },
  { value: 'EUROPOL', label: 'European Union Agency for Law Enforcement Cooperation (EUROPOL)', type: 'INTERNATIONAL' },
  { value: 'NCA_UK', label: 'UK National Crime Agency (NCA)', type: 'INTERNATIONAL' },
  
  // Regulators
  { value: 'NCC', label: 'Nigerian Communications Commission (NCC)', type: 'REGULATOR' },
  { value: 'CBN', label: 'Central Bank of Nigeria (CBN)', type: 'REGULATOR' },
  { value: 'NITDA', label: 'National Information Technology Development Agency (NITDA)', type: 'REGULATOR' },
  
  // ISPs & Telecom
  { value: 'MTN', label: 'MTN Nigeria', type: 'ISP' },
  { value: 'AIRTEL', label: 'Airtel Nigeria', type: 'ISP' },
  { value: 'GLO', label: 'Globacom Nigeria', type: 'ISP' },
  { value: '9MOBILE', label: '9mobile Nigeria', type: 'ISP' },
  
  // Banks
  { value: 'GTB', label: 'Guaranty Trust Bank (GTB)', type: 'BANK' },
  { value: 'ZENITH', label: 'Zenith Bank', type: 'BANK' },
  { value: 'ACCESS', label: 'Access Bank', type: 'BANK' },
  { value: 'UBA', label: 'United Bank for Africa (UBA)', type: 'BANK' },
  { value: 'FIRSTBANK', label: 'First Bank of Nigeria', type: 'BANK' },
  
  // Other
  { value: 'OTHER', label: 'Other Organization', type: 'OTHER' },
] as const;

// Mock data
const MOCK_COLLABORATIONS: Collaboration[] = [
  {
    id: '1',
    case_id: '1',
    partner_org: 'EFCC',
    partner_type: 'LAW_ENFORCEMENT',
    contact_person: 'Ibrahim Magu',
    contact_email: 'i.magu@efcc.gov.ng',
    contact_phone: '+234-803-123-4567',
    reference_no: 'EFCC/CR/2025/0234',
    scope: 'Joint investigation into financial fraud and money laundering. EFCC leading on financial analysis and asset recovery.',
    mou_reference: 'MOU-JCTC-EFCC-2023-001',
    status: 'ACTIVE',
    initiated_at: '2025-01-08T10:00:00Z',
    notes: 'Weekly coordination meetings scheduled every Monday 10:00 AM',
  },
  {
    id: '2',
    case_id: '1',
    partner_org: 'MTN',
    partner_type: 'ISP',
    contact_person: 'Amaka Okoye',
    contact_email: 'legal@mtn.ng',
    contact_phone: '+234-803-987-6543',
    reference_no: 'MTN-LEGAL-2025-0089',
    scope: 'Subscriber information request and call data records (CDR) for suspect phone numbers: +234-805-xxx-xxxx, +234-806-xxx-xxxx',
    mou_reference: 'MOU-JCTC-MTN-2024-012',
    status: 'COMPLETED',
    initiated_at: '2025-01-09T14:30:00Z',
    completed_at: '2025-01-10T16:45:00Z',
    notes: 'CDRs received within 24 hours. Excellent cooperation from legal team.',
  },
  {
    id: '3',
    case_id: '1',
    partner_org: 'GTB',
    partner_type: 'BANK',
    contact_person: 'Chinedu Eze',
    contact_email: 'fraud.desk@gtbank.com',
    contact_phone: '+234-700-4826-5555',
    reference_no: 'GTB-FRD-2025-0156',
    scope: 'Account freeze and transaction history for accounts: 0123456789, 0987654321. Suspected proceeds of crime.',
    status: 'ACTIVE',
    initiated_at: '2025-01-10T09:15:00Z',
    notes: 'Awaiting court order approval for full account disclosure',
  },
  {
    id: '4',
    case_id: '1',
    partner_org: 'INTERPOL',
    partner_type: 'INTERNATIONAL',
    contact_person: 'Jean-Pierre Dubois',
    contact_email: 'ncb.nigeria@interpol.int',
    contact_phone: '+234-9-461-2345',
    reference_no: 'INTERPOL-NCB-NG-2025-0089',
    scope: 'Red Notice request for suspect with international ties. Coordination with NCB Paris for asset tracing in France.',
    mou_reference: 'INTERPOL-JCTC-Framework-Agreement',
    status: 'INITIATED',
    initiated_at: '2025-01-11T11:00:00Z',
    notes: 'Awaiting approval from INTERPOL General Secretariat',
  },
  {
    id: '5',
    case_id: '1',
    partner_org: 'NCC',
    partner_type: 'REGULATOR',
    contact_person: 'Dr. Amina Abdullahi',
    contact_email: 'enforcement@ncc.gov.ng',
    contact_phone: '+234-9-461-0000',
    reference_no: 'NCC-ENF-2025-0023',
    scope: 'Assistance with takedown of fraudulent website and IMEI blocking for seized devices',
    status: 'ACTIVE',
    initiated_at: '2025-01-09T08:00:00Z',
    notes: 'NCC provided technical assistance for domain seizure. IMEI blocking in progress.',
  },
];

// Simulated API functions
const fetchCollaborations = async (caseId: string): Promise<Collaboration[]> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_COLLABORATIONS.filter((collab) => collab.case_id === caseId);
};

const createCollaboration = async (data: Partial<Collaboration>): Promise<Collaboration> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const newCollaboration: Collaboration = {
    id: String(Date.now()),
    case_id: data.case_id!,
    partner_org: data.partner_org!,
    partner_type: data.partner_type!,
    contact_person: data.contact_person!,
    contact_email: data.contact_email!,
    contact_phone: data.contact_phone!,
    reference_no: data.reference_no,
    scope: data.scope!,
    mou_reference: data.mou_reference,
    status: 'INITIATED',
    initiated_at: new Date().toISOString(),
    notes: data.notes,
  };
  return newCollaboration;
};

const updateCollaboration = async (id: string, data: Partial<Collaboration>): Promise<Collaboration> => {
  await new Promise((resolve) => setTimeout(resolve, 800));
  const existing = MOCK_COLLABORATIONS.find((c) => c.id === id);
  if (!existing) throw new Error('Collaboration not found');
  
  return {
    ...existing,
    ...data,
    id,
  };
};

const deleteCollaboration = async (id: string): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 500));
};

// Custom hook
export const useCollaborations = (caseId: string) => {
  const queryClient = useQueryClient();

  const { data: collaborations = [], isLoading, error } = useQuery({
    queryKey: ['collaborations', caseId],
    queryFn: () => fetchCollaborations(caseId),
  });

  const createMutation = useMutation({
    mutationFn: createCollaboration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborations', caseId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Collaboration> }) => updateCollaboration(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborations', caseId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCollaboration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborations', caseId] });
    },
  });

  return {
    collaborations,
    isLoading,
    error,
    createCollaboration: createMutation.mutateAsync,
    updateCollaboration: updateMutation.mutateAsync,
    deleteCollaboration: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
