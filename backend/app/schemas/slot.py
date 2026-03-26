from datetime import date, time
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel

from app.models.slot import SlotStatus


class SlotResponse(BaseModel):
    id: int
    turf_id: int
    date: date
    start_time: time
    end_time: time
    price: Decimal
    status: SlotStatus
    machine_available: Optional[bool] = None  # None = not a net facility; True/False = machine availability
    held_by_me: bool = False  # True when this slot is held by the requesting user's pending booking

    model_config = {"from_attributes": True}


class SlotOverrideRequest(BaseModel):
    price: Optional[Decimal] = None
    status: Optional[SlotStatus] = None
