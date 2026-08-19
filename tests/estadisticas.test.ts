import { calcularFrecuenciaNumeros, numerosAtrasados, distribucionParImpar, estadisticasSuma } from '../src/utils/estadisticas';
import { filtrarSorteos, buscarCombinacion, ultimosSorteos } from '../src/utils/filtros';
import { TOTAL_SORTEOS } from '../src/data/primitiva-historico';

describe('Estadísticas de La Primitiva', () => {
  test('debe calcular frecuencias para los 49 números', () => {
    const freq = calcularFrecuenciaNumeros();
    expect(freq).toHaveLength(49);
    expect(freq[0].numero).toBeGreaterThanOrEqual(1);
    expect(freq[0].numero).toBeLessThanOrEqual(49);
  });

  test('la suma de todas las frecuencias debe ser totalSorteos * 6', () => {
    const freq = calcularFrecuenciaNumeros();
    const suma = freq.reduce((acc, f) => acc + f.frecuencia, 0);
    expect(suma).toBe(TOTAL_SORTEOS * 6);
  });

  test('debe encontrar números atrasados', () => {
    const atrasados = numerosAtrasados();
    expect(atrasados).toHaveLength(49);
    expect(atrasados[0].sorteosSinSalir).toBeGreaterThanOrEqual(0);
  });

  test('distribución par/impar debe sumar total de números', () => {
    const dist = distribucionParImpar();
    expect(dist.pares + dist.impares).toBe(TOTAL_SORTEOS * 6);
  });

  test('estadísticas de suma deben ser coherentes', () => {
    const stats = estadisticasSuma();
    expect(stats.minima).toBeGreaterThanOrEqual(21);  // 1+2+3+4+5+6
    expect(stats.maxima).toBeLessThanOrEqual(279);      // 44+45+46+47+48+49
    expect(stats.media).toBeGreaterThan(stats.minima);
    expect(stats.media).toBeLessThan(stats.maxima);
  });
});

describe('Filtros', () => {
  test('filtrar por año debe devolver sorteos de ese año', () => {
    const sorteos2024 = filtrarSorteos({ anio: 2024 });
    expect(sorteos2024.length).toBeGreaterThan(0);
    sorteos2024.forEach(s => {
      expect(s.fecha.endsWith('/2024')).toBe(true);
    });
  });

  test('últimos sorteos debe devolver N elementos', () => {
    expect(ultimosSorteos(5)).toHaveLength(5);
    expect(ultimosSorteos(1)).toHaveLength(1);
  });

  test('buscar combinación debe funcionar con números desordenados', () => {
    const resultado = buscarCombinacion([1, 2, 3, 4, 5, 6]);
    expect(Array.isArray(resultado)).toBe(true);
  });
});
