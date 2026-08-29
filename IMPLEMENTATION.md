# IMPLEMENTATION.md

# Consent-Based Location Link Platform

## 1. Project Overview

Build a full-stack web application that allows authenticated users to create unique shareable links.

Each generated link can be shared through messaging applications, social media, email, QR codes, etc.

When another person opens the link, they are presented with a clear consent screen explaining that:

- The link owner is requesting their current location.
- Location sharing is optional.
- The visitor can decline.
- The visitor's location is transmitted only after explicit browser permission is granted.

If the visitor grants permission, the application obtains the browser-provided geographic coordinates and associates the resulting location with the specific link that was opened.

The authenticated owner can then view their links, link activity, and consented locations through a private dashboard.

---

# 2. Core Principle

This application MUST operate on explicit user consent.

Never:

- bypass browser location permissions
- attempt to obtain location after permission is denied
- disguise a location request as an unrelated action
- silently transmit coordinates
- repeatedly request permission after denial
- attempt to identify the visitor's real-world identity without consent

The browser Geolocation API is the source of location data.

The application should clearly communicate what will happen before requesting location permission.

---

# 3. Main User Flow

## Owner

```text
Register
   ↓
Login
   ↓
Dashboard
   ↓
Create Link
   ↓
Unique URL generated
   ↓
Copy / Share / QR
   ↓
Wait for visitor
```

## Visitor

```text
Open unique link
       ↓
Landing page
       ↓
Explain location request
       ↓
Visitor chooses:
       ├── Decline
       │      ↓
       │   No location transmitted
       │
       └── Share Location
              ↓
       Browser permission
              ↓
       ├── Denied
       │      ↓
       │   No location transmitted
       │
       └── Allowed
              ↓
       Browser Geolocation API
              ↓
       HTTPS POST
              ↓
       Backend
              ↓
       Location stored
              ↓
       Owner dashboard updated
```

---

# 4. Technology Stack

Use the following stack unless there is a strong technical reason to change it.

## Frontend

- React
- Vite
- JavaScript or TypeScript
- React Router
- Tailwind CSS
- Leaflet
- React-Leaflet

Prefer TypeScript if practical.

## Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- SQLAlchemy
- Alembic
- JWT or secure session-based authentication
- Passlib/Argon2 or another modern password hashing implementation

## Database

PostgreSQL

## Real-time

WebSockets

Implement normal REST polling first if required for development simplicity, then add WebSockets.

## Deployment

Design the application so that it can later be deployed using:

- frontend hosting
- backend hosting
- managed PostgreSQL
- HTTPS-enabled custom domain

---

# 5. Repository Structure

Use a monorepo structure:

```text
location-link-platform/
│
├── README.md
├── IMPLEMENTATION.md
├── .gitignore
├── .env.example
├── docker-compose.yml
│
├── frontend/
│   ├── package.json
│   ├── vite.config.*
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── layouts/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── context/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── App.*
│   │   └── main.*
│   │
│   └── public/
│
├── backend/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   │
│   │   ├── database/
│   │   │   ├── connection.py
│   │   │   └── models/
│   │   │
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── auth/
│   │   ├── websocket/
│   │   └── utils/
│   │
│   └── migrations/
│
└── docs/
    ├── API.md
    ├── ARCHITECTURE.md
    └── SECURITY.md
```

Keep frontend and backend logically separated.

---

# 6. Database Design

Use PostgreSQL.

## users

```text
id
uuid
email
password_hash
created_at
updated_at
is_active
```

Requirements:

- email must be unique
- password must never be stored in plaintext
- use secure password hashing

---

## links

```text
id
uuid
owner_id
token
name
created_at
updated_at
expires_at
is_active
```

Relationships:

```text
User 1 ──────── N Links
```

`token` must be:

- cryptographically random
- sufficiently long
- impossible to predict
- unique

Do not use sequential IDs as public link tokens.

Example:

```text
https://example.com/l/x7K92pQa81M4
```

---

## visits

Record basic link activity.

