import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ─── Design tokens ────────────────────────────────────────────────
const C = {
  ink: [13, 13, 13],
  paper: [253, 252, 249],
  sage: [107, 140, 107],
  gold: [201, 168, 76],
  rust: [180, 80, 60],
  mist: [242, 241, 237],
  grey: [120, 120, 120],
  lightGrey: [220, 218, 213],
  white: [255, 255, 255],
};

const PW = 210; // A4 width mm
const PH = 297; // A4 height mm
const ML = 18;  // margin left
const MR = 18;  // margin right
const CW = PW - ML - MR; // content width

// ─── Helpers ──────────────────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function setFill(doc, rgb) { doc.setFillColor(...rgb); }
function setDraw(doc, rgb) { doc.setDrawColor(...rgb); }
function setTextColor(doc, rgb) { doc.setTextColor(...rgb); }

function rect(doc, x, y, w, h, rgb, style = 'F') {
  setFill(doc, rgb);
  doc.rect(x, y, w, h, style);
}

function text(doc, str, x, y, opts = {}) {
  doc.text(String(str ?? ''), x, y, opts);
}

function addHeader(doc, pageNum, totalPages, userName) {
  // Top rule
  rect(doc, 0, 0, PW, 1.5, C.sage);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, C.grey);
  text(doc, 'GrowthLog — Personal Growth Report', ML, 8);
  text(doc, `${userName}  •  Page ${pageNum} of ${totalPages}`, PW - MR, 8, { align: 'right' });
  rect(doc, ML, 10.5, CW, 0.3, C.lightGrey);
}

function addFooter(doc, generatedAt) {
  rect(doc, ML, PH - 12, CW, 0.3, C.lightGrey);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, C.grey);
  text(doc, `Generated on ${generatedAt}  •  GrowthLog`, ML, PH - 7);
  text(doc, 'Your data, your story.', PW - MR, PH - 7, { align: 'right' });
}

function newPage(doc, pageNum, totalPages, userName, generatedAt) {
  doc.addPage();
  addHeader(doc, pageNum, totalPages, userName);
  addFooter(doc, generatedAt);
}

// Draw a horizontal bar (progress)
function drawBar(doc, x, y, w, h, pct, fillRgb, bgRgb = C.lightGrey) {
  rect(doc, x, y, w, h, bgRgb);
  if (pct > 0) rect(doc, x, y, w * Math.min(pct, 1), h, fillRgb);
}

// Draw a mini bar chart inline
function drawBarChart(doc, x, y, w, h, data, maxVal, barColor) {
  const gap = 1.5;
  const n = data.length;
  const barW = (w - gap * (n - 1)) / n;
  data.forEach((val, i) => {
    const bh = maxVal > 0 ? (val / maxVal) * h : 0;
    const bx = x + i * (barW + gap);
    const by = y + h - bh;
    rect(doc, bx, by, barW, bh || 0.5, bh > 0 ? barColor : C.lightGrey);
  });
}

// Section title
function sectionTitle(doc, title, y, icon = '') {
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  setTextColor(doc, C.sage);
  text(doc, `${icon}  ${title}`.trim(), ML, y);
  rect(doc, ML, y + 2, CW, 0.4, C.sage);
  return y + 8;
}

// ─── Stat card row ─────────────────────────────────────────────────
function statCard(doc, x, y, w, h, label, value, accent) {
  rect(doc, x, y, w, h, C.mist);
  rect(doc, x, y, 2, h, accent);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  setTextColor(doc, accent);
  text(doc, String(value ?? 0), x + 6, y + h / 2 + 3);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, C.grey);
  text(doc, label, x + 6, y + h / 2 + 8.5);
}

