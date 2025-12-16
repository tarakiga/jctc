---
description: Generate and maintain a beautiful user tutorial guide for JCTC
---

# User Tutorial Guide Generator

This workflow generates and maintains a **beautiful, user-focused tutorial guide** for JCTC — explaining **how to use the platform**, not how to deploy it.

> **Output**: A standalone documentation site at `https://jctc.ng/guide`

---

## 🎯 Audience

- End users (investigators, prosecutors, administrators)
- Internal JCTC team members
- Customer success / support teams

> ❌ Not for developers or DevOps.

---

## 📁 Project Structure

```
user-guide/
├── docs/
│   ├── index.md                    # Welcome + overview
│   ├── getting-started/
│   │   ├── first-login.md
│   │   └── navigation-overview.md
│   ├── tutorials/
│   │   ├── create-new-case.md
│   │   ├── manage-evidence.md
│   │   ├── track-chain-of-custody.md
│   │   ├── add-parties-to-case.md
│   │   ├── legal-instruments.md
│   │   ├── prosecution-workflow.md
│   │   └── generate-reports.md
│   ├── features/
│   │   ├── dashboard.md
│   │   ├── case-management.md
│   │   ├── evidence-tracking.md
│   │   ├── intelligence-module.md
│   │   ├── compliance.md
│   │   └── admin-settings.md
│   ├── faq.md
│   └── keyboard-shortcuts.md
├── media/
│   └── screenshots/                # Annotated screenshots
├── mkdocs.yml                      # MkDocs configuration
└── requirements.txt                # Python dependencies
```

---

## 🛠️ Initial Setup

### Step 1: Install Dependencies

```bash
# Navigate to user-guide folder
cd user-guide

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install MkDocs + plugins
pip install -r requirements.txt
```

### Step 2: Preview Locally

```bash
mkdocs serve
# Open http://localhost:8000/guide
```

### Step 3: Build for Production

```bash
mkdocs build
# Output: site/ folder ready for deployment
```

---

## 🔄 Keeping the Guide Updated

### Step 1: Detect UI/Feature Changes

Run this command to scan for changes:

```powershell
# Scan frontend for new/modified pages
Get-ChildItem -Path "frontend/apps/web/app" -Recurse -Filter "page.tsx" | 
    Select-Object FullName, LastWriteTime |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 10
```

Key files to monitor:
- `frontend/apps/web/app/**/page.tsx` - Main pages
- `frontend/apps/web/components/**/*.tsx` - UI components
- `frontend/apps/web/lib/constants.ts` - Keyboard shortcuts

### Step 2: Compare Against Existing Guide

Check if referenced UI elements still exist:

```powershell
# List all screenshots in the guide
Get-ChildItem -Path "user-guide/media/screenshots" -Recurse

# Cross-reference with current routes
Get-ChildItem -Path "frontend/apps/web/app" -Recurse -Filter "page.tsx" -Name
```

### Step 3: Update Report Template

Generate a report of suggested updates:

```markdown
## 📝 Guide Update Suggestions (YYYY-MM-DD)

### ✅ New Feature Detected
- File: `frontend/apps/web/app/[new-feature]/page.tsx`
- Suggestion: Add tutorial "How to use [New Feature]"

### ⚠️ Outdated Content
- File: `user-guide/docs/tutorials/[tutorial].md`
- Issue: Screenshot shows old UI
- Action: Regenerate screenshot + update steps

### 💡 Improvement
- Add keyboard shortcut `Ctrl+K` (detected in `hooks/useKeyboard.ts`)
```

### Step 4: Capture New Screenshots

```powershell
# Option 1: Manual capture with annotation tool (Snagit, CleanShot)
# Option 2: Automated with Playwright
npx playwright screenshot https://jctc.ng/dashboard --full-page -o media/screenshots/dashboard.png
```

### Step 5: Rebuild & Deploy

```bash
cd user-guide
mkdocs build
# Copy site/ folder to production server
```

---

## 📋 JCTC-Specific Content Sections

Based on your application structure, the guide covers:

| Module | Tutorial Topics |
|--------|-----------------|
| **Dashboard** | Overview, quick stats, recent activity |
| **Cases** | Creating cases, case lifecycle, party management |
| **Evidence** | Device registration, chain of custody, forensic reports |
| **Intelligence** | Intelligence reports, analysis workflow |
| **Compliance** | NDPA compliance, audit logs |
| **Reports** | Generating reports, scheduled reports |
| **Admin** | User management, lookup values, system settings |
| **Profile** | Account settings, password management |

---

## 🎨 Design Standards

The guide follows Fortune 500 design patterns:

1. **Clean typography** - Inter font, proper hierarchy
2. **Step-by-step layouts** - Numbered steps with screenshots
3. **Callout boxes** - Tips, warnings, notes
4. **Dark mode support** - Automatic theme switching
5. **Search** - Instant search across all content
6. **Mobile responsive** - Works on all devices

---

## ✅ Checklist for Each Update

- [ ] Screenshot all affected screens
- [ ] Update step-by-step instructions
- [ ] Verify all links work
- [ ] Test search functionality
- [ ] Preview in both light/dark modes
- [ ] Deploy to production
