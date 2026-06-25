from typing import TypedDict, List, Dict, Any, Optional

class AgentLog(TypedDict):
    agent_name: str
    status: str       # "pending", "running", "completed", "failed"
    duration: float   # seconds
    message: str
    output_summary: str

class ClinicalState(TypedDict):
    # Inputs
    patient_id: str
    raw_text: Optional[str]
    doc_id: Optional[str]
    filename: Optional[str]
    
    # NLP outputs
    extracted_entities: Dict[str, Any]
    
    # Database status
    graph_updated: bool
    vector_indexed: bool
    
    # Analytics & ML outputs
    trends: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    
    # RAG Context
    retrieved_guidelines: List[Dict[str, Any]]
    
    # Alerts
    alerts: List[Dict[str, Any]]
    
    # Summaries & Explanations
    reasoning_report: str
    explanation_report: str
    
    # Execution Observer
    execution_logs: List[AgentLog]
    current_agent: str
