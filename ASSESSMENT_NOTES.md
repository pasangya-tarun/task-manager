# Video Explanation & Assessment Walkthrough Notes

> **Assessment:** Task Manager — Full MERN Stack Assessment  
> **Target Presentation Time:** 2 – 3 Minutes  
> **Format:** Concise, engineer-focused talking points reflecting the exact implementation.

---

## 1. Three Core Implementation Decisions (Talking Points)

### Decision 1: Clean Separation of Concerns Across the MERN Stack
- **Backend Layering:** Distinct separation between HTTP transport (`routes` & `controllers`), business logic (`services`), database schemas (`models`), and cross-cutting concerns (`middleware`). Controllers only orchestrate HTTP requests and format responses; services encapsulate all database queries and validation rules.
- **Frontend Modularity:** Dedicated API service layer (`api.js`, `taskService.js`, `authService.js`, etc.) using an Axios instance with `withCredentials: true`. Components never make ad-hoc fetch requests.
- **Data Encapsulation:** Mongoose schemas enforce compound indexing, automatic timestamps, and safe `toJSON` serialization ensuring sensitive fields like `passwordHash` are never leaked.

### Decision 2: Zero-Trust Security, HttpOnly Cookies, and Server-Side Ownership
- **HttpOnly Cookie Authentication:** JWT access tokens are stored in `HttpOnly`, `SameSite`, and `Secure` cookies. No JWTs or sensitive credentials are ever placed in browser `localStorage`, eliminating the primary attack vector for token theft via XSS.
- **Server-Derived Ownership:** When creating, updating, or deleting tasks, the client payload is never trusted for ownership. The server derives the owner directly from `req.user._id` and queries MongoDB using `{ _id: taskId, owner: req.user._id }`.
- **404 Instead of 403 on Cross-User Queries:** Attempting to access or mutate another user's task returns a `404 Not Found` rather than a `403 Forbidden`, preventing malicious users from probing or enumerating valid task IDs.
- **Last Active Administrator Safeguard:** The admin service counts active administrators prior to any deactivation or demotion, preventing accidental administrative lockout.

### Decision 3: Cryptographic Email OTP Verification & Account Integrity
- **Zero-Session Registration:** New registrations create accounts with `isEmailVerified: false`. No JWT or session cookies are issued prior to OTP verification.
- **Crypto-Secure Hashing & Storage:** 6-digit numeric OTPs are generated using Node.js `crypto.randomInt()`. Only a SHA-256 hash is saved to MongoDB with a 10-minute expiry; raw OTPs are never stored in the database or written to logs.
- **Timing-Safe & Replay-Protected:** Verification uses `crypto.timingSafeEqual()` to prevent timing side-channel attacks and an atomic `findOneAndUpdate` with concurrency guard (`isEmailVerified: false, emailOtpHash: hash`) to prevent replay attacks and race conditions.
- **Abuse Prevention:** Resend requests enforce a 60-second cooldown (`429 Too Many Requests`), verification locks after 5 failed attempts, and generic resend responses protect against account enumeration.

### Decision 4: Focused Scope & Defensive Zod Validation
- **Strict Boundary Validation:** Zod schemas validate request parameters, query filters, and request bodies before reaching controller logic. Malformed ObjectIds, invalid status values, malformed 6-digit OTPs, and unrecognized parameters fail immediately with clear 400 responses.
- **Defensive Query Construction:** Sort fields and sort directions are explicitly allowlisted, and search strings are regex-escaped to prevent ReDoS (Regular Expression Denial of Service).

---

## 2. Three Features Deliberately Not Implemented & Rationale

1. **Push Notifications / SMS Gateways:** SMS delivery requires external telecommunication gateways (Twilio/AWS SNS) with paid phone number verification. Email verification was implemented cleanly via Nodemailer and standard SMTP.
2. **Real-time WebSockets / Live Collaboration:** Multi-user concurrent editing requires operational transformation or CRDTs. For a focused task manager, robust database indexing, polling/re-fetching, and cache invalidation provide a more reliable and resilient architecture.
3. **Password Reset via Email Link:** Generating temporary password-reset tokens sent via email depends on additional token expiration lifecycles. Prioritized completing registration OTP verification, administrative password resets, and account status toggles to maintain a robust, fully tested deliverable.

---

## 3. One Honest Limitation (With One Additional Day)

- **Automated Frontend E2E Test Suite (Cypress / Playwright):**
  - *Current state:* Backend has 100% automated test coverage (46 passed Jest/Supertest integration tests covering OTP verification, auth, tasks, and admin controls), and the live runtime HTTP flows were validated via automated Node test runners.
  - *With one additional day:* I would configure local Headless Chromium integration tests within the repository container to automate browser UI assertions alongside the backend tests.

---

## 4. Short Demonstration Sequence (2-Minute Demo Script)

| Step | Action | What to Highlight on Screen |
| :--- | :--- | :--- |
| **1. Registration & Email OTP Flow** | Navigate to `/register`, enter name, email, password. Submit. | Show immediate redirect to `/verify-email`. Show that no JWT cookie was issued yet (inspect Cookies tab). Highlight the 6-digit numeric input with auto-advance and the 60-second resend cooldown timer. |
| **2. OTP Verification & Login Barrier** | Try to log in at `/login` before verifying email. Then verify with 6-digit OTP. | Show the 403 `EMAIL_NOT_VERIFIED` notification redirecting back to verification. Enter the valid OTP, show success alert, and transition to `/login`. |
| **3. Authenticated Session & Dashboard** | Log in with the newly verified account. | Show automatic redirect to `/dashboard`. Highlight that JWT is set in an HttpOnly cookie (inspect Cookies tab — no token in `localStorage`). Notice the user role badge `user` in the navbar. |
| **4. Task Creation & Live Stats** | Click `+ New Task`, create a high-priority task with a due date. Submit. | Show the task appearing with a distinct badge. Note that Dashboard Summary cards immediately increment `Total Tasks` and `In Progress`. |
| **5. Inline Status Transition** | Change status from `In Progress` to `Completed` via the card dropdown. | Point out optimistic update, success toast notification, and stats card updating to `Completed: 1`. |
| **6. Filter & Search** | Type in the search box, filter by priority `high`, and sort by date. Click `Reset Filters`. | Demonstrate combined filters and instantaneous filtering. |
| **7. Profile Management** | Navigate to `/profile`. Update user full name. | Show that only permitted fields can be updated; email, role, and active status are read-only and secured. |
| **8. Ownership Isolation** | Log out, register and verify a second user (`User B`). | Dashboard for User B is completely blank (Total: 0). User A's tasks are completely isolated and inaccessible. |
| **9. Admin User Management** | Log out, log in with admin account (`admin@taskmanager.local`). | Point out the `User Management` navigation tab visible only to administrators. Open the page to view the paginated user table, toggle an account's active status, and demonstrate the last-admin protection. |
