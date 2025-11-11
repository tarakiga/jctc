
JOINT CASE TEAM ON CYBERCRIMES (JCTC) Management System (CMS)
Purpose: End‑to‑end platform to capture, triage, investigate, prosecute, and report cybercrime cases, local and cross‑border, with built‑in chain‑of‑custody, evidence handling, and analytics.
________________________________________
1) Objectives & Scope
•	Single source of truth for all JCTC cases (local & international).
•	Standardised intake (web + mobile + API) with validation and deduplication.
•	Investigation workspace: tasks, timelines, seizure logs, device inventory, OSINT notes, forensic artefacts, legal instruments.
•	Chain of custody & evidence management (digital/physical).
•	Prosecutorial support: charges, exhibits, filings, court dates, outcomes.
•	Inter‑agency collaboration (EFCC, NPF‑NCCC, NFIU, ONSA, FMoJ, INTERPOL, UNODC, NCA‑UK, etc.).
•	Analytics & dashboards (KPI tracking, threat trends, conviction rates, backlog, SLA).
•	Compliance (Evidence Act 2011, Cybercrimes (Amendment) Act 2024, NDPR 2019).
Out‑of‑scope (Phase 1): Direct deep‑integration with every forensics tool (provide generic uploads + metadata; add native adapters in Phase 2).
________________________________________
2) User Personas & Roles
•	Intake Officer: registers cases, verifies complainant, performs de‑dup.
•	Investigator (JCTC): leads/joins cases, logs actions, requests warrants, manages devices/artefacts.
•	Forensic Analyst: ingests images (XRY/XAMN, Autopsy, FTK, EnCase, Cellebrite), attaches reports, hashes, and chain entries.
•	Prosecutor (NAPTIP): charges, filings, court schedule, outcomes.
•	Liaison Officer (Intl/Inter‑agency): MLAT requests, 24/7 POC, INTERPOL notices.
•	Supervisor: approvals (warrants, disclosures), QA, reassignments.
•	Administrator: user/role mgmt, retention, configurations.
Access Model: Role‑based access control (RBAC) + case‑level need‑to‑know (attribute‑based controls for sensitive victims/undercover ops). All access logged.
________________________________________
3) Case Lifecycle (High‑Level Workflow)
1.	Intake & Registration → triage (severity, child safety risk, cross‑border flag) → dedup.
2.	Assignment → Investigator + team; SLA timers start.
3.	Planning → checklist: legal basis, warrants, preservation orders (ISPs), evidence plan.
4.	Collection & Seizure → device cataloguing, imaging, hashing (SHA‑256), chain entries.
5.	Analysis → artefact extraction, OSINT, timeline, link analysis, suspect/victim mapping.
6.	Action → arrests, interviews, safeguarding victims, referrals to services.
7.	Prosecution → charges, filings, court appearances, exhibits, outcomes.
8.	Closure → outcomes recorded; evidence disposition; lessons learned.
9.	Post‑Case Analytics → KPIs, typologies, threat intel feedback loop.
Gateways: supervisor approvals; automated SLA/escalation; international cooperation pathway (MLAT/letters rogatory, 24/7 networks).
________________________________________
4) Data Model (ERD – Narrative)
Key entities and relationships: - Case (1) — (M) Party (suspect, victim, witness, complainant). - Case (1) — (M) Event/Action Log (auditable actions). - Case (1) — (M) Task (assignable, SLA, status). - Case (1) — (M) Legal Instrument (warrant, preservation, MLAT, court order). - Case (1) — (M) Device/Seizure — (M) Artefact (files, chat logs, images, hashes). - Case (1) — (M) Evidence Item (digital/physical) with ChainOfCustody entries. - Case (1) — (M) Charge — (M) Court Session — (M) Outcome. - Case (1) — (M) Attachment (docs, photos, reports) with hash + retention policy. - User (M) — (M) Case via CaseAssignment (role: Lead, Support, Prosecutor). - InterAgency (M) — (M) Case via CaseCollaboration (MoU/ref IDs).
International fields: Jurisdiction, Country Codes, MLAT Reference, Intl 24/7 POC, Foreign LEA IDs, Takedown/Disclosure Requests.
________________________________________
5) Starter Database Schema (PostgreSQL)
-- Core lookups
CREATE TABLE lookup_case_type (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL, -- e.g., "TIP_SEXTORTION", "ONLINE_CHILD_EXPLOITATION"
  label TEXT NOT NULL
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL, -- INTAKE, INVESTIGATOR, FORENSIC, PROSECUTOR, LIAISON, SUPERVISOR, ADMIN
  org_unit TEXT, -- e.g., JCTC HQ, Zonal Command
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT UNIQUE NOT NULL, -- human‑readable
  title TEXT NOT NULL,
  case_type_id INT REFERENCES lookup_case_type(id),
  description TEXT,
  severity INT CHECK (severity BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, SUSPENDED, PROSECUTION, CLOSED
  local_or_international TEXT NOT NULL, -- LOCAL, INTERNATIONAL
  originating_country CHAR(2) DEFAULT 'NG',
  cooperating_countries TEXT[], -- ISO country codes
  mlat_reference TEXT,
  date_reported TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_assigned TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  lead_investigator UUID REFERENCES users(id)
);

CREATE TABLE case_assignments (
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- LEAD, SUPPORT, PROSECUTOR, LIAISON
  assigned_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (case_id, user_id, role)
);

CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  party_type TEXT NOT NULL, -- SUSPECT, VICTIM, WITNESS, COMPLAINANT
  full_name TEXT,
  alias TEXT,
  national_id TEXT,
  dob DATE,
  nationality CHAR(2),
  gender TEXT,
  contact JSONB,
  notes TEXT
);