```text
id
uuid
link_id
visited_at
user_agent
```

Avoid collecting unnecessary personal information.

Do not treat an IP address as a person's identity.

If IP logging is implemented for security/rate limiting, document the purpose and retention policy.

---

## locations

```text
id
uuid
link_id
latitude
longitude
accuracy
captured_at
```

Optional:

```text
altitude
heading
speed
```

Only store fields actually needed by the application.

Relationship:

```text
Link 1 ──────── N Locations
```

A link may have zero, one, or multiple consented location submissions.

---

# 7. Authentication

Implement:

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Requirements:

- secure password hashing
- authenticated dashboard
- protected APIs
- authorization checks
- users can only access their own links
- users can only access locations belonging to their links

Never trust a client-provided `owner_id`.

Always derive the authenticated owner from the authenticated session/token.

---

# 8. Link APIs

Implement:

```text
POST /api/links
GET /api/links
GET /api/links/{link_id}
PATCH /api/links/{link_id}
DELETE /api/links/{link_id}
POST /api/links/{link_id}/disable
POST /api/links/{link_id}/enable
```

Create request:

```json
{
  "name": "My Link"
}
```

Response:

```json
{
  "id": "...",
  "name": "My Link",
  "token": "...",
  "url": "https://domain.com/l/...",
  "created_at": "...",
  "is_active": true
}
```

The backend generates the token.

The client must never generate security-sensitive link tokens.

---

# 9. Public Link API

Public route:

```text
GET /l/{token}
```

The server should:

1. Validate token.
2. Check whether link exists.
3. Check whether link is active.
4. Check whether it has expired.
5. Record basic visit activity.
6. Render/load the public experience.

Invalid links should produce a clean:

```text
This link is unavailable.
```

Do not expose database IDs or internal errors.

---

# 10. Visitor Consent UI

The public page should be visually polished.

Example:

```text
-----------------------------------

        Location Request

The person who shared this link
is requesting your current location.

Your location will only be shared
if you explicitly allow it.

        [ Share Location ]

        [ Not Now ]

-----------------------------------
```

The page must NOT imply that location sharing is mandatory.

Do not use deceptive wording.

Do not automatically trigger repeated permission requests.

---

# 11. Browser Geolocation

Use the browser Geolocation API.

Conceptual flow:

```javascript
navigator.geolocation.getCurrentPosition(
    success,
    error,
    options
)
```

Recommended options:

```text
enableHighAccuracy: true
timeout: reasonable value
maximumAge: 0
```

Do not request location until the visitor intentionally chooses the location-sharing action.

The application must work correctly when:

```text
permission granted
permission denied
permission unavailable
timeout
browser unsupported
HTTPS unavailable
```

---

# 12. Location Submission API

Implement:

```text
POST /api/public/location/{token}
```

Payload:

```json
{
  "latitude": 28.6139,
  "longitude": 77.2090,
  "accuracy": 25.4
}
```

Backend must:

1. Validate the token.
2. Verify that the link is active.
3. Verify expiration.
4. Validate latitude range.
5. Validate longitude range.
6. Validate accuracy.
7. Apply rate limiting.
8. Store timestamp server-side.
9. Store location associated with the correct link.
10. Return a minimal success response.

Latitude:

```text
-90 to 90
```

Longitude:

```text
-180 to 180
```

Do not trust a client-provided timestamp for authoritative records.

---

# 13. Location Response

Example:

```json
{
  "success": true,
  "message": "Location shared successfully."
}
```

Do not return unnecessary sensitive information.

---

# 14. Dashboard

Create a modern responsive dashboard.

Main sections:

```text
Dashboard
│
├── Overview
├── My Links
├── Locations
└── Settings
```

---

# 15. Dashboard Overview

Display:

```text
Total Links
Total Visits
Location Shares
Active Links
```

Example:

```text
┌────────────┐ ┌────────────┐
│ 12 Links   │ │ 84 Visits  │
└────────────┘ └────────────┘

┌────────────┐ ┌────────────┐
│ 21 Shares  │ │ 9 Active   │
└────────────┘ └────────────┘
```

