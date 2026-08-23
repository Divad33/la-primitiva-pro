#!/usr/bin/env python3
"""
La Primitiva Proxy
Usa el endpoint JSON oficial de LAE (no scraping de HTML)
"""

from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="La Primitiva Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "es-ES,es;q=0.9",
    "Referer": "https://www.loteriasyapuestas.es/es/resultados/primitiva",
}

LAE_API_URL = "https://www.loteriasyapuestas.es/servicios/buscadorSorteos"


def _parse_sorteo(data: dict) -> dict:
    """Convierte la respuesta cruda de LAE al formato de la app"""
    numeros = sorted([
        int(data.get("numero1", data.get("bola1", 0))),
        int(data.get("numero2", data.get("bola2", 0))),
        int(data.get("numero3", data.get("bola3", 0))),
        int(data.get("numero4", data.get("bola4", 0))),
        int(data.get("numero5", data.get("bola5", 0))),
        int(data.get("numero6", data.get("bola6", 0))),
    ])
    
    fecha_raw = data.get("fecha_sorteo", data.get("fecha", ""))
    # fecha_raw viene como "DD/MM/YYYY"
    fecha = fecha_raw
    
    return {
        "id": f"primitiva-{fecha.replace('/', '-')}",
        "gameName": "La Primitiva",
        "fecha": fecha,
        "numeros": numeros,
        "complementario": int(data.get("complementario", data.get("complementario1", 0))),
        "reintegro": int(data.get("reintegro", -1)) if data.get("reintegro") is not None else None,
        "joker": int(data.get("joker", 0)) if data.get("joker") else None,
        "drawDate": f"{fecha[6:10]}-{fecha[3:5]}-{fecha[0:2]}T00:00:00.000Z" if len(fecha) == 10 else "",
    }


@app.get("/")
async def root() -> dict[str, str]:
    return {"status": "ok", "service": "la-primitiva-proxy"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/primitiva/latest")
async def latest_primitiva() -> dict[str, Any]:
    """Devuelve el último sorteo de La Primitiva desde la API oficial de LAE"""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                LAE_API_URL,
                params={"game_id": "LAPR", "celebrados": "true", "numero": 1},
                headers=HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()
            
            if not isinstance(data, list) or len(data) == 0:
                return {
                    "source": "LAE API",
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                    "results": [],
                    "error": "No hay sorteos disponibles",
                }
            
            sorteo = _parse_sorteo(data[0])
            
            return {
                "source": "LAE - Loterías y Apuestas del Estado",
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "results": [sorteo],
            }
            
    except Exception as e:
        print(f"[ERROR] Fallo al obtener LAE: {e}")
        return {
            "source": "LAE API",
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "results": [],
            "error": str(e),
        }


@app.get("/primitiva/historial/{days}")
async def historial_primitiva(days: int = 7) -> dict[str, Any]:
    """Obtiene los últimos N sorteos"""
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(
                LAE_API_URL,
                params={"game_id": "LAPR", "celebrados": "true", "numero": days},
                headers=HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()
            
            if not isinstance(data, list):
                return {
                    "source": "LAE API",
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                    "results": [],
                    "error": "Respuesta inesperada de LAE",
                }
            
            results = [_parse_sorteo(s) for s in data]
            
            return {
                "source": "LAE - Loterías y Apuestas del Estado",
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "results": results,
            }
            
    except Exception as e:
        print(f"[ERROR] Fallo al obtener historial LAE: {e}")
        return {
            "source": "LAE API",
            "updatedAt": datetime.now(timezone.utc).isoformat(),
            "results": [],
            "error": str(e),
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
