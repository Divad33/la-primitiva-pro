
generador_ts = '''import { HISTORICO_PRIMITIVA } from '../../data/primitiva-historico'
import { SorteoPrimitiva } from '../../types'
import { calcularFrecuenciaNumeros, numerosAtrasados, estadisticasSuma } from '../../utils/estadisticas'

export interface Jugada {
  nombre: string
  estrategia: string
  numeros: number[]
  confianza: number
  color: string
}

export function generarJugadas(): Jugada[] {
  const freq = calcularFrecuenciaNumeros()
  const atrasadosList = numerosAtrasados()
  const sumaStats = estadisticasSuma()

  const numerosCalientes = freq.map(f => f.numero)
  const numerosAtrasadosList = atrasadosList.map(a => a.numero)
  const numerosIntermedios = freq.slice(10, 30).map(f => f.numero)

  const jugadas: Jugada[] = []

  jugadas.push({
    nombre: 'Frecuencia Ponderada',
    estrategia: 'Basada en los numeros mas frecuentes del historial completo',
    numeros: generarCombinacionPonderada(freq),
    confianza: 85,
    color: 'bg-red-600',
  })

  jugadas.push({
    nombre: 'Atrasados + Calientes',
    estrategia: '3 numeros que hace tiempo no salen + 3 numeros frecuentes',
    numeros: generarCombinacionMixta(atrasadosList, numerosCalientes),
    confianza: 78,
    color: 'bg-purple-600',
  })

  jugadas.push({
    nombre: 'Balance Par/Impar',
    estrategia: '3 numeros pares + 3 numeros impares para maximo equilibrio',
    numeros: generarCombinacionBalanceada(numerosCalientes, numerosAtrasadosList),
    confianza: 82,
    color: 'bg-blue-600',
  })

  jugadas.push({
    nombre: 'Suma Optima',
    estrategia: `Combinacion cuya suma se acerca a la media historica (${sumaStats.media})`,
    numeros: generarCombinacionSumaOptima(sumaStats.media, freq),
    confianza: 80,
    color: 'bg-green-600',
  })

  jugadas.push({
    nombre: 'Decenas Equilibradas',
    estrategia: 'Distribucion uniforme entre todas las decenas del tablero',
    numeros: generarCombinacionDecenas(numerosCalientes, numerosIntermedios),
    confianza: 75,
    color: 'bg-orange-600',
  })

  return jugadas
}

function generarCombinacionPonderada(
  freq: { numero: number; frecuencia: number }[]
): number[] {
  const pesos = freq.map(f => f.frecuencia)
  const totalPeso = pesos.reduce((a, b) => a + b, 0)
  const seleccionados = new Set<number>()

  while (seleccionados.size < 6) {
    let random = Math.random() * totalPeso
    for (const f of freq) {
      random -= f.frecuencia
      if (random <= 0) {
        seleccionados.add(f.numero)
        break
      }
    }
  }
  return Array.from(seleccionados).sort((a, b) => a - b)
}

function generarCombinacionMixta(
  atrasados: { numero: number; sorteosSinSalir: number }[],
  calientes: number[]
): number[] {
  const seleccionados = new Set<number>()

  for (let i = 0; i < 3 && seleccionados.size < 3; i++) {
    if (i < atrasados.length) {
      seleccionados.add(atrasados[i].numero)
    }
  }

  for (const num of calientes) {
    if (seleccionados.size >= 6) break
    if (!seleccionados.has(num)) {
      seleccionados.add(num)
    }
  }

  return Array.from(seleccionados).sort((a, b) => a - b)
}

function generarCombinacionBalanceada(
  calientes: number[],
  atrasados: number[]
): number[] {
  const pares = new Set<number>()
  const impares = new Set<number>()

  const calientesPares = calientes.filter(n => n % 2 === 0)
  const calientesImpares = calientes.filter(n => n % 2 !== 0)
  const atrasadosPares = atrasados.filter(n => n % 2 === 0)
  const atrasadosImpares = atrasados.filter(n => n % 2 !== 0)

  let idx = 0
  while (pares.size < 3 && idx < calientesPares.length) {
    pares.add(calientesPares[idx])
    idx++
  }
  idx = 0
  while (pares.size < 3 && idx < atrasadosPares.length) {
    if (!pares.has(atrasadosPares[idx])) {
      pares.add(atrasadosPares[idx])
    }
    idx++
  }

  idx = 0
  while (impares.size < 3 && idx < calientesImpares.length) {
    impares.add(calientesImpares[idx])
    idx++
  }
  idx = 0
  while (impares.size < 3 && idx < atrasadosImpares.length) {
    if (!impares.has(atrasadosImpares[idx])) {
      impares.add(atrasadosImpares[idx])
    }
    idx++
  }

  return Array.from([...pares, ...impares]).sort((a, b) => a - b)
}

function generarCombinacionSumaOptima(
  media: number,
  freq: { numero: number; frecuencia: number }[]
): number[] {
  const seleccionados = new Set<number>()
  const numeros = freq.map(f => f.numero)

  const numerosBajos = numeros.filter(n => n < 20)
  const numerosMedios = numeros.filter(n => n >= 15 && n <= 35)
  const numerosAltos = numeros.filter(n => n > 30)

  if (numerosBajos.length > 0) {
    seleccionados.add(numerosBajos[Math.floor(Math.random() * Math.min(3, numerosBajos.length))])
    seleccionados.add(numerosBajos[Math.floor(Math.random() * Math.min(5, numerosBajos.length))])
  }
  if (numerosMedios.length > 0) {
    seleccionados.add(numerosMedios[Math.floor(Math.random() * Math.min(5, numerosMedios.length))])
    seleccionados.add(numerosMedios[Math.floor(Math.random() * Math.min(10, numerosMedios.length))])
  }
  if (numerosAltos.length > 0) {
    seleccionados.add(numerosAltos[Math.floor(Math.random() * Math.min(5, numerosAltos.length))])
    seleccionados.add(numerosAltos[Math.floor(Math.random() * Math.min(10, numerosAltos.length))])
  }

  while (seleccionados.size < 6) {
    const idx = Math.floor(Math.random() * freq.length)
    seleccionados.add(freq[idx].numero)
  }

  return Array.from(seleccionados).sort((a, b) => a - b)
}

function generarCombinacionDecenas(
  calientes: number[],
  intermedios: number[]
): number[] {
  const seleccionados = new Set<number>()
  const decenas = [
    { min: 1, max: 10 },
    { min: 11, max: 20 },
    { min: 21, max: 30 },
    { min: 31, max: 40 },
    { min: 41, max: 49 },
  ]

  for (const decena of decenas) {
    const disponibles = [...calientes, ...intermedios].filter(
      n => n >= decena.min && n <= decena.max && !seleccionados.has(n)
    )

    if (disponibles.length > 0) {
      const idx = Math.floor(Math.random() * disponibles.length)
      seleccionados.add(disponibles[idx])
    } else {
      const cualquiera = Array.from(
        { length: decena.max - decena.min + 1 },
        (_, i) => decena.min + i
      ).filter(n => !seleccionados.has(n))
      if (cualquiera.length > 0) {
        seleccionados.add(cualquiera[Math.floor(Math.random() * cualquiera.length)])
      }
    }
  }

  while (seleccionados.size < 6) {
    const idx = Math.floor(Math.random() * calientes.length)
    seleccionados.add(calientes[idx])
  }

  return Array.from(seleccionados).sort((a, b) => a - b)
}

export function verificarCombinacion(numeros: number[]): {
  yaSalio: boolean
  sorteo?: SorteoPrimitiva
} {
  const set = new Set(numeros)

  for (const sorteo of HISTORICO_PRIMITIVA) {
    if (sorteo.numeros.every(n => set.has(n))) {
      return { yaSalio: true, sorteo }
    }
  }

  return { yaSalio: false }
}
'''

with open("/mnt/agents/output/generador.ts", "w", encoding="utf-8") as f:
    f.write(generador_ts)

print("✅ generador.ts corregido guardado")
print(f"📏 {len(generador_ts)} caracteres")
