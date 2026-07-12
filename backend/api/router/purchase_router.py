from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from api.database.dependencies import get_db
from api.schema.purchase_schema import PurchaseCreate, PurchaseListResponse, PurchaseResponse, PurchaseUpdate
from api.services.purchase_service import create_purchase, delete_purchase_by_id, get_all_purchases, get_purchase_by_id, update_purchase_by_id

router = APIRouter(prefix="/purchases", tags=["Purchases"])


@router.get("/", response_model=list[PurchaseListResponse])
def get_purchases(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by bill number, order number or supplier name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    return get_all_purchases(db, search, skip, limit)


@router.get("/{purchase_id}", response_model=PurchaseResponse)
def get_single_purchase(purchase_id: int, db: Session = Depends(get_db)):
    return get_purchase_by_id(db, purchase_id)


@router.post("/", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
def add_purchase(purchase: PurchaseCreate, db: Session = Depends(get_db)):
    return create_purchase(db, purchase)


@router.put("/{purchase_id}", response_model=PurchaseResponse)
def update_purchase(purchase_id: int, purchase: PurchaseUpdate, db: Session = Depends(get_db)):
    return update_purchase_by_id(db, purchase_id, purchase)


@router.delete("/{purchase_id}", status_code=status.HTTP_200_OK)
def delete_purchase(purchase_id: int, db: Session = Depends(get_db)):
    return delete_purchase_by_id(db, purchase_id)
