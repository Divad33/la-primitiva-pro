import { useState } from 'react'
import { generarJugadasAvanzadas, JugadaAvanzada } from './services/analisis-avanzado'
import { verificarCombinacion } from './services/generador'
import { generarEstadisticasCompletas } from '../utils/estadisticas'
import { ultimosSorteos } from '../utils/filtros'

function App() {
  const [stats] = useState(() => generarEstadisticasCompletas())
  const [jugadas, setJugadas] = useState<JugadaAvanzada[]>(() => generarJugadasAvanzadas())
  const [verificaciones, setVerificaciones] = useState(() =>
    jugadas.map(j => verificarCombinacion(j.numeros))
  )
  const [tab, setTab] = useState<'stats' | 'numbers' | 'last'>('stats')
  const ultimo = ultimosSorteos(1)[0]

  const generarNuevasJugadas = () => {
    const nuevas = generarJugadasAvanzadas()
    setJugadas(nuevas)
    setVerificaciones(nuevas.map(j => verificarCombinacion(j.numeros)))
  }

  const renderBalls = (nums: number[], colorClass: string) => (
    <div className="flex flex-wrap gap-2 mt-1">
      {nums.map(n => (
        <span key={n} className={`${colorClass} w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg shadow-lg`}>
          {n}
        </span>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto pb-20">
      <h1 className="text-3xl font-black text-center text-yellow-400 mb-2 drop-shadow-md">
        🎰 La Primitiva Pro
      </h1>
      <p className="text-center text-gray-400 text-sm mb-4">
        {stats.totalSorteos.toLocaleString()} sorteos analizados
      </p>

      <div className="flex gap-2 mb-4">
        {[
          { key: 'stats' as const, label: '📊 Estadísticas' },
          { key: 'numbers' as const, label: '🎰 Jugadas' },
          { key: 'last' as const, label: '📅 Último' },
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
            <h2 className="text-lg font-bold text-red-400 mb-2">🔥 Números Calientes</h2>
            {renderBalls(stats.numerosCalientes, 'bg-red-600 text-white')}
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-blue-400 mb-2">❄️ Números Fríos</h2>
            {renderBalls(stats.numerosFrios, 'bg-blue-600 text-white')}
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-gray-300 mb-2">⏳ Más Atrasados</h2>
            <div className="space-y-1">
              {stats.numerosMasAtrasados.slice(0, 5).map(a => (
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
            <h2 className="text-lg font-bold text-gray-300 mb-2">📈 Estadísticas de Suma</h2>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="text-xl font-bold text-green-400">{stats.sumaMedia}</p><p className="text-xs text-gray-500">Media</p></div>
              <div><p className="text-xl font-bold text-red-400">{stats.sumaMinima}</p><p className="text-xs text-gray-500">Mínima</p></div>
              <div><p className="text-xl font-bold text-purple-400">{stats.sumaMaxima}</p><p className="text-xs text-gray-500">Máxima</p></div>
            </div>
          </div>
        </div>
      )}

      {tab === 'numbers' && (
        <div className="space-y-4">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-yellow-400 mb-1">🎰 5 Jugadas Inteligentes</h2>
            <p className="text-xs text-gray-400 mb-3">Análisis avanzado: Markov, co-ocurrencia, decenas, patrones</p>

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
                  {jugada.numeros.map(n => (
                    <span key={n} className={`${jugada.color} text-white w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg shadow-lg`}>
                      {n}
                    </span>
                  ))}
                </div>

                <p className="text-xs text-gray-500 mt-2 italic">{jugada.detalles}</p>

                {verificaciones[idx]?.yaSalio && (
                  <p className="text-xs text-red-400 mt-2">
                    ⚠️ Esta combinación ya salió el {verificaciones[idx].sorteo?.fecha}
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

      {tab === 'last' && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold text-gray-300 mb-2">📅 Último Sorteo Registrado</h2>
          <p className="text-sm text-gray-400 mb-3">Fecha: <span className="text-white font-bold">{ultimo.fecha}</span></p>
          <p className="text-xs text-gray-500 mb-1">Números principales</p>
          {renderBalls(ultimo.numeros, 'bg-gray-700 text-white')}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Complementario</p><p className="text-2xl font-black text-yellow-400">{ultimo.complementario}</p></div>
            <div className="bg-slate-900 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Reintegro</p><p className="text-2xl font-black text-yellow-400">{ultimo.reintegro ?? 'N/D'}</p></div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-600 mt-6 mb-4">⚠️ La lotería es un juego de azar. Uso educativo.</p>
    </div>
  )
}

export default App


