import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal, safe Markdown renderer for admin-edited content (headings,
 * paragraphs, lists, bold, italics and links). It builds React elements, so no
 * raw HTML from the database is ever injected into the page.
 */
export function Markdown({ source }: { source: string }) {
  const blocks = source.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return (
    <div className="prose-content">
      {blocks.map((block, i) => renderBlock(block.trim(), i))}
    </div>
  );
}

function renderBlock(block: string, key: number): ReactNode {
  if (!block) return null;
  if (block.startsWith("### ")) return <h3 key={key}>{inline(block.slice(4))}</h3>;
  if (block.startsWith("## ")) return <h2 key={key}>{inline(block.slice(3))}</h2>;
  if (block.startsWith("# ")) return <h2 key={key}>{inline(block.slice(2))}</h2>;
  const lines = block.split("\n");
  if (lines.every((l) => /^[-*] /.test(l))) {
    return <ul key={key}>{lines.map((l, j) => <li key={j}>{inline(l.slice(2))}</li>)}</ul>;
  }
  if (lines.every((l) => /^\d+\. /.test(l))) {
    return <ol key={key}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\d+\. /, ""))}</li>)}</ol>;
  }
  return <p key={key}>{inline(lines.join(" "))}</p>;
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string): ReactNode[] {
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link;
      if (href.startsWith("/")) return <Link key={i} href={href}>{label}</Link>;
      if (/^(https:|mailto:|tel:)/.test(href)) {
        return <a key={i} href={href} rel="noopener noreferrer" target={href.startsWith("https:") ? "_blank" : undefined}>{label}</a>;
      }
      return label;
    }
    return part;
  });
}
