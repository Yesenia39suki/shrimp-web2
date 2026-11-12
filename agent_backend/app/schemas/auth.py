"""认证相关的数据结构。"""

from dataclasses import dataclass
from uuid import UUID

from pydantic import SecretStr


@dataclass(frozen=True, slots=True)
class AuthenticatedRequest:
    """已通过 Supabase Auth 验证的当前请求身份。"""

    user_id: UUID
    email: str | None
    access_token: SecretStr

