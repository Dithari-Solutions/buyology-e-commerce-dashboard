import { env } from "../config/env";

/**
 * Resolves a media path returned by the API into a usable <img>/<video> src.
 *
 * The backend may return either:
 *   - a fully-qualified URL (e.g. a presigned S3/Contabo link starting with
 *     `https://…`), which must be used verbatim, or
 *   - a relative path (e.g. `/uploads/foo.png`), which must be prefixed with
 *     the API base URL.
 *
 * Blindly prefixing the API base onto an already-absolute URL produces a broken
 * `https://api…https://storage…` src, which is why media only rendered alt text.
 */
export function getImageUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }
  return `${env.apiBaseUrl}${path.startsWith("/") ? "" : "/"}${path}`;
}
