import { Preferences } from '@capacitor/preferences';

const RESULTS_KEY = 'la_primitiva_results';

export interface PrimitivaResult {
  id: string;
  fecha: string;
  numeros: number[];
  complementario: number;
  reintegro: number | null;
  joker: number | null;
}

function isResult(r: unknown): r is PrimitivaResult {
  return (
    r != null &&
    typeof r === 'object' &&
    typeof (r as Record<string, unknown>).fecha === 'string' &&
    Array.isArray((r as Record<string, unknown>).numeros)
  );
}

async function readAll(): Promise<PrimitivaResult[]> {
  try {
    const { value } = await Preferences.get({ key: RESULTS_KEY });
    if (!value) return [];
    const parsed: unknown[] = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isResult) : [];
  } catch (e) {
    console.error('[resultsDb] Error leyendo:', e);
    return [];
  }
}

async function persist(results: PrimitivaResult[]): Promise<void> {
  try {
    await Preferences.set({
      key: RESULTS_KEY,
      value: JSON.stringify(results),
    });
  } catch (e) {
    console.warn('[resultsDb] No se pudo persistir:', e);
  }
}

function resultKey(result: Pick<PrimitivaResult, 'fecha'>): string {
  return result.fecha;
}

export async function getAllResults(): Promise<PrimitivaResult[]> {
  const all = await readAll();
  return all.sort((a, b) => {
    const [da, ma, ya] = a.fecha.split('/').map(Number);
    const [db, mb, yb] = b.fecha.split('/').map(Number);
    return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
  });
}

export async function addResult(entry: Omit<PrimitivaResult, 'id'>): Promise<PrimitivaResult> {
  const all = await readAll();
  const item: PrimitivaResult = {
    ...entry,
    id: `primitiva-${entry.fecha.replace(/\//g, '-')}`,
  };
  all.push(item);
  await persist(all);
  return item;
}

export async function addResults(entries: Omit<PrimitivaResult, 'id'>[]): Promise<PrimitivaResult[]> {
  const all = await readAll();
  const existingKeys = new Set(all.map(resultKey));
  const added: PrimitivaResult[] = [];

  for (const entry of entries) {
    if (existingKeys.has(entry.fecha)) continue;
    existingKeys.add(entry.fecha);
    const item: PrimitivaResult = {
      ...entry,
      id: `primitiva-${entry.fecha.replace(/\//g, '-')}`,
    };
    added.push(item);
  }

  all.push(...added);
  await persist(all);
  return added;
}

export async function clearAllResults(): Promise<void> {
  await Preferences.remove({ key: RESULTS_KEY });
}

export async function exportResults(): Promise<string> {
  const results = await getAllResults();
  return JSON.stringify(results, null, 2);
export async function addManualResult(params: {
  fecha: string;
  numeros: number[];
  complementario: number;
  reintegro: number | null;
  joker?: number | null;
}): Promise<PrimitivaResult> {
  return addResult({
    fecha: params.fecha,
    numeros: params.numeros,
    complementario: params.complementario,
    reintegro: params.reintegro,
    joker: params.joker ?? null,
  });
}

}
