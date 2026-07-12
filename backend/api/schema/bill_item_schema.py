from pydantic import BaseModel, Field


# ==========================================
# Create Bill Item
# ==========================================

class BillItemCreate(BaseModel):

    item_id: int

    quantity: int = Field(gt=0)


# ==========================================
# Bill Item Response
# ==========================================

class BillItemResponse(BaseModel):

    bill_item_id: int

    item_id: int

    item_name: str

    brand_name: str | None = None

    unit: str

    hsn_code: str

    quantity: int

    rate: float

    taxable_amount: float

    gst_percent: float

    cgst_percent: float

    sgst_percent: float

    igst_percent: float

    cgst_amount: float

    sgst_amount: float

    igst_amount: float

    line_total: float

    class Config:
        from_attributes = True