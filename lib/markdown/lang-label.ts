// Friendly display names for the language slugs used in fenced code blocks
// (Shiki) and the course code-exercise editor (CodeMirror). Shared between
// the blog CodeBlock chrome and the course editor chrome so a `ts` block
// and a `ts` exercise both render "TypeScript" in the header.

export const LANG_LABEL: Record<string, string> = {
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  tsx: "TSX",
  jsx: "JSX",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  sh: "Shell",
  bash: "Bash",
  zsh: "Zsh",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  sql: "SQL",
  rust: "Rust",
  go: "Go",
  py: "Python",
  python: "Python",
  md: "Markdown",
  mdx: "MDX",
  dockerfile: "Dockerfile",
  toml: "TOML",
  ini: "INI",
  diff: "Diff",
  text: "Text",
  plaintext: "Text",
};

export function langLabel(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return LANG_LABEL[slug.toLowerCase()] ?? slug.toUpperCase();
}
