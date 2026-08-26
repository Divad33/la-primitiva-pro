/**
 * Histórico de resultados de La Primitiva (España)
 * Fuente: Lotoideas.com
 * Período: 1985 – 2026
 * Total de sorteos: 4175
 */

import type { SorteoPrimitiva } from '../types';

// Importamos el JSON y lo tipamos con un cast seguro
import rawData from './primitiva-historico.json';

export const HISTORICO_PRIMITIVA = rawData as SorteoPrimitiva[];

// Se derivan de los datos reales (en vez de estar hardcodeados) para que nunca
// se desincronicen si primitiva-historico.json se actualiza. El histórico está
// en orden ascendente: el primer sorteo es el más antiguo y el último el más reciente.
export const TOTAL_SORTEOS = HISTORICO_PRIMITIVA.length;
export const FECHA_INICIO = HISTORICO_PRIMITIVA[0]?.fecha ?? '';
export const FECHA_FIN = HISTORICO_PRIMITIVA[HISTORICO_PRIMITIVA.length - 1]?.fecha ?? '';
