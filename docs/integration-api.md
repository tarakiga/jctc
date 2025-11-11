# Integration API Documentation

## Overview

The JCTC Integration API provides comprehensive external system integration capabilities, enabling seamless connectivity with forensic tools, law enforcement databases, and third-party systems. The API supports webhooks, data synchronization, automated workflows, and real-time monitoring.

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication & Authorization](#authentication--authorization)
- [Integration Management](#integration-management)
- [Webhook System](#webhook-system)
- [API Key Management](#api-key-management)
- [Data Export & Import](#data-export--import)
- [External System Connectors](#external-system-connectors)
- [Monitoring & Analytics](#monitoring--analytics)
- [Data Transformation](#data-transformation)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Base URL
```
https://api.jctc.com/api/v1/integrations/
```

### Required Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Integration Types Supported
- **Forensic Tools**: Cellebrite UFED, Oxygen Suite, XRY Mobile
- **Databases**: INTERPOL I-24/7, AFIS, Criminal Records
- **APIs**: REST/GraphQL external services
- **Webhooks**: Event-driven notifications
- **File Systems**: Network drives and cloud storage
- **Messaging**: Email, SMS, and notification systems

## Authentication & Authorization

### User Permissions
- **Admin**: Full integration management, API key generation
- **Supervisor**: Integration configuration, monitoring, templates
- **Liaison**: International system integration, data sync
- **Investigator**: Read-only access to integration data

### JWT Token Requirements
All Integration API requests require valid JWT authentication with appropriate role permissions.

## Integration Management

### Create Integration

```http
POST /integrations/
{
  "name": "Cellebrite UFED Integration",
  "description": "Mobile forensics extraction tool",
  "integration_type": "forensic_tool",
  "system_identifier": "cellebrite_main",
  "config": {
    "base_url": "http://localhost:8080/api",
    "authentication": {
      "type": "api_key",
      "api_key": "your_api_key_here"
    },
    "timeout_seconds": 300,
    "retry_attempts": 3
  },
  "is_active": true,
  "auto_sync": true,
  "sync_interval_minutes": 60,
  "data_retention_days": 365,
  "tags": ["forensic", "mobile", "extraction"]
}
```

### Response
```json
{
  "id": "integration_id_123",
  "name": "Cellebrite UFED Integration",
  "status": "active",
  "integration_type": "forensic_tool",
  "is_active": true,
  "total_requests": 0,
  "successful_requests": 0,
  "failed_requests": 0,
  "average_response_time": 0.0,
  "created_at": "2023-10-07T10:00:00Z",
  "created_by": "user_id"
}
```

### List Integrations

```http
GET /integrations/?status=active&system_type=forensic_tool&limit=20
```

### Update Integration

```http
PUT /integrations/{integration_id}
{
  "name": "Updated Integration Name",
  "is_active": false,
  "sync_interval_minutes": 120
}
```

### Test Integration Connectivity

```http
POST /integrations/{integration_id}/test
```

**Response:**
```json
{
  "success": true,
  "response_time_ms": 150,
  "status_code": 200,
  "capabilities_detected": ["extract", "analyze", "report"],
  "version_info": {
    "software_version": "9.0.1",
    "api_version": "2.0"
  },
  "tested_at": "2023-10-07T10:05:00Z"
}
```

## Webhook System

### Create Webhook

```http
POST /webhooks/
{
  "name": "Case Update Notifications",
  "description": "Notify external system of case updates",
  "url": "https://external-system.com/webhook/case-updates",
  "method": "POST",
  "event_types": ["case.created", "case.updated", "evidence.added"],
  "headers": {
    "X-API-Key": "external_system_key",
    "Content-Type": "application/json"
  },
  "timeout_seconds": 30,
  "retry_attempts": 3,
  "retry_delay_seconds": 5,
  "is_active": true,
  "verify_ssl": true,
  "secret_token": "webhook_secret_for_signature"
}
```

### Webhook Payload Format

```json
{
  "event_type": "case.created",
  "timestamp": "2023-10-07T10:00:00Z",
  "event_id": "evt_123456",
  "data": {
    "case_id": "case_789",
    "case_number": "JCTC-2023-001234",
    "title": "Online Fraud Investigation",
    "status": "active",
    "priority": "high",
    "created_by": "officer_123"
  },
  "metadata": {
    "source": "jctc_system",
    "version": "1.0"
  }
}
```

### Webhook Security

The system uses HMAC-SHA256 signatures for webhook verification:

```javascript
// Verify webhook signature (example in Node.js)
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}
```

### Event Types Available

- **case.created** - New case registered
- **case.updated** - Case information changed
- **case.assigned** - Case assigned to officer
- **task.created** - New task created
- **task.completed** - Task marked complete
- **evidence.added** - Evidence uploaded
- **evidence.analyzed** - Forensic analysis complete
- **user.logged_in** - User authentication
- **system.alert** - System notifications

### Test Webhook

```http
POST /webhooks/{webhook_id}/test
{
  "title": "Test Event",
  "body": "This is a test webhook delivery"
}
```

### Webhook Delivery Status

```http
GET /webhooks/{webhook_id}/deliveries?status=failed&limit=10
```

**Response:**
```json
{
  "deliveries": [
    {
      "id": "delivery_123",
      "event_type": "case.created",
      "status": "failed",
      "http_status": 500,
      "error_message": "Internal Server Error",
      "attempt_count": 3,
      "next_retry_at": "2023-10-07T11:00:00Z",
      "created_at": "2023-10-07T10:00:00Z"
    }
  ]
}
```

### Retry Failed Delivery

```http
POST /webhooks/deliveries/{delivery_id}/retry
```

## API Key Management

### Generate API Key

```http
POST /api-keys/
{
  "name": "External System Access",
  "description": "API access for forensic tool integration",
  "permissions": ["read:cases", "write:evidence", "read:reports"],
  "expires_at": "2024-12-31T23:59:59Z",
  "rate_limit_per_hour": 1000,
  "allowed_ips": ["192.168.1.100", "10.0.0.50"],
  "metadata": {
    "department": "forensics",
    "tool": "cellebrite"
  }
}
```

**Response:**
```json
{
  "id": "key_123",
  "name": "External System Access",
  "api_key": "jctc_sk_1234567890abcdef...",
  "key_preview": "jctc_sk_12...cdef",
  "permissions": ["read:cases", "write:evidence"],
  "expires_at": "2024-12-31T23:59:59Z",
  "rate_limit_per_hour": 1000,
  "created_at": "2023-10-07T10:00:00Z"
}
```

**⚠️ Important**: The full API key is only shown once upon creation. Store it securely.

### Available Permissions

- **read:cases** - View case information
- **write:cases** - Create and update cases
- **delete:cases** - Delete cases
- **read:evidence** - View evidence
- **write:evidence** - Upload and modify evidence
- **delete:evidence** - Delete evidence
- **read:users** - View user information
- **write:users** - Manage users
- **read:reports** - Access reports
- **write:reports** - Generate reports
- **admin:all** - Full system access

### Using API Keys

Include the API key in the Authorization header:

```http
Authorization: Bearer jctc_sk_1234567890abcdef...
```

### Revoke API Key

```http
DELETE /api-keys/{key_id}
```

### List API Keys

```http
GET /api-keys/?active_only=true
```

## Data Export & Import

### Export Data

```http
POST /export/
{
  "data_type": "cases",
  "format": "json",
  "filters": {
    "status": "active",
    "created_after": "2023-01-01"
  },
  "include_relations": true,
  "date_range": {
    "start": "2023-01-01T00:00:00Z",
    "end": "2023-12-31T23:59:59Z"
  },
  "limit": 1000,
  "background_processing": true,
  "notification_email": "admin@jctc.gov.ng",
  "encryption_password": "secure_password"
}
```

**Response:**
```json
{
  "job_id": "export_job_123",
  "data_type": "cases",
  "format": "json",
  "status": "pending",
  "progress_percentage": 0,
  "created_at": "2023-10-07T10:00:00Z",
  "expires_at": "2023-11-07T10:00:00Z"
}
```

### Check Export Status

```http
GET /export/{job_id}/status
```

**Response:**
```json
{
  "job_id": "export_job_123",
  "status": "completed",
  "progress_percentage": 100,
  "total_records": 1500,
  "processed_records": 1500,
  "file_size": 2048576,
  "download_url": "/export/job_123/download",
  "completed_at": "2023-10-07T10:15:00Z"
}
```

### Download Export

```http
GET /export/{job_id}/download
```

### Import Data

```http
POST /import/
{
  "data_type": "cases",
  "format": "json",
  "data": "... JSON data or file reference ...",
  "mapping_config": {
    "external_id": "case_id",
    "external_title": "title",
    "external_status": "status"
  },
  "validation_mode": "strict",
  "duplicate_handling": "update",
  "batch_size": 100,
  "notification_email": "admin@jctc.gov.ng"
}
```

### Supported Export Formats

- **JSON** - Structured data with full schema
- **XML** - Standards-compliant XML format
- **CSV** - Tabular data for spreadsheets
- **PDF** - Formatted reports for printing
- **Excel** - Native Excel format with multiple sheets

### Supported Import Formats

- **JSON** - Structured data import
- **XML** - Standards-compliant XML
- **CSV** - Comma-separated values

## External System Connectors

### List Available Connectors

```http
GET /connectors/
```

**Response:**
```json
{
  "connectors": [
    {
      "connector_id": "cellebrite_ufed",
      "name": "Cellebrite UFED",
      "description": "Mobile forensic extraction and analysis",
      "system_type": "forensic_tool",
      "supported_versions": ["7.x", "8.x", "9.x"],
      "required_credentials": ["license_key", "api_token"],
      "capabilities": ["extract", "analyze", "report"],
      "is_available": true,
      "documentation_url": "https://docs.cellebrite.com/api"
    }
  ]
}
```

### Connect External System

```http
POST /connectors/forensic_tools/connect
{
  "base_url": "http://cellebrite-server:8080",
  "authentication": {
    "license_key": "CELL-12345-67890",
    "api_token": "token_abc123"
  },
  "timeout_seconds": 300,
  "verify_ssl": true,
  "custom_settings": {
    "extraction_path": "C:\\Extractions",
    "auto_process": true
  }
}
```

### Synchronize External Data

```http
POST /connectors/databases/sync
{
  "sync_direction": "import",
  "entity_types": ["cases", "evidence"],
  "filters": {
    "modified_since": "2023-10-01T00:00:00Z"
  },
  "schedule_type": "manual"
}
```

### Available Connectors

#### Forensic Tools
- **Cellebrite UFED** - Mobile device extraction
- **Oxygen Forensic Suite** - Comprehensive digital forensics
- **XRY Mobile** - Mobile analysis platform
- **EnCase** - Digital investigation platform
- **FTK (Forensic Toolkit)** - Computer forensics

#### Databases
- **INTERPOL I-24/7** - International police database
- **AFIS** - Automated Fingerprint Identification
- **CODIS** - DNA database system
- **NCIC** - National Crime Information Center
- **Europol** - European police database

#### Law Enforcement Systems
- **UNODC** - UN Office on Drugs and Crime
- **Regional Police Networks** - ASEANAPOL, AMERIPOL
- **Financial Intelligence Units** - Anti-money laundering

## Monitoring & Analytics

### Integration Health Status

```http
GET /health/
```

**Response:**
```json
{
  "overall_status": "healthy",
  "total_integrations": 15,
  "active_integrations": 14,
  "failed_integrations": 1,
  "average_response_time": 245.5,
  "error_rate_24h": 2.1,
  "last_check": "2023-10-07T10:00:00Z",
  "issues": [
    {
      "integration_id": "int_456",
      "issue": "High response time",
      "severity": "warning"
    }
  ]
}
```

### Performance Metrics

```http
GET /metrics/?timeframe=24h&integration_id=int_123
```

**Response:**
```json
{
  "timeframe": "24h",
  "integration_id": "int_123",
  "total_requests": 1250,
  "successful_requests": 1223,
  "failed_requests": 27,
  "average_response_time": 187.3,
  "min_response_time": 45,
  "max_response_time": 2300,
  "error_rate": 2.16,
  "uptime_percentage": 97.84,
  "data_points": [
    {
      "timestamp": "2023-10-07T09:00:00Z",
      "requests": 52,
      "avg_response_time": 165.2,
      "errors": 1
    }
  ],
  "top_errors": [
    {
      "error": "Connection timeout",
      "count": 15,
      "percentage": 55.6
    }
  ]
}
```

### Integration Logs

```http
GET /logs/?level=error&integration_id=int_123&limit=50
```

**Response:**
```json
{
  "logs": [
    {
      "id": "log_789",
      "integration_id": "int_123",
      "level": "error",
      "message": "API connection failed",
      "details": {
        "endpoint": "/api/extract",
        "status_code": 500,
        "response_time": 30000
      },
      "timestamp": "2023-10-07T10:00:00Z",
      "user_id": "user_456"
    }
  ]
}
```

## Data Transformation

### Create Data Mapping

```http
POST /mappings/
{
  "name": "INTERPOL to JCTC Case Mapping",
  "description": "Field mapping for INTERPOL case data",
  "source_system": "interpol_database",
  "target_system": "jctc_cases",
  "field_mappings": {
    "incident_id": "case_number",
    "incident_title": "title",
    "incident_status": "status",
    "creation_date": "created_at",
    "officer_name": "assigned_officer"
  },
  "transformation_rules": {
    "status": {
      "type": "replace",
      "from": "OPEN",
      "to": "active"
    },
    "created_at": {
      "type": "format_date",
      "format": "%Y-%m-%d %H:%M:%S"
    }
  },
  "validation_rules": {
    "case_number": {
      "type": "required"
    },
    "title": {
      "type": "max_length",
      "max": 255
    }
  }
}
```

### Transform Data

```http
POST /transform/
{
  "mapping_id": "mapping_123",
  "source_data": {
    "incident_id": "INT-2023-001",
    "incident_title": "Cybercrime Investigation",
    "incident_status": "OPEN",
    "creation_date": "2023-10-07 10:00:00",
    "officer_name": "Inspector Smith"
  },
  "apply_validation": true
}
```

**Response:**
```json
{
  "transformed_data": {
    "case_number": "INT-2023-001",
    "title": "Cybercrime Investigation",
    "status": "active",
    "created_at": "2023-10-07 10:00:00",
    "assigned_officer": "Inspector Smith"
  },
  "validation_errors": [],
  "warnings": [],
  "transformation_time_ms": 15,
  "timestamp": "2023-10-07T10:00:00Z"
}
```

## Integration Templates

### List Templates

```http
GET /templates/?system_type=forensic_tool
```

**Response:**
```json
{
  "templates": [
    {
      "template_id": "cellebrite_template",
      "name": "Cellebrite UFED Integration",
      "description": "Pre-configured integration for Cellebrite UFED",
      "system_type": "forensic_tool",
      "vendor": "Cellebrite",
      "version_compatibility": ["8.x", "9.x"],
      "default_config": {
        "tool_path": "C:\\Program Files\\Cellebrite\\UFED",
        "api_endpoint": "http://localhost:8080/api",
        "timeout_seconds": 300
      },
      "required_fields": ["license_key", "api_token"],
      "setup_instructions": "Install Cellebrite UFED and configure API access",
      "is_verified": true,
      "usage_count": 25
    }
  ]
}
```

### Apply Template

```http
POST /templates/{template_id}/apply
{
  "config_overrides": {
    "api_endpoint": "http://custom-server:8080/api",
    "timeout_seconds": 600
  },
  "custom_name": "Custom Cellebrite Setup",
  "custom_description": "Cellebrite setup for Lab 2"
}
```

## Best Practices

### 1. Security

**API Key Management:**
```javascript
// Store API keys securely
const apiKey = process.env.JCTC_API_KEY;

// Use HTTPS only
const baseURL = 'https://api.jctc.com';

// Implement proper error handling
try {
    const response = await fetch(`${baseURL}/api/v1/integrations/`, {
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
} catch (error) {
    console.error('Integration API error:', error);
    throw error;
}
```

**Webhook Security:**
```javascript
// Always verify webhook signatures
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
    );
}

// Validate webhook payload
if (!verifyWebhook(requestBody, headers['x-signature'], webhookSecret)) {
    return res.status(401).send('Invalid signature');
}
```

### 2. Performance

**Rate Limiting:**
- Respect API key rate limits (default: 1000 requests/hour)
- Implement exponential backoff for retries
- Use batch operations when available

**Connection Management:**
```javascript
// Implement connection pooling
const https = require('https');

const agent = new https.Agent({
    keepAlive: true,
    maxSockets: 10,
    timeout: 30000
});

// Reuse connections
fetch(url, { 
    agent,
    timeout: 30000
});
```

**Caching:**
```javascript
// Cache frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCachedIntegration(id) {
    const cached = cache.get(id);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    
    const data = await fetchIntegration(id);
    cache.set(id, { data, timestamp: Date.now() });
    return data;
}
```

### 3. Error Handling

**Retry Logic:**
```javascript
async function apiRequestWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            
            if (response.ok) {
                return response.json();
            }
            
            // Don't retry client errors (4xx)
            if (response.status >= 400 && response.status < 500) {
                throw new Error(`Client error: ${response.status}`);
            }
            
            // Server error - retry with backoff
            if (i < maxRetries - 1) {
                await delay(Math.pow(2, i) * 1000);
                continue;
            }
            
            throw new Error(`Server error: ${response.status}`);
            
        } catch (error) {
            if (i === maxRetries - 1) {
                throw error;
            }
            await delay(Math.pow(2, i) * 1000);
        }
    }
}
```

### 4. Monitoring

**Health Checks:**
```javascript
// Regular health monitoring
setInterval(async () => {
    try {
        const health = await fetch('/api/v1/integrations/health/');
        const status = await health.json();
        
        if (status.overall_status !== 'healthy') {
            console.warn('Integration health warning:', status.issues);
            // Send alert to monitoring system
        }
    } catch (error) {
        console.error('Health check failed:', error);
    }
}, 5 * 60 * 1000); // Every 5 minutes
```

**Metrics Collection:**
```javascript
// Track integration performance
class IntegrationMetrics {
    constructor() {
        this.metrics = new Map();
    }
    
    recordRequest(integrationId, responseTime, success) {
        const key = `${integrationId}_${new Date().toISOString().slice(0, 13)}`;
        const existing = this.metrics.get(key) || { count: 0, totalTime: 0, errors: 0 };
        
        existing.count++;
        existing.totalTime += responseTime;
        if (!success) existing.errors++;
        
        this.metrics.set(key, existing);
    }
    
    getMetrics(integrationId) {
        // Return aggregated metrics
        const prefix = `${integrationId}_`;
        const relevant = Array.from(this.metrics.entries())
            .filter(([key]) => key.startsWith(prefix));
        
        return this.aggregateMetrics(relevant);
    }
}
```

## Troubleshooting

### Common Issues

**1. Integration Connection Failures**

```http
GET /integrations/{integration_id}/test
```

**Possible Causes:**
- Incorrect base URL or endpoint
- Invalid authentication credentials
- Network connectivity issues
- Firewall blocking connections

**Solutions:**
```javascript
// Check configuration
const integration = await getIntegration(id);
console.log('Config:', integration.config);

// Test connectivity
const testResult = await testIntegration(id);
if (!testResult.success) {
    console.error('Connection failed:', testResult.error_message);
}

// Verify credentials
if (testResult.status_code === 401) {
    console.log('Authentication failed - check credentials');
}
```

**2. Webhook Delivery Failures**

```http
GET /webhooks/{webhook_id}/deliveries?status=failed
```

**Common Issues:**
- Target URL not accessible
- SSL certificate problems
- Invalid response from target
- Request timeout

**Debug Steps:**
```bash
# Test webhook URL manually
curl -X POST https://target-system.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Check SSL certificate
openssl s_client -connect target-system.com:443 -servername target-system.com

# Verify webhook signature
echo -n '{"test":true}' | openssl dgst -sha256 -hmac 'your_secret'
```

**3. Rate Limiting**

**Error Response:**
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 3600,
  "limit": 1000,
  "reset_time": "2023-10-07T11:00:00Z"
}
```

**Solution:**
```javascript
// Implement rate limiting awareness
class RateLimitedClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.requestCount = 0;
        this.resetTime = null;
    }
    
    async request(url, options = {}) {
        // Check if we're rate limited
        if (this.resetTime && Date.now() < this.resetTime) {
            const waitTime = this.resetTime - Date.now();
            console.log(`Rate limited. Waiting ${waitTime}ms`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                ...options.headers
            }
        });
        
        // Handle rate limiting
        if (response.status === 429) {
            const retryAfter = parseInt(response.headers.get('Retry-After') || '3600');
            this.resetTime = Date.now() + (retryAfter * 1000);
            throw new Error('Rate limited');
        }
        
        return response;
    }
}
```

**4. Data Export/Import Issues**

**Large Export Timeouts:**
```javascript
// Use background processing for large exports
const exportJob = await createExport({
    data_type: 'cases',
    background_processing: true, // Important for large datasets
    notification_email: 'admin@example.com'
});

// Poll for completion
const pollExportStatus = async (jobId) => {
    while (true) {
        const status = await getExportStatus(jobId);
        
        if (status.status === 'completed') {
            return status.download_url;
        }
        
        if (status.status === 'failed') {
            throw new Error(status.error_message);
        }
        
        console.log(`Export progress: ${status.progress_percentage}%`);
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
};
```

**Import Validation Errors:**
```javascript
// Handle validation errors gracefully
const importResult = await importData({
    data_type: 'cases',
    validation_mode: 'lenient', // Allow minor errors
    duplicate_handling: 'update' // Update existing records
});

if (importResult.status === 'failed') {
    console.log('Validation errors:', importResult.validation_errors);
    
    // Fix data and retry
    const fixedData = fixValidationErrors(originalData, importResult.validation_errors);
    await importData({ ...importConfig, data: fixedData });
}
```

### Debug Mode

Enable debug logging by adding the header:
```http
X-Debug: true
```

This provides additional response metadata:
```json
{
  "success": true,
  "data": { /* normal response */ },
  "debug": {
    "query_time": "145ms",
    "cache_hit": false,
    "integration_health": "healthy",
    "rate_limit_remaining": 850,
    "server_time": "2023-10-07T10:00:00Z"
  }
}
```

### Support Channels

- **Technical Documentation**: https://docs.jctc.com/integrations
- **API Support**: integration-support@jctc.gov.ng
- **Emergency Issues**: +234-XXX-XXXX-XXXX
- **Status Page**: https://status.jctc.com

### Error Codes Reference

- **INT001** - Invalid integration configuration
- **INT002** - Connection test failed
- **INT003** - Authentication failed
- **WHK001** - Webhook delivery failed
- **WHK002** - Invalid webhook signature
- **API001** - Invalid API key
- **API002** - API key expired
- **EXP001** - Export job failed
- **IMP001** - Import validation failed
- **SYN001** - Sync job timeout

## Changelog

### Version 1.2.0 (Latest)
- Added integration templates
- Enhanced webhook retry logic
- Improved error handling and logging
- Added data transformation capabilities
- New forensic tool connectors

### Version 1.1.0
- Initial Integration API release
- Basic webhook support
- API key management
- Data export/import functionality
- External system connectors