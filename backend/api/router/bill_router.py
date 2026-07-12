from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from api.database.dependencies import get_db

from api.schema.bill_schema import (
    BillCreate,
    BillUpdate,
    BillResponse,
    BillListResponse,
    BillDetailResponse,
)

from api.services.bill_service import (
    create_bill,
    get_all_bills,
    get_bill_by_id,
    update_bill,
    delete_bill
)

router = APIRouter(
    prefix="/bill",
    tags=["Bill"]
)


# =====================================================
# GET ALL BILLS (Bill History)
# =====================================================
@router.get(
    "/",
    response_model=list[BillListResponse]
)
def get_all_bill_api(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by invoice number or customer name"),
    skip: int = 0,
    limit: int = 100,
):
    return get_all_bills(db, search, skip, limit)


# =====================================================
# GET BILL BY ID
# =====================================================
@router.get(
    "/{bill_id}",
    response_model=BillDetailResponse
)
def get_bill_by_id_api(
    bill_id: int,
    db: Session = Depends(get_db)
):
    return get_bill_by_id(db, bill_id)


# =====================================================
# CREATE BILL
# =====================================================
@router.post(
    "/",
    response_model=BillResponse,
    status_code=201
)
def create_bill_api(
    bill_data: BillCreate,
    db: Session = Depends(get_db)
):
    return create_bill(db, bill_data)


# =====================================================
# UPDATE BILL
# =====================================================
@router.put(
    "/{bill_id}",
    response_model=BillResponse
)
def update_bill_api(
    bill_id: int,
    bill_data: BillUpdate,
    db: Session = Depends(get_db)
):
    return update_bill(
        db,
        bill_id,
        bill_data
    )


# =====================================================
# DELETE BILL
# =====================================================
@router.delete(
    "/{bill_id}"
)
def delete_bill_api(
    bill_id: int,
    db: Session = Depends(get_db)
):
    return delete_bill(
        db,
        bill_id
    )