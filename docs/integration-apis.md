# Integration APIs

## Overview

The JCTC Integration APIs provide a comprehensive platform for connecting the JCTC Management System with external forensic tools, databases, partner agencies, and third-party services. This system enables seamless data exchange while maintaining security, audit trails, and forensic integrity.

## Key Features

- **Multi-Protocol Support**: REST API, SOAP, FTP, Database connections
- **Enterprise Security**: HMAC signatures, API keys, OAuth2, JWT authentication
- **Real-time Monitoring**: Health checks, metrics, and automated alerting
- **Data Transformation**: Flexible mapping engine with validation
- **Webhook Management**: Secure event-driven integrations
- **Audit Compliance**: Complete activity logging and reporting

## Architecture

### Integration Components

1. **Integration Management** - Core integration configuration and lifecycle
2. **Webhook System** - Event-driven real-time integrations
3. **API Key Management** - Secure authentication and access control
4. **Data Exchange** - Import/export with transformation capabilities
5. **Monitoring Platform** - Health checks, metrics, and alerting

### Security Model

- **Authentication**: Multiple methods (API Key, OAuth2, JWT, Basic Auth)
- **Authorization**: Role-based access control with granular permissions
- **Encryption**: TLS 1.3 for data in transit, AES-256 for data at rest
- **Audit Trails**: Complete logging of all integration activities
- **Rate Limiting**: Configurable quotas with automatic enforcement

## Getting Started

### Prerequisites

- JCTC Management System running (version 2.0+)
- Admin or Integration Manager role permissions
- Network access to external systems

### Basic Setup

1. **Access Integration Management**:
   ```
   Navigate to: http://localhost:8000/docs
   Login with admin credentials
   Locate: Integration APIs section
   ```

2. **Create First Integration**:
   ```json
   POST /api/v1/integrations/
   {
     "name": "EnCase Integration",
     "type": "FORENSIC_TOOL",
     "base_url": "https://encase.lab.local:8443",
     "auth_type": "API_KEY",
     "auth_config": {
       "api_key": "your-encase-api-key"
     },
     "is_active": true
   }
   ```

3. **Test Connectivity**:
   ```json
   POST /api/v1/integrations/{integration_id}/test
   ```

### Webhook Setup

1. **Create Webhook**:
   ```json
   POST /api/v1/integrations/webhooks/
   {
     "integration_id": "uuid-of-integration",
     "url": "https://external-system.com/webhooks/jctc",
     "events": ["case.created", "evidence.updated"],
     "secret": "webhook-secret-key"
   }
   ```

2. **Verify Webhook**:
   ```json
   POST /api/v1/integrations/webhooks/{webhook_id}/test
   ```

## API Reference

### Integration Management

#### Create Integration
```http
POST /api/v1/integrations/
Content-Type: application/json

{
  "name": "Integration Name",
  "type": "FORENSIC_TOOL|DATABASE|API|FTP",
  "base_url": "https://external-system.com",
  "auth_type": "API_KEY|OAUTH2|JWT|BASIC_AUTH",
  "auth_config": {...},
  "is_active": true,
  "timeout_seconds": 30,
  "retry_config": {
    "max_retries": 3,
    "retry_delay": 5
  }
}
```

#### Get Integration Details
```http
GET /api/v1/integrations/{integration_id}
```

#### Update Integration
```http
PUT /api/v1/integrations/{integration_id}
Content-Type: application/json

{
  "name": "Updated Name",
  "is_active": false
}
```

#### Test Integration
```http
POST /api/v1/integrations/{integration_id}/test
```

#### Get Health Status
```http
GET /api/v1/integrations/{integration_id}/health
```

### Webhook Management

#### Create Webhook
```http
POST /api/v1/integrations/webhooks/
Content-Type: application/json

{
  "integration_id": "uuid",
  "url": "https://external.com/webhook",
  "events": ["case.created", "evidence.updated"],
  "secret": "hmac-secret-key",
  "is_active": true
}
```

#### Get Webhook Details
```http
GET /api/v1/integrations/webhooks/{webhook_id}
```

#### Test Webhook
```http
POST /api/v1/integrations/webhooks/{webhook_id}/test
```