CREATE TABLE legal_instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- WARRANT, PRESERVATION, MLAT, COURT_ORDER
  reference_no TEXT,
  issuing_authority TEXT,
  issued_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  status TEXT, -- REQUESTED, ISSUED, DENIED, EXPIRED, EXECUTED
  document_hash TEXT,
  file_path TEXT
);

CREATE TABLE seizures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  seized_at TIMESTAMPTZ,
  location TEXT,
  officer_id UUID REFERENCES users(id),
  notes TEXT
);

CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seizure_id UUID REFERENCES seizures(id) ON DELETE CASCADE,
  label TEXT,
  make TEXT,
  model TEXT,
  serial_no TEXT,
  imei TEXT,
  imaged BOOLEAN DEFAULT FALSE,
  image_hash TEXT,
  custody_status TEXT -- IN_VAULT, RELEASED, RETURNED
);

CREATE TABLE artefacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  artefact_type TEXT, -- CHAT_LOG, IMAGE, VIDEO, DOC, BROWSER_HISTORY
  source_tool TEXT, -- XRY, XAMN, FTK, AUTOPSY
  description TEXT,
  file_path TEXT,
  sha256 TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  label TEXT,
  category TEXT, -- DIGITAL, PHYSICAL
  storage_location TEXT, -- Vault shelf, digital vault path
  sha256 TEXT,
  retention_policy TEXT, -- e.g., 7y after closure
  notes TEXT
);

CREATE TABLE chain_of_custody (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID REFERENCES evidence_items(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- SEIZED, TRANSFERRED, ANALYZED, PRESENTED_COURT, RETURNED, DISPOSED
  from_user UUID REFERENCES users(id),
  to_user UUID REFERENCES users(id),
  timestamp TIMESTAMPTZ DEFAULT now(),
  location TEXT,
  details TEXT
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT,
  assigned_to UUID REFERENCES users(id),
  due_at TIMESTAMPTZ,
  status TEXT DEFAULT 'OPEN',
  priority INT CHECK (priority BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE actions_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  action TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  statute TEXT, -- e.g., Cybercrimes Act s.38, TIPPEA sections
  description TEXT,
  filed_at TIMESTAMPTZ,
  status TEXT -- FILED, WITHDRAWN, AMENDED
);

CREATE TABLE court_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  session_date TIMESTAMPTZ,
  court TEXT,
  notes TEXT
);

CREATE TABLE outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  disposition TEXT, -- CONVICTED, ACQUITTED, PLEA, DISMISSED
  sentence TEXT,
  restitution NUMERIC(14,2),
  closed_at TIMESTAMPTZ
);

CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  title TEXT,
  file_path TEXT,
  sha256 TEXT,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE case_collaborations (
  case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
  partner_org TEXT, -- EFCC, INTERPOL, ISP name, etc.
  contact TEXT,
  reference_no TEXT,
  scope TEXT,
  PRIMARY KEY (case_id, partner_org)
);
________________________________________
6) API Design (REST/GraphQL – exemplar REST routes)
•	POST /api/v1/cases – create case (intake); server generates case_number.
•	GET /api/v1/cases?status=OPEN&query= – search/filter.
•	GET /api/v1/cases/{id} – case detail (ABAC enforced).
•	POST /api/v1/cases/{id}/assign – assign users/roles.
•	POST /api/v1/cases/{id}/parties – add suspect/victim/complainant.
•	POST /api/v1/cases/{id}/legal-instruments – add warrant/MLAT.
•	POST /api/v1/seizures → POST /api/v1/devices → POST /api/v1/artefacts.
•	POST /api/v1/evidence → POST /api/v1/evidence/{id}/custody.
•	POST /api/v1/cases/{id}/charges → POST /api/v1/cases/{id}/court-sessions → POST /api/v1/cases/{id}/outcomes.
•	POST /api/v1/cases/{id}/attachments (multipart with hash verification).
•	GET /api/v1/reports/kpis?... – analytics endpoints (see §8).
•	POST /api/v1/auth/sso – SSO via Keycloak/Azure AD; MFA enforced.
Webhooks/Integrations: - Preservation requests to ISPs; intake from tip lines (e.g., NCMEC‑style JSON); evidence hash verification callbacks; INTERPOL notice references; email ingestion for PDF/EML attachments with hashing.
________________________________________
7) Chain of Custody & Evidence Handling
•	Mandatory hash (SHA‑256) on ingest; re‑hash on download/presentation; immutable audit log.
•	Role‑separated digital vault (WORM‑capable storage) and physical vault register.
•	Automated custody receipts as signed PDFs; QR codes for evidence labels.
•	Access safeguards: four‑eyes for release/disposal; tamper detection with event stream (append‑only).
________________________________________
8) Analytics & Dashboards (Built‑in)
Core KPIs: - Intake volume (daily/weekly/monthly) by type, zone. - Time‑to‑assignment; time‑to‑first‑action; investigation cycle time; prosecution cycle time. - Backlog by status/assignee; SLA breaches. - Conviction rate; average sentence; restitution totals. - Victim demographics; cross‑border case count & cooperating countries. - Device/artefact counts per case; tool usage (XRY/XAMN/FTK/etc.). - Preservation/takedown compliance times by provider.
Example SQL (PostgreSQL):
-- Monthly intake by type
SELECT date_trunc('month', date_reported) AS month,
       l.label AS case_type,
       COUNT(*)
FROM cases c
JOIN lookup_case_type l ON l.id = c.case_type_id
GROUP BY 1,2
ORDER BY 1 DESC;

-- Median time from report to assignment
SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (date_assigned - date_reported))) AS median_seconds
FROM cases WHERE date_assigned IS NOT NULL;

-- Conviction rate
SELECT ROUND(100.0 * SUM(CASE WHEN disposition='CONVICTED' THEN 1 ELSE 0 END) / COUNT(*), 2) AS conviction_rate
FROM outcomes;

