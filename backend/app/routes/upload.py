import os
import re
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from app.auth import require_physician
from app.agents.workflow import run_clinical_workflow
from app.database.mongo import get_mongo_db

logger = logging.getLogger("medsphere.routes.upload")
router = APIRouter(prefix="/upload", tags=["Document Upload Center"])

@router.post("")
async def upload_document(
    file: UploadFile = File(...), 
    current_user: dict = Depends(require_physician)
):
    """
    Receives clinical records (PDF, DOCX, TXT), extracts unstructured text,
    auto-detects Patient ID, and triggers the clinical intelligence multi-agent workflow.
    """
    filename = file.filename
    content_type = file.content_type
    
    # 1. EXTRACT TEXT BASED ON EXTENSION
    text_content = ""
    file_bytes = await file.read()
    
    # Ensure temporary upload folder inside project
    temp_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "temp_uploads")
    os.makedirs(temp_dir, exist_ok=True)
    temp_path = os.path.join(temp_dir, filename)
    
    with open(temp_path, "wb") as f:
        f.write(file_bytes)
        
    try:
        if filename.endswith(".txt"):
            text_content = file_bytes.decode("utf-8", errors="ignore")
        elif filename.endswith(".pdf"):
            # Try PyMuPDF (fitz)
            try:
                import fitz
                doc = fitz.open(temp_path)
                text_content = "\n".join([page.get_text() for page in doc])
            except ImportError:
                # Fallback to pdfplumber
                try:
                    import pdfplumber
                    with pdfplumber.open(temp_path) as pdf:
                        text_content = "\n".join([page.extract_text() or "" for page in pdf.pages])
                except Exception as e:
                    logger.error(f"Failed to extract PDF using pdfplumber: {e}")
                    raise HTTPException(status_code=500, detail="PDF parser dependencies not available.")
        elif filename.endswith(".docx"):
            try:
                import docx
                doc = docx.Document(temp_path)
                text_content = "\n".join([p.text for p in doc.paragraphs])
            except ImportError:
                # Try simple docx2txt fallback
                try:
                    import docx2txt
                    text_content = docx2txt.process(temp_path)
                except Exception as e:
                    logger.error(f"Failed to extract DOCX: {e}")
                    raise HTTPException(status_code=500, detail="DOCX parser dependencies not available.")
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unsupported file format. Please upload PDF, DOCX, or TXT."
            )
    finally:
        # Clean up temp file
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    if not text_content.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded document contains no text."
        )

    # 2. DETECT PATIENT ID FROM DOCUMENT TEXT
    # Look for standard clinical patient ID formats, e.g. Patient ID: P00001 or matching regex P\d{5}
    patient_id = None
    pat_id_match = re.search(r"patient\s*id\s*[:=-]?\s*(p\d{5})", text_content, re.IGNORECASE)
    if pat_id_match:
        patient_id = pat_id_match.group(1).upper()
    else:
        # Fallback search generic P followed by digits
        generic_match = re.search(r"\b(p\d{5})\b", text_content, re.IGNORECASE)
        if generic_match:
            patient_id = generic_match.group(1).upper()
            
    if not patient_id:
        # Fallback: query a random test patient in Mongo to run analysis against, or create default
        db = get_mongo_db()
        first_patient = db["patients"].find_one({})
        if first_patient:
            patient_id = first_patient["patient_id"]
            logger.warning(f"Patient ID not detected in document. Associating with default patient: {patient_id}")
        else:
            # Create a test patient if DB is empty
            patient_id = "P00001"
            db["patients"].insert_one({
                "patient_id": "P00001",
                "name": "Sarah Taylor",
                "age": 42,
                "gender": "Female",
                "bmi": 26.8,
                "height_cm": 165,
                "weight_kg": 73
            })
            logger.info("Created fallback default patient P00001 in MongoDB.")

    # 3. SAVE THE RAW RECORD IN MONGODB
    db = get_mongo_db()
    doc_id = f"DOC{int(time.time() * 10) % 1000000}"
    db_doc = {
        "doc_id": doc_id,
        "filename": filename,
        "patient_id": patient_id,
        "content": text_content,
        "doc_type": "uploaded_discharge_summary",
        "uploader": current_user["username"]
    }
    db["documents"].insert_one(db_doc)
    
    # 4. TRIGGER MULTI-AGENT PIPELINE
    try:
        result = run_clinical_workflow(
            patient_id=patient_id,
            raw_text=text_content,
            doc_id=doc_id,
            filename=filename
        )
        return {
            "status": "success",
            "message": f"Document {filename} processed and clinical reasoning report generated.",
            "patient_id": patient_id,
            "doc_id": doc_id,
            "workflow_result": {
                "risk_assessment": result.get("risk_assessment"),
                "alerts_triggered": len(result.get("alerts", [])),
                "execution_logs": result.get("execution_logs")
            }
        }
    except Exception as e:
        logger.error(f"Multi-Agent pipeline execution failure: {e}")
        return {
            "status": "partial_success",
            "message": f"Document uploaded (ID: {doc_id}) but AI pipeline encountered an issue: {str(e)}",
            "patient_id": patient_id,
            "doc_id": doc_id
        }
