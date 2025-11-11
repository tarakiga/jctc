# Mobile API Documentation

## Overview

The JCTC Mobile API provides optimized endpoints specifically designed for mobile applications with features like data compression, offline synchronization, push notifications, and performance optimization.

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Device Registration](#device-registration)
- [Data Optimization](#data-optimization)
- [Offline Synchronization](#offline-synchronization)
- [Push Notifications](#push-notifications)
- [Performance Monitoring](#performance-monitoring)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Getting Started

### Base URL
```
https://api.jctc.com/mobile/v1/
```

### Required Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
X-Device-ID: <unique_device_id>
X-App-Version: <app_version>
User-Agent: JCTC-Mobile/<version> (<platform>)
```

### Optional Headers
```http
X-Network-Type: wifi|cellular|unknown
X-Compression: gzip
X-Cache-Control: no-cache
X-Sync-Token: <sync_session_token>
```

## Authentication

Mobile API uses JWT-based authentication with device-specific tokens.

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password",
  "device_info": {
    "device_id": "unique-device-identifier",
    "device_type": "ios",
    "device_model": "iPhone 14",
    "os_version": "16.0",
    "app_version": "1.2.0",
    "supports_push": true,
    "supports_offline": true
  }
}
```

### Response
```json
{
  "success": true,
  "data": {
    "access_token": "jwt_token_here",
    "refresh_token": "refresh_token_here",
    "expires_in": 3600,
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "officer"
    },
    "device": {
      "id": "device_id",
      "status": "active",
      "last_seen_at": "2023-10-07T10:00:00Z"
    }
  }
}
```

## Device Registration

### Register Device
```http
POST /devices/register
{
  "device_id": "unique-device-identifier",
  "device_name": "John's iPhone",
  "device_type": "ios",
  "device_model": "iPhone 14 Pro",
  "os_version": "16.0.1",
  "app_version": "1.2.0",
  "screen_resolution": "1179x2556",
  "timezone": "America/New_York",
  "locale": "en_US",
  "supports_push": true,
  "supports_offline": true,
  "supports_biometrics": true
}
```

### Update Device
```http
PUT /devices/{device_id}
{
  "app_version": "1.3.0",
  "os_version": "16.1",
  "last_known_location": {
    "latitude": 40.7128,
    "longitude": -74.0060,
    "accuracy": 10.0,
    "timestamp": "2023-10-07T10:00:00Z"
  }
}
```

### Device Status
```http
GET /devices/{device_id}/status

Response:
{
  "success": true,
  "data": {
    "id": "device_id",
    "status": "active",
    "last_seen_at": "2023-10-07T10:00:00Z",
    "last_sync_at": "2023-10-07T09:45:00Z",
    "needs_sync": false,
    "permissions": ["read_cases", "write_tasks"],
    "sync_frequency_minutes": 15
  }
}
```

## Data Optimization

### Compression

The API automatically compresses responses larger than 1KB when the client sends the `X-Compression: gzip` header.

#### Compressed Response Format
```json
{
  "compressed": true,
  "encoding": "gzip",
  "data": "base64_encoded_compressed_data",
  "original_size": 5120,
  "compressed_size": 1024,
  "compression_ratio": 0.2
}
```

### Mobile-Optimized Endpoints

#### Dashboard
```http
GET /dashboard?compact=true&limit=10
```
Returns lightweight dashboard data optimized for mobile screens.

#### Cases List
```http
GET /cases?mobile=true&page=1&limit=20&fields=id,case_number,title,status,priority
```

#### Case Details
```http
GET /cases/{case_id}?mobile=true&include=basic,assigned_officers
```

### Network-Aware Optimization

The API adjusts response payloads based on network conditions:

- **WiFi**: Full data with images and attachments
- **Cellular**: Compressed data, thumbnail images only
- **Poor Connection**: Essential data only, no media

## Offline Synchronization

### Sync Request
```http
POST /sync
{
  "device_id": "device_id",
  "last_sync_timestamp": "2023-10-07T09:00:00Z",
  "sync_entities": ["cases", "tasks", "evidence"],
  "offline_actions": [
    {
      "action_id": "offline_action_1",
      "action_type": "create_task",
      "entity_type": "task",
      "data": {
        "title": "Review evidence",
        "task_type": "review",
        "case_id": "case_123"
      },
      "timestamp": "2023-10-07T09:30:00Z",
      "device_id": "device_id"
    }
  ],
  "full_sync": false,
  "max_items_per_entity": 50
}
```

### Sync Response
```json
{
  "success": true,
  "data": {
    "sync_timestamp": "2023-10-07T10:00:00Z",
    "changes": {
      "cases": [
        {
          "id": "case_123",
          "action": "update",
          "data": { /* case data */ },
          "version": 5
        }
      ],
      "tasks": [
        {
          "id": "task_456",
          "action": "create",
          "data": { /* task data */ },
          "version": 1
        }
      ]
    },
    "conflicts": [
      {
        "action_id": "offline_action_1",
        "entity_type": "task",
        "entity_id": "task_456",
        "conflict_type": "concurrent_modification",
        "resolution_options": ["use_client", "use_server", "merge"]
      }
    ],
    "offline_action_results": [
      {
        "action_id": "offline_action_1",
        "success": true,
        "result": {
          "id": "task_789",
          "status": "created"
        }
      }
    ],
    "next_sync_recommended": "2023-10-07T10:15:00Z",
    "server_time": "2023-10-07T10:00:00Z"
  }
}
```

### Conflict Resolution
```http
POST /sync/resolve-conflict
{
  "conflict_id": "conflict_123",
  "resolution_strategy": "merge",
  "resolved_data": {
    /* merged data */
  }
}
```

### Offline Action Types

- **create_task**: Create a new task
- **update_task**: Update existing task
- **add_comment**: Add comment to entity
- **upload_evidence**: Queue evidence for upload
- **mark_complete**: Mark task as complete
- **voice_note**: Queue voice note for transcription

## Push Notifications

### Register Push Token
```http
POST /notifications/register-token
{
  "token": "fcm_token_or_apns_token",
  "token_type": "fcm",
  "platform": "android",
  "app_version": "1.2.0"
}
```

### Notification Preferences
```http
PUT /notifications/preferences
{
  "push_enabled": true,
  "task_notifications": true,
  "case_updates": true,
  "evidence_alerts": true,
  "system_notifications": false,
  "quiet_hours_enabled": true,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00"
}
```

### Test Notification
```http
POST /notifications/test
{
  "title": "Test Notification",
  "body": "This is a test notification"
}
```

### Notification Types

- **task**: Task assignments, updates, due dates
- **case**: Case status changes, new assignments  
- **evidence**: Evidence collection alerts
- **system**: System maintenance, updates

## Performance Monitoring

### Submit Performance Metrics
```http
POST /metrics/performance
{
  "device_id": "device_id",
  "app_launch_time": 2500,
  "memory_usage": 85.5,
  "cpu_usage": 15.2,
  "api_response_times": {
    "/cases": 1200,
    "/tasks": 800,
    "/dashboard": 1500
  },
  "cache_hit_rate": 0.85,
  "sync_duration": 5000,
  "network_type": "wifi",
  "connection_quality": "excellent",
  "timestamp": "2023-10-07T10:00:00Z"
}
```

### Get Optimization Recommendations
```http
GET /metrics/recommendations?device_id=device_id

Response:
{
  "success": true,
  "data": [
    {
      "type": "cache",
      "message": "Consider increasing cache duration for frequently accessed data",
      "priority": "medium"
    },
    {
      "type": "sync",
      "message": "Enable data compression for cellular connections",
      "priority": "high"
    }
  ]
}
```

## API Reference

### Mobile Dashboard
```http
GET /dashboard/mobile
```
Returns mobile-optimized dashboard with essential information.

### Mobile Search
```http
GET /search/mobile?q=query&types=cases,tasks&limit=10
```
Search optimized for mobile with reduced payload and highlights.

### Batch Requests
```http
POST /batch
{
  "batch_id": "batch_123",
  "requests": [
    {
      "request_id": "req_1",
      "method": "GET",
      "endpoint": "/cases",
      "params": {"limit": 10}
    },
    {
      "request_id": "req_2", 
      "method": "GET",
      "endpoint": "/tasks",
      "params": {"status": "active"}
    }
  ],
  "sequential": false
}
```

### File Upload (Mobile)
```http
POST /upload/mobile
Content-Type: multipart/form-data

file: <binary_data>
filename: evidence.jpg
content_type: image/jpeg
case_id: case_123
compress: true
generate_thumbnail: true
```

### Health Check
```http
GET /health/mobile

Response:
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "1.2.0",
    "timestamp": "2023-10-07T10:00:00Z",
    "features": {
      "sync": true,
      "push_notifications": true,
      "compression": true,
      "offline_support": true
    }
  }
}
```

## Best Practices

### 1. Network Optimization

- **Use compression**: Always send `X-Compression: gzip` header
- **Request only needed data**: Use field selection and pagination
- **Respect network conditions**: Adjust requests based on connection quality

```javascript
// Example: Network-aware requests
const networkType = getNetworkType();
const limit = networkType === 'cellular' ? 10 : 20;
const fields = networkType === 'cellular' ? 'id,title,status' : 'all';

fetch(`/api/mobile/v1/cases?limit=${limit}&fields=${fields}`, {
  headers: {
    'X-Network-Type': networkType,
    'X-Compression': 'gzip'
  }
});
```

### 2. Offline Support

- **Queue actions locally**: Store offline actions in local database
- **Handle conflicts gracefully**: Implement conflict resolution UI
- **Sync strategically**: Sync on WiFi connections when possible

```javascript
// Example: Offline action queuing
const offlineAction = {
  action_id: generateUUID(),
  action_type: 'create_task',
  entity_type: 'task',
  data: taskData,
  timestamp: new Date().toISOString(),
  device_id: deviceId
};

// Store locally
await localDB.offlineActions.add(offlineAction);

// Sync when online
if (navigator.onLine) {
  await syncOfflineActions();
}
```

### 3. Caching Strategy

- **Cache frequently accessed data**: Dashboard, user profile, case lists
- **Implement cache invalidation**: Update cache after sync
- **Use appropriate TTL**: Balance freshness vs performance

```javascript
// Example: Smart caching
const cacheKey = `cases_${userId}_${page}`;
const cachedData = await cache.get(cacheKey);

if (cachedData && !isStale(cachedData)) {
  return cachedData;
}

const freshData = await api.getCases();
await cache.set(cacheKey, freshData, { ttl: 5 * 60 * 1000 }); // 5 minutes
return freshData;
```

### 4. Push Notifications

- **Request permission appropriately**: Ask during onboarding flow
- **Handle token updates**: Re-register tokens on app updates
- **Respect user preferences**: Check quiet hours and notification settings

```javascript
// Example: Token management
const messaging = firebase.messaging();

messaging.onTokenRefresh(async (token) => {
  await api.registerPushToken({
    token,
    token_type: 'fcm',
    platform: 'android',
    app_version: getAppVersion()
  });
});
```

### 5. Performance Monitoring

- **Track key metrics**: App launch time, API response times, memory usage
- **Monitor crash rates**: Track and report crashes for improvement
- **Analyze user behavior**: Track screen views and user actions

```javascript
// Example: Performance tracking
const performanceMetrics = {
  device_id: deviceId,
  app_launch_time: Date.now() - appStartTime,
  memory_usage: getMemoryUsage(),
  api_response_times: apiMetrics.getAverages(),
  cache_hit_rate: cache.getHitRate(),
  timestamp: new Date().toISOString()
};

await api.submitPerformanceMetrics(performanceMetrics);
```

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "error_code": "SYNC_CONFLICT",
    "error_message": "Sync conflict detected",
    "error_details": {
      "entity_type": "task",
      "entity_id": "task_123"
    },
    "user_message": "Your changes conflict with recent updates. Please resolve.",
    "retry_after": 30,
    "timestamp": "2023-10-07T10:00:00Z"
  }
}
```

### Error Codes

- **DEVICE_NOT_FOUND**: Device not registered
- **SYNC_CONFLICT**: Data synchronization conflict
- **TOKEN_EXPIRED**: Push notification token expired
- **RATE_LIMIT_EXCEEDED**: Too many requests
- **NETWORK_ERROR**: Network connectivity issue
- **INSUFFICIENT_STORAGE**: Device storage full
- **PERMISSION_DENIED**: Insufficient permissions

### Retry Logic
```javascript
async function apiRequest(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response.json();
      
      if (response.status >= 500) {
        // Server error, retry with exponential backoff
        await delay(Math.pow(2, i) * 1000);
        continue;
      }
      
      // Client error, don't retry
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(1000);
    }
  }
}
```

## Security Considerations

### Device Trust

- **Device registration required**: All requests must include valid device ID
- **Token validation**: JWT tokens validated on each request
- **Device revocation**: Compromised devices can be remotely disabled

### Data Protection

- **Encryption in transit**: All API communication over HTTPS
- **Selective sync**: Only sync data user has permission to access
- **Audit logging**: All mobile API actions logged for security review

### Biometric Authentication
```javascript
// Example: Biometric authentication
if (device.supports_biometrics && user.requires_biometric) {
  const biometricResult = await authenticateWithBiometrics();
  if (!biometricResult.success) {
    throw new Error('Biometric authentication required');
  }
}
```

## Rate Limits

- **Standard endpoints**: 100 requests per minute per device
- **Sync endpoints**: 10 sync requests per minute per device
- **Upload endpoints**: 50 MB per hour per device
- **Push notifications**: 1000 notifications per day per user

## Troubleshooting

### Common Issues

**Sync Conflicts**
```javascript
// Handle sync conflicts
if (syncResponse.conflicts.length > 0) {
  for (const conflict of syncResponse.conflicts) {
    await showConflictResolutionUI(conflict);
  }
}
```

**Token Expiration**
```javascript
// Handle token expiration
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      return refreshTokenAndRetry(error.config);
    }
    return Promise.reject(error);
  }
);
```

**Network Connectivity**
```javascript
// Handle offline scenarios
window.addEventListener('online', () => {
  syncPendingActions();
});

