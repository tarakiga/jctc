---
description: Sync local code with Git remote - ensure consistency before deployment
---

# Sync Code Workflow

Ensures local and remote Git repositories are in sync before any deployment operations.

---

## When to Use

- Before starting any deployment
- After making local changes that need to be deployed
- When you suspect local and remote are out of sync
- Before running migrations on production

---

## Quick Sync (Push Local Changes)

// turbo-all

### 1. Check Current Status
```bash
git status
```

### 2. View Recent Commits
```bash
git log --oneline -5
```

### 3. Stage All Changes
```bash
git add .
```

### 4. Commit with Descriptive Message
```bash
git commit -m "feat/fix/chore: Your descriptive message here"
```

### 5. Push to Remote
```bash
git push origin main
```

---

## Pull Remote Changes (Sync from Remote)

// turbo-all

### 1. Fetch Latest
```bash
git fetch origin main
```

### 2. Check for Differences
```bash
git log HEAD..origin/main --oneline
```

### 3. Pull Changes
```bash
git pull origin main
```

---

## Conflict Resolution

### If Merge Conflicts Occur

1. View conflicted files:
```bash
git diff --name-only --diff-filter=U
```

2. Open each file and resolve conflicts manually (look for `<<<<<<<`, `=======`, `>>>>>>>` markers)

3. After resolving, stage the fixed files:
```bash
git add <resolved-file>
```

4. Complete the merge:
```bash
git commit -m "Resolve merge conflicts"
```

---

## Verify Sync Status

### Check if Local Matches Remote
```bash
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
```
> Both should show the same commit hash if in sync.

### View Unpushed Commits
```bash
git log origin/main..HEAD --oneline
```

### View Unpulled Commits
```bash
git log HEAD..origin/main --oneline
```

---

## Force Sync (Use with Caution!)

### Force Local to Match Remote
```bash
git fetch origin main
git reset --hard origin/main
```
> ⚠️ WARNING: This will discard all local changes!

### Force Remote to Match Local
```bash
git push origin main --force
```
> ⚠️ WARNING: This will overwrite remote history!

---

## Pre-Deployment Checklist

- [ ] All changes committed locally
- [ ] Changes pushed to remote
- [ ] No uncommitted files (`git status` is clean)
- [ ] Local HEAD matches origin/main
- [ ] No pending pull requests that should be merged first
