import { addResults, getAllResults, type PrimitivaResult } from './resultsDb';
import { HISTORICO_PRIMITIVA } from '../../data/primitiva-historico';

// URL de tu proxy desplegado en Render (cambiar después del deploy)
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
 * Sincroniza resultados:
 * 1. Carga historial empaquetado si la DB está vacía
 * 2. Obtiene últimos sorteos del proxy online
 */
export async function syncPrimitivaResults(loadBundledIfEmpty = true): Promise<SyncResult> {
  let addedBundled = 0;
  let addedLatest = 0;
  let latestOnline = false;
  let latestDraw: PrimitivaResult | undefined;
  const errors: string[] = [];

  // 1. Cargar historial empaquetado (4,175 sorteos) si la DB está vacía
  if (loadBundledIfEmpty && getAllResults().length === 0) {
    try {
      const bundled = HISTORICO_PRIMITIVA.map(s => ({
        fecha: s.fecha,
        numeros: [...s.numeros],
        complementario: s.complementario,
        reintegro: s.reintegro,
        joker: s.joker,
      }));
      addedBundled = addResults(bundled).length;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'Error cargando historial');
    }
  }

  // 2. Obtener últimos sorteos del proxy online
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

  // Si no hay online, usar el más reciente de la DB
  if (!latestDraw) {
    const all = getAllResults();
    if (all.length > 0) latestDraw = all[0];
  }

  return {
    addedBundled,
    addedLatest,
    total: getAllResults().length,
    latestOnline,
    latestDraw,
    error: errors.length ? errors.join(' | ') : undefined,
  };
}
