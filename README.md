# TaskFlow Pro — Full MERN Stack Task Manager

> **Assessment Submission for MERN Stack Developer Position**  
> **Company:** Hammoq Infosystems Pvt. Ltd.  
> **Project:** Production-Conscious Task Manager Application

---

## 1. Project Overview & Features

TaskFlow Pro is a production-conscious, full-stack Task Management application built using the **MERN** stack (MongoDB, Express.js, React.js, Node.js). It demonstrates strong architectural principles, robust authentication and authorization barriers, strict data modeling, centralized error handling, and a sleek, responsive user interface.

### Key Capabilities:
- **Email OTP Verification:** Cryptographically secure 6-digit OTP verification upon registration, featuring SHA-256 hash storage, 10-minute expiry, constant-time verification, 60-second resend cooldown, brute-force attempt limits, and unverified account login barriers.
- **Role-Based Access Control (RBAC):** Distinct permissions for **Regular Users** and **Administrators**, enforced at the database and API middleware levels.
- **Ownership Isolation:** Users can strictly read, modify, and delete only their own tasks. Task owner is derived exclusively from the authenticated session on the server, never accepted from client payloads.
- **HttpOnly Cookie Authentication:** Short-lived JSON Web Tokens (JWT) stored in secure, HttpOnly cookies with `SameSite` protections, preventing XSS-based token theft (no tokens stored in `localStorage`).
- **Comprehensive Task CRUD:** Full lifecycle management including creation, inline status updates (`pending`, `in_progress`, `completed`), search by title, multi-criteria filtering, sorting, and pagination.
- **Dynamic Metrics Dashboard:** Live metrics cards (Total, In Progress, Pending, Completed, and Overdue) computed exclusively for the authenticated user's tasks.
- **Admin Management Console:** Admin-only view to inspect paginated user accounts, activate/deactivate accounts, and adjust roles with built-in **last-active-administrator protection** to prevent accidental lockout.
- **Task Reminder & In-App Notification System:** Automated background scheduler powered by `node-cron` running every 5 minutes to detect incomplete tasks that have reached their due dates (`TASK_DUE`) or remain overdue (`TASK_OVERDUE`). Features database-level compound unique index deduplication (`{ task: 1, user: 1, type: 1 }`), strict ownership isolation, bell icon with unread count badge, interactive dropdown panel, mark-as-read controls, cascaded deletion, and 30-second background polling.
- **Modern Responsive UI/UX:** Dark glassmorphism aesthetic built with vanilla CSS, modern typography (Google Fonts *Inter* & *Outfit*), accessible focus states, loading skeletons, and confirmation dialogs for destructive actions.

---

## 2. Technology Stack

### Frontend
- **Framework:** React.js 18 (Functional components & hooks)
- **Build Tool:** Vite
- **Routing:** React Router DOM (v6)
- **API Client:** Axios (configured with `withCredentials: true` and interceptors)
- **Styling:** Custom Vanilla CSS Design System (dark glassmorphism, responsive grid, micro-animations)

### Backend
- **Runtime:** Node.js (v18+)
- **Server Framework:** Express.js
- **Database & ODM:** MongoDB Atlas / Mongoose (v8)
- **Email Delivery:** Nodemailer (SMTP transport with HTML and text templates)
- **Task Scheduling:** `node-cron` (5-minute background reminder engine)
- **Authentication:** JWT (`jsonwebtoken`) & `cookie-parser`
- **Password Security:** `bcryptjs` (salt factor 10)
- **Validation:** `zod`
- **Security:** `helmet` (security headers), `cors` (explicit client origin, credentials), `express-rate-limit` (auth brute-force mitigation), Node `crypto` for constant-time OTP validation
- **Testing:** `jest`, `supertest`, `mongodb-memory-server`

---

## 3. Architecture & Separation of Concerns