---

# 16. Link Management UI

Display links in a table/card layout.

Each link should show:

```text
Name
Short URL
Created
Status
Visits
Locations
Actions
```

Actions:

```text
Copy
Share
QR
View
Disable
Delete
```

Allow the owner to assign a human-readable name.

Example:

```text
College Event
Friends
Testing
SIH Demo
```

---

# 17. QR Code

Generate a QR code for every active link.

The owner should be able to:

```text
View QR
Download QR
Copy Link
Share Link
```

Do not embed sensitive owner information in the QR code.

Only encode the public link.

---

# 18. Location Dashboard

For each link:

```text
Link: College Event

Visits: 37
Location shares: 8

Latest location:
Latitude: ...
Longitude: ...
Accuracy: ...
Time: ...
```

Show locations on an interactive map.

Use:

```text
Leaflet
React-Leaflet
OpenStreetMap-compatible tiles
```

---

# 19. Map Behavior

Each location should appear as a marker.

Clicking marker:

```text
Location
Time
Accuracy
```

If multiple locations exist, show history.

Optionally draw an accuracy circle around the location based on the browser-provided accuracy.

Do not visually imply greater precision than the reported accuracy.

---

# 20. Real-Time Updates

Implement WebSockets after the basic REST functionality works.

Flow:

```text
Visitor
   ↓
POST location
   ↓
FastAPI
   ↓
Database
   ↓
WebSocket event
   ↓
Owner dashboard
   ↓
New marker appears
```

Example event:

```json
{
  "type": "location_created",
  "link_id": "...",
  "location": {
    "latitude": 28.61,
    "longitude": 77.20,
    "accuracy": 18
  }
}
```

Only broadcast the event to the authenticated owner who owns that link.

---

# 21. Link Expiration

Support optional expiration.

Examples:

```text
Never
1 hour
24 hours
7 days
Custom
```

Backend must enforce expiration.

Do not rely solely on frontend checks.

---

# 22. Disable/Delete

Disabled link:

```text
Link exists
but cannot receive new submissions
```

Deleted link:

```text
No longer accessible
```

Implement appropriate database behavior.

Avoid accidentally deleting unrelated records.

Use foreign-key relationships and deliberate deletion policies.

---

# 23. Security Requirements

This section is mandatory.

## Authentication

Use secure authentication.

## Authorization

Every protected resource must verify ownership.

Example:

```text
GET /api/links/123
```

must NOT simply check that the user is logged in.

It must check:

```text
link.owner_id == authenticated_user.id
```

---

## Token Security

Use cryptographically secure random tokens.

Never:

```text
1
2
3
4
```

Never expose sequential database IDs as the only public identifier.

---

## Rate Limiting

Apply rate limits to:

```text
login
register
public link access
location submission
```

This prevents abuse and accidental request flooding.

---

## Input Validation

Validate all API input using Pydantic/backend validation.

Never trust:

- latitude
- longitude
- IDs
- tokens
- timestamps
- user-provided names

---

## HTTPS

Production location submission MUST use HTTPS.

Browser geolocation generally requires a secure context.

Local development can use localhost.

---

## CORS

Configure CORS explicitly.

Do not use:

```text
allow_origins=["*"]
```

in production when authenticated requests are involved.

---

## Secrets

Never commit:

```text
database passwords
JWT secrets
API keys
production credentials
```

Use environment variables.

Provide:

```text
.env.example
```

---

# 24. Privacy

The application should follow data minimization.

Only collect what is necessary.

Location data is sensitive and should be treated accordingly.

Provide a way for the owner to delete location records.

Consider:

```text
Delete location
Delete link
Delete account
```

Account deletion should have clearly defined behavior for associated links and location data.

---

# 25. Error Handling

Frontend should handle:

```text
Location denied
Location unavailable
Location timeout
Invalid link
Expired link
Disabled link
Network failure
Server error
Unauthorized
Session expired
```

