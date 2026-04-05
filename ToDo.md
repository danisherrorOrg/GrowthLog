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

Essentially, **the core logging, category structuring, and goal tracking functionalities are completely finished!** 

The things left remaining mostly revolve around fleshing out **Manifestations** and **Snapshots**, injecting real **email validation servers**, inserting **graph visualizations**, and building up your **Auth/Landing page marketing**.


Next things to do:
---
- Allow user to enter their own mongodb and JWT secret, so that they can use their own data instead of using my database (but still use my server for processing).
- Allow user to change email.
- Allow user to share their profile and it's stats (not any other data) so that friends can compare their stats.
- Allow user to create their own custom categories template.