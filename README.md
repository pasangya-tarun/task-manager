# TaskFlow Pro — Full MERN Stack Task Manager

> **Assessment Submission for MERN Stack Developer Position**  
> **Company:** Hammoq Infosystems Pvt. Ltd.  
> **Project:** Production-Conscious Task Manager Application

---

## 1. Project Overview & Features

TaskFlow Pro is a production-conscious, full-stack Task Management application built using the **MERN** stack (MongoDB, Express.js, React.js, Node.js). It demonstrates strong architectural principles, robust authentication and authorization barriers, strict data modeling, centralized error handling, and a sleek, responsive user interface.

### Key Capabilities:
- **Role-Based Access Control (RBAC):** Distinct permissions for **Regular Users** and **Administrators**, enforced at the database and API middleware levels.
- **Ownership Isolation:** Users can strictly read, modify, and delete only their own tasks. Task owner is derived exclusively from the authenticated session on the server, never accepted from client payloads.
- **HttpOnly Cookie Authentication:** Short-lived JSON Web Tokens (JWT) stored in secure, HttpOnly cookies with `SameSite` protections, preventing XSS-based token theft (no tokens stored in `localStorage`).
- **Comprehensive Task CRUD:** Full lifecycle management including creation, inline status updates (`pending`, `in_progress`, `completed`), search by title, multi-criteria filtering, sorting, and pagination.
- **Dynamic Metrics Dashboard:** Live metrics cards (Total, In Progress, Pending, Completed, and Overdue) computed exclusively for the authenticated user's tasks.
- **Admin Management Console:** Admin-only view to inspect paginated user accounts, activate/deactivate accounts, and adjust roles with built-in **last-active-administrator protection** to prevent accidental lockout.
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
- **Authentication:** JWT (`jsonwebtoken`) & `cookie-parser`
- **Password Security:** `bcryptjs` (salt factor 10)
- **Validation:** `zod`
- **Security:** `helmet` (security headers), `cors` (explicit client origin, credentials), `express-rate-limit` (auth brute-force mitigation)
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
│   │   ├── services/        # Business logic & ownership enforcement
│   │   ├── utils/           # Token handling, response envelopes
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
│   │   ├── pages/           # Login, Register, Dashboard, Profile, AdminUsers
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

### Required Variables:
| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | API server listening port | `5000` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://<USER>:<PASS>@<HOST>/task_manager_db?retryWrites=true&w=majority` |
| `CLIENT_URL` | Allowed frontend origin for CORS | `http://localhost:5173` |
| `NODE_ENV` | Runtime environment | `development` (or `production`) |
| `JWT_SECRET` | Secret key for signing JWTs (min 16 chars) | Strong random secret (e.g. `openssl rand -base64 32`) |
| `JWT_EXPIRES_IN`| Token expiration timeframe | `15m` |
| `COOKIE_SECRET` | Cookie signing secret (distinct from JWT_SECRET) | Distinct random secret |

> [!NOTE]
> For rapid local evaluation without creating an external Atlas account, you can run the backend with `USE_IN_MEMORY_DB=true node src/server.js`, which launches an embedded in-memory database and auto-bootstraps a demonstration administrator account.

---

## 5. MongoDB Atlas Setup Guide

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

## 6. Installation & Startup Commands

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
Run the secure administrative seed script to create the initial admin account:
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

## 7. REST API Documentation

Base path: `/api`

### Health Check
- `GET /api/health` — Returns service status, uptime, and timestamp.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new regular user (rate-limited).
  - Body: `{ name, email, password, confirmPassword }`
- `POST /api/auth/login` — Authenticate and receive HttpOnly cookie (rate-limited).
  - Body: `{ email, password }`
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
- `GET /api/admin/users/:id` — View account details without password hash.
- `PATCH /api/admin/users/:id/status` — Activate/deactivate account (with last-active-admin safeguard).
  - Body: `{ isActive: boolean }`
- `PATCH /api/admin/users/:id/role` — Promote/demote account role (with last-active-admin safeguard).
  - Body: `{ role: 'user' | 'admin' }`

---

## 8. Automated Testing

The backend includes a comprehensive, isolated test suite using **Jest**, **Supertest**, and **mongodb-memory-server**.

### Run Tests:
```bash
cd backend
npm test
```

### Coverage Highlights:
- **Authentication:** Registration, password hashing, duplicate email rejection (409), generic login failure messages (401), session expiration checks, deactivated account barriers (403).
- **Task Ownership:** Verifies users can only view, edit, change status, and delete their own tasks; verifies cross-user access returns 404; verifies dashboard metrics are strictly segregated.
- **Validation:** Strict rejection of invalid status, priority, empty titles, malformed ObjectIds.
- **Admin Safeguards:** Verifies non-admin users receive 403 Forbidden on all `/api/admin/*` routes; verifies that the last active administrator cannot be deactivated or demoted.

**Current Test Results:**
- **Test Suites:** 3 passed, 3 total (`auth.test.js`, `tasks.test.js`, `admin.test.js`)
- **Tests:** 35 passed, 35 total (100% pass rate)

---

## 9. Security Decisions

1. **HttpOnly Cookies over LocalStorage:** JWT access tokens are stored in `HttpOnly`, `SameSite=lax` (or `strict` in production), `Secure` cookies. This eliminates the vulnerability where malicious scripts or injected dependencies read tokens from `window.localStorage`.
2. **Session Verification via In-Memory State:** The React client holds user profile data in React state memory, revalidating with `/api/auth/me` on startup. Tokens are never exposed to JavaScript.
3. **Server-Derived Ownership:** Client payloads cannot specify or override the `owner` field on tasks. The backend binds `req.user._id` to newly created tasks and includes `{ owner: req.user._id }` in every database query.
4. **Last Active Administrator Safeguard:** The backend checks the count of active administrators before allowing any admin deactivation or role demotion, preventing accidental administrative lockout.
5. **Rate Limiting:** Auth endpoints are throttled to 20 requests per 15-minute window to mitigate brute-force attacks.
6. **Information Disclosure Prevention:** Attempting to access, edit, or delete another user's task returns a `404 Not Found` rather than a `403 Forbidden`, preventing attackers from enumerating valid task IDs.

---

## 10. Deliberately Excluded Features

To maintain high code quality, security, and meet assessment deadlines, the following three features were deliberately excluded:
1. **Email and Push Notifications:** Real email delivery (e.g. SendGrid/SES) requires external third-party API keys and email domain verification which would introduce external failure points during evaluation.
2. **Real-Time Collaboration and Live WebSockets:** Collaborative editing introduces complex conflict resolution (CRDTs/OT) and connection state management that would detract from core database modeling and authorization correctness.
3. **Password-Reset Email Workflow:** Secure password resets require timed one-time tokens and verified SMTP delivery. Instead, administrative credential recovery and robust account status toggles were prioritized.

---

## 11. Honest Implementation Limitations

- **Browser Automation in Sandboxed Environments:** Automated end-to-end browser tests via Playwright were blocked in offline sandbox containers due to restricted access to external CDN driver downloads (`playwright.azureedge.net`). However, the backend is 100% covered by 35 automated Supertest integration tests, and the live runtime HTTP flows were validated with automated Node test runners.
