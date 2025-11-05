---
title: "Data Retention & Archival"
description: "Comprehensive guide to automated data lifecycle management, retention policies, and secure archival in the JCTC system"
---

# Data Retention & Archival

The JCTC data retention and archival system provides enterprise-grade automated lifecycle management for investigative data, ensuring compliance with legal requirements while optimizing storage resources.

## Overview

The retention system is designed to handle the complex data lifecycle requirements of cybercrime investigations:

- **Automated Lifecycle Management** - Policy-driven data archival and deletion
- **Legal Hold Support** - Override retention for litigation and regulatory requirements
- **Secure Archival** - Encrypted storage with integrity verification
- **Compliance Integration** - Seamless integration with regulatory frameworks
- **Storage Optimization** - Compression and deduplication for efficiency

## Core Concepts

### Retention Policies
Policies define how long different types of data should be retained and what actions to take when data reaches specific lifecycle stages.

### Legal Holds
Special retention status that prevents data deletion due to legal, regulatory, or investigative requirements.

### Archival Process
The systematic process of moving data from active storage to long-term archival storage while maintaining accessibility and integrity.

### Secure Deletion
Cryptographically secure data destruction that meets legal and regulatory requirements for permanent data removal.

## Retention Periods

The system supports various retention periods aligned with legal and regulatory requirements:

### Standard Periods
- **1 Year (1Y)** - Temporary data, preliminary investigations
- **3 Years (3Y)** - Administrative records, non-critical evidence
- **5 Years (5Y)** - Standard case documentation, witness statements
- **7 Years (7Y)** - Critical evidence, financial crime data (default for most cases)
- **10 Years (10Y)** - Serious crimes, terrorism-related cases
- **PERMANENT** - Cases of national security importance, precedent-setting cases

### Special Statuses
- **LEGAL_HOLD** - Data under litigation or regulatory investigation
- **DESTROYED** - Data that has been securely deleted per policy
- **ARCHIVED** - Data moved to long-term storage but still accessible

## Policy Configuration

### Creating Retention Policies

```json
{
  "name": "Criminal Case Evidence Policy",
  "description": "Standard retention for criminal case evidence",
  "entity_type": "EVIDENCE",
  "retention_period": "YEARS_7",
  "auto_archive": true,
  "auto_delete": false,
  "conditions": {
    "case_status": "CLOSED",
    "evidence_type": "DIGITAL"
  },
  "legal_hold_override": true,
  "notification_days": [30, 7, 1]
}
```

### Policy Components

**Basic Settings**:
- `name`: Descriptive policy name
- `description`: Detailed policy description
- `entity_type`: Data type (CASE, EVIDENCE, USER, etc.)
- `retention_period`: How long to retain data

**Automation Settings**:
- `auto_archive`: Automatically move to archive storage
- `auto_delete`: Automatically delete after retention period
- `legal_hold_override`: Allow legal holds to override policy

**Conditions**:
- Complex conditions for policy application
- Support for multiple criteria and logical operators
- Dynamic evaluation based on entity properties

**Notifications**:
- `notification_days`: Days before action to send notifications
- Email alerts to stakeholders
- Dashboard warnings and reminders

## Entity-Specific Policies

### Case Data Retention
- **Active Cases**: No automatic deletion
- **Closed Cases**: 7-year default retention
- **Archived Cases**: Moved to long-term storage after 2 years
- **Cold Cases**: Permanent retention with periodic review

### Evidence Retention
- **Digital Evidence**: 7-10 year retention based on crime severity
- **Physical Evidence**: Coordinate with evidence room policies
- **Forensic Reports**: Match parent evidence retention
- **Chain of Custody**: Permanent retention for audit purposes

### User Data Retention
- **Active Users**: No automatic deletion
- **Inactive Users**: 3-year retention after last activity
- **Terminated Users**: 1-year retention for audit purposes
- **Administrative Logs**: 7-year retention for compliance

### Audit Log Retention
- **Security Events**: 7-year retention minimum
- **Access Logs**: 3-year retention for regular access
- **Configuration Changes**: 10-year retention
- **Compliance Logs**: Varies by regulatory requirement

## Archival Process

### Automatic Archival
The system automatically identifies data eligible for archival based on:

