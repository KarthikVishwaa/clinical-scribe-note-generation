import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, Request

_windows: Dict[str, List[float]] = defaultdict(list)


def _check(key: str, max_req: int, window: int) -> None:
    now = time.time()
    cutoff = now - window
    _windows[key] = [t for t in _windows[key] if t > cutoff]
    if len(_windows[key]) >= max_req:
        retry = int(_windows[key][0] + window - now) + 1
        raise HTTPException(
            status_code=429,
            detail=f"Too many requests — retry after {retry}s.",
            headers={"Retry-After": str(retry)},
        )
    _windows[key].append(now)


def rate_limit_auth(request: Request) -> None:
    ip = request.client.host if request.client else "unknown"
    _check(f"auth:{ip}", max_req=5, window=60)


def rate_limit_ai(user_id: int) -> None:
    _check(f"ai:{user_id}", max_req=10, window=3600)


def rate_limit_general(user_id: int) -> None:
    _check(f"gen:{user_id}", max_req=120, window=60)
