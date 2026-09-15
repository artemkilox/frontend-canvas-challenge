function fpKey(slot: string): string {
  return `canvas.idempotency.fp.${slot}`;
}

function valueKey(slot: string): string {
  return `canvas.idempotency.key.${slot}`;
}

export function idempotencyKeyFor(slot: string, fingerprint: string): string {
  if (typeof window === 'undefined') {
    return crypto.randomUUID();
  }
  const storedFp = window.sessionStorage.getItem(fpKey(slot));
  const storedKey = window.sessionStorage.getItem(valueKey(slot));
  if (storedKey && storedFp === fingerprint) {
    return storedKey;
  }
  const key = crypto.randomUUID();
  window.sessionStorage.setItem(fpKey(slot), fingerprint);
  window.sessionStorage.setItem(valueKey(slot), key);
  return key;
}

export function clearIdempotency(slot: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.removeItem(fpKey(slot));
  window.sessionStorage.removeItem(valueKey(slot));
}
