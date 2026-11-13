"use client";
import { ago } from "@/lib/hooks";
export default function Live({ at, demo }: { at?: string; demo?: boolean }) {
  return <div className="flex items-center gap-2 text-xs text-mute"><span className={`h-2 w-2 rounded-full ${demo ? "bg-warn" : at ? "bg-up live-dot" : "bg-mute"}`} />{demo ? "DEMO" : at ? "LIVE" : "…"}{at && <span>· updated {ago(at)}</span>}</div>;
}
