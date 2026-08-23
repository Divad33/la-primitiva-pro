import { addResults, getAllResults, type PrimitivaResult } from './resultsDb';

// URL de tu proxy desplegado en Render
const PROXY_URL = 'https://la-primitiva-proxy.onrender.com/primitiva/latest';

export interface SyncResult {
  addedBundled: number;
  addedLatest: number;
  total: number;
  latestOnline: boolean;
  latestDraw?: PrimitivaResult;
  error?: string;
}

/**
 * Sincroniza resultados del proxy online.
 * NO carga el histórico empaquetado a la DB local (ya está importado directamente).
 */
export async function syncPrimitivaResults(): Promise<SyncResult> {
  let addedLatest = 0;
  let latestOnline = false;
  let latestDraw: PrimitivaResult | undefined;
  const errors: string[] = [];

  // Obtener últimos sorteos del proxy online
  try {
    const response = await fetch(PROXY_URL);
    if (!response.ok) throw new Error('Proxy no disponible');
    
    const data = await response.json();
    const results = data.results as Array<{
      fecha: string;
      numeros: number[];
      complementario: number;
      reintegro: number | null;
      joker: number | null;
    }>;

    if (results.length > 0) {
      const mapped = results.map(r => ({
        fecha: r.fecha,
        numeros: r.numeros,
        complementario: r.complementario,
        reintegro: r.reintegro,
        joker: r.joker,
      }));
      addedLatest = addResults(mapped).length;
      latestOnline = true;
      latestDraw = getAllResults()[0];
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'Error online');
  }

  // Si no hay online, usar el más reciente de la DB local
  if (!latestDraw) {
    const all = getAllResults();
    if (all.length > 0) latestDraw = all[0];
  }

  return {
    addedBundled: 0,
    addedLatest,
    total: getAllResults().length,
    latestOnline,
    latestDraw,
    error: errors.length ? errors.join(' | ') : undefined,
  };
}
