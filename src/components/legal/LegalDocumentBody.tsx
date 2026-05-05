"use client";

import { Fragment, type ReactNode } from "react";

const URL_OR_EMAIL =
  /(https?:\/\/[^\s<]+[^\s<.,;)\]'"]*|\b[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}\b)/g;

function linkify(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(URL_OR_EMAIL);
  const out: ReactNode[] = [];
  let n = 0;
  for (const part of parts) {
    if (!part) continue;
    const key = `${keyPrefix}-lk-${n++}`;
    if (/^https?:\/\//.test(part)) {
      out.push(
        <a
          key={key}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-amber-900 underline-offset-2 hover:underline"
        >
          {part}
        </a>,
      );
    } else if (/^[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(part)) {
      out.push(
        <a key={key} href={`mailto:${part}`} className="font-medium text-amber-900 underline-offset-2 hover:underline">
          {part}
        </a>,
      );
    } else {
      out.push(<Fragment key={key}>{part}</Fragment>);
    }
  }
  return out;
}

function renderParagraphs(raw: string, keyPrefix: string): ReactNode[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const blocks = trimmed.split(/\n\n+/);
  const out: ReactNode[] = [];
  let bi = 0;
  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const allDash = lines.every((l) => l.startsWith("- "));
    const allNum = lines.every((l) => /^\d+\.\s/.test(l));
    const k = `${keyPrefix}-b${bi++}`;
    if (allDash) {
      out.push(
        <ul key={k}>
          {lines.map((l, j) => (
            <li key={`${k}-li-${j}`}>{linkify(l.slice(2).trim(), `${k}-li-${j}`)}</li>
          ))}
        </ul>,
      );
    } else if (allNum) {
      out.push(
        <ol key={k}>
          {lines.map((l, j) => (
            <li key={`${k}-oli-${j}`}>{linkify(l.replace(/^\d+\.\s*/, "").trim(), `${k}-oli-${j}`)}</li>
          ))}
        </ol>,
      );
    } else {
      out.push(
        <p key={k} className="whitespace-pre-line">
          {linkify(block.trim(), `${k}-p`)}
        </p>,
      );
    }
  }
  return out;
}

function renderCalloutBlockInner(inner: string, keyPrefix: string) {
  const innerLines = inner.split("\n").map((l) => l.trim()).filter(Boolean);
  const allDash = innerLines.length > 0 && innerLines.every((l) => l.startsWith("- "));
  if (allDash) {
    return (
      <ul className="list-disc space-y-2.5 pl-5 marker:text-neutral-400">
        {innerLines.map((l, j) => (
          <li key={`${keyPrefix}-li-${j}`}>{linkify(l.slice(2).trim(), `${keyPrefix}-li-${j}`)}</li>
        ))}
      </ul>
    );
  }
  return <>{renderParagraphs(inner, `${keyPrefix}-cp`)}</>;
}

function renderBodyWithCallouts(body: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let pos = 0;
  const re = /\n+:::CALLOUT\n([\s\S]*?)\n:::\n?/g;
  let m: RegExpExecArray | null;
  let bi = 0;
  while ((m = re.exec(body)) !== null) {
    if (m.index > pos) {
      nodes.push(...renderParagraphs(body.slice(pos, m.index), `${keyPrefix}-bp${bi}`));
    }
    const inner = m[1]?.trim() ?? "";
    nodes.push(
      <div key={`${keyPrefix}-cal-${bi}`} className="space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-3 text-sm leading-relaxed text-amber-950">
        {renderCalloutBlockInner(inner, `${keyPrefix}-ci-${bi}`)}
      </div>,
    );
    pos = m.index + m[0].length;
    bi++;
  }
  if (pos < body.length) {
    nodes.push(...renderParagraphs(body.slice(pos), `${keyPrefix}-tail`));
  }
  return nodes;
}

function renderIntro(intro: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = intro.trimStart();
  let i = 0;
  while (rest.length) {
    const lead = rest.match(/^\n*:::LEAD\n([\s\S]*?)\n:::\n?/);
    if (lead) {
      nodes.push(
        <p key={`${keyPrefix}-lead-${i}`} className="text-base font-medium text-neutral-900">
          {linkify(lead[1].trim(), `${keyPrefix}-lead-${i}`)}
        </p>,
      );
      rest = rest.slice(lead[0].length).trimStart();
      i++;
      continue;
    }
    const cal = rest.match(/^\n*:::CALLOUT\n([\s\S]*?)\n:::\n?/);
    if (cal) {
      const inner = cal[1]?.trim() ?? "";
      nodes.push(
        <div key={`${keyPrefix}-ical-${i}`} className="rounded-xl border border-neutral-200/95 bg-white px-4 py-4 text-sm leading-relaxed text-neutral-800 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
          {renderCalloutBlockInner(inner, `${keyPrefix}-ical-${i}`)}
        </div>,
      );
      rest = rest.slice(cal[0].length).trimStart();
      i++;
      continue;
    }
    const idx = rest.search(/\n+:::((?:LEAD|CALLOUT))\n/);
    if (idx === -1) {
      nodes.push(...renderParagraphs(rest, `${keyPrefix}-rest-${i}`));
      break;
    }
    if (idx > 0) {
      nodes.push(...renderParagraphs(rest.slice(0, idx), `${keyPrefix}-pre-${i}`));
    }
    rest = rest.slice(idx).replace(/^\n+/, "").trimStart();
    i++;
  }
  return nodes;
}

/** Kanonik düz metin yasal içeriği LegalLayout tipografisiyle gösterir (`## ` başlıklar, :::CALLOUT / :::LEAD blokları). */
export function LegalDocumentBody({ text }: { text: string }) {
  const sections = text.split(/\n## /);
  const intro = sections[0] ?? "";
  const keyBase = "ldoc";
  const out: ReactNode[] = [];
  out.push(...renderIntro(intro, `${keyBase}-intro`));
  for (let s = 1; s < sections.length; s++) {
    const part = sections[s] ?? "";
    const lines = part.split("\n");
    const title = (lines.shift() ?? "").trim();
    const body = lines.join("\n").trim();
    out.push(<h2 key={`${keyBase}-h2-${s}`}>{title}</h2>);
    if (body) out.push(...renderBodyWithCallouts(body, `${keyBase}-sec-${s}`));
  }
  return <>{out}</>;
}
