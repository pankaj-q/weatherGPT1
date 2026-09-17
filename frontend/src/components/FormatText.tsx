"use client";

import { Fragment, ReactNode } from "react";

const BULLET_RE = /^[-•*]\s+(.*)$/;
const NUMBERED_RE = /^\d+[.)]\s+(.*)$/;
const HEADING_RE = /^.{1,64}:\s*$/;

function renderInline(text: string, key: string): ReactNode[] {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    const bold = part.match(/^\*\*(.*)\*\*$/);
    if (bold && bold[1].trim()) {
      return (
        <strong key={`${key}-b${i}`} className="font-semibold text-ink">
          {bold[1]}
        </strong>
      );
    }
    return <Fragment key={`${key}-${i}`}>{part}</Fragment>;
  });
}

export default function FormatText({ text }: { text: string }) {
  const lines = String(text).split("\n");
  const nodes: ReactNode[] = [];
  let bulletGroup = -1;

  lines.forEach((raw, i) => {
    const line = raw.trim();

    if (!line) {
      bulletGroup = -1;
      return;
    }

    const bullet = line.match(BULLET_RE) ?? line.match(NUMBERED_RE);

    if (bullet) {
      const isList = bulletGroup >= 0;
      bulletGroup = i;
      if (!isList) {
        nodes.push(
          <div key={`sp-${i}`} className="mt-1" />,
        );
      }
      nodes.push(
        <li key={`l-${i}`} className="flex items-start gap-2.5">
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-gradient-to-r from-sky to-violet" />
          <span className="min-w-0 flex-1">{renderInline(bullet[1], `b-${i}`)}</span>
        </li>,
      );
      return;
    }

    bulletGroup = -1;

    if (HEADING_RE.test(line)) {
      nodes.push(
        <div key={`h-${i}`} className="mt-2.5 flex items-center gap-2 first:mt-0">
          <span className="h-0.5 w-4 shrink-0 rounded-full bg-sky/60" />
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-sky">
            {renderInline(line, `h-${i}`)}
          </span>
        </div>,
      );
      return;
    }

    nodes.push(
      <p key={`p-${i}`} className="leading-relaxed">
        {renderInline(line, `p-${i}`)}
      </p>,
    );
  });

  return <ul className="space-y-1.5">{nodes}</ul>;
}