const PREFIX = "dash:";
const VERSION = "v1"; // naikkan jika bentuk data berubah
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

interface Envelope<T> {
  t: number;
  d: T;
}

let scope = "anon";

export const setSnapshotScope = (kode: string | null | undefined): void => {
  scope = (kode ?? "").trim() || "anon";
};

const fullKey = (key: string): string => `${PREFIX}${VERSION}:${scope}:${key}`;

export const readSnapshot = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(fullKey(key));
    if (!raw) return null;
    const env = JSON.parse(raw) as Envelope<T>;
    if (Date.now() - env.t > MAX_AGE_MS) return null;
    return env.d;
  } catch {
    return null;
  }
};

export const writeSnapshot = (key: string, value: unknown): void => {
  try {
    const env: Envelope<unknown> = { t: Date.now(), d: value };
    localStorage.setItem(fullKey(key), JSON.stringify(env));
  } catch {
    /* kuota penuh: abaikan */
  }
};

export const clearSnapshots = (): void => {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* abaikan */
  }
};

export const hasSnapshot = (key: string): boolean =>
  readSnapshot<unknown>(key) !== null;

// Tampilkan snapshot segera, lalu ganti dengan data segar.
// apply() tidak dipanggil ulang kalau data segar sama persis dengan snapshot.
export const swr = async <T>(
  key: string,
  fetcher: () => Promise<T>,
  apply: (v: T) => void,
): Promise<void> => {
  const old = readSnapshot<T>(key);
  if (old !== null) apply(old);
  const fresh = await fetcher();
  if (fresh === undefined || fresh === null) return;
  if (old === null || JSON.stringify(old) !== JSON.stringify(fresh)) {
    apply(fresh);
  }
  writeSnapshot(key, fresh);
};
