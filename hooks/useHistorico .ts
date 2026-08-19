import { useState, useEffect, useCallback } from 'react';
import { SorteoPrimitiva } from '../../types';
import { obtenerHistoricoCompleto, actualizarDesdeLAE } from '../services/loteria';

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
    const datos = await obtenerHistoricoCompleto();
    setHistorico(datos);
    setCargando(false);
  };

  const actualizar = async () => {
    setActualizando(true);
    const resultado = await actualizarDesdeLAE();
    if (resultado.nuevo) {
      await cargarDatos();
      setUltimaActualizacion(new Date().toLocaleString('es-ES'));
    }
    setActualizando(false);
    return resultado;
  };

  return {
    historico,
    cargando,
    actualizando,
    ultimaActualizacion,
    actualizar,
    totalSorteos: historico.length,
    ultimoSorteo: historico.length > 0 ? historico[historico.length - 1] : null,
  };
}
