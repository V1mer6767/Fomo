"use client";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
export default function NeedAccount({ title }: { title: string }) {
  const { configured } = useAuth();
  return (<div className="max-w-xl space-y-3"><h1 className="text-2xl font-bold tracking-tight">{title}</h1>
    <div className="card p-5 text-sm text-mute">{configured ? <>Sign in to use this feature. <Link href="/login" className="text-info">Sign in</Link></> : "This feature needs accounts. Configure Supabase (see README) and redeploy."}</div></div>);
}
