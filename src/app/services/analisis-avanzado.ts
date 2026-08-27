import { HISTORICO_PRIMITIVA } from '../../data/primitiva-historico';
import { SorteoPrimitiva } from '../../types';
import { analizarPopularidad } from '../../utils/popularidad';

export interface NumeroTransition {
  next: number;
  count: number;
  pct: number;
}

export interface NumeroTransitionEntry {
  numero: number;
  total: number;
  followers: NumeroTransition[];
  confidence: number;
}

export interface CoOcurrencePair {
  pair: [number, number];
  count: number;
  pct: number;
}

export interface DecadaAnalysis {
  decada: number;
  count: number;
  pct: number;
  numeros: number[];
}

export interface ParImparPattern {
  pattern: string;
  count: number;
  pct: number;
}

export interface SumaRange {
  range: string;
  count: number;
  pct: number;
}

export interface AdvancedAnalysis {
  transitions: NumeroTransitionEntry[];
  strongestTransitionLinks: { from: number; to: number; count: number; pct: number }[];
  lastSorteoTransitions: NumeroTransition[];
  coOcurrence: CoOcurrencePair[];
  decadas: DecadaAnalysis[];
  parImparPatterns: ParImparPattern[];
  sumaRanges: SumaRange[];
  lastSorteo: SorteoPrimitiva | null;
}

export interface JugadaAvanzada {
  nombre: string;
  estrategia: string;
  numeros: number[];
  confianza: number;
  color: string;
  detalles: string;
  /**
   * Puntuacion anti-popularidad (0-100, menor = mas "propia"/menos elegida
   * por otros jugadores). No mejora la probabilidad de acertar - eso es
   * imposible en una loteria - pero si mejora el premio esperado EN CASO
   * de acertar, porque compartirias el bote con menos gente. Ver
   * src/utils/popularidad.ts para la explicacion completa.
   */
  popularidad: number;
  motivosPopularidad: string[];
}

const MIN_OCCURRENCES = 3;

