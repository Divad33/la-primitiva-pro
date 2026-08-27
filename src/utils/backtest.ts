import type { SorteoPrimitiva } from '../types';

/**
 * Backtesting honesto de estrategias de generación de jugadas.
 *
 * IMPORTANTE - léelo antes de usar este módulo:
 * Cada sorteo de La Primitiva es un evento independiente y equiprobable.
 * Ninguna estrategia basada en el histórico puede predecir el siguiente
 * sorteo con más precisión que elegir 6 números al azar; matemáticamente
 * no puede ser de otra forma en un juego de azar puro. Este módulo NO
 * busca "encontrar la estrategia ganadora" (no existe): existe para
 * demostrarlo con datos reales y de forma honesta, comparando cualquier
 * estrategia contra una selección aleatoria bajo las mismas condiciones.
 *
 * La parte técnicamente importante es que la comparación se hace con
 * "validación hacia adelante" (walk-forward): para evaluar la jugada que
 * una estrategia habría generado para el sorteo N, solo se le entregan los
 * sorteos 0..N-1 (los anteriores a N). Nunca se usa información del propio
 * sorteo N ni de sorteos posteriores. Sin esta precaución, cualquier
 * backtest de una lotería (o de cualquier serie temporal) queda
 * contaminado por "fuga de información del futuro" y sus resultados no
 * significan nada.
 */

/** Una estrategia de backtest recibe SOLO el histórico anterior al sorteo a evaluar */
export type EstrategiaBacktest = (historicoPrevio: SorteoPrimitiva[]) => number[];

export interface ResultadoBacktest {
  /** Sorteos realmente evaluados (excluye los primeros `minHistorico`, que se usan solo como semilla) */
  totalSorteosEvaluados: number;
  /** Cuántas veces la estrategia acertó 0, 1, 2, 3, 4, 5 o 6 números */
  distribucionAciertos: Record<number, number>;
  /** Promedio de aciertos por jugada de la estrategia */
  aciertosPromedio: number;
  /** Mismo experimento, pero con una jugada elegida al azar en cada sorteo (control) */
  comparativaAleatoria: {
    distribucionAciertos: Record<number, number>;
    aciertosPromedio: number;
  };
  /**
   * Diferencia entre aciertosPromedio y el promedio del control aleatorio.
   * Un valor cercano a 0 confirma lo esperado: la estrategia no le gana al
   * azar. Valores lejos de 0 en una muestra grande serían muy sorprendentes
   * y merecerían revisar el código en busca de fuga de información, no
   * publicar la estrategia como "ganadora".
   */
  diferenciaVsAleatoria: number;
}

function distribucionVacia(): Record<number, number> {
  return { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
}

function combinacionAleatoria(): number[] {
  const seleccionados = new Set<number>();
  while (seleccionados.size < 6) {
    seleccionados.add(1 + Math.floor(Math.random() * 49));
  }
  return Array.from(seleccionados);
}

/**
 * Ejecuta el backtest de una estrategia sobre el histórico completo.
 *
 * @param historico Histórico completo, en orden ascendente (más antiguo -> más reciente)
 * @param estrategia Función que, dado el histórico previo a un sorteo, devuelve 6 números
 * @param minHistorico Cuántos sorteos iniciales se usan solo como "semilla" antes de
 *   empezar a evaluar (con muy poco histórico las estrategias basadas en frecuencia son
 *   poco significativas). Por defecto 500.
 */
export function backtestEstrategia(
  historico: SorteoPrimitiva[],
  estrategia: EstrategiaBacktest,
  minHistorico = 500
): ResultadoBacktest {
  const distribucionAciertos = distribucionVacia();
  const distribucionAleatoria = distribucionVacia();
  let evaluados = 0;
  let sumaAciertos = 0;
  let sumaAciertosAleatoria = 0;

  const inicio = Math.min(minHistorico, historico.length);

  for (let i = inicio; i < historico.length; i++) {
    // Solo se le pasa el histórico ANTERIOR al sorteo i - nunca el propio
    // sorteo i ni ninguno posterior. Esto es lo que hace válido el backtest.
    const historicoPrevio = historico.slice(0, i);
    const resultadoReal = new Set(historico[i].numeros);

    const jugada = estrategia(historicoPrevio);
    const aciertos = jugada.filter(n => resultadoReal.has(n)).length;
    distribucionAciertos[aciertos] = (distribucionAciertos[aciertos] || 0) + 1;
    sumaAciertos += aciertos;

    const aleatoria = combinacionAleatoria();
    const aciertosAleatoria = aleatoria.filter(n => resultadoReal.has(n)).length;
    distribucionAleatoria[aciertosAleatoria] = (distribucionAleatoria[aciertosAleatoria] || 0) + 1;
    sumaAciertosAleatoria += aciertosAleatoria;

    evaluados++;
  }

  const aciertosPromedio = evaluados > 0 ? sumaAciertos / evaluados : 0;
  const aciertosPromedioAleatoria = evaluados > 0 ? sumaAciertosAleatoria / evaluados : 0;

  return {
    totalSorteosEvaluados: evaluados,
    distribucionAciertos,
    aciertosPromedio: Number(aciertosPromedio.toFixed(4)),
    comparativaAleatoria: {
      distribucionAciertos: distribucionAleatoria,
      aciertosPromedio: Number(aciertosPromedioAleatoria.toFixed(4)),
    },
    diferenciaVsAleatoria: Number((aciertosPromedio - aciertosPromedioAleatoria).toFixed(4)),
  };
}

/** Estrategia de ejemplo: los 6 números más frecuentes en el histórico previo */
export const estrategiaFrecuencia: EstrategiaBacktest = (historicoPrevio) => {
  const freq = new Map<number, number>();
  for (let i = 1; i <= 49; i++) freq.set(i, 0);
  historicoPrevio.forEach(s => s.numeros.forEach(n => freq.set(n, (freq.get(n) || 0) + 1)));
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, 6)
    .map(([numero]) => numero)
    .sort((a, b) => a - b);
};

/** Estrategia de ejemplo: los 6 números más "atrasados" (más sorteos sin salir) */
export const estrategiaAtrasados: EstrategiaBacktest = (historicoPrevio) => {
  const ultimaAparicion = new Map<number, number>();
  for (let i = 1; i <= 49; i++) ultimaAparicion.set(i, -1);
  historicoPrevio.forEach((s, idx) => s.numeros.forEach(n => ultimaAparicion.set(n, idx)));
  const total = historicoPrevio.length;
  return Array.from(ultimaAparicion.entries())
    .map(([numero, ultIdx]) => ({ numero, sorteosSinSalir: ultIdx >= 0 ? total - 1 - ultIdx : total }))
    .sort((a, b) => b.sorteosSinSalir - a.sorteosSinSalir || a.numero - b.numero)
    .slice(0, 6)
    .map(e => e.numero)
    .sort((a, b) => a - b);
};
