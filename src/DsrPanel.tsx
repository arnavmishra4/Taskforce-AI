// The Daily Site Report pane beside the chat (DsrFormPane in the app), filled from what the real filler returned
// (POST /dsr/turn, its readable summary). The form shows the app's own sections, labels and styles; what the last
// sentence changed glows for a moment, as the eye follows it.
import React from "react";
import dsr from "./chat/dsr.module.css";
import "./chat/GenerateReport.css";
import "./chat/FormSection.css";
import "./chat/FormRow.css";
import ui from "./demo.module.css";

export type Summary = {
  sections: { title: string; fields: { label: string; value: string }[] }[];
  tables: { label: string; columns: string[]; rows: string[][] }[];
};

const field = (s: Summary | null, label: string) =>
  s?.sections.flatMap((x) => x.fields).find((f) => f.label === label)?.value ?? "";
const table = (s: Summary | null, label: string) => s?.tables.find((t) => t.label === label);
const cell = (s: Summary | null, label: string, row: number, column: string) => {
  const t = table(s, label);
  const at = t?.columns.indexOf(column) ?? -1;
  return t && at >= 0 ? t.rows[row]?.[at] ?? "" : "";
};

function Input({ value, placeholder, select, fresh, tall }: {
  value: string; placeholder: string; select?: boolean; fresh?: boolean; tall?: boolean;
}) {
  return (
    <div className={`${ui.input} ${fresh ? ui.fresh : ""}`} style={tall ? { minHeight: 96, alignItems: "flex-start" } : undefined}>
      <span className={value ? undefined : ui.placeholder}>{value || placeholder}</span>
      {select && <span className={ui.chevron} aria-hidden="true">▾</span>}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="field-group">
      <label className="field-label">{label}{required && <span className="field-label__required">*</span>}</label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="form-section" data-section={title}>
      <div className="form-section__header"><h3 className="form-section__title">{title}</h3></div>
      <div className="form-section__body">{children}</div>
    </div>
  );
}

