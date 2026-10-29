import DOMPurify from "dompurify";

/**
 * Rich-text handling for user-authored content (task description, remarks,
 * comments).
 *
 * Threat model: comments are user-to-user content — one person authors, another
 * renders — which is the classic stored-XSS path. Sanitising is therefore an
 * ALLOWLIST: anything not named below is dropped, so a new tag or attribute can
 * never become exploitable by omission.
 *
 * Two layers, deliberately:
 *   1. The API sanitises on write (authoritative, and covers consumers that
 *      never touch React — the Outlook event body, notifications, exports).
 *   2. This module sanitises on render (defence in depth, and the only thing
 *      protecting the rows that were written before layer 1 existed).
 */

/** Tags the editor can produce. Everything else is stripped. */
const ALLOWED_TAGS = [
  "p", "br", "span", "div",
  "strong", "b", "em", "i", "u", "s", "strike", "del", "ins", "mark",
  "ol", "ul", "li",
  "blockquote", "pre", "code",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "a", "hr", "sub", "sup",
];

const ALLOWED_ATTR = ["href", "title", "target", "rel", "class"];

/**
 * Only Quill's own layout classes survive. Arbitrary attacker-chosen classes
 * could otherwise borrow application styles to fake UI (a fake "verified"
 * badge, an overlay covering a real control).
 */
const SAFE_CLASS = /^ql-[a-z0-9-]+$/i;

/** Schemes permitted in href. Excludes javascript:, data: and vbscript:. */
const ALLOWED_URI_REGEXP = /^(?:https?:|mailto:|tel:|#|\/)/i;

let hooksInstalled = false;

const installHooks = (): void => {
  if (hooksInstalled) return;
  hooksInstalled = true;

  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName === "A") {
      const el = node as unknown as HTMLAnchorElement;
      // A link that opens a new tab gives the opened page a window.opener
      // handle back to this one unless rel is set — reverse tabnabbing.
      if (el.getAttribute("href")) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer nofollow");
      } else {
        el.removeAttribute("target");
      }
    }

    const className = node.getAttribute?.("class");
    if (className) {
      const kept = className.split(/\s+/).filter((c) => SAFE_CLASS.test(c));
      if (kept.length) node.setAttribute("class", kept.join(" "));
      else node.removeAttribute("class");
    }
  });
};

const PURIFY_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP,
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  // Named explicitly as well as excluded by the allowlist: these are the tags
  // worth failing loudly on if the allowlist is ever loosened by accident.
  FORBID_TAGS: ["script", "style", "iframe", "object", "embed", "form", "input", "svg", "math", "link", "meta", "base"],
  FORBID_ATTR: ["style", "srcset", "formaction", "background", "poster"],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
};

/**
 * Bounded memo. Sanitising parses HTML, and the same values re-render on every
 * keystroke elsewhere in a modal and on every row of a list — without this the
 * parse cost is paid again for content that has not changed.
 */
const createCache = (limit: number) => {
  const map = new Map<string, string>();
  return {
    get(key: string, compute: (k: string) => string): string {
      const hit = map.get(key);
      if (hit !== undefined) {
        // Refresh recency so hot values survive eviction.
        map.delete(key);
        map.set(key, hit);
        return hit;
      }
      const value = compute(key);
      map.set(key, value);
      if (map.size > limit) {
        const oldest = map.keys().next().value;
        if (oldest !== undefined) map.delete(oldest);
      }
      return value;
    },
  };
};

const htmlCache = createCache(300);
const plainCache = createCache(500);

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);

/** True only where DOMPurify has a DOM to work with. */
const canSanitize = (): boolean => typeof window !== "undefined" && DOMPurify.isSupported;

/**
 * Sanitises a fragment of rich text. Safe to inject with dangerouslySetInnerHTML.
 *
 * Browser-only by design. The isomorphic build pulls in jsdom (and its native
 * canvas binary, which webpack cannot bundle), and it is not needed: the API
 * sanitises authoritatively on write, and read-mode rich text renders inside
 * modals that only ever mount on the client.
 *
 * Without a DOM the input is ESCAPED rather than returned as-is — failing
 * closed, so a server render can never emit unsanitised markup.
 */
export const sanitizeRichText = (html: string): string => {
  if (!canSanitize()) return escapeHtml(html);
  installHooks();
  return DOMPurify.sanitize(html, PURIFY_CONFIG) as unknown as string;
};

/**
 * Whether a stored value is rich text or legacy plain text.
 *
 * Every description, remark and comment written before this feature is plain
 * text. Rendering those as HTML would silently destroy them — newlines vanish
 * and a literal "<" or "&" is swallowed — so the two are told apart on read and
 * nothing rewrites stored data.
 */
export const isLikelyHtml = (value: string): boolean =>
  /<\/?(?:p|br|div|span|strong|b|em|i|u|s|ol|ul|li|a|h[1-6]|blockquote|pre|code)\b[^>]*>/i.test(value);