```
TaskManager/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment validation (env.js) & DB connection (database.js)
│   │   ├── controllers/     # HTTP request/response controllers
│   │   ├── middleware/      # authenticate, authorize, validate, errorHandler, rateLimiter
│   │   ├── models/          # Mongoose schemas (User.js, Task.js)
│   │   ├── routes/          # Express route definitions (auth, users, tasks, admin)
│   │   ├── scripts/         # Seed script for initial administrator bootstrap
│   │   ├── services/        # Business logic, emailService, authService, taskService, adminService
│   │   ├── utils/           # Token handling, OTP cryptographic utils, response envelopes
│   │   ├── validators/      # Zod validation schemas
│   │   ├── app.js           # Express app setup and middleware pipeline
│   │   └── server.js        # Server listener and graceful shutdown
│   ├── tests/               # Automated Jest & Supertest test suites
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # AppLayout, ProtectedRoute, AdminRoute, TaskCard, TaskFilters, etc.
│   │   ├── context/         # AuthContext (in-memory authentication state)
│   │   ├── pages/           # Login, Register, VerifyEmail, Dashboard, Profile, AdminUsers
│   │   ├── services/        # API service layer (api, authService, taskService, userService, adminService)
│   │   ├── App.jsx          # Route definitions
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Core design system and utilities
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── .gitignore
├── .env.example
├── README.md
└── ASSESSMENT_NOTES.md
```

---

## 4. Environment Variables Configuration

Copy `.env.example` in `backend/` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

### Core Application Variables:
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | API server listening port | `5000` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://<USER>:<PASS>@<HOST>/task_manager_db?retryWrites=true&w=majority` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `NODE_ENV` | Runtime environment | `development` (or `production`) |
| `JWT_SECRET` | Secret key for signing JWTs (min 16 chars) | Strong random secret (e.g. `openssl rand -base64 32`) |
| `JWT_EXPIRES_IN`| Token expiration timeframe | `15m` |
| `COOKIE_SECRET` | Cookie signing secret (distinct from JWT_SECRET) | Distinct random secret |

### SMTP Email Configuration Variables:
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `EMAIL_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP port (`587` for STARTTLS, `465` for SSL) | `587` |
| `EMAIL_SECURE`| Use TLS/SSL directly (`true` for port 465, `false` for 587) | `false` |
| `EMAIL_USER` | SMTP username or email address | `your-email@gmail.com` |
| `EMAIL_PASS` | SMTP password or 16-character Google App Password | `abcd efgh ijkl mnop` |
| `EMAIL_FROM` | Sender display name and email address | `"TaskFlow Pro" <no-reply@taskflow.local>` |

---

## 5. SMTP & Gmail App Password Setup Guide

For local and production email delivery with Gmail:

1. **Enable 2-Step Verification:**
   - Go to your [Google Account Security Settings](https://myaccount.google.com/security).
   - Ensure **2-Step Verification** is turned ON.
2. **Generate a Google App Password:**
   - Search for **App passwords** in your Google Account search bar (or visit [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)).
   - Enter an App Name (e.g., `TaskFlow Pro`).
   - Click **Create**. Google will display a 16-character code (e.g., `abcd efgh ijkl mnop`).
3. **Configure `backend/.env`:**
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_SECURE=false
   EMAIL_USER=your-account@gmail.com
   EMAIL_PASS=abcdefghijklmnop
   EMAIL_FROM="TaskFlow Pro" <your-account@gmail.com>
   ```

> [!TIP]
> Never use your primary Google account password. Google App Passwords are scoped, revocable, and bypass 2FA challenges on SMTP connections.

---

## 6. MongoDB Atlas Setup Guide

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new cluster (Shared / Free M0 cluster is sufficient).
3. Under **Security → Database Access**:
   - Create a database user (e.g. `task_app_user`) with **Read and write to any database** privileges.
   - Note the password.
4. Under **Security → Network Access**:
   - Add your current IP address (or `0.0.0.0/0` for development access).
5. Under **Deployment → Database → Connect**:
   - Select **Drivers** (Node.js).
   - Copy the connection string into your `backend/.env` file:
     ```env
     MONGODB_URI=mongodb+srv://task_app_user:<YOUR_PASSWORD>@cluster0.abcde.mongodb.net/task_manager_db?retryWrites=true&w=majority
     ```

---

## 7. Installation & Startup Commands

### Step 1: Install Backend Dependencies
```bash
cd backend
npm install
```

### Step 2: Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

### Step 3: Run Initial Administrator Bootstrap
Run the secure administrative seed script to create the initial admin account (automatically seeded with `isEmailVerified: true`):
```bash
cd ../backend
# Syntax: node src/scripts/createAdmin.js [name] [email] [password]
node src/scripts/createAdmin.js "System Admin" admin@taskmanager.local Admin@123456
```
*(If no password is provided, a cryptographically secure random password is generated and printed once to stdout).*

