from decimal import Decimal
from typing import Optional
from pydantic import BaseModel

from app.models.pricing_rule import DayType
from app.models.discount import DiscountType
from datetime import time, date


class PricingRuleCreate(BaseModel):
    turf_id: int
    start_time: time
    end_time: time
    price: Decimal
    day_type: DayType = DayType.all


class PricingRuleResponse(BaseModel):
    id: int
    turf_id: int
    start_time: time
    end_time: time
    price: Decimal
    day_type: DayType

    model_config = {"from_attributes": True}


class DiscountCreate(BaseModel):
    code: Optional[str] = None
    type: DiscountType
    value: Decimal
    valid_from: date
    valid_to: date
    is_active: bool = True


class DiscountResponse(BaseModel):
    id: int
    code: Optional[str] = None
    type: DiscountType
    value: Decimal
    valid_from: date
    valid_to: date
    is_active: bool

    model_config = {"from_attributes": True}


class FeatureCreate(BaseModel):
    name: str
    extra_price: Decimal = Decimal("0")


class FeatureResponse(BaseModel):
    id: int
    name: str
    extra_price: Decimal

    model_config = {"from_attributes": True}


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin_id: int
