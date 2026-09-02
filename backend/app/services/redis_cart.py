import json
import uuid
from typing import Any

import redis

from app.config import settings

_redis: redis.Redis | Any | None = None


class MemoryRedis:
    """In-process cart store for local dev without Docker/Redis."""

    def __init__(self) -> None:
        self._store: dict[str, str] = {}

    def get(self, key: str) -> str | None:
        return self._store.get(key)

    def setex(self, key: str, _ttl: int, value: str) -> None:
        self._store[key] = value

    def delete(self, key: str) -> None:
        self._store.pop(key, None)


def get_redis() -> redis.Redis | MemoryRedis:
    global _redis
    if _redis is None:
        if settings.redis_url in ("", "memory", "none"):
            _redis = MemoryRedis()
        else:
            _redis = redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def _cart_key(session_id: str) -> str:
    return f"cart:{session_id}"


def get_cart(session_id: str) -> dict[str, Any]:
    r = get_redis()
    raw = r.get(_cart_key(session_id))
    if not raw:
        return {"items": []}
    return json.loads(raw)


def save_cart(session_id: str, cart: dict[str, Any]) -> None:
    r = get_redis()
    r.setex(_cart_key(session_id), 60 * 60 * 24 * 7, json.dumps(cart))


def clear_cart(session_id: str) -> None:
    r = get_redis()
    r.delete(_cart_key(session_id))


def new_session_id() -> str:
    return str(uuid.uuid4())
