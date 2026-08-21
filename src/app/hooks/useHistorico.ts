import { useState, useEffect, useCallback } from 'react';
import { SorteoPrimitiva } from '../../types';
import { obtenerHistoricoCompleto, actualizarDesdeProxy } from '../services/loteria';

export function useHistorico() {
  const [historico, setHistorico] = useState<SorteoPrimitiva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string>('');

  // Cargar datos al inicio (sincroniza empaquetado + local)
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = () => {
    setCargando(true);
    const datos = obtenerHistoricoCompleto();
    setHistorico(datos);
    setCargando(false);
  };

  const actualizar = async () => {
    setActualizando(true);
    const resultado = await actualizarDesdeProxy();
    if (resultado.nuevo) {
      cargarDatos(); // Recargar desde DB local
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
    ultimoSorteo: historico.length > 0 ? historico[0] : null, // [0] = más reciente
  };
}
