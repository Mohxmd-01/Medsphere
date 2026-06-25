import logging
from app.database.qdrant_db import get_qdrant_client, embedding_helper
from app.database.neo4j_db import get_neo4j_session
from app.config import settings

logger = logging.getLogger("medsphere.database.kg_rag")

def perform_hybrid_kg_rag(query: str, limit: int = 5) -> dict:
    """
    Executes Hybrid Knowledge Graph RAG.
    1. Vector retrieval from Qdrant guidelines collection.
    2. Entity-based sub-graph retrieval from Neo4j.
    3. Merges vector and graph contexts.
    """
    logger.info(f"Executing KG-RAG query: '{query}'")
    
    # --- STEP 1: VECTOR RETRIEVAL FROM QDRANT ---
    vector_results = []
    try:
        client = get_qdrant_client()
        query_vector = embedding_helper.get_embedding(query)
        
        # Search in guidelines
        search_res = client.search(
            collection_name="guidelines",
            query_vector=query_vector,
            limit=limit
        )
        
        for point in search_res:
            vector_results.append({
                "doc_id": point.payload.get("doc_id"),
                "filename": point.payload.get("filename"),
                "text": point.payload.get("text"),
                "score": point.score
            })
    except Exception as e:
        logger.error(f"Qdrant vector search failed: {e}")
        
    # --- STEP 2: ENTITY DETECTION & GRAPH RETRIEVAL FROM NEO4J ---
    # Extract clinical entities from the query string
    detected_entities = []
    lower_query = query.lower()
    clinical_keywords = ["diabetes", "obesity", "hypertension", "anemia", "heart disease", "cad", "prediabetes"]
    
    for kw in clinical_keywords:
        if kw in lower_query:
            detected_entities.append(kw)
            
    graph_context = []
    try:
        with get_neo4j_session() as session:
            for entity in detected_entities:
                # Find details of the Disease, related Medications, guidelines, and patient counts
                cypher = (
                    "MATCH (d:Disease) WHERE toLower(d.name) CONTAINS $entity "
                    "OPTIONAL MATCH (me:MedicationEvent)-[:RELATED_TO]->(m:Medication) "
                    "WHERE (me)-[:RELATED_TO]-(d) OR toLower(m.name) CONTAINS $entity "
                    "OPTIONAL MATCH (d)-[:LINKED_TO_GUIDELINE]->(g:Guideline) "
                    "RETURN d.name as disease, collect(distinct m.name) as medications, collect(distinct g.title) as guidelines"
                )
                res = session.run(cypher, entity=entity)
                for record in res:
                    disease_name = record["disease"]
                    meds = record["medications"]
                    guidelines = record["guidelines"]
                    graph_context.append({
                        "entity": disease_name,
                        "type": "Disease",
                        "associated_medications": meds,
                        "linked_guidelines": guidelines
                    })
    except Exception as e:
        logger.error(f"Neo4j graph retrieval failed: {e}")

    # --- STEP 3: SYNTHESIZE CONTEXTS ---
    # Construct a readable prompt segment
    context_str = "=== HYBRID KG-RAG CONTEXT ===\n\n"
    
    context_str += "--- Guideline Text Passages (Vector RAG) ---\n"
    if vector_results:
        for idx, item in enumerate(vector_results):
            context_str += f"[{idx+1}] File: {item['filename']} (Relevance Score: {item['score']:.3f})\n"
            context_str += f"Content: {item['text']}\n\n"
    else:
        context_str += "No guideline matches found in vector store.\n\n"
        
    context_str += "--- Clinical Knowledge Graph Context (Neo4j Graph RAG) ---\n"
    if graph_context:
        for item in graph_context:
            context_str += f"Entity: {item['entity']} ({item['type']})\n"
            if item['associated_medications']:
                context_str += f"  - Commonly Prescribed Medications: {', '.join(item['associated_medications'])}\n"
            if item['linked_guidelines']:
                context_str += f"  - Guidelines Associated in KG: {', '.join(item['linked_guidelines'])}\n"
            context_str += "\n"
    else:
        context_str += "No active clinical relationships matching query entities found in Neo4j.\n"

    return {
        "query": query,
        "vector_results": vector_results,
        "graph_results": graph_context,
        "synthesized_context": context_str
    }
