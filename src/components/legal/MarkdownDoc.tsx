import Link from "next/link";
import type { ReactNode } from "react";

// Minimal renderer for the small, known-shape subset of Markdown used in
// legal/*.md: #/## headings, paragraphs, "- " bullet lists, "---" rules,
// "> " blockquotes, "| ... |" tables, and inline **bold** / [text](url) /
// *italic* / `code`. Not a general-purpose parser, deliberately just enough
// for these four documents (tables and `[LEGAL]`/`[DECISION]`/placeholder
// code spans appear throughout all of them, blockquotes open every one) —
// no markdown dependency needed for content this shaped.

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Split on `code`, **bold**, [text](url), and *italic*, keeping the
  // delimiters via capture groups. `code` is checked first so a bare
  // placeholder like `[DATE]` isn't mistaken for a markdown link.
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g);

  parts.forEach((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (!part) return;
    if (part.startsWith("`") && part.endsWith("`")) {
      nodes.push(
        <code key={key} className="rounded bg-gray-100 px-1 py-0.5 text-[0.85em] text-gray-600">
          {part.slice(1, -1)}
        </code>
      );
    } else if (part.startsWith("**") && part.endsWith("**")) {
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

// A GFM-style table row: "| cell | cell |" -> ["cell", "cell"]. The
// separator row ("|---|---|") is detected and skipped by the caller.
function parseTableRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparatorRow(line: string): boolean {
  return /^\|?[\s:|-]+\|?$/.test(line.trim()) && line.includes("-");
}

export default function MarkdownDoc({ markdown }: { markdown: string }) {
  const lines = markdown.split("\n");
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];
  let tableRows: string[][] = [];

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

  function flushTable() {
    if (tableRows.length === 0) return;
    const [head, ...body] = tableRows;
    blocks.push(
      <div key={`table-${blocks.length}`} className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {head.map((cell, i) => (
                <th
                  key={i}
                  className="border-b border-gray-300 px-2 py-1.5 text-left font-semibold text-gray-700"
                >
                  {renderInline(cell, `th-${blocks.length}-${i}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className="border-b border-gray-100 px-2 py-1.5 align-top text-gray-700">
                    {renderInline(cell, `td-${blocks.length}-${r}-${c}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
  }

  lines.forEach((rawLine, i) => {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (!isTableSeparatorRow(trimmed)) tableRows.push(parseTableRow(trimmed));
      return;
    }
    flushTable();

    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      return;
    }
    flushList();

    if (!trimmed || trimmed === ">") return; // bare ">" = a blank line inside a blockquote (e.g. the Annex model form)

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
    } else if (trimmed === "---") {
      blocks.push(<hr key={i} className="my-6 border-gray-200" />);
    } else if (line.startsWith("> ")) {
      blocks.push(
        <blockquote key={i} className="rounded-lg border-l-4 border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {renderInline(line.slice(2), `bq-${i}`)}
        </blockquote>
      );
    } else {
      blocks.push(
        <p key={i} className="text-sm leading-relaxed text-gray-700">
          {renderInline(line, `p-${i}`)}
        </p>
      );
    }
  });
  flushTable();
  flushList();

  return <div className="flex flex-col gap-3">{blocks}</div>;
}
