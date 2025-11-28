# Team Activity Feature – Product Requirements Document

## 1. Product Overview
Give every authenticated user a shared, read-only team calendar that shows who is doing what and when. Admins can add/edit/delete events; everyone else sees the full picture without surprises.

## 2. Goals
- Global visibility of team availability (meetings, travel, training, leave).  
- Reduce scheduling conflicts and duplicate bookings.  
- Zero-training UI: open dashboard → calendar loads → done.

## 3. Non-Goals
- Personal private calendars or Outlook sync.  
- Recurring events or reminders.  
- Mobile-app offline mode.

## 4. User Stories
| Role | Story | Acceptance Criteria |
|---|---|---|
| Admin | “I log an off-site training day for two detectives.” | Event appears instantly on every user’s dashboard calendar; start/end times and attendee list are correct. |
| Detective | “I open the dashboard and see who is in the office today.” | Calendar loads <1 s; color-coded badges show activity type; I cannot edit anything. |
| Supervisor | “I move a meeting to next Friday.” | Drag-and-drop saves without page reload; change is visible to all users immediately. |

## 5. Functional Requirements
1. **Activity Types** (enum): meeting, travel, training, leave.  
2. **Event Fields**: id, title, type, description, start_at, end_at, created_by, attendees[] (user ids), created_at, updated_at.  
3. **Dashboard Widget**: full-width card titled “Team Activity” placed above case stats.  
4. **Permissions**:  
   - anon / authenticated: read-only list & calendar view.  
   - admin: create, update, delete.  
5. **Validation**: end > start, max 30-day span, max 50 attendees, title ≤ 120 chars.  
6. **Performance**: ≤ 250 ms p95 for list endpoint, ≤ 1 s for calendar UI paint.

## 6. Acceptance Criteria
- [ ] Calendar renders on dashboard for every logged-in user.  
- [ ] Admin can open “Add Event” modal, pick type, select multiple users, save.  
- [ ] Event updates appear in real-time (WebSocket or optimistic refetch).  
- [ ] Deleting an event prompts confirmation; deletion syncs to all clients.  
- [ ] Non-admin users see disabled edit controls.  
- [ ] Unit tests ≥ 90 % coverage on backend; e2e smoke test passes.