import { useState, useEffect } from 'react'
import { useHistorico } from './hooks/useHistorico'
import { generarJugadasAvanzadas, JugadaAvanzada } from './services/analisis-avanzado'
import { verificarCombinacion } from './services/generador'
import { addManualResult } from './services/resultsDb'
import type { SorteoPrimitiva } from '../types/index'

function App() {
  const { historico, cargando, actualizando, ultimaActualizacion, actualizar, totalSorteos, ultimoSorteo, recargar } = useHistorico()
  const [tab, setTab] = useState<'stats' | 'numbers' | 'last'>('stats')
  const [mensaje, setMensaje] = useState('')

  const [stats, setStats] = useState(() => generarEstadisticasDinamicas([]))
  const [jugadas, setJugadas] = useState<JugadaAvanzada[]>([])
  const [verificaciones, setVerificaciones] = useState<Array<{ yaSalio: boolean; sorteo?: SorteoPrimitiva }>>([])

  // Modal entrada manual
  const [showManual, setShowManual] = useState(false)
  const [manualFecha, setManualFecha] = useState('')
  const [manualNums, setManualNums] = useState('')
  const [manualComp, setManualComp] = useState('')
  const [manualReint, setManualReint] = useState('')

  useEffect(() => {
    if (historico.length > 0) {
      setStats(generarEstadisticasDinamicas(historico))
      const nuevasJugadas = generarJugadasAvanzadas(historico)
      setJugadas(nuevasJugadas)
      setVerificaciones(nuevasJugadas.map(j => verificarCombinacion(j.numeros, historico)))
    }
  }, [historico])

  const handleActualizar = async () => {
    setMensaje('⏳ Buscando nuevo sorteo...')
    const resultado = await actualizar()
    if (resultado.nuevo) {
      setMensaje(`✅ Nuevo sorteo añadido: ${resultado.sorteo?.fecha}`)
    } else if (resultado.sorteo) {
      setMensaje(`ℹ️ Ya tienes el ultimo sorteo (${resultado.sorteo.fecha})`)
    } else {
      setMensaje(`❌ ${resultado.error || 'No se pudo conectar. Intenta mas tarde o añade manualmente.'}`)
    }
    setTimeout(() => setMensaje(''), 8000)
  }

  const handleGuardarManual = async () => {
    try {
      const nums = manualNums.split(/[,\s]+/).map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 49)
      if (nums.length !== 6) {
        setMensaje('❌ Debes introducir exactamente 6 numeros (1-49)')
        return
      }
      const comp = parseInt(manualComp)
      const reint = manualReint ? parseInt(manualReint) : null

      await addManualResult({
        fecha: manualFecha || new Date().toLocaleDateString('es-ES'),
        numeros: nums,
        complementario: comp,
        reintegro: reint,
      })

      setShowManual(false)
      setMensaje('✅ Sorteo guardado manualmente')
      await recargar()
      setTimeout(() => setMensaje(''), 5000)
    } catch (e) {
      setMensaje('❌ Error guardando sorteo manual')
    }
  }

  const generarNuevasJugadas = () => {
    if (historico.length > 0) {
      const nuevas = generarJugadasAvanzadas(historico)
      setJugadas(nuevas)
      setVerificaciones(nuevas.map(j => verificarCombinacion(j.numeros, historico)))
    }
  }

  const renderBalls = (nums: number[], colorClass: string) => (
    <div className="flex flex-wrap gap-2 mt-1">
      {nums.map((n: number) => (
        <span key={n} className={`${colorClass} w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg shadow-lg`}>
          {n}
        </span>
      ))}
    </div>
  )

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p>Cargando historico...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto pb-20 relative">
      <h1 className="text-3xl font-black text-center text-yellow-400 mb-2 drop-shadow-md">
        🎰 La Primitiva Pro
      </h1>
      <p className="text-center text-gray-400 text-sm mb-2">
        {totalSorteos.toLocaleString()} sorteos analizados
      </p>

      <div className="flex gap-2 mb-3">
        <button
          onClick={handleActualizar}
          disabled={actualizando}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg text-sm transition"
        >
          {actualizando ? '⏳ Buscando...' : '🔄 Buscar nuevo sorteo'}
        </button>
        <button
          onClick={() => setShowManual(true)}
          className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-lg text-sm transition"
        >
          ➕
        </button>
      </div>

      {mensaje && (
        <div className="bg-slate-700 text-white text-sm p-2 rounded-lg mb-3 text-center">
          {mensaje}
        </div>
      )}

      {ultimaActualizacion && (
        <p className="text-center text-xs text-gray-500 mb-3">
          Ultima actualizacion: {ultimaActualizacion}
        </p>
      )}

      <div className="flex gap-2 mb-4">
        {[
          { key: 'stats' as const, label: '📊 Estadisticas' },
          { key: 'numbers' as const, label: '🎰 Jugadas' },
          { key: 'last' as const, label: '📅 Ultimo' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
              tab === t.key ? 'bg-yellow-500 text-black' : 'bg-slate-700 text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'stats' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-red-400 mb-2">🔥 Numeros Calientes</h2>
            {renderBalls(stats.numerosCalientes, 'bg-red-600 text-white')}
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-blue-400 mb-2">❄️ Numeros Frios</h2>
            {renderBalls(stats.numerosFrios, 'bg-blue-600 text-white')}
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-gray-300 mb-2">⏳ Mas Atrasados</h2>
            <div className="space-y-1">
              {stats.numerosMasAtrasados.slice(0, 5).map((a: { numero: number; sorteosSinSalir: number }) => (
                <div key={a.numero} className="flex justify-between text-sm">
                  <span className="font-bold text-yellow-400">#{a.numero}</span>
                  <span className="text-gray-400">{a.sorteosSinSalir} sorteos sin salir</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-gray-300 mb-2">⚖️ Par / Impar</h2>
            <div className="flex justify-between text-center">
              <div><p className="text-2xl font-black text-blue-400">{stats.paresImpares.pares.toLocaleString()}</p><p className="text-xs text-gray-500">Pares</p></div>
              <div><p className="text-2xl font-black text-pink-400">{stats.paresImpares.impares.toLocaleString()}</p><p className="text-xs text-gray-500">Impares</p></div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-gray-300 mb-2">📈 Estadisticas de Suma</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-xl font-bold text-green-400">{stats.sumaMedia}</p><p className="text-xs text-gray-500">Media</p></div>
              <div><p className="text-xl font-bold text-red-400">{stats.sumaMinima}</p><p className="text-xs text-gray-500">Minima</p></div>
              <div><p className="text-xl font-bold text-purple-400">{stats.sumaMaxima}</p><p className="text-xs text-gray-500">Maxima</p></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'numbers' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-yellow-400 mb-1">🎰 5 Jugadas Inteligentes</h2>
            <p className="text-xs text-gray-400 mb-3">Analisis avanzado: Markov, co-ocurrencia, decenas, patrones</p>

            {jugadas.map((jugada, idx) => (
              <div key={idx} className="mb-4 last:mb-0 bg-slate-900 rounded-lg p-3">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <p className="text-sm font-bold text-white">{idx + 1}. {jugada.nombre}</p>
                    <p className="text-xs text-gray-500">{jugada.estrategia}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      jugada.confianza >= 85 ? 'bg-green-900 text-green-300' :
                      jugada.confianza >= 80 ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {jugada.confianza}% confianza
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {jugada.numeros.map((n: number) => (
                    <span key={n} className={`${jugada.color} text-white w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg shadow-lg`}>
                      {n}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-gray-500 mt-2 italic">{jugada.detalles}</p>

                {verificaciones[idx]?.yaSalio && (
                  <p className="text-xs text-red-400 mt-2">
                    ⚠️ Esta combinacion ya salio el {verificaciones[idx].sorteo?.fecha}
                  </p>
                )}
              </div>
            ))}

            <button
              onClick={generarNuevasJugadas}
              className="w-full bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-black font-black py-4 rounded-xl text-lg shadow-lg transition transform active:scale-95 mt-4"
            >
              🔄 Generar Nuevas Jugadas
            </button>
          </div>
        </div>
      )}

      {tab === 'last' && ultimoSorteo && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold text-gray-300 mb-2">📅 Ultimo Sorteo Registrado</h2>
          <p className="text-sm text-gray-400 mb-3">Fecha: <span className="text-white font-bold">{ultimoSorteo.fecha}</span></p>
          <p className="text-xs text-gray-500 mb-1">Numeros principales</p>
          {renderBalls(ultimoSorteo.numeros, 'bg-gray-700 text-white')}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Complementario</p><p className="text-2xl font-black text-yellow-400">{ultimoSorteo.complementario}</p></div>
            <div className="bg-slate-900 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Reintegro</p><p className="text-2xl font-black text-yellow-400">{ultimoSorteo.reintegro ?? 'N/D'}</p></div>
          </div>
        </div>
      )}

      {/* MODAL ENTRADA MANUAL */}
      {showManual && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-5 w-full max-w-sm border border-slate-600">
            <h2 className="text-lg font-bold text-yellow-400 mb-4">➕ Añadir Sorteo Manual</h2>
            
            <label className="block text-xs text-gray-400 mb-1">Fecha (DD/MM/AAAA)</label>
            <input
              type="text"
              value={manualFecha}
              onChange={e => setManualFecha(e.target.value)}
              placeholder="23/08/2026"
              className="w-full bg-slate-900 text-white rounded-lg p-2 mb-3 text-sm border border-slate-600"
            />

            <label className="block text-xs text-gray-400 mb-1">6 Numeros (separados por coma o espacio)</label>
            <input
              type="text"
              value={manualNums}
              onChange={e => setManualNums(e.target.value)}
              placeholder="5, 12, 23, 34, 41, 47"
              className="w-full bg-slate-900 text-white rounded-lg p-2 mb-3 text-sm border border-slate-600"
            />

            <label className="block text-xs text-gray-400 mb-1">Complementario</label>
            <input
              type="number"
              value={manualComp}
              onChange={e => setManualComp(e.target.value)}
              placeholder="15"
              className="w-full bg-slate-900 text-white rounded-lg p-2 mb-3 text-sm border border-slate-600"
            />

            <label className="block text-xs text-gray-400 mb-1">Reintegro (0-9, opcional)</label>
            <input
              type="number"
              value={manualReint}
              onChange={e => setManualReint(e.target.value)}
              placeholder="7"
              className="w-full bg-slate-900 text-white rounded-lg p-2 mb-4 text-sm border border-slate-600"
            />

            <div className="flex gap-2">
              <button
                onClick={handleGuardarManual}
                className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-sm transition"
              >
                💾 Guardar
              </button>
              <button
                onClick={() => setShowManual(false)}
                className="flex-1 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 rounded-lg text-sm transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-600 mt-6 mb-4">⚠️ La loteria es un juego de azar. Uso educativo.</p>
    </div>
  )
}

function generarEstadisticasDinamicas(historico: SorteoPrimitiva[]) {
  if (historico.length === 0) {
    return {
      totalSorteos: 0,
      fechaInicio: '',
      fechaFin: '',
      numerosCalientes: [] as number[],
      numerosFrios: [] as number[],
      numerosMasAtrasados: [] as { numero: number; sorteosSinSalir: number }[],
      paresImpares: { pares: 0, impares: 0 },
      sumaMedia: 0,
      sumaMinima: 0,
      sumaMaxima: 0,
    }
  }

  const total = historico.length
  const freq = new Map<number, number>()
  for (let i = 1; i <= 49; i++) freq.set(i, 0)
  historico.forEach((s: SorteoPrimitiva) => s.numeros.forEach((n: number) => freq.set(n, (freq.get(n) || 0) + 1)))

  const frecuenciaNumeros = Array.from(freq.entries())
    .map(([numero, frecuencia]: [number, number]) => ({ numero, frecuencia, porcentaje: Number(((frecuencia / (total * 6)) * 100).toFixed(2)) }))
    .sort((a: { frecuencia: number }, b: { frecuencia: number }) => b.frecuencia - a.frecuencia)

  const ultimaAparicion = new Map<number, number>()
  for (let i = 1; i <= 49; i++) ultimaAparicion.set(i, -1)
  historico.forEach((s: SorteoPrimitiva, idx: number) => s.numeros.forEach((n: number) => ultimaAparicion.set(n, idx)))

  const atrasados = Array.from(ultimaAparicion.entries())
    .map(([numero, ultIdx]: [number, number]) => ({ numero, sorteosSinSalir: ultIdx >= 0 ? total - 1 - ultIdx : total }))
    .sort((a: { sorteosSinSalir: number }, b: { sorteosSinSalir: number }) => b.sorteosSinSalir - a.sorteosSinSalir)

  let pares = 0, impares = 0
  historico.forEach((s: SorteoPrimitiva) => s.numeros.forEach((n: number) => { if (n % 2 === 0) pares++; else impares++ }))

  const sumas = historico.map((s: SorteoPrimitiva) => s.numeros.reduce((a: number, b: number) => a + b, 0))
  const media = sumas.reduce((a: number, b: number) => a + b, 0) / sumas.length

  return {
    totalSorteos: total,
    fechaInicio: historico[historico.length - 1]?.fecha ?? '',
    fechaFin: historico[0]?.fecha ?? '',
    numerosCalientes: frecuenciaNumeros.slice(0, 10).map((f: { numero: number }) => f.numero),
    numerosFrios: frecuenciaNumeros.slice(-10).map((f: { numero: number }) => f.numero),
    numerosMasAtrasados: atrasados.slice(0, 10),
    paresImpares: { pares, impares },
    sumaMedia: Number(media.toFixed(2)),
    sumaMinima: Math.min(...sumas),
    sumaMaxima: Math.max(...sumas),
  }
}

export default App
