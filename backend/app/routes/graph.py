import math
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth import require_any_user
from app.database.neo4j_db import get_neo4j_session

router = APIRouter(prefix="/graph", tags=["Knowledge Graph"])

@router.get("/{patient_id}")
def get_patient_graph(patient_id: str, current_user: dict = Depends(require_any_user)):
    """
    Fetches the temporal knowledge graph for a patient from Neo4j 
    and structures it directly for React Flow rendering.
    """
    nodes_map = {}
    edges_list = []
    
    cypher = (
        "MATCH (p:Patient {id: $patient_id}) "
        "OPTIONAL MATCH (p)-[r]->(m) "
        "OPTIONAL MATCH (m)-[r2]->(m2) "
        "OPTIONAL MATCH (m2)-[r3]->(m3) "
        "OPTIONAL MATCH (m3)-[r4]->(m4) "
        "RETURN p, r, m, r2, m2, r3, m3, r4, m4"
    )
    
    try:
        with get_neo4j_session() as session:
            result = session.run(cypher, patient_id=patient_id)
            
            # Helper to register node
            def register_node(neo_node):
                if not neo_node:
                    return
                node_id = str(neo_node.id if hasattr(neo_node, "id") else getattr(neo_node, "element_id", id(neo_node)))
                
                # Check labels
                labels = list(neo_node.labels) if hasattr(neo_node, "labels") else ["Unknown"]
                node_type = labels[0] if labels else "Unknown"
                
                # Extract properties
                properties = {}
                if hasattr(neo_node, "items"):
                    properties = {k: v for k, v in neo_node.items()}
                elif hasattr(neo_node, "properties"):
                    properties = neo_node.properties
                elif hasattr(neo_node, "get"):
                    # Mock compatibility
                    properties = {k: neo_node.get(k) for k in ["id", "name", "value", "unit", "date", "severity", "dose", "start_date", "type", "message", "department"]}
                
                label_val = properties.get("name") or properties.get("test_name") or properties.get("type") or properties.get("disease") or properties.get("medication") or properties.get("department") or properties.get("value") or properties.get("date") or node_type
                if node_type == "Patient":
                    label_val = properties.get("name", "Patient")
                elif node_type == "Value":
                    label_val = f"Val: {properties.get('value', '')}"
                elif node_type == "Timestamp":
                    label_val = properties.get('date', '')
                    
                nodes_map[node_id] = {
                    "id": node_id,
                    "type": "customNode",
                    "data": {
                        "label": label_val,
                        "type": node_type,
                        "properties": properties
                    }
                }
                return node_id

            for record in result:
                # 1. Register main patient node
                p_id = register_node(record["p"])
                
                # 2. Register level-1 connected node
                m_node = record["m"]
                r_rel = record["r"]
                if m_node and p_id:
                    m_id = register_node(m_node)
                    
                    rel_type = r_rel.type if hasattr(r_rel, "type") else "RELATED_TO"
                    rel_id = f"e_{p_id}_{m_id}_{rel_type}"
                    
                    edge = {
                        "id": rel_id,
                        "source": p_id,
                        "target": m_id,
                        "label": rel_type,
                        "animated": rel_type in ["TRIGGERED_ALERT", "HAS_DISEASE"]
                    }
                    if edge not in edges_list:
                        edges_list.append(edge)
                        
                    # 3. Register level-2 connected node (e.g. LabEvent -> LabResult)
                    m2_node = record["m2"]
                    r2_rel = record["r2"]
                    if m2_node and m_id:
                        m2_id = register_node(m2_node)
                        
                        rel2_type = r2_rel.type if hasattr(r2_rel, "type") else "RELATED_TO"
                        rel2_id = f"e_{m_id}_{m2_id}_{rel2_type}"
                        
                        edge2 = {
                            "id": rel2_id,
                            "source": m_id,
                            "target": m2_id,
                            "label": rel2_type,
                            "animated": False
                        }
                        if edge2 not in edges_list:
                            edges_list.append(edge2)
                            
                        # 4. Register level-3 connected node (e.g. LabResult -> Value)
                        m3_node = record.get("m3")
                        r3_rel = record.get("r3")
                        if m3_node and m2_id:
                            m3_id = register_node(m3_node)
                            
                            rel3_type = r3_rel.type if hasattr(r3_rel, "type") else "HAS_VALUE"
                            rel3_id = f"e_{m2_id}_{m3_id}_{rel3_type}"
                            
                            edge3 = {
                                "id": rel3_id,
                                "source": m2_id,
                                "target": m3_id,
                                "label": rel3_type,
                                "animated": False
                            }
                            if edge3 not in edges_list:
                                edges_list.append(edge3)
                                
                            # 5. Register level-4 connected node (e.g. Value -> Timestamp)
                            m4_node = record.get("m4")
                            r4_rel = record.get("r4")
                            if m4_node and m3_id:
                                m4_id = register_node(m4_node)
                                
                                rel4_type = r4_rel.type if hasattr(r4_rel, "type") else "HAS_TIMESTAMP"
                                rel4_id = f"e_{m3_id}_{m4_id}_{rel4_type}"
                                
                                edge4 = {
                                    "id": rel4_id,
                                    "source": m3_id,
                                    "target": m4_id,
                                    "label": rel4_type,
                                    "animated": False
                                }
                                if edge4 not in edges_list:
                                    edges_list.append(edge4)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Neo4j graph fetch error: {str(e)}"
        )
        
    if not nodes_map:
        # Return empty list rather than failing if patient graph is empty
        return {"nodes": [], "edges": []}
        
    # --- DYNAMIC POSITIONING LAYOUT ALGORITHM (Concentric Radial Layout) ---
    # Arrange nodes in 4 concentric circles around the patient node
    nodes_list = list(nodes_map.values())
    patient_node = next((n for n in nodes_list if n["data"]["type"] == "Patient"), None)
    
    center_x = 400
    center_y = 300
    
    if patient_node:
        patient_node["position"] = {"x": center_x, "y": center_y}
        
    orbit_1_nodes = [] # Level 1 nodes (Events, Alerts)
    orbit_2_nodes = [] # Level 2 nodes (Disease, Medication, Doctor, LabResult)
    orbit_3_nodes = [] # Level 3 nodes (Value)
    orbit_4_nodes = [] # Level 4 nodes (Timestamp)
    
    for n in nodes_list:
        ntype = n["data"]["type"]
        if ntype == "Patient":
            continue
        if ntype in ["LabEvent", "DiagnosisEvent", "MedicationEvent", "VisitEvent", "Alert"]:
            orbit_1_nodes.append(n)
        elif ntype in ["LabResult", "Disease", "Medication", "Doctor"]:
            orbit_2_nodes.append(n)
        elif ntype == "Value":
            orbit_3_nodes.append(n)
        elif ntype == "Timestamp":
            orbit_4_nodes.append(n)
        else:
            orbit_2_nodes.append(n)
            
    # Orbit 1 layout
    r1 = 160
    n1 = len(orbit_1_nodes)
    for idx, node in enumerate(orbit_1_nodes):
        angle = (2 * math.pi * idx) / n1 if n1 > 0 else 0
        node["position"] = {
            "x": center_x + r1 * math.cos(angle),
            "y": center_y + r1 * math.sin(angle)
        }
        
    # Orbit 2 layout
    r2 = 280
    n2 = len(orbit_2_nodes)
    for idx, node in enumerate(orbit_2_nodes):
        angle = (2 * math.pi * idx) / n2 if n2 > 0 else 0
        node["position"] = {
            "x": center_x + r2 * math.cos(angle + 0.25),
            "y": center_y + r2 * math.sin(angle + 0.25)
        }

    # Orbit 3 layout
    r3 = 400
    n3 = len(orbit_3_nodes)
    for idx, node in enumerate(orbit_3_nodes):
        angle = (2 * math.pi * idx) / n3 if n3 > 0 else 0
        node["position"] = {
            "x": center_x + r3 * math.cos(angle + 0.5),
            "y": center_y + r3 * math.sin(angle + 0.5)
        }

    # Orbit 4 layout
    r4 = 520
    n4 = len(orbit_4_nodes)
    for idx, node in enumerate(orbit_4_nodes):
        angle = (2 * math.pi * idx) / n4 if n4 > 0 else 0
        node["position"] = {
            "x": center_x + r4 * math.cos(angle + 0.75),
            "y": center_y + r4 * math.sin(angle + 0.75)
        }

    return {
        "nodes": nodes_list,
        "edges": edges_list
    }
