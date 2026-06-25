import logging
import hashlib
import numpy as np
from qdrant_client import QdrantClient
from qdrant_client.http.exceptions import UnexpectedResponse
from qdrant_client.models import Distance, VectorParams, PointStruct
from app.config import settings

logger = logging.getLogger("medsphere.database.qdrant")

class EmbeddingHelper:
    """Helper to generate BAAI/bge-large-en-v1.5 embeddings with fallbacks."""
    def __init__(self):
        self.model = None
        self.dim = 1024  # BAAI/bge-large-en-v1.5 dimension
        self.is_mock = False

    def load_model(self):
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}")
            self.model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            logger.info("Embedding model loaded successfully.")
            self.is_mock = False
        except Exception as e:
            logger.warning(f"Could not load local sentence-transformers model ({e}). Using deterministic mock embeddings (dim={self.dim}).")
            self.is_mock = True

    def _get_mock_vector(self, text: str) -> list[float]:
        vocab = [
            "hba1c", "diabetes", "prediabetes", "insulin", "metformin", "losartan", 
            "hypertension", "bp", "systolic", "diastolic", "obesity", "bmi", "weight", 
            "guideline", "target", "value", "limit", "complication", "risk", "cad", 
            "anemia", "above", "8", "rosuvastatin", "clinical", "note", "discharge"
        ]
        text_lower = text.lower()
        vec = np.zeros(self.dim)
        for idx, word in enumerate(vocab):
            if word in text_lower:
                vec[idx] = 2.0
        
        sha256 = hashlib.sha256(text.encode("utf-8")).digest()
        rng = np.random.default_rng(int.from_bytes(sha256[:4], "big"))
        vec[len(vocab):] = rng.random(self.dim - len(vocab)) * 0.1
        
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()

    def get_embedding(self, text: str) -> list[float]:
        if not self.model and not self.is_mock:
            self.load_model()
        
        if self.is_mock or not self.model:
            return self._get_mock_vector(text)
        
        try:
            embedding = self.model.encode(text, normalize_embeddings=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error encoding embedding: {e}. Falling back to mock vector.")
            return self._get_mock_vector(text)

embedding_helper = EmbeddingHelper()

class MockQdrantClient:
    """In-memory mock Qdrant client with file persistence fallback."""
    def __init__(self):
        import os
        self._collections = {}
        self._filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_qdrant.json")
        self.auto_save = True
        self._load_from_disk()

    def _load_from_disk(self):
        import os
        import json
        if os.path.exists(self._filepath):
            try:
                with open(self._filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for col_name, pts_list in data.items():
                    self._collections[col_name] = []
                    for pt in pts_list:
                        self._collections[col_name].append(PointStruct(
                            id=pt["id"],
                            vector=pt["vector"],
                            payload=pt["payload"]
                        ))
            except Exception as e:
                logger.error(f"Error loading Mock Qdrant DB from disk: {e}")

    def _save_to_disk(self):
        if not getattr(self, "auto_save", True):
            return
        import json
        data = {}
        for col_name, pts in self._collections.items():
            data[col_name] = [
                {
                    "id": pt.id,
                    "vector": pt.vector,
                    "payload": pt.payload
                } for pt in pts
            ]
        try:
            with open(self._filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving Mock Qdrant DB to disk: {e}")

    def get_collections(self):
        return type("CollectionsResponse", (object,), {"collections": [type("CollectionInfo", (object,), {"name": name})() for name in self._collections.keys()]})()

    def collection_exists(self, collection_name: str) -> bool:
        return collection_name in self._collections

    def create_collection(self, collection_name: str, vectors_config, **kwargs):
        self._collections[collection_name] = []
        self._save_to_disk()
        return True

    def upsert(self, collection_name: str, points: list[PointStruct], **kwargs):
        if collection_name not in self._collections:
            self._collections[collection_name] = []
        # Update or add points
        existing_ids = {p.id for p in self._collections[collection_name]}
        for pt in points:
            if pt.id in existing_ids:
                # Remove existing
                self._collections[collection_name] = [p for p in self._collections[collection_name] if p.id != pt.id]
            self._collections[collection_name].append(pt)
        self._save_to_disk()
        return True

    def search(self, collection_name: str, query_vector: list[float], limit: int = 10, query_filter = None, **kwargs) -> list:
        if collection_name not in self._collections:
            return []
        
        # Calculate similarity (cosine similarity)
        results = []
        q_vec = np.array(query_vector)
        for pt in self._collections[collection_name]:
            p_vec = np.array(pt.vector)
            # Dot product of normalized vectors is cosine similarity
            score = float(np.dot(q_vec, p_vec))
            
            # Match filters if present (very basic filter mapping)
            matches_filter = True
            if query_filter and hasattr(query_filter, "must"):
                for condition in query_filter.must:
                    if hasattr(condition, "key") and hasattr(condition, "match"):
                        key = condition.key
                        match_val = condition.match.value
                        if pt.payload.get(key) != match_val:
                            matches_filter = False
                            break
            
            if matches_filter:
                results.append(type("ScoredPoint", (object,), {
                    "id": pt.id,
                    "score": score,
                    "payload": pt.payload
                })())
        
        # Sort descending by score
        results.sort(key=lambda x: x.score, reverse=True)
        return results[:limit]

class QdrantManager:
    def __init__(self):
        self.client = None
        self.is_mock = False

    def connect(self):
        if settings.ALLOW_MOCK_FALLBACK:
            try:
                logger.info(f"Connecting to Qdrant at {settings.QDRANT_HOST}:{settings.QDRANT_PORT}")
                self.client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT, timeout=2.0)
                # Test connection
                self.client.get_collections()
                logger.info("Successfully connected to Qdrant.")
                self.is_mock = False
            except (UnexpectedResponse, Exception) as e:
                logger.warning(f"Qdrant connection failed: {e}. Falling back to in-memory mock Qdrant.")
                self.client = MockQdrantClient()
                self.is_mock = True
        else:
            self.client = QdrantClient(host=settings.QDRANT_HOST, port=settings.QDRANT_PORT)
            self.is_mock = False

    def ensure_collection(self, collection_name: str):
        if not self.client:
            self.connect()
        
        # Qdrant client or Mock client
        if isinstance(self.client, MockQdrantClient):
            if not self.client.collection_exists(collection_name):
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
                )
            return

        try:
            # Check if exists
            collections = self.client.get_collections().collections
            exists = any(c.name == collection_name for c in collections)
            if not exists:
                logger.info(f"Creating collection {collection_name} in Qdrant.")
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
                )
        except Exception as e:
            logger.error(f"Error ensuring Qdrant collection {collection_name}: {e}. Retrying mock initialization.")
            self.client = MockQdrantClient()
            self.client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=1024, distance=Distance.COSINE)
            )

qdrant_manager = QdrantManager()

def get_qdrant_client():
    if not qdrant_manager.client:
        qdrant_manager.connect()
    return qdrant_manager.client
