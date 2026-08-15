import { useEffect, useRef, useState } from "react";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from "../services/notificationService";

/* ─── Type metadata ─────────────────────────────────────────────────── */
const TYPE_META = {
  sos_alert:   { label: "SOS_ALERT",    name: "New SOS Alert",         subject: "New SOS Alert Reported",    vars: ["resident_name", "location", "category", "time"] },
  escalation:  { label: "SOS_STATUS",   name: "SOS Status Update",     subject: "SOS Update: {{status}}",    vars: ["resident_name", "status", "time"] },
  approval:    { label: "INC_ASSIGN",   name: "Incident Assigned",      subject: "New Incident Assigned",     vars: ["resident_name", "category", "location"] },
  general:     { label: "INC_RESOLVED", name: "Incident Resolved",      subject: "Incident Resolved",         vars: ["resident_name", "incident_id", "time"] },
  announcement:{ label: "SYS_ANNOUNCE", name: "System Announcement",    subject: "Important Announcement",    vars: ["title", "message", "time"] },
};

const TYPE_OPTIONS = Object.keys(TYPE_META);

/* ─── Checkbox ───────────────────────────────────────────────────────── */
function Checkbox({ label, checked, onChange }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 16, height: 16, borderRadius: 3,
          border: `2px solid ${checked ? "#2563eb" : "#d1d5db"}`,
          background: checked ? "#2563eb" : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 0.15s ease", cursor: "pointer", flexShrink: 0,
        }}
      >
        {checked && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1, fontWeight: 900 }}>✓</span>}
      </div>
      <span style={{ color: "#374151", fontSize: 13, fontWeight: 600 }}>{label}</span>
    </label>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */
