const STORAGE_KEY_PREFIX = "campusrecruit_favorites_";

export function getFavoriteJobIds(userId: string | number): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function setFavoriteJobIds(userId: string | number, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify([...ids]));
  } catch {}
}

export function toggleFavoriteJobId(userId: string | number, jobId: string): Set<string> {
  const ids = getFavoriteJobIds(userId);
  if (ids.has(jobId)) ids.delete(jobId);
  else ids.add(jobId);
  setFavoriteJobIds(userId, ids);
  return new Set(ids);
}
