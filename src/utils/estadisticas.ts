import { HISTORICO_PRIMITIVA } from '../data/primitiva-historico';
import { FrecuenciaNumero, EstadisticasGlobales } from '../types';

/** Calcula la frecuencia de cada número principal (1-49) */
export function calcularFrecuenciaNumeros(): FrecuenciaNumero[] {
  const freq = new Map<number, number>();
  for (let i = 1; i <= 49; i++) freq.set(i, 0);

  HISTORICO_PRIMITIVA.forEach(s => {
    s.numeros.forEach(n => freq.set(n, (freq.get(n) || 0) + 1));
  });

  const total = HISTORICO_PRIMITIVA.length * 6;
  return Array.from(freq.entries())
    .map(([numero, frecuencia]) => ({
      numero,
      frecuencia,
      porcentaje: Number(((frecuencia / total) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.frecuencia - a.frecuencia);
}

/** Calcula la frecuencia de complementarios (1-49) */
export function calcularFrecuenciaComplementarios(): FrecuenciaNumero[] {
  const freq = new Map<number, number>();
  for (let i = 1; i <= 49; i++) freq.set(i, 0);

  HISTORICO_PRIMITIVA.forEach(s => {
    freq.set(s.complementario, (freq.get(s.complementario) || 0) + 1);
  });

  const total = HISTORICO_PRIMITIVA.length;
  return Array.from(freq.entries())
    .map(([numero, frecuencia]) => ({
      numero,
      frecuencia,
      porcentaje: Number(((frecuencia / total) * 100).toFixed(2)),
    }))
    .sort((a, b) => b.frecuencia - a.frecuencia);
}

/** Calcula la frecuencia de reintegros (0-9) */
export function calcularFrecuenciaReintegros(): FrecuenciaNumero[] {
  const freq = new Map<number, number>();
  for (let i = 0; i <= 9; i++) freq.set(i, 0);

  let total = 0;
  HISTORICO_PRIMITIVA.forEach(s => {
    if (s.reintegro !== null) {
      freq.set(s.reintegro, (freq.get(s.reintegro) || 0) + 1);
      total++;
    }
  });

  return Array.from(freq.entries())
    .map(([numero, frecuencia]) => ({
      numero,
      frecuencia,
      porcentaje: total > 0 ? Number(((frecuencia / total) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.frecuencia - a.frecuencia);
}

/** Números que hace más sorteos que no salen (atrasados) */
export function numerosAtrasados(): { numero: number; sorteosSinSalir: number }[] {
  const ultimaAparicion = new Map<number, number>();
  for (let i = 1; i <= 49; i++) ultimaAparicion.set(i, -1);

  HISTORICO_PRIMITIVA.forEach((s, idx) => {
    s.numeros.forEach(n => {
      ultimaAparicion.set(n, idx);
    });
  });

  const total = HISTORICO_PRIMITIVA.length;
  return Array.from(ultimaAparicion.entries())
    .map(([numero, ultIdx]) => ({
      numero,
      sorteosSinSalir: ultIdx >= 0 ? total - 1 - ultIdx : total,
    }))
    .sort((a, b) => b.sorteosSinSalir - a.sorteosSinSalir);
}

/** Distribución pares/impares en todo el histórico */
export function distribucionParImpar(): { pares: number; impares: number } {
  let pares = 0;
  let impares = 0;
  HISTORICO_PRIMITIVA.forEach(s => {
    s.numeros.forEach(n => {
      if (n % 2 === 0) pares++;
      else impares++;
    });
  });
  return { pares, impares };
}

/** Estadísticas de la suma de los 6 números */
export function estadisticasSuma(): { media: number; minima: number; maxima: number } {
  const sumas = HISTORICO_PRIMITIVA.map(s => s.numeros.reduce((a, b) => a + b, 0));
  const media = sumas.reduce((a, b) => a + b, 0) / sumas.length;
  return {
    media: Number(media.toFixed(2)),
    minima: Math.min(...sumas),
    maxima: Math.max(...sumas),
  };
}

/** Genera un informe completo de estadísticas */
export function generarEstadisticasCompletas(): EstadisticasGlobales {
  const freqNums = calcularFrecuenciaNumeros();
  const freqComp = calcularFrecuenciaComplementarios();
  const freqReint = calcularFrecuenciaReintegros();
  const atrasados = numerosAtrasados();
  const parImpar = distribucionParImpar();
  const sumaStats = estadisticasSuma();

  return {
    totalSorteos: HISTORICO_PRIMITIVA.length,
    fechaInicio: HISTORICO_PRIMITIVA[0]?.fecha ?? '',
    fechaFin: HISTORICO_PRIMITIVA[HISTORICO_PRIMITIVA.length - 1]?.fecha ?? '',
    frecuenciaNumeros: freqNums,
    frecuenciaComplementarios: freqComp,
    frecuenciaReintegros: freqReint,
    numerosCalientes: freqNums.slice(0, 10).map(f => f.numero),
    numerosFrios: freqNums.slice(-10).map(f => f.numero),
    numerosMasAtrasados: atrasados.slice(0, 10),
    paresImpares: parImpar,
    sumaMedia: sumaStats.media,
    sumaMinima: sumaStats.minima,
    sumaMaxima: sumaStats.maxima,
  };
}
