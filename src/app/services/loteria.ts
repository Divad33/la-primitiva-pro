import { Preferences } from '@capacitor/preferences';
import { HISTORICO_PRIMITIVA } from '../../data/primitiva-historico';
import { SorteoPrimitiva } from '../../types';
import { syncPrimitivaResults } from './primitivaSync';
import { getAllResults } from './resultsDb';

const STORAGE_KEY = 'sorteos_nuevos';

// Fallback: usar Capacitor Preferences para móvil (sorteos nuevos solo)
export async function obtenerSorteosLocales(): Promise<SorteoPrimitiva[]> {
  const { value } = await Preferences.get({ key: STORAGE_KEY });
  if (!value) return [];
  return JSON.parse(value);
}

export async function guardarSorteo(sorteo: SorteoPrimitiva): Promise<void> {
  const existentes = await obtenerSorteosLocales();
  const yaExiste = existentes.some(s => s.fecha === sorteo.fecha);
  if (yaExiste) return;

  existentes.push(sorteo);
  existentes.sort((a, b) => {
    const [da, ma, ya] = a.fecha.split('/').map(Number);
    const [db, mb, yb] = b.fecha.split('/').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });

  await Preferences.set({
    key: STORAGE_KEY,
    value: JSON.stringify(existentes),
  });
}

/**
 * OBTENER HISTÓRICO COMPLETO: empaquetado + DB local (merge sin duplicados)
 */
export function obtenerHistoricoCompleto(): SorteoPrimitiva[] {
  const dbResults = getAllResults();
  
  // Mapear resultados de la DB local (solo sorteos nuevos del proxy)
  const locales = dbResults.map(r => ({
    fecha: r.fecha,
    numeros: r.numeros as [number, number, number, number, number, number],
    complementario: r.complementario,
    reintegro: r.reintegro,
    joker: r.joker,
  }));

  // Merge con histórico empaquetado y eliminar duplicados por fecha
  const mapa = new Map<string, SorteoPrimitiva>();
  
  // Primero los empaquetados (base histórica)
  for (const s of HISTORICO_PRIMITIVA) {
    mapa.set(s.fecha, s);
  }
  
  // Luego los locales del proxy (sobrescriben si hay colisión)
  for (const s of locales) {
    mapa.set(s.fecha, s);
  }

  // Ordenar por fecha descendente (más reciente primero)
  return Array.from(mapa.values()).sort((a, b) => {
    const [da, ma, ya] = a.fecha.split('/').map(Number);
    const [db, mb, yb] = b.fecha.split('/').map(Number);
    return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
  });
}

/**
 * ACTUALIZAR: Sincroniza con el proxy online
 */
export async function actualizarDesdeProxy(): Promise<{
  nuevo: boolean;
  sorteo: SorteoPrimitiva | null;
  error?: string;
}> {
  const sync = await syncPrimitivaResults();
  
  if (sync.addedLatest > 0 && sync.latestDraw) {
    return {
      nuevo: true,
      sorteo: {
        fecha: sync.latestDraw.fecha,
        numeros: sync.latestDraw.numeros as [number, number, number, number, number, number],
        complementario: sync.latestDraw.complementario,
        reintegro: sync.latestDraw.reintegro,
        joker: sync.latestDraw.joker,
      },
    };
  }

  if (sync.latestDraw) {
    return {
      nuevo: false,
      sorteo: {
        fecha: sync.latestDraw.fecha,
        numeros: sync.latestDraw.numeros as [number, number, number, number, number, number],
        complementario: sync.latestDraw.complementario,
        reintegro: sync.latestDraw.reintegro,
        joker: sync.latestDraw.joker,
      },
      error: sync.error,
    };
  }

  return { nuevo: false, sorteo: null, error: sync.error };
}