Never show raw backend stack traces to users.

---

# 26. Visitor Messages

Suggested messages:

### Permission denied

```text
Location sharing was not allowed.

No location was shared.
```

### Success

```text
Location shared successfully.
```

### Browser unsupported

```text
Your browser does not support location sharing.
```

### Timeout

```text
We couldn't obtain your location.
Please try again if you want to share it.
```

---

# 27. Frontend Routes

Implement:

```text
/
 /login
 /register
 /dashboard
 /dashboard/links
 /dashboard/links/:id
 /dashboard/settings
 /l/:token
```

Public:

```text
/l/:token
```

Protected:

```text
/dashboard/*
```

---

# 28. UI Design

Use a modern minimal dashboard.

Prioritize:

- responsive design
- mobile compatibility
- accessible buttons
- clear status indicators
- loading states
- empty states
- error states
- confirmation dialogs for destructive actions

Do not overcomplicate the UI.

---

# 29. Loading States

Every network operation should have a loading state.

Examples:

```text
Creating link...
Loading locations...
Saving...
Disabling...
```

Prevent duplicate submissions.

---

# 30. Empty States

Examples:

```text
No links yet.

Create your first location-sharing link.
```

and:

```text
No locations have been shared yet.
```

---

# 31. Testing

Implement tests for the backend.

Minimum tests:

```text
Registration
Login
Invalid login
Link creation
Link ownership
Link deletion
Disabled link
Expired link
Invalid token
Valid location
Invalid latitude
Invalid longitude
Unauthorized API access
```

Test location permission behavior manually in multiple browsers.

---

# 32. Manual Testing Checklist

## Authentication

- [ ] Register
- [ ] Login
- [ ] Logout
- [ ] Invalid credentials
- [ ] Session expiration

## Links

- [ ] Create link
- [ ] Copy link
- [ ] Open link
- [ ] Disable link
- [ ] Re-enable link
- [ ] Delete link
- [ ] Expired link

## Location

- [ ] Click Share Location
- [ ] Browser asks permission
- [ ] Allow works
- [ ] Deny works
- [ ] Timeout works
- [ ] Invalid coordinates rejected
- [ ] Location appears in dashboard

## Security

- [ ] User A cannot see User B's links
- [ ] User A cannot see User B's locations
- [ ] Random tokens cannot access unrelated links
- [ ] Disabled links reject location submissions

---

# 33. Development Phases

Implement in this exact order.

## Phase 1 — Project Setup

Create:

```text
frontend
backend
PostgreSQL
environment configuration
```

Verify frontend and backend communicate.

---

## Phase 2 — Database

Implement:

```text
users
links
visits
locations
```

Configure SQLAlchemy and Alembic.

Create initial migration.

---

## Phase 3 — Authentication

Implement:

```text
register
login
logout
current user
protected routes
```

Test authentication thoroughly before proceeding.

---

## Phase 4 — Link Management

Implement:

```text
create
list
view
disable
enable
delete
```

Generate secure tokens.

---

## Phase 5 — Public Link

Implement:

```text
/l/{token}
```

Add:

- polished landing page
- consent explanation
- Share Location button
- Not Now button

---

## Phase 6 — Geolocation

Integrate:

```text
navigator.geolocation
```

Handle all permission/error states.

Send coordinates to backend only after successful geolocation.

---

## Phase 7 — Location Storage

Implement:

```text
POST /api/public/location/{token}
```

Validate and store locations.

---

## Phase 8 — Dashboard

Implement:

```text
links
visits
locations
statistics
```

---

## Phase 9 — Map

Integrate Leaflet.

Display:

```text
markers
timestamps
accuracy
location history
```

---

## Phase 10 — WebSockets

Add real-time dashboard updates.

---

## Phase 11 — QR / Sharing

Add:

```text
QR generation
copy link
share link
```

Use Web Share API where supported.

---

## Phase 12 — Security Hardening

Review:

