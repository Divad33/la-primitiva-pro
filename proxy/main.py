#!/usr/bin/env python3
"""
La Primitiva Proxy + Scraper
"""

import asyncio
import re
from datetime import datetime, timezone
from typing import Any

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="La Primitiva Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Headers para evitar bloqueos
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-ES,es;q=0.9",
}

# URL de resultados de La Primitiva
LAE_URL = "https://www.loteriasyapuestas.es/es/resultados/primitiva"


async def _fetch_primitiva() -> list:
    """Hace scraping de la web de LAE para obtener el último sorteo"""
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(LAE_URL, headers=HEADERS)
            resp.raise_for_status()
            return _parse_primitiva(resp.text)
        except Exception as e:
            print(f"[ERROR] Fallo al obtener LAE: {e}")
            return []


def _parse_primitiva(html: str) -> list:
    """Parsea el HTML de LAE para extraer números, complementario y reintegro"""
    soup = BeautifulSoup(html, "html.parser")
    results = []

    # Buscar la fecha del sorteo
    fecha_match = re.search(r'(\d{2})/(\d{2})/(\d{4})', soup.get_text())
    fecha = f"{fecha_match.group(1)}/{fecha_match.group(2)}/{fecha_match.group(3)}" if fecha_match else ""

    # Buscar números principales (6 bolas)
    # LAE muestra los números en elementos con clase específica o en texto
    numeros_text = soup.get_text()
    
    # Patrón: buscar 6 números consecutivos entre 1-49
    # Estrategia: buscar todos los números y tomar los 6 primeros que estén en rango
    all_numbers = re.findall(r'\b([1-9]|[1-4][0-9])\b', numeros_text)
    numeros = sorted(list(dict.fromkeys([int(n) for n in all_numbers if 1 <= int(n) <= 49]))[:6])

    if len(numeros) < 6:
        return []

    # Buscar complementario (texto cerca de "complementario")
    comp_match = re.search(r'complementario[^\d]*(\d{1,2})', numeros_text, re.IGNORECASE)
    complementario = int(comp_match.group(1)) if comp_match else 0

    # Buscar reintegro
    reint_match = re.search(r'reintegro[^\d]*(\d)', numeros_text, re.IGNORECASE)
    reintegro = int(reint_match.group(1)) if reint_match else None

    # Buscar Joker (7 dígitos)
    joker_match = re.search(r'joker[^\d]*(\d{7})', numeros_text, re.IGNORECASE)
    joker = int(joker_match.group(1)) if joker_match else None

    results.append({
        "id": f"primitiva-{fecha.replace('/', '-')}",
        "gameName": "La Primitiva",
        "fecha": fecha,
        "numeros": numeros,
        "complementario": complementario,
        "reintegro": reintegro,
        "joker": joker,
        "drawDate": f"{fecha_match.group(3)}-{fecha_match.group(2)}-{fecha_match.group(1)}T00:00:00.000Z" if fecha_match else "",
    })

    return results


@app.get("/")
async def root() -> dict[str, str]:
    return {"status": "ok", "service": "la-primitiva-proxy"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "healthy"}


@app.get("/primitiva/latest")
async def latest_primitiva() -> dict[str, Any]:
    """Endpoint principal: devuelve el último sorteo de La Primitiva"""
    draws = await _fetch_primitiva()
    
    return {
        "source": "LAE - Loterías y Apuestas del Estado",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "results": draws,
    }


@app.get("/primitiva/historial/{days}")
async def historial_primitiva(days: int = 7) -> dict[str, Any]:
    """Obtiene sorteos de los últimos N días (intentando fechas pasadas)"""
    all_draws = []
    today = datetime.now()
    
    for i in range(days):
        date = datetime.fromtimestamp(today.timestamp() - (i * 86400))
        # Para La Primitiva, los sorteos son martes, jueves y sábados
        weekday = date.weekday()
        if weekday in [1, 3, 5]:  # Martes=1, Jueves=3, Sábado=5
            # Nota: LAE no tiene URLs por fecha, solo la página general
            # Este endpoint devuelve el mismo resultado (solo hay un sorteo por día)
            pass
    
    draws = await _fetch_primitiva()
    
    return {
        "source": "LAE",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "results": draws,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
