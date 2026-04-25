"use client";

import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { githubDark } from "@uiw/codemirror-theme-github";
import { EditorView } from "@codemirror/view";
import type { Extension } from "@codemirror/state";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Language hint from CodeContent.language — drives CodeMirror's
   * tokenizer. Unknown values fall back to no language extension (the
   * editor still works, just without language-aware highlighting). */
  language: string | null | undefined;
};

function langExtension(language: string | null | undefined): Extension[] {
  if (!language) return [];
  const l = language.toLowerCase();
  switch (l) {
    case "ts":
    case "tsx":
      return [javascript({ typescript: true, jsx: l === "tsx" })];
    case "js":
    case "jsx":
      return [javascript({ typescript: false, jsx: l === "jsx" })];
    case "py":
    case "python":
      return [python()];
    case "sql":
      return [sql()];
    default:
      return [];
  }
}

// Override githubDark's defaults so the editor visually merges with the
// surrounding chrome (`bg-[#07080b]`) and matches the typography of the
// Shiki-rendered blocks in `app/blogs/blogs.css` (font-mono, 13px,
// line-height 1.7, padding 1rem 1.2rem).
const blockMatchTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "#d6dde8",
    fontFamily:
      "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "13px",
  },
  // Replace the default browser outline with a 1px cyan inset that
  // reads as a deliberate focus state instead of an OS rectangle. Keeps
  // keyboard users oriented without competing with the editor chrome.
  "&.cm-focused": {
    outline: "none",
    boxShadow: "inset 0 0 0 1px rgba(0, 229, 255, 0.55)",
  },
  ".cm-scroller": {
    fontFamily: "inherit",
    lineHeight: "1.7",
    padding: "1rem 1.2rem",
  },
  ".cm-content": {
    padding: 0,
    caretColor: "#00e5ff",
  },
  ".cm-line": {
    padding: 0,
  },
  ".cm-cursor": {
    borderLeftColor: "#00e5ff",
    borderLeftWidth: "1.5px",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(0, 229, 255, 0.04)",
  },
  ".cm-selectionBackground, .cm-content ::selection, ::selection": {
    backgroundColor: "rgba(0, 229, 255, 0.18)",
  },
  ".cm-matchingBracket, &.cm-focused .cm-matchingBracket": {
    backgroundColor: "rgba(0, 229, 255, 0.18)",
    color: "inherit",
    outline: "1px solid rgba(0, 229, 255, 0.4)",
  },
});

export function CodeEditor({ value, onChange, language }: Props) {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme={githubDark}
      extensions={[blockMatchTheme, ...langExtension(language)]}
      basicSetup={{
        // Drop the editor chrome that doesn't exist in the static markdown
        // code blocks (line numbers, fold gutter, gutter highlight).
        lineNumbers: false,
        foldGutter: false,
        highlightActiveLineGutter: false,
        // Keep the affordances that don't change the visual silhouette:
        // helpful editing behaviour without adding chrome.
        highlightActiveLine: true,
        indentOnInput: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
      }}
      minHeight="240px"
    />
  );
}