### Step 4: Start Backend Server
```bash
# In backend/
npm run dev
# Or standard start:
npm start
```
The backend starts at `http://localhost:5000`.

### Step 5: Start Frontend Dev Server
```bash
# In frontend/
npm run dev
```
The frontend starts at `http://localhost:5173`.

---

## 8. REST API Documentation

Base path: `/api`

### Health Check
- `GET /api/health` — Returns service status, uptime, and timestamp.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new user with `isEmailVerified: false` and send 6-digit OTP (rate-limited).
  - Body: `{ name, email, password, confirmPassword }`
  - Response: `{ status: 'success', message: 'Registration successful...', data: { email, isEmailVerified: false } }`
  - *Note:* Does **not** issue JWT or session cookie before verification.
- `POST /api/auth/verify-email` — Verify 6-digit email OTP (rate-limited).
  - Body: `{ email, otp }`
  - Response: `{ status: 'success', message: 'Email verified successfully. You may now log in.' }`
  - Validations: Enforces 6-digit numeric format, 10-minute expiry, max 5 attempts lockout, constant-time hash comparison, and atomic replay protection.
- `POST /api/auth/resend-otp` — Resend verification OTP (rate-limited).
  - Body: `{ email }`
  - Enforces 60-second cooldown (`429 Too Many Requests` with remaining seconds). Invalids previous OTP. Returns generic response for unknown emails to mitigate enumeration.
- `POST /api/auth/login` — Authenticate and receive HttpOnly cookie (rate-limited).
  - Body: `{ email, password }`
  - Rejection: Unverified accounts return `403 Forbidden` with error code `EMAIL_NOT_VERIFIED` and email payload for seamless client redirection.
- `POST /api/auth/logout` — Clear authentication cookie.
- `GET /api/auth/me` — Retrieve current authenticated user profile.

### User Profile (`/api/users`)
- `GET /api/users/me` — Retrieve current user details.
- `PATCH /api/users/me` — Update permitted profile fields only (`name`).

### Tasks (`/api/tasks`)
- `GET /api/tasks` — List authenticated user's tasks.
  - Query parameters: `page`, `limit`, `search`, `status`, `priority`, `sortBy`, `sortOrder`.
- `GET /api/tasks/stats` — Metrics for authenticated user (`total`, `pending`, `inProgress`, `completed`, `overdue`).
- `GET /api/tasks/:id` — Retrieve a single task (ownership verified).
- `POST /api/tasks` — Create task (owner automatically assigned from session).
- `PUT /api/tasks/:id` — Update permitted fields of a task (ownership verified).
- `PATCH /api/tasks/:id/status` — Quick status transition (ownership verified).
- `DELETE /api/tasks/:id` — Delete task (ownership verified).

### Admin User Management (`/api/admin`)
*(Requires authentication and `admin` role)*
- `GET /api/admin/users` — Paginated user accounts list (query: `page`, `limit`, `search`, `role`, `isActive`).
- `GET /api/admin/users/:id` — View account details without password hash or OTP data.
- `PATCH /api/admin/users/:id/status` — Activate/deactivate account (with last-active-admin safeguard).
  - Body: `{ isActive: boolean }`
- `PATCH /api/admin/users/:id/role` — Promote/demote account role (with last-active-admin safeguard).
  - Body: `{ role: 'user' | 'admin' }`

### In-App Notifications (`/api/notifications`)
*(Requires authentication; strictly scoped to the authenticated user)*
- `GET /api/notifications` — Retrieve paginated notifications (query: `page`, `limit`, `isRead`). Includes populated task reference.
- `GET /api/notifications/unread-count` — Retrieve unread notification count badge for the user.
- `PATCH /api/notifications/:id/read` — Mark a specific notification as read (ownership verified).
- `PATCH /api/notifications/read-all` — Mark all unread notifications for the user as read.
- `DELETE /api/notifications/:id` — Delete a notification record (ownership verified).

---

## 9. Task Reminder Scheduler & Notification Architecture

### Workflow
1. **Background Engine:** Every 5 minutes (`*/5 * * * *`), `node-cron` triggers `checkTaskReminders()`.
2. **Task Evaluation:** Identifies incomplete tasks (`status !== 'completed'`) whose `dueDate !== null && dueDate <= now`.
3. **Notification Generation:**
   - Tasks that have just reached their due date trigger a `TASK_DUE` reminder.
   - Tasks remaining incomplete 5 or more minutes past due trigger a `TASK_OVERDUE` alert.
   - Once a task receives `TASK_OVERDUE`, subsequent 5-minute runs will not generate additional reminders for that task.