export function analisisAvanzado(historico: SorteoPrimitiva[] = HISTORICO_PRIMITIVA): AdvancedAnalysis {
  const total = historico.length;
  if (total === 0) return emptyAnalysis();

  // 1. MATRICES DE TRANSICIÓN
  const transitions: number[][] = Array.from({ length: 50 }, () => Array(50).fill(0));
  const originCounts: number[] = Array(50).fill(0);

  for (let i = 0; i < historico.length - 1; i++) {
    const actual = historico[i].numeros;
    const siguiente = historico[i + 1].numeros;
    for (const numActual of actual) {
      originCounts[numActual]++;
      for (const numSiguiente of siguiente) {
        transitions[numActual][numSiguiente]++;
      }
    }
  }

  const transitionEntries: NumeroTransitionEntry[] = [];
  const allLinks: { from: number; to: number; count: number; pct: number }[] = [];

  for (let num = 1; num <= 49; num++) {
    const totalOrigin = originCounts[num];
    if (totalOrigin < MIN_OCCURRENCES) continue;
    const followers: NumeroTransition[] = [];
    for (let next = 1; next <= 49; next++) {
      const count = transitions[num][next];
      if (count > 0) followers.push({ next, count, pct: (count / totalOrigin) * 100 });
    }
    followers.sort((a, b) => b.count - a.count || a.next - b.next);
    const topFive = followers.slice(0, 5);
    const confidence = totalOrigin > 0 ? (topFive.reduce((sum, f) => sum + f.count, 0) / totalOrigin) * 100 : 0;
    transitionEntries.push({ numero: num, total: totalOrigin, followers: topFive, confidence });
    for (const f of followers) allLinks.push({ from: num, to: f.next, count: f.count, pct: f.pct });
  }

  transitionEntries.sort((a, b) => b.confidence - a.confidence || b.total - a.total || a.numero - b.numero);
  const strongestLinks = allLinks.sort((a, b) => b.count - a.count || b.pct - a.pct || a.from - b.from || a.to - b.to).slice(0, 15);

  const ultimoSorteo = historico[historico.length - 1];
  const lastNumeros = ultimoSorteo.numeros;
  const lastTransitions: NumeroTransition[] = [];
  const seenPred = new Set<number>();
  for (const num of lastNumeros) {
    const entry = transitionEntries.find(e => e.numero === num);
    if (entry) {
      for (const f of entry.followers.slice(0, 3)) {
        if (!seenPred.has(f.next)) {
          seenPred.add(f.next);
          lastTransitions.push(f);
        }
      }
    }
  }
  lastTransitions.sort((a, b) => b.count - a.count);
  const lastSorteoTransitions = lastTransitions.slice(0, 10);

  // 2. CO-OCURRENCIA
  const coOcurrenceMap = new Map<string, number>();
  for (const sorteo of historico) {
    const nums = sorteo.numeros;
    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const pair = [nums[i], nums[j]].sort((a, b) => a - b);
        const key = `${pair[0]}-${pair[1]}`;
        coOcurrenceMap.set(key, (coOcurrenceMap.get(key) || 0) + 1);
      }
    }
  }
  const coOcurrence: CoOcurrencePair[] = [...coOcurrenceMap.entries()]
    .map(([key, count]) => {
      const [a, b] = key.split('-').map(Number);
      return { pair: [a, b] as [number, number], count, pct: (count / total) * 100 };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // 3. DECENAS
  const decadas: DecadaAnalysis[] = [
    { decada: 0, count: 0, pct: 0, numeros: [] },
    { decada: 1, count: 0, pct: 0, numeros: [] },
    { decada: 2, count: 0, pct: 0, numeros: [] },
    { decada: 3, count: 0, pct: 0, numeros: [] },
    { decada: 4, count: 0, pct: 0, numeros: [] },
  ];
  for (const sorteo of historico) {
    for (const num of sorteo.numeros) {
      const d = num <= 10 ? 0 : num <= 20 ? 1 : num <= 30 ? 2 : num <= 40 ? 3 : 4;
      decadas[d].count++;
      if (!decadas[d].numeros.includes(num)) decadas[d].numeros.push(num);
    }
  }
  const totalNumeros = total * 6;
  for (const d of decadas) {
    d.pct = totalNumeros > 0 ? (d.count / totalNumeros) * 100 : 0;
    d.numeros.sort((a, b) => a - b);
  }
  decadas.sort((a, b) => b.count - a.count);

  // 4. PAR/IMPAR
  const parImparMap = new Map<string, number>();
  for (const sorteo of historico) {
    const pares = sorteo.numeros.filter(n => n % 2 === 0).length;
    const impares = 6 - pares;
    const key = `${pares}P${impares}I`;
    parImparMap.set(key, (parImparMap.get(key) || 0) + 1);
  }
  const parImparPatterns: ParImparPattern[] = [...parImparMap.entries()]
    .map(([pattern, count]) => ({ pattern, count, pct: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count);

  // 5. SUMA
  const sumas = historico.map(s => s.numeros.reduce((a, b) => a + b, 0));
  const sumaRanges: SumaRange[] = [];
  const rangeSize = 20;
  for (let start = 20; start <= 260; start += rangeSize) {
    const end = start + rangeSize;
    const count = sumas.filter(s => s >= start && s < end).length;
    if (count > 0) sumaRanges.push({ range: `${start}-${end}`, count, pct: (count / total) * 100 });
  }
  sumaRanges.sort((a, b) => b.count - a.count);

  return {
    transitions: transitionEntries,
    strongestTransitionLinks: strongestLinks,
    lastSorteoTransitions,
    coOcurrence,
    decadas,
    parImparPatterns,
    sumaRanges,
    lastSorteo: ultimoSorteo,
  };
}

export function generarJugadasAvanzadas(historico: SorteoPrimitiva[] = HISTORICO_PRIMITIVA): JugadaAvanzada[] {
  const analisis = analisisAvanzado(historico);
  const ultimo = historico[historico.length - 1];
  const freq = calcularFrecuenciaSimple(historico);
  const atrasados = calcularAtrasadosSimple(historico);

  // Tipo de trabajo sin los campos de popularidad: se calculan al final,
  // una sola vez, sobre las 5 jugadas ya generadas (ver el .map de abajo).
  type JugadaSinPopularidad = Omit<JugadaAvanzada, 'popularidad' | 'motivosPopularidad'>;
  const jugadas: JugadaSinPopularidad[] = [];

  // JUGADA 1: Transiciones Markov
  const transicionNums = new Set<number>();
  for (const t of analisis.lastSorteoTransitions.slice(0, 6)) transicionNums.add(t.next);
  for (const f of freq) {
    if (transicionNums.size >= 6) break;
    transicionNums.add(f.numero);
  }
  jugadas.push({
    nombre: 'Transiciones Markov',
    estrategia: `Números que históricamente siguen a [${ultimo.numeros.join(', ')}]`,
    numeros: Array.from(transicionNums).sort((a, b) => a - b),
    confianza: 88,
    color: 'bg-red-600',
    detalles: 'Basada en matrices de transición entre sorteos consecutivos',
  });

  // JUGADA 2: Co-Ocurrencia
  const coocNums = new Set<number>();
  for (const c of analisis.coOcurrence.slice(0, 8)) {
    coocNums.add(c.pair[0]);
    coocNums.add(c.pair[1]);
    if (coocNums.size >= 6) break;
  }
  jugadas.push({
    nombre: 'Co-Ocurrencia',
    estrategia: 'Números que históricamente salen juntos en el mismo sorteo',
    numeros: Array.from(coocNums).sort((a, b) => a - b).slice(0, 6),
    confianza: 84,
    color: 'bg-purple-600',
    detalles: `Top parejas: ${analisis.coOcurrence.slice(0, 3).map(c => `[${c.pair[0]}-${c.pair[1]}]`).join(', ')}`,
  });

  // JUGADA 3: Decenas Dominantes
  const decadaNums = new Set<number>();
  const topDecadas = analisis.decadas.slice(0, 3);
  for (const d of topDecadas) {
    const numsEnDecada = freq.filter(f =>
      (d.decada === 0 && f.numero <= 10) ||
      (d.decada === 1 && f.numero > 10 && f.numero <= 20) ||
      (d.decada === 2 && f.numero > 20 && f.numero <= 30) ||
      (d.decada === 3 && f.numero > 30 && f.numero <= 40) ||
      (d.decada === 4 && f.numero > 40)
    ).slice(0, 2);
    for (const n of numsEnDecada) decadaNums.add(n.numero);
  }
  for (const f of freq) {
    if (decadaNums.size >= 6) break;
    decadaNums.add(f.numero);
  }
  jugadas.push({
    nombre: 'Decenas Dominantes',
    estrategia: `2 números de cada decena top: ${topDecadas.map(d => d.decada + 1).join(', ')}`,
    numeros: Array.from(decadaNums).sort((a, b) => a - b).slice(0, 6),
    confianza: 82,
    color: 'bg-blue-600',
    detalles: 'Decenas más frecuentes en el historial',
  });

  // JUGADA 4: Patrón Par/Impar
  const topPattern = analisis.parImparPatterns[0]?.pattern || '3P3I';
  const paresNecesarios = parseInt(topPattern[0]);
  const imparesNecesarios = parseInt(topPattern[2]);
  const pares = freq.filter(f => f.numero % 2 === 0).map(f => f.numero).slice(0, paresNecesarios);
  const impares = freq.filter(f => f.numero % 2 !== 0).map(f => f.numero).slice(0, imparesNecesarios);
  jugadas.push({
    nombre: `Patrón ${topPattern}`,
    estrategia: `El patrón más frecuente del historial: ${paresNecesarios} pares + ${imparesNecesarios} impares`,
    numeros: [...pares, ...impares].sort((a, b) => a - b),
    confianza: 86,
    color: 'bg-green-600',
    detalles: `Este patrón aparece en el ${analisis.parImparPatterns[0]?.pct.toFixed(1)}% de los sorteos`,
  });

  // JUGADA 5: Atrasados + Transiciones
  const mixNums = new Set<number>();
  for (const a of atrasados.slice(0, 3)) mixNums.add(a.numero);
  for (const t of analisis.strongestTransitionLinks.slice(0, 6)) {
    mixNums.add(t.to);
    if (mixNums.size >= 6) break;
  }
  jugadas.push({
    nombre: 'Atrasados + Transiciones',
    estrategia: '3 números atrasados + 3 números con transiciones más fuertes',
    numeros: Array.from(mixNums).sort((a, b) => a - b).slice(0, 6),
    confianza: 80,
    color: 'bg-orange-600',
    detalles: 'Mezcla de números fríos con fuertes tendencias de repetición',
  });

  // Cada jugada generada se enriquece con su puntuacion anti-popularidad.
  // No cambia la jugada en si, solo anade informacion para decidir entre
  // jugadas que ya consideras igual de buenas (ver utils/popularidad.ts).
  return jugadas.map(j => {
    const { score, motivos } = analizarPopularidad(j.numeros);
    return { ...j, popularidad: score, motivosPopularidad: motivos };
  });
}

// Helpers simples
function calcularFrecuenciaSimple(historico: SorteoPrimitiva[] = HISTORICO_PRIMITIVA): { numero: number; frecuencia: number }[] {
  const freq = new Map<number, number>();
  for (let i = 1; i <= 49; i++) freq.set(i, 0);
  historico.forEach(s => s.numeros.forEach(n => freq.set(n, (freq.get(n) || 0) + 1)));
  return Array.from(freq.entries()).map(([numero, frecuencia]) => ({ numero, frecuencia }))
    .sort((a, b) => b.frecuencia - a.frecuencia);
}

function calcularAtrasadosSimple(historico: SorteoPrimitiva[] = HISTORICO_PRIMITIVA): { numero: number; sorteosSinSalir: number }[] {
  const ultima = new Map<number, number>();
  for (let i = 1; i <= 49; i++) ultima.set(i, -1);
  historico.forEach((s, idx) => s.numeros.forEach(n => ultima.set(n, idx)));
  const total = historico.length;
  return Array.from(ultima.entries())
    .map(([numero, ultIdx]) => ({ numero, sorteosSinSalir: ultIdx >= 0 ? total - 1 - ultIdx : total }))
    .sort((a, b) => b.sorteosSinSalir - a.sorteosSinSalir);
}

function emptyAnalysis(): AdvancedAnalysis {
  return {
    transitions: [],
    strongestTransitionLinks: [],
    lastSorteoTransitions: [],
    coOcurrence: [],
    decadas: [],
    parImparPatterns: [],
    sumaRanges: [],
    lastSorteo: null,
  };
}
