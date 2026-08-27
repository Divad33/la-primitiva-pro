#!/usr/bin/env python3
"""
La Primitiva Proxy - Multi-fuente
Intenta LAE primero, luego fuentes alternativas
"""

import re
import time
import xml.etree.ElementTree as ET
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

# Feed RSS oficial de LAE. Es la MISMA fuente oficial (loteriasyapuestas.es),
# pero un endpoint distinto a LAE_API. En la práctica, los feeds RSS suelen
# tener mucha menos protección anti-bot que los endpoints JSON tipo XHR, así
# que cuando LAE_API empieza a bloquear al proxy (403 / Cloudflare), este
# suele seguir respondiendo. Formato de la descripción de cada <item>:
# "...del 21 de septiembre de 2024, la combinación ganadora ha correspondido
#  a los siguientes números: 05 - 12 - 13 - 38 - 39 - 47
#  Complementario: C(41) Reintegro: R(6) Joker: J(4208957)"
LAE_RSS = "https://www.loteriasyapuestas.es/es/la-primitiva/resultados/.formatoRSS"

_MESES_ES = {
    "enero": 1, "febrero": 2, "marzo": 3, "abril": 4, "mayo": 5, "junio": 6,
    "julio": 7, "agosto": 8, "septiembre": 9, "octubre": 10,
    "noviembre": 11, "diciembre": 12,
}

_RSS_DESC_RE = re.compile(
    r"del\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4}).*?"
    r"n[uú]meros:\s*([\d\s\-]+?)\s*Complementario:\s*C\((\d+)\)\s*"
    r"Reintegro:\s*R\((\d+)\)(?:\s*Joker:\s*J\((\d+)\))?",
    re.IGNORECASE | re.DOTALL,
)

# Fuentes alternativas por scraping HTML: candidatas listadas pero SIN
# implementar todavía (ver _fetch_from_alternatives). No se garantiza que
# funcionen: habría que inspeccionar su HTML actual antes de programar
# selectores, y son más frágiles que la fuente RSS de más arriba.
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


def _parse_rss_item(title: str, description: str) -> dict | None:
    """Extrae un sorteo del texto de un <item> del RSS oficial de LAE"""
    texto = f"{title} {description}"
    m = _RSS_DESC_RE.search(texto)
    if not m:
        return None
    dia, mes_nombre, anio, numeros_raw, comp, reint, joker = m.groups()
    mes = _MESES_ES.get(mes_nombre.lower())
    if mes is None:
        return None
    numeros = sorted(int(n) for n in re.findall(r"\d+", numeros_raw))
    if len(numeros) != 6:
        return None
    fecha = f"{int(dia):02d}/{mes:02d}/{anio}"
    return {
        "id": f"primitiva-{fecha.replace('/', '-')}",
        "gameName": "La Primitiva",
        "fecha": fecha,
        "numeros": numeros,
        "complementario": int(comp),
        "reintegro": int(reint),
        "joker": int(joker) if joker else None,
        "drawDate": f"{anio}-{mes:02d}-{int(dia):02d}T00:00:00.000Z",
    }


async def _fetch_from_lae_rss(limit: int = 1) -> list[dict]:
    """Fallback: feed RSS oficial de LAE (ver comentario junto a LAE_RSS)"""
    async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
        resp = await client.get(LAE_RSS, headers=HEADERS)
        resp.raise_for_status()
        root = ET.fromstring(resp.text)
        resultados: list[dict] = []
        for item in root.findall(".//item"):
            title = (item.findtext("title") or "").strip()
            description = (item.findtext("description") or "").strip()
            parsed = _parse_rss_item(title, description)
            if parsed:
                resultados.append(parsed)
            if len(resultados) >= limit:
                break
        return resultados


async def _fetch_from_alternatives() -> list[dict]:
    """
    TODO: sin implementar. ALT_URLS lista fuentes candidatas por scraping
    HTML, pero aquí no se hace scraping real todavía. Esto ya no es el único
    fallback: antes de llegar aquí se intenta LAE_API y luego LAE_RSS (ver
    _fetch_from_lae_rss), ambas fuentes oficiales. Solo si esas dos fallan
    se llega a este stub, que hoy devuelve [] siempre.
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

    # 1. Intentar LAE (API JSON oficial)
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

    # 2. Intentar LAE (RSS oficial) - mismo origen, endpoint distinto,
    #    normalmente con menos protección anti-bot que el paso 1
    try:
        results = await _fetch_from_lae_rss()
        if results:
            payload = {
                "source": "LAE - Loterías y Apuestas del Estado (RSS)",
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "results": results,
            }
            _cache_set("latest", payload)
            return payload
    except Exception as e:
        msg = f"LAE RSS: {e}"
        print(f"[ERROR] {msg}")
        errors.append(msg)

    # 3. Intentar alternativas
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

    # 4. Nada funcionó
    return {
        "source": "Ninguna fuente disponible",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "results": [],
        "error": " | ".join(errors),
    }


@app.get("/primitiva/historial/{days}")
async def historial_primitiva(days: int = 7) -> dict[str, Any]:
    errors: list[str] = []

    # 1. Intentar LAE (API JSON oficial)
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
            errors.append(f"Respuesta inesperada de LAE (no es una lista): {type(data).__name__}")
    except Exception as e:
        msg = f"LAE: {e}"
        print(f"[ERROR] Historial LAE: {msg}")
        errors.append(msg)

    # 2. Intentar LAE (RSS oficial). El feed no soporta pedir un rango de
    #    días como la API JSON, así que se piden como máximo `days` items
    #    (los que el feed traiga disponibles).
    try:
        results = await _fetch_from_lae_rss(limit=days)
        if results:
            return {
                "source": "LAE (RSS)",
                "updatedAt": datetime.now(timezone.utc).isoformat(),
                "results": results,
            }
    except Exception as e:
        msg = f"LAE RSS: {e}"
        print(f"[ERROR] Historial LAE RSS: {msg}")
        errors.append(msg)

    return {
        "source": "LAE",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "results": [],
        "error": " | ".join(errors) if errors else None,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
