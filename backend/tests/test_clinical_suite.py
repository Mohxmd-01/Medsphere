import os
import pytest
from app.config import settings
from app.auth import get_password_hash, verify_password, create_access_token
from app.nlp.clinical_nlp import extract_clinical_entities
from app.database.mongo import get_mongo_db
from app.database.neo4j_db import get_neo4j_session
from app.database.qdrant_db import get_qdrant_client, embedding_helper
from app.database.kg_rag import perform_hybrid_kg_rag
from app.agents.workflow import run_clinical_workflow
from app.ml.risk_trainer import train_risk_model

def test_config_loader():
    """Verify system config settings loaded correctly."""
    assert settings.JWT_ALGORITHM == "HS256"
    assert settings.OPENAI_MODEL == "gpt-4o-mini"
    assert "medsphere" in settings.MONGO_DB_NAME

def test_auth_password_hashing():
    """Verify hashing and verification passwords."""
    password = "secretpassword123"
    hashed = get_password_hash(password)
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrongpassword", hashed) is False

def test_jwt_token_creation():
    """Verify JWT tokens encoding/decoding."""
    user_data = {"sub": "doctor_taylor", "role": "Physician"}
    token = create_access_token(user_data)
    assert token is not None
    assert isinstance(token, str)

def test_clinical_nlp_entity_parser():
    """Verify regex-based entity parsing in the clinical NLP fallback."""
    raw_note = "Patient ID: P00001. Patient Sarah Taylor has Obesity and Prediabetes. Prescribed Losartan 50mg and Rosuvastatin 10mg. Latest HbA1c is 9.7%. Checked by Dr. Wilson."
    
    # We call the fallback extraction directly to verify heuristics
    from app.nlp.clinical_nlp import extract_entities_fallback
    entities = extract_entities_fallback(raw_note)
    
    assert any(d["name"] == "Obesity" for d in entities["diseases"])
    assert any(d["name"] == "Prediabetes" for d in entities["diseases"])
    assert any(m["name"] == "Losartan" for m in entities["medications"])
    assert any(l["test_name"] == "HbA1c" and l["value"] == "9.7" for l in entities["labs"])
    assert "Dr. Wilson" in entities["doctors"]

def test_importer_and_trainer_pipeline():
    """Verify training runs and models directory writes files."""
    # Run risk training execution
    success = train_risk_model()
    assert success is True
    
    # Check model file is created
    models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models")
    model_path = os.path.join(models_dir, "risk_model.pkl")
    assert os.path.exists(model_path) is True

def test_kg_rag_retrieval():
    """Verify hybrid KG-RAG merges vector search and graph entities."""
    res = perform_hybrid_kg_rag("What is the guideline for HbA1c in Diabetes?", limit=2)
    assert "vector_results" in res
    assert "graph_results" in res
    assert "synthesized_context" in res
    assert "=== HYBRID KG-RAG CONTEXT ===" in res["synthesized_context"]

def test_multi_agent_workflow_orchestrator():
    """Verify sequential execution of the 8 LangGraph nodes."""
    raw_note = "Patient Sarah is diagnosed with Hypertension and Obesity. HbA1c: 6.9%. LDL: 120."
    
    # Run workflow
    output = run_clinical_workflow(
        patient_id="P00001",
        raw_text=raw_note,
        filename="test_note.txt"
    )
    
    assert output is not None
    assert "extracted_entities" in output
    assert "risk_assessment" in output
    assert "reasoning_report" in output
    assert "execution_logs" in output
    
    # Verify all 8 agents generated execution trace logs
    logs = output["execution_logs"]
    agent_names = [l["agent_name"] for l in logs]
    
    assert "Document Processing Agent" in agent_names
    assert "Clinical NLP Agent" in agent_names
    assert "Knowledge Graph Agent" in agent_names
    assert "Trend Agent" in agent_names
    assert "Risk Agent" in agent_names
    assert "Guideline Agent" in agent_names
    assert "Alert Agent" in agent_names
    assert "Reasoning Agent" in agent_names
    
    assert all(l["status"] == "completed" for l in logs)
