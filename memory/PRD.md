# VolunCore – PRD

## Original problem statement
- Add notifications (email + SMS + in-app) so organisations are alerted on
  approval/rejection and across the platform wherever sensible.
- Don't mention the underlying tech stack anywhere in the UI.
- Add avatar / photo upload on volunteer profiles.
- Show a small "Built by Jeevika & Dhakshin" credit in the bottom-right.
- Don't claim that skills are matched by Gemini.
- Add more unique features.

## Architecture additions
- **Email**: Resend (`resend` Python SDK), HTML templates with cohesive dark
  design, async non-blocking via `asyncio.to_thread`.
- **SMS**: Twilio (`twilio` Python SDK), E.164 numbers required.
- **In-app notifications**: Firestore collection `notifications` (per-user
  feed), polled by the React `NotificationBell` component every 45s.
- **Background scheduler**: `app/services/scheduler.py` runs every 10 min in
  the FastAPI loop, dispatching event reminders 24h and 1h before start
  (idempotent — sentinel fields on event doc prevent double-send).
- **Notification preferences**: per-user `notif_prefs` stored on user doc;
  `notify()` consults them before email/SMS/in-app dispatch.
- **Engagement service** (`app/services/engagement_service.py`): activity
  streak (computed live from enrollments/donations/reports/hour_logs) +
  cause bookmarks (Firestore `bookmarks` collection).

## Notification triggers wired
| Trigger | Owner gets | Admin gets | Volunteer gets |
|---|---|---|---|
| Role selected | – | – | welcome (in-app + email) |
| NGO profile submit/resubmit | confirmation | new-org alert | – |
| Admin approves NGO | success (in-app + email + SMS) | – | – |
| Admin rejects NGO | warning + reason (in-app + email + SMS) | – | – |
| Cause created | confirmation | – | – |
| Event scheduled | confirmation | – | – |
| Volunteer enrols | new-volunteer alert (3 channels) | – | success |
| Event RSVP confirmed | – | – | confirmation |
| Event reminder 24h before | digest with RSVP count | – | reminder |
| Event reminder 1h before | – | – | last-minute reminder |

## API additions (this iteration)
- Notifications: `GET/POST /api/notifications/...` (already shipped) +
  `GET/PUT /api/notifications/preferences`.
- Scheduler: `POST /api/admin/scheduler/run-now`.
- Volunteer engagement:
  - `GET  /api/volunteer/streak`
  - `GET  /api/volunteer/bookmarks`
  - `GET  /api/volunteer/bookmarks/ids`
  - `POST /api/volunteer/bookmarks/{cause_id}`
  - `DELETE /api/volunteer/bookmarks/{cause_id}`

## UI / Frontend changes
- **Tech-stack mentions removed everywhere**: Landing badges, Auth tagline,
  Matches header, Dashboard subheading, Reports copy, Cause editor copy,
  Chat status, Impact badge, Landing footer.
- **Volunteer Profile** — avatar upload (PNG/JPG ≤ 2MB, stored as data URL)
  with 6 preset gradient avatars and remove control.
- **Layout** — sidebar avatar now prefers volunteer `photo_url` over Firebase
  photo; persistent bottom-right credit chip "Built by Jeevika & Dhakshin".
- **Volunteer Dashboard** — new **Activity Streak** card (current/longest
  days, live "today ✓" badge, motivational copy); avatar in greeting hero;
  bottom CTA points to Saved Causes instead of Field Reports.
- **Volunteer Discover** — bookmark toggle on every cause card with
  optimistic update.
- **Volunteer Saved page** (`/v/saved`) — list of bookmarked causes with
  remove + open actions.
- **Sidebar nav** — new "Saved" item between My Causes and Field Reports.
- **Notification Preferences page** (`/v|/ngo|/admin/notifications`) — toggle
  email / SMS / in-app channels; reachable from the bell.

## Tests
- `tests/test_e2e_notifications.py` — 10 notification triggers green.
- `tests/test_prefs_and_scheduler.py` — preferences honoured, 24h + 1h
  reminders fire, sentinel prevents duplicates.
- `tests/test_engagement.py` — avatar (data URL + gradient), streak shape +
  increment after activity, bookmarks add/list/idempotent/remove + 404.

## Operational notes
- Resend account is in **TESTING MODE** — emails only deliver to the Resend
  account owner's inbox until a domain is verified at
  https://resend.com/domains and `SENDER_EMAIL` is updated.
- Twilio is configured with a US trial number; trial accounts only SMS
  numbers verified in the Twilio console.
- `ENABLE_TEST_AUTH=true` accepts `test::<uid>::<email>::<name>` bearer
  tokens for automated tests. **Disable in production.**
- Avatar images are stored inline as data URLs on the Firestore profile.
  For larger user bases consider moving to Cloud Storage + signed URLs.

## Backlog / next priorities
- P0: Verify a sender domain in Resend.
- P1: Resend / Twilio webhooks for delivery + bounce + opt-out tracking.
- P1: Pin scheduler to one replica or move to Cloud Tasks if scaling out.
- P2: Replace 45s notification polling with SSE / WebSocket.
- P2: Quiet hours per user.
- P2: Skill endorsements (peer "+1" on a skill chip) and a public volunteer
  wall.

## Future enhancement idea
End-of-month auto-email with a beautifully designed "share my impact" card
(hours, donations, causes touched) — drives word-of-mouth signups and pairs
naturally with the new streak + bookmark loop.