// a repeating section: one row per entry, the app's own row layout
function Rows({ label, now, was, columns, sub }: {
  label: string; now: Summary | null; was: Summary | null; sub?: boolean;
  columns: { title: string; from?: string; placeholder: string; select?: boolean }[];
}) {
  const rows = table(now, label)?.rows.length ?? 0;
  const before = table(was, label)?.rows.length ?? 0;
  const subcontractor = cell(now, label, 0, "Subcontractor");
  return (
    <>
      {sub && (
        <Field label="Sub Contractor">
          <Input value={subcontractor} placeholder="Select sub contractor..." select
                 fresh={!!subcontractor && !cell(was, label, 0, "Subcontractor")} />
        </Field>
      )}
      <div className="sub-entries-container">
        {Array.from({ length: Math.max(rows, 1) }, (_, r) => (
          <div key={r} className="sub-entry">
            <div className={`form-row form-row--cols-${columns.length}`}>
              {columns.map((c) => {
                const v = c.from ? cell(now, label, r, c.from) : "";
                return (
                  <Field key={c.title} label={c.title}>
                    <Input value={v} placeholder={c.placeholder} select={c.select} fresh={!!v && r >= before} />
                  </Field>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="add-entry-btn">+ Add More</button>
    </>
  );
}

export default function DsrPanel({ now, was, busy, review, dim }: {
  now: Summary | null;      // the report as filled so far
  was: Summary | null;      // before the last sentence: what changed glows
  busy: boolean;            // a sentence is going in
  review: boolean;          // Submit was pressed: the review before submitting
  dim?: boolean;            // someone is talking: the form steps back until it fills
}) {
  const one = (label: string, placeholder: string, select = false, tall = false) => {
    const v = field(now, label);
    return <Input value={v} placeholder={placeholder} select={select} tall={tall} fresh={!!v && v !== field(was, label)} />;
  };
  const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }).replace(/ (\d{4})$/, ", $1");
  return (
    <aside className={`${dsr.pane} ${dim ? ui.dimmed : ui.undimmed}`} aria-label="Daily Site Report" data-demo="dsr">
      <header className={dsr.paneHeader}>
        <h3 className={dsr.paneTitle}>
          Daily Site Report
          <span className={`${dsr.liveDot} ${busy ? dsr.liveDotBusy : ""}`} role="status" aria-label={busy ? "Filling" : "Live"} />
        </h3>
        <div className={dsr.paneActions}>
          <button type="button" className={dsr.secondaryButton} disabled={!now || busy}>Undo</button>
          <div className={dsr.menuWrap}><button type="button" className={dsr.iconButton} aria-label="More">⋯</button></div>
          <button type="button" className={dsr.iconButton} aria-label="Close the report">×</button>
        </div>
      </header>

      <div className={dsr.paneBody} data-demo="dsr-body">
        <div className="generate-report">
          <Section title="Site Information">
            <div className="form-row form-row--cols-2">
              <Field label="Project" required>{one("Project", "Select a project...", true)}</Field>
              <Field label="Report Date"><Input value={now ? today : ""} placeholder="Choose Date" /></Field>
              <Field label="Submitted By (Supervisor)" required><Input value={now ? "Demo User" : ""} placeholder="Select supervisor" select /></Field>
              <Field label="Shift">{one("Shift", "Day Shift", true)}</Field>
            </div>
          </Section>
          <Section title="Weather Conditions">
            <div className="form-row form-row--cols-3">
              <Field label="Weather Type">{one("Weather", "Select weather...", true)}</Field>
              <Field label="Temperature (°C)">{one("Temperature", "22")}</Field>
              <Field label="Wind Speed (km/h)"><Input value="" placeholder="15" /></Field>
            </div>
          </Section>
          <Section title="Work Progress">{one("Work progress summary", "Describe work progress for today...", false, true)}</Section>
          <Section title="Labor Tracking">
            <Rows label="Labour" now={now} was={was} sub columns={[
              { title: "Trade", from: "Trade", placeholder: "Select trade...", select: true },
              { title: "Workers", from: "Workers", placeholder: "5" },
              { title: "Hours", from: "Hours", placeholder: "8" },
              { title: "Stand By Hours", placeholder: "2" },
            ]} />
          </Section>
          <Section title="Equipment">
            <Rows label="Equipment" now={now} was={was} sub columns={[
              { title: "Equipment", from: "Equipment", placeholder: "Select equipment...", select: true },
              { title: "Hours", from: "Hours", placeholder: "8" },
            ]} />
          </Section>
          <Section title="Materials">
            <Rows label="Materials" now={now} was={was} columns={[
              { title: "Item", from: "Material", placeholder: "Select item...", select: true },
              { title: "Quantity", from: "Quantity", placeholder: "5" },
              { title: "Unit", from: "Unit", placeholder: "Auto-populated from material" },
              { title: "Supplier", from: "Supplier", placeholder: "Select supplier...", select: true },
            ]} />
          </Section>
          <Section title="Delays & Issues">
            <Rows label="Delays" now={now} was={was} columns={[
              { title: "Delay Type", from: "Delay type", placeholder: "Select type...", select: true },
              { title: "Description", from: "Description", placeholder: "Description text goes here" },
            ]} />
          </Section>
          <div className="generate-report__footer">
            <span className="auto-save-indicator">{now ? "Draft autosaved" : ""}</span>
            <button type="button" className="btn-save-draft">Save Draft</button>
            <button type="button" className="btn-submit" data-demo="submit">Submit</button>
          </div>
        </div>
      </div>

      {review && now && (
        <div className={dsr.submitScrim} role="dialog" aria-modal="true" aria-label="Review the report before submitting">
          <div className={dsr.submitBox}>
            <h4 className={dsr.submitTitle}>Review before submitting</h4>
            <div className={dsr.submitBody}>
              {now.sections.map((s) => (
                <section key={s.title} className={dsr.submitSection}>
                  <h5 className={dsr.submitHeading}>{s.title}</h5>
                  <dl className={dsr.submitFields}>
                    {s.fields.map((f) => <div key={f.label} className={dsr.submitField}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
                  </dl>
                </section>
              ))}
              {now.tables.map((t) => (
                <section key={t.label} className={dsr.submitSection}>
                  <h5 className={dsr.submitHeading}>{t.label} <span className={dsr.count}>{t.rows.length}</span></h5>
                  <div className={dsr.submitTableWrap}>
                    <table className={dsr.submitTable}>
                      <thead><tr>{t.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                      <tbody>{t.rows.map((r, n) => <tr key={n}>{r.map((c, m) => <td key={m}>{c}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </section>
              ))}
            </div>
            <div className={dsr.submitActions}>
              <button type="button" className={dsr.secondaryButton}>Back to the form</button>
              <button type="button" className={dsr.primaryButton} data-demo="submit-report">Submit report</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
