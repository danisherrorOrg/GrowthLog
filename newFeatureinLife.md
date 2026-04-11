## 2. Health & Body
 
| Feature | Description | Tag |
|---|---|---|
| Sleep tracker and nap log| Bedtime, wake time, quality rating, notes | `core` |
| Exercise log | Type, duration, intensity — gym, run, yoga etc. | `core` |
| Workout splits | Track muscle groups trained across the week | `power` |
| Water & nutrition | Water intake and general eating quality score | `core` |
| Calorie tracking | Optional calorie and macro logging per meal | `power` |
 
## 2. Finance
 
| Feature | Description | Tag |
|---|---|---|
| Daily spending | Quick expense log with category tags | `core` |
| Income tracking | Log salary, freelance, passive income streams | `core` |
| Budget vs actual | Set monthly budgets and track against them | `power` |
| Subscription tracker | All recurring payments and renewal dates | `power` |
| Impulse buy log | Things you almost bought — helps identify patterns | `insight` |
| Side income tracker | Freelance, gigs, selling — separate from main income | `power` |


---
 
## 16. Insights & Analytics
 
| Feature | Description | Tag |
|---|---|---|
| Trend charts | Mood, sleep, energy, spending over weeks/months | `insight` [DONE] |
| Life score | Composite weekly score across all life areas | `insight` |
| Correlation finder | See if sleep affects mood, exercise affects energy etc. | `insight` |
| Year in review | Auto-generated annual life summary with highlights | `insight` |
| Streak calendar | GitHub-style heatmap for habits and logging | `insight` |
| Time pie chart | How your hours split across life areas weekly | `insight` [DONE] |
| Best days analysis | What do your highest-rated days have in common? | `insight` |
| Worst days analysis | Patterns behind your lowest-rated days | `insight` |
| Rolling averages | 7-day and 30-day averages for key metrics | `advanced` |
| Predictive alerts | Flags when patterns suggest burnout or low mood ahead | `advanced` |
| Personal benchmarks | Your own historical bests as targets to beat | `insight` |
| Export & backup | Download all your data as CSV or JSON | `core` |
| AI life coach | Ask questions about your own data in natural language | `advanced` |
| Life area radar chart | Spider/radar chart showing balance across 8 life areas | `insight` [DONE] |
| Happiness drivers report | Which activities, people, and habits correlate with high mood | `advanced` |
| Monthly word cloud | Most-used words in your journal entries | `insight` |
| Life statistics page | Total books read, km run, hours slept, days logged | `insight` [DONE] |
| Anomaly detection | Flags unusual days that deviate from your baseline | `advanced` |
| Sentiment analysis | Auto-score emotional tone of your journal entries | `advanced` |
| Decade summary | What a decade of your life looked like at a glance | `advanced` |
 
---
 
## 17. System & UX Features
 
| Feature | Description | Tag |
|---|---|---|
| Dark mode | Easy on the eyes for evening use | `core` [DONE] |
| End-to-end encryption | Your data is private and secure | `core` |
| Shareable reports | Export a week or month as a shareable summary | `power` |

---

## Next Roadmap — GrowthLog v2.3

### Phase 1: Retention Foundation (Next 2 Weeks)
- **Real SMTP & Email Templates**: Replace placeholder emails with production-ready SendGrid/Resend service.
- **Weekly AI Growth Letter**: Generate personalized Sunday summaries of wins, patterns, and failed goals.
- **Pattern Detection Engine**: MongoDB aggregation pipelines to correlate Day-of-Week, Category, and Mood.

### Phase 2: Frictionless Daily Habits
- **Voice-to-Log**: Web Speech API to transcribe and auto-fill categories/mood.
- **Quick-Log Floating Widget**: Global floating action button for 15-second "mood/highlight" entries.
- **PWA + Offline Mode**: IndexedDB sync for logging without internet access.

### Phase 3: AI Depth & Emotional Engagement
- **AI Future-Self Coach**: Chat interface providing context-aware advice based on last 30 days of logs.
- **Nostalgia Memory Feed**: "On This Day" cards showing entries from past years.
- **Natural Language Logging**: LLMs to auto-categorize free-text entries into quantifiable data.
 
---
 

### 🟠 High Priority (Core & Insight)
*   **Daily Logging**: Voice memo log, Location log, Regret log.
*   **Health & Body**: Sleep tracker (bedtime/quality), Exercise log (workout splits/PRs), Water & Nutrition (calorie/meal log).
*   **Time & Productivity**: Screen time tracking, Time audits, Procrastination log.
*   **Intelligence**: **Streak Calendar (GitHub-style heatmap)**, Life Score, Correlation Finder.

### 🟡 Medium Priority (Power & Advanced)
*   **Learning**: Skills tracker, Courses repository, Failure log.
*   **Finance**: Daily spending, Income tracking, Subscription manager.
*   **Creativity**: Project ideas backlog, Creative session logs.
*   **Long-term**: Decade goals, Advice to/from future self, Life lessons list.

### 🤖 AI-Specific (From the v2.3 Roadmap)
*   **Weekly AI Growth Letter**: Personalized Sunday summaries.
*   **Pattern Detection Engine**: Auto-correlating mood with activities.
*   **AI Future-Self Coach**: Context-aware chat interface.

**Recommendation**: If you want to see a major visual improvement, we should implement the **Streak Calendar (Heatmap)**. If you want more functionality, we should start the **Finance Module**.

**What would you like to build first?**