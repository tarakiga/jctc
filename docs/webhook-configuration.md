# Webhook Configuration Guide

## Overview

This guide provides comprehensive instructions for configuring and managing webhooks in the JCTC Integration API system. Webhooks enable real-time event notifications to external systems, allowing for seamless integration and automated workflows.

## Table of Contents

- [Quick Start](#quick-start)
- [Webhook Types](#webhook-types)
- [Configuration Steps](#configuration-steps)
- [Event Types & Payloads](#event-types--payloads)
- [Security Implementation](#security-implementation)
- [Testing & Validation](#testing--validation)
- [Error Handling & Retries](#error-handling--retries)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Advanced Configuration](#advanced-configuration)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Quick Start

### 1. Create Your First Webhook

```http
POST /api/v1/integrations/webhooks/
Content-Type: application/json
Authorization: Bearer <your_jwt_token>

{
  "name": "Case Notifications",
  "description": "Notify external system when cases are created or updated",
  "url": "https://your-system.com/webhooks/jctc/cases",
  "method": "POST",
  "event_types": ["case.created", "case.updated"],
  "is_active": true,
  "verify_ssl": true,
  "secret_token": "your_webhook_secret_key"
}
```

### 2. Configure Your Endpoint

Ensure your webhook endpoint can:
- Accept POST requests
- Return HTTP 200-299 status codes for success
- Process JSON payloads
- Verify HMAC-SHA256 signatures (recommended)

### 3. Test the Webhook

```http
POST /api/v1/integrations/webhooks/{webhook_id}/test
{
  "title": "Test Notification",
  "body": "Testing webhook connectivity"
}
```

## Webhook Types

### 1. System Webhooks
- **Purpose**: Core system events (user auth, system alerts)
- **Use Cases**: Security monitoring, system health checks
- **Event Types**: `user.logged_in`, `system.alert`, `system.maintenance`

### 2. Case Management Webhooks  
- **Purpose**: Case lifecycle events
- **Use Cases**: External case tracking, workflow automation
- **Event Types**: `case.created`, `case.updated`, `case.assigned`, `case.closed`

### 3. Evidence Webhooks
- **Purpose**: Evidence handling events
- **Use Cases**: Chain of custody, forensic tool integration
- **Event Types**: `evidence.added`, `evidence.analyzed`, `evidence.transferred`

### 4. Task & Workflow Webhooks
- **Purpose**: Task management and workflow events
- **Use Cases**: Project management integration, deadline tracking
- **Event Types**: `task.created`, `task.assigned`, `task.completed`

### 5. Integration Webhooks
- **Purpose**: External system integration events
- **Use Cases**: Status monitoring, sync notifications
- **Event Types**: `integration.connected`, `integration.failed`, `sync.completed`

## Configuration Steps

### Step 1: Basic Webhook Setup

```javascript
// Example webhook creation
const webhookConfig = {
  name: "Evidence Processing Notifications",
  description: "Notify forensic lab when evidence analysis is complete",
  url: "https://forensic-lab.gov/api/webhooks/evidence",
  method: "POST",
  event_types: [
    "evidence.analyzed",
    "evidence.transferred",
    "analysis.completed"
  ],
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "lab_api_key_123",
    "X-Source": "JCTC-System"
  },
  timeout_seconds: 30,
  retry_attempts: 3,
  retry_delay_seconds: 5,
  is_active: true,
  verify_ssl: true,
  secret_token: "secure_webhook_secret"
};

const response = await fetch('/api/v1/integrations/webhooks/', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + jwt_token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(webhookConfig)
});
```

### Step 2: Advanced Configuration

```javascript
// Advanced webhook configuration with filtering and routing
const advancedWebhookConfig = {
  name: "Priority Case Alerts",
  description: "Immediate notifications for high-priority cases",
  url: "https://alert-system.gov/api/priority-alerts",
  method: "POST",
  event_types: ["case.created", "case.escalated"],
  
  // Event filtering
  filters: {
    priority: ["high", "critical"],
    case_type: ["terrorism", "cybercrime", "organized_crime"],
    status: ["active", "urgent"]
  },
  
  // Custom headers for routing
  headers: {
    "Content-Type": "application/json",
    "X-Priority-Level": "high",
    "X-Department": "investigations",
    "Authorization": "Bearer lab_token"
  },
  
  // Enhanced retry configuration
  timeout_seconds: 15,
  retry_attempts: 5,
  retry_delay_seconds: 2,
  retry_backoff_multiplier: 2, // Exponential backoff
  max_retry_delay_seconds: 60,
  
  // Security settings
  verify_ssl: true,
  allowed_response_codes: [200, 201, 202, 204],
  secret_token: "priority_alerts_secret_key",
  
  // Rate limiting
  rate_limit_per_minute: 100,
  burst_limit: 10,
  
  // Custom payload transformation
  payload_template: {
    alert_type: "jctc_case_notification",
    timestamp: "{{event.timestamp}}",
    case_data: "{{event.data}}",
    priority_level: "{{event.data.priority}}",
    custom_field: "Investigation Required"
  },
  
  is_active: true
};
```

### Step 3: Bulk Webhook Management

```javascript
// Create multiple webhooks for different departments
const departmentWebhooks = [
  {
    name: "Cybercrime Division Notifications",
    url: "https://cybercrime.gov/webhooks/cases",
    event_types: ["case.created"],
    filters: { case_type: ["cybercrime", "digital_fraud"] }
  },
  {
    name: "Forensics Lab Integration",  
    url: "https://forensics-lab.gov/api/evidence",
    event_types: ["evidence.added", "evidence.analyzed"],
    filters: { evidence_type: ["digital", "mobile", "computer"] }
  },
  {
    name: "International Liaison Alerts",
    url: "https://interpol-liaison.gov/api/notifications", 
    event_types: ["case.international_request"],
    filters: { international: true, priority: ["high", "critical"] }
  }
];

// Create all webhooks
for (const config of departmentWebhooks) {
  const webhook = await createWebhook(config);
  console.log(`Created webhook: ${webhook.name} (ID: ${webhook.id})`);
}
```

## Event Types & Payloads

### Case Events

#### case.created
```json
{
  "event_type": "case.created",
  "event_id": "evt_case_created_123",
  "timestamp": "2023-10-07T14:30:00Z",
  "data": {
    "case_id": "case_789012",
    "case_number": "JCTC-2023-001234",
    "title": "Online Banking Fraud Investigation",
    "description": "Suspicious online banking transactions reported",
    "case_type": "financial_crime",
    "priority": "high",
    "status": "active",
    "created_by": {
      "user_id": "user_456",
      "name": "Detective Sarah Johnson",
      "department": "cybercrime",
      "badge_number": "CYB-001"
    },
    "assigned_officers": [
      {
        "user_id": "user_789",
        "name": "Inspector Mike Chen",
        "role": "lead_investigator"
      }
    ],
    "location": {
      "state": "Lagos",
      "lga": "Victoria Island",
      "coordinates": {
        "latitude": 6.4281,
        "longitude": 3.4219
      }
    },
    "estimated_value": 2500000.00,
    "currency": "NGN",
    "tags": ["banking", "fraud", "digital", "urgent"],
    "classification": "restricted",
    "international": false,
    "expected_duration_days": 90
  },
  "metadata": {
    "source": "jctc_case_management",
    "api_version": "1.2",
    "environment": "production",
    "correlation_id": "corr_abc123"
  }
}
```

#### case.updated
```json
{
  "event_type": "case.updated",
  "event_id": "evt_case_updated_456",
  "timestamp": "2023-10-07T16:45:00Z",
  "data": {
    "case_id": "case_789012",
    "case_number": "JCTC-2023-001234",
    "changes": {
      "status": {
        "from": "active",
        "to": "under_review"
      },
      "priority": {
        "from": "high", 
        "to": "critical"
      },
      "assigned_officers": {
        "added": [
          {
            "user_id": "user_101",
            "name": "Superintendent Grace Okafor",
            "role": "supervisor"
          }
        ]
      }
    },
    "updated_by": {
      "user_id": "user_789",
      "name": "Inspector Mike Chen"
    },
    "update_reason": "New evidence suggests larger criminal network",
    "current_data": {
      "status": "under_review",
      "priority": "critical",
      "assigned_officers": [
        {
          "user_id": "user_789",
          "name": "Inspector Mike Chen",
          "role": "lead_investigator"
        },
        {
          "user_id": "user_101", 
          "name": "Superintendent Grace Okafor",
          "role": "supervisor"
        }
      ]
    }
  },
  "metadata": {
    "source": "jctc_case_management",
    "api_version": "1.2",
    "triggered_by": "manual_update"
  }
}
```

### Evidence Events

#### evidence.added
```json
{
  "event_type": "evidence.added",
  "event_id": "evt_evidence_added_789",
  "timestamp": "2023-10-07T11:20:00Z",
  "data": {
    "evidence_id": "evd_456789",
    "case_id": "case_789012",
    "case_number": "JCTC-2023-001234",
    "evidence_number": "EVID-2023-001234-001",
    "title": "Suspect's Mobile Phone",
    "description": "iPhone 14 Pro seized from primary suspect",
    "evidence_type": "digital_device",
    "category": "mobile_phone",
    "sub_category": "smartphone",
    "collected_by": {
      "user_id": "user_321",
      "name": "Officer David Adebayo",
      "badge_number": "FOR-045"
    },
    "collected_at": "2023-10-07T09:30:00Z",
    "collection_location": {
      "address": "15 Broad Street, Lagos Island",
      "gps_coordinates": {
        "latitude": 6.4541,
        "longitude": 3.3947
      }
    },
    "chain_of_custody": [
      {
        "user_id": "user_321",
        "action": "collected",
        "timestamp": "2023-10-07T09:30:00Z",
        "location": "crime_scene"
      },
      {
        "user_id": "user_654",
        "action": "received",
        "timestamp": "2023-10-07T11:20:00Z",
        "location": "evidence_room"
      }
    ],
    "physical_properties": {
      "brand": "Apple",
      "model": "iPhone 14 Pro",
      "serial_number": "FXXXXXXXX123",
      "imei": "123456789012345",
      "condition": "good",
      "battery_level": "15%"
    },
    "digital_properties": {
      "os_version": "iOS 16.6.1",
      "storage_capacity": "256GB",
      "encryption_status": "encrypted",
      "passcode_protected": true,
      "fingerprint_enabled": true,
      "face_id_enabled": true
    },
    "analysis_requirements": [
      "data_extraction",
      "deleted_files_recovery",
      "communication_analysis",
      "location_history"
    ],
    "priority": "high",
    "classification": "restricted",
    "estimated_analysis_time": "72_hours",
    "tags": ["mobile", "primary_evidence", "encrypted"]
  },
  "metadata": {
    "source": "jctc_evidence_management",
    "api_version": "1.2",
    "chain_verified": true
  }
}
```

#### evidence.analyzed
```json
{
  "event_type": "evidence.analyzed",
  "event_id": "evt_evidence_analyzed_012",
  "timestamp": "2023-10-09T14:15:00Z",
  "data": {
    "analysis_id": "anl_789012",
    "evidence_id": "evd_456789",
    "case_id": "case_789012",
    "analysis_type": "mobile_forensics",
    "tool_used": "Cellebrite UFED",
    "tool_version": "9.0.1",
    "analyst": {
      "user_id": "user_901",
      "name": "Dr. Funmi Adeleke",
      "certification": "GCFA, CCO",
      "department": "digital_forensics"
    },
    "analysis_started": "2023-10-08T09:00:00Z",
    "analysis_completed": "2023-10-09T14:15:00Z",
    "duration_hours": 29.25,
    "extraction_results": {
      "data_extracted": "45.2GB",
      "files_recovered": 12847,
      "deleted_files_recovered": 3291,
      "contacts_found": 456,
      "messages_found": 18932,
      "call_logs_found": 2847,
      "photos_found": 3421,
      "videos_found": 178,
      "apps_analyzed": 67
    },
    "key_findings": [
      {
        "type": "communication",
        "description": "Encrypted messaging apps with suspicious conversations",
        "apps": ["WhatsApp", "Telegram", "Signal"],
        "message_count": 2847,
        "relevance": "high"
      },
      {
        "type": "financial",
        "description": "Banking apps and cryptocurrency wallets",
        "apps": ["FirstBank", "GTBank", "Binance", "Luno"],
        "transaction_evidence": true,
        "relevance": "critical"
      },
      {
        "type": "location",
        "description": "Location history showing pattern of movements",
        "data_points": 15632,
        "date_range": "2023-06-01 to 2023-10-07",
        "relevance": "medium"
      }
    ],
    "report_generated": true,
    "report_path": "/reports/analysis/anl_789012_mobile_forensics.pdf",
    "hash_verification": {
      "evidence_hash": "sha256:a1b2c3d4e5f6...",
      "analysis_hash": "sha256:f6e5d4c3b2a1...",
      "verified": true
    },
    "next_actions": [
      "decrypt_messaging_apps",
      "analyze_financial_transactions", 
      "correlate_location_data",
      "prepare_court_presentation"
    ]
  },
  "metadata": {
    "source": "jctc_forensics_lab",
    "api_version": "1.2",
    "analysis_verified": true,
    "court_admissible": true
  }
}
```

### Task & Workflow Events

#### task.created
```json
{
  "event_type": "task.created",
  "event_id": "evt_task_created_345",
  "timestamp": "2023-10-07T13:45:00Z",
  "data": {
    "task_id": "task_123456",
    "case_id": "case_789012",
    "title": "Interview Witness - Jane Smith",
    "description": "Conduct formal interview with key witness regarding suspect's activities",
    "task_type": "interview",
    "priority": "high",
    "status": "assigned",
    "assigned_to": {
      "user_id": "user_789",
      "name": "Inspector Mike Chen",
      "department": "cybercrime"
    },
    "created_by": {
      "user_id": "user_456", 
      "name": "Detective Sarah Johnson"
    },
    "due_date": "2023-10-10T17:00:00Z",
    "estimated_duration": "2_hours",
    "location": "JCTC Headquarters - Interview Room 3",
    "requirements": [
      "witness_contact_verified",
      "interview_room_booked",
      "legal_counsel_notified"
    ],
    "dependencies": [
      {
        "task_id": "task_123455",
        "title": "Verify witness contact information",
        "status": "completed"
      }
    ],
    "tags": ["witness", "interview", "priority"]
  }
}
```

#### task.completed
```json
{
  "event_type": "task.completed",
  "event_id": "evt_task_completed_678", 
  "timestamp": "2023-10-10T16:30:00Z",
  "data": {
    "task_id": "task_123456",
    "case_id": "case_789012",
    "title": "Interview Witness - Jane Smith",
    "completed_by": {
      "user_id": "user_789",
      "name": "Inspector Mike Chen"
    },
    "completed_at": "2023-10-10T16:30:00Z",
    "actual_duration": "1.5_hours",
    "outcome": "successful",
    "results": {
      "interview_conducted": true,
      "statement_recorded": true,
      "new_evidence_identified": true,
      "follow_up_required": true
    },
    "deliverables": [
      {
        "type": "statement",
        "file_path": "/statements/JCTC-2023-001234-witness-jane-smith.pdf",
        "pages": 4,
        "signed": true
      },
      {
        "type": "audio_recording",
        "file_path": "/recordings/JCTC-2023-001234-interview-jane-smith.mp3",
        "duration": "1h 27m",
        "transcribed": true
      }
    ],
    "follow_up_tasks": [
      {
        "title": "Verify witness account with bank records",
        "priority": "medium",
        "assigned_to": "user_456"
      }
    ],
    "notes": "Witness provided crucial information about suspect's financial activities. Requires follow-up investigation of mentioned bank accounts."
  }
}
```

### System Events

#### system.alert
```json
{
  "event_type": "system.alert",
  "event_id": "evt_system_alert_901",
  "timestamp": "2023-10-07T22:15:00Z",
  "data": {
    "alert_type": "security_breach_attempt",
    "severity": "high",
    "title": "Multiple Failed Login Attempts Detected",
    "description": "Unusual login pattern detected from IP address 192.168.1.100",
    "source_ip": "192.168.1.100",
    "target_user": "detective.johnson",
    "attempt_count": 15,
    "time_window": "5_minutes",
    "geolocation": {
      "country": "Nigeria",
      "city": "Abuja",
      "isp": "MTN Nigeria"
    },
    "automated_response": {
      "account_locked": true,
      "ip_blocked": true,
      "admin_notified": true
    },
    "recommended_actions": [
      "investigate_source_ip",
      "verify_user_account_security",
      "review_access_logs",
      "update_security_policies"
    ],
    "system_component": "authentication_service",
    "error_codes": ["AUTH001", "AUTH002"],
    "risk_level": "medium"
  }
}
```

## Security Implementation

### 1. Signature Verification

**Server-Side Implementation (Node.js):**
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  // Create expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  // Compare signatures securely
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Express.js middleware example
function webhookVerification(req, res, next) {
  const signature = req.headers['x-jctc-signature'];
  const secret = process.env.JCTC_WEBHOOK_SECRET;
  
  if (!signature || !secret) {
    return res.status(401).json({ error: 'Missing signature or secret' });
  }
  
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  next();
}

// Webhook endpoint
app.post('/webhooks/jctc', webhookVerification, (req, res) => {
  const event = req.body;
  
  console.log(`Received ${event.event_type} event:`, event.data);
  
  // Process the webhook event
  processWebhookEvent(event);
  
  res.status(200).json({ success: true });
});
```

**Server-Side Implementation (Python):**
```python
import hmac
import hashlib
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

def verify_webhook_signature(payload, signature, secret):
    """Verify HMAC-SHA256 signature"""
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)

@app.route('/webhooks/jctc', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-JCTC-Signature')
    secret = os.environ.get('JCTC_WEBHOOK_SECRET')
    
    if not signature or not secret:
        return jsonify({'error': 'Missing signature or secret'}), 401
    
    payload = request.get_data(as_text=True)
    
    if not verify_webhook_signature(payload, signature, secret):
        return jsonify({'error': 'Invalid signature'}), 401
    
    event = request.json
    print(f"Received {event['event_type']} event")
    
    # Process the webhook event
    process_webhook_event(event)
    
    return jsonify({'success': True}), 200

def process_webhook_event(event):
    """Process different types of webhook events"""
    event_type = event['event_type']
    
    if event_type == 'case.created':
        handle_case_created(event['data'])
    elif event_type == 'evidence.analyzed':
        handle_evidence_analyzed(event['data'])
    elif event_type == 'system.alert':
        handle_system_alert(event['data'])
    else:
        print(f"Unhandled event type: {event_type}")
```

### 2. SSL/TLS Configuration

**Webhook SSL Requirements:**
```javascript
// Webhook configuration with SSL settings
const secureWebhookConfig = {
  name: "Secure Evidence Notifications",
  url: "https://forensics-lab.gov/webhooks/evidence",
  verify_ssl: true, // Always verify SSL certificates
  ssl_settings: {
    min_tls_version: "1.2",
    allowed_ciphers: [
      "ECDHE-RSA-AES256-GCM-SHA384",
      "ECDHE-RSA-AES128-GCM-SHA256"
    ],
    verify_hostname: true,
    ca_bundle_path: "/etc/ssl/certs/ca-bundle.crt"
  },
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "JCTC-Webhook-Client/1.2"
  }
};
```

### 3. IP Whitelisting

```javascript
// Configure IP restrictions for webhook deliveries
const restrictedWebhook = {
  name: "Internal System Integration",
  url: "https://internal-system.jctc.gov/webhooks/cases",
  allowed_source_ips: [
    "10.0.0.0/8",      // Internal network
    "172.16.0.0/12",   // Private range
    "192.168.0.0/16"   // Local range
  ],
  blocked_ips: [
    "suspicious.external.ip"
  ],
  geo_restrictions: {
    allowed_countries: ["NG"], // Only Nigeria
    block_tor_nodes: true,
    block_vpn_ranges: true
  }
};
```

## Testing & Validation

### 1. Manual Testing

```javascript
// Test webhook functionality
async function testWebhook(webhookId) {
  const testPayload = {
    title: "Webhook Test",
    body: "This is a test webhook delivery",
    test_data: {
      case_id: "test_case_123",
      priority: "high",
      test_mode: true
    }
  };
  
  try {
    const response = await fetch(`/api/v1/integrations/webhooks/${webhookId}/test`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testPayload)
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('Webhook test successful:', result);
      return {
        success: true,
        response_time: result.response_time_ms,
        status_code: result.status_code
      };
    } else {
      console.error('Webhook test failed:', result.error_message);
      return {
        success: false,
        error: result.error_message
      };
    }
  } catch (error) {
    console.error('Webhook test error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run comprehensive webhook tests
async function runWebhookTests() {
  const webhooks = await getWebhooks();
  
  for (const webhook of webhooks) {
    console.log(`Testing webhook: ${webhook.name}`);
    
    const testResult = await testWebhook(webhook.id);
    
    if (testResult.success) {
      console.log(`✅ ${webhook.name} - Response time: ${testResult.response_time}ms`);
    } else {
      console.log(`❌ ${webhook.name} - Error: ${testResult.error}`);
    }
  }
}
```

### 2. Automated Testing

```javascript
// Automated webhook testing suite
class WebhookTestSuite {
  constructor(baseUrl, authToken) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
    this.testResults = [];
  }
  
  async runAllTests() {
    console.log('Starting webhook test suite...');
    
    await this.testWebhookCreation();
    await this.testWebhookDelivery();
    await this.testSignatureVerification();
    await this.testRetryLogic();
    await this.testErrorHandling();
    
    this.generateTestReport();
  }
  
  async testWebhookCreation() {
    const testName = 'Webhook Creation';
    console.log(`Running test: ${testName}`);
    
    try {
      const webhook = await this.createTestWebhook({
        name: "Test Webhook",
        url: "https://httpbin.org/post",
        event_types: ["test.event"]
      });
      
      this.testResults.push({
        name: testName,
        passed: true,
        webhook_id: webhook.id
      });
      
      console.log(`✅ ${testName} passed`);
    } catch (error) {
      this.testResults.push({
        name: testName,
        passed: false,
        error: error.message
      });
      
      console.log(`❌ ${testName} failed: ${error.message}`);
    }
  }
  
  async testWebhookDelivery() {
    const testName = 'Webhook Delivery';
    console.log(`Running test: ${testName}`);
    
    try {
      // Find a test webhook
      const testWebhook = this.testResults
        .find(r => r.name === 'Webhook Creation' && r.passed);
      
      if (!testWebhook) {
        throw new Error('No test webhook available');
      }
      
      // Test delivery
      const deliveryResult = await this.triggerTestDelivery(testWebhook.webhook_id);
      
      // Check delivery status
      const deliveryStatus = await this.checkDeliveryStatus(
        testWebhook.webhook_id, 
        deliveryResult.delivery_id
      );
      
      this.testResults.push({
        name: testName,
        passed: deliveryStatus.status === 'delivered',
        delivery_time: deliveryStatus.response_time_ms
      });
      
      console.log(`✅ ${testName} passed - Delivered in ${deliveryStatus.response_time_ms}ms`);
    } catch (error) {
      this.testResults.push({
        name: testName,
        passed: false,
        error: error.message
      });
      
      console.log(`❌ ${testName} failed: ${error.message}`);
    }
  }
  
  async testSignatureVerification() {
    const testName = 'Signature Verification';
    console.log(`Running test: ${testName}`);
    
    try {
      // Test with correct signature
      const validSignature = await this.testSignature({
        payload: '{"test": "data"}',
        secret: 'test_secret',
        expected_valid: true
      });
      
      // Test with invalid signature
      const invalidSignature = await this.testSignature({
        payload: '{"test": "data"}',
        secret: 'wrong_secret', 
        expected_valid: false
      });
      
      const passed = validSignature.correct && invalidSignature.correct;
      
      this.testResults.push({
        name: testName,
        passed: passed
      });
      
      console.log(`${passed ? '✅' : '❌'} ${testName} ${passed ? 'passed' : 'failed'}`);
    } catch (error) {
      this.testResults.push({
        name: testName,
        passed: false,
        error: error.message
      });
      
      console.log(`❌ ${testName} failed: ${error.message}`);
    }
  }
  
  generateTestReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n' + '='.repeat(50));
    console.log('WEBHOOK TEST SUITE REPORT');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
    console.log('='.repeat(50));
    
    // Detailed results
    this.testResults.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} - ${result.name}`);
      if (!result.passed && result.error) {
        console.log(`  Error: ${result.error}`);
      }
    });
  }
}

// Run the test suite
const testSuite = new WebhookTestSuite('https://api.jctc.com', jwt_token);
testSuite.runAllTests();
```

## Error Handling & Retries

### 1. Retry Configuration

```javascript
// Advanced retry configuration
const retryConfig = {
  name: "Critical System Notifications",
  url: "https://critical-system.gov/webhooks/alerts",
  
  // Retry settings
  retry_attempts: 5,
  retry_delay_seconds: 2,
  retry_backoff_strategy: "exponential", // linear, exponential, custom
  retry_backoff_multiplier: 2,
  max_retry_delay_seconds: 300, // 5 minutes max
  
  // Failure handling
  failure_actions: [
    "log_error",
    "notify_admin", 
    "create_ticket",
    "fallback_notification"
  ],
  
  // Conditional retries
  retry_conditions: {
    http_status_codes: [500, 502, 503, 504, 408],
    network_errors: true,
    timeout_errors: true,
    dns_errors: false // Don't retry DNS failures
  },
  
  // Circuit breaker
  circuit_breaker: {
    enabled: true,
    failure_threshold: 10,
    timeout_seconds: 60,
    recovery_timeout_seconds: 300
  }
};
```

### 2. Error Monitoring

```javascript
// Webhook error monitoring and alerts
class WebhookErrorMonitor {
  constructor() {
    this.errorThresholds = {
      failure_rate: 0.1, // 10% failure rate
      response_time: 5000, // 5 seconds
      consecutive_failures: 5
    };
    
    this.alerts = [];
  }
  
  async monitorWebhookHealth() {
    const webhooks = await this.getActiveWebhooks();
    
    for (const webhook of webhooks) {
      const metrics = await this.getWebhookMetrics(webhook.id, '1h');
      
      // Check failure rate
      if (metrics.failure_rate > this.errorThresholds.failure_rate) {
        this.createAlert({
          webhook_id: webhook.id,
          type: 'high_failure_rate',
          severity: 'warning',
          message: `Webhook ${webhook.name} has ${(metrics.failure_rate * 100).toFixed(1)}% failure rate`
        });
      }
      
      // Check response time
      if (metrics.avg_response_time > this.errorThresholds.response_time) {
        this.createAlert({
          webhook_id: webhook.id,
          type: 'slow_response',
          severity: 'warning',
          message: `Webhook ${webhook.name} average response time is ${metrics.avg_response_time}ms`
        });
      }
      
      // Check consecutive failures
      if (metrics.consecutive_failures > this.errorThresholds.consecutive_failures) {
        this.createAlert({
          webhook_id: webhook.id,
          type: 'consecutive_failures',
          severity: 'critical',
          message: `Webhook ${webhook.name} has ${metrics.consecutive_failures} consecutive failures`
        });
      }
    }
    
    // Process alerts
    await this.processAlerts();
  }
  
  async createAlert(alertData) {
    const alert = {
      ...alertData,
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };
    
    this.alerts.push(alert);
    
    // Send immediate notification for critical alerts
    if (alert.severity === 'critical') {
      await this.sendImmediateNotification(alert);
    }
  }
  
  async processAlerts() {
    const unprocessedAlerts = this.alerts.filter(a => !a.acknowledged);
    
    if (unprocessedAlerts.length === 0) return;
    
    // Group alerts by webhook
    const alertsByWebhook = {};
    unprocessedAlerts.forEach(alert => {
      if (!alertsByWebhook[alert.webhook_id]) {
        alertsByWebhook[alert.webhook_id] = [];
      }
      alertsByWebhook[alert.webhook_id].push(alert);
    });
    
    // Send consolidated notifications
    for (const [webhookId, alerts] of Object.entries(alertsByWebhook)) {
      await this.sendConsolidatedAlert(webhookId, alerts);
    }
    
    // Mark alerts as acknowledged
    unprocessedAlerts.forEach(alert => alert.acknowledged = true);
  }
}

// Start error monitoring
const errorMonitor = new WebhookErrorMonitor();
setInterval(() => {
  errorMonitor.monitorWebhookHealth();
}, 5 * 60 * 1000); // Every 5 minutes
```

## Monitoring & Maintenance

### 1. Performance Monitoring

```javascript
// Webhook performance dashboard
async function getWebhookDashboard() {
  const dashboard = {
    overview: await getWebhookOverview(),
    performance_metrics: await getPerformanceMetrics('24h'),
    active_webhooks: await getActiveWebhooks(),
    recent_deliveries: await getRecentDeliveries(50),
    error_summary: await getErrorSummary('24h')
  };
  
  return dashboard;
}

async function getWebhookOverview() {
  const stats = await fetch('/api/v1/integrations/webhooks/stats');
  return stats.json();
  
  // Expected response:
  // {
  //   total_webhooks: 25,
  //   active_webhooks: 22,
  //   inactive_webhooks: 3,
  //   total_deliveries_24h: 1847,
  //   successful_deliveries_24h: 1802,
  //   failed_deliveries_24h: 45,
  //   average_response_time_24h: 287.5,
  //   overall_success_rate: 97.6
  // }
}

async function generateWebhookReport(timeframe = '7d') {
  const report = {
    period: timeframe,
    generated_at: new Date().toISOString(),
    summary: {
      total_events: 0,
      successful_deliveries: 0,
      failed_deliveries: 0,
      average_response_time: 0,
      top_event_types: [],
      most_active_webhooks: [],
      error_patterns: []
    },
    webhook_details: []
  };
  
  const webhooks = await getActiveWebhooks();
  
  for (const webhook of webhooks) {
    const metrics = await getWebhookMetrics(webhook.id, timeframe);
    
    report.webhook_details.push({
      webhook_id: webhook.id,
      name: webhook.name,
      url: webhook.url,
      total_deliveries: metrics.total_deliveries,
      success_rate: metrics.success_rate,
      average_response_time: metrics.average_response_time,
      top_errors: metrics.top_errors,
      performance_trend: metrics.trend
    });
    
    // Update summary
    report.summary.total_events += metrics.total_deliveries;
    report.summary.successful_deliveries += metrics.successful_deliveries;
    report.summary.failed_deliveries += metrics.failed_deliveries;
  }
  
  // Calculate summary averages
  report.summary.average_response_time = 
    report.webhook_details.reduce((sum, w) => sum + w.average_response_time, 0) / 
    report.webhook_details.length;
  
  return report;
}
```

### 2. Maintenance Tasks

```javascript
// Automated webhook maintenance
class WebhookMaintenance {
  constructor() {
    this.maintenanceTasks = [
      'cleanup_old_deliveries',
      'update_webhook_health_status',
      'optimize_retry_schedules',
      'validate_webhook_endpoints',
      'archive_inactive_webhooks'
    ];
  }
  
  async runMaintenance() {
    console.log('Starting webhook maintenance tasks...');
    
    for (const task of this.maintenanceTasks) {
      try {
        await this[task]();
        console.log(`✅ Completed: ${task}`);
      } catch (error) {
        console.error(`❌ Failed: ${task} - ${error.message}`);
      }
    }
    
    console.log('Webhook maintenance completed.');
  }
  
  async cleanup_old_deliveries() {
    // Remove delivery logs older than 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    
    const result = await fetch('/api/v1/integrations/webhooks/deliveries/cleanup', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${jwt_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cutoff_date: cutoffDate.toISOString()
      })
    });
    
    const data = await result.json();
    console.log(`Cleaned up ${data.deleted_count} old delivery logs`);
  }
  
  async update_webhook_health_status() {
    const webhooks = await getActiveWebhooks();
    
    for (const webhook of webhooks) {
      const metrics = await getWebhookMetrics(webhook.id, '24h');
      
      let healthStatus = 'healthy';
      if (metrics.success_rate < 0.9) {
        healthStatus = 'unhealthy';
      } else if (metrics.success_rate < 0.95) {
        healthStatus = 'degraded';
      }
      
      await this.updateWebhookStatus(webhook.id, {
        health_status: healthStatus,
        last_health_check: new Date().toISOString(),
        success_rate_24h: metrics.success_rate,
        average_response_time_24h: metrics.average_response_time
      });
    }
  }
  
  async validate_webhook_endpoints() {
    const webhooks = await getActiveWebhooks();
    
    for (const webhook of webhooks) {
      try {
        const testResult = await this.testWebhookConnectivity(webhook.id);
        
        if (!testResult.success) {
          console.log(`⚠️ Webhook ${webhook.name} endpoint validation failed: ${testResult.error}`);
          
          // Mark webhook as potentially problematic
          await this.updateWebhookStatus(webhook.id, {
            endpoint_status: 'unreachable',
            last_validation_error: testResult.error,
            last_validation_attempt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Error validating webhook ${webhook.name}:`, error);
      }
    }
  }
}

// Schedule maintenance tasks
const maintenance = new WebhookMaintenance();
setInterval(() => {
  maintenance.runMaintenance();
}, 24 * 60 * 60 * 1000); // Run daily
```

## Advanced Configuration

### 1. Dynamic Event Filtering

```javascript
// Advanced event filtering configuration
const dynamicWebhookConfig = {
  name: "Smart Case Notifications",
  url: "https://external-system.gov/webhooks/smart-cases",
  event_types: ["case.created", "case.updated", "case.escalated"],
  
  // Dynamic filtering rules
  dynamic_filters: {
    // Time-based filtering
    time_filters: {
      business_hours_only: true,
      timezone: "Africa/Lagos",
      working_days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      blackout_periods: [
        {
          name: "System Maintenance",
          start_time: "02:00",
          end_time: "04:00",
          days: ["sunday"]
        }
      ]
    },
    
    // Content-based filtering  
    content_filters: {
      // Only high priority cases
      priority: {
        operator: "in",
        values: ["high", "critical", "urgent"]
      },
      
      // Specific case types
      case_type: {
        operator: "in", 
        values: ["terrorism", "cybercrime", "organized_crime", "corruption"]
      },
      
      // Financial threshold
      estimated_value: {
        operator: ">=",
        value: 1000000, // Cases worth ≥ ₦1M
        currency: "NGN"
      },
      
      // International cases
      international: {
        operator: "equals",
        value: true
      },
      
      // Exclude test cases
      tags: {
        operator: "not_contains",
        value: "test"
      }
    },
    
    // Geographic filtering
    location_filters: {
      states: ["Lagos", "Abuja", "Kano", "Rivers"],
      exclude_lgas: ["Test LGA"],
      include_coordinates: {
        north: 13.892007,
        south: 4.277144,
        east: 14.680073,
        west: 2.668432
      }
    },
    
    // User-based filtering
    user_filters: {
      departments: ["cybercrime", "terrorism", "international"],
      exclude_users: ["test_user", "demo_user"],
      minimum_rank: "inspector"
    }
  },
  
  // Filter combination logic
  filter_logic: "AND", // AND, OR, CUSTOM
  custom_filter_expression: "(priority.high OR case_type.terrorism) AND NOT tags.test",
  
  // Rate limiting per filter
  rate_limits: {
    max_events_per_hour: 100,
    max_events_per_case: 10,
    burst_limit: 5
  }
};
```

### 2. Custom Payload Templates

```javascript
// Custom webhook payload templates
const customPayloadTemplates = {
  // Forensic lab template
  forensic_lab_template: {
    notification_type: "jctc_evidence_analysis",
    timestamp: "{{event.timestamp}}",
    lab_case_number: "LAB-{{event.data.case_number}}-{{event.data.evidence_id}}",
    priority_level: "{{event.data.priority}}",
    evidence_details: {
      evidence_id: "{{event.data.evidence_id}}",
      evidence_type: "{{event.data.evidence_type}}",
      collection_date: "{{event.data.collected_at}}",
      chain_of_custody_verified: "{{event.data.chain_verified}}"
    },
    case_context: {
      case_number: "{{event.data.case_number}}",
      case_type: "{{event.data.case_type}}",
      investigating_officer: "{{event.data.assigned_officer.name}}",
      urgency: "{{event.data.priority}}"
    },
    requested_analyses: "{{event.data.analysis_requirements}}",
    expected_completion: "{{event.data.estimated_analysis_time}}",
    contact_information: {
      officer_name: "{{event.data.assigned_officer.name}}",
      officer_phone: "{{event.data.assigned_officer.contact.phone}}",
      officer_email: "{{event.data.assigned_officer.contact.email}}",
      department: "{{event.data.assigned_officer.department}}"
    }
  },
  
  // International liaison template  
  international_template: {
    message_type: "international_cooperation_request",
    timestamp: "{{event.timestamp}}",
    originating_country: "Nigeria",
    originating_agency: "Joint Cybercrime Task Force",
    case_details: {
      local_case_number: "{{event.data.case_number}}",
      title: "{{event.data.title}}",
      classification: "{{event.data.classification}}",
      crime_type: "{{event.data.case_type}}",
      estimated_loss: {
        amount: "{{event.data.estimated_value}}",
        currency: "{{event.data.currency}}"
      }
    },
    cooperation_request: {
      type: "{{event.data.international_request_type}}",
      urgency: "{{event.data.priority}}",
      requested_actions: "{{event.data.requested_cooperation}}",
      deadline: "{{event.data.cooperation_deadline}}"
    },
    contact_details: {
      liaison_officer: "{{event.data.liaison_officer.name}}",
      email: "{{event.data.liaison_officer.email}}",
      phone: "{{event.data.liaison_officer.phone}}",
      secure_communication_channel: "{{event.data.liaison_officer.secure_channel}}"
    },
    legal_framework: "{{event.data.legal_basis}}",
    confidentiality_level: "{{event.data.classification}}"
  },
  
  // Court system template
  court_template: {
    notification_type: "case_status_update",
    court_reference: "COURT-{{event.data.case_number}}",
    timestamp: "{{event.timestamp}}",
    case_information: {
      jctc_case_number: "{{event.data.case_number}}",
      case_title: "{{event.data.title}}",
      current_status: "{{event.data.status}}",
      priority_level: "{{event.data.priority}}"
    },
    legal_readiness: {
      evidence_collected: "{{event.data.evidence_count}}",
      forensic_analysis_complete: "{{event.data.forensic_complete}}",
      witnesses_interviewed: "{{event.data.witness_count}}",
      case_file_complete: "{{event.data.case_complete}}"
    },
    prosecution_details: {
      prosecutor_assigned: "{{event.data.prosecutor.name}}",
      prosecutor_contact: "{{event.data.prosecutor.email}}",
      charges_recommended: "{{event.data.recommended_charges}}",
      bail_recommendation: "{{event.data.bail_status}}"
    },
    next_actions: "{{event.data.next_legal_actions}}",
    estimated_trial_date: "{{event.data.estimated_trial_date}}"
  }
};

// Apply custom template to webhook
const webhookWithTemplate = {
  name: "Forensic Lab Notifications",
  url: "https://forensics-lab.gov/api/webhooks/jctc-cases",
  event_types: ["evidence.added", "evidence.analyzed"],
  custom_payload_template: customPayloadTemplates.forensic_lab_template,
  template_engine: "jinja2", // jinja2, mustache, handlebars
  
  // Template processing options
  template_options: {
    escape_html: false,
    null_handling: "omit", // omit, empty_string, null
    date_format: "iso8601",
    number_format: "en_NG",
    timezone: "Africa/Lagos"
  }
};
```

## Best Practices

### 1. Performance Optimization

**Batch Event Processing:**
```javascript
// Process webhook events in batches for better performance
class WebhookEventProcessor {
  constructor() {
    this.eventQueue = [];
    this.processingInterval = 1000; // 1 second
    this.batchSize = 10;
    
    // Start batch processor
    setInterval(() => this.processBatch(), this.processingInterval);
  }
  
  async queueEvent(event) {
    this.eventQueue.push({
      ...event,
      queued_at: Date.now()
    });
    
    // Process immediately if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      await this.processBatch();
    }
  }
  
  async processBatch() {
    if (this.eventQueue.length === 0) return;
    
    const batch = this.eventQueue.splice(0, this.batchSize);
    console.log(`Processing batch of ${batch.length} events`);
    
    try {
      await Promise.all(
        batch.map(event => this.processEvent(event))
      );
    } catch (error) {
      console.error('Batch processing error:', error);
      
      // Re-queue failed events
      this.eventQueue.unshift(...batch);
    }
  }
  
  async processEvent(event) {
    const webhooks = await this.getMatchingWebhooks(event);
    
    const deliveryPromises = webhooks.map(webhook => 
      this.deliverWebhook(webhook, event)
    );
    
    await Promise.allSettled(deliveryPromises);
  }
}
```

**Connection Pooling:**
```javascript
// Implement connection pooling for better performance
const https = require('https');

class WebhookDeliveryService {
  constructor() {
    // Create HTTPS agent with connection pooling
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      keepAliveMsecs: 30000,
      maxSockets: 50,
      maxFreeSockets: 10,
      timeout: 30000,
      scheduling: 'lifo' // Last In, First Out
    });
  }
  
  async deliverWebhook(webhook, payload) {
    const options = {
      method: webhook.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'JCTC-Webhook-Client/1.2',
        ...webhook.headers
      },
      agent: this.httpsAgent,
      timeout: webhook.timeout_seconds * 1000
    };
    
    // Add signature if secret is configured
    if (webhook.secret_token) {
      const signature = this.generateSignature(payload, webhook.secret_token);
      options.headers['X-JCTC-Signature'] = signature;
    }
    
    try {
      const response = await fetch(webhook.url, {
        ...options,
        body: JSON.stringify(payload)
      });
      
      return {
        success: response.ok,
        status_code: response.status,
        response_time: response.headers.get('X-Response-Time'),
        webhook_id: webhook.id
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        webhook_id: webhook.id
      };
    }
  }
  
  generateSignature(payload, secret) {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}
