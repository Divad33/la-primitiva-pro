import { useState, useEffect } from 'react';
import { SorteoPrimitiva } from '../../types';
import { obtenerHistoricoCompleto, actualizarDesdeProxy } from '../services/loteria';

export function useHistorico() {
  const [historico, setHistorico] = useState<SorteoPrimitiva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string>('');

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const datos = await obtenerHistoricoCompleto();
      setHistorico(datos);
    } catch (e) {
      console.error('[useHistorico] Error cargando:', e);
    }
    setCargando(false);
  };

  const recargar = async () => {
    await cargarDatos();
  };

  const actualizar = async () => {
    setActualizando(true);
    try {
      const resultado = await actualizarDesdeProxy();
      if (resultado.nuevo) {
        await cargarDatos();
        setUltimaActualizacion(new Date().toLocaleString('es-ES'));
      }
      setActualizando(false);
      return resultado;
    } catch (e) {
      console.error('[useHistorico] Error actualizando:', e);
      setActualizando(false);
      return { nuevo: false, sorteo: null, error: 'Error inesperado en la app' };
    }
  };

  return {
    historico,
    cargando,
    actualizando,
    ultimaActualizacion,
    actualizar,
    recargar,
    totalSorteos: historico.length,
    // El historico esta en orden ascendente (mas antiguo -> mas reciente),
    // asi que el ultimo sorteo es el ultimo elemento del array.
    ultimoSorteo: historico.length > 0 ? historico[historico.length - 1] : null,
  };
}
