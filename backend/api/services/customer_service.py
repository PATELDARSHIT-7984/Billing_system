from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional
import traceback

from api.model.customer_model import Customer


# ==========================================================
# CREATE CUSTOMER
# ==========================================================
def create_customer(db: Session, customer_data):
    try:
        pan_card = customer_data.pan_card
        if customer_data.gstin and not pan_card:
            try:
                pan_card = customer_data.gstin[2:12]
            except Exception:
                pass

        existing_name = (
            db.query(Customer)
            .filter(Customer.customer_name == customer_data.customer_name, Customer.is_active == True)
            .first()
        )
        if existing_name:
            raise HTTPException(status_code=400, detail="Customer name already exists")

        if customer_data.gstin:
            existing_gstin = (
                db.query(Customer)
                .filter(Customer.gstin == customer_data.gstin, Customer.is_active == True)
                .first()
            )
            if existing_gstin:
                raise HTTPException(status_code=400, detail="GSTIN already exists")

        if pan_card:
            existing_pan = (
                db.query(Customer)
                .filter(Customer.pan_card == pan_card, Customer.is_active == True)
                .first()
            )
            if existing_pan:
                raise HTTPException(status_code=400, detail="PAN already exists")

        customer = Customer(
            customer_name=customer_data.customer_name.strip(),
            mobile=customer_data.mobile,
            email=customer_data.email,
            address=customer_data.address,
            city=customer_data.city,
            state=customer_data.state,
            pincode=customer_data.pincode,
            gstin=customer_data.gstin,
            pan_card=pan_card,
            state_code=customer_data.state_code,
            remarks=customer_data.remarks,
            is_active=True,
        )

        db.add(customer)
        db.commit()
        db.refresh(customer)

        return customer

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to create customer")


# ==========================================================
# GET ALL CUSTOMERS (Customer Management table)
# ==========================================================
def get_all_customers(
    db: Session,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    try:
        query = db.query(Customer).filter(Customer.is_active == True)

        if search:
            query = query.filter(
                (Customer.customer_name.ilike(f"%{search}%"))
                | (Customer.mobile.ilike(f"%{search}%"))
            )

        return (
            query
            .order_by(Customer.customer_name.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch customers")


# ==========================================================
# GET CUSTOMER BY ID
# ==========================================================
def get_customer_by_id(db: Session, customer_id: int):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.is_active == True)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer


# ==========================================================
# UPDATE CUSTOMER
# ==========================================================
def update_customer(db: Session, customer_id: int, customer_data):
    try:
        customer = (
            db.query(Customer)
            .filter(Customer.id == customer_id, Customer.is_active == True)
            .first()
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        existing_name = (
            db.query(Customer)
            .filter(
                Customer.customer_name == customer_data.customer_name,
                Customer.id != customer_id,
                Customer.is_active == True,
            )
            .first()
        )
        if existing_name:
            raise HTTPException(status_code=400, detail="Customer name already exists")
        
        pan_card = customer_data.pan_card
        if customer_data.gstin and not pan_card:
            try:
                pan_card = customer_data.gstin[2:12]
            except Exception:
                pass

        customer.customer_name = customer_data.customer_name.strip()
        customer.mobile = customer_data.mobile
        customer.email = customer_data.email
        customer.address = customer_data.address
        customer.city = customer_data.city
        customer.state = customer_data.state
        customer.pincode = customer_data.pincode
        customer.gstin = customer_data.gstin
        customer.pan_card = pan_card
        customer.state_code = customer_data.state_code
        customer.remarks = customer_data.remarks

        if customer_data.is_active is not None:
            customer.is_active = customer_data.is_active

        db.commit()
        db.refresh(customer)

        return customer

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to update customer")


# ==========================================================
# DELETE CUSTOMER (soft delete)
# ==========================================================
def delete_customer(db: Session, customer_id: int):
    customer = (
        db.query(Customer)
        .filter(Customer.id == customer_id, Customer.is_active == True)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.is_active = False
    db.commit()

    return {"message": f"Customer '{customer.customer_name}' deleted successfully"}