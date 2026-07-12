from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class PartyCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=200)
    party_type: str = Field(default="Supplier", pattern="^(Supplier|Customer)$")

    country_code: Optional[str] = "+91"
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    gstin: Optional[str] = None
    pan_card: Optional[str] = None

    opening_balance: Decimal = Decimal("0.00")
    balance_type: str = Field(default="Credit", pattern="^(Credit|Debit)$")
    opening_remark: Optional[str] = None

    @field_validator("gstin")
    def validate_gstin(cls, v):
        if v:
            v = v.strip().upper()
            if len(v) != 15:
                raise ValueError("GSTIN must be exactly 15 characters")
        return v

    @field_validator("pan_card")
    def validate_pan(cls, v):
        if v:
            v = v.strip().upper()
            if len(v) != 10:
                raise ValueError("PAN must be exactly 10 characters")
        return v


class PartyUpdate(BaseModel):
    name: Optional[str] = None
    party_type: Optional[str] = Field(default=None, pattern="^(Supplier|Customer)$")

    country_code: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    gstin: Optional[str] = None
    pan_card: Optional[str] = None

    opening_balance: Optional[Decimal] = None
    balance_type: Optional[str] = Field(default=None, pattern="^(Credit|Debit)$")
    opening_remark: Optional[str] = None

    @field_validator("gstin")
    def validate_gstin(cls, v):
        if v:
            v = v.strip().upper()
            if len(v) != 15:
                raise ValueError("GSTIN must be exactly 15 characters")
        return v

    @field_validator("pan_card")
    def validate_pan(cls, v):
        if v:
            v = v.strip().upper()
            if len(v) != 10:
                raise ValueError("PAN must be exactly 10 characters")
        return v


class PartyResponse(BaseModel):
    id: int
    name: str
    party_type: str

    country_code: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None

    gstin: Optional[str] = None
    pan_card: Optional[str] = None

    opening_balance: Decimal
    balance_type: str
    opening_remark: Optional[str] = None

    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
