from sqlalchemy.orm import Session
from fastapi import HTTPException
import traceback
from typing import Optional

from api.model.item_master_model import ItemMaster


# ==========================================================
# CREATE ITEM
# ==========================================================
def create_item(
    db: Session,
    item_data
):
    try:

        existing_item = (
            db.query(ItemMaster)
            .filter(
                ItemMaster.name == item_data.name,
                ItemMaster.is_active == True
            )
            .first()
        )

        if existing_item:
            raise HTTPException(
                status_code=400,
                detail="Item already exists"
            )

        item = ItemMaster(
            name=item_data.name,
            code=item_data.code,
            hsn_code=item_data.hsn_code,
            unit=item_data.unit,

            current_stock=item_data.current_stock,

            purchase_price=item_data.purchase_price,
            sale_price=item_data.sale_price,
            mrp=item_data.mrp,

            gst_rate=item_data.gst_rate,
            category=item_data.category,
            brand=item_data.brand,
            description=item_data.description,

            last_purchase_date=item_data.last_purchase_date,
            last_sale_date=item_data.last_sale_date
        )

        db.add(item)
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
            status_code=500,
            detail="Failed to create item"
        )


# ==========================================================
# GET ALL ITEMS
# ==========================================================
def get_all_items(
    db: Session,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):

    try:

        query = db.query(ItemMaster).filter(ItemMaster.is_active == True)

        if search:
            query = (
                query.filter(ItemMaster.name.ilike(f"%{search}%"))
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
            status_code=500,
            detail="Failed to fetch items"
        )


# ==========================================================
# GET ITEM BY ID
# ==========================================================
def get_item_by_id(
    db: Session,
    item_id: int
):

    try:

        item = (
            db.query(ItemMaster)
            .filter(
                ItemMaster.id == item_id,
                ItemMaster.is_active == True
            )
            .first()
        )

        if not item:
            raise HTTPException(
                status_code=404,
                detail="Item not found"
            )

        return item

    except HTTPException:
        raise

    except Exception:

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Failed to fetch item"
        )


# ==========================================================
# UPDATE ITEM
# ==========================================================
def update_item(
    db: Session,
    item_id: int,
    item_data
):

    try:

        item = (
            db.query(ItemMaster)
            .filter(
                ItemMaster.id == item_id,
                ItemMaster.is_active == True
            )
            .first()
        )

        if not item:
            raise HTTPException(
                status_code=404,
                detail="Item not found"
            )

        existing_item = (
            db.query(ItemMaster)
            .filter(
                ItemMaster.name == item_data.name,
                ItemMaster.id != item.id,
                ItemMaster.is_active == True
            )
            .first()
        )

        if existing_item:
            raise HTTPException(
                status_code=400,
                detail="Item name already exists"
            )

        item.name = item_data.name
        item.code = item_data.code
        item.hsn_code = item_data.hsn_code
        item.unit = item_data.unit

        item.current_stock = item_data.current_stock

        item.purchase_price = item_data.purchase_price
        item.sale_price = item_data.sale_price
        item.mrp = item_data.mrp

        item.gst_rate = item_data.gst_rate
        item.category = item_data.category
        item.brand = item_data.brand
        item.description = item_data.description

        item.last_purchase_date = item_data.last_purchase_date
        item.last_sale_date = item_data.last_sale_date

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
            status_code=500,
            detail="Failed to update item"
        )


# ==========================================================
# DELETE ITEM
# ==========================================================
def delete_item(
    db: Session,
    item_id: int
):

    try:

        item = (
            db.query(ItemMaster)
            .filter(
                ItemMaster.id == item_id,
                ItemMaster.is_active == True
            )
            .first()
        )

        if not item:
            raise HTTPException(
                status_code=404,
                detail="Item not found"
            )

        item.is_active = False

        db.commit()

        return {
            "message": f"Item '{item.name}' deleted successfully"
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:

        db.rollback()

        traceback.print_exc()

        raise HTTPException(
            status_code=500,
            detail="Failed to delete item"
        )