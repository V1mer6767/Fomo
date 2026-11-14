import Link from "next/link";
import type { ReactNode } from "react";

/** Tiny safe markdown renderer (headings, bullets, **bold**, *italic*, `code`, [S#] citations). Never injects raw HTML. */
function inline(s: string, cite?: (n: number) => ReactNode): ReactNode[] {
  const out: ReactNode[] = []; const re = /(\*\*[^*]+\*\*|\*[^*\n]+\*|_[^_\n]+_|`[^`]+`|\[S\d+\])/g; let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index)); const t = m[0];
    if (t.startsWith("**")) out.push(<b key={k++}>{t.slice(2, -2)}</b>);
    else if (t.startsWith("`")) out.push(<code key={k++} className="rounded bg-panel2 px-1 text-[12px]">{t.slice(1, -1)}</code>);
    else if (t.startsWith("[S")) { const n = Number(t.slice(2, -1)); out.push(<span key={k++}>{cite ? cite(n) : t}</span>); }
    else out.push(<i key={k++}>{t.slice(1, -1)}</i>);
    last = m.index + t.length;
  }
  if (last < s.length) out.push(s.slice(last)); return out;
}
export default function Md({ text, cite }: { text: string; cite?: (n: number) => ReactNode }) {
  const lines = text.split("\n"); const els: ReactNode[] = []; let list: string[] = []; let k = 0;
  const flush = () => { if (list.length) { els.push(<ul key={k++} className="my-1.5 list-disc space-y-1 pl-5">{list.map((l, i) => <li key={i}>{inline(l, cite)}</li>)}</ul>); list = []; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^\s*[-*•]\s+/.test(l)) { list.push(l.replace(/^\s*[-*•]\s+/, "")); continue; }
    flush();
    if (/^#{1,4}\s/.test(l)) els.push(<div key={k++} className="mt-3 mb-1 font-semibold text-fg">{inline(l.replace(/^#{1,4}\s+/, ""), cite)}</div>);
    else if (l.trim()) els.push(<p key={k++} className="my-1.5">{inline(l, cite)}</p>);
  }
  flush(); return <div className="text-sm leading-relaxed">{els}</div>;
}
export const SourceLink = ({ n, url, title }: { n: number; url?: string; title?: string }) =>
  url ? <a href={url} target="_blank" rel="noopener noreferrer" title={title} className="mx-0.5 rounded bg-info/20 px-1 text-[11px] font-semibold text-info hover:underline">S{n}</a> : <span className="text-mute">[S{n}]</span>;
export { Link };
