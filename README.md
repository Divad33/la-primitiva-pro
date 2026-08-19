# 🎰 La Primitiva Pro

Análisis estadístico completo del histórico de **La Primitiva** (España), con más de 4,100 sorteos desde 1985 hasta 2026.

## 📦 Instalación

```bash
npm install
```

## 🚀 Uso

### Ver estadísticas en consola
```bash
npm run stats
```

### Compilar TypeScript
```bash
npm run build
```

### Ejecutar tests
```bash
npm test
```

## 📁 Estructura del proyecto

```
la-primitiva-pro/
├── src/
│   ├── data/
│   │   └── primitiva-historico.ts    # 4,175 sorteos
│   ├── utils/
│   │   ├── estadisticas.ts            # Frecuencias, atrasos, sumas
│   │   ├── filtros.ts                # Filtrar y buscar sorteos
│   │   └── prediccion.ts             # Generar combinaciones
│   ├── types/
│   │   └── index.ts                  # Interfaces TypeScript
│   └── index.ts                      # Demo en consola
├── tests/
│   └── estadisticas.test.ts          # Tests con Jest
├── package.json
├── tsconfig.json
└── jest.config.js
```

## 📊 Funcionalidades

| Función | Descripción |
|---------|-------------|
| `calcularFrecuenciaNumeros()` | Frecuencia de cada número 1-49 |
| `calcularFrecuenciaComplementarios()` | Frecuencia del complementario |
| `calcularFrecuenciaReintegros()` | Frecuencia del reintegro 0-9 |
| `numerosAtrasados()` | Números que hace más sorteos que no salen |
| `distribucionParImpar()` | Balance pares/impares |
| `estadisticasSuma()` | Media, mínima y máxima de la suma de 6 números |
| `filtrarSorteos()` | Filtrar por año, número, fecha, etc. |
| `buscarCombinacion()` | Buscar si una combinación ya salió |
| `generarCombinacionPonderada()` | Generar basado en frecuencias |
| `generarCombinacionAtrasados()` | Generar con números atrasados |
| `generarCombinacionAleatoria()` | Generar aleatorio puro |

## ⚠️ Disclaimer

> **La lotería es un juego de azar.** Ningún análisis estadístico puede garantizar resultados. Este proyecto es únicamente con fines educativos y de entretenimiento.

## 📄 Licencia

MIT
