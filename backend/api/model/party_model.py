from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric, Text
from sqlalchemy.sql import func
from api.database.connection import Base


class Party(Base):
    __tablename__ = "parties"

    id = Column(Integer, primary_key=True, index=True)

    # Basic Details
    name = Column(String, nullable=False, index=True)
    party_type = Column(String, default="Supplier")

    # Contact Details
    country_code = Column(String(10), default="+91")
    mobile = Column(String(20), nullable=True)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)

    # Tax Details
    gstin = Column(String(15), unique=True, nullable=True, index=True)
    pan_card = Column(String(10), nullable=True, index=True)

    # Opening Balance
    opening_balance = Column(Numeric(18, 2), default=0.00)
    balance_type = Column(String(10), default="Credit")
    opening_remark = Column(Text, nullable=True)

    # Status
    is_active = Column(Boolean, default=True)

    # Audit
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
