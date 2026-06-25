from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from app.auth import require_any_user
from app.database.mongo import get_mongo_db
from app.database.qdrant_db import get_qdrant_client, embedding_helper

router = APIRouter(prefix="/guidelines", tags=["Guideline Explorer"])

@router.get("")
def list_guidelines(current_user: dict = Depends(require_any_user)):
    """Lists all guideline documents in MongoDB."""
    db = get_mongo_db()
    docs = list(db["documents"].find({"doc_type": "guideline"}))
    
    cleaned_docs = []
    for d in docs:
        di = dict(d)
        if "_id" in di:
            del di["_id"]
        cleaned_docs.append(di)
    return cleaned_docs

@router.get("/search")
def search_guidelines(query: str, limit: int = 5, current_user: dict = Depends(require_any_user)):
    """Performs semantic vector search in Qdrant guidelines collection."""
    if not query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string is required"
        )
        
    client = get_qdrant_client()
    try:
        query_vector = embedding_helper.get_embedding(query)
        search_res = client.search(
            collection_name="guidelines",
            query_vector=query_vector,
            limit=limit
        )
        
        matches = []
        for point in search_res:
            matches.append({
                "doc_id": point.payload.get("doc_id"),
                "filename": point.payload.get("filename"),
                "text": point.payload.get("text"),
                "score": round(point.score, 4)
            })
        return {
            "query": query,
            "results": matches
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Semantic vector search failed: {str(e)}"
        )