```

### 2. Security Hardening

**Request Validation:**
```javascript
// Comprehensive request validation for webhook endpoints
function validateWebhookRequest(req, res, next) {
  const errors = [];
  
  // Validate headers
  if (!req.headers['x-jctc-signature']) {
    errors.push('Missing signature header');
  }
  
  if (!req.headers['user-agent']?.startsWith('JCTC-Webhook-Client/')) {
    errors.push('Invalid user agent');
  }
  
  // Validate content type
  if (req.headers['content-type'] !== 'application/json') {
    errors.push('Invalid content type');
  }
  
  // Validate payload structure
  if (!req.body || typeof req.body !== 'object') {
    errors.push('Invalid payload format');
  }
  
  // Validate required fields
  const requiredFields = ['event_type', 'timestamp', 'event_id', 'data'];
  for (const field of requiredFields) {
    if (!req.body[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate timestamp (not too old, not in future)
  const eventTime = new Date(req.body.timestamp);
  const now = new Date();
  const fiveMinutes = 5 * 60 * 1000;
  
  if (eventTime < new Date(now.getTime() - fiveMinutes)) {
    errors.push('Event timestamp too old');
  }
  
  if (eventTime > new Date(now.getTime() + fiveMinutes)) {
    errors.push('Event timestamp in future');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }
  
  next();
}
```

### 3. Logging and Auditing

```javascript
// Comprehensive webhook logging and auditing
class WebhookAuditLogger {
  constructor() {
    this.logLevels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
      CRITICAL: 4
    };
    
    this.currentLogLevel = this.logLevels.INFO;
  }
  
  async logWebhookEvent(level, eventType, data) {
    if (this.logLevels[level] < this.currentLogLevel) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      event_type: eventType,
      data: data,
      source: 'webhook_system',
      correlation_id: this.generateCorrelationId()
    };
    
    // Log to different destinations based on level
    if (level === 'CRITICAL' || level === 'ERROR') {
      await this.logToErrorTracking(logEntry);
      await this.sendAlertNotification(logEntry);
    }
    
    await this.logToDatabase(logEntry);
    await this.logToFile(logEntry);
    
    // Real-time monitoring
    if (level === 'CRITICAL') {
      await this.triggerImmediateAlert(logEntry);
    }
  }
  
  async logWebhookDelivery(webhook, payload, result) {
    const deliveryLog = {
      webhook_id: webhook.id,
      webhook_name: webhook.name,
      target_url: webhook.url,
      event_type: payload.event_type,
      event_id: payload.event_id,
      delivery_attempt: result.attempt_number || 1,
      success: result.success,
      status_code: result.status_code,
      response_time_ms: result.response_time_ms,
      error_message: result.error_message,
      timestamp: new Date().toISOString(),
      payload_size_bytes: JSON.stringify(payload).length,
      retry_after: result.retry_after
    };
    
    const logLevel = result.success ? 'INFO' : 'WARN';
    await this.logWebhookEvent(logLevel, 'webhook_delivery', deliveryLog);
    
    // Track delivery metrics
    await this.updateDeliveryMetrics(webhook.id, result);
  }
  
  async generateAuditReport(timeframe, webhookId = null) {
    const report = {
      timeframe: timeframe,
      generated_at: new Date().toISOString(),
      webhook_id: webhookId,
      summary: {
        total_deliveries: 0,
        successful_deliveries: 0,
        failed_deliveries: 0,
        average_response_time: 0,
        unique_event_types: new Set(),
        error_patterns: {}
      },
      detailed_logs: []
    };
    
    // Fetch logs from database
    const logs = await this.fetchWebhookLogs(timeframe, webhookId);
    
    logs.forEach(log => {
      if (log.event_type === 'webhook_delivery') {
        report.summary.total_deliveries++;
        
        if (log.data.success) {
          report.summary.successful_deliveries++;
        } else {
          report.summary.failed_deliveries++;
          
          // Track error patterns
          const errorType = log.data.error_message || `HTTP_${log.data.status_code}`;
          report.summary.error_patterns[errorType] = 
            (report.summary.error_patterns[errorType] || 0) + 1;
        }
        
        report.summary.unique_event_types.add(log.data.event_type);
      }
      
      report.detailed_logs.push(log);
    });
    
    // Calculate averages
    if (report.summary.total_deliveries > 0) {
      report.summary.success_rate = 
        (report.summary.successful_deliveries / report.summary.total_deliveries) * 100;
    }
    
    report.summary.unique_event_types = Array.from(report.summary.unique_event_types);
    
    return report;
  }
}

// Initialize audit logger
const auditLogger = new WebhookAuditLogger();

// Log all webhook activities
app.use('/webhooks', (req, res, next) => {
  auditLogger.logWebhookEvent('INFO', 'webhook_request_received', {
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    url: req.url,
    method: req.method
  });
  
  next();
});
```

## Troubleshooting

### Common Issues and Solutions

**1. Webhook Not Receiving Events**

**Diagnosis:**
```bash
# Check webhook configuration
curl -H "Authorization: Bearer $JWT_TOKEN" \
  https://api.jctc.com/api/v1/integrations/webhooks/$WEBHOOK_ID

# Check webhook status
curl -H "Authorization: Bearer $JWT_TOKEN" \
  https://api.jctc.com/api/v1/integrations/webhooks/$WEBHOOK_ID/health

# Test webhook connectivity  
curl -X POST -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": true}' \
  https://api.jctc.com/api/v1/integrations/webhooks/$WEBHOOK_ID/test
```

**Solutions:**
- Verify webhook is active (`is_active: true`)
- Check event type filters match expected events
- Ensure target URL is accessible and returns 2xx status codes
- Verify SSL certificates if using HTTPS
- Check firewall rules and network connectivity

**2. High Failure Rate**

**Analysis:**
```javascript
// Analyze failure patterns
async function analyzeWebhookFailures(webhookId, timeframe = '24h') {
  const deliveries = await getFailedDeliveries(webhookId, timeframe);
  
  const analysis = {
    total_failures: deliveries.length,
    error_breakdown: {},
    time_pattern: {},
    retry_analysis: {}
  };
  
  deliveries.forEach(delivery => {
    // Error breakdown
    const errorType = delivery.error_message || `HTTP_${delivery.status_code}`;
    analysis.error_breakdown[errorType] = 
      (analysis.error_breakdown[errorType] || 0) + 1;
    
    // Time pattern analysis
    const hour = new Date(delivery.timestamp).getHours();
    analysis.time_pattern[hour] = (analysis.time_pattern[hour] || 0) + 1;
    
    // Retry analysis
    const retryCount = delivery.attempt_count;
    analysis.retry_analysis[retryCount] = 
      (analysis.retry_analysis[retryCount] || 0) + 1;
  });
  
  return analysis;
}
```

**Solutions:**
- Review error patterns and fix common issues
- Adjust retry configuration if needed
- Implement circuit breaker for problematic endpoints
- Add request/response logging for debugging
- Consider rate limiting if overwhelming target system

**3. Slow Response Times**

**Monitoring:**
```javascript
// Monitor webhook performance
async function monitorWebhookPerformance() {
  const webhooks = await getActiveWebhooks();
  
  for (const webhook of webhooks) {
    const metrics = await getWebhookMetrics(webhook.id, '1h');
    
    if (metrics.average_response_time > 5000) { // > 5 seconds
      console.log(`⚠️ Slow webhook: ${webhook.name}`);
      console.log(`Average response time: ${metrics.average_response_time}ms`);
      
      // Analyze response time distribution
      const distribution = await getResponseTimeDistribution(webhook.id);
      console.log('Response time percentiles:', {
        p50: distribution.percentile_50,
        p90: distribution.percentile_90,
        p95: distribution.percentile_95,
        p99: distribution.percentile_99
      });
    }
  }
}
```

**Solutions:**
- Reduce webhook timeout if appropriate
- Implement asynchronous processing on target system
- Use webhook queuing for non-critical notifications
- Consider batch processing for high-volume webhooks
- Optimize target endpoint performance

**4. Security Issues**

**Security Checklist:**
```javascript
// Webhook security validation checklist
const securityChecklist = {
  signature_verification: {
    description: "HMAC-SHA256 signature verification implemented",
    check: async (webhook) => {
      return webhook.secret_token && webhook.verify_signatures;
    }
  },
  
  ssl_verification: {
    description: "SSL certificate verification enabled",
    check: async (webhook) => {
      return webhook.verify_ssl;
    }
  },
  
  ip_restrictions: {
    description: "IP address restrictions configured",
    check: async (webhook) => {
      return webhook.allowed_ips && webhook.allowed_ips.length > 0;
    }
  },
  
  recent_security_issues: {
    description: "No recent security-related failures",
    check: async (webhook) => {
      const recentLogs = await getWebhookSecurityLogs(webhook.id, '24h');
      return recentLogs.filter(log => log.security_violation).length === 0;
    }
  }
};

async function runSecurityAudit(webhookId) {
  const webhook = await getWebhook(webhookId);
  const results = {};
  
  for (const [check, config] of Object.entries(securityChecklist)) {
    const passed = await config.check(webhook);
    results[check] = {
      description: config.description,
      passed: passed,
      status: passed ? '✅ PASS' : '❌ FAIL'
    };
  }
  
  return results;
}
```

This comprehensive webhook configuration guide provides everything needed to set up, manage, and troubleshoot webhooks in the JCTC Integration API system. The guide covers basic setup through advanced configuration, security implementation, and maintenance procedures.

<citations>
<document>
<document_type>RULE</document_type>
<document_id>CbDBzePIYeXihu31k3EUQg</document_id>
</document>
</citations>