import { useState } from 'react';
import toast from 'react-hot-toast';
import API from '../../utils/api';
import { generateGrowthLogPDF } from '../../utils/pdfExport';
import { buildMarkdownExport } from './markdownExport';

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); document.body.removeChild(a); }, 1000);
};

const OPTIONS = [
  {
    key: 'json',
    title: 'JSON Export',
    subtitle: 'Single structured file',
    desc: 'Perfect for developers or importing into other tools. Contains all your data in one JSON file.',
    icon: '{ }',
    iconStyle: { background: 'rgba(107,140,107,0.12)', fontSize: 18, fontWeight: 700, color: 'var(--sage)', fontFamily: 'monospace' },
    border: '1px solid rgba(107,140,107,0.2)',
    buttonClass: 'btn btn-outline btn-sm',
    buttonStyle: { borderColor: 'var(--sage)', color: 'var(--sage)' },
    label: '⬇ Download JSON',
    busyLabel: '⏳ Preparing…',
  },
  {
    key: 'zip',
    title: 'Full ZIP Export',
    subtitle: 'JSON + CSV per section',
    desc: 'Includes a master JSON and individual CSVs for every section — great for spreadsheets.',
    icon: '🗜',
    iconStyle: { background: 'rgba(201,168,76,0.12)' },
    border: '1px solid rgba(201,168,76,0.25)',
    buttonClass: 'btn btn-sm',
    buttonStyle: { background: 'var(--gold)', color: 'white', border: 'none' },
    label: '⬇ Download ZIP',
    busyLabel: '⏳ Preparing…',
  },
  {
    key: 'pdf',
    title: 'PDF Report',
    subtitle: '4-page visual report',
    desc: 'A polished multi-page PDF with charts, goal tables, activity graphs, and key insights.',
    icon: '📄',
    iconStyle: { background: 'rgba(180,80,60,0.1)' },
    border: '1px solid rgba(13,13,13,0.12)',
    buttonClass: 'btn btn-sm',
    buttonStyle: { background: 'var(--ink)', color: 'white', border: 'none' },
    label: '⬇ Download PDF',
    busyLabel: '⏳ Generating…',
  },
  {
    key: 'md',
    title: 'Markdown Journal',
    subtitle: 'Obsidian & Notion ready',
    desc: 'A beautifully structured markdown journal of all your logs, goals, and daily reflections.',
    icon: '📝',
    iconStyle: { background: 'rgba(107,140,107,0.12)' },
    border: '1px solid rgba(107,140,107,0.2)',
    buttonClass: 'btn btn-outline btn-sm',
    buttonStyle: { borderColor: 'var(--sage)', color: 'var(--sage)' },
    label: '⬇ Download MD',
    busyLabel: '⏳ Preparing…',
  },
];

function ExportOption({ option, busy, disabled, onClick }) {
  return (
    <div style={{
      background: 'white',
      border: option.border,
      borderRadius: 12,
      padding: '20px 20px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{
          width: 40, height: 40, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
          ...option.iconStyle,
        }}>{option.icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{option.title}</div>
          <div style={{ fontSize: 12, color: 'rgba(13,13,13,0.45)' }}>{option.subtitle}</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: 'rgba(13,13,13,0.5)', lineHeight: 1.5, margin: 0 }}>
        {option.desc}
      </p>
      <button
        id={`btn-export-${option.key}`}
        className={option.buttonClass}
        onClick={onClick}
        disabled={disabled}
        style={{ marginTop: 4, fontWeight: 600, ...option.buttonStyle }}
      >
        {busy ? option.busyLabel : option.label}
      </button>
    </div>
  );
}

export default function ExportData({ user, stats, sparklineData }) {
  const [exportLoading, setExportLoading] = useState(null); // 'json' | 'zip' | 'pdf' | 'md' | null

  const handleExportJSON = async () => {
    const res = await API.get('/export/all', { responseType: 'blob' });
    triggerDownload(res.data, 'growthlog_export.json');
    toast.success('JSON export downloaded!');
  };

  const handleExportZip = async () => {
    const res = await API.get('/export/all/zip', { responseType: 'blob' });
    triggerDownload(res.data, 'growthlog_export.zip');
    toast.success('ZIP export downloaded! Contains JSON + CSV files.');
  };

  const handleExportPDF = async () => {
    const toastId = toast.loading('Building your PDF report…');
    try {
      const [goalsRes, logsRes, catsRes] = await Promise.all([
        API.get('/goals'),
        API.get('/logs?days=90&limit=50'),
        API.get('/categories'),
      ]);
      await generateGrowthLogPDF({
        user,
        stats,
        sparklineData,
        goals: goalsRes.data || [],
        logs: logsRes.data || [],
        categories: catsRes.data || [],
      });
      toast.success('PDF downloaded!', { id: toastId });
    } catch (e) {
      console.error(e);
      toast.error('PDF generation failed. Please try again.', { id: toastId });
    }
  };

  const handleExportMD = async () => {
    const res = await API.get('/export/all');
    const md = buildMarkdownExport(res.data || {});
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    triggerDownload(blob, 'growthlog_journal.md');
    toast.success('Markdown export downloaded!');
  };

  const handlers = { json: handleExportJSON, zip: handleExportZip, pdf: handleExportPDF, md: handleExportMD };

  const runExport = async (key) => {
    setExportLoading(key);
    try {
      await handlers[key]();
    } catch (e) {
      console.error(e);
      toast.error('Export failed. Please try again.');
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 20, padding: 24, borderLeft: '4px solid var(--sage)', background: 'var(--mist)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, color: 'var(--sage)', marginBottom: 6 }}>📦 Export Your Data</h3>
          <p style={{ fontSize: 13, color: 'rgba(13,13,13,0.6)', maxWidth: 560, lineHeight: 1.6 }}>
            Download a complete copy of your GrowthLog data in JSON, ZIP (JSON + CSV), or a
            beautifully formatted <strong>PDF report</strong> with charts, stats, and goals.
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 12,
      }}>
        {OPTIONS.map(option => (
          <ExportOption
            key={option.key}
            option={option}
            busy={exportLoading === option.key}
            disabled={exportLoading !== null}
            onClick={() => runExport(option.key)}
          />
        ))}
      </div>

      <p style={{ fontSize: 11, color: 'rgba(13,13,13,0.35)', marginTop: 14, fontStyle: 'italic' }}>
        ✦ Large exports may take a few seconds to prepare. Your data is streamed directly — nothing is stored on our servers.
      </p>
    </div>
  );
}
