import logging
import pymongo
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.config import settings

logger = logging.getLogger("medsphere.database.mongo")

class MockCollection:
    """An in-memory mock of a PyMongo Collection for development fallback."""
    def __init__(self, name, on_change_callback=None):
        self.name = name
        self._data = {}
        self._counter = 1
        self.on_change = on_change_callback

    def insert_one(self, document):
        doc = dict(document)
        if "_id" not in doc:
            doc["_id"] = str(self._counter)
            self._counter += 1
        self._data[str(doc["_id"])] = doc
        if self.on_change:
            self.on_change()
        return type("InsertResult", (object,), {"inserted_id": doc["_id"]})()

    def insert_many(self, documents):
        inserted_ids = []
        old_callback = self.on_change
        self.on_change = None
        try:
            for document in documents:
                res = self.insert_one(document)
                inserted_ids.append(res.inserted_id)
        finally:
            self.on_change = old_callback
        if self.on_change:
            self.on_change()
        return type("InsertManyResult", (object,), {"inserted_ids": inserted_ids})()

    def find_one(self, filter=None, *args, **kwargs):
        filter = filter or {}
        for doc in self._data.values():
            if self._match_filter(doc, filter):
                return dict(doc)
        return None

    def find(self, filter=None, *args, **kwargs):
        filter = filter or {}
        results = []
        for doc in self._data.values():
            if self._match_filter(doc, filter):
                results.append(dict(doc))
        
        # Simple sorting support if requested
        sort_args = kwargs.get("sort") or (args[0] if len(args) > 0 and isinstance(args[0], list) else None)
        if sort_args and len(results) > 0:
            for field, order in reversed(sort_args):
                results.sort(key=lambda x: x.get(field, ""), reverse=(order == -1))

        # Simple limit support
        limit_val = kwargs.get("limit") or (args[1] if len(args) > 1 and isinstance(args[1], int) else None)
        if limit_val:
            results = results[:limit_val]

        return results

    def update_one(self, filter, update, upsert=False, *args, **kwargs):
        filter = filter or {}
        doc = self.find_one(filter)
        if not doc:
            if upsert:
                # Merge filter and update
                new_doc = {}
                if "$set" in update:
                    new_doc.update(update["$set"])
                if "$setOnInsert" in update:
                    new_doc.update(update["$setOnInsert"])
                for k, v in filter.items():
                    if not k.startswith("$"):
                        new_doc[k] = v
                self.insert_one(new_doc)
                return type("UpdateResult", (object,), {"matched_count": 0, "modified_count": 1, "upserted_id": new_doc.get("_id")})()
            return type("UpdateResult", (object,), {"matched_count": 0, "modified_count": 0, "upserted_id": None})()
        
        # Apply updates
        if "$set" in update:
            for k, v in update["$set"].items():
                # Support nested updates if dot notation is present
                if "." in k:
                    parts = k.split(".")
                    curr = self._data[str(doc["_id"])]
                    for p in parts[:-1]:
                        if p not in curr:
                            curr[p] = {}
                        curr = curr[p]
                    curr[parts[-1]] = v
                else:
                    self._data[str(doc["_id"])][k] = v
                    
        if "$push" in update:
            for k, v in update["$push"].items():
                curr = self._data[str(doc["_id"])]
                if k not in curr:
                    curr[k] = []
                if isinstance(curr[k], list):
                    curr[k].append(v)

        if self.on_change:
            self.on_change()
        return type("UpdateResult", (object,), {"matched_count": 1, "modified_count": 1, "upserted_id": None})()

    def update_many(self, filter, update, upsert=False, *args, **kwargs):
        filter = filter or {}
        count = 0
        old_callback = self.on_change
        self.on_change = None
        try:
            for doc in self._data.values():
                if self._match_filter(doc, filter):
                    self.update_one({"_id": doc["_id"]}, update)
                    count += 1
        finally:
            self.on_change = old_callback
        if self.on_change:
            self.on_change()
        return type("UpdateResult", (object,), {"matched_count": count, "modified_count": count, "upserted_id": None})()

    def delete_many(self, filter, *args, **kwargs):
        filter = filter or {}
        to_delete = [doc["_id"] for doc in self._data.values() if self._match_filter(doc, filter)]
        for did in to_delete:
            del self._data[str(did)]
        if self.on_change:
            self.on_change()
        return type("DeleteResult", (object,), {"deleted_count": len(to_delete)})()

    def delete_one(self, filter, *args, **kwargs):
        filter = filter or {}
        for doc in self._data.values():
            if self._match_filter(doc, filter):
                del self._data[str(doc["_id"])]
                if self.on_change:
                    self.on_change()
                return type("DeleteResult", (object,), {"deleted_count": 1})()
        return type("DeleteResult", (object,), {"deleted_count": 0})()

    def count_documents(self, filter, *args, **kwargs):
        return len(self.find(filter))

    def _match_filter(self, doc, filter):
        for k, v in filter.items():
            if k == "_id":
                if str(doc.get("_id")) != str(v):
                    return False
            elif isinstance(v, dict):
                # Simple operators support: $in, $eq, $gt, $lt, $ne
                val = doc.get(k)
                for op, op_val in v.items():
                    if op == "$in" and val not in op_val:
                        return False
                    elif op == "$eq" and val != op_val:
                        return False
                    elif op == "$ne" and val == op_val:
                        return False
                    elif op == "$gt" and (val is None or val <= op_val):
                        return False
                    elif op == "$lt" and (val is None or val >= op_val):
                        return False
            elif doc.get(k) != v:
                return False
        return True

