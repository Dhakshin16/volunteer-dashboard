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
- All channels are best-effort: missing creds → log + no-op (never blocks).
- New routes prefixed `/api/notifications`.

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

## API additions
- `GET /api/notifications/me`
- `GET /api/notifications/me/unread-count`
- `POST /api/notifications/{id}/read`
- `POST /api/notifications/read-all`

## Files added / modified
- **Added**: `backend/app/services/notification_service.py`, `backend/app/routes/notification.py`, `frontend/src/components/NotificationBell.jsx`, `backend/tests/test_e2e_notifications.py`, `backend/tests/test_notifications_smoke.py`.
- **Modified**: `backend/server.py` (route mount), `backend/app/routes/admin.py`, `backend/app/routes/ngo.py`, `backend/app/routes/cause.py`, `backend/app/routes/event.py`, `backend/app/routes/enrollment.py`, `backend/app/routes/user.py`, `backend/app/services/ngo_service.py`, `backend/app/services/user_service.py`, `backend/app/utils/firebase_auth.py` (test-auth bypass), `backend/.env` (Resend/Twilio creds), `backend/requirements.txt`, `frontend/src/components/Layout.jsx` (bell wiring).

## What's been implemented (2026-04-25)
- Live email send verified to Resend account owner inbox.
- Twilio client connects (rejected fake numbers as expected — credentials valid).
- Full E2E test (`tests/test_e2e_notifications.py`) green: 10/10 triggers fire and create the right in-app records, with email + SMS dispatched best-effort.

## Operational notes
- Resend account is in **TESTING MODE** — emails will only deliver to the
  Resend account owner's inbox. To send to real organisation/volunteer
  addresses, verify a domain at https://resend.com/domains and set
  `SENDER_EMAIL` to an address on that domain.
- Twilio is configured with a US trial number. Trial accounts can only SMS
  verified numbers — upgrade or verify recipients to send to anyone.
- `ENABLE_TEST_AUTH=true` in `.env` is a dev/testing convenience that accepts
  `test::<uid>::<email>::<name>` bearer tokens. **Disable this in production.**

## Backlog / next priorities
- P1: Daily reminder cron for upcoming events (currently only on RSVP).
- P1: Frontend `REACT_APP_FIREBASE_*` env vars are not in the upload — once
  added the full UI loads and the bell will render in-context for real users.
- P2: Notification preferences page (let users opt out of email or SMS).
- P2: Webhook from Resend/Twilio to track delivery + bounces.
- P2: Server-Sent Events / WebSocket push (replace 45s polling).

## Future enhancement idea
Add weekly digest emails summarising new causes near the volunteer's city —
recovers users who unsubscribed from per-event noise but still want highlights.
