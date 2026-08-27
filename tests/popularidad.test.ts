import { analizarPopularidad } from '../src/utils/popularidad';

describe('Analisis de popularidad', () => {
  test('una progresion aritmetica en rango de fechas debe dar score alto', () => {
    const r = analizarPopularidad([1, 6, 11, 16, 21, 26]);
    expect(r.score).toBeGreaterThan(50);
    expect(r.motivos.length).toBeGreaterThan(0);
  });

  test('numeros altos y sin patron deben dar score bajo', () => {
    const r = analizarPopularidad([33, 37, 41, 44, 47, 49]);
    expect(r.score).toBeLessThan(30);
  });

  test('debe rechazar listas que no tengan exactamente 6 numeros', () => {
    const r = analizarPopularidad([1, 2, 3]);
    expect(r.score).toBe(0);
    expect(r.motivos.length).toBeGreaterThan(0);
  });

  test('el score nunca debe superar 100', () => {
    const r = analizarPopularidad([5, 10, 15, 20, 25, 30]);
    expect(r.score).toBeLessThanOrEqual(100);
    expect(r.score).toBeGreaterThanOrEqual(0);
  });
});