1. **Age-Based Criteria**
   - Data age exceeds threshold (e.g., 2 years for closed cases)
   - Last access time exceeds specified period
   - System-defined archival triggers

2. **Status-Based Criteria**
   - Case status changes (e.g., closed to archived)
   - Evidence status updates
   - User deactivation

3. **Storage-Based Criteria**
   - Storage space thresholds
   - Performance optimization needs
   - Cost optimization triggers

### Archive Creation Process

1. **Selection and Validation**
   - Identify eligible data based on policies
   - Validate data integrity before archival
   - Check for legal holds and exceptions
   - Verify policy compliance

2. **Data Preparation**
   - Serialize data structures to JSON format
   - Generate comprehensive metadata
   - Create data checksums for integrity
   - Prepare related data dependencies

3. **Compression and Encryption**
   - Apply gzip compression to reduce storage
   - Encrypt using AES-256 encryption
   - Generate archive-specific encryption keys
   - Create tamper-detection signatures

4. **Storage and Indexing**
   - Store encrypted archives in secure location
   - Create searchable archive index
   - Update database with archive references
   - Generate archive integrity certificates

5. **Verification and Cleanup**
   - Verify archive integrity and accessibility
   - Test data restoration procedures
   - Remove original data from active storage
   - Update audit logs and compliance records

### Archive Storage Structure
```
archives/
├── 2024/
│   ├── 01/  # January
│   │   ├── cases/
│   │   │   ├── case_123_20240115.enc
│   │   │   └── case_456_20240128.enc
│   │   ├── evidence/
│   │   │   ├── evidence_789_20240110.enc
│   │   │   └── evidence_012_20240125.enc
│   │   └── users/
│   │       ├── user_345_20240105.enc
│   │       └── user_678_20240120.enc
│   └── 02/  # February
└── index/
    ├── archive_index.db
    ├── checksum_registry.json
    └── recovery_metadata.json
```

## Legal Hold Management

### Implementing Legal Holds
Legal holds prevent automatic data deletion and archival for data subject to legal proceedings or regulatory investigation.

```json
{
  "hold_id": "HOLD-2024-001",
  "title": "Smith v. JCTC Investigation",
  "description": "Data preservation for ongoing litigation",
  "entities": [
    {
      "type": "CASE",
      "id": "case-123",
      "scope": "ALL_DATA"
    },
    {
      "type": "USER", 
      "id": "user-456",
      "scope": "ACCESS_LOGS"
    }
  ],
  "effective_date": "2024-01-15",
  "expiration_date": null,
  "custodian": "legal@jctc.gov.ng",
  "reason": "LITIGATION"
}
```

### Legal Hold Types
- **LITIGATION**: Data subject to legal proceedings
- **REGULATORY**: Regulatory investigation or audit
- **INTERNAL**: Internal investigation or review
- **PRESERVATION**: General preservation request

### Hold Scope Options
- **ALL_DATA**: Complete data preservation
- **METADATA_ONLY**: Preserve metadata but allow content archival
- **ACCESS_LOGS**: Preserve only access and audit logs
- **CUSTOM**: Custom scope definition

## Data Recovery and Restoration

### Archive Access
Archived data remains accessible through the system but may require additional retrieval time:

```http
GET /api/v1/audit/retention/archives/search?case_id=123&date_range=2023
```

### Data Restoration Process
1. **Request Validation**
   - Verify user permissions for data access
   - Confirm legitimate business need
   - Check legal hold status

2. **Archive Retrieval**
   - Locate archive in storage system
   - Download encrypted archive file
   - Verify archive integrity

3. **Decryption and Decompression**
   - Decrypt using stored encryption keys
   - Decompress archive contents
   - Verify data integrity checksums

4. **Data Reconstruction**
   - Deserialize data structures
   - Restore database relationships
   - Update access timestamps

5. **Temporary Restoration**
   - Restore data to temporary location
   - Provide access for specified duration
   - Monitor access and usage

6. **Cleanup**
   - Remove temporary restored data
   - Update access logs
   - Generate restoration report