#### Rotate Secret
```http
POST /api/v1/integrations/webhooks/{webhook_id}/rotate-secret
```

### API Key Management

#### Generate API Key
```http
POST /api/v1/integrations/api-keys/
Content-Type: application/json

{
  "name": "External System Key",
  "permissions": ["read:cases", "write:evidence"],
  "rate_limit": 1000,
  "expires_at": "2024-12-31T23:59:59Z",
  "ip_whitelist": ["192.168.1.0/24"]
}
```

#### Get API Key Usage
```http
GET /api/v1/integrations/api-keys/{key_id}/usage
```

#### Rotate API Key
```http
POST /api/v1/integrations/api-keys/{key_id}/rotate
```

### Data Export/Import

#### Export Data
```http
POST /api/v1/integrations/data/export/cases
Content-Type: application/json

{
  "format": "JSON|CSV|XML",
  "filters": {
    "status": "ACTIVE",
    "created_after": "2024-01-01"
  },
  "transformation_rules": {
    "case_number": "id",
    "title": "case_title"
  }
}
```

#### Import Data
```http
POST /api/v1/integrations/data/import/evidence
Content-Type: application/json

{
  "format": "JSON",
  "data": [...],
  "validation_schema": "evidence_v1",
  "transformation_rules": {...}
}
```

## Authentication Methods

### API Key Authentication
```http
GET /api/v1/cases/
Authorization: Bearer your-api-key-here
```

### HMAC Signature Verification
```python
import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)
```

### OAuth2 Integration
```json
{
  "auth_type": "OAUTH2",
  "auth_config": {
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "token_url": "https://provider.com/oauth/token",
    "scope": "read write"
  }
}
```

## Data Transformation

### Mapping Rules
```json
{
  "transformation_rules": {
    "source_field": "target_field",
    "nested.field": "flat_field",
    "calculated_field": {
      "function": "concat",
      "fields": ["first_name", "last_name"],
      "separator": " "
    }
  }
}
```

### Custom Functions
```json
{
  "custom_functions": {
    "format_date": {
      "expression": "datetime.strptime(value, '%Y%m%d').isoformat()",
      "type": "python"
    },
    "normalize_phone": {
      "expression": "re.sub(r'[^0-9+]', '', value)",
      "type": "regex"
    }
  }
}
```

### Validation Schema
```json
{
  "validation_schema": {
    "case_number": {
      "type": "string",
      "required": true,
      "pattern": "^JCTC-\\d{4}-\\w{8}$"
    },
    "evidence_hash": {
      "type": "string",
      "required": true,
      "pattern": "^[a-f0-9]{64}$"
    }
  }
}
```

## Webhook Events

### Available Events
- `case.created` - New case created
- `case.updated` - Case information updated
- `case.closed` - Case closed or resolved
- `evidence.created` - New evidence item added
- `evidence.updated` - Evidence information updated
- `evidence.transferred` - Evidence custody transferred
- `party.created` - New party (suspect/victim/witness) added
- `legal_instrument.created` - New warrant/MLAT created
- `legal_instrument.executed` - Legal instrument executed
- `legal_instrument.expired` - Legal instrument expired

### Event Payload Structure
```json
{
  "event": "case.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "case_id": "uuid",
    "case_number": "JCTC-2024-ABC12345",
    "title": "Cybercrime Investigation",
    "status": "ACTIVE"
  },
  "meta": {
    "user_id": "uuid",
    "source": "jctc-api",
    "version": "1.0"
  }
}
```

### HMAC Signature
All webhook payloads include an HMAC signature:
```
X-JCTC-Signature: sha256=computed-hmac-signature
```

## Monitoring and Health Checks

### Health Check Endpoints
```http
GET /api/v1/integrations/{id}/health
GET /api/v1/integrations/health-summary
```

### Metrics Available
- Request/response times
- Success/error rates
- Data volume transferred
- Authentication failures
- Rate limit violations

