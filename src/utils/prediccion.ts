import { HISTORICO_PRIMITIVA } from '../data/primitiva-historico';
import { calcularFrecuenciaNumeros, numerosAtrasados } from './estadisticas';

/** Genera una combinación ponderada por frecuencia histórica */
export function generarCombinacionPonderada(): number[] {
  const freq = calcularFrecuenciaNumeros();
  const pesos = freq.map(f => f.frecuencia);
  const totalPeso = pesos.reduce((a, b) => a + b, 0);

  const seleccionados = new Set<number>();
  while (seleccionados.size < 6) {
    let random = Math.random() * totalPeso;
    for (const f of freq) {
      random -= f.frecuencia;
      if (random <= 0) {
        seleccionados.add(f.numero);
        break;
      }
    }
  }
  return Array.from(seleccionados).sort((a, b) => a - b);
}

/** Genera una combinación basada en números atrasados (los que hace más tiempo no salen) */
export function generarCombinacionAtrasados(): number[] {
  const atrasados = numerosAtrasados();
  return atrasados.slice(0, 6).map(a => a.numero).sort((a, b) => a - b);
}

/** Genera una combinación aleatoria pura (1-49) */
export function generarCombinacionAleatoria(): number[] {
  const nums = new Set<number>();
  while (nums.size < 6) {
    nums.add(Math.floor(Math.random() * 49) + 1);
  }
  return Array.from(nums).sort((a, b) => a - b);
}

/** Genera múltiples combinaciones con diferentes estrategias */
export function generarBoletoEstrategias(): {
  ponderada: number[];
  atrasados: number[];
  aleatoria: number[];
} {
  return {
    ponderada: generarCombinacionPonderada(),
    atrasados: generarCombinacionAtrasados(),
    aleatoria: generarCombinacionAleatoria(),
  };
}
