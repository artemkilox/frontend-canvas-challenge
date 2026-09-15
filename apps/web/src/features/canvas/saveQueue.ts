export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'conflict';

export function createSaveQueue<T>(params: {
  debounceMs: number;
  getSnapshot: () => T;
  getEtag: () => string;
  put: (snapshot: T, etag: string) => Promise<string>;
  onStatus: (status: SaveStatus) => void;
  onEtag: (etag: string) => void;
  isConflict: (error: unknown) => boolean;
}) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();
  let dirty = false;
  let stopped = false;
  let conflict = false;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function schedule() {
    if (stopped || conflict) {
      return;
    }
    dirty = true;
    params.onStatus('dirty');
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      void enqueue();
    }, params.debounceMs);
  }

  function enqueue(): Promise<boolean> {
    const job = chain.then(pump, pump);
    chain = job.then(
      () => undefined,
      () => undefined,
    );
    return job;
  }

  async function pump(): Promise<boolean> {
    if (stopped || conflict) {
      return false;
    }
    while (dirty && !conflict && !stopped) {
      dirty = false;
      const snapshot = params.getSnapshot();
      const etag = params.getEtag();
      params.onStatus('saving');
      try {
        const nextEtag = await params.put(snapshot, etag);
        params.onEtag(nextEtag);
        if (!dirty && !conflict) {
          params.onStatus('saved');
        }
      } catch (error) {
        dirty = true;
        if (params.isConflict(error)) {
          conflict = true;
          params.onStatus('conflict');
          return false;
        }
        params.onStatus('error');
        throw error;
      }
    }
    return !dirty && !conflict;
  }

  return {
    schedule,
    async flush(): Promise<boolean> {
      clearTimer();
      if (stopped || conflict) {
        return false;
      }
      if (!dirty) {
        try {
          await chain;
        } catch {
          return false;
        }
        return !conflict;
      }
      try {
        return await enqueue();
      } catch {
        return false;
      }
    },
    markConflict() {
      conflict = true;
      params.onStatus('conflict');
    },
    clearConflict() {
      conflict = false;
    },
    stop() {
      stopped = true;
      clearTimer();
    },
  };
}
