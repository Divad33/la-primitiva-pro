/**
 * Histórico de resultados de La Primitiva (España)
 * Fuente: Lotoideas.com
 * Período: 1985 – 2026
 * Total de sorteos: 4175
 */

export interface SorteoPrimitiva {
  fecha: string;
  numeros: [number, number, number, number, number, number];
  complementario: number;
  reintegro: number | null;
  joker: number | null;
}

// Importamos el JSON y lo tipamos con un cast seguro
import rawData from './primitiva-historico.json';

export const HISTORICO_PRIMITIVA = rawData as SorteoPrimitiva[];

export const TOTAL_SORTEOS = 4175;
export const FECHA_INICIO = '17/10/1985';
export const FECHA_FIN = '17/08/2026';

export function sorteosPorAnio(anio: number): SorteoPrimitiva[] {
  return HISTORICO_PRIMITIVA.filter(s => s.fecha.endsWith(`/${anio}`));
}

export function frecuenciaNumeros(): Record<number, number> {
  const freq: Record<number, number> = {};
  for (let i = 1; i <= 49; i++) freq[i] = 0;
  HISTORICO_PRIMITIVA.forEach(s => {
    s.numeros.forEach(n => freq[n]++);
  });
  return freq;
}
