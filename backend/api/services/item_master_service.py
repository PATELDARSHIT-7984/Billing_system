import traceback
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from api.model.item_master_model import ItemMaster
from api.model.purchase_model import PurchaseItem
from api.schema.item_master_schema import (
    ItemMasterCreate,
    ItemMasterUpdate
)


def get_item_by_id(
    db: Session,
    item_id: int,
    include_inactive: bool = False
):
    query = db.query(ItemMaster).filter(
        ItemMaster.id == item_id
    )

    if not include_inactive:
        query = query.filter(
            ItemMaster.is_active.is_(True)
        )

    item = query.first()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found"
        )

    return item


def create_item(
    db: Session,
    item_data: ItemMasterCreate
):
    try:
        existing_name = (
            db.query(ItemMaster)
            .filter(
                ItemMaster.name.ilike(item_data.name.strip())
            )
            .first()
        )

        if existing_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item name already exists"
            )

        if item_data.code:
            existing_code = (
                db.query(ItemMaster)
                .filter(
                    ItemMaster.code == item_data.code
                )
                .first()
            )

            if existing_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Item code already exists"
                )

        db_item = ItemMaster(
            name=item_data.name.strip(),
            code=item_data.code,
            hsn_code=item_data.hsn_code,
            unit=item_data.unit.strip(),

            current_stock=item_data.current_stock,

            purchase_price=item_data.purchase_price,
            sale_price=item_data.sale_price,
            mrp=item_data.mrp,

            cgst=item_data.cgst,
            sgst=item_data.sgst,

            category=item_data.category,
            brand=item_data.brand,
            description=item_data.description,

            last_purchase_date=item_data.last_purchase_date,
            last_sale_date=item_data.last_sale_date,

            is_active=True
        )

        db.add(db_item)
        db.commit()
        db.refresh(db_item)

        return db_item

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create item"
        )


def get_all_items(
    db: Session,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    include_inactive: bool = False
):
    try:
        query = db.query(ItemMaster)

        if not include_inactive:
            query = query.filter(
                ItemMaster.is_active.is_(True)
            )

        if search:
            search_value = search.strip()

            query = query.filter(
                or_(
                    ItemMaster.name.ilike(
                        f"%{search_value}%"
                    ),
                    ItemMaster.code.ilike(
                        f"%{search_value}%"
                    ),
                    ItemMaster.hsn_code.ilike(
                        f"%{search_value}%"
                    ),
                    ItemMaster.category.ilike(
                        f"%{search_value}%"
                    ),
                    ItemMaster.brand.ilike(
                        f"%{search_value}%"
                    )
                )
            )

        return (
            query
            .order_by(ItemMaster.name.asc())
            .offset(skip)
            .limit(limit)
            .all()
        )

    except Exception:
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch items"
        )


def update_item_by_id(
    db: Session,
    item_id: int,
    item_data: ItemMasterUpdate
):
    try:
        item = get_item_by_id(
            db,
            item_id,
            include_inactive=True
        )

        provided_fields = item_data.model_fields_set

        if (
            "name" in provided_fields
            and item_data.name is not None
        ):
            existing_name = (
                db.query(ItemMaster)
                .filter(
                    ItemMaster.name.ilike(
                        item_data.name.strip()
                    ),
                    ItemMaster.id != item_id
                )
                .first()
            )

            if existing_name:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Item name already exists"
                )

            item.name = item_data.name.strip()

        if "code" in provided_fields:
            if item_data.code:
                existing_code = (
                    db.query(ItemMaster)
                    .filter(
                        ItemMaster.code == item_data.code,
                        ItemMaster.id != item_id
                    )
                    .first()
                )

                if existing_code:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Item code already exists"
                    )

            item.code = item_data.code

        if (
            "hsn_code" in provided_fields
            and item_data.hsn_code is not None
        ):
            item.hsn_code = item_data.hsn_code

        if (
            "unit" in provided_fields
            and item_data.unit is not None
        ):
            item.unit = item_data.unit.strip()

        if "current_stock" in provided_fields:
            item.current_stock = item_data.current_stock

        if "purchase_price" in provided_fields:
            item.purchase_price = item_data.purchase_price

        if "sale_price" in provided_fields:
            item.sale_price = item_data.sale_price

        if "mrp" in provided_fields:
            item.mrp = item_data.mrp

        if "cgst" in provided_fields:
            item.cgst = item_data.cgst

        if "sgst" in provided_fields:
            item.sgst = item_data.sgst

        if "category" in provided_fields:
            item.category = item_data.category

        if "brand" in provided_fields:
            item.brand = item_data.brand

        if "description" in provided_fields:
            item.description = item_data.description

        if "last_purchase_date" in provided_fields:
            item.last_purchase_date = (
                item_data.last_purchase_date
            )

        if "last_sale_date" in provided_fields:
            item.last_sale_date = (
                item_data.last_sale_date
            )

        if (
            "is_active" in provided_fields
            and item_data.is_active is not None
        ):
            item.is_active = item_data.is_active

        db.commit()
        db.refresh(item)

        return item

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update item"
        )


def soft_delete_item_by_id(
    db: Session,
    item_id: int
):
    try:
        item = get_item_by_id(
            db,
            item_id,
            include_inactive=True
        )

        if not item.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item is already inactive"
            )

        item.is_active = False

        db.commit()

        return {
            "message": (
                f"Item '{item.name}' deactivated successfully"
            )
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to deactivate item"
        )


def restore_item_by_id(
    db: Session,
    item_id: int
):
    try:
        item = get_item_by_id(
            db,
            item_id,
            include_inactive=True
        )

        if item.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Item is already active"
            )

        item.is_active = True

        db.commit()
        db.refresh(item)

        return item

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to restore item"
        )


def hard_delete_item_by_id(
    db: Session,
    item_id: int
):
    try:
        item = get_item_by_id(
            db,
            item_id,
            include_inactive=True
        )

        used_in_purchase = (
            db.query(PurchaseItem)
            .filter(
                PurchaseItem.item_id == item_id
            )
            .first()
        )

        if used_in_purchase:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "This item has purchase history and cannot "
                    "be permanently deleted. Deactivate it instead."
                )
            )

        db.delete(item)
        db.commit()

        return {
            "message": (
                f"Item '{item.name}' permanently deleted"
            )
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to permanently delete item"
        )