from datetime import time
from decimal import Decimal
from typing import Optional, List, Union, Any
import json

from pydantic import BaseModel, field_validator

from app.models.turf import TurfStatus, FacilityType


def _parse_json_list(v: Any) -> List:
    """Accept a Python list or a JSON-encoded string (from legacy TEXT columns)."""
    if v is None:
        return []
    if isinstance(v, list):
        return v
    if isinstance(v, str):
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return parsed
        except (ValueError, TypeError):
            pass
    return []


class TurfCreate(BaseModel):
    name: str
    facility_type: FacilityType
    description: Optional[str] = None
    operating_start_time: time
    operating_end_time: time
    slot_duration_minutes: int = 60
    base_price: Decimal
    bowling_machine_price: Optional[Decimal] = None  # only relevant for net_normal / net_cement
    advance_payment_amount: Optional[Decimal] = None  # None = no advance option
    image_urls: Optional[List[str]] = None
    amenities: Optional[List[str]] = None

    @field_validator('image_urls', 'amenities', mode='before')
    @classmethod
    def parse_list_field(cls, v: Any) -> Optional[List[str]]:
        if v is None:
            return None
        return _parse_json_list(v)


class TurfUpdate(BaseModel):
    name: Optional[str] = None
    facility_type: Optional[FacilityType] = None
    description: Optional[str] = None
    operating_start_time: Optional[time] = None
    operating_end_time: Optional[time] = None
    slot_duration_minutes: Optional[int] = None
    base_price: Optional[Decimal] = None
    bowling_machine_price: Optional[Decimal] = None
    advance_payment_amount: Optional[Decimal] = None
    status: Optional[TurfStatus] = None
    image_urls: Optional[List[str]] = None
    amenities: Optional[List[str]] = None

    @field_validator('image_urls', 'amenities', mode='before')
    @classmethod
    def parse_list_field(cls, v: Any) -> Optional[List[str]]:
        if v is None:
            return None
        return _parse_json_list(v)


class TurfResponse(BaseModel):
    id: int
    name: str
    facility_type: FacilityType
    description: Optional[str] = None
    operating_start_time: time
    operating_end_time: time
    slot_duration_minutes: int
    base_price: Decimal
    bowling_machine_price: Optional[Decimal] = None
    advance_payment_amount: Optional[Decimal] = None
    status: TurfStatus
    image_urls: Optional[List[str]] = None
    amenities: Optional[List[str]] = None

    @field_validator('image_urls', 'amenities', mode='before')
    @classmethod
    def parse_list_field(cls, v: Any) -> Optional[List[str]]:
        if v is None:
            return []
        return _parse_json_list(v)

    model_config = {"from_attributes": True}