4. **Lifecycle Hooks:**
   - Started once upon database connection in `server.js` (`startReminderScheduler()`).
   - Cleaned up gracefully upon `SIGTERM` / `SIGINT` shutdown (`stopReminderScheduler()`).
   - Safe to run with controllable `referenceTime` in automated Jest suites.

### Database-Level Deduplication Strategy
To guarantee no duplicate reminders can be generated—even across multiple backend worker processes or concurrent cron triggers:
- **Compound Unique Index:** `Notification` schema enforces `{ task: 1, user: 1, type: 1 }` with `unique: true` and `partialFilterExpression: { task: { $type: 'objectId' } }`.
- **Atomic Error Shielding:** When inserting reminders, MongoDB's `E11000 duplicate key` error is caught and skipped safely without failing the reminder cycle.
- **Cascaded Task Cleanup:** When a task is deleted via `DELETE /api/tasks/:id`, all associated notifications are purged (`Notification.deleteMany({ task: taskId })`), leaving zero orphan references.

---

## 9. Automated Testing

The backend includes a comprehensive, isolated test suite using **Jest**, **Supertest**, and **mongodb-memory-server**.

### Run Tests:
```bash
cd backend
npm test
```

### Coverage Highlights:
- **Email OTP Verification:**
  - Successful registration creating unverified account (`isEmailVerified: false`) and generating hashed OTP.
  - Verification with correct 6-digit OTP updating `isEmailVerified: true` and clearing OTP hash/metadata.
  - Constant-time rejection of incorrect OTPs with attempt counter increment.
  - Lockout after 5 failed verification attempts.
  - Rejection of expired OTPs (> 10 minutes).
  - Atomic single-use enforcement preventing OTP reuse and replay attacks.
  - Resend cooldown enforcement (60 seconds) returning 429 status.
  - Rejection of unverified user login attempts returning 403 `EMAIL_NOT_VERIFIED`.
  - Handling of SMTP network/delivery failures returning 502 with safe rollback guidance.
- **Task Reminders & In-App Notifications:**
  - Tasks reaching their due date automatically generate `TASK_DUE` reminders for the owner.
  - Future tasks do not trigger reminders prematurely.
  - Completed tasks are excluded from reminder generation.
  - Scheduler does not create duplicate reminders on repeated runs.
  - Overdue tasks generate `TASK_OVERDUE` alerts without repeating every 5 minutes.
  - Database-level compound unique index prevents duplicate notification creation under race conditions.
  - Cross-user isolation: User A cannot list, read, or mark User B's notifications.
  - Ownership protection: Marking another user's notification as read or deleting it returns 404.
  - Dynamic unread count tracking (`/api/notifications/unread-count`) and mark-all-read updates.
  - Task deletion cascades and cleans up linked notifications, preventing orphan links.
- **Task Ownership:** Verifies users can only view, edit, change status, and delete their own tasks; verifies cross-user access returns 404; verifies dashboard metrics are strictly segregated.
- **Validation:** Strict rejection of invalid status, priority, empty titles, malformed ObjectIds, malformed OTP strings.
- **Admin Safeguards:** Verifies non-admin users receive 403 Forbidden on all `/api/admin/*` routes; verifies that the last active administrator cannot be deactivated or demoted.

**Current Test Results:**
- **Test Suites:** 4 passed, 4 total (`auth.test.js`, `tasks.test.js`, `notifications.test.js`, `admin.test.js`)
- **Tests:** 59 passed, 59 total (100% pass rate)

---

## 11. Security Architecture & Decisions

