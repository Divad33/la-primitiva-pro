import { Preferences } from '@capacitor/preferences';
import { HISTORICO_PRIMITIVA } from '../../data/primitiva-historico';
import { SorteoPrimitiva } from '../../types';

const STORAGE_KEY = 'sorteos_nuevos';

/**
 * Obtiene los sorteos nuevos guardados localmente en el móvil
 */
export async function obtenerSorteosLocales(): Promise<SorteoPrimitiva[]> {
  const { value } = await Preferences.get({ key: STORAGE_KEY });
  if (!value) return [];
  return JSON.parse(value);
}

/**
 * Guarda un sorteo nuevo en el almacenamiento local
 */
export async function guardarSorteo(sorteo: SorteoPrimitiva): Promise<void> {
  const existentes = await obtenerSorteosLocales();
  
  // Evitar duplicados por fecha
  const yaExiste = existentes.some(s => s.fecha === sorteo.fecha);
  if (yaExiste) return;
  
  existentes.push(sorteo);
  
  // Ordenar por fecha
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

/**
 * Combina el histórico estático con los sorteos locales guardados
 */
export async function obtenerHistoricoCompleto(): Promise<SorteoPrimitiva[]> {
  const locales = await obtenerSorteosLocales();
  return [...HISTORICO_PRIMITIVA, ...locales];
}

/**
 * Intenta obtener el último sorteo de la API oficial de LAE
 * Nota: Este endpoint es público pero puede cambiar
 */
export async function fetchUltimoSorteoLAE(): Promise<SorteoPrimitiva | null> {
  try {
    // API pública de LAE para La Primitiva
    const response = await fetch(
      'https://www.loteriasyapuestas.es/servicios/buscadorSorteos?game_id=LAPR&celebrados=true&numero=1'
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // La API devuelve un array de sorteos
    if (!Array.isArray(data) || data.length === 0) return null;
    
    const sorteoAPI = data[0];
    
    // Mapear el formato de la API al nuestro
    // Nota: Ajusta esto según el formato real que devuelva la API
    const sorteo: SorteoPrimitiva = {
      fecha: sorteoAPI.fecha_sorteo || sorteoAPI.fecha || '',
      numeros: [
        sorteoAPI.numero1 || sorteoAPI.bola1,
        sorteoAPI.numero2 || sorteoAPI.bola2,
        sorteoAPI.numero3 || sorteoAPI.bola3,
        sorteoAPI.numero4 || sorteoAPI.bola4,
        sorteoAPI.numero5 || sorteoAPI.bola5,
        sorteoAPI.numero6 || sorteoAPI.bola6,
      ] as [number, number, number, number, number, number],
      complementario: sorteoAPI.complementario || sorteoAPI.complementario1 || 0,
      reintegro: sorteoAPI.reintegro !== undefined ? sorteoAPI.reintegro : null,
      joker: null,
    };
    
    return sorteo;
  } catch (error) {
    console.error('Error al obtener sorteo de LAE:', error);
    return null;
  }
}

/**
 * Fuerza la actualización manual desde la API
 */
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
