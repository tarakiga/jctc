CREATE TABLE IF NOT EXISTS forensic_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id),
    report_type VARCHAR(100),
    tool_name VARCHAR(255),
    tool_version VARCHAR(100),
    tool_binary_hash VARCHAR(64),
    file_name VARCHAR(500),
    file_size BIGINT,
    file_hash VARCHAR(64),
    generated_at TIMESTAMP WITH TIME ZONE,
    generated_by UUID REFERENCES users(id),
    notes TEXT
);
