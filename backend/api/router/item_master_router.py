from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    Query,
    status
)
from sqlalchemy.orm import Session

from api.database.dependencies import get_db
from api.schema.item_master_schema import (
    ItemMasterCreate,
    ItemMasterResponse,
    ItemMasterUpdate
)
from api.services.item_master_service import (
    create_item,
    get_all_items,
    get_item_by_id,
    hard_delete_item_by_id,
    restore_item_by_id,
    soft_delete_item_by_id,
    update_item_by_id
)


router = APIRouter(
    prefix="/item-master",
    tags=["Item Master"]
)


@router.get(
    "/",
    response_model=list[ItemMasterResponse]
)
def list_items(
    db: Session = Depends(get_db),

    search: Optional[str] = Query(
        default=None,
        description=(
            "Search by item name, code, HSN, category or brand"
        )
    ),

    skip: int = Query(
        default=0,
        ge=0
    ),

    limit: int = Query(
        default=100,
        ge=1,
        le=500
    ),

    include_inactive: bool = Query(
        default=False,
        description="Include inactive/deleted items"
    )
):
    return get_all_items(
        db=db,
        search=search,
        skip=skip,
        limit=limit,
        include_inactive=include_inactive
    )


@router.get(
    "/{item_id}",
    response_model=ItemMasterResponse
)
def get_single_item(
    item_id: int,
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db)
):
    return get_item_by_id(
        db=db,
        item_id=item_id,
        include_inactive=include_inactive
    )


@router.post(
    "/",
    response_model=ItemMasterResponse,
    status_code=status.HTTP_201_CREATED
)
def add_item(
    item: ItemMasterCreate,
    db: Session = Depends(get_db)
):
    return create_item(
        db=db,
        item_data=item
    )


@router.put(
    "/{item_id}",
    response_model=ItemMasterResponse
)
def update_item(
    item_id: int,
    item: ItemMasterUpdate,
    db: Session = Depends(get_db)
):
    return update_item_by_id(
        db=db,
        item_id=item_id,
        item_data=item
    )


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_200_OK
)
def deactivate_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    return soft_delete_item_by_id(
        db=db,
        item_id=item_id
    )


@router.patch(
    "/{item_id}/restore",
    response_model=ItemMasterResponse
)
def restore_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    return restore_item_by_id(
        db=db,
        item_id=item_id
    )


@router.delete(
    "/{item_id}/permanent",
    status_code=status.HTTP_200_OK
)
def permanently_delete_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    return hard_delete_item_by_id(
        db=db,
        item_id=item_id
    )