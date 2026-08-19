import { generarEstadisticasCompletas } from './utils/estadisticas';
import { ultimosSorteos, sorteosPorAnio } from './utils/filtros';
import { generarBoletoEstrategias } from './utils/prediccion';

console.log('═══════════════════════════════════════════════════');
console.log('   LA PRIMITIVA PRO - Análisis Estadístico');
console.log('═══════════════════════════════════════════════════\n');

const stats = generarEstadisticasCompletas();

console.log(`📊 Total de sorteos analizados: ${stats.totalSorteos.toLocaleString()}`);
console.log(`📅 Período: ${stats.fechaInicio} → ${stats.fechaFin}\n`);

console.log('🔥 Números CALIENTES (más frecuentes):');
console.log('   ' + stats.numerosCalientes.join(', '));

console.log('\n❄️  Números FRÍOS (menos frecuentes):');
console.log('   ' + stats.numerosFrios.join(', '));

console.log('\n⏳ Números más ATRASADOS:');
stats.numerosMasAtrasados.slice(0, 5).forEach(a => {
  console.log(`   ${a.numero} → ${a.sorteosSinSalir} sorteos sin salir`);
});

console.log('\n⚖️  Distribución Par/Impar:');
console.log(`   Pares: ${stats.paresImpares.pares.toLocaleString()}`);
console.log(`   Impares: ${stats.paresImpares.impares.toLocaleString()}`);

console.log('\n📈 Estadísticas de SUMA:');
console.log(`   Media: ${stats.sumaMedia}`);
console.log(`   Mínima: ${stats.sumaMinima}`);
console.log(`   Máxima: ${stats.sumaMaxima}`);

console.log('\n🎰 Último sorteo registrado:');
const ultimo = ultimosSorteos(1)[0];
console.log(`   Fecha: ${ultimo.fecha}`);
console.log(`   Números: ${ultimo.numeros.join(', ')}`);
console.log(`   Complementario: ${ultimo.complementario}`);
console.log(`   Reintegro: ${ultimo.reintegro ?? 'N/D'}`);

console.log('\n🎯 Combinaciones sugeridas:');
const boletos = generarBoletoEstrategias();
console.log(`   Ponderada: ${boletos.ponderada.join(', ')}`);
console.log(`   Atrasados: ${boletos.atrasados.join(', ')}`);
console.log(`   Aleatoria: ${boletos.aleatoria.join(', ')}`);

console.log('\n═══════════════════════════════════════════════════');
console.log('   Nota: La lotería es azar. Estas herramientas');
console.log('   son solo para análisis estadístico.');
console.log('═══════════════════════════════════════════════════');
