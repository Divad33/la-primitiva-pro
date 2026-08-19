import { Preferences } from '@capacitor/preferences';
import { HISTORICO_PRIMITIVA } from '../../data/primitiva-historico';
import { SorteoPrimitiva } from '../../types';

const STORAGE_KEY = 'sorteos_nuevos';

export async function obtenerSorteosLocales(): Promise<SorteoPrimitiva[]> {
  const { value } = await Preferences.get({ key: STORAGE_KEY });
  if (!value) return [];
  return JSON.parse(value);
}

export async function guardarSorteo(sorteo: SorteoPrimitiva): Promise<void> {
  const existentes = await obtenerSorteosLocales();
  const yaExiste = existentes.some(s => s.fecha === sorteo.fecha);
  if (yaExiste) return;
  
  existentes.push(sorteo);
  existentes.sort((a, b) => {
    const [da, ma, ya] = a.fecha.split('/').map(Number);
    const [db, mb, yb] = b.fecha.split('/').map(Number);
    return new Date(ya, ma - 1, da).getTime() - new Date(yb, mb - 1, db).getTime();
  });
  
  await Preferences.set({
    key: STORAGE_KEY,
    value: JSON.stringify(existentes),
  });
}

export async function obtenerHistoricoCompleto(): Promise<SorteoPrimitiva[]> {
  const locales = await obtenerSorteosLocales();
  return [...HISTORICO_PRIMITIVA, ...locales];
}

export async function fetchUltimoSorteoLAE(): Promise<SorteoPrimitiva | null> {
  try {
    const response = await fetch(
      'https://www.loteriasyapuestas.es/servicios/buscadorSorteos?game_id=LAPR&celebrados=true&numero=1'
    );
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    
    const s = data[0];
    return {
      fecha: s.fecha_sorteo || s.fecha || '',
      numeros: [
        s.numero1 || s.bola1,
        s.numero2 || s.bola2,
        s.numero3 || s.bola3,
        s.numero4 || s.bola4,
        s.numero5 || s.bola5,
        s.numero6 || s.bola6,
      ] as [number, number, number, number, number, number],
      complementario: s.complementario || s.complementario1 || 0,
      reintegro: s.reintegro !== undefined ? s.reintegro : null,
      joker: null,
    };
  } catch (error) {
    console.error('Error al obtener sorteo de LAE:', error);
    return null;
  }
}

export async function actualizarDesdeLAE(): Promise<{ 
  nuevo: boolean; 
  sorteo: SorteoPrimitiva | null 
}> {
  const sorteo = await fetchUltimoSorteoLAE();
  if (!sorteo) return { nuevo: false, sorteo: null };
  
  const locales = await obtenerSorteosLocales();
  const yaExiste = locales.some(s => s.fecha === sorteo.fecha) || 
                   HISTORICO_PRIMITIVA.some(s => s.fecha === sorteo.fecha);
  
  if (yaExiste) return { nuevo: false, sorteo };
  
  await guardarSorteo(sorteo);
  return { nuevo: true, sorteo };
}
