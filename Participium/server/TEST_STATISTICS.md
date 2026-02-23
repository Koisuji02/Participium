# Test delle Statistiche Pubbliche

## Prerequisiti
Assicurati che il server sia in esecuzione sulla porta 5000:
```bash
npm run dev
```

## Endpoint Implementati

### 1. Statistiche Pubbliche Complete
**Endpoint:** `GET /api/v1/statistics/public`

**Query Parameters:**
- `period` (opzionale): `day` | `week` | `month` (default: `day`)

**Esempi di chiamata:**

```bash
# Statistiche giornaliere (default)
curl http://localhost:5000/api/v1/statistics/public

# Statistiche settimanali
curl http://localhost:5000/api/v1/statistics/public?period=week

# Statistiche mensili
curl http://localhost:5000/api/v1/statistics/public?period=month
```

**Risposta attesa:**
```json
{
  "byCategory": [
    {
      "category": "PUBLIC_WORKS",
      "count": 15
    },
    {
      "category": "ENVIRONMENT",
      "count": 8
    }
  ],
  "trends": {
    "period": "day",
    "data": [
      {
        "period": "2025-12-30",
        "count": 3
      },
      {
        "period": "2025-12-29",
        "count": 5
      }
    ]
  }
}
```

---

### 2. Count per Categoria Specifica
**Endpoint:** `GET /api/v1/statistics/category/:category`

**Path Parameters:**
- `category`: Tipo di categoria (PUBLIC_WORKS, ENVIRONMENT, TRAFFIC, etc.)

**Esempi di chiamata:**

```bash
# Count per lavori pubblici
curl http://localhost:5000/api/v1/statistics/category/PUBLIC_WORKS

# Count per ambiente
curl http://localhost:5000/api/v1/statistics/category/ENVIRONMENT

# Count per traffico
curl http://localhost:5000/api/v1/statistics/category/TRAFFIC
```

**Risposta attesa:**
```json
{
  "category": "PUBLIC_WORKS",
  "count": 15
}
```

---

### 3. Trends per Periodo Specifico
**Endpoint:** `GET /api/v1/statistics/trends/:period`

**Path Parameters:**
- `period`: `day` | `week` | `month`

**Esempi di chiamata:**

```bash
# Trends giornalieri
curl http://localhost:5000/api/v1/statistics/trends/day

# Trends settimanali
curl http://localhost:5000/api/v1/statistics/trends/week

# Trends mensili
curl http://localhost:5000/api/v1/statistics/trends/month
```

**Risposta attesa:**
```json
{
  "period": "day",
  "data": [
    {
      "period": "2025-12-30",
      "count": 3
    },
    {
      "period": "2025-12-29",
      "count": 5
    },
    {
      "period": "2025-12-28",
      "count": 2
    }
  ]
}
```

---

## Test con PowerShell (Windows)

Se preferisci usare PowerShell invece di curl:

```powershell
# Statistiche pubbliche
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/statistics/public" -Method Get | ConvertTo-Json

# Statistiche settimanali
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/statistics/public?period=week" -Method Get | ConvertTo-Json

# Count per categoria
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/statistics/category/PUBLIC_WORKS" -Method Get | ConvertTo-Json

# Trends mensili
Invoke-RestMethod -Uri "http://localhost:5000/api/v1/statistics/trends/month" -Method Get | ConvertTo-Json
```

---

## Test con Browser

Puoi anche aprire direttamente nel browser:

- http://localhost:5000/api/v1/statistics/public
- http://localhost:5000/api/v1/statistics/public?period=week
- http://localhost:5000/api/v1/statistics/category/PUBLIC_WORKS
- http://localhost:5000/api/v1/statistics/trends/day

---

## Categorie Disponibili

Le categorie valide per i test sono definite in `OfficeType`:
- `PUBLIC_WORKS`
- `ENVIRONMENT`
- `TRAFFIC`
- `HEALTH`
- `EDUCATION`
- `SECURITY`
- (vedi il file `OfficeType.ts` per l'elenco completo)

---

## Note
- ✅ **Nessuna autenticazione richiesta** - endpoint pubblici
- ✅ Include solo report **approved** (stati: ASSIGNED, IN_PROGRESS, SUSPENDED)
- ✅ Trends limitati agli ultimi 30 periodi
- ✅ Gestione errori per parametri non validi