### Restoration Time Expectations
- **Recent Archives** (< 1 year): 5-15 minutes
- **Standard Archives** (1-5 years): 15-60 minutes
- **Deep Archives** (> 5 years): 1-4 hours
- **Cold Storage**: 4-24 hours

## Compliance Integration

### Regulatory Alignment
The retention system aligns with various regulatory requirements:

**GDPR Requirements**:
- Right to erasure (right to be forgotten)
- Data minimization principles
- Storage limitation requirements
- Lawful basis for processing

**SOX Requirements**:
- 7-year retention for financial records
- Audit trail preservation
- Internal control documentation

**Local Legal Requirements**:
- Nigerian cybercrime law retention periods
- Court order compliance
- Evidence preservation standards

### Compliance Reporting
Regular reports demonstrate compliance with retention policies:

- **Retention Compliance Report**: Status of all retention policies
- **Legal Hold Report**: Active legal holds and compliance
- **Deletion Certificate**: Proof of secure data deletion
- **Archive Integrity Report**: Verification of archived data

## Storage Optimization

### Compression Efficiency
The system uses advanced compression to minimize storage requirements:
- **Text Data**: 70-90% compression ratio
- **Binary Data**: 40-60% compression ratio  
- **Database Exports**: 80-95% compression ratio
- **Log Files**: 85-95% compression ratio

### Deduplication
Intelligent deduplication reduces redundant storage:
- **File-Level**: Identical files stored once
- **Block-Level**: Common data blocks shared
- **Cross-Entity**: Shared data across cases/evidence

### Storage Tiering
Different storage tiers optimize cost and performance:
- **Hot Storage**: Frequently accessed data (SSD)
- **Warm Storage**: Occasionally accessed data (HDD) 
- **Cold Storage**: Rarely accessed data (tape/cloud)
- **Archive Storage**: Long-term retention (cold cloud)

## Monitoring and Alerting

### Retention Monitoring
Continuous monitoring ensures policy compliance:

- **Policy Execution**: Success/failure of retention actions
- **Storage Usage**: Archive storage consumption trends
- **Access Patterns**: Frequency of archive access
- **Integrity Verification**: Regular archive integrity checks

### Alert Types
- **Upcoming Expiration**: Data approaching retention limit
- **Legal Hold Conflict**: Policy conflicts with legal holds
- **Storage Threshold**: Archive storage approaching limits
- **Integrity Failure**: Archive corruption detected
- **Policy Violation**: Data not processed per policy

### Dashboard Metrics
- Active retention policies and coverage
- Archive storage usage and trends
- Legal holds and affected data volume
- Upcoming retention actions
- Policy compliance score

## API Operations

### Policy Management
```http
# Create retention policy
POST /api/v1/audit/retention/policies
{
  "name": "Evidence Retention Policy",
  "entity_type": "EVIDENCE",
  "retention_period": "YEARS_7"
}

# Execute policies manually
POST /api/v1/audit/retention/execute
{
  "policy_ids": ["policy-123"],
  "dry_run": false
}
```

### Archive Management
```http
# Search archives
GET /api/v1/audit/retention/archives?entity_type=CASE&year=2023

# Restore archived data
POST /api/v1/audit/retention/archives/{archive_id}/restore
{
  "duration_hours": 24,
  "reason": "Investigation review"
}
```

### Legal Hold Management
```http
# Create legal hold
POST /api/v1/audit/retention/legal-holds
{
  "title": "Regulatory Investigation",
  "entities": [{"type": "CASE", "id": "123"}]
}
```

## Best Practices

### Policy Design
- Align with legal and regulatory requirements
- Consider storage costs and access patterns
- Implement graduated retention (active → archive → delete)
- Plan for legal hold scenarios
- Regular policy review and updates

### Monitoring
- Set up proactive alerts for upcoming actions
- Regular archive integrity verification
- Monitor storage usage and optimize
- Track policy compliance metrics
- Review and adjust based on access patterns

### Security
- Encrypt all archived data
- Secure archive storage locations  
- Regular backup of archive indices
- Access control for archive management
- Audit all retention-related activities

The data retention and archival system provides the foundation for compliant, efficient, and secure data lifecycle management in the JCTC platform, ensuring that investigative data is preserved appropriately while optimizing resources and meeting regulatory requirements.