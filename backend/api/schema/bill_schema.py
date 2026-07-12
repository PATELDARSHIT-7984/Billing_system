from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel

from api.schema.bill_item_schema import BillItemCreate, BillItemResponse


# ==========================================
# Create Bill
# ==========================================

class BillCreate(BaseModel):

    customer_id: int

    bill_date: date

    is_interstate: bool = False

    remarks: Optional[str] = None

    items: List[BillItemCreate]


# ==========================================
# Update Bill
# ==========================================

class BillUpdate(BaseModel):

    customer_id: int

    bill_date: date

    is_interstate: bool = False

    remarks: Optional[str] = None

    items: List[BillItemCreate]


# ==========================================
# Bill List (History Page)
# ==========================================

class BillListResponse(BaseModel):

    bill_id: int

    invoice_no: str

    customer_name: str

    bill_date: date

    total_boxes: int

    grand_total: float

    class Config:
        from_attributes = True


# ==========================================
# Bill Response
# ==========================================

class BillResponse(BaseModel):

    bill_id: int

    invoice_no: str

    bill_date: date

    customer_name: str

    mobile: str

    email: Optional[str]

    address: str

    city: str

    state: str

    pincode: Optional[str]

    buyer_gstin: Optional[str]

    buyer_pan: Optional[str]

    buyer_state_code: Optional[str]

    total_boxes: int

    subtotal: float

    taxable_amount: float

    cgst_amount: float

    sgst_amount: float

    igst_amount: float

    grand_total: float

    amount_in_words: str

    remarks: Optional[str]

    created_at: datetime

    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# ==========================================
# Bill Detail (View Page)
# ==========================================

class BillDetailResponse(BaseModel):

    bill: BillResponse

    items: List[BillItemResponse]

class BillSearch(BaseModel):
    customer_name: Optional[str] = None
    invoice_no: Optional[str] = None
    from_date: Optional[date] = None
    to_date: Optional[date] = None
