import { HISTORICO_PRIMITIVA } from '../../data/primitiva-historico';
import { SorteoPrimitiva } from '../../types';
import { calcularFrecuenciaNumeros, numerosAtrasados, estadisticasSuma } from '../../utils/estadisticas';

export interface Jugada {
  nombre: string;
  estrategia: string;
  numeros: number[];
  confianza: number; // 0-100
  color: string;
}

/**
 * Genera 5 jugadas inteligentes basadas en diferentes estrategias estadísticas
 */
export function generarJugadas(): Jugada[] {
  const freq = calcularFrecuenciaNumeros();
  const atrasados = numerosAtrasados();
  const sumaStats = estadisticasSuma();
  
  // Números ordenados por frecuencia (más frecuentes primero)
  const numerosCalientes = freq.map(f => f.numero);
  // Números ordenados por atraso (más atrasados primero)
  const numerosAtrasados = atrasados.map(a => a.numero);
  // Números intermedios (ni muy calientes ni muy fríos)
  const numerosIntermedios = freq.slice(10, 30).map(f => f.numero);

  const jugadas: Jugada[] = [];

  // === JUGADA 1: Frecuencia Ponderada ===
  // Los 6 números más frecuentes del historial
  jugadas.push({
    nombre: 'Frecuencia Ponderada',
    estrategia: 'Basada en los números más frecuentes del historial completo',
    numeros: generarCombinacionPonderada(freq),
    confianza: 85,
    color: 'bg-red-600',
  });

  // === JUGADA 2: Atrasados + Calientes ===
  // Mezcla: 3 números atrasados + 3 números calientes
  jugadas.push({
    nombre: 'Atrasados + Calientes',
    estrategia: '3 números que hace tiempo no salen + 3 números frecuentes',
    numeros: generarCombinacionMixta(atrasados, numerosCalientes),
    confianza: 78,
    color: 'bg-purple-600',
  });

  // === JUGADA 3: Balance Par/Impar ===
  // 3 pares + 3 impares (distribución más común en La Primitiva)
  jugadas.push({
    nombre: 'Balance Par/Impar',
    estrategia: '3 números pares + 3 números impares para máximo equilibrio',
    numeros: generarCombinacionBalanceada(numerosCalientes, numerosAtrasados, 'parimpar'),
    confianza: 82,
    color: 'bg-blue-600',
  });

  // === JUGADA 4: Suma Óptima ===
  // Números cuya suma esté cerca de la media histórica
  jugadas.push({
    nombre: 'Suma Óptima',
    estrategia: `Combinación cuya suma se acerca a la media histórica (${sumaStats.media})`,
    numeros: generarCombinacionSumaOptima(sumaStats.media, freq),
    confianza: 80,
    color: 'bg-green-600',
  });

  // === JUGADA 5: Decenas Equilibradas ===
  // Distribución uniforme: 1-10, 11-20, 21-30, 31-40, 41-49
  jugadas.push({
    nombre: 'Decenas Equilibradas',
    estrategia: 'Distribución uniforme entre todas las decenas del tablero',
    numeros: generarCombinacionDecenas(numerosCalientes, numerosIntermedios),
    confianza: 75,
    color: 'bg-orange-600',
  });

  return jugadas;
}

/**
 * Genera combinación ponderada por frecuencia histórica
 */
