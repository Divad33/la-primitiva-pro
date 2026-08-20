import { HISTORICO_PRIMITIVA } from '../../data/primitiva-historico';
import { SorteoPrimitiva } from '../../types';

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
  decada: number; // 0=1-10, 1=11-20, 2=21-30, 3=31-40, 4=41-49
  count: number;
  pct: number;
  numeros: number[];
}

export interface ParImparPattern {
  pattern: string; // ej: "3P3I", "4P2I"
  count: number;
  pct: number;
}

export interface SumaRange {
  range: string; // ej: "100-120"
  count: number;
  pct: number;
}

export interface AdvancedAnalysis {
  // Transiciones: qué número tiende a seguir a otro en sorteos consecutivos
  transitions: NumeroTransitionEntry[];
  strongestTransitionLinks: { from: number; to: number; count: number; pct: number }[];
  lastSorteoTransitions: NumeroTransition[];
  
  // Co-ocurrencia: qué números suelen salir juntos
  coOcurrence: CoOcurrencePair[];
  
  // Análisis por decenas
  decadas: DecadaAnalysis[];
  
  // Patrones par/impar más frecuentes
  parImparPatterns: ParImparPattern[];
  
  // Rangos de suma más frecuentes
  sumaRanges: SumaRange[];
  
  // Último sorteo como referencia
  lastSorteo: SorteoPrimitiva | null;
}

export interface JugadaAvanzada {
  nombre: string;
  estrategia: string;
  numeros: number[];
  confianza: number;
  color: string;
  detalles: string;
}

const MIN_OCCURRENCES = 3;

/**
 * Análisis avanzado inspirado en matrices de transición (Markov)
 * adaptado para La Primitiva (6 números, 1-49)
 */
export function analisisAvanzado(): AdvancedAnalysis {
  const historico = [...HISTORICO_PRIMITIVA];
  const total = historico.length;
  
  if (total === 0) return emptyAnalysis();

  // ========== 1. MATRICES DE TRANSICIÓN ==========
  // Qué número tiende a aparecer en el siguiente sorteo después de otro
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
      if (count > 0) {
        followers.push({ next, count, pct: (count / totalOrigin) * 100 });
      }
    }
    followers.sort((a, b) => b.count - a.count || a.next - b.next);

    const topFive = followers.slice(0, 5);
    const confidence = totalOrigin > 0 
      ? (topFive.reduce((sum, f) => sum + f.count, 0) / totalOrigin) * 100 
      : 0;

    transitionEntries.push({ numero: num, total: totalOrigin, followers: topFive, confidence });

    for (const f of followers) {
      allLinks.push({ from: num, to: f.next, count: f.count, pct: f.pct });
    }
  }

  transitionEntries.sort((a, b) => 
    b.confidence - a.confidence || b.total - a.total || a.numero - b.numero
  );

  const strongestLinks = allLinks
    .sort((a, b) => b.count - a.count || b.pct - a.pct || a.from - b.from || a.to - b.to)
    .slice(0, 15);

  // Predicciones basadas en el último sorteo
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

  // ========== 2. CO-OCURRENCIA (números que salen juntos) ==========
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

  // ========== 3. ANÁLISIS POR DECENAS ==========
  const decadas: DecadaAnalysis[] = [
    { decada: 0, count: 0, pct: 0, numeros: [] }, // 1-10
    { decada: 1, count: 0, pct: 0, numeros: [] }, // 11-20
    { decada: 2, count: 0, pct: 0, numeros: [] }, // 21-30
    { decada: 3, count: 0, pct: 0, numeros: [] }, // 31-40
    { decada: 4, count: 0, pct: 0, numeros: [] }, // 41-49
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

  // ========== 4. PATRONES PAR/IMPAR ==========
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

  // ========== 5. RANGOS DE SUMA ==========
  const sumas = historico.map(s => s.numeros.reduce((a, b) => a + b, 0));
  const sumaRanges: SumaRange[] = [];
  const rangeSize = 20;
  
  for (let start = 20; start <= 260; start += rangeSize) {
    const end = start + rangeSize;
    const count = sumas.filter(s => s >= start && s < end).length;
    if (count > 0) {
      sumaRanges.push({ range: `${start}-${end}`, count, pct: (count / total) * 100 });
    }
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

/**
 * Genera 5 jugadas basadas en análisis avanzado tipo "Triplex"
 */
export function generarJugadasAvanzadas(): JugadaAvanzada[] {
  const analisis = analisisAvanzado();
  const historico = HISTORICO_PRIMITIVA;
  const ultimo = historico[historico.length - 1];
  const freq = calcularFrecuenciaSimple();
  const atrasados = calcularAtrasadosSimple();

  const jugadas: JugadaAvanzada[] = [];

  // === JUGADA 1: Transiciones del Último Sorteo (Markov) ===
  // Basada en qué números suelen seguir a los del último sorteo
  const transicionNums = new Set<number>();
  for (const t of analisis.lastSorteoTransitions.slice(0, 6)) {
    transicionNums.add(t.next);
  }
  // Completar con frecuentes si faltan
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

  // === JUGADA 2: Co-Ocurrencia (Números Gemelos) ===
  // Números que más veces han salido juntos en el mismo sorteo
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

  // === JUGADA 3: Decenas + Frecuencia ===
  // 2 números de cada una de las 3 decenas más frecuentes
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
  // Completar si faltan
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

  // === JUGADA 4: Patrón Par/Impar + Suma Óptima ===
  // El patrón más frecuente (ej: 3P3I) + números cerca de la media
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
    detalles: `Este patrónn aparece en el ${analisis.parImparPatterns[0]?.pct.toFixed(1)}% de los sorteos`,
  });

  // === JUGADA 5: Atrasados + Transiciones Fuertes ===
  // 3 números atrasados + 3 números de transiciones fuertes
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

  return jugadas;
}

// Helpers simples
function calcularFrecuenciaSimple(): { numero: number; frecuencia: number }[] {
  const freq = new Map<number, number>();
  for (let i = 1; i <= 49; i++) freq.set(i, 0);
  HISTORICO_PRIMITIVA.forEach(s => s.numeros.forEach(n => freq.set(n, (freq.get(n) || 0) + 1)));
  return Array.from(freq.entries()).map(([numero, frecuencia]) => ({ numero, frecuencia }))
    .sort((a, b) => b.frecuencia - a.frecuencia);
}

function calcularAtrasadosSimple(): { numero: number; sorteosSinSalir: number }[] {
  const ultima = new Map<number, number>();
  for (let i = 1; i <= 49; i++) ultima.set(i, -1);
  HISTORICO_PRIMITIVA.forEach((s, idx) => s.numeros.forEach(n => ultima.set(n, idx)));
  const total = HISTORICO_PRIMITIVA.length;
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
