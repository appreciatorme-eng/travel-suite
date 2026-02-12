"""
Rate limiting middleware for GoBuddy AI Agents.
Prevents API abuse and protects upstream LLM quota (e.g., Gemini 1,500 req/day).
"""
import time
import logging
from collections import defaultdict
from typing import Optional

from fastapi import Request, HTTPException

logger = logging.getLogger("gobuddy.rate_limit")


class RateLimiter:
    """
    In-memory sliding window rate limiter.

    For production with multiple workers, replace with Redis-backed implementation.
    """

    def __init__(
        self,
        requests_per_minute: int = 10,
        requests_per_hour: int = 100,
    ):
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour
        self._minute_windows: dict[str, list[float]] = defaultdict(list)
        self._hour_windows: dict[str, list[float]] = defaultdict(list)

    def _clean_window(self, window: list[float], cutoff: float) -> list[float]:
        """Remove expired entries from a time window."""
        return [t for t in window if t > cutoff]

    def check(self, key: str) -> None:
        """
        Check if a request is allowed for the given key.

        Args:
            key: Identifier for rate limiting (user_id or IP address)

        Raises:
            HTTPException 429 if rate limit exceeded
        """
        now = time.time()

        # Check per-minute limit
        self._minute_windows[key] = self._clean_window(
            self._minute_windows[key], now - 60
        )
        if len(self._minute_windows[key]) >= self.requests_per_minute:
            retry_after = int(60 - (now - self._minute_windows[key][0]))
            logger.warning(
                "Rate limit exceeded (per-minute) for key=%s (%d/%d)",
                key[0:8] + "...",
                len(self._minute_windows[key]),
                self.requests_per_minute,
            )
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )

        # Check per-hour limit
        self._hour_windows[key] = self._clean_window(
            self._hour_windows[key], now - 3600
        )
        if len(self._hour_windows[key]) >= self.requests_per_hour:
            retry_after = int(3600 - (now - self._hour_windows[key][0]))
            logger.warning(
                "Rate limit exceeded (per-hour) for key=%s (%d/%d)",
                key[0:8] + "...",
                len(self._hour_windows[key]),
                self.requests_per_hour,
            )
            raise HTTPException(
                status_code=429,
                detail=f"Hourly rate limit exceeded. Try again in {retry_after} seconds.",
                headers={"Retry-After": str(retry_after)},
            )

        # Record the request
        self._minute_windows[key].append(now)
        self._hour_windows[key].append(now)

    def get_remaining(self, key: str) -> dict:
        """Get remaining quota for a key."""
        now = time.time()
        minute_used = len(self._clean_window(self._minute_windows.get(key, []), now - 60))
        hour_used = len(self._clean_window(self._hour_windows.get(key, []), now - 3600))
        return {
            "minute": {"used": minute_used, "limit": self.requests_per_minute},
            "hour": {"used": hour_used, "limit": self.requests_per_hour},
        }


# Default limiter instances
# AI chat endpoints: stricter limits (LLM calls are expensive)
ai_limiter = RateLimiter(requests_per_minute=5, requests_per_hour=60)

# General endpoints: more generous limits
general_limiter = RateLimiter(requests_per_minute=30, requests_per_hour=500)


def get_client_key(request: Request, user_id: Optional[str] = None) -> str:
    """
    Build a rate-limit key from user ID or IP address.
    Prefer user_id for authenticated requests, fall back to IP.
    """
    if user_id:
        return f"user:{user_id}"

    # Get real IP (handle proxies)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        ip = forwarded.split(",")[0].strip()
    else:
        ip = request.client.host if request.client else "unknown"

    return f"ip:{ip}"
