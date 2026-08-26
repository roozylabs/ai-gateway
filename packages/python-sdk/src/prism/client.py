import os
import json
import urllib.request
import urllib.error
from typing import List, Dict, Any, Optional

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False

from .models import ChatResponse, ChatMessage, Choice, Usage

class Prism:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, timeout: float = 60.0):
        self.api_key = api_key or os.getenv("PRISM_API_KEY", "")
        self.base_url = (base_url or os.getenv("PRISM_BASE_URL", "https://api.prism.roozylabs.com")).rstrip("/")
        self.timeout = timeout
        if HAS_HTTPX:
            self._client = httpx.Client(timeout=self.timeout)
        else:
            self._client = None

    def _headers(self, agent_id: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "roozylabs-prism-python/2.1.0"
        }
        if agent_id:
            headers["X-Prism-Agent-ID"] = agent_id
        return headers

    def chat(self, model: str, messages: List[Dict[str, Any]], agent_id: Optional[str] = None, stream: bool = False, **kwargs) -> ChatResponse:
        url = f"{self.base_url}/v1/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            **kwargs
        }

        if self._client:
            resp = self._client.post(url, json=payload, headers=self._headers(agent_id))
            resp.raise_for_status()
            data = resp.json()
        else:
            req_data = json.dumps(payload).encode("utf-8")
            req = urllib.request.Request(url, data=req_data, headers=self._headers(agent_id), method="POST")
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))

        return ChatResponse.from_dict(data)

    def list_models(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/v1/models"
        if self._client:
            resp = self._client.get(url, headers=self._headers())
            resp.raise_for_status()
            return resp.json().get("data", [])
        else:
            req = urllib.request.Request(url, headers=self._headers(), method="GET")
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data.get("data", [])

class AsyncPrism:
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None, timeout: float = 60.0):
        self.api_key = api_key or os.getenv("PRISM_API_KEY", "")
        self.base_url = (base_url or os.getenv("PRISM_BASE_URL", "https://api.prism.roozylabs.com")).rstrip("/")
        self.timeout = timeout

    def _headers(self, agent_id: Optional[str] = None) -> Dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "roozylabs-prism-python/2.1.0"
        }
        if agent_id:
            headers["X-Prism-Agent-ID"] = agent_id
        return headers

    async def chat(self, model: str, messages: List[Dict[str, Any]], agent_id: Optional[str] = None, stream: bool = False, **kwargs) -> ChatResponse:
        url = f"{self.base_url}/v1/chat/completions"
        payload = {
            "model": model,
            "messages": messages,
            "stream": stream,
            **kwargs
        }
        if HAS_HTTPX:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(url, json=payload, headers=self._headers(agent_id))
                resp.raise_for_status()
                data = resp.json()
                return ChatResponse.from_dict(data)
        else:
            raise NotImplementedError("AsyncPrism requires 'httpx' library installed: pip install httpx")

    async def list_models(self) -> List[Dict[str, Any]]:
        url = f"{self.base_url}/v1/models"
        if HAS_HTTPX:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(url, headers=self._headers())
                resp.raise_for_status()
                return resp.json().get("data", [])
        else:
            raise NotImplementedError("AsyncPrism requires 'httpx' library installed: pip install httpx")
