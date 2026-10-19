import { format, parseISO } from 'date-fns';

// Builds the "Markdown Journal" export from the /export/all payload.
export function buildMarkdownExport(data) {
  const formatSafeDate = (dateStr, fmt) => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), fmt);
    } catch {
      return dateStr;
    }
  };

  const categories = data.categories || [];
  const categoryMap = {};
  categories.forEach(c => {
    categoryMap[c.id || c._id] = c;
  });

  const getCatName = (catId) => {
    const cat = categoryMap[catId];
    return cat ? `${cat.icon} ${cat.name}` : 'General';
  };

  let md = '';

  // Header & Profile Section
  const profile = data.profile || {};
  md += `# GrowthLog Journal: ${profile.name || 'User'}\n\n`;
  md += `- **Email:** ${profile.email || 'N/A'}\n`;
  md += `- **Current Streak:** ${profile.streak || 0} days (Best: ${profile.longest_streak || 0} days)\n`;
  md += `- **Timezone:** ${profile.timezone || 'UTC'}\n`;
  md += `- **Bio:** ${profile.bio || 'No bio set.'}\n`;
  if (profile.created_at) {
    md += `- **Member Since:** ${formatSafeDate(profile.created_at, 'MMMM d, yyyy')}\n`;
  }
  md += `- **Export Date:** ${format(new Date(), 'MMMM d, yyyy')}\n\n`;
  md += `---\n\n`;

  // Goals Section
  md += `## 🎯 Goals Tracker\n\n`;
  const goals = data.goals || [];
  if (goals.length === 0) {
    md += `*No goals recorded yet.*\n\n`;
  } else {
    const activeGoals = goals.filter(g => ['active', 'extended'].includes(g.status));
    const completedGoals = goals.filter(g => g.status === 'completed');
    const otherGoals = goals.filter(g => !['active', 'extended', 'completed'].includes(g.status));

    if (activeGoals.length > 0) {
      md += `### 🟢 Active Goals\n\n`;
      activeGoals.forEach(g => {
        md += `- [ ] **${g.title}** (Category: ${getCatName(g.category_id)} · Due: ${formatSafeDate(g.current_deadline, 'MMM d, yyyy')})\n`;
        if (g.description) {
          md += `  > ${g.description.split('\n').join('\n  > ')}\n`;
        }
        if (g.micro_goals && g.micro_goals.length > 0) {
          md += `  * **Steps:**\n`;
          g.micro_goals.forEach(mg => {
            const estTime = mg.time_spent ? ` (${mg.time_spent} min)` : '';
            md += `    - [${mg.completed ? 'x' : ' '}] ${mg.text}${estTime}\n`;
          });
        }
        if (g.notes && g.notes.length > 0) {
          md += `  * **Field Notes:**\n`;
          g.notes.forEach(n => {
            md += `    - *${formatSafeDate(n.date, 'MMM d, yyyy · p')}:* ${n.text}\n`;
          });
        }
        if (g.reflections && g.reflections.length > 0) {
          md += `  * **Evolution Track:**\n`;
          g.reflections.forEach(r => {
            const statusChange = r.status_change ? ` [${r.status_change}]` : '';
            md += `    - *${formatSafeDate(r.date, 'MMM d, yyyy')}${statusChange}:* ${r.text}\n`;
          });
        }
        md += `\n`;
      });
    }

    if (completedGoals.length > 0) {
      md += `### ✅ Completed Goals\n\n`;
      completedGoals.forEach(g => {
        md += `- [x] **${g.title}** (Category: ${getCatName(g.category_id)} · Completed: ${formatSafeDate(g.current_deadline, 'MMM d, yyyy')})\n`;
        if (g.reflection) {
          md += `  > *Reflection:* ${g.reflection}\n`;
        }
        md += `\n`;
      });
    }

    if (otherGoals.length > 0) {
      md += `### 🔘 Other Goals\n\n`;
      otherGoals.forEach(g => {
        md += `- [ ] ~~**${g.title}**~~ (${g.status})\n`;
        if (g.reflection) {
          md += `  > *Outcome:* ${g.reflection}\n`;
        }
        md += `\n`;
      });
    }
  }
  md += `---\n\n`;

  // Daily Journal Logs Section
  md += `## ✦ Daily Journal Logs\n\n`;
  const logs = data.daily_logs || [];
  if (logs.length === 0) {
    md += `*No daily logs recorded yet.*\n\n`;
  } else {
    const sortedLogs = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    sortedLogs.forEach(log => {
      md += `### ${formatSafeDate(log.date, 'EEEE, MMMM d, yyyy')}\n\n`;
      md += `- **Overall Rating:** ${log.overall_rating ? `${log.overall_rating}/10` : 'N/A'}\n`;
      if (log.highlight) {
        md += `- **The Day's Peak:** ${log.highlight}\n`;
      }
      if (log.gratitude && log.gratitude.some(g => g && g.trim())) {
        md += `- **Gratitude:**\n`;
        log.gratitude.filter(g => g && g.trim()).forEach((g, idx) => {
          md += `  ${idx + 1}. ${g}\n`;
        });
      }
      if (log.regret) {
        md += `- **Regret & Insight:** ${log.regret}\n`;
      }

      const entries = log.entries || [];
      if (entries.length > 0) {
        md += `\n#### Dimensions:\n`;
        entries.forEach(e => {
          md += `- **${getCatName(e.category_id)}**\n`;
          md += `  - Mood: ${e.mood || 'N/A'}/10 · Energy: ${e.energy || 'N/A'}/10 · Time Spent: ${e.time_spent || 0}m\n`;
          if (e.emotions && e.emotions.length > 0) {
            md += `  - Emotions: *${e.emotions.join(', ')}*\n`;
          }
          if (e.text) {
            md += `  - Notes: ${e.text.split('\n').join('\n    ')}\n`;
          }
        });
      }
      md += `\n---\n\n`;
    });
  }

  // Todos Section
  md += `## ☑ To-Dos Checklist\n\n`;
  const todos = data.todos || [];
  if (todos.length === 0) {
    md += `*No to-dos recorded yet.*\n\n`;
  } else {
    const activeTodos = todos.filter(t => t.status === 'pending');
    const completedTodos = todos.filter(t => t.status === 'done');

    if (activeTodos.length > 0) {
      md += `### 🔴 Pending To-Dos\n\n`;
      activeTodos.forEach(t => {
        const dueStr = t.due_date ? ` · Due: ${formatSafeDate(t.due_date, 'MMM d, yyyy')}` : '';
        const estStr = t.estimated_minutes ? ` (Est: ${t.estimated_minutes}m)` : '';
        const prioStr = t.priority ? ` [Priority: ${t.priority.toUpperCase()}]` : '';
        md += `- [ ] **${t.title}**${prioStr}${estStr}${dueStr}\n`;
        if (t.description) {
          md += `  > ${t.description.split('\n').join('\n  > ')}\n`;
        }
      });
      md += `\n`;
    }

    if (completedTodos.length > 0) {
      md += `### ✅ Completed To-Dos\n\n`;
      completedTodos.forEach(t => {
        const compStr = t.completed_at ? ` · Completed: ${formatSafeDate(t.completed_at, 'MMM d, yyyy')}` : '';
        const actStr = t.actual_minutes ? ` (Took: ${t.actual_minutes}m)` : '';
        md += `- [x] **${t.title}**${actStr}${compStr}\n`;
      });
      md += `\n`;
    }
  }

  return md;
}
