/** Representa un sorteo individual de La Primitiva */
export interface SorteoPrimitiva {
  /** Fecha del sorteo en formato DD/MM/YYYY */
  fecha: string;
  /** Números principales (6 de 49), ordenados ascendente */
  numeros: [number, number, number, number, number, number];
  /** Número complementario (1-49) */
  complementario: number;
  /** Reintegro (0-9). null si no disponible en sorteos antiguos */
  reintegro: number | null;
  /** Número Joker (7 dígitos). null si no disponible en sorteos antiguos */
  joker: number | null;
}

/** Frecuencia acumulada de un número */
export interface FrecuenciaNumero {
  numero: number;
  frecuencia: number;
  porcentaje: number;
}

/** Estadísticas globales del histórico */
export interface EstadisticasGlobales {
  totalSorteos: number;
  fechaInicio: string;
  fechaFin: string;
  frecuenciaNumeros: FrecuenciaNumero[];
  frecuenciaComplementarios: FrecuenciaNumero[];
  frecuenciaReintegros: FrecuenciaNumero[];
  numerosCalientes: number[];   // Top 10 más frecuentes
  numerosFrios: number[];      // Top 10 menos frecuentes
  numerosMasAtrasados: { numero: number; sorteosSinSalir: number }[];
  paresImpares: { pares: number; impares: number };
  sumaMedia: number;
  sumaMinima: number;
  sumaMaxima: number;
}

/** Filtros para buscar sorteos */
export interface FiltroSorteo {
  anio?: number;
  numero?: number;
  complementario?: number;
  reintegro?: number;
  desde?: string; // DD/MM/YYYY
  hasta?: string; // DD/MM/YYYY
}
