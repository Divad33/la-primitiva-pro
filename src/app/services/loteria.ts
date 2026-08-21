import { Preferences } from '@capacitor/preferences';
import { HISTORICO_PRIMITIVA } from '../../data/primitiva-historico';
import { SorteoPrimitiva } from '../../types';
import { syncPrimitivaResults } from './primitivaSync';
import { getAllResults } from './resultsDb';

const STORAGE_KEY = 'sorteos_nuevos';

// Fallback: usar Capacitor Preferences para móvil
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
 * OBTENER HISTÓRICO COMPLETO: DB local + empaquetado
 */
export function obtenerHistoricoCompleto(): SorteoPrimitiva[] {
  // Usar la nueva DB local (localStorage) que ya incluye el empaquetado + online
  const dbResults = getAllResults();
  
  if (dbResults.length > 0) {
    return dbResults.map(r => ({
      fecha: r.fecha,
      numeros: r.numeros as [number, number, number, number, number, number],
      complementario: r.complementario,
      reintegro: r.reintegro,
      joker: r.joker,
    }));
  }

  // Fallback: solo el empaquetado
  return [...HISTORICO_PRIMITIVA];
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