class MockDatabase:
    """An in-memory mock MongoDB Database with file persistence fallback."""
    def __init__(self):
        import os
        self._collections = {}
        self._filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_mongo.json")
        self.auto_save = True
        self._load_from_disk()

    def __getitem__(self, name):
        if name not in self._collections:
            self._collections[name] = MockCollection(name, self._save_to_disk)
        return self._collections[name]

    def list_collection_names(self):
        return list(self._collections.keys())

    def _load_from_disk(self):
        import os
        import json
        if os.path.exists(self._filepath):
            try:
                with open(self._filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for name, col_data in data.items():
                    col = MockCollection(name, self._save_to_disk)
                    col._data = col_data.get("data", {})
                    col._counter = col_data.get("counter", 1)
                    self._collections[name] = col
            except Exception as e:
                logger.error(f"Error loading Mock MongoDB from disk: {e}")

    def _save_to_disk(self):
        if not getattr(self, "auto_save", True):
            return
        import json
        data = {}
        for name, col in self._collections.items():
            data[name] = {
                "data": col._data,
                "counter": col._counter
            }
        try:
            with open(self._filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving Mock MongoDB to disk: {e}")

class MongoDBManager:
    def __init__(self):
        self.client = None
        self.db = None
        self.is_mock = False

    def connect(self):
        if settings.ALLOW_MOCK_FALLBACK:
            try:
                logger.info(f"Connecting to MongoDB at {settings.MONGO_URI}")
                # Short selection timeout to fail-fast if offline
                self.client = pymongo.MongoClient(settings.MONGO_URI, serverSelectionTimeoutMS=2000)
                # Check connection
                self.client.admin.command('ping')
                self.db = self.client[settings.MONGO_DB_NAME]
                logger.info("Successfully connected to MongoDB.")
                self.is_mock = False
            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                logger.warning(f"MongoDB connection failed: {e}. Falling back to in-memory mock MongoDB.")
                self.db = MockDatabase()
                self.is_mock = True
        else:
            self.client = pymongo.MongoClient(settings.MONGO_URI)
            self.db = self.client[settings.MONGO_DB_NAME]
            self.is_mock = False

    def get_collection(self, name):
        if self.db is None:
            self.connect()
        return self.db[name]

mongo_manager = MongoDBManager()

# Pre-initialize collections
def get_mongo_db():
    if mongo_manager.db is None:
        mongo_manager.connect()
    return mongo_manager.db
