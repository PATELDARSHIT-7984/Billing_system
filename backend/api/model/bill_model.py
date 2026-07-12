from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Date,
    DateTime,
    Boolean,
    ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from api.database.connection import Base


class Bill(Base):
    __tablename__ = "bill"

    # -------------------------
    # Primary Key
    # -------------------------

    bill_id = Column(Integer, primary_key=True, index=True)

    invoice_no = Column(String(30),unique=True,nullable=False,index=True)

    customer_id = Column(Integer,ForeignKey("customers.id"),nullable=False)

    bill_date = Column(Date, nullable=False)

    # -------------------------
    # Buyer Snapshot
    # -------------------------

    customer_name = Column(String(100), nullable=False)

    mobile = Column(String(15), nullable=False)

    email = Column(String(100), nullable=True)

    address = Column(String(255), nullable=False)

    city = Column(String(100), nullable=False)

    state = Column(String(100), nullable=False)

    pincode = Column(String(10), nullable=True)

    buyer_gstin = Column(String(15), nullable=True)

    buyer_pan = Column(String(10), nullable=True)

    buyer_state_code = Column(String(2), nullable=True)

    # -------------------------
    # Invoice Summary
    # -------------------------

    total_boxes = Column(Integer, nullable=False)

    subtotal = Column(Float, nullable=False)

    discount_amount = Column(Float, default=0.0)

    taxable_amount = Column(Float, nullable=False)

    cgst_amount = Column(Float, default=0.0)

    sgst_amount = Column(Float, default=0.0)

    igst_amount = Column(Float, default=0.0)

    grand_total = Column(Float, nullable=False)

    amount_in_words = Column(String(300), nullable=False)

    remarks = Column(String(500), nullable=True)

    # -------------------------
    # Status
    # -------------------------

    is_active = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True),server_default=func.now())

    updated_at = Column(DateTime(timezone=True),server_default=func.now(),onupdate=func.now())

    # -------------------------
    # Relationships
    # -------------------------

    customer = relationship("Customer")

    bill_items = relationship("BillItem",back_populates="bill",cascade="all, delete-orphan")