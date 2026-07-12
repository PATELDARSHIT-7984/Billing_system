from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from api.database.dependencies import get_db

from api.schema.item_master_schema import (
    ItemMasterCreate,
    ItemMasterUpdate,
    ItemMasterResponse,
    ItemMasterListResponse
)

from api.services.item_master_service import (
    create_item,
    get_all_items,
    get_item_by_id,
    update_item,
    delete_item,
)

router = APIRouter(
    prefix="/item-master",
    tags=["Item Master"]
)


# ==========================================================
# CREATE ITEM
# ==========================================================
@router.post(
    "/",
    response_model=ItemMasterResponse,
    status_code=201
)
def create_new_item(
    item: ItemMasterCreate,
    db: Session = Depends(get_db)
):
    return create_item(db, item)


# ==========================================================
# GET ALL ITEMS
# ==========================================================
@router.get(
    "/",
    response_model=list[ItemMasterListResponse]
)
def get_items(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, description="Search by item name"),
    skip: int = 0,
    limit: int = 100
):
    return get_all_items(db, search, skip, limit)


# ==========================================================
# GET ITEM BY ID
# ==========================================================
@router.get(
    "/{item_id}",
    response_model=ItemMasterResponse
)
def get_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    return get_item_by_id(db, item_id)


# ==========================================================
# UPDATE ITEM
# ==========================================================
@router.put(
    "/{item_id}",
    response_model=ItemMasterResponse
)
def update_existing_item(
    item_id: int,
    item: ItemMasterUpdate,
    db: Session = Depends(get_db)
):
    return update_item(
        db,
        item_id,
        item
    )


# ==========================================================
# DELETE ITEM
# ==========================================================
@router.delete("/{item_id}")
def remove_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    return delete_item(
        db,
        item_id
    )