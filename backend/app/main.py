import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.mongo import mongo_manager
from app.database.neo4j_db import neo4j_manager
from app.database.qdrant_db import qdrant_manager
from app.auth import seed_default_users
from app.database.importer import import_all_data
from app.ml.risk_trainer import train_risk_model

# Import routers
from app.routes import auth, patients, agents, graph, guidelines, upload

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medsphere.main")

app = FastAPI(
    title="MedSphere AI",
    description="Enterprise Multi-Agent Clinical Intelligence Platform",
    version="1.0.0"
)

# CORS Middleware configurations
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, lock this down
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Startup events
@app.on_event("startup")
def startup_event():
    logger.info("Initializing MedSphere AI Database Connections...")
    
    # 1. Connect MongoDB
    mongo_manager.connect()
    
    # 2. Connect Neo4j
    neo4j_manager.connect()
    
    # 3. Connect Qdrant
    qdrant_manager.connect()
    
    # 4. Seed users
    seed_default_users()
    
    # 5. Check database state and import datasets if empty
    db = mongo_manager.db
    if db is not None:
        patient_count = db["patients"].count_documents({})
        if patient_count == 0:
            logger.info("Operational DB is empty. Executing automated dataset seed importer...")
            import_all_data()
            
            logger.info("Dataset loaded. Initializing XGBoost Classifier training...")
            train_risk_model()
        else:
            logger.info(f"Database contains {patient_count} patient records. Skipping initial importer.")
            # Ensure model file exists, otherwise train it
            models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
            model_path = os.path.join(models_dir, "risk_model.pkl")
            if not os.path.exists(model_path):
                logger.info("Model file risk_model.pkl not found. Training model now...")
                train_risk_model()
    else:
        logger.warning("DB manager is not initialized properly. Skipping seed check.")
        
    logger.info("MedSphere AI backend server is fully initialized and operational.")

# Mount routers
app.include_router(auth.router, prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(agents.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(guidelines.router, prefix="/api")
app.include_router(upload.router, prefix="/api")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "name": "MedSphere AI Clinical Decision Support API",
        "version": "1.0.0",
        "mongodb_mock": mongo_manager.is_mock,
        "neo4j_mock": neo4j_manager.is_mock,
        "qdrant_mock": qdrant_manager.is_mock
    }
import os
