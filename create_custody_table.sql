-- Create missing chain_of_custody_entries table
CREATE TABLE IF NOT EXISTS chain_of_custody_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evidence_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    custodian_from UUID REFERENCES users(id),
    custodian_to UUID NOT NULL REFERENCES users(id),
    location_from VARCHAR(255),
    location_to VARCHAR(255),
    purpose VARCHAR(500) NOT NULL,
    notes TEXT,
    signature_path VARCHAR(500),
    signature_verified BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(20) DEFAULT 'PENDING',
    approved_by UUID REFERENCES users(id),
    approval_timestamp TIMESTAMP WITH TIME ZONE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
