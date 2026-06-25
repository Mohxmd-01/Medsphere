import logging
from neo4j import GraphDatabase
from neo4j.exceptions import ServiceUnavailable, AuthError
from app.config import settings

logger = logging.getLogger("medsphere.database.neo4j")

class MockNeo4jResult:
    """Mock result set that mimics neo4j.Result wrapper."""
    def __init__(self, records):
        self._records = records

    def __iter__(self):
        return iter(self._records)

    def records(self):
        return self._records

    def data(self):
        return [dict(rec) for rec in self._records]

    def single(self):
        return self._records[0] if self._records else None

class MockNeo4jSession:
    """Mock session class mimicking Neo4j session interface."""
    def __init__(self, driver):
        self.driver = driver

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def run(self, query, parameters=None, **kwargs):
        return self.driver._execute_cypher(query, parameters or {})

    def execute_write(self, transaction_fn, *args, **kwargs):
        # In mock mode, we just pass a transaction proxy that calls run
        return transaction_fn(self, *args, **kwargs)

    def execute_read(self, transaction_fn, *args, **kwargs):
        return transaction_fn(self, *args, **kwargs)

class MockNeo4jDriver:
    """Mock driver storing nodes and relationships in memory and file for development."""
    def __init__(self):
        import os
        self.nodes = {}          # key: elementId or id, value: {id, labels: [], properties: {}}
        self.relationships = []  # items: {id, startNodeId, endNodeId, type, properties: {}}
        self._node_id_counter = 1000
        self._rel_id_counter = 5000
        self.nodes_index = {}    # key: (label, id_val_or_name_val_or_code_val), value: node dict
        self.relationships_index = set() # key: (startNodeId, endNodeId, type)
        self.auto_save = True
        self._filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_neo4j.json")
        self._load_from_disk()

    def _load_from_disk(self):
        import os
        import json
        if os.path.exists(self._filepath):
            try:
                with open(self._filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                nodes_raw = data.get("nodes", {})
                self.nodes = {int(k) if k.isdigit() else k: v for k, v in nodes_raw.items()}
                self.relationships = data.get("relationships", [])
                self._node_id_counter = data.get("node_id_counter", 1000)
                self._rel_id_counter = data.get("rel_id_counter", 5000)
                self._rebuild_index()
            except Exception as e:
                logger.error(f"Error loading Mock Neo4j DB from disk: {e}")

    def _rebuild_index(self):
        self.nodes_index = {}
        for n in self.nodes.values():
            for label in n.get("labels", []):
                for prop_k, prop_v in n["properties"].items():
                    if prop_v is not None:
                        self.nodes_index[(label, prop_k, prop_v)] = n
                        self.nodes_index[(label, prop_k, str(prop_v))] = n
        self.relationships_index = set()
        for r in self.relationships:
            self.relationships_index.add((r["startNodeId"], r["endNodeId"], r["type"]))

    def _save_to_disk(self):
        if not getattr(self, "auto_save", True):
            return
        import json
        try:
            with open(self._filepath, "w", encoding="utf-8") as f:
                json.dump({
                    "nodes": self.nodes,
                    "relationships": self.relationships,
                    "node_id_counter": self._node_id_counter,
                    "rel_id_counter": self._rel_id_counter
                }, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving Mock Neo4j DB to disk: {e}")

    def close(self):
        pass

    def session(self, **kwargs):
        return MockNeo4jSession(self)

    def verify_connectivity(self):
        pass

    def _execute_cypher(self, query, params):
        query_upper = query.upper()
        if "DETACH DELETE" in query_upper:
            # Check if we are clearing the entire database: e.g. MATCH (n) DETACH DELETE n
            if "PID" not in query_upper and "$PID" not in query_upper and "PATIENT_ID" not in query_upper:
                self.nodes = {}
                self.relationships = []
                self._node_id_counter = 1000
                self._rel_id_counter = 5000
                self.nodes_index = {}
                self.relationships_index = set()
                self._save_to_disk()
                return MockNeo4jResult([])
            else:
                # Specific detach delete.
                pid_val = params.get("pid") or params.get("patient_id")
                if pid_val:
                    # Find all patient nodes matching pid_val
                    p_nodes = [n for n in self.nodes.values() if "Patient" in n["labels"] and n["properties"].get("id") == pid_val]
                    for p_node in p_nodes:
                        p_id = p_node["id"]
                        if "DETACH DELETE M" in query_upper:
                            # Delete connected nodes 'm' and their relationships
                            rels_to_delete = [r for r in self.relationships if r["startNodeId"] == p_id or r["endNodeId"] == p_id]
                            connected_node_ids = set()
                            for r in rels_to_delete:
                                connected_node_ids.add(r["startNodeId"])
                                connected_node_ids.add(r["endNodeId"])
                            connected_node_ids.discard(p_id)
                            
                            # Delete connected nodes
                            for c_id in connected_node_ids:
                                self.nodes.pop(c_id, None)
                            # Delete relationships
                            self.relationships = [r for r in self.relationships if r["startNodeId"] != p_id and r["endNodeId"] != p_id]
                        else:
                            # Just delete patient node and its relationships
                            self.nodes.pop(p_id, None)
                            self.relationships = [r for r in self.relationships if r["startNodeId"] != p_id and r["endNodeId"] != p_id]
                    self._rebuild_index()
                    self._save_to_disk()
                return MockNeo4jResult([])

        # Handle Alert count queries: MATCH (a:Alert) RETURN count(a) as cnt
        import re
        alert_count_match = re.search(r'MATCH\s*\((\w+):(\w+)\)\s*RETURN\s*count\(\1\)\s*as\s*(\w+)', query, re.IGNORECASE)
        if alert_count_match:
            label = alert_count_match.group(2)
            alias = alert_count_match.group(3)
            cnt = sum(1 for n in self.nodes.values() if label in n.get("labels", []))
            # Wrap record in a helper that mimics Neo4j records
            record = type("Record", (object,), {
                "__getitem__": lambda self, key: cnt if key == alias else None,
                "get": lambda self, key, default=None: cnt if key == alias else default,
                "items": lambda self: [(alias, cnt)]
            })()
            return MockNeo4jResult([record])

        # 1. Match and return graph nodes and relationships for React Flow (visualization)
        if "MATCH" in query_upper and "RETURN" in query_upper and ("R" in params or "patient_id" in params or "id" in params or "patientId" in params):
            patient_id = params.get("patient_id") or params.get("id") or params.get("patientId")
            
            p_node = None
            for n in self.nodes.values():
                if "Patient" in n["labels"] and n["properties"].get("id") == patient_id:
                    p_node = n
                    break
                    
            if not p_node:
                return MockNeo4jResult([])
                
            def wrap_node(n):
                if not n:
                    return None
                return type("Node", (object,), {
                    "id": n["id"],
                    "labels": n["labels"],
                    "items": lambda: n["properties"].items(),
                    "get": n["properties"].get,
                    "keys": lambda: n["properties"].keys()
                })()
                
            def wrap_rel(r):
                if not r:
                    return None
                return type("Relationship", (object,), {
                    "id": r["id"],
                    "type": r["type"],
                    "start_node": r["startNodeId"],
                    "end_node": r["endNodeId"],
                    "get": r["properties"].get
                })()
                
            records = []
            pid = p_node["id"]
            
            # Find all nodes and relationships directly or indirectly connected up to 4 hops
            l1_rels = [r for r in self.relationships if r["startNodeId"] == pid or r["endNodeId"] == pid]
            if not l1_rels:
                records.append({
                    "p": wrap_node(p_node), "r": None, "m": None,
                    "r2": None, "m2": None, "r3": None, "m3": None, "r4": None, "m4": None
                })
            else:
                for r1 in l1_rels:
                    m1_id = r1["endNodeId"] if r1["startNodeId"] == pid else r1["startNodeId"]
                    m1_node = self.nodes.get(m1_id)
                    
                    l2_rels = [r for r in self.relationships if (r["startNodeId"] == m1_id or r["endNodeId"] == m1_id) and r["id"] != r1["id"]]
                    if not l2_rels:
                        records.append({
                            "p": wrap_node(p_node), "r": wrap_rel(r1), "m": wrap_node(m1_node),
                            "r2": None, "m2": None, "r3": None, "m3": None, "r4": None, "m4": None
                        })
                    else:
                        for r2 in l2_rels:
                            m2_id = r2["endNodeId"] if r2["startNodeId"] == m1_id else r2["startNodeId"]
                            m2_node = self.nodes.get(m2_id)
                            
                            l3_rels = [r for r in self.relationships if (r["startNodeId"] == m2_id or r["endNodeId"] == m2_id) and r["id"] not in [r1["id"], r2["id"]]]
                            if not l3_rels:
                                records.append({
                                    "p": wrap_node(p_node), "r": wrap_rel(r1), "m": wrap_node(m1_node),
                                    "r2": wrap_rel(r2), "m2": wrap_node(m2_node),
                                    "r3": None, "m3": None, "r4": None, "m4": None
                                })
                            else:
                                for r3 in l3_rels:
                                    m3_id = r3["endNodeId"] if r3["startNodeId"] == m2_id else r3["startNodeId"]
                                    m3_node = self.nodes.get(m3_id)
                                    
                                    l4_rels = [r for r in self.relationships if (r["startNodeId"] == m3_id or r["endNodeId"] == m3_id) and r["id"] not in [r1["id"], r2["id"], r3["id"]]]
                                    if not l4_rels:
                                        records.append({
                                            "p": wrap_node(p_node), "r": wrap_rel(r1), "m": wrap_node(m1_node),
                                            "r2": wrap_rel(r2), "m2": wrap_node(m2_node),
                                            "r3": wrap_rel(r3), "m3": wrap_node(m3_node),
                                            "r4": None, "m4": None
                                        })
                                    else:
                                        for r4 in l4_rels:
                                            m4_id = r4["endNodeId"] if r4["startNodeId"] == m3_id else r4["startNodeId"]
                                            m4_node = self.nodes.get(m4_id)
                                            records.append({
                                                "p": wrap_node(p_node), "r": wrap_rel(r1), "m": wrap_node(m1_node),
                                                "r2": wrap_rel(r2), "m2": wrap_node(m2_node),
                                                "r3": wrap_rel(r3), "m3": wrap_node(m3_node),
                                                "r4": wrap_rel(r4), "m4": wrap_node(m4_node)
                                            })
            return MockNeo4jResult(records)

        # 2. SEEDING / GRAPH POPULATION QUERIES
        labels = ["Patient", "Visit", "Disease", "Medication", "LabResult", "Symptom", "Procedure", "Doctor", "Guideline", "Alert", "LabEvent", "MedicationEvent", "VisitEvent", "DiagnosisEvent", "Value", "Timestamp"]
        
        # Parse MERGE or CREATE nodes
        node_vars = {}
        node_matches = re.findall(r'\((\w+):(\w+)\s*(\{.*?\})?\)', query)
        for var, label, props_str in node_matches:
            if label in labels:
                node_vars[var] = label
                
                # Parse all properties in the matching block
                matched_props = {}
                if props_str:
                    p_keys = re.findall(r'(\w+):\s*\$(\w+)', props_str)
                    for prop_k, prop_p in p_keys:
                        if prop_p in params:
                            matched_props[prop_k] = params[prop_p]
                
                # Try to find using nodes_index (O(1))
                existing_node = None
                if matched_props:
                    first_k, first_v = list(matched_props.items())[0]
                    cand = self.nodes_index.get((label, first_k, first_v)) or self.nodes_index.get((label, first_k, str(first_v)))
                    if cand:
                        all_match = True
                        for k, v in matched_props.items():
                            val_in_node = cand["properties"].get(k)
                            if val_in_node != v and str(val_in_node) != str(v):
                                all_match = False
                                break
                        if all_match:
                            existing_node = cand
                
                if not existing_node:
                    n_id = self._node_id_counter
                    self._node_id_counter += 1
                    
                    properties = {}
                    for k, v in matched_props.items():
                        properties[k] = v
                        
                    # Find other properties being assigned to this node in SET statements
                    for pk, pv in params.items():
                        if pk in query:
                            prop_matches = re.findall(rf'\b{var}\.(\w+)\s*=\s*\${pk}\b', query)
                            for pm in prop_matches:
                                properties[pm] = pv
                                
                    self.nodes[n_id] = {
                        "id": n_id,
                        "labels": [label],
                        "properties": properties
                    }
                    node_vars[var] = n_id
                    
                    # Update index for new node
                    for prop_k, prop_v in properties.items():
                        if prop_v is not None:
                            self.nodes_index[(label, prop_k, prop_v)] = self.nodes[n_id]
                            self.nodes_index[(label, prop_k, str(prop_v))] = self.nodes[n_id]
                else:
                    # Update properties
                    for pk, pv in params.items():
                        if pk in query:
                            prop_matches = re.findall(rf'\b{var}\.(\w+)\s*=\s*\${pk}\b', query)
                            for pm in prop_matches:
                                existing_node["properties"][pm] = pv
                                self.nodes_index[(label, pm, pv)] = existing_node
                                self.nodes_index[(label, pm, str(pv))] = existing_node
                    node_vars[var] = existing_node["id"]

        # Parse Relationships
        rel_matches = re.findall(r'\((\w+)\)-.*?\[:(\w+)\].*?->\((\w+)\)', query)
        for start_var, rel_type, end_var in rel_matches:
            start_id = node_vars.get(start_var)
            end_id = node_vars.get(end_var)
            if start_id and end_id:
                exists = (start_id, end_id, rel_type) in self.relationships_index
                if not exists:
                    self.relationships.append({
                        "id": self._rel_id_counter,
                        "startNodeId": start_id,
                        "endNodeId": end_id,
                        "type": rel_type,
                        "properties": dict(params)
                    })
                    self.relationships_index.add((start_id, end_id, rel_type))
                    self._rel_id_counter += 1
        self._save_to_disk()
        return MockNeo4jResult([])

class Neo4jManager:
    def __init__(self):
        self.driver = None
        self.is_mock = False

    def connect(self):
        if settings.ALLOW_MOCK_FALLBACK:
            try:
                logger.info(f"Connecting to Neo4j Graph Database at {settings.NEO4J_URI}")
                self.driver = GraphDatabase.driver(
                    settings.NEO4J_URI,
                    auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD),
                    connection_timeout=2.0
                )
                self.driver.verify_connectivity()
                logger.info("Successfully connected to Neo4j.")
                self.is_mock = False
            except (ServiceUnavailable, AuthError, Exception) as e:
                logger.warning(f"Neo4j connection failed: {e}. Falling back to in-memory mock Neo4j driver.")
                self.driver = MockNeo4jDriver()
                self.is_mock = True
        else:
            self.driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
            )
            self.driver.verify_connectivity()
            self.is_mock = False

    def get_session(self):
        if not self.driver:
            self.connect()
        return self.driver.session()

neo4j_manager = Neo4jManager()

def get_neo4j_session():
    return neo4j_manager.get_session()
