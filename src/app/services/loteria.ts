import { Preferences } from '@capacitor/preferences';
import { HISTORICO_PRIMITIVA } from '../../data/primitiva-historico';
import { SorteoPrimitiva } from '../../types';
import { syncPrimitivaResults } from './primitivaSync';
import { getAllResults } from './resultsDb';

const STORAGE_KEY = 'sorteos_nuevos';

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
 * Orden estándar del histórico en toda la app: ASCENDENTE (más antiguo -> más reciente).
 * Es el mismo orden que ya usa HISTORICO_PRIMITIVA y que asumen utils/estadisticas.ts,
 * utils/prediccion.ts y app/services/analisis-avanzado.ts (p. ej. "el último sorteo" se
 * calcula como historico[historico.length - 1]). Si esta función se cambia a orden
 * descendente, hay que actualizar también esos consumidores o los cálculos de
 * "números atrasados" y "transiciones Markov" quedarán invertidos.
 */
export async function obtenerHistoricoCompleto(): Promise<SorteoPrimitiva[]> {
  const dbResults = await getAllResults();

  const locales = dbResults.map((r: { fecha: string; numeros: number[]; complementario: number; reintegro: number | null; joker: number | null }) => ({
    fecha: r.fecha,
    numeros: r.numeros as [number, number, number, number, number, number],
    complementario: r.complementario,
    reintegro: r.reintegro,
    joker: r.joker,
  }));

  const mapa = new Map<string, SorteoPrimitiva>();

  for (const s of HISTORICO_PRIMITIVA) {
    mapa.set(s.fecha, s);
  }

  for (const s of locales) {
    mapa.set(s.fecha, s);
  }

  return Array.from(mapa.values()).sort((a, b) => {
    const [da, ma, ya] = a.fecha.split('/').map(Number);
    const [db, mb, yb] = b.fecha.split('/').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });
}

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