### Alerting
Configure alerts for:
- Integration failures
- High error rates
- Performance degradation
- Security violations
- Quota exceeded

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "INTEGRATION_ERROR",
    "message": "Connection timeout to external system",
    "details": {
      "integration_id": "uuid",
      "error_type": "TIMEOUT",
      "retry_after": 300
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Circuit Breaker Pattern
Automatic failure detection and recovery:
- **CLOSED**: Normal operation
- **OPEN**: Failures detected, requests blocked
- **HALF_OPEN**: Testing recovery

### Retry Logic
- Exponential backoff
- Maximum retry attempts
- Configurable retry delays
- Dead letter queue for failed requests

## Security Best Practices

### API Key Management
- Rotate keys regularly (recommended: every 90 days)
- Use minimum required permissions
- Monitor key usage patterns
- Revoke unused keys immediately

### Webhook Security
- Always verify HMAC signatures
- Use HTTPS endpoints only
- Rotate webhook secrets regularly
- Implement idempotency handling

### Data Protection
- Encrypt sensitive data in transit and at rest
- Mask sensitive data in logs
- Implement data retention policies
- Regular security audits

### Access Control
- Use role-based permissions
- Implement IP whitelisting
- Monitor unusual access patterns
- Regular permission reviews

## Integration Examples

### EnCase Integration
```json
{
  "name": "EnCase Lab System",
  "type": "FORENSIC_TOOL",
  "base_url": "https://encase.lab.local:8443",
  "auth_type": "API_KEY",
  "auth_config": {
    "api_key": "encase-api-key",
    "api_key_header": "X-EnCase-API-Key"
  }
}
```

### INTERPOL Database
```json
{
  "name": "INTERPOL Red Notices",
  "type": "DATABASE",
  "base_url": "https://interpol-api.secure.com",
  "auth_type": "OAUTH2",
  "auth_config": {
    "client_id": "jctc-interpol-client",
    "client_secret": "secure-secret",
    "token_url": "https://interpol-api.secure.com/oauth/token"
  }
}
```

### Partner Agency Webhook
```json
{
  "name": "FBI IC3 Integration",
  "integration_id": "fbi-ic3-uuid",
  "url": "https://ic3.fbi.gov/api/jctc-webhook",
  "events": ["case.created", "case.closed"],
  "secret": "shared-secret-key"
}
```

## Troubleshooting

### Common Issues

#### Connection Timeouts
- Check network connectivity
- Verify firewall rules
- Increase timeout settings
- Check external system availability

#### Authentication Failures
- Verify credentials are correct
- Check token expiration
- Validate API key permissions
- Review authentication logs

#### Webhook Delivery Failures
- Verify webhook URL is accessible
- Check HMAC signature verification
- Review webhook event filters
- Monitor external system logs

#### Data Transformation Errors
- Validate transformation rules
- Check data format compatibility
- Review field mappings
- Test with sample data

### Debugging Tools

#### Log Analysis
```bash
# View integration logs
tail -f /var/log/jctc/integrations.log

# Filter by integration ID
grep "integration_id:uuid" /var/log/jctc/integrations.log
```

#### Health Check Testing
```bash
# Test integration health
curl -X GET "http://localhost:8000/api/v1/integrations/{id}/health"

# Test webhook connectivity
curl -X POST "http://localhost:8000/api/v1/integrations/webhooks/{id}/test"
```

## Best Practices

### Integration Design
- Design for failure and implement circuit breakers
- Use idempotent operations where possible
- Implement proper retry logic with backoff
- Monitor integration health continuously

### Data Management
- Validate data before processing
- Implement data transformation pipelines
- Use appropriate data formats for each use case
- Maintain data lineage and audit trails

### Security
- Follow principle of least privilege
- Implement defense in depth
- Regular security assessments
- Keep credentials secure and rotated

### Monitoring
- Set up comprehensive monitoring
- Implement alerting for critical issues
- Track key performance indicators
- Regular health checks

## Support and Resources

### Documentation
- [API Reference](./api-reference.md)
- [Webhook Configuration](./webhook-configuration.md)
- [Security Guide](./security-guide.md)

### Support
- Technical issues: Open GitHub issue
- Security concerns: Contact security team
- Integration requests: Submit feature request

### Community
- [Developer Forum](https://forum.jctc.gov.ng)
- [Knowledge Base](https://kb.jctc.gov.ng)
- [Training Resources](https://training.jctc.gov.ng)