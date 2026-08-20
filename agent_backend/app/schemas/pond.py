"""池塘接口的数据结构。"""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class PondResponse(BaseModel):
    """当前登录用户通过 RLS 可以读取的池塘。"""

    id: UUID = Field(description="池塘 ID")
    organization_id: UUID = Field(description="池塘所属企业 ID，由数据库返回")
    pond_code: str = Field(min_length=1, max_length=50, description="池塘编号")
    pond_name: str = Field(min_length=1, max_length=120, description="池塘名称")
    shrimp_species: str = Field(min_length=1, max_length=100, description="对虾品种")
    area_mu: Decimal = Field(description="池塘面积，单位：亩")
    water_depth_m: Decimal = Field(description="水深，单位：米")
    location: str = Field(min_length=1, max_length=200, description="池塘位置")
    longitude: Decimal | None = Field(default=None, description="经度")
    latitude: Decimal | None = Field(default=None, description="纬度")
    created_at: datetime = Field(description="创建时间")
    updated_at: datetime = Field(description="更新时间")
