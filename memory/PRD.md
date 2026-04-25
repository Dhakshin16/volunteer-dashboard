# VolunCore – PRD

## Original problem statement
Add notification enabling where organizations get notified via mail and message
when their organization is approved or rejected. Add notification and mailing
wherever possible across the platform.

## Architecture additions
- **Email**: Resend (`resend` Python SDK), HTML templates with cohesive dark
  design, async non-blocking via `asyncio.to_thread`.
- **SMS**: Twilio (`twilio` Python SDK), E.164 numbers required.
- **In-app**: Firestore collection `notifications` (per-user feed), polled by
  the React `NotificationBell` component every 45s.
- **Background scheduler**: `app/services/scheduler.py` runs every 10 min in
  the FastAPI event loop and dispatches event reminders 24h and 1h before
  start (idempotent — sentinel fields on event doc prevent double-send).
- **Notification preferences**: per-user `notif_prefs` stored on the user doc;
  `notify()` consults them before email/SMS/in-app dispatch.

## Notification triggers wired
| Trigger | Owner gets | Admin gets | Volunteer gets |
|---|---|---|---|
| Role selected (volunteer / NGO) | – | – | welcome (in-app + email) |
| NGO profile submitted | confirmation (in-app + email) | new-org alert (in-app + email) | – |
| NGO profile re-submitted | confirmation | re-submission alert | – |
| Admin **approves** NGO | success (in-app + email + SMS) | – | – |
| Admin **rejects** NGO | warning w/ reason (in-app + email + SMS) | – | – |
| Cause created | confirmation | – | – |
| Event scheduled | confirmation | – | – |
| Volunteer enrolls in cause | new-volunteer alert (in-app + email + SMS) | – | success (in-app + email) |
| Event RSVP confirmed | – | – | confirmation (in-app + email) |
| **Event reminder 24h before** | digest with RSVP count | – | reminder (in-app + email) |
| **Event reminder 1h before** | – | – | last-minute reminder (in-app + email) |

## API additions
- `GET  /api/notifications/me`
- `GET  /api/notifications/me/unread-count`
- `POST /api/notifications/{id}/read`
- `POST /api/notifications/read-all`
- `GET  /api/notifications/preferences`
- `PUT  /api/notifications/preferences`     (email / sms / in_app booleans)
- `POST /api/admin/scheduler/run-now`        (admin: trigger reminder sweep)

## Frontend additions
- `components/NotificationBell.jsx` — bell + unread badge + slide-out panel +
  link to preferences. Wired in desktop sidebar + mobile top bar.
- `pages/NotificationPreferences.jsx` — toggle email / SMS / in-app channels.
  Reachable at `/v/notifications`, `/ngo/notifications`, `/admin/notifications`.
- `frontend/.env` — `REACT_APP_FIREBASE_*` keys provided so the SPA boots.

## What's been implemented (2026-04-25)
- 12 notification triggers all green in `tests/test_e2e_notifications.py`.
- Preferences (default-on, opt-out per channel) green in `tests/test_prefs_and_scheduler.py`.
- Scheduler reminder sweep green in same file: 24h + 1h windows fire, sentinel
  prevents duplicates, NGO owner digest delivered.
- Real Resend email confirmed delivered to `jeevika.kkumar@gmail.com`
  (id `ecb50847-…`).
- Twilio client validated (rejected fake numbers as expected).
- Frontend boots and renders Auth page with Firebase web SDK.

## Operational notes
- Resend account is in **TESTING MODE** — emails will only deliver to the
  Resend account owner's inbox until a domain is verified at
  https://resend.com/domains and `SENDER_EMAIL` is updated.
- Twilio is configured with a US trial number. Trial accounts can only SMS
  numbers verified in the Twilio console.
- `ENABLE_TEST_AUTH=true` in `/app/backend/.env` accepts
  `test::<uid>::<email>::<name>` bearer tokens for automated tests. **Disable
  in production.**
- Scheduler runs in-process; if you scale to multiple backend replicas, pin
  it to a single replica or move to an external worker (Celery / Cloud Tasks)
  to avoid duplicate sends.

## Backlog / next priorities
- P0: Verify a sender domain in Resend (one-time user action on the Resend
  dashboard) so production emails reach real addresses.
- P1: Webhook from Resend / Twilio to track delivery, bounces, opt-outs.
- P2: Replace 45s polling with Server-Sent Events / WebSocket for instant push.
- P2: Quiet hours per user (no SMS between 22:00 and 07:00 local).

## Future enhancement idea
Add a **weekly digest email** that bundles "new causes near you" + "your hours
this week" — recovers users who muted per-event noise but still want highlights.
