import { NextResponse } from "next/server";
import type { ApiEnvelope } from "./types";
export const env = <T,>(data: T, source: string, extra: Partial<ApiEnvelope<T>> = {}): NextResponse =>
  NextResponse.json({ data, source, fetchedAt: new Date().toISOString(), ...extra } satisfies ApiEnvelope<T>, { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } });
export const fail = (msg: string, status = 500) => NextResponse.json({ error: msg }, { status });
