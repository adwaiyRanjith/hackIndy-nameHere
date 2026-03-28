"""
Local JSON file-based database adapter.
Implements the same async interface as Motor (find_one, insert_one, update_one)
so the rest of the app needs no changes.
"""

import asyncio
import json
import os
from pathlib import Path
from typing import Any, Optional

DATA_DIR = Path(os.getenv("DATA_DIR", "./db_data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)


def _load(collection: str) -> list:
    path = DATA_DIR / f"{collection}.json"
    if not path.exists():
        return []
    with open(path) as f:
        return json.load(f)


def _save(collection: str, docs: list):
    path = DATA_DIR / f"{collection}.json"
    with open(path, "w") as f:
        json.dump(docs, f, indent=2, default=str)


def _match(doc: dict, query: dict) -> bool:
    for k, v in query.items():
        # Support dot-notation for nested keys like "modules.module_id"
        if "." in k:
            parts = k.split(".", 1)
            nested = doc.get(parts[0])
            if isinstance(nested, list):
                if not any(_match(item, {parts[1]: v}) for item in nested):
                    return False
            elif isinstance(nested, dict):
                if not _match(nested, {parts[1]: v}):
                    return False
            else:
                return False
        else:
            if doc.get(k) != v:
                return False
    return True


def _apply_set(doc: dict, set_fields: dict) -> dict:
    """Apply $set updates, supporting dot-notation and array element matching."""
    for k, v in set_fields.items():
        if "." in k:
            parts = k.split(".")
            # Handle array positional: "modules.$.field"
            if "$" in parts:
                # Already matched in caller — skip; handled by _update_array_match
                continue
            # Simple nested: "a.b.c"
            target = doc
            for part in parts[:-1]:
                target = target.setdefault(part, {})
            target[parts[-1]] = v
        else:
            doc[k] = v
    return doc


class LocalCollection:
    def __init__(self, name: str):
        self.name = name

    async def insert_one(self, document: dict):
        docs = _load(self.name)
        docs.append(document)
        _save(self.name, docs)

    async def find_one(self, query: dict, projection: Optional[dict] = None) -> Optional[dict]:
        docs = _load(self.name)
        for doc in docs:
            if _match(doc, query):
                return doc
        return None

    async def update_one(self, query: dict, update: dict):
        docs = _load(self.name)
        for doc in docs:
            if _match(doc, query):
                if "$set" in update:
                    set_fields = update["$set"]
                    # Handle positional operator for array elements
                    positional_keys = {k: v for k, v in set_fields.items() if ".$." in k}
                    regular_keys = {k: v for k, v in set_fields.items() if ".$." not in k}

                    _apply_set(doc, regular_keys)

                    # Handle "modules.$.field" — update matching array element
                    if positional_keys:
                        # Determine which array and match condition
                        arr_field = next(
                            (k.split(".")[0] for k in positional_keys), None
                        )
                        if arr_field and arr_field in doc:
                            # Find the matching element using the query
                            arr_query = {
                                k.split(".", 1)[1]: v
                                for k, v in query.items()
                                if k.startswith(arr_field + ".")
                            }
                            for item in doc[arr_field]:
                                if _match(item, arr_query):
                                    for pk, pv in positional_keys.items():
                                        # "modules.$.status" → "status"
                                        field_name = pk.split("$.")[1]
                                        item[field_name] = pv
                                    break

                if "$push" in update:
                    for k, v in update["$push"].items():
                        doc.setdefault(k, []).append(v)

                break
        _save(self.name, docs)

    def __getitem__(self, key):
        return self


class LocalDB:
    def __init__(self):
        self._collections: dict[str, LocalCollection] = {}

    def __getitem__(self, name: str) -> LocalCollection:
        if name not in self._collections:
            self._collections[name] = LocalCollection(name)
        return self._collections[name]


class LocalClient:
    def __init__(self):
        self._db = LocalDB()

    def __getitem__(self, name: str) -> LocalDB:
        return self._db

    def close(self):
        pass
