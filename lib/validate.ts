/** Input validation shared by forms (client) and API routes (server). Return an error string or null. */
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function validateEmail(v: string): string | null {
  const s = v.trim();
  if (!s) return "Enter your email address.";
  if (s.length > 254 || !EMAIL_RE.test(s)) return "Enter a valid email address.";
  return null;
}
export function validatePassword(v: string): string | null {
  if (v.length < 8) return "Password must be at least 8 characters.";
  if (v.length > 72) return "Password must be at most 72 characters.";
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return "Use at least one letter and one number.";
  return null;
}
export function validateConfirm(p: string, c: string): string | null { return p === c ? null : "Passwords do not match."; }
export function cleanDisplayName(v: string): string { return v.replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim(); }
export function validateDisplayName(v: string): string | null {
  const s = cleanDisplayName(v);
  if (s.length < 1) return "Display name cannot be empty.";
  if (s.length > 50) return "Display name must be at most 50 characters.";
  return null;
}
/** Only same-site relative paths are allowed as post-login redirect targets (prevents open redirects). */
export function safeNext(v: string | null | undefined, fallback = "/"): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.includes("\\") || /[\u0000-\u001f]/.test(v)) return fallback;
  return v;
}
export const AVATAR_MAX_DATA_URL = 60_000;
export function validateAvatarDataUrl(v: string): string | null {
  if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) return "Avatar must be a PNG, JPEG or WebP image.";
  if (v.length > AVATAR_MAX_DATA_URL) return "Avatar image is too large.";
  return null;
}
