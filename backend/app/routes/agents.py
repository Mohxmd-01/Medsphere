from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from app.auth import require_physician, require_any_user
from app.agents.workflow import run_clinical_workflow
from app.database.mongo import get_mongo_db

router = APIRouter(prefix="/agents", tags=["Agent Orchestration"])

class RunAgentRequest(BaseModel):
    patient_id: str
    raw_text: Optional[str] = None
    doc_id: Optional[str] = None
    filename: Optional[str] = None

@router.post("/run")
def trigger_agent_pipeline(req: RunAgentRequest, current_user: dict = Depends(require_physician)):
    logger_db = get_mongo_db()
    # Check if patient exists
    p = logger_db["patients"].find_one({"patient_id": req.patient_id})
    if not p:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient {req.patient_id} does not exist."
        )
        
    try:
        # Execute the LangGraph flow
        result = run_clinical_workflow(
            patient_id=req.patient_id,
            raw_text=req.raw_text,
            doc_id=req.doc_id,
            filename=req.filename
        )
        
        # Format return payload (clean Mongo IDs)
        clean_res = dict(result)
        # Avoid serialization errors on pydantic
        return {
            "status": "success",
            "patient_id": clean_res.get("patient_id"),
            "risk_assessment": clean_res.get("risk_assessment"),
            "alerts": clean_res.get("alerts"),
            "execution_logs": clean_res.get("execution_logs")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running Multi-Agent workflow: {str(e)}"
        )

@router.get("/status/{patient_id}")
def get_agent_execution_status(patient_id: str, current_user: dict = Depends(require_any_user)):
    db = get_mongo_db()
    
    # Query latest multi-agent output
    output = db["agent_outputs"].find_one({"patient_id": patient_id})
    if not output:
        return {
            "patient_id": patient_id,
            "status": "idle",
            "message": "No active agent executions found for this patient.",
            "execution_logs": []
        }
        
    # Format return logs
    clean_out = dict(output)
    if "_id" in clean_out:
        del clean_out["_id"]
        
    return {
        "patient_id": patient_id,
        "status": "completed",
        "timestamp": clean_out.get("timestamp"),
        "execution_logs": clean_out.get("execution_logs", []),
        "reasoning_report": clean_out.get("reasoning_report"),
        "explanation_report": clean_out.get("explanation_report")
    }