// ─── Main export function ──────────────────────────────────────────
export async function generateGrowthLogPDF({ user, stats, sparklineData, goals, logs, categories }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const generatedAt = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const userName = user?.name || 'User';
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Recently';

  const TOTAL_PAGES = 4;

  // ─── PAGE 1: Cover ────────────────────────────────────────────
  // Dark hero band
  rect(doc, 0, 0, PW, 100, C.ink);

  // Accent stripe
  rect(doc, 0, 98, PW, 3, C.sage);

  // GrowthLog wordmark
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setTextColor(doc, C.sage);
  text(doc, 'GROWTHLOG', ML, 22);

  // Report type pill
  rect(doc, PW - MR - 42, 15, 42, 8, C.sage);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  setTextColor(doc, C.white);
  text(doc, 'PERSONAL GROWTH REPORT', PW - MR - 21, 20.5, { align: 'center' });

  // Avatar emoji area
  doc.setFontSize(38);
  setTextColor(doc, C.white);
  text(doc, user?.avatar_emoji || '🌱', ML, 58);

  // Name
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  setTextColor(doc, C.white);
  text(doc, userName, ML, 72);

  // Subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, [...C.sage]);
  text(doc, `Member since ${memberSince}`, ML, 81);

  // Three hero stats
  const heroStats = [
    { label: 'Day Streak', val: user?.streak || 0, color: C.gold },
    { label: 'Days Logged', val: stats?.total_logs || 0, color: C.sage },
    { label: 'Goals Completed', val: stats?.completed_goals || 0, color: C.sage },
  ];
  const cardW = CW / 3 - 3;
  heroStats.forEach((s, i) => {
    const cx = ML + i * (cardW + 4.5);
    rect(doc, cx, 108, cardW, 30, C.mist);
    rect(doc, cx, 108, cardW, 1.5, s.color);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    setTextColor(doc, s.color);
    text(doc, String(s.val), cx + cardW / 2, 124, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    setTextColor(doc, C.grey);
    text(doc, s.label.toUpperCase(), cx + cardW / 2, 131, { align: 'center' });
  });

  // Quote
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  setTextColor(doc, C.sage);
  const quote = '"The secret of getting ahead is getting started."';
  text(doc, quote, PW / 2, 158, { align: 'center' });

  // Generated date bottom
  rect(doc, 0, PH - 18, PW, 18, C.ink);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, C.grey);
  text(doc, `Generated ${generatedAt}`, PW / 2, PH - 8, { align: 'center' });

  addFooter(doc, generatedAt);

  // ─── PAGE 2: Stats Overview + Activity Chart ──────────────────
  newPage(doc, 2, TOTAL_PAGES, userName, generatedAt);
  let y = 20;

  y = sectionTitle(doc, 'Growth at a Glance', y, '✦');

  // 6 stat cards in 3 cols
  const statsGrid = [
    { label: 'Total Days Logged', val: stats?.total_logs || 0, accent: C.sage },
    { label: 'Goals Created', val: stats?.total_goals || 0, accent: C.ink },
    { label: 'Goals Completed', val: stats?.completed_goals || 0, accent: C.gold },
    { label: 'Best Streak (days)', val: stats?.longest_streak || 0, accent: C.gold },
    { label: 'Manifestations', val: stats?.total_manifestations || 0, accent: C.ink },
    { label: 'Snapshots Taken', val: stats?.total_snapshots || 0, accent: C.sage },
  ];
  const scW = CW / 3 - 2;
  const scH = 22;
  statsGrid.forEach((s, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    statCard(doc, ML + col * (scW + 3), y + row * (scH + 3), scW, scH, s.label, s.val, s.accent);
  });
  y += 2 * (scH + 3) + 8;

  // Goal completion bar
  const completionRate = stats?.total_goals > 0
    ? Math.round((stats.completed_goals / stats.total_goals) * 100) : 0;

  rect(doc, ML, y, CW, 18, C.ink);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setTextColor(doc, C.white);
  text(doc, `Goal Completion Rate: ${completionRate}%`, ML + 5, y + 7);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, C.grey);
  text(doc, `${stats?.completed_goals || 0} of ${stats?.total_goals || 0} goals achieved`, ML + 5, y + 13);
  drawBar(doc, ML + CW - 62, y + 6, 58, 5, completionRate / 100, C.gold);
  y += 24;

  // Activity sparkline chart
  y = sectionTitle(doc, '12-Week Activity Overview', y, '◇');
  const chartH = 35;
  const chartData = sparklineData.map(d => d.count);
  const maxVal = Math.max(...chartData, 1);

  rect(doc, ML, y, CW, chartH + 10, C.mist);

  // Y-axis labels
  doc.setFontSize(7);
  setTextColor(doc, C.grey);
  for (let v = 0; v <= maxVal; v += Math.ceil(maxVal / 4)) {
    const labelY = y + chartH - (v / maxVal) * chartH + 5;
    text(doc, String(v), ML + 2, labelY);
  }

  drawBarChart(doc, ML + 12, y + 5, CW - 14, chartH, chartData, maxVal, C.sage);

  // X-axis week labels (every 3rd)
  doc.setFontSize(6.5);
  setTextColor(doc, C.grey);
  const barSlotW = (CW - 14) / chartData.length;
  sparklineData.forEach((d, i) => {
    if (i % 3 === 0) {
      text(doc, d.week, ML + 12 + i * barSlotW + barSlotW / 2, y + chartH + 12, { align: 'center' });
    }
  });

  // Legend
  rect(doc, ML + CW - 40, y + 2, 8, 4, C.sage);
  doc.setFontSize(7);
  setTextColor(doc, C.grey);
  text(doc, 'Days logged / week', ML + CW - 29, y + 6);

  y += chartH + 18;

  // Days logged vs days since join
  const joinDays = stats?.days_since_join || 1;
  const loggingRate = Math.round(((stats?.total_logs || 0) / joinDays) * 100);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  setTextColor(doc, C.ink);
  text(doc, `Logging consistency: ${loggingRate}%`, ML, y);
  drawBar(doc, ML, y + 3, CW, 4, loggingRate / 100, C.sage);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  setTextColor(doc, C.grey);
  text(doc, `${stats?.total_logs || 0} logs across ${joinDays} days since joining`, ML, y + 12);

  // ─── PAGE 3: Goals ────────────────────────────────────────────
  newPage(doc, 3, TOTAL_PAGES, userName, generatedAt);
  y = 20;
  y = sectionTitle(doc, 'Goals Tracker', y, '◇');

  // Status summary pills
  const statusCounts = { active: 0, completed: 0, failed: 0, extended: 0 };
  (goals || []).forEach(g => { if (statusCounts[g.status] !== undefined) statusCounts[g.status]++; });

  const pills = [
    { label: 'Active', count: statusCounts.active, color: C.sage },
    { label: 'Completed', count: statusCounts.completed, color: C.gold },
    { label: 'Extended', count: statusCounts.extended, color: C.grey },
    { label: 'Failed', count: statusCounts.failed, color: C.rust },
  ];
  let px = ML;
  pills.forEach(p => {
    const pw2 = 36;
    rect(doc, px, y, pw2, 12, p.color);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    setTextColor(doc, C.white);
    text(doc, String(p.count), px + pw2 / 2, y + 7, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    text(doc, p.label.toUpperCase(), px + pw2 / 2, y + 11, { align: 'center' });
    px += pw2 + 4;
  });
  y += 18;

  // Goals table
  const goalRows = (goals || []).slice(0, 25).map(g => {
    const totalMicro = (g.micro_goals || []).length;
    const doneMicro = (g.micro_goals || []).filter(m => m.completed).length;
    const pct = totalMicro > 0 ? Math.round((doneMicro / totalMicro) * 100) : (g.status === 'completed' ? 100 : 0);
    const statusLabel = g.status ? g.status.charAt(0).toUpperCase() + g.status.slice(1) : '-';
    const deadline = g.current_deadline ? g.current_deadline.slice(0, 10) : '-';
    return [
      g.title?.slice(0, 40) || '-',
      statusLabel,
      deadline,
      `${pct}%`,
      totalMicro > 0 ? `${doneMicro}/${totalMicro}` : '-',
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Goal', 'Status', 'Deadline', 'Progress', 'Tasks']],
    body: goalRows.length ? goalRows : [['No goals recorded yet', '', '', '', '']],
    margin: { left: ML, right: MR },
    styles: { fontSize: 8, cellPadding: 3, textColor: C.ink, lineColor: C.lightGrey, lineWidth: 0.2 },
    headStyles: { fillColor: C.ink, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: C.mist },
    columnStyles: {
      0: { cellWidth: 68 },
      1: { cellWidth: 22 },
      2: { cellWidth: 26 },
      3: { cellWidth: 20 },
      4: { cellWidth: 18 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const v = data.cell.raw;
        if (v === 'Completed') data.cell.styles.textColor = C.sage;
        else if (v === 'Failed') data.cell.styles.textColor = C.rust;
        else if (v === 'Active') data.cell.styles.textColor = C.gold;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 6;

  // Goal completion donut (simple pie segments as rectangles)
  if (goals && goals.length > 0 && y < PH - 60) {
    y = sectionTitle(doc, 'Goal Breakdown by Category', y, '▦');
    const catMap = {};
    const catColors = {};
    categories?.forEach(c => { catColors[c.id] = c.color || '#6b8c6b'; });
    goals.forEach(g => {
      const cat = categories?.find(c => c.id === g.category_id);
      const name = cat?.name || 'Uncategorized';
      catMap[name] = (catMap[name] || 0) + 1;
    });
    const total = goals.length;
    let bx = ML;
    Object.entries(catMap).slice(0, 6).forEach(([name, count]) => {
      const bw = (count / total) * CW;
      const color = hexToRgb(catColors[categories?.find(c => c.name === name)?.id] || '#6b8c6b');
      rect(doc, bx, y, bw - 0.5, 8, color);
      bx += bw;
    });
    y += 10;
    bx = ML;
    Object.entries(catMap).slice(0, 6).forEach(([name, count]) => {
      doc.setFontSize(7);
      setTextColor(doc, C.grey);
      text(doc, `${name} (${count})`, bx, y);
      bx += 30;
    });
    y += 8;
  }

  // ─── PAGE 4: Recent Logs + Insights ───────────────────────────
  newPage(doc, 4, TOTAL_PAGES, userName, generatedAt);
  y = 20;
  y = sectionTitle(doc, 'Recent Daily Logs', y, '✦');

  const logRows = (logs || []).slice(0, 20).map(l => {
    const totalTime = (l.entries || []).reduce((s, e) => s + (e.time_spent || 0), 0);
    const rating = l.overall_rating != null ? `${l.overall_rating}/10` : '-';
    const highlight = (l.highlight || '').slice(0, 50);
    return [l.date || '-', rating, `${totalTime}m`, highlight || '-'];
  });

  autoTable(doc, {
    startY: y,
    head: [['Date', 'Rating', 'Time', 'Highlight']],
    body: logRows.length ? logRows : [['No logs recorded yet', '', '', '']],
    margin: { left: ML, right: MR },
    styles: { fontSize: 8, cellPadding: 3, textColor: C.ink, lineColor: C.lightGrey, lineWidth: 0.2 },
    headStyles: { fillColor: C.sage, textColor: C.white, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: C.mist },
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 16 },
      2: { cellWidth: 16 },
      3: { cellWidth: CW - 58 },
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  if (y < PH - 70) {
    y = sectionTitle(doc, 'Key Insights & Milestones', y, '⭐');

    const insights = [
      { label: 'Days since joining', value: `${stats?.days_since_join || 0} days` },
      { label: 'Logging rate', value: `${Math.round(((stats?.total_logs || 0) / Math.max(stats?.days_since_join || 1, 1)) * 100)}%` },
      { label: 'Goal success rate', value: stats?.total_goals > 0 ? `${Math.round(((stats?.completed_goals || 0) / stats.total_goals) * 100)}%` : 'N/A' },
      { label: 'Manifestations achieved', value: `${stats?.completed_manifestations || 0} of ${stats?.total_manifestations || 0}` },
      { label: 'Active categories', value: stats?.total_categories || 0 },
      { label: 'Longest streak ever', value: `${stats?.longest_streak || 0} days` },
    ];

    const iColW = CW / 2 - 3;
    insights.forEach((ins, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const ix = ML + col * (iColW + 6);
      const iy = y + row * 14;
      rect(doc, ix, iy, iColW, 12, C.mist);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      setTextColor(doc, C.ink);
      text(doc, String(ins.value), ix + 4, iy + 7);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      setTextColor(doc, C.grey);
      text(doc, ins.label, ix + 4, iy + 11);
    });

    y += Math.ceil(insights.length / 2) * 14 + 10;
  }

  // Closing motivational band
  if (y < PH - 28) {
    rect(doc, 0, PH - 26, PW, 26, C.ink);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    setTextColor(doc, C.sage);
    text(doc, '"Small daily improvements lead to stunning results."', PW / 2, PH - 13, { align: 'center' });
    doc.setFontSize(7.5);
    setTextColor(doc, C.grey);
    text(doc, 'Keep growing. — GrowthLog', PW / 2, PH - 7, { align: 'center' });
  }

  doc.save(`GrowthLog_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
}
