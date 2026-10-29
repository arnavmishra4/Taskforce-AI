import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./dsr.module.css";

// The words being heard, in the "hearing" line above the input bar: each new word rises in; when the sentence is
// sent (the live text clears) it settles, then lifts away. `idle` shows while nothing is being heard.

const SETTLE_MS = 600;

export function LiveCaption({ text, idle }: { text: string; idle: ReactNode }) {
  const [settled, setSettled] = useState("");
  const prev = useRef(text);

  useEffect(() => {
    const was = prev.current;
    prev.current = text;
    if (text || !was) {
      setSettled("");
      return undefined;
    }
    setSettled(was);
    const t = setTimeout(() => setSettled(""), SETTLE_MS);
    return () => clearTimeout(t);
  }, [text]);

  if (text) {
    return (
      <span className={styles.hearingText}>
        {text.split(/\s+/).map((word, i) => (
          // keyed by position: words already shown stay put, only new ones rise in
          <span key={i}>
            <span className={styles.captionWord}>{word}</span>{" "}
          </span>
        ))}
      </span>
    );
  }
  if (settled) {
    return (
      <span key={settled} className={`${styles.hearingText} ${styles.captionSettle}`}>
        {settled}
      </span>
    );
  }
  return <>{idle}</>;
}
