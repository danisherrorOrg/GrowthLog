// Badge definitions with progress metadata
export const BADGES = [
  {
    label: 'First Step',
    desc: 'Log your first day',
    icon: '🌱',
    check: (s) => s.total_logs >= 1,
    progress: (s) => ({ current: Math.min(s.total_logs, 1), total: 1, unit: 'day logged' }),
  },
  {
    label: 'Consistency Builder',
    desc: 'Reach a 7-day streak',
    icon: '🔥',
    check: (s) => s.longest_streak >= 7,
    progress: (s) => ({ current: Math.min(s.longest_streak, 7), total: 7, unit: 'streak days' }),
  },
  {
    label: 'Habit Master',
    desc: 'Reach a 30-day streak',
    icon: '💎',
    check: (s) => s.longest_streak >= 30,
    progress: (s) => ({ current: Math.min(s.longest_streak, 30), total: 30, unit: 'streak days' }),
  },
  {
    label: 'Goal Getter',
    desc: 'Complete a single goal',
    icon: '🎯',
    check: (s) => s.completed_goals >= 1,
    progress: (s) => ({ current: Math.min(s.completed_goals, 1), total: 1, unit: 'goal' }),
  },
  {
    label: 'Architect',
    desc: 'Complete 10 goals',
    icon: '🏗️',
    check: (s) => s.completed_goals >= 10,
    progress: (s) => ({ current: Math.min(s.completed_goals, 10), total: 10, unit: 'goals' }),
  },
  {
    label: 'Visionary',
    desc: 'Manifest a vision',
    icon: '✨',
    check: (s) => s.completed_manifestations >= 1,
    progress: (s) => ({ current: Math.min(s.completed_manifestations, 1), total: 1, unit: 'vision' }),
  },
  {
    label: 'Reflector',
    desc: 'Take 3 snapshots',
    icon: '📸',
    check: (s) => s.total_snapshots >= 3,
    progress: (s) => ({ current: Math.min(s.total_snapshots, 3), total: 3, unit: 'snapshots' }),
  },
  {
    label: 'Dedicated',
    desc: 'Log 100 days total',
    icon: '🌟',
    check: (s) => s.total_logs >= 100,
    progress: (s) => ({ current: Math.min(s.total_logs, 100), total: 100, unit: 'days' }),
  },
];
