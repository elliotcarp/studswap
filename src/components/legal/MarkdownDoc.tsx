import Link from "next/link";
import type { ReactNode } from "react";

// Minimal renderer for the small, known-shape subset of Markdown used in
// legal/*.md: #/## headings, paragraphs, "- " bullet lists, "---" rules, and
// inline **bold** / [text](url) / *italic*. Not a general-purpose parser,
// deliberately just enough for these three documents, so no markdown
// dependency is needed for content this simple.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on **bold**, [text](url), and *italic*, keeping the delimiters via capture groups.
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g);

  parts.forEach((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return;
    if (part.startsWith("**") && part.endsWith("**")) {
      nodes.push(<strong key={key}>{part.slice(2, -2)}</strong>);
    } else if (part.startsWith("[")) {
      const match = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
      if (match) {
        const [, label, href] = match;
        nodes.push(
          href.startsWith("/") ? (
            <Link key={key} href={href} className="text-riviera underline">
              {label}
            </Link>
          ) : (
            <a key={key} href={href} className="text-riviera underline" target="_blank" rel="noreferrer">
              {label}
            </a>
          )
        );
      } else {
        nodes.push(part);
      }
    } else if (part.startsWith("*") && part.endsWith("*")) {
      nodes.push(
        <em key={key} className="text-gray-500">
          {part.slice(1, -1)}
        </em>
      );
    } else {
      nodes.push(part);
    }
  });

  return nodes;
}

export default function MarkdownDoc({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5">
        {listItems.map((item, i) => (
          <li key={i}>{renderInline(item, `li-${blocks.length}-${i}`)}</li>
        ))}
      </ul>
    );
    listItems = [];
  }

  lines.forEach((rawLine, i) => {
    const line = rawLine.trimEnd();

    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      return;
    }
    flushList();

    if (!line.trim()) return;

    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={i} className="mt-8 text-2xl font-semibold first:mt-0">
          {renderInline(line.slice(2), `h1-${i}`)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={i} className="mt-6 text-lg font-semibold">
          {renderInline(line.slice(3), `h2-${i}`)}
        </h2>
      );
    } else if (line.trim() === "---") {
      blocks.push(<hr key={i} className="my-6 border-gray-200" />);
    } else {
      blocks.push(
        <p key={i} className="text-sm leading-relaxed text-gray-700">
          {renderInline(line, `p-${i}`)}
        </p>
      );
    }
  });
  flushList();

  return <div className="flex flex-col gap-3">{blocks}</div>;
}
