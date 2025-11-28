# Team Activity – Technical Architecture

## 1. Database Schema (Supabase PostgreSQL)

```sql
-- Activity types enum
create type activity_type as enum ('meeting','travel','training','leave');

-- Events table
create table team_events (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) <= 120),
  type          activity_type not null,
  description   text,
  start_at      timestamptz not null,
  end_at        timestamptz not null check (end_at > start_at),
  created_by    uuid references auth.users(id) on delete cascade,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Junction: event attendees
create table team_event_attendees (
  event_id uuid references team_events(id) on delete cascade,
  user_id  uuid references auth.users(id) on delete cascade,
  primary key (event_id, user_id)
);

-- Row-level security
alter table team_events enable row level security;
create policy "Anyone can read events"
  on team_events for select
  using (true);
create policy "Only admins can mutate events"
  on team_events for all
  using (auth.jwt() ->> 'role' = 'admin');

alter table team_event_attendees enable row level security;
create policy "Anyone can read attendees"
  on team_event_attendees for select
  using (true);
create policy "Admins manage attendees"
  on team_event_attendees for all
  using (auth.jwt() ->> 'role' = 'admin');

-- Indexes for dashboard speed
create index idx_team_events_start on team_events(start_at desc);
create index idx_team_events_type  on team_events(type);
create index idx_attendees_user    on team_event_attendees(user_id);
```

## 2. Backend API (FastAPI)

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | /api/v1/team-events | List events (filter by date range) | authenticated |
| POST | /api/v1/team-events | Create event + attendees | admin |
| PATCH | /api/v1/team-events/{id} | Update event | admin |
| DELETE | /api/v1/team-events/{id} | Delete event & attendees | admin |

**TypeScript contracts (shared/types/teamEvents.ts)**
```ts
export interface TeamEvent {
  id: string;
  title: string;
  type: 'meeting'|'travel'|'training'|'leave';
  description?: string;
  startAt: string; // ISO
  endAt: string;
  createdBy: string; // user id
  attendees: string[]; // user ids
}

export interface CreateEventDto {
  title: string;
  type: TeamEvent['type'];
  description?: string;
  startAt: string;
  endAt: string;
  attendeeIds: string[];
}
```

## 3. RBAC Matrix
| Role | team_events | team_event_attendees |
|---|---|---|
| anon | — | — |
| authenticated | SELECT | SELECT |
| admin | ALL | ALL |

## 4. Frontend Plan (React + Mantine)
- **Dashboard widget**: new `<TeamCalendar>` component inside `pages/dashboard.tsx`.  
- **Calendar lib**: `@mantine/dates` Calendar component; monthly view default.  
- **Data layer**: `lib/hooks/useTeamEvents` (React-Query) calling `/api/v1/team-events`.  
- **Mutations**: `useCreateEvent`, `useUpdateEvent`, `useDeleteEvent` (admin only).  
- **Real-time**: optional Supabase realtime subscription on `team_events` table.

## 5. Migration & Roll-out
1. Create migration SQL file; run against prod clone.  
2. Deploy backend with new endpoints behind feature flag `TEAM_ACTIVITY_ENABLED`.  
3. Release frontend calendar widget hidden behind same flag.  
4. Enable for 10 % of users → monitor latency & errors → 100 %.

## 6. Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Large attendee list slows query | High | Paginate attendees; virtual scroll in UI |
| Calendar events become out of sync | Medium | Invalidate React-Query cache on mutation; websocket fallback |
| Admin role misused to spam events | Low | Rate-limit POST /team-events (10/min) |

## 7. Observability
- Prometheus metric: `team_events_total{type}` .  
- Log slow queries >500 ms with user id.  
- Sentry capture on 4xx/5xx responses.