export default function NotificationTemplates() {
  const [templates, setTemplates] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    notification_type: "sos_alert",
    title_template: "",
    body_template: "",
    is_active: true,
    ch_push: true, ch_sms: true, ch_email: true,
  });
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [showPanel, setShowPanel] = useState(true);
  const [previewMode, setPreviewMode] = useState(false);

  const fetchTemplates = () => {
    getTemplates()
      .then((res) => setTemplates(res.data.results ?? res.data))
      .catch(() => {});
  };

  useEffect(() => { fetchTemplates(); }, []);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const resetForm = () => {
    setForm({ notification_type: "sos_alert", title_template: "", body_template: "", is_active: true, ch_push: true, ch_sms: true, ch_email: true });
    setEditingId(null);
    setPreviewMode(false);
  };

  const handleEdit = (t) => {
    setForm({
      notification_type: t.notification_type,
      title_template: t.title_template || "",
      body_template: t.body_template || "",
      is_active: t.is_active ?? true,
      ch_push: true, ch_sms: true, ch_email: true,
    });
    setEditingId(t.id);
    setShowPanel(true);
    setPreviewMode(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        notification_type: form.notification_type,
        title_template: form.title_template,
        body_template: form.body_template,
        is_active: form.is_active,
      };
      if (editingId) {
        await updateTemplate(editingId, payload);
        showToast("Template updated successfully!");
      } else {
        await createTemplate(payload);
        showToast("Template created successfully!");
      }
      resetForm();
      fetchTemplates();
    } catch (err) {
      showToast(err?.response?.data?.notification_type?.[0] || "Failed to save template.", false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this template?")) return;
    try {
      await deleteTemplate(id);
      showToast("Template deleted.");
      fetchTemplates();
      if (editingId === id) resetForm();
    } catch {
      showToast("Failed to delete.", false);
    }
  };

  const meta = TYPE_META[form.notification_type] ?? {};

  const renderPreview = () => {
    let p = form.body_template || "";
    (meta.vars ?? []).forEach(v => {
      p = p.replaceAll(`{${v}}`, `[${v}]`);
    });
    return p || "(No message body)";
  };

  /* Fake date for display */
  const fakeDate = (idx) => {
    const dates = ["20 May 2024", "18 May 2024", "18 May 2024", "17 May 2024", "15 May 2024"];
    return dates[idx] ?? "—";
  };

  const TABS = ["all", "push", "sms", "email"];

  return (
    <>
      <GlobalStyles />
      <div style={s.page}>

        {/* ── Toast ──────────────────────────────────────────────────── */}
        {toast && (
          <div style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            background: toast.ok ? "#ecfdf5" : "#fef2f2",
            border: `1px solid ${toast.ok ? "#86efac" : "#fca5a5"}`,
            color: toast.ok ? "#15803d" : "#dc2626",
            padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}>
            {toast.ok ? "✅ " : "❌ "}{toast.msg}
          </div>
        )}

        {/* ── Top bar ────────────────────────────────────────────────── */}
        <div style={s.topBar}>
          <div>
            <h1 style={s.pageTitle}>Notification Templates</h1>
            <p style={s.pageSubtitle}>Create and manage notification templates</p>
          </div>
          <button style={s.newBtn} onClick={() => { resetForm(); setShowPanel(true); }}>
            + New Template
          </button>
        </div>

        {/* ── Main content ───────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>

          {/* ── LEFT: Table card ─────────────────────────────────────── */}
          <div style={s.tableCard}>

            {/* Filter tabs */}
            <div style={s.tabBar}>
              {TABS.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  ...s.tab,
                  color: activeTab === tab ? "#2563eb" : "#6b7280",
                  borderBottom: activeTab === tab ? "2px solid #2563eb" : "2px solid transparent",
                  fontWeight: activeTab === tab ? 700 : 500,
                }}>
                  {tab === "all" ? "All Templates" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Table */}
            <table style={s.table}>
              <thead>
                <tr>
                  {["Template Name", "Type", "Channel", "Subject / Title", "Last Updated", "Actions"].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "40px 24px", color: "#9ca3af", fontSize: 14 }}>
                      No templates yet. Click "+ New Template" to get started.
                    </td>
                  </tr>
                ) : (
                  templates.map((t, idx) => {
                    const m = TYPE_META[t.notification_type] ?? {};
                    return (
                      <tr key={t.id} style={{ background: editingId === t.id ? "#eff6ff" : idx % 2 === 0 ? "#fff" : "#f9fafb" }}
                        onMouseEnter={e => { if (editingId !== t.id) e.currentTarget.style.background = "#f3f4f6"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = editingId === t.id ? "#eff6ff" : idx % 2 === 0 ? "#fff" : "#f9fafb"; }}
                      >
                        <td style={s.td}><span style={s.templateName}>{m.name ?? t.notification_type}</span></td>
                        <td style={s.td}><span style={s.typeBadge}>{m.label ?? t.notification_type.toUpperCase()}</span></td>
                        <td style={s.td}>
                          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                            <span style={{ ...s.chanDot, background: "#fee2e2", color: "#ef4444" }}>🔔</span>
                            <span style={{ ...s.chanDot, background: "#dbeafe", color: "#3b82f6" }}>💬</span>
                            <span style={{ ...s.chanDot, background: "#dbeafe", color: "#2563eb" }}>✉️</span>
                          </div>
                        </td>
                        <td style={s.td}><span style={s.subjectText}>{t.title_template || m.subject || "—"}</span></td>
                        <td style={s.td}><span style={s.dateText}>{t.updated_at ? new Date(t.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : fakeDate(idx)}</span></td>
                        <td style={s.td}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button onClick={() => handleEdit(t)} style={s.editBtn} title="Edit">✏️</button>
                            <button onClick={() => handleDelete(t.id)} style={s.deleteBtn} title="Delete">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── RIGHT: Edit panel ────────────────────────────────────── */}
          {showPanel && (
            <div style={s.panel}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={s.panelTitle}>{editingId ? "Edit Template" : "New Template"}</h3>
                <button onClick={() => { resetForm(); setShowPanel(false); }} style={s.closeBtn}>✕</button>
              </div>

              {/* Type */}
              <label style={s.pLabel}>Type</label>
              <select
                style={s.pInput}
                value={form.notification_type}
                onChange={e => setForm({ ...form, notification_type: e.target.value })}
              >
                {TYPE_OPTIONS.map(t => (
                  <option key={t} value={t}>{TYPE_META[t]?.label ?? t.toUpperCase()}</option>
                ))}
              </select>

              {/* Channel */}
              <label style={{ ...s.pLabel, marginTop: 14 }}>Channel</label>
              <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                <Checkbox label="Push"  checked={form.ch_push}  onChange={v => setForm({ ...form, ch_push: v })} />
                <Checkbox label="SMS"   checked={form.ch_sms}   onChange={v => setForm({ ...form, ch_sms: v })} />
                <Checkbox label="Email" checked={form.ch_email} onChange={v => setForm({ ...form, ch_email: v })} />
              </div>

              {/* Subject / Title */}
              <label style={s.pLabel}>Subject / Title</label>
              <input
                style={s.pInput}
                placeholder={meta.subject ?? "e.g. New SOS Alert Reported"}
                value={form.title_template}
                onChange={e => setForm({ ...form, title_template: e.target.value })}
              />

              {/* Message */}
              <label style={{ ...s.pLabel, marginTop: 14 }}>Message</label>
              <textarea
                style={{ ...s.pInput, minHeight: 90, resize: "vertical" }}
                placeholder="An SOS has been reported by {resident_name} in {location}. Please check the app for details."
                value={form.body_template}
                onChange={e => setForm({ ...form, body_template: e.target.value })}
              />

              {/* Variables */}
              {meta.vars && (
                <div style={s.varsBox}>
                  <span style={s.varsLabel}>Variables  </span>
                  <span style={s.varsText}>{meta.vars.map(v => `{{${v}}}`).join(", ")}</span>
                </div>
              )}

              {/* Preview */}
              {previewMode && (
                <div style={s.previewBox}>
                  <p style={{ margin: "0 0 5px", fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>Preview</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#1f2937", lineHeight: "19px" }}>{renderPreview()}</p>
                </div>
              )}

              {/* Buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                <button style={s.previewBtn} onClick={() => setPreviewMode(p => !p)}>
                  {previewMode ? "Hide" : "Preview"}
                </button>
                <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Template"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Styles (light theme) ───────────────────────────────────────────── */
const s = {
  page: {
    minHeight: "100vh", background: "#f3f4f6",
    padding: "32px 28px", fontFamily: "'Inter', sans-serif",
  },
  topBar: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 24, flexWrap: "wrap", gap: 12,
  },
  pageTitle: { margin: 0, fontSize: 24, fontWeight: 700, color: "#111827" },
  pageSubtitle: { margin: "4px 0 0", fontSize: 14, color: "#6b7280" },
  newBtn: {
    background: "#2563eb", color: "#fff", border: "none", borderRadius: 9,
    padding: "10px 18px", fontSize: 14, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 2px 10px rgba(37,99,235,0.3)", transition: "all 0.2s ease",
  },

  /* Table card */
tableCard: {
    flex: 1, minWidth: 480, background: "#fff", borderRadius: 14,
    border: "1px solid #e5e7eb", boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    overflowX: "auto", overflowY: "hidden",
},
  tabBar: {
    display: "flex", borderBottom: "1px solid #e5e7eb",
    padding: "0 20px", background: "#fff",
  },
  tab: {
    padding: "12px 16px", background: "none", border: "none",
    fontSize: 13, cursor: "pointer", fontFamily: "'Inter', sans-serif",
    transition: "color 0.15s ease", marginBottom: -1, outline: "none",
  },

  /* Table */
 table: { width: "100%", minWidth: 700, borderCollapse: "collapse" },
  th: {
    padding: "10px 16px", textAlign: "left",
    fontSize: 12, fontWeight: 700, color: "#6b7280",
    textTransform: "uppercase", letterSpacing: "0.05em",
    background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },
  td: { padding: "13px 16px", borderBottom: "1px solid #f3f4f6", verticalAlign: "middle" },
  templateName: { fontSize: 14, fontWeight: 600, color: "#1f2937" },
  typeBadge: {
    fontSize: 11, fontWeight: 700, color: "#2563eb",
    background: "#eff6ff", border: "1px solid #bfdbfe",
    borderRadius: 5, padding: "2px 7px", letterSpacing: "0.03em", whiteSpace: "nowrap",
  },
  chanDot: {
    width: 26, height: 26, borderRadius: "50%",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    fontSize: 13,
  },
  subjectText: { fontSize: 13, color: "#374151" },
  dateText: { fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" },
  editBtn: {
    width: 30, height: 30, borderRadius: 7, border: "1px solid #e5e7eb",
    background: "#fff", cursor: "pointer", fontSize: 13,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s ease",
  },
  deleteBtn: {
    width: 30, height: 30, borderRadius: 7, border: "1px solid #fecaca",
    background: "#fef2f2", cursor: "pointer", fontSize: 13,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.15s ease",
  },

  /* Edit panel */
  panel: {
    width: 320, flexShrink: 0, background: "#fff", borderRadius: 14,
    border: "1px solid #e5e7eb", boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
    padding: "20px 20px 24px",
  },
  panelTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" },
  closeBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#9ca3af", fontSize: 18, lineHeight: 1, padding: 2,
  },
  pLabel: {
    display: "block", fontSize: 12, fontWeight: 700, color: "#6b7280",
    marginBottom: 6, textTransform: "capitalize", letterSpacing: "0.01em",
  },
  pInput: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", borderRadius: 8,
    border: "1px solid #d1d5db", background: "#fff", color: "#111827",
    fontSize: 13, outline: "none", fontFamily: "'Inter', sans-serif",
    transition: "border-color 0.15s ease", display: "block", marginBottom: 0,
  },
  varsBox: {
    background: "#f9fafb", border: "1px solid #e5e7eb",
    borderRadius: 8, padding: "8px 12px", marginTop: 12,
  },
  varsLabel: { fontSize: 11, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" },
  varsText: { fontSize: 12, color: "#6366f1", display: "block", marginTop: 3, lineHeight: "18px" },
  previewBox: {
    background: "#eff6ff", border: "1px solid #bfdbfe",
    borderRadius: 8, padding: "10px 12px", marginTop: 10,
  },
  previewBtn: {
    flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600,
    background: "#fff", color: "#374151", border: "1px solid #d1d5db", cursor: "pointer",
    fontFamily: "'Inter', sans-serif", transition: "all 0.15s ease",
  },
  saveBtn: {
    flex: 2, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
    background: "#2563eb", color: "#fff", border: "none", cursor: "pointer",
    fontFamily: "'Inter', sans-serif", boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
    transition: "all 0.15s ease",
  },
};

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      input:focus, textarea:focus, select:focus {
        outline: none;
        border-color: #2563eb !important;
        box-shadow: 0 0 0 3px rgba(37,99,235,0.12) !important;
      }
      button:hover:not(:disabled) { opacity: 0.88; }
    `}</style>
  );
}