import { addResults, getAllResults, type PrimitivaResult } from './resultsDb';

const PROXY_URL = 'https://la-primitiva-proxy.onrender.com/primitiva/latest';

export interface SyncResult {
  addedLatest: number;
  total: number;
  latestOnline: boolean;
  latestDraw?: PrimitivaResult;
  error?: string;
}

export async function syncPrimitivaResults(): Promise<SyncResult> {
  let addedLatest = 0;
  let latestOnline = false;
  let latestDraw: PrimitivaResult | undefined;
  const errors: string[] = [];

  try {
    console.log('[SYNC] Fetching proxy:', PROXY_URL);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[SYNC] Timeout! Abortando fetch...');
      controller.abort();
    }, 30000);

    const response = await fetch(PROXY_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    console.log('[SYNC] Proxy status:', response.status);

    if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);

    const data = await response.json();
    console.log('[SYNC] Proxy data:', JSON.stringify(data).slice(0, 400));

    const results = data.results as Array<{
      fecha: string;
      numeros: number[];
      complementario: number;
      reintegro: number | null;
      joker: number | null;
    }>;

    if (results && results.length > 0) {
      const mapped = results.map(r => ({
        fecha: r.fecha,
        numeros: r.numeros,
        complementario: r.complementario,
        reintegro: r.reintegro,
        joker: r.joker,
      }));
      addedLatest = (await addResults(mapped)).length;
      latestOnline = true;
      const all = await getAllResults();
      latestDraw = all[0];
      console.log('[SYNC] Added:', addedLatest, 'Total:', all.length);
    } else {
      console.log('[SYNC] Proxy respondió pero sin resultados');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[SYNC] Error:', msg);
    errors.push(msg);
  }

  if (!latestDraw) {
    const all = await getAllResults();
    if (all.length > 0) latestDraw = all[0];
  }

  const total = (await getAllResults()).length;
  return {
    addedLatest,
    total,
    latestOnline,
    latestDraw,
    error: errors.length ? errors.join(' | ') : undefined,
  };
}
