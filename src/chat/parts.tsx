// Copied as they are from the TaskForce AI page (taskforce-construction-frontend src/app/dashboard/tf-ai/page.tsx):
// the answer's markdown renderer and the thinking panel, so the demo looks exactly like the app.
import React, { useEffect, useState } from "react";
import styles from "./tfai.module.css";
import { sanitizeRichText } from "./richText";

// One "what TF AI is doing" line, streamed by the AI service as data:{"step":{...}}
export type Step = {
  id: string;
  state: "running" | "done";
  label: string;
  detail?: string;
  result?: string;
  modules?: string[];
};

// ── Markdown renderer ──────────────────────────────────────────────────────────
// Handles: code blocks, headings, ordered/unordered lists, paragraphs,
//          inline code, bold, italic — without external dependencies.

function inlineFormat(text: string): React.ReactNode {
  // Split on inline-code spans first so we don't mangle their content
  const parts = text.split(/(`[^`]+`)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code key={idx} className={styles.inlineCode}>
              {part.slice(1, -1)}
            </code>
          );
        }
        // bold+italic → bold → italic (order matters)
        // Underscore italics only match at word boundaries so snake_case
        // identifiers (project_id, task_id) are left alone.
        const html = part
          .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/(^|[^A-Za-z0-9_])_([^_\s][^_]*?)_(?![A-Za-z0-9_])/g, "$1<em>$2</em>");
        // Model output is untrusted input: it can echo back whatever a user (or
        // a retrieved document) put in front of it, so the emphasis markup
        // built above is sanitised before it is injected.
        return <span key={idx} dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }} />;
      })}
    </>
  );
}

const splitTableRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());

const isTableSeparator = (line: string) => {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};

const isTableStart = (lines: string[], index: number) =>
  Boolean(
    lines[index]?.trim().startsWith("|") &&
      isTableSeparator(lines[index + 1] || ""),
  );

const isSectionTitle = (line: string) =>
  /^[A-Z][A-Z0-9 /&-]+(?:\s*\(\d+\s+(?:found|records?)\))?:\s*$/.test(
    line.trim(),
  );

const renderRecordText = (text: string): React.ReactNode => {
  const segments = text
    .split(/\s+\|\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length < 2) return inlineFormat(text);

  return (
    <div className={styles.recordLine}>
      {segments.map((segment, index) => {
        const [label, ...valueParts] = segment.split(":");
        const value = valueParts.join(":").trim();

        if (!value || !label || label.length > 36) {
          return (
            <span key={`${segment}-${index}`} className={styles.recordText}>
              {inlineFormat(segment)}
            </span>
          );
        }

        return (
          <span key={`${label}-${index}`} className={styles.recordField}>
            <span className={styles.recordLabel}>{label.trim()}</span>
            <span className={styles.recordValue}>{inlineFormat(value)}</span>
          </span>
        );
      })}
    </div>
  );
};

const isSpecialBlockStart = (lines: string[], index: number) => {
  const line = lines[index] || "";
  return (
    line.startsWith("```") ||
    /^(#{1,3})\s+/.test(line) ||
    /^\s*[*\-\u2022]\s+/.test(line) ||
    /^\s*\d+[\.)]\s+/.test(line) ||
    isTableStart(lines, index) ||
    isSectionTitle(line)
  );
};

