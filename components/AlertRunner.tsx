"use client";
import { useEffect, useRef } from "react";
import { useApi, useQuotes, fmtPrice } from "@/lib/hooks";
import { useAlertLog, useAlertRules } from "@/lib/userdata";

/** Evaluates user-defined alert rules against live data while the app is open. Neutral wording, no urgency, in-app log (+ optional browser notification). */
export default function AlertRunner() {
  const { byId } = useQuotes();
  const news = useApi<{ events: any[] }>("/api/news", 120_000);
  const [rules, setRules] = useAlertRules(); const [log, setLog] = useAlertLog();
  const busy = useRef(false);
  useEffect(() => {
    if (busy.current || !rules.length) return;
    const fired: { id: string; text: string; link?: string }[] = []; let changed = false;
    const next = rules.map(r => {
      if (!r.enabled) return r;
      const q = r.asset ? byId[r.asset] : undefined; let hit = false, text = "";
      if (r.kind === "price-above" && q?.price != null && r.value != null) { hit = q.price >= r.value; text = `${q.symbol} is at ${fmtPrice(q.price)}, at or above your level ${fmtPrice(r.value)}.`; }
      if (r.kind === "price-below" && q?.price != null && r.value != null) { hit = q.price <= r.value; text = `${q.symbol} is at ${fmtPrice(q.price)}, at or below your level ${fmtPrice(r.value)}.`; }
      if (r.kind === "move-24h" && q?.change24h != null && r.value != null) { hit = Math.abs(q.change24h) >= r.value; text = `${q.symbol} 24h change is ${q.change24h.toFixed(2)}% (your threshold ±${r.value}%).`; }
      let link: string | undefined;
      if (r.kind === "news-keyword" && r.keyword) { const e = news.env?.data.events.find((e: any) => e.articles.some((a: any) => (a.title + a.summary).toLowerCase().includes(r.keyword!.toLowerCase()))); if (e) { hit = true; text = `News matching "${r.keyword}": ${e.title}`; link = `/news/${e.id}`; if (r.fired && (r as any).evt === e.id) hit = false; (r as any).evt = e.id; } }
      if (r.kind === "high-importance") { const e = news.env?.data.events.find((e: any) => ["high", "critical"].includes(e.importance) && (!r.asset || e.assets.includes(r.asset))); if (e) { hit = true; text = `High-importance event: ${e.title}`; link = `/news/${e.id}`; if (r.fired && (r as any).evt === e.id) hit = false; (r as any).evt = e.id; } }
      if (hit && !r.fired) { fired.push({ id: r.id + Date.now(), text, link }); changed = true; return { ...r, fired: true };
      }
      if (!hit && r.fired && (r.kind.startsWith("price") || r.kind === "move-24h")) { changed = true; return { ...r, fired: false }; }
      return r;
    });
    if (changed) {
      busy.current = true;
      setRules(next);
      if (fired.length) { setLog([...fired.map(f => ({ ...f, at: new Date().toISOString() })), ...log].slice(0, 100));
        try { if (typeof Notification !== "undefined" && Notification.permission === "granted") fired.forEach(f => new Notification("Trade Info alert", { body: f.text })); } catch {} }
      setTimeout(() => (busy.current = false), 500);
    }
  }, [byId, news.env, rules]); // eslint-disable-line
  return null;
}
