from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


# =====================================================
# Create Item (Optional - mainly for future use)
# =====================================================

class ItemMasterCreate(BaseModel):

    name: str

    code: Optional[str] = None

    hsn_code: str

    unit: str

    current_stock: float = Field(default=0.0, ge=0)

    purchase_price: float = Field(default=0.0, ge=0)

    sale_price: float = Field(default=0.0, ge=0)

    mrp: float = Field(default=0.0, ge=0)

    gst_rate: float = Field(default=18.0, ge=0)

    category: Optional[str] = None

    brand: Optional[str] = None

    description: Optional[str] = None

    last_purchase_date: Optional[date] = None

    last_sale_date: Optional[date] = None

# =====================================================
# Update Item
# =====================================================

class ItemMasterUpdate(BaseModel):

    name: Optional[str] = None

    code: Optional[str] = None

    hsn_code: Optional[str] = None

    unit: Optional[str] = None

    current_stock: Optional[float] = Field(default=None, ge=0)

    purchase_price: Optional[float] = Field(default=None, ge=0)

    sale_price: Optional[float] = Field(default=None, ge=0)

    mrp: Optional[float] = Field(default=None, ge=0)

    gst_rate: Optional[float] = Field(default=None, ge=0)

    category: Optional[str] = None

    brand: Optional[str] = None

    description: Optional[str] = None

    last_purchase_date: Optional[date] = None

    last_sale_date: Optional[date] = None

    is_active: Optional[bool] = None


# =====================================================
# Item List (Table)
# =====================================================
# NOTE: added hsn_code + unit (2026-07-02). Both columns already existed on
# ItemMaster -- this is a response-shape-only change, no migration needed.
# Purchase Entry's item dropdown reads the list endpoint and needs these two
# fields to auto-fill HSN/Unit when an existing item is selected; without
# them here it could only ever auto-fill price.

class ItemMasterListResponse(BaseModel):

    id: int

    name: str

    code: Optional[str]

    hsn_code: Optional[str]

    unit: str

    brand: Optional[str]

    category: Optional[str]

    current_stock: float

    purchase_price: float

    sale_price: float

    gst_rate: float

    class Config:
        from_attributes = True


# =====================================================
# Item Details
# =====================================================

class ItemMasterResponse(BaseModel):

    id: int

    name: str

    code: Optional[str]

    hsn_code: Optional[str]

    unit: str

    current_stock: float

    purchase_price: float

    sale_price: float

    mrp: float

    gst_rate: float

    category: Optional[str]

    brand: Optional[str]

    description: Optional[str]

    last_purchase_date: Optional[date]

    last_sale_date: Optional[date]

    is_active: bool

    created_at: datetime

    updated_at: datetime

    class Config:
        from_attributes = True


# =====================================================
# Search Item
# =====================================================

class ItemMasterSearch(BaseModel):

    name: Optional[str] = None

    brand: Optional[str] = None

    category: Optional[str] = None
