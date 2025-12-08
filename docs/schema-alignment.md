---
title: Schema Alignment - Case Intake Fields
description: Documentation of database schema and frontend form alignment for case intake
---

# Schema Alignment - Case Intake Fields

This document describes the alignment between the UI mockups, database schema, and frontend forms for the case intake workflow.

## Overview

The case intake form collects comprehensive information when registering a new cybercrime case. The schema was updated to support all fields shown in the UI mockup.

## New Database Fields

### Case Model (`cases` table)

| Field | Type | Description |
|-------|------|-------------|
| `intake_channel` | Enum | How the case was reported (WALK_IN, HOTLINE, EMAIL, REFERRAL, API, ONLINE_FORM, PARTNER_AGENCY) |
| `risk_flags` | Array[String] | Risk indicators (CHILD_SAFETY, IMMINENT_HARM, TRAFFICKING, SEXTORTION, etc.) |
| `platforms_implicated` | Array[String] | Social media/tech platforms involved |
| `lga_state_location` | String(255) | Location in Nigeria (LGA/State) |
| `incident_datetime` | DateTime | When the incident occurred |
| `reporter_type` | Enum | Type of reporter (ANONYMOUS, VICTIM, PARENT, LEA, NGO, CORPORATE, WHISTLEBLOWER) |
| `reporter_name` | String(255) | Name of reporter (if not anonymous) |
| `reporter_contact` | JSONB | Contact info {phone, email} |

## New Enums

### IntakeChannel
- `WALK_IN` - In-person report
- `HOTLINE` - Phone hotline
- `EMAIL` - Email submission
- `REFERRAL` - Referred from another agency
- `API` - Programmatic submission
- `ONLINE_FORM` - Web form
- `PARTNER_AGENCY` - Partner organization

### ReporterType
- `ANONYMOUS` - Anonymous reporter
- `VICTIM` - Direct victim
- `PARENT` - Parent/Guardian
- `LEA` - Law Enforcement Agency
- `NGO` - Non-governmental organization
- `CORPORATE` - Corporate entity
- `WHISTLEBLOWER` - Whistleblower

### RiskFlag
- `CHILD_SAFETY` - Child safety concern
- `IMMINENT_HARM` - Imminent harm risk
- `TRAFFICKING` - Human trafficking
- `SEXTORTION` - Sextortion case
- `FINANCIAL_CRITICAL` - Critical financial impact
- `HIGH_PROFILE` - High-profile case
- `CROSS_BORDER` - Cross-border crime

## Country Code Handling

The backend expects **2-character ISO 3166-1 alpha-2 codes** for country fields.

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `originating_country` | String(2) | `"BS"` for Bahamas | Default: `"NG"` (Nigeria) |
| `cooperating_countries` | Array[String(2)] | `["US", "GB", "DE"]` | Array of ISO codes |

The frontend provides a country utility at `frontend/apps/web/lib/utils/countries.ts` that:
- Maps country names to ISO codes in dropdown selectors
- Provides helper functions: `getCountryName(code)`, `getCountryCode(name)`

## API Changes

### POST /api/v1/cases

The case creation endpoint now accepts additional fields:

```json
{
  "title": "string (required)",
  "description": "string (required)",
  "severity": 1-5,
  "local_or_international": "LOCAL|INTERNATIONAL",
  "originating_country": "NG",
  "cooperating_countries": ["US", "GB"],
  "intake_channel": "WALK_IN",
  "risk_flags": ["CHILD_SAFETY", "IMMINENT_HARM"],
  "platforms_implicated": ["Instagram", "WhatsApp"],
  "lga_state_location": "Ikeja, Lagos State",
  "incident_datetime": "2025-11-28T10:00:00Z",
  "reporter_type": "VICTIM",
  "reporter_name": "John Doe",
  "reporter_contact": {
    "phone": "+2348012345678",
    "email": "reporter@example.com"
  }
}
```

### Error Responses

- **422 Validation Error**: Field validation failed
  - Returns field-level error details
- **500 Internal Server Error**: Database or server error
  - Logged with context for debugging

## Frontend Form

### Multi-Step Form Flow

1. **Step 1: Case Info** - Title, description, severity, case type
2. **Step 2: Intake & Flags** - Intake channel, risk flags, platforms, reporter info
3. **Step 3: Scope** - Local/international, countries involved
4. **Step 4: Parties** - Suspects, victims (preview)

### Validation

- Title: Required, min 5 characters
- Description: Required, min 10 characters
- Reporter name: Required if reporter type is not ANONYMOUS
- Reporter email: Must be valid format if provided

### Error Handling

- Field-level validation messages displayed inline
- Submit errors shown in alert banner
- Loading state during submission
- Console logging for debugging

## Migration

Run the Alembic migration to add new columns:

```powershell
cd backend
alembic upgrade head
```

Migration file: `alembic/versions/add_case_intake_fields.py`