/** Bare URLs and www. hosts, stopping before trailing sentence punctuation. */
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"']+[^\s<>"'.,;:!?)\]}]/gi;

/**
 * Escapes plain text and turns bare URLs into links in a single pass.
 *
 * Order matters: escaping first and linkifying afterwards would match against
 * already-escaped entities and produce broken hrefs (a "&amp;" inside a query
 * string), so the split happens on the raw text and each part is escaped for
 * the context it lands in.
 */
export const linkifyPlainText = (text: string): string => {
  let out = "";
  let cursor = 0;

  // Array.from rather than iterating the iterator directly: the tsconfig target
  // predates downlevelIteration.
  for (const match of Array.from(text.matchAll(URL_PATTERN))) {
    const index = match.index ?? 0;
    const raw = match[0];
    out += escapeHtml(text.slice(cursor, index));

    const href = raw.toLowerCase().startsWith("www.") ? `https://${raw}` : raw;
    if (ALLOWED_URI_REGEXP.test(href)) {
      out += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow">${escapeHtml(raw)}</a>`;
    } else {
      out += escapeHtml(raw);
    }
    cursor = index + raw.length;
  }

  return out + escapeHtml(text.slice(cursor));
};

/**
 * Links bare URLs inside already-sanitised HTML, without touching markup.
 *
 * Walks text nodes only and skips anything already inside an anchor, so an
 * existing link is never nested or rewritten. Browser-only: on the server the
 * sanitised HTML is returned unchanged, which is correct, just not linkified
 * until hydration.
 */
const linkifyHtmlTextNodes = (html: string): string => {
  if (typeof document === "undefined") return html;
  if (!URL_PATTERN.test(html)) {
    URL_PATTERN.lastIndex = 0;
    return html;
  }
  URL_PATTERN.lastIndex = 0;

  const host = document.createElement("div");
  host.innerHTML = html;

  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  let current = walker.nextNode() as Text | null;
  while (current) {
    if (!current.parentElement?.closest("a") && URL_PATTERN.test(current.data)) {
      targets.push(current);
    }
    URL_PATTERN.lastIndex = 0;
    current = walker.nextNode() as Text | null;
  }

  targets.forEach((node) => {
    const replacement = document.createElement("span");
    replacement.innerHTML = linkifyPlainText(node.data);
    node.replaceWith(...Array.from(replacement.childNodes));
  });

  return host.innerHTML;
};

/**
 * The single entry point for READ mode. Returns HTML that is safe to inject.
 *
 * Legacy plain text is escaped and linkified; rich text is sanitised and then
 * linkified. Callers must render the result inside `white-space: pre-wrap` so
 * the newlines in legacy plain text survive.
 */
export const toRenderableHtml = (value?: string | null): string => {
  if (!value) return "";
  return htmlCache.get(value, (raw) =>
    isLikelyHtml(raw) ? linkifyHtmlTextNodes(sanitizeRichText(raw)) : linkifyPlainText(raw));
};

const ENTITIES: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&#39;": "'", "&apos;": "'", "&nbsp;": " ",
};

/**
 * Readable text with all markup removed, for surfaces that cannot render HTML:
 * table cells, `title` tooltips, notification bodies, audit-log summaries.
 *
 * Regex rather than a DOM parse, deliberately — this runs per row on every list
 * render, and the result is NOT a security boundary: it is handed to React as a
 * text child, which escapes it. It must never be fed to dangerouslySetInnerHTML.
 */
export const toPlainText = (value?: string | null): string => {
  if (!value) return "";
  return plainCache.get(value, (raw) => {
    if (!isLikelyHtml(raw)) return raw;
    return raw
      .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, "\n")
      .replace(/<[^>]*>/g, "")
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&[a-z]+;/gi, (entity) => ENTITIES[entity.toLowerCase()] ?? entity)
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  });
};

/** True when the value carries no readable text (e.g. Quill's empty "<p><br></p>"). */
export const isRichTextEmpty = (value?: string | null): boolean => toPlainText(value).trim().length === 0;

/** Single-line preview for dense surfaces. */
export const toPreviewText = (value: string | null | undefined, maxLength = 140): string => {
  const text = toPlainText(value).replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
};

/**
 * Prepares a stored value for the EDITOR.
 *
 * Legacy plain text must be converted, not sanitised: handing "R&D budget" to
 * an HTML sanitiser escapes it to "R&amp;D budget", which the editor would then
 * display literally and save back — corrupting the row just by opening the edit
 * modal. Plain text is escaped and its newlines become paragraphs so it arrives
 * looking exactly as it read before.
 */
export const toEditorHtml = (value?: string | null): string => {
  if (!value) return "";
  if (isLikelyHtml(value)) return sanitizeRichText(value);

  return value
    .split(/\r?\n/)
    .map((line) => (line.trim() === "" ? "<p><br></p>" : `<p>${escapeHtml(line)}</p>`))
    .join("");
};