```text
authentication
authorization
rate limits
CORS
CSRF where applicable
input validation
token generation
HTTPS
secrets
data deletion
```

---

## Phase 13 — Deployment

Prepare:

```text
production environment
PostgreSQL
frontend
backend
HTTPS
environment variables
database migrations
```

Test the entire system using the production domain.

---

# 34. Environment Variables

Create `.env.example`.

Backend:

```text
DATABASE_URL=
SECRET_KEY=
ACCESS_TOKEN_EXPIRE_MINUTES=
FRONTEND_URL=
ENVIRONMENT=
```

Frontend:

```text
VITE_API_URL=
```

Never commit the real `.env`.

---

# 35. README Requirements

The final repository README should contain:

```text
Project Overview
Features
Architecture
Tech Stack
Local Setup
Environment Variables
Database Setup
Running Backend
Running Frontend
Testing
Deployment
Privacy Model
Security Model
```

---

# 36. Important Architectural Rule

The backend is authoritative.

The frontend must never be trusted for:

```text
ownership
link validity
expiration
authorization
location association
timestamps
```

The backend determines all of these.

---

# 37. MVP Definition

The MVP is complete when this works:

```text
User registers
       ↓
User logs in
       ↓
User creates link
       ↓
User copies link
       ↓
Another browser opens link
       ↓
Visitor sees explicit location-sharing explanation
       ↓
Visitor chooses Share Location
       ↓
Browser asks permission
       ↓
Visitor grants permission
       ↓
Coordinates sent to backend
       ↓
Coordinates stored in PostgreSQL
       ↓
Owner opens dashboard
       ↓
Location appears on map
```

If this entire flow works reliably, the core project is finished.

Everything after this is enhancement.

---

# 38. Future Features

Possible future versions:

```text
Multiple location submissions
Location history
Link analytics
QR codes
Expiration
Link naming
Real-time WebSockets
Map clustering
Location accuracy visualization
Export location data
Audit logs
Account deletion
Privacy controls
Custom landing pages
Custom domains
PWA support
Mobile application
```

Do NOT implement these before the MVP works.

---

# 39. AI Agent Instructions

You are implementing this repository autonomously.

Follow these rules:

1. Read `IMPLEMENTATION.md` completely before making architectural decisions.
2. Build incrementally.
3. Keep frontend and backend cleanly separated.
4. Do not introduce unnecessary technologies.
5. Do not replace PostgreSQL with a different database without a compelling reason.
6. Do not remove authentication.
7. Do not bypass browser geolocation permissions.
8. Do not implement hidden location collection.
9. Do not collect unnecessary personal information.
10. Do not expose one user's data to another user.
11. Write clean, maintainable code.
12. Use environment variables for secrets.
13. Add error handling.
14. Add validation.
15. Add tests for critical backend behavior.
16. Keep API contracts documented.
17. Run the application after each major phase.
18. Fix errors before moving to the next phase.
19. Do not mark a phase complete merely because files were created; verify that the functionality actually works.
20. Prefer simple working implementations over premature complexity.

---

# 40. Final Acceptance Test

The project should pass the following complete scenario:

```text
1. Start PostgreSQL.

2. Start FastAPI.

3. Start React.

4. Register User A.

5. Login as User A.

6. Create:
      "Test Link"

7. Copy generated URL.

8. Open URL in a separate browser/incognito window.

9. Public page explains:
      location sharing is optional
      and requires explicit permission.

10. Click "Share Location".

11. Browser displays its native permission dialog.

12. Choose Allow.

13. Browser obtains coordinates.

14. Frontend sends coordinates to backend.

15. Backend validates token.

16. Backend validates coordinates.

17. Backend associates location with the correct link.

18. Backend stores location.

19. Owner dashboard receives/displays location.

20. Map shows marker.

21. Test Deny.

22. Verify no location is stored.

23. Disable link.

24. Attempt another submission.

25. Verify backend rejects it.

26. Login as User B.

27. Verify User B cannot access User A's links or locations.

If all of the above work, the MVP is considered successful.
```

# END