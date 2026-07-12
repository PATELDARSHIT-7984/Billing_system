from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from api.database.dependencies import get_db
from api.schema.customer_schema import (
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse,
    CustomerListResponse,
)
from api.services.customer_service import (
    create_customer,
    get_all_customers,
    get_customer_by_id,
    update_customer,
    delete_customer
)

router = APIRouter(
    prefix="/customers",
    tags=["Customers"]
)


# ======================================================
# CREATE CUSTOMER
# ======================================================
@router.post(
    "/",
    response_model=CustomerResponse,
    status_code=status.HTTP_201_CREATED
)
def add_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db)
):
    return create_customer(db, customer)


# ======================================================
# GET ALL CUSTOMERS
# ======================================================
@router.get(
    "/",
    response_model=list[CustomerListResponse]
)
def list_customers(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by customer name or mobile"),
    skip: int = 0,
    limit: int = 100,
):
    return get_all_customers(db, search, skip, limit)


# ======================================================
# GET CUSTOMER BY ID
# ======================================================
@router.get(
    "/{customer_id}",
    response_model=CustomerResponse,
    status_code=status.HTTP_200_OK
)
def get_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):
    return get_customer_by_id(db, customer_id)


# ======================================================
# UPDATE CUSTOMER
# ======================================================
@router.put(
    "/{customer_id}",
    response_model=CustomerResponse,
    status_code=status.HTTP_200_OK
)
def edit_customer(
    customer_id: int,
    customer: CustomerUpdate,
    db: Session = Depends(get_db)
):
    return update_customer(
        db=db,
        customer_id=customer_id,
        customer_data=customer
    )


# ======================================================
# DELETE CUSTOMER (Soft Delete)
# ======================================================
@router.delete(
    "/{customer_id}",
    status_code=status.HTTP_200_OK
)
def remove_customer(
    customer_id: int,
    db: Session = Depends(get_db)
):
    return delete_customer(
        db=db,
        customer_id=customer_id
    )