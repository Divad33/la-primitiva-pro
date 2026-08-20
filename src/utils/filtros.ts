import { HISTORICO_PRIMITIVA } from '../data/primitiva-historico';
import { SorteoPrimitiva, FiltroSorteo } from '../types';

/** Filtra sorteos según criterios */
export function filtrarSorteos(filtro: FiltroSorteo, historico: SorteoPrimitiva[] = HISTORICO_PRIMITIVA): SorteoPrimitiva[] {
  return historico.filter(s => {
    if (filtro.anio !== undefined) {
      const anio = parseInt(s.fecha.split('/')[2], 10);
      if (anio !== filtro.anio) return false;
    }
    if (filtro.numero !== undefined && !s.numeros.includes(filtro.numero)) return false;
    if (filtro.complementario !== undefined && s.complementario !== filtro.complementario) return false;
    if (filtro.reintegro !== undefined && s.reintegro !== filtro.reintegro) return false;
    if (filtro.desde) {
      const [d, m, y] = s.fecha.split('/').map(Number);
      const [dd, dm, dy] = filtro.desde.split('/').map(Number);
      const fechaSorteo = new Date(y, m - 1, d);
      const fechaDesde = new Date(dy, dm - 1, dd);
      if (fechaSorteo < fechaDesde) return false;
    }
    if (filtro.hasta) {
      const [d, m, y] = s.fecha.split('/').map(Number);
      const [hd, hm, hy] = filtro.hasta.split('/').map(Number);
      const fechaSorteo = new Date(y, m - 1, d);
      const fechaHasta = new Date(hy, hm - 1, hd);
      if (fechaSorteo > fechaHasta) return false;
    }
    return true;
  });
}

/** Busca sorteos donde salió una combinación exacta de números (sin importar orden) */
export function buscarCombinacion(numeros: number[], historico: SorteoPrimitiva[] = HISTORICO_PRIMITIVA): SorteoPrimitiva[] {
  const set = new Set(numeros);
  if (set.size !== 6) throw new Error('Debes proporcionar exactamente 6 números únicos');
  return historico.filter(s =>
    s.numeros.every(n => set.has(n))
  );
}

/** Obtiene los últimos N sorteos */
export function ultimosSorteos(n: number = 10, historico: SorteoPrimitiva[] = HISTORICO_PRIMITIVA): SorteoPrimitiva[] {
  return historico.slice(-n);
}

/** Obtiene sorteos de un año específico */
export function sorteosPorAnio(anio: number, historico: SorteoPrimitiva[] = HISTORICO_PRIMITIVA): SorteoPrimitiva[] {
  return historico.filter(s => s.fecha.endsWith(`/${anio}`));
}
