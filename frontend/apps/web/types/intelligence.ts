export enum IntelCategory {
    HUMINT = 'HUMINT',
    SIGINT = 'SIGINT',
    OSINT = 'OSINT',
    CYBINT = 'CYBINT',
    FININT = 'FININT',
    OTHER = 'OTHER',
}

export enum IntelPriority {
    CRITICAL = 'CRITICAL',
    HIGH = 'HIGH',
    MEDIUM = 'MEDIUM',
    LOW = 'LOW',
}

export enum IntelStatus {
    RAW = 'RAW',
    EVALUATED = 'EVALUATED',
    CONFIRMED = 'CONFIRMED',
    ACTIONABLE = 'ACTIONABLE',
    ARCHIVED = 'ARCHIVED',
}

export interface IntelAttachment {
    id: string;
    fileName: string;
    fileSize: string;
    fileType: string;
    uploadedAt: string;
}

export interface IntelLink {
    caseId: string;
    caseNumber: string;
    caseTitle: string;
}

export interface IntelRecord {
    id: string;
    title: string;
    description: string; // Rich text or markdown
    source: string;
    category: IntelCategory;
    priority: IntelPriority;
    status: IntelStatus;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    author: {
        name: string;
        role: string;
        avatar?: string;
    };
    linkedCases: IntelLink[];
    attachments: IntelAttachment[];
    isConfidential?: boolean;
}

export interface IntelStats {
    totalRecords: number;
    criticalPriority: number;
    actionable: number;
    recentActivity: number; // e.g. last 7 days
}
