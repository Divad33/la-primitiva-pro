import { useState, useEffect } from 'react'
import { useHistorico } from './hooks/useHistorico'
import { generarJugadasAvanzadas, JugadaAvanzada, analisisAvanzado, AdvancedAnalysis } from './services/analisis-avanzado'
import { verificarCombinacion } from './services/generador'
import { addManualResult } from './services/resultsDb'
import { generarEstadisticasCompletas } from '../utils/estadisticas'
import { backtestEstrategia, estrategiaFrecuencia, ResultadoBacktest } from '../utils/backtest'
import type { SorteoPrimitiva } from '../types/index'

function App() {
  const { historico, cargando, actualizando, ultimaActualizacion, actualizar, recargar, totalSorteos, ultimoSorteo } = useHistorico()
  const [tab, setTab] = useState<'stats' | 'analisis' | 'numbers' | 'last'>('stats')
  const [mensaje, setMensaje] = useState('')

  const [stats, setStats] = useState(() => generarEstadisticasCompletas([]))
  const [analisis, setAnalisis] = useState<AdvancedAnalysis | null>(null)
  const [jugadas, setJugadas] = useState<JugadaAvanzada[]>([])
  const [verificaciones, setVerificaciones] = useState<Array<{ yaSalio: boolean; sorteo?: SorteoPrimitiva }>>([])

  // Backtest (bajo demanda, no se calcula automaticamente)
  const [backtest, setBacktest] = useState<ResultadoBacktest | null>(null)
  const [calculandoBacktest, setCalculandoBacktest] = useState(false)

  // Modal entrada manual
  const [showManual, setShowManual] = useState(false)
  const [manualFecha, setManualFecha] = useState('')
  const [manualNums, setManualNums] = useState('')
  const [manualComp, setManualComp] = useState('')
  const [manualReint, setManualReint] = useState('')

  useEffect(() => {
    if (historico.length > 0) {
      setStats(generarEstadisticasCompletas(historico))
      setAnalisis(analisisAvanzado(historico))
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
      setManualFecha('')
      setManualNums('')
      setManualComp('')
      setManualReint('')
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

  const handleEjecutarBacktest = () => {
    if (historico.length === 0) return
    setCalculandoBacktest(true)
    // setTimeout(0) para que React pinte el estado "calculando" antes de la
    // operacion sincrona (el backtest recorre miles de sorteos y tarda unos
    // cientos de ms, suficiente para notarse sin el respiro visual).
    setTimeout(() => {
      const resultado = backtestEstrategia(historico, estrategiaFrecuencia)
      setBacktest(resultado)
      setCalculandoBacktest(false)
    }, 0)
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

      <div className="flex gap-1 mb-4">
        {[
          { key: 'stats' as const, label: '📊 Stats' },
          { key: 'analisis' as const, label: '🔍 Análisis' },
          { key: 'numbers' as const, label: '🎰 Jugadas' },
          { key: 'last' as const, label: '📅 Último' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg font-bold text-xs transition ${
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

      {tab === 'analisis' && analisis && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-purple-400 mb-1">🔗 Parejas que más salen juntas</h2>
            <p className="text-xs text-gray-500 mb-3">Números que coinciden en el mismo sorteo con más frecuencia</p>
            <div className="grid grid-cols-2 gap-2">
              {analisis.coOcurrence.slice(0, 10).map((c, i) => (
                <div key={i} className="bg-slate-900 rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{c.pair[0]} - {c.pair[1]}</span>
                  <span className="text-xs text-gray-500">{c.count}×</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-blue-400 mb-1">📊 Distribución por decenas</h2>
            <p className="text-xs text-gray-500 mb-3">Qué franja de números (1-10, 11-20…) sale con más frecuencia</p>
            <div className="space-y-2">
              {[...analisis.decadas].sort((a, b) => a.decada - b.decada).map(d => {
                const maxPct = Math.max(...analisis.decadas.map(x => x.pct), 1)
                const rangos = ['1-10', '11-20', '21-30', '31-40', '41-49']
                return (
                  <div key={d.decada}>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{rangos[d.decada]}</span>
                      <span>{d.pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(d.pct / maxPct) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-green-400 mb-1">⚖️ Patrones Par/Impar</h2>
            <p className="text-xs text-gray-500 mb-3">Combinación de pares e impares más habitual en un sorteo</p>
            <div className="space-y-1">
              {analisis.parImparPatterns.slice(0, 5).map(p => (
                <div key={p.pattern} className="flex justify-between text-sm">
                  <span className="font-bold text-white">{p.pattern}</span>
                  <span className="text-gray-400">{p.count} veces ({p.pct.toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-orange-400 mb-1">🔀 Transiciones más fuertes</h2>
            <p className="text-xs text-gray-500 mb-3">Cuando sale X, el número que más veces ha salido en el sorteo siguiente</p>
            <div className="space-y-1">
              {analisis.strongestTransitionLinks.slice(0, 8).map((l, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-white">{l.from} → {l.to}</span>
                  <span className="text-gray-400">{l.count}× ({l.pct.toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-yellow-400 mb-1">🧪 Backtest honesto</h2>
            <p className="text-xs text-gray-500 mb-3">
              Simula la estrategia "números más frecuentes" sorteo a sorteo, usando solo
              el histórico anterior a cada uno (sin trampa), y la compara contra elegir al azar.
            </p>
            {!backtest && (
              <button
                onClick={handleEjecutarBacktest}
                disabled={calculandoBacktest}
                className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-800 text-black font-bold py-2 rounded-lg text-sm transition"
              >
                {calculandoBacktest ? '⏳ Calculando...' : '▶️ Ejecutar backtest'}
              </button>
            )}
            {backtest && (
              <div>
                <div className="grid grid-cols-2 gap-3 text-center mb-3">
                  <div className="bg-slate-900 rounded-lg p-3">
                    <p className="text-xl font-black text-yellow-400">{backtest.aciertosPromedio}</p>
                    <p className="text-xs text-gray-500">Aciertos promedio<br />(estrategia)</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-3">
                    <p className="text-xl font-black text-gray-400">{backtest.comparativaAleatoria.aciertosPromedio}</p>
                    <p className="text-xs text-gray-500">Aciertos promedio<br />(al azar)</p>
                  </div>
                </div>
                <p className="text-xs text-center text-gray-400 mb-3">
                  Sobre {backtest.totalSorteosEvaluados.toLocaleString()} sorteos evaluados.
                  Diferencia: {backtest.diferenciaVsAleatoria >= 0 ? '+' : ''}{backtest.diferenciaVsAleatoria}
                  {' '}— tal como predice la teoría de probabilidad, ninguna estrategia le gana al azar a largo plazo.
                </p>
                <button
                  onClick={() => setBacktest(null)}
                  className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-lg text-sm transition"
                >
                  🔄 Repetir
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'numbers' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-yellow-400 mb-1">🎰 5 Jugadas Inteligentes</h2>
            <p className="text-xs text-gray-400 mb-3">Análisis avanzado: Markov, co-ocurrencia, decenas, patrones + puntuación anti-popularidad</p>

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

                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    jugada.popularidad <= 30 ? 'bg-green-900 text-green-300' :
                    jugada.popularidad <= 60 ? 'bg-yellow-900 text-yellow-300' :
                    'bg-red-900 text-red-300'
                  }`}>
                    {jugada.popularidad <= 30 ? '💎' : jugada.popularidad <= 60 ? '👥' : '⚠️'} Popularidad: {jugada.popularidad}/100
                  </span>
                </div>
                {jugada.popularidad > 60 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Si aciertas, es más probable que compartas el premio: {jugada.motivosPopularidad[0]}
                  </p>
                )}

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

export default App
