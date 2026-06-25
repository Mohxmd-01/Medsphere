# MedSphere AI - Production Deployment Guide

This document details configurations, network layouts, security guidelines, and scaling practices for deploying the MedSphere AI Platform in a production-ready environment.

---

## 🛠️ Cluster Architecture & Ports

| Service | Port | Internal URI | Purpose |
| ------- | ---- | ------------ | ------- |
| `mongodb` | `27017` | `mongodb://mongodb:27017/medsphere` | Primary metadata operational store |
| `neo4j` | `7474`, `7687` | `bolt://neo4j:7687` | Temporal knowledge graph relationships |
| `qdrant` | `6333`, `6334` | `http://qdrant:6333` | Guidelines & summaries vector index |
| `backend` | `8000` | `http://localhost:8000` | FastAPI REST endpoints & LangGraph workflow |
| `frontend` | `3000` | `http://localhost:3000` | Next.js 15 Patient Context Dashboard |

---

## 💾 Persistence Volumes Configuration

Docker-compose mounts specific volume names to guarantee data is persisted across container recreations:

1. `mongo_data` maps to `/data/db` on the `mongodb` service.
2. `neo4j_data` maps to `/data` and `neo4j_logs` maps to `/logs` on the `neo4j` service.
3. `qdrant_data` maps to `/qdrant/storage` on the `qdrant` service.

### Cleaning Database Data
If you need to reset the data imports and force the system to run a clean seed import of the mock datasets on the next launch:
```bash
# 1. Stop active containers
docker-compose down

# 2. Remove persisted volume data
docker volume rm medsphere_mongo_data medsphere_neo4j_data medsphere_qdrant_data
```

---

## ⚙️ Backend Environmental Overrides

Configure these environment variables in `backend/.env` (or via your Kubernetes config maps) to modify model properties:

* `OPENAI_MODEL`: Set model string (e.g. `gpt-4o` or `gpt-4o-mini`).
* `ALLOW_MOCK_FALLBACK`: Set to `false` in production to raise errors if live database connections drop, ensuring strict cluster validations.
* `ACCESS_TOKEN_EXPIRE_MINUTES`: Control JWT token expiration duration (defaults to 1440 minutes / 24 hours).
* `JWT_SECRET`: Generate a cryptographically secure key for production JWT signatures:
  ```bash
  python -c "import secrets; print(secrets.token_hex(32))"
  ```

---

## 🚀 Scaling and Multi-Agent Load Balancing

To handle higher document uploads capacity in a production environment:

1. **Horizontal Scaling**: Scale the FastAPI backend service horizontally. Uvicorn is lightweight, and multiple replicas can easily load balance incoming trigger queries since the state is processed sequentially inside LangGraph and persists outcomes directly to MongoDB.
2. **Dedicated NLP Models**: For high throughput clinical extraction, deploy a standalone MedSpaCy/SciSpaCy microservice instead of the API fallback parser, and link it via standard API calls.