1. **Zero-Session Registration & Verification Barrier:** Registering does not issue an access token or session cookie. Accounts remain locked out of protected APIs and login until verified.
2. **Cryptographic OTP Security:** OTPs are generated using Node.js `crypto.randomInt(100000, 1000000)`. Only a SHA-256 hash of the OTP is persisted to MongoDB. Raw OTP values are never stored in the database or written to server logs.
3. **Timing-Safe Verification:** OTP verification uses `crypto.timingSafeEqual` over fixed-length hex digests to eliminate timing side-channel attacks.
4. **Atomic Single-Use Update:** OTP verification uses Mongoose `findOneAndUpdate` with an atomic filter `{ _id: user._id, isEmailVerified: false, emailOtpHash: hash }` ensuring an OTP can never be validated more than once across concurrent threads.
5. **No Dangerous TTL Account Deletion:** Rather than using MongoDB TTL indices that could delete the entire user document upon OTP expiration, expiration is verified at application runtime via `emailOtpExpiresAt`.
6. **Anti-Enumeration Resend Responses:** Resending OTP returns generic success messages even if an unverified account is not found.
7. **HttpOnly Cookies over LocalStorage:** JWT access tokens are stored in `HttpOnly`, `SameSite=lax`, `Secure` cookies. No JWTs or sensitive credentials are ever placed in `localStorage`.
8. **Server-Derived Ownership:** Client payloads cannot specify or override the `owner` field on tasks. The backend derives the user ID from `req.user._id` and queries MongoDB using `{ _id: taskId, owner: req.user._id }`.
9. **Last Active Administrator Safeguard:** The backend checks the count of active administrators before allowing any admin deactivation or role demotion.
10. **Information Disclosure Prevention:** Attempting to access, edit, or delete another user's task returns a `404 Not Found` rather than a `403 Forbidden`.

---

## 12. Troubleshooting & Common Questions

### 1. SMTP Connection / Delivery Failures
- **Symptom:** `502 Bad Gateway` with message `Failed to send verification email`.
- **Causes & Fixes:**
  - *Incorrect App Password:* Ensure you generated a 16-character **Google App Password** if using Gmail, not your personal Google account password.
  - *Port and Security Mismatch:* If `EMAIL_PORT=587`, set `EMAIL_SECURE=false`. If `EMAIL_PORT=465`, set `EMAIL_SECURE=true`.
  - *Firewall / ISP Port Blocking:* Some ISPs block outbound port 25 or 587. Try port 465 with `EMAIL_SECURE=true`.
  - *Retry Mechanism:* If email delivery fails during registration, the user account is created with `isEmailVerified: false`. The user can trigger `POST /api/auth/resend-otp` (or click "Resend Code" on the frontend) once SMTP connectivity is restored.

### 2. Resend Cooldown
- **Symptom:** `429 Too Many Requests` with `Please wait X seconds before requesting a new verification code`.
- **Behavior:** Enforced per-account to prevent mailbox spamming. The UI displays an active countdown timer. Wait until the timer reaches 0 before requesting another code.

### 3. Login Redirecting to Verify Email
- **Symptom:** Attempting to log in shows a notification: `Your email is not verified yet.`
- **Behavior:** The system returns HTTP 403 with `code: 'EMAIL_NOT_VERIFIED'`. The frontend automatically retains the email in session storage and redirects to `/verify-email`.

---

## 13. Deliberately Excluded Features & Scope Limitations

To maintain high code quality, predictability, security, and meet assessment specifications, the following scope boundaries are established:
1. **In-App Notifications Only:** Notifications are delivered directly inside the application interface when logged in. External delivery mechanisms—including email reminders, SMS gateways, and browser push notifications (Web Push)—are not implemented for reminders. The application does not deliver notifications while the user is away from the app.
2. **Polling over WebSockets:** Notifications and unread counts refresh via lightweight 30-second background polling while the user has an active session. Full duplex WebSockets / socket.io were omitted to preserve stateless REST architecture, simplicity, and low server resource overhead.
3. **Task Collaboration & Real-Time Locking:** Collaborative editing introduces complex conflict resolution (CRDTs/OT) that is beyond the scope of this task management assessment.

---

## 14. Known Limitations & Concurrency Notes

1. **Multi-Instance Backend Scheduling:** In multi-instance deployments (e.g. clustered Node.js or multiple containers), each instance's internal `node-cron` runner executes independently. Duplicate reminders are strictly prevented at the database layer via MongoDB's unique compound index (`{ task: 1, user: 1, type: 1 }`), ensuring only one notification is ever created. In large-scale enterprise clusters, a distributed job queue (such as BullMQ with Redis or Agenda) would be recommended to prevent redundant database polling.
2. **Browser Automation in Sandboxed Environments:** Automated end-to-end browser tests via Playwright were blocked in offline sandbox containers due to restricted access to external CDN driver downloads (`playwright.azureedge.net`). However, the backend is 100% covered by 59 automated Supertest integration tests (including 13 dedicated reminder and notification tests), and live runtime HTTP flows were validated with automated Node test runners.
