# Validation & Testing Plan

Before pushing these fixes to the `main` branch, please run through the following manual Verification Test Cases (TC) to ensure the changes are stable and haven't introduced regressions. 

## 1. Authentication & UI Modals

### TC-01: UI Authentication Errors (Bug #18)
- **Action**: Attempt to log in with an incorrect email and password. Try to register with an invalid email format.
- **Expected**: The error toast should display human-readable messages (e.g., "Invalid credentials" or cleanly formatted validation errors) instead of raw `[object Object]` or unparsed JSON strings.

### TC-02: Keyboard Shortcuts Isolation (Bug #21)
- **Action**: From the dashboard, log an entry to trigger a `ConfirmModal` (or trigger any destructive action like deleting a log). While the modal is open, press keyboard navigation shortcuts (e.g., `D` for dashboard, `L` for Log).
- **Expected**: No navigation should occur while the modal remains on screen. 
- **Action**: Press the `Escape` key while the modal is open.
- **Expected**: The modal should close smoothly.

## 2. Backend & Performance Enhancements

### TC-03: Cache Key Invalidation (Bug #20)
- **Action**: Perform an action mathematically tied to the dashboard (e.g., submit a new Daily Log, or complete a Goal).
- **Expected**: The dashboard statistics should immediately reflect the new data without requiring a manual page refresh. This ensures the indexed `prefix` invalidation is correctly purging the old cache.

### TC-04: Streak Calculation Pagination (Bug #22)
- **Action**: Log an entry for today. Navigate to your Profile/Growth section to view your current streak.
- **Expected**: The streak count should increment logically. If you have any gaps in recent days, the streak should correctly restart.

### TC-05: Sentiment Analysis Accuracy (Bug #24)
- **Action**: Write a new Daily Log entry using complex sentences like "I was really overwhelmed today but reading a book helped me feel calm, though I am absolutely exhausted."
- **Expected**: VADER should classify the nuanced sentiment properly without aggressively defaulting to "Neutral". 

## 3. Security & Infrastructure

### TC-06: Endpoint Privacy Leak (Bug #19)
- **Action**: Fetch the public profile URL for a private user (e.g., your own profile if set to private) via the browser or Postman (`/auth/public/u/{user_id}`).
- **Expected**: The response must be `404 Not Found` with the detail "User not found".
- **Action**: Fetch with a randomly generated invalid MongoDB ObjectId.
- **Expected**: The response must exactly match the `404 Not Found` above.

### TC-07: Correlation ID Middleware (Bug #25)
- **Action**: Open the Network tab in your browser's Developer Tools and submit a GET request (e.g., navigating to the Dashboard). Click on the network request and inspect the **Response Headers**.
- **Expected**: You should see an `x-request-id` header populated with a standard UUID string. Let's also check backend terminal logs on any 500 error to see if it catches the trace.

### TC-08: FastAPI Lifespan & Timeline Mount (Bug #28 & #29)
- **Action**: Restart your Uvicorn backend server (`Ctrl+C` and `python3 -m uvicorn main:app --reload`).
- **Expected**: The server should start cleanly. There should be NO deprecation warnings regarding `@app.on_event("startup")` in the console. 
- **Action**: Hit any `/timeline` endpoint in your frontend/API to ensure the router correctly mounts alongside all others.