-- Backlog by assignee
SELECT u.full_name, COUNT(*) AS open_cases
FROM cases c JOIN users u ON u.id = c.lead_investigator
WHERE c.status = 'OPEN'
GROUP BY 1 ORDER BY 2 DESC;
Dashboards: - Ops Overview: KPIs, backlog heatmap, SLA widgets. - Threat Trends: typologies, geo maps (by LGA/state/country), word clouds from OSINT tags. - Prosecution: funnel from charge to outcome; sentence distributions. - Victim Services: referrals, time‑to‑support, outcomes. - International: MLAT pipeline, 24/7 requests, provider response times.
Export options: CSV, Excel, PDF; scheduled reports to stakeholders.
________________________________________
9) Security, Privacy & Compliance
•	AuthN/AuthZ: SSO (Keycloak/Azure AD), MFA, RBAC + ABAC, session timeouts.
•	Encryption: TLS 1.2+ in transit; AES‑256 at rest; KMS‑backed keys; field‑level encryption for PII.
•	Data Residency: primary in Nigeria; cross‑border transfers documented with legal basis (MLAT/consent/court order).
•	NDPR 2019 compliance: lawful basis, minimisation, DPIA for new features; data subject rights workflows.
•	Evidence Act 2011 & Cybercrimes (Amendment) Act 2024: authentic, reliable, admissible digital evidence; logs preserved; tool validation records.
•	Audit: immutable logs; periodic access reviews; SIEM integration.
________________________________________
10) Non‑Functional Requirements
•	Availability 99.9% (Phase 1); RPO ≤ 1h; RTO ≤ 4h.
•	Scalability: 10k active cases/year; artefact storage scaling via object storage (S3‑compatible/MinIO).
•	Performance: P95 < 300ms for typical reads; uploads stream to object store.
•	Accessibility: WCAG 2.1 AA.
•	Internationalisation: timezones, i18n for partner use; phone formats; country lists (ISO 3166‑1/2).
________________________________________
11) Deployment Architecture (Reference)
•	Frontend: React (TypeScript) + Tailwind; offline‑capable intake (PWA) for field ops.
•	Backend: Django + DRF (alt: NestJS); Celery for jobs; Redis for queues/cache.
•	DB: PostgreSQL; Object Store: S3/MinIO with server‑side encryption.
•	Auth: Keycloak (OIDC) with MFA + device posture checks.
•	Search: OpenSearch/Elasticsearch for full‑text on notes/attachments metadata.
•	Logs/Monitoring: Prometheus + Grafana; Audit to WORM store.
________________________________________
12) Integrations (Phased)
•	Phase 1: Email intake (EML/PDF hashing), CSV/Excel import, generic forensics report uploads (XRY/XAMN/Autopsy/FTK/EnCase), ISP preservation templates.
•	Phase 2: Provider APIs (Google/Meta/TikTok, etc.) via legal gateways; INTERPOL/24‑7 POC registry; court e‑filing references; NPF‑NCCC incident IDs; NFIU referral links.
________________________________________
13) Forms & Screens (Key Fields)
Case Intake Form - Reporter details (can be anonymous), channel (walk‑in, hotline, email, referral). - Incident summary, alleged offences (multi‑select), risk flags (child, imminent harm). - Local/International, countries involved, platforms/services implicated. - Evidence pointers (URLs, handles, device list), immediate preservation needs.
Seizure Form - Date/time, location, officers present, witnesses, photos, device inventory, initial hashes.
Chain‑of‑Custody Entry - From/To, timestamp, location, purpose, digital signature.
MLAT/Intl Cooperation - Requesting/Requested State, legal basis, scope, deadlines, contact POCs, status.
________________________________________
14) Access Control Matrix (Excerpt)
Resource	Intake	Investigator	Forensic	Prosecutor	Liaison	Supervisor
H/JCTC	Admin
Create Case	✔️	—	—	—	—	—	—
View Case	✔️	✔️	✔️	✔️	✔️	✔️	✔️
Edit Case Core	—	✔️	—	—	—	✔️	—
Evidence Write	—	✔️	✔️	—	—	✔️	—
Chain of Custody	—	✔️	✔️	—	—	✔️	—
Charges/Outcomes	—	—	—	✔️	—	✔️	—
Users/Roles	—	—	—	—	—	—	✔️
________________________________________
15) Sample Case JSON (API)
{
  "title": "Online Sextortion targeting minors via Instagram",
  "case_type_code": "TIP_SEXTORTION",
  "description": "Multiple reports of coercion for explicit content; suspect in NG cooperating with contact in GH.",
  "local_or_international": "INTERNATIONAL",
  "originating_country": "NG",
  "cooperating_countries": ["GH"],
  "parties": [
    {"party_type": "COMPLAINANT", "full_name": "Parent A", "contact": {"phone": "+234..."}},
    {"party_type": "VICTIM", "full_name": "Minor 1", "dob": "2011-05-04"},
    {"party_type": "SUSPECT", "alias": "@handleX"}
  ],
  "initial_evidence": [
    {"category": "DIGITAL", "label": "IG chat export", "sha256": "..."}
  ]
}
________________________________________
16) Reporting Pack (Templates)
•	Monthly Ops Report: intake, backlog, SLA, international pipeline, provider response times.
•	Quarterly Prosecution Report: filings, outcomes, sentences, restitution.
•	Victim Support Report: referrals, services provided, time‑to‑support.
•	Executive Dashboard PDF: auto‑generated with charts + commentary.
________________________________________
17) Data Retention & Disposal
•	Configurable by case type/outcome; default 7 years after closure; legal hold override.
•	Cryptographic erasure for digital; witnessed disposal for physical evidence; logs retained separately.
________________________________________
________________________________________
19) Training & SOP Alignment
•	Embed SOP checklists into UI (pre‑seizure, on‑scene imaging, interview protocols).
•	Contextual help + templates (preservation orders, MLAT letters, chain labels).
•	Sandbox with synthetic cases for training and drills.
________________________________________
20) Quality & Validation
•	Tool validation records (versions, hash of binaries), repeatability notes for each forensic report.
•	Periodic audits of chain‑of‑custody; randomised evidence access checks.
________________________________________
21) Future Enhancements
•	Graph‑based link analysis (neo4j) for networked offenders.
•	NLP entity extraction on OSINT and chat logs; auto‑redaction for victim PII on exports.
•	Data exchange gateways to state registries (e.g., Sex Offenders Register) with strict governance.
________________________________________
22) Field Catalogue – Phase 1 Minimum Data Set (MDS)
Notes: Req = Required, Opt = Optional; Types: text, longtext, int, decimal, bool, date, datetime, enum, json, file; Sensitivity: PII, SPII (sensitive PII e.g., minors), LE (law‑enforcement sensitive), Priv (legal privilege); Validation examples shown.
22.1 Case Intake (Create Case)
Field	Type	Req	Validation	Sensitivity	Notes
case_number	text	Sys	unique, server‑generated	LE	Human‑readable (e.g., JCTC/2025/000123)
title	text	Req	5–160 chars	LE	Short, descriptive
description	longtext	Req	≥ 40 chars	LE	Detailed narrative
case_type_code	enum	Req	in lookup_case_type	LE	e.g., TIP_SEXTORTION, ONLINE_CHILD_EXPLOITATION
severity	int	Req	1–5	LE	SLA driver
status	enum	Sys	OPEN/…	LE	Default OPEN
local_or_international	enum	Req	LOCAL/INTERNATIONAL	LE	Triggers MLAT flow
originating_country	text(2)	Req	ISO‑3166‑1	LE	Default NG
cooperating_countries	json[string]	Opt	ISO‑3166‑1 list	LE	For cross‑border
platforms_implicated	json[string]	Opt	array len ≤ 20	LE	e.g., Instagram, TikTok
risk_flags	json[string]	Opt	subset {child, imminent_harm, trafficking, sextortion}	SPII	Drives escalation
incident_datetime	datetime	Opt	past/future reasonable	LE	If known
lga_state_location	text	Opt	3–120 chars	LE	Nigerian geo
reporter_type	enum	Opt	ANONYMOUS/VICTIM/PARENT/LEA/NGO	PII	
reporter_name	text	Cond	required unless anonymous	PII	
reporter_contact	json	Cond	phone/email format	PII	
intake_channel	enum	Req	WALK‑IN/HOTLINE/EMAIL/REFERRAL/API	LE	
initial_evidence_refs	json	Opt	array of objects	LE	URLs, handles, IDs
created_by	user_id	Sys	valid user	LE	audit
22.2 Parties (Suspect, Victim, Witness, Complainant)
Field	Type	Req	Validation	Sensitivity	Notes
party_type	enum	Req	SUSPECT/VICTIM/WITNESS/COMPLAINANT	LE	
full_name	text	Cond	required unless alias‑only for suspect	PII	
alias	text	Opt	≤ 120	LE	handles/usernames
dob	date	Opt	past date	SPII	minors detection
nationality	text(2)	Opt	ISO‑3166‑1	PII	
gender	enum	Opt	M/F/Other/Unspecified	PII	
national_id	text	Opt	masked ####‑##	PII	store hashed if available
contact	json	Opt	phone/email schema	PII	
guardian_contact	json	Cond	for minors	SPII	
safeguarding_flags	json[string]	Opt	{medical, shelter, counselling}	SPII	victim support linkage
notes	longtext	Opt	free text	LE	avoid gratuitous PII
22.3 Legal Instruments (Warrant/Preservation/MLAT/Court Order)
Field	Type	Req	Validation	Sensitivity	Notes
type	enum	Req	WARRANT/PRESERVATION/MLAT/COURT_ORDER	LE	
reference_no	text	Opt	unique per case	LE	
issuing_authority	text	Req	3–160	LE	Court/Agency
issued_at	datetime	Cond	required if status=ISSUED	LE	
expires_at	datetime	Opt	> issued_at	LE	
status	enum	Req	REQUESTED/ISSUED/DENIED/EXPIRED/EXECUTED	LE	
scope_description	longtext	Req	≥ 20 chars	LE	narrowly tailored
document_file	file	Opt	pdf/doc	Priv	hashed storage
document_hash	text	Sys	SHA‑256	LE	
22.4 Seizure
Field	Type	Req	Validation	Sensitivity	Notes
seized_at	datetime	Req	not future>24h	LE	
location	text	Req	5–160	LE	
officer_id	user_id	Req	exists	LE	
witnesses	json[string]	Opt	≤ 5 entries	PII	names masked in exports
photos	file[]	Opt	jpg/png	LE	auto‑hash
notes	longtext	Opt		LE	
22.5 Device Inventory
Field	Type	Req	Validation	Sensitivity	Notes
label	text	Req	≤ 60	LE	e.g., “iPhone 13 Pro”
make	text	Opt		LE	
model	text	Opt		LE	
serial_no	text	Opt		LE	
imei	text	Opt	14–16 digits	LE	
imaged	bool	Sys		LE	
image_hash	text	Cond	SHA‑256 if imaged	LE	
custody_status	enum	Sys	IN_VAULT/RELEASED/RETURNED	LE	
22.6 Artefacts (From Forensic Tools)
Field	Type	Req	Validation	Sensitivity	Notes
artefact_type	enum	Req	CHAT_LOG/IMAGE/VIDEO/DOC/BROWSER_HISTORY/OTHER	LE	
source_tool	enum	Opt	XRY/XAMN/FTK/AUTOPSY/ENCASE/OTHER	LE	
description	longtext	Req	≥ 10 chars	LE	
file	file	Opt	stored in object store	LE	
sha256	text	Sys	SHA‑256	LE	
tags	json[string]	Opt		LE	PII‑safe keywords
22.7 Evidence Items & Chain of Custody
Evidence Item | Field | Type | Req | Validation | Sensitivity | Notes | |—|—|—|—|—|—| | label | text | Req | ≤ 80 | LE | printed on QR label | | category | enum | Req | DIGITAL/PHYSICAL | LE | | | storage_location | text | Req | | LE | shelf/path | | sha256 | text | Cond | for digital | LE | | | retention_policy | enum | Req | e.g., 7Y_AFTER_CLOSE/LEGAL_HOLD | LE | | | notes | longtext | Opt | | LE | |
Chain of Custody Entry | Field | Type | Req | Validation | Sensitivity | Notes | |—|—|—|—|—|—| | action | enum | Req | SEIZED/TRANSFERRED/ANALYZED/PRESENTED_COURT/RETURNED/DISPOSED | LE | | | from_user | user_id | Cond | required except for SEIZED | LE | | | to_user | user_id | Req | exists | LE | | | timestamp | datetime | Sys | auto‑now | LE | | | location | text | Req | | LE | | | details | longtext | Opt | | LE | | | signature | file | Opt | png | LE | digital signature image |
22.8 Tasks & Actions Log
Task | Field | Type | Req | Validation | Sensitivity | Notes | |—|—|—|—|—|—| | title | text | Req | ≤ 120 | LE | | | assigned_to | user_id | Req | exists | LE | | | due_at | datetime | Opt | future | LE | | | status | enum | Sys | OPEN/IN_PROGRESS/DONE/BLOCKED | LE | | | priority | int | Req | 1–5 | LE | |
Action Log | Field | Type | Req | Validation | Sensitivity | Notes | |—|—|—|—|—|—| | action | text | Sys | | LE | short verb | | details | longtext | Opt | | LE | | | created_at | datetime | Sys | auto‑now | LE | |
22.9 Charges, Court & Outcomes
Charge | Field | Type | Req | Validation | Sensitivity | Notes | |—|—|—|—|—|—| | statute | text | Req | references statute code | LE | e.g., Cybercrimes s.38, TIPPEA | | description | longtext | Req | ≥ 20 chars | LE | | | filed_at | datetime | Opt | past | LE | | | status | enum | Req | FILED/WITHDRAWN/AMENDED | LE | |
Court Session | Field | Type | Req | Validation | Sensitivity | Notes | |—|—|—|—|—|—| | session_date | datetime | Req | | LE | | | court | text | Req | | LE | | | notes | longtext | Opt | | LE | |
Outcome | Field | Type | Req | Validation | Sensitivity | Notes | |—|—|—|—|—|—| | disposition | enum | Req | CONVICTED/ACQUITTED/PLEA/DISMISSED | LE | | | sentence | longtext | Opt | | LE | | | restitution | decimal | Opt | ≥ 0 | LE | | | closed_at | datetime | Cond | required if disposition set | LE | |
22.10 International Cooperation (MLAT/24‑7)
Field	Type	Req	Validation	Sensitivity	Notes
requesting_state	text(2)	Cond	ISO‑3166‑1	LE	if outbound
requested_state	text(2)	Cond	ISO‑3166‑1	LE	if inbound
legal_basis	enum	Req	MLAT/LettersRogatory/Budapest24x7/Other	LE	
scope	longtext	Req	≥ 30 chars	LE	
deadline	datetime	Opt	future	LE	
poc_contact	json	Opt	email/phone	LE	partner POC
provider_requests	json	Opt	array of {provider, type, status, dates}	LE	preservation/disclosure
22.11 Attachments
Field	Type	Req	Validation	Sensitivity	Notes
title	text	Req	≤ 120	LE	
file	file	Req	size ≤ 500MB, allowed types	LE	virus scan & hash
sha256	text	Sys	SHA‑256	LE	
uploaded_by	user_id	Sys	exists	LE	
uploaded_at	datetime	Sys	auto‑now	LE	
classification	enum	Req	PUBLIC/LE‑SENSITIVE/PRIVILEGED	LE	governs sharing
22.12 Users & Access Control
Field	Type	Req	Validation	Sensitivity	Notes
email	text	Req	email format, unique	PII	
full_name	text	Req	3–160	PII	
role	enum	Req	INTAKE/INVESTIGATOR/FORENSIC/PROSECUTOR/LIAISON/SUPERVISOR/ADMIN	LE	
org_unit	text	Opt		LE	JCTC HQ/Zonal
is_active	bool	Sys		LE	
mfa_enrolled	bool	Sys		LE	policy check
22.13 Audit & Security Fields (System‑Managed)
Field	Type	Req	Validation	Sensitivity	Notes
created_at	datetime	Sys		LE	all core entities
created_by	user_id	Sys		LE	
updated_at	datetime	Sys		LE	
updated_by	user_id	Sys		LE	
access_log_id	text	Sys		LE	SIEM correlation
22.14 Data Quality Rules (Key)
•	Mandatory severity, case_type_code, local_or_international at intake.
•	Prevent case closure unless outcome.disposition set and all chain_of_custody items reconciled.
•	Block attachment without sha256 computed; compute server‑side.
•	Redact/minimise victim PII in exports (role‑aware masking for reports).
•	Enforce guardian_contact for victims < 18 (where lawful/appropriate).
________________________________________
Attachments
•	Annex A: Intake Form (fields list)
•	Annex B: Seizure & Device Label (printable with QR)
•	Annex C: Chain‑of‑Custody Receipt (auto‑filled)
•	Annex D: MLAT Request Template
•	Annex E: Monthly Ops Report template (table + chart placeholders)
This document is a working baseline. We can tailor names, statutes, and partner lists to your exact JCTC SOPs and MoUs. Ready to convert into a Word/PowerPoint pack or generate a seed database + API stubs on request.
