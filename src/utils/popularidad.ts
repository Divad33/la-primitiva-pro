/**
 * Puntuación "anti-popularidad" de una combinación.
 *
 * Esto NO mejora la probabilidad de acertar - es matemáticamente imposible,
 * cada combinación de 6 números tiene exactamente la misma probabilidad de
 * salir. Lo que SÍ se puede optimizar es el valor esperado del premio EN
 * CASO de acertar: si el premio se reparte entre todos los que jugaron la
 * misma combinación ganadora, jugar números que mucha otra gente también
 * elige (fechas de cumpleaños, patrones visuales en el boleto) reduce lo
 * que te llevarías si ganas, porque lo compartirías con más gente.
 *
 * Es un patrón bien documentado en loterías de todo el mundo: la gente
 * tiende a elegir:
 *  - Números del 1 al 31 (posibles días del mes / cumpleaños)
 *  - Secuencias con patrón visual en el boleto (progresiones aritméticas,
 *    números redondos, múltiplos de 5 o 10)
 *  - Menos números altos (32-49), que por eso están estructuralmente
 *    infrarrepresentados en las combinaciones de otros jugadores
 *
 * Esta puntuación va de 0 (patrón muy poco elegido por otros - "propio") a
 * 100 (patrón muy típico - "popular"). Sirve para decidir ENTRE
 * combinaciones que ya consideras igual de buenas, no para generar nuevas.
 */

export interface AnalisisPopularidad {
  score: number; // 0-100, mayor = más "popular" entre otros jugadores
  motivos: string[]; // explicación legible de por qué sube o baja el score
}

export function analizarPopularidad(numeros: number[]): AnalisisPopularidad {
  if (numeros.length !== 6) {
    return { score: 0, motivos: ['Se requieren exactamente 6 números'] };
  }

  const ordenados = [...numeros].sort((a, b) => a - b);
  let score = 0;
  const motivos: string[] = [];

  // 1. Cuántos números son "fecha-compatibles" (1-31)
  const enRangoFechas = ordenados.filter(n => n <= 31).length;
  if (enRangoFechas >= 5) {
    score += 35;
    motivos.push(`${enRangoFechas} de 6 números son ≤31 (rango de días/meses, típico de cumpleaños)`);
  } else if (enRangoFechas === 4) {
    score += 20;
    motivos.push(`${enRangoFechas} de 6 números son ≤31`);
  } else if (enRangoFechas <= 2) {
    motivos.push(`Solo ${enRangoFechas} de 6 números son ≤31 - poco típico de selección por fechas`);
  }

  // 2. Progresión aritmética (diferencia constante entre números consecutivos)
  const diffs = ordenados.slice(1).map((n, i) => n - ordenados[i]);
  const diffsIguales = diffs.every(d => d === diffs[0]);
  if (diffsIguales && diffs[0] > 0) {
    score += 25;
    motivos.push(`Progresión aritmética exacta (paso de ${diffs[0]}) - patrón muy visual en el boleto`);
  }

  // 3. Múltiplos de 5 o 10 (la gente tiende a elegirlos por "verse redondos")
  const multiplosDe5 = ordenados.filter(n => n % 5 === 0).length;
  if (multiplosDe5 >= 3) {
    score += 15;
    motivos.push(`${multiplosDe5} números múltiplos de 5 - más elegidos que el promedio`);
  }

  // 4. Concentración en una sola decena (patrón visual: una columna del boleto)
  const decadas = new Set(ordenados.map(n => Math.floor((n - 1) / 10)));
  if (decadas.size <= 2) {
    score += 15;
    motivos.push('Números muy concentrados en pocas decenas - patrón visual reconocible');
  } else if (decadas.size >= 5) {
    motivos.push('Números bien repartidos entre las 5 decenas - poco típico de selección visual');
  }

  // 5. Ningún número por encima de 40 (la gente rara vez llega tan alto sin pensarlo)
  const tieneNumeroAlto = ordenados.some(n => n > 40);
  if (!tieneNumeroAlto) {
    score += 10;
    motivos.push('Ningún número por encima de 40 - rango donde la gente elige menos');
  }

  return { score: Math.min(100, score), motivos };
}
