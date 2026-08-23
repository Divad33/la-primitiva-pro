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

function readAll(): PrimitivaResult[] {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    if (!raw) return [];
    const parsed: unknown[] = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isResult) : [];
  } catch {
    return [];
  }
}

function persist(results: PrimitivaResult[]): void {
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch (e) {
    // Si localStorage está lleno (muy raro con solo sorteos nuevos),
    // no bloquear la app. En producción se puede migrar a IndexedDB.
    console.warn('No se pudo persistir en localStorage:', e);
  }
}

function resultKey(result: Pick<PrimitivaResult, 'fecha'>): string {
  return result.fecha;
}

export function getAllResults(): PrimitivaResult[] {
  return readAll().sort((a, b) => {
    const [da, ma, ya] = a.fecha.split('/').map(Number);
    const [db, mb, yb] = b.fecha.split('/').map(Number);
    return new Date(yb, mb - 1, db).getTime() - new Date(ya, ma - 1, da).getTime();
  });
}

export function addResult(entry: Omit<PrimitivaResult, 'id'>): PrimitivaResult {
  const all = readAll();
  const item: PrimitivaResult = {
    ...entry,
    id: `primitiva-${entry.fecha.replace(/\//g, '-')}`,
  };
  all.push(item);
  persist(all);
  return item;
}

export function addResults(entries: Omit<PrimitivaResult, 'id'>[]): PrimitivaResult[] {
  const all = readAll();
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
  persist(all);
  return added;
}

export function clearAllResults(): void {
  localStorage.removeItem(RESULTS_KEY);
}

export function exportResults(): string {
  return JSON.stringify(getAllResults(), null, 2);
}
