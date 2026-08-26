from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any

@dataclass
class ChatMessage:
    role: str
    content: str

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ChatMessage":
        return cls(role=d.get("role", ""), content=d.get("content", ""))

@dataclass
class Choice:
    index: int = 0
    message: Optional[ChatMessage] = None
    finish_reason: Optional[str] = "stop"

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Choice":
        msg_dict = d.get("message", {})
        msg = ChatMessage.from_dict(msg_dict) if isinstance(msg_dict, dict) else msg_dict
        return cls(
            index=d.get("index", 0),
            message=msg,
            finish_reason=d.get("finish_reason", "stop")
        )

@dataclass
class Usage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Usage":
        return cls(
            prompt_tokens=d.get("prompt_tokens", 0),
            completion_tokens=d.get("completion_tokens", 0),
            total_tokens=d.get("total_tokens", 0)
        )

@dataclass
class ChatResponse:
    id: str
    object: str = "chat.completion"
    created: int = 0
    model: str = ""
    choices: List[Choice] = field(default_factory=list)
    usage: Optional[Usage] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ChatResponse":
        raw_choices = d.get("choices", [])
        choices = [Choice.from_dict(c) for c in raw_choices] if isinstance(raw_choices, list) else []
        raw_usage = d.get("usage")
        usage = Usage.from_dict(raw_usage) if isinstance(raw_usage, dict) else None
        return cls(
            id=d.get("id", ""),
            object=d.get("object", "chat.completion"),
            created=d.get("created", 0),
            model=d.get("model", ""),
            choices=choices,
            usage=usage
        )
