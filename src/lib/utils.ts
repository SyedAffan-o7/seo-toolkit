import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  }
}

export function normalizeUrl(url: string): string {
  if (!url.startsWith("http")) {
    url = `https://${url}`;
  }
  return url.replace(/\/+$/, "");
}

export function domainMatch(url: string, targetDomain: string): boolean {
  const urlDomain = extractDomain(url);
  return urlDomain === targetDomain || urlDomain.endsWith(`.${targetDomain}`);
}
