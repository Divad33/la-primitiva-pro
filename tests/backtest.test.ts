import { backtestEstrategia, estrategiaFrecuencia, estrategiaAtrasados, EstrategiaBacktest } from '../src/utils/backtest';
import type { SorteoPrimitiva } from '../src/types';

function fakeSorteo(index: number): SorteoPrimitiva {
  const base = (index * 7) % 44;
  const crudos = [1, 2, 3, 4, 5, 6].map(offset => ((base + offset * 3) % 49) + 1);
  const unicos = Array.from(new Set(crudos));
  for (let n = 1; n <= 49 && unicos.length < 6; n++) {
    if (!unicos.includes(n)) unicos.push(n);
  }
  const ordenados = unicos.slice(0, 6).sort((a, b) => a - b) as SorteoPrimitiva['numeros'];
  return {
    fecha: `0${(index % 9) + 1}/01/2000`,
    numeros: ordenados,
    complementario: (index % 49) + 1,
    reintegro: index % 10,
    joker: null,
  };
}

const historicoFake: SorteoPrimitiva[] = Array.from({ length: 30 }, (_, i) => fakeSorteo(i));

describe('Backtest de estrategias', () => {
  test('no debe filtrar informacion del futuro (walk-forward correcto)', () => {
    const minHistorico = 5;
    let esperado = minHistorico;
    const estrategiaEspia: EstrategiaBacktest = (historicoPrevio) => {
      // En cada llamada, el historico recibido debe tener EXACTAMENTE un
      // sorteo mas que la llamada anterior, empezando en minHistorico.
      // Si esto fallara, significaria que la estrategia esta viendo el
      // sorteo que se supone debe predecir (o uno posterior).
      expect(historicoPrevio.length).toBe(esperado);
      esperado++;
      return [1, 2, 3, 4, 5, 6];
    };

    const resultado = backtestEstrategia(historicoFake, estrategiaEspia, minHistorico);
    expect(resultado.totalSorteosEvaluados).toBe(historicoFake.length - minHistorico);
  });

  test('la distribucion de aciertos debe sumar el total evaluado', () => {
    const resultado = backtestEstrategia(historicoFake, estrategiaFrecuencia, 5);
    const sumaDistribucion = Object.values(resultado.distribucionAciertos).reduce((a, b) => a + b, 0);
    expect(sumaDistribucion).toBe(resultado.totalSorteosEvaluados);

    const sumaAleatoria = Object.values(resultado.comparativaAleatoria.distribucionAciertos)
      .reduce((a, b) => a + b, 0);
    expect(sumaAleatoria).toBe(resultado.totalSorteosEvaluados);
  });

  test('el promedio de aciertos debe estar entre 0 y 6', () => {
    const resultado = backtestEstrategia(historicoFake, estrategiaAtrasados, 5);
    expect(resultado.aciertosPromedio).toBeGreaterThanOrEqual(0);
    expect(resultado.aciertosPromedio).toBeLessThanOrEqual(6);
    expect(resultado.comparativaAleatoria.aciertosPromedio).toBeGreaterThanOrEqual(0);
    expect(resultado.comparativaAleatoria.aciertosPromedio).toBeLessThanOrEqual(6);
  });

  test('con minHistorico >= longitud del historico no evalua nada', () => {
    const resultado = backtestEstrategia(historicoFake, estrategiaFrecuencia, 999);
    expect(resultado.totalSorteosEvaluados).toBe(0);
    expect(resultado.aciertosPromedio).toBe(0);
  });
});
