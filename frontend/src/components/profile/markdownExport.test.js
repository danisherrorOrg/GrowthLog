import { buildMarkdownExport } from './markdownExport';

test('builds the journal with goals, logs and to-dos', () => {
  const md = buildMarkdownExport({
    profile: { name: 'Sam', email: 'sam@example.com', streak: 3, longest_streak: 5 },
    categories: [{ id: 'c1', icon: '💼', name: 'Career' }],
    goals: [
      { title: 'Ship v2', status: 'active', category_id: 'c1', current_deadline: '2026-11-01', micro_goals: [{ text: 'Plan', completed: true }] },
      { title: 'Run 5k', status: 'completed', current_deadline: '2026-09-01' },
    ],
    daily_logs: [{ date: '2026-10-19', overall_rating: 8, highlight: 'Good day', entries: [{ category_id: 'c1', mood: 7, energy: 6, time_spent: 90 }] }],
    todos: [{ title: 'Write tests', status: 'pending', priority: 'high' }, { title: 'Refactor', status: 'done', actual_minutes: 40 }],
  });

  expect(md).toContain('# GrowthLog Journal: Sam');
  expect(md).toContain('- [ ] **Ship v2** (Category: 💼 Career · Due: Nov 1, 2026)');
  expect(md).toContain('    - [x] Plan');
  expect(md).toContain('- [x] **Run 5k** (Category: General');
  expect(md).toContain('### Monday, October 19, 2026');
  expect(md).toContain('- **💼 Career**');
  expect(md).toContain('- [ ] **Write tests** [Priority: HIGH]');
  expect(md).toContain('- [x] **Refactor** (Took: 40m)');
});

test('says when sections are empty', () => {
  const md = buildMarkdownExport({});
  expect(md).toContain('*No goals recorded yet.*');
  expect(md).toContain('*No daily logs recorded yet.*');
  expect(md).toContain('*No to-dos recorded yet.*');
});