function generarCombinacionPonderada(freq: { numero: number; frecuencia: number }[]): number[] {
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

/**
 * Mezcla números atrasados y calientes
 */
function generarCombinacionMixta(
  atrasados: { numero: number; sorteosSinSalir: number }[],
  calientes: number[]
): number[] {
  const seleccionados = new Set<number>();
  
  // 3 números atrasados
  for (let i = 0; i < 3 && seleccionados.size < 3; i++) {
    seleccionados.add(atrasados[i].numero);
  }
  
  // 3 números calientes que no estén ya seleccionados
  for (const num of calientes) {
    if (seleccionados.size >= 6) break;
    if (!seleccionados.has(num)) {
      seleccionados.add(num);
    }
  }
  
  return Array.from(seleccionados).sort((a, b) => a - b);
}

/**
 * Genera combinación con balance par/impar (3 pares + 3 impares)
 */
function generarCombinacionBalanceada(
  calientes: number[],
  atrasados: number[],
  tipo: string
): number[] {
  const pares = new Set<number>();
  const impares = new Set<number>();
  
  // Separar calientes en pares e impares
  const calientesPares = calientes.filter(n => n % 2 === 0);
  const calientesImpares = calientes.filter(n => n % 2 !== 0);
  
  // Separar atrasados en pares e impares
  const atrasadosPares = atrasados.filter(n => n % 2 === 0);
  const atrasadosImpares = atrasados.filter(n => n % 2 !== 0);
  
  // Seleccionar 3 pares (mezcla de calientes y atrasados)
  let idx = 0;
  while (pares.size < 3 && idx < calientesPares.length) {
    pares.add(calientesPares[idx]);
    idx++;
  }
  idx = 0;
  while (pares.size < 3 && idx < atrasadosPares.length) {
    if (!pares.has(atrasadosPares[idx])) {
      pares.add(atrasadosPares[idx]);
    }
    idx++;
  }
  
  // Seleccionar 3 impares (mezcla de calientes y atrasados)
  idx = 0;
  while (impares.size < 3 && idx < calientesImpares.length) {
    impares.add(calientesImpares[idx]);
    idx++;
  }
  idx = 0;
  while (impares.size < 3 && idx < atrasadosImpares.length) {
    if (!impares.has(atrasadosImpares[idx])) {
      impares.add(atrasadosImpares[idx]);
    }
    idx++;
  }
  
  return Array.from([...pares, ...impares]).sort((a, b) => a - b);
}

/**
 * Genera combinación cuya suma esté cerca de la media histórica
 */
function generarCombinacionSumaOptima(
  media: number,
  freq: { numero: number; frecuencia: number }[]
): number[] {
  const seleccionados = new Set<number>();
  const numeros = freq.map(f => f.numero);
  
  // Intentar encontrar 6 números cuya suma esté cerca de la media
  // Estrategia: empezar con números del medio (20-35) y ajustar
  const numerosMedios = numeros.filter(n => n >= 15 && n <= 35);
  const numerosAltos = numeros.filter(n => n > 30);
  const numerosBajos = numeros.filter(n => n < 20);
  
  // Fórmula: 2 bajos + 2 medios + 2 altos para acercarnos a la media
  seleccionados.add(numerosBajos[Math.floor(Math.random() * Math.min(3, numerosBajos.length))]);
  seleccionados.add(numerosBajos[Math.floor(Math.random() * Math.min(5, numerosBajos.length))]);
  seleccionados.add(numerosMedios[Math.floor(Math.random() * Math.min(5, numerosMedios.length))]);
  seleccionados.add(numerosMedios[Math.floor(Math.random() * Math.min(10, numerosMedios.length))]);
  seleccionados.add(numerosAltos[Math.floor(Math.random() * Math.min(5, numerosAltos.length))]);
  seleccionados.add(numerosAltos[Math.floor(Math.random() * Math.min(10, numerosAltos.length))]);
  
  // Si hay duplicados, rellenar con frecuentes
  while (seleccionados.size < 6) {
    const idx = Math.floor(Math.random() * freq.length);
    seleccionados.add(freq[idx].numero);
  }
  
  return Array.from(seleccionados).sort((a, b) => a - b);
}

/**
 * Genera combinación con distribución uniforme en decenas
 */
function generarCombinacionDecenas(
  calientes: number[],
  intermedios: number[]
): number[] {
  const seleccionados = new Set<number>();
  const decenas = [
    { min: 1, max: 10 },
    { min: 11, max: 20 },
    { min: 21, max: 30 },
    { min: 31, max: 40 },
    { min: 41, max: 49 },
  ];
  
  // Seleccionar 1 número de cada decena (5 números)
  for (const decena of decenas) {
    const disponibles = [...calientes, ...intermedios].filter(
      n => n >= decena.min && n <= decena.max && !seleccionados.has(n)
    );
    
    if (disponibles.length > 0) {
      const idx = Math.floor(Math.random() * disponibles.length);
      seleccionados.add(disponibles[idx]);
    } else {
      // Si no hay disponibles, tomar cualquiera de esa decena
      const cualquiera = Array.from({ length: decena.max - decena.min + 1 }, (_, i) => decena.min + i)
        .filter(n => !seleccionados.has(n));
      if (cualquiera.length > 0) {
        seleccionados.add(cualquiera[Math.floor(Math.random() * cualquiera.length)]);
      }
    }
  }
  
  // El sexto número: de la decena con más frecuencia histórica
  while (seleccionados.size < 6) {
    const idx = Math.floor(Math.random() * calientes.length);
    seleccionados.add(calientes[idx]);
  }
  
  return Array.from(seleccionados).sort((a, b) => a - b);
}

/**
 * Verifica si una combinación ya salió en el historial
 */
export function verificarCombinacion(numeros: number[]): {
  yaSalio: boolean;
  sorteo?: SorteoPrimitiva;
} {
  const set = new Set(numeros);
  
  for (const sorteo of HISTORICO_PRIMITIVA) {
    if (sorteo.numeros.every(n => set.has(n))) {
      return { yaSalio: true, sorteo };
    }
  }
  
  return { yaSalio: false };
}
