import { HISTORICO_PRIMITIVA } from '../../data/primitiva-historico'
import { SorteoPrimitiva } from '../../types'

/** Comprueba si una combinación de 6 números ya salió alguna vez en el histórico */
export function verificarCombinacion(
  numeros: number[],
  historico: SorteoPrimitiva[] = HISTORICO_PRIMITIVA
): {
  yaSalio: boolean
  sorteo?: SorteoPrimitiva
} {
  const set = new Set(numeros)

  for (const sorteo of historico) {
    if (sorteo.numeros.every(n => set.has(n))) {
      return { yaSalio: true, sorteo }
    }
  }

  return { yaSalio: false }
}
