#!/usr/bin/env python3
"""
La Primitiva Proxy - Multi-fuente
Intenta LAE primero, luego fuentes alternativas
"""

import time
from datetime import datetime, timezone
from typing import Any

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="La Primitiva Proxy")

# Cache simple en memoria (proceso único). Evita golpear la web de LAE en cada
# request y reduce el riesgo de que bloqueen la IP del proxy por exceso de tráfico.
# Los sorteos de La Primitiva solo cambian un par de veces por semana, así que un
# TTL de unos minutos es seguro y no afecta la frescura percibida por el usuario.
_CACHE_TTL_SECONDS = 300
_cache: dict[str, tuple[float, dict[str, Any]]] = {}


def _cache_get(key: str) -> dict[str, Any] | None:
    entry = _cache.get(key)
    if entry is None:
        return None
    ts, value = entry
    if time.monotonic() - ts > _CACHE_TTL_SECONDS:
        del _cache[key]
        return None
    return value


def _cache_set(key: str, value: dict[str, Any]) -> None:
    _cache[key] = (time.monotonic(), value)

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

LAE_API = "https://www.loteriasyapuestas.es/servicios/buscadorSorteos"

# Fuentes alternativas (HTML scraping como fallback)
ALT_URLS = [
    "https://primitivacomprobar.mundodeportivo.com/",
    "https://www.combinacionganadora.com/primitiva/",
]


def _parse_sorteo(data: dict) -> dict:
    numeros = sorted([
        int(data.get("numero1", data.get("bola1", 0))),
        int(data.get("numero2", data.get("bola2", 0))),
        int(data.get("numero3", data.get("bola3", 0))),
        int(data.get("numero4", data.get("bola4", 0))),
        int(data.get("numero5", data.get("bola5", 0))),
        int(data.get("numero6", data.get("bola6", 0))),
    ])
    fecha_raw = data.get("fecha_sorteo", data.get("fecha", "01/01/2026"))
    return {
        "id": f"primitiva-{fecha_raw.replace('/', '-')}",
        "gameName": "La Primitiva",
        "fecha": fecha_raw,
        "numeros": numeros,
        "complementario": int(data.get("complementario", data.get("complementario1", 0))),
        "reintegro": int(data.get("reintegro", -1)) if data.get("reintegro") is not None else None,
        "joker": int(data.get("joker", 0)) if data.get("joker") else None,
        "drawDate": f"{fecha_raw[6:10]}-{fecha_raw[3:5]}-{fecha_raw[0:2]}T00:00:00.000Z" if len(fecha_raw) == 10 else "",
    }


async def _fetch_from_lae() -> list[dict]:
    """Intenta obtener desde la API oficial de LAE"""
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(
            LAE_API,
            params={"game_id": "LAPR", "celebrados": "true", "numero": 1},
            headers=HEADERS,
        )
        resp.raise_for_status()
        data = resp.json()
        if isinstance(data, list) and len(data) > 0:
            return [_parse_sorteo(data[0])]
        return []


async def _fetch_from_alternatives() -> list[dict]:
    """
    TODO: sin implementar. ALT_URLS lista fuentes candidatas, pero aquí no se
    hace scraping real todavía. Mientras esto devuelva [], el endpoint
    /primitiva/latest depende por completo de que la API de LAE responda.
    """
    return []


@app.get("/")
async def root() -> dict[str, str]:
    return {"status": "ok", "service": "la-primitiva-proxy"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/primitiva/latest")
async def latest_primitiva() -> dict[str, Any]:
    cached = _cache_get("latest")
    if cached is not None:
        return cached

    errors: list[str] = []
    results: list[dict] = []

    # 1. Intentar LAE
    try:
        results = await _fetch_from_lae()
        if results:
            payload = {
                "source": "LAE - Loterías y Apuestas del Estado",
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "results": results,
            }
            _cache_set("latest", payload)
            return payload
    except Exception as e:
        msg = f"LAE: {e}"
        print(f"[ERROR] {msg}")
        errors.append(msg)

    # 2. Intentar alternativas
    try:
        results = await _fetch_from_alternatives()
        if results:
            return {
                "source": "Fuente alternativa",
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "results": results,
            }
    except Exception as e:
        msg = f"Alt: {e}"
        print(f"[ERROR] {msg}")
        errors.append(msg)

    # 3. Nada funcionó
    return {
        "source": "Ninguna fuente disponible",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "results": [],
        "error": " | ".join(errors),
    }


@app.get("/primitiva/historial/{days}")
async def historial_primitiva(days: int = 7) -> dict[str, Any]:
    error_msg: str | None = None

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(
                LAE_API,
                params={"game_id": "LAPR", "celebrados": "true", "numero": days},
                headers=HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list):
                results = [_parse_sorteo(s) for s in data]
                return {
                    "source": "LAE",
                    "updatedAt": datetime.now(timezone.utc).isoformat(),
                    "results": results,
                }
            error_msg = f"Respuesta inesperada de LAE (no es una lista): {type(data).__name__}"
    except Exception as e:
        error_msg = str(e)
        print(f"[ERROR] Historial LAE: {error_msg}")

    return {
        "source": "LAE",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "results": [],
        "error": error_msg,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
