# Pheromone Nexus

A FastAPI and React/Vite demo of ant-colony methods for route-length problems.

## What it does

`backend/main.py` implements AS, EAS, and ASRank variants. The API accepts city coordinates and run parameters, then returns route and convergence data.

Routes include `POST /run/as`, `POST /run/eas`, `POST /run/asrank`, and `POST /run/all`, plus a health check.

## Run the API

From `backend/` in PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --reload
```

On macOS or Linux, use `.venv/bin/python` instead of `.\.venv\Scripts\python.exe`.

In a second PowerShell terminal, from `frontend/`:

```powershell
npm ci
$env:VITE_API_URL = "http://127.0.0.1:8000"
npm run dev
```

On macOS or Linux, start the client with `VITE_API_URL=http://127.0.0.1:8000 npm run dev`.

The commands match the source configuration. Installation and runtime behavior were not retested in this documentation pass.