export function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced code block
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={`cb-${i}`} className={styles.codeBlock}>
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      i++; // skip closing ```
      continue;
    }

    // Markdown table
    if (isTableStart(lines, i)) {
      const headers = splitTableRow(lines[i]);
      i += 2;
      const rows: string[][] = [];

      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }

      nodes.push(
        <div key={`table-${i}`} className={styles.tableWrap}>
          <table className={styles.mdTable}>
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={`${header}-${index}`}>{inlineFormat(header)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {headers.map((_, cellIndex) => (
                    <td key={`cell-${rowIndex}-${cellIndex}`}>
                      {inlineFormat(row[cellIndex] || "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // ATX headings
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length + 2, 6) as 3 | 4 | 5 | 6;
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      nodes.push(
        <Tag key={`h-${i}`} className={styles.mdHeading}>
          {inlineFormat(headingMatch[2])}
        </Tag>,
      );
      i++;
      continue;
    }

    // Plain RAG section headings such as "PROJECTS (3 found):"
    if (isSectionTitle(line)) {
      nodes.push(
        <h3 key={`section-${i}`} className={styles.mdSectionHeading}>
          {line.trim().replace(/:$/, "")}
        </h3>,
      );
      i++;
      continue;
    }

    // Unordered list
    if (/^\s*[*\-\u2022]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[*\-\u2022]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[*\-\u2022]\s+/, ""));
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className={styles.mdList}>
          {items.map((item, k) => (
            <li key={k}>{renderRecordText(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\s*\d+[\.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[\.)]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+[\.)]\s+/, ""));
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className={styles.mdList}>
          {items.map((item, k) => (
            <li key={k}>{renderRecordText(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Blank line → spacing
    if (line.trim() === "") {
      nodes.push(<div key={`br-${i}`} className={styles.mdSpacer} />);
      i++;
      continue;
    }

    // Regular paragraph. Merge wrapped lines until the next Markdown block so
    // streamed model text does not look artificially broken.
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isSpecialBlockStart(lines, i)
    ) {
      paragraphLines.push(lines[i].trim());
      i++;
    }

    const paragraph = paragraphLines.join(" ");
    nodes.push(
      <div key={`p-${i}`} className={styles.mdParagraph}>
        {renderRecordText(paragraph)}
      </div>,
    );
  }

  return <>{nodes}</>;
}
// ──────────────────────────────────────────────────────────────────────────────

// ── Thinking panel ────────────────────────────────────────────────────────────
// Live timeline of lookups while the answer is being worked out (spinning star,
// running clock, pulsing current step); collapses to "Thought for Ns" with the
// modules searched once the answer starts streaming (click to expand).

function useElapsed(active: boolean, startedAt?: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [active]);
  return startedAt ? Math.max(0, now - startedAt) : 0;
}

// "Found 270" -> "Found <b>270</b>": numbers in a step result stand out
function highlightNumbers(text: string): React.ReactNode {
  return text.split(/(\d[\d,.]*)/g).map((part, i) =>
    /^\d/.test(part) ? <b key={i} className={styles.stepNum}>{part}</b> : part,
  );
}

export function ThinkingPanel({ steps, pending, thoughtMs, startedAt }: {
  steps: Step[];
  pending: boolean;
  thoughtMs?: number;
  startedAt?: number;
}) {
  const [open, setOpen] = useState(false);
  const elapsed = useElapsed(pending, startedAt);
  const running = [...steps].reverse().find((s) => s.state === "running");
  const lookups = steps.filter((s) => s.modules && s.modules.length > 0);
  const modules = Array.from(new Set(lookups.flatMap((s) => s.modules ?? [])));
  const expanded = pending || open;

  let title: string;
  if (pending) {
    title = running ? `${running.label}…` : steps.length ? "Reviewing results…" : "Thinking…";
  } else {
    const secs = thoughtMs !== undefined ? Math.max(1, Math.round(thoughtMs / 1000)) : undefined;
    title = secs !== undefined ? `Thought for ${secs}s` : "Thought process";
  }

  return (
    <div className={styles.thinking}>
      <button
        type="button"
        className={styles.thinkingHeader}
        onClick={() => !pending && steps.length > 0 && setOpen((o) => !o)}
        aria-expanded={expanded}
        disabled={pending || steps.length === 0}
      >
        <span key={title} className={`${styles.thinkingTitle} ${pending ? styles.shimmerText : ""}`}>
          {title}
        </span>
        {pending && startedAt && (
          <span className={styles.thinkingClock}>{(elapsed / 1000).toFixed(1)}s</span>
        )}
        {!pending && lookups.length > 0 && (
          <span className={styles.thinkingMeta}>
            {lookups.length} lookup{lookups.length === 1 ? "" : "s"}
          </span>
        )}
        {!pending && steps.length > 0 && (
          <svg
            className={`${styles.thinkingChevron} ${open ? styles.thinkingChevronOpen : ""}`}
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        )}
      </button>

      {!pending && !open && modules.length > 0 && (
        <div className={styles.thinkingChips}>
          {modules.slice(0, 4).map((m) => (
            <span key={m} className={styles.moduleChip}>{m}</span>
          ))}
          {modules.length > 4 && <span className={styles.moduleChipMore}>+{modules.length - 4}</span>}
        </div>
      )}

      <div className={`${styles.thinkingBody} ${expanded && steps.length > 0 ? styles.thinkingBodyOpen : ""}`}>
        <div className={styles.thinkingBodyInner}>
          <ol className={styles.timeline}>
            {steps.map((s) => (
              <li
                key={s.id}
                className={`${styles.timelineStep} ${s.state === "running" ? styles.timelineRunning : styles.timelineDone}`}
              >
                <span className={styles.timelineDot} aria-hidden>
                  {s.state === "done" && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                <div className={styles.timelineBody}>
                  <span className={`${styles.stepLabel} ${s.state === "running" ? styles.shimmerText : ""}`}>
                    {s.label}
                  </span>
                  {s.detail && <span className={styles.stepDetail}>{s.detail}</span>}
                  {s.modules && s.modules.length > 1 && (
                    <span className={styles.stepModules}>
                      {s.modules.map((m) => (
                        <span key={m} className={styles.moduleChipSm}>{m}</span>
                      ))}
                    </span>
                  )}
                  {s.result && <span className={styles.stepResult}>{highlightNumbers(s.result)}</span>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
// ──────────────────────────────────────────────────────────────────────────────
