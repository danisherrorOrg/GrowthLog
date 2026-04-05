### ✅ Fully Completed
*   **User profile page**: Built the full `Profile.js` dashboard complete with stats, milestones/badges, password changing, and a "Danger Zone" account deletion.
*   **Create a cache**: Added a dictionary-based fast layer caching system in `main.py` that refreshes upon saves to decrease database read loads.
*   **If user has create some category then along with default, show these user defined category also**: The master category fetch pulls everything organically, and user creations sit right next to default registrations.
*   **Allow deletion of Archive category**: Fully handled. The "Permanent Delete" modal securely destroys categories and all their downstream data.
*   **Day will reset at 12 am / Edit/Delete Logs**: This is fundamentally supported by the local timezone capturing (`date-fns`), and the brand new `AllLogs` log history page covers the Edit/Delete requests perfectly!
*   **Currently for the category, Goal they have only preview page...**: We isolated **Goals** (`/goals/:id`) and **Categories** (`/categories/:id`) into fully immersive focus pipelines with side-by-side data merging! (Snapshots and Manifestations have initial basic routing).

### 🟡 Partially Done (Needs more focus)
*   **Allow deletion of notes in goal/Manifestations**: Goal notes deletion logic is completely connected with the cross (X) toggle, but **Manifestations** note deletion is still pending.
*   **When creating a new task then user should select the already created category or create a new category**: Sub-tasks (Micro-Goals) don't pick categories as they defer to the parent Goal, but you *do* select categories for the parent goal itself. Furthermore, we built intelligent category template picking in the creation modal.
*   **I want to remove hardcoding as much we can**: Ongoing. We've dynamicized prompts and badge loops, but color palettes and icons are still hardcoded lists.

### 🔴 Not Started / Still Left to Do
*   **In the login/signup page need to add sections that will tell user what is the page**: The auth pages remain simple generic forms. No graphics or instructional benefits copy has been added yet. 
*   **Create more graph**: While we implemented some metric counters and simple bar displays, we have not fully integrated robust line-graph/pie-chart charting elements (via `Recharts`).
*   **Allow user to validate their email**: Right now, Profile.js only *imitates* verifying an email. No actual SMTP mailing server hits the backend yet.
*   **Compare snapshot not working**: No fixes have been applied to Snapshots logic.
*   **Allow user to choose custom or predefined "Type" in adding progress in Manifestations**: No customizations added to Manifestation progress flows.
*   **Allow user to edit/delete the progress in a Manifestations**: No Edit/Delete capabilities added to Manifestation flows.

---

## 🎯 Proposed Roadmap (Next Steps)

Based on the newly added ideas and the remaining incomplete features, here is a structured pathway for what we should implement next, ordered from highest UI impact to deep architectural shifts.

### Sprint 1: Finishing Core Modules (Manifestations & Snapshots)
Before adding massive structural changes, we must solidify the core logging components.
- [ ] Fix the **Compare Snapshot** functionality.
- [ ] Add ability to choose custom predefined "Type" options when updating **Manifestations**.
- [ ] Build Edit/Delete pipelines for **Manifestations** progress entries.
- [ ] Allow deletion of notes inside Manifestations.

### Sprint 2: Profile & Social Extensions
Enhancing the user experience with profile management and social gamification.
- [ ] **Change Email**: Allow users to securely update their account email from the Profile Dashboard.
- [ ] **Public Stats Sharing**: Generate a public, shareable URL for user profiles so friends can view and compare their Milestone Badges, Streaks, and Total Logs (without exposing private text entries).
- [ ] **Login/Landing Page Marketing**: Revamp the Login/Signup screens with graphics, descriptions, and feature highlights to tell the user how to get the most benefits out of the app.

### Sprint 3: Advanced Logging Customization
Deepening the toolkit for dedicated logging users.
- [ ] **Custom Category Templates**: Allow users to build and save their *own* reusable templates, extending the default (Mind, Body, Career) ones.
- [ ] **Time Tracking System**: Add time parameters (minutes/hours) to Micro-goals and Daily Logs so users can visualize exactly how much time of their day is dedicated to specific life categories.
- [ ] **Advanced Graphing**: Inject Recharts visualizations onto the Dashboard to plot time spent and rating trends over time.

### Sprint 4: Architectural Evolution (BYOD)
Complex scale capabilities for the monolith.
- [ ] **Real Email Validation Servers**: Connect genuine SMTP logic to valid user emails.
- [ ] **Bring Your Own Database (BYOD)**: Engineer a headless mode wherein a user can supply their own MongoDB Connection URI and JWT Secret via local storage/HTTPS headers. The server will process logic but pipe all documents straight into the user's private cluster.