window.addEventListener('offline', () => {
  showOfflineNotification();
});
```

### Debug Mode

Enable debug mode by adding header:
```http
X-Debug: true
```

This provides additional response metadata:
```json
{
  "success": true,
  "data": { /* normal response */ },
  "debug": {
    "query_time": "25ms",
    "cache_hit": false,
    "compression_ratio": 0.3,
    "server_time": "2023-10-07T10:00:00Z"
  }
}
```

## SDKs and Libraries

### iOS SDK
```swift
import JCTCMobileSDK

let client = JCTCClient(
  baseURL: "https://api.jctc.com/mobile/v1/",
  deviceID: deviceID,
  appVersion: appVersion
)

// Automatic sync
client.enableAutoSync(interval: .minutes(15))

// Offline support
client.enableOfflineSupport(storageLimit: 100 * 1024 * 1024) // 100MB
```

### Android SDK
```java
JCTCClient client = new JCTCClient.Builder()
  .baseUrl("https://api.jctc.com/mobile/v1/")
  .deviceId(deviceId)
  .appVersion(BuildConfig.VERSION_NAME)
  .enableCompression(true)
  .enableOfflineSync(true)
  .build();

// Register for push notifications
client.registerForPushNotifications(token);
```

### React Native SDK
```javascript
import { JCTCClient } from '@jctc/react-native-sdk';

const client = new JCTCClient({
  baseURL: 'https://api.jctc.com/mobile/v1/',
  deviceId: DeviceInfo.getUniqueId(),
  appVersion: DeviceInfo.getVersion(),
  enableCompression: true,
  enableOfflineSync: true
});

// Setup push notifications
await client.setupPushNotifications();
```

## Support

For technical support and questions:

- **Email**: mobile-support@jctc.com
- **Documentation**: https://docs.jctc.com/mobile-api
- **GitHub Issues**: https://github.com/jctc/mobile-api/issues
- **Status Page**: https://status.jctc.com

## Changelog

### Version 1.3.0 (Latest)
- Added batch request support
- Improved conflict resolution
- Enhanced performance metrics
- Bug fixes for iOS 16 compatibility

### Version 1.2.0
- Added voice note transcription
- Improved offline synchronization
- Enhanced push notifications
- Added biometric authentication support

### Version 1.1.0  
- Initial mobile API release
- Basic offline support
- Push notifications
- Data compression