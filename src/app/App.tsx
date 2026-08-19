import { useState } from 'react';
import { useHistorico } from './hooks/useHistorico';
import { generarEstadisticasCompletas } from '../utils/estadisticas';
import { generarBoletoEstrategias } from '../utils/prediccion';
import { ultimosSorteos } from '../utils/filtros';

function App() {
  const { historico, cargando, actualizando, ultimaActualizacion, actualizar, totalSorteos, ultimoSorteo } = useHistorico();
  const [stats] = useState(() => generarEstadisticasCompletas());
  const [boletos, setBoletos] = useState(() => generarBoletoEstrategias());
  const [tab, setTab] = useState<'stats' | 'numbers' | 'last'>('stats');
  const [mensaje, setMensaje] = useState('');

  const generarNuevos = () => setBoletos(generarBoletoEstrategias());

  const handleActualizar = async () => {
    const resultado = await actualizar();
    if (resultado.nuevo) {
      setMensaje(`✅ Nuevo sorteo añadido: ${resultado.sorteo?.fecha}`);
    } else if (resultado.sorteo) {
      setMensaje(`ℹ️ Ya tienes el último sorteo (${resultado.sorteo.fecha})`);
    } else {
      setMensaje('❌ No se pudo conectar con LAE');
    }
    setTimeout(() => setMensaje(''), 3000);
  };

  const renderBalls = (nums: number[], colorClass: string) => (
    <div className="flex flex-wrap gap-2 mt-1">
      {nums.map(n => (
        <span key={n} className={`${colorClass} w-10 h-10 flex items-center justify-center rounded-full font-bold text-lg shadow-lg`}>
          {n}
        </span>
      ))}
    </div>
  );

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-md mx-auto pb-20">
      <h1 className="text-3xl font-black text-center text-yellow-400 mb-2 drop-shadow-md">
        🎰 La Primitiva Pro
      </h1>
      <p className="text-center text-gray-400 text-sm mb-2">
        {totalSorteos.toLocaleString()} sorteos analizados
      </p>

      {/* Botón de actualización */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleActualizar}
          disabled={actualizando}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-2 px-4 rounded-lg text-sm transition"
        >
          {actualizando ? '⏳ Actualizando...' : '🔄 Buscar nuevo sorteo'}
        </button>
      </div>

      {mensaje && (
        <div className="bg-slate-700 text-white text-sm p-2 rounded-lg mb-3 text-center">
          {mensaje}
        </div>
      )}

      {ultimaActualizacion && (
        <p className="text-center text-xs text-gray-500 mb-3">
          Última actualización: {ultimaActualizacion}
        </p>
      )}

      <div className="flex gap-2 mb-4">
        {[
          { key: 'stats' as const, label: '📊 Estadísticas' },
          { key: 'numbers' as const, label: '🎯 Números' },
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
            <h2 className="text-lg font-bold text-green-400 mb-2">⚖️ Ponderada</h2>
            {renderBalls(boletos.ponderada, 'bg-green-600 text-white')}
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-purple-400 mb-2">⏳ Atrasados</h2>
            {renderBalls(boletos.atrasados, 'bg-purple-600 text-white')}
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <h2 className="text-lg font-bold text-orange-400 mb-2">🎲 Aleatoria</h2>
            {renderBalls(boletos.aleatoria, 'bg-orange-600 text-white')}
          </div>
          <button onClick={generarNuevos} className="w-full bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-black font-black py-4 rounded-xl text-lg shadow-lg transition transform active:scale-95">
            🔄 Generar Nuevas Combinaciones
          </button>
        </div>
      )}

      {tab === 'last' && ultimoSorteo && (
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="text-lg font-bold text-gray-300 mb-2">📅 Último Sorteo Registrado</h2>
          <p className="text-sm text-gray-400 mb-3">Fecha: <span className="text-white font-bold">{ultimoSorteo.fecha}</span></p>
          <p className="text-xs text-gray-500 mb-1">Números principales</p>
          {renderBalls(ultimoSorteo.numeros, 'bg-gray-700 text-white')}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Complementario</p><p className="text-2xl font-black text-yellow-400">{ultimoSorteo.complementario}</p></div>
            <div className="bg-slate-900 rounded-lg p-3 text-center"><p className="text-xs text-gray-500">Reintegro</p><p className="text-2xl font-black text-yellow-400">{ultimoSorteo.reintegro ?? 'N/D'}</p></div>
          </div>
        </div>
      )}

      <p className="text-center text-xs text-gray-600 mt-6 mb-4">⚠️ La lotería es un juego de azar. Uso educativo.</p>
    </div>
  );
}

export default App;

