import traceback
from datetime import timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from api.model.item_master_model import ItemMaster
from api.model.party_model import Party
from api.model.purchase_model import Purchase, PurchaseItem
from api.schema.purchase_schema import PurchaseCreate, PurchaseUpdate


def _get_active_purchase(db: Session, purchase_id: int) -> Purchase:
    purchase = db.query(Purchase).filter(
        Purchase.id == purchase_id,
        Purchase.is_active.is_(True),
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail=f"Purchase with ID {purchase_id} not found")
    return purchase


def _get_active_party(db: Session, party_id: int) -> Party:
    party = db.query(Party).filter(
        Party.id == party_id,
        Party.is_active.is_(True),
    ).first()
    if not party:
        raise HTTPException(status_code=404, detail=f"Party with ID {party_id} not found")
    return party


def _get_active_item(db: Session, item_id: int) -> ItemMaster:
    item = db.query(ItemMaster).filter(
        ItemMaster.id == item_id,
        ItemMaster.is_active.is_(True),
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"Item with ID {item_id} not found")
    return item


def _check_duplicate_bill_number(
    db: Session,
    bill_no: str,
    exclude_purchase_id: Optional[int] = None,
) -> None:
    cleaned = bill_no.strip().upper()
    query = db.query(Purchase).filter(func.upper(Purchase.bill_no) == cleaned)
    if exclude_purchase_id is not None:
        query = query.filter(Purchase.id != exclude_purchase_id)
    if query.first():
        raise HTTPException(status_code=400, detail=f"Bill number '{cleaned}' already exists")


def get_purchase_by_id(db: Session, purchase_id: int):
    purchase = _get_active_purchase(db, purchase_id)
    purchase.party_name = purchase.party.name if purchase.party else "Unknown"
    return purchase


def create_purchase(db: Session, purchase_data: PurchaseCreate):
    try:
        party = _get_active_party(db, purchase_data.party_id)
        bill_no = purchase_data.bill_no.strip().upper()
        _check_duplicate_bill_number(db, bill_no)

        order_no = purchase_data.order_no.strip() if purchase_data.order_no else None
        due_date = purchase_data.due_date
        if purchase_data.due_term is not None:
            due_date = purchase_data.bill_date + timedelta(days=purchase_data.due_term)

        totals = calculate_purchase_totals(purchase_data.items)
        taxable_total, sgst_total, cgst_total, igst_total, round_off, grand_total, line_amounts = totals

        purchase = Purchase(
            bill_no=bill_no,
            order_no=order_no,
            bill_date=purchase_data.bill_date,
            due_term=purchase_data.due_term,
            due_date=due_date,
            party_id=party.id,
            is_gst=purchase_data.is_gst,
            contact_person=purchase_data.contact_person,
            contact_no=purchase_data.contact_no,
            email=purchase_data.email,
            done_by=purchase_data.done_by,
            brokerage=purchase_data.brokerage or 0.0,
            broker_remarks=purchase_data.broker_remarks,
            delivery_date=purchase_data.delivery_date,
            transport=purchase_data.transport,
            ship_to=purchase_data.ship_to,
            ship_to_address=purchase_data.ship_to_address,
            state=purchase_data.state,
            reference=purchase_data.reference,
            remarks=purchase_data.remarks,
            show_shipping_address_on_bill=purchase_data.show_shipping_address_on_bill,
            taxable_amount=taxable_total,
            sgst_total=sgst_total,
            cgst_total=cgst_total,
            igst_total=igst_total,
            round_off=round_off,
            grand_total=grand_total,
            is_active=True,
        )
        db.add(purchase)
        db.flush()

        for item_data, line in zip(purchase_data.items, line_amounts):
            item_master = _get_active_item(db, item_data.item_id)
            hsn_code = item_data.hsn_code.strip()
            if not hsn_code:
                raise HTTPException(status_code=400, detail=f"HSN Code is required for item '{item_data.item_name}'")

            db.add(PurchaseItem(
                purchase_id=purchase.id,
                item_id=item_master.id,
                item_name=item_master.name,
                hsn_code=hsn_code,
                quantity=item_data.quantity,
                unit=item_master.unit,
                price=item_data.price,
                disc_percent=item_data.disc_percent or 0.0,
                sgst=item_data.sgst or 0.0,
                cgst=item_data.cgst or 0.0,
                igst=item_data.igst or 0.0,
                amount=line["amount"],
            ))

            item_master.current_stock = (item_master.current_stock or 0.0) + item_data.quantity
            item_master.purchase_price = item_data.price
            item_master.last_purchase_date = purchase_data.bill_date

        db.commit()
        db.refresh(purchase)
        purchase.party_name = party.name
        return purchase

    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to create purchase") from error


def update_purchase_by_id(db: Session, purchase_id: int, purchase_data: PurchaseUpdate):
    try:
        purchase = _get_active_purchase(db, purchase_id)
        provided = purchase_data.model_fields_set

        party_id = purchase_data.party_id if "party_id" in provided and purchase_data.party_id is not None else purchase.party_id
        party = _get_active_party(db, party_id)

        bill_no = purchase.bill_no
        if "bill_no" in provided and purchase_data.bill_no is not None:
            bill_no = purchase_data.bill_no.strip().upper()
        _check_duplicate_bill_number(db, bill_no, purchase.id)

        if "items" in provided and purchase_data.items is not None:
            for old in list(purchase.items):
                item_master = db.query(ItemMaster).filter(ItemMaster.id == old.item_id).first()
                if item_master:
                    item_master.current_stock = max(0.0, (item_master.current_stock or 0.0) - old.quantity)
                db.delete(old)
            db.flush()

            totals = calculate_purchase_totals(purchase_data.items)
            taxable_total, sgst_total, cgst_total, igst_total, round_off, grand_total, line_amounts = totals
            effective_bill_date = purchase_data.bill_date if "bill_date" in provided and purchase_data.bill_date is not None else purchase.bill_date

            for item_data, line in zip(purchase_data.items, line_amounts):
                item_master = _get_active_item(db, item_data.item_id)
                db.add(PurchaseItem(
                    purchase_id=purchase.id,
                    item_id=item_master.id,
                    item_name=item_master.name,
                    hsn_code=item_data.hsn_code.strip(),
                    quantity=item_data.quantity,
                    unit=item_master.unit,
                    price=item_data.price,
                    disc_percent=item_data.disc_percent or 0.0,
                    sgst=item_data.sgst or 0.0,
                    cgst=item_data.cgst or 0.0,
                    igst=item_data.igst or 0.0,
                    amount=line["amount"],
                ))
                item_master.current_stock = (item_master.current_stock or 0.0) + item_data.quantity
                item_master.purchase_price = item_data.price
                item_master.last_purchase_date = effective_bill_date

            purchase.taxable_amount = taxable_total
            purchase.sgst_total = sgst_total
            purchase.cgst_total = cgst_total
            purchase.igst_total = igst_total
            purchase.round_off = round_off
            purchase.grand_total = grand_total

        purchase.party_id = party.id
        purchase.bill_no = bill_no

        for field in (
            "order_no", "bill_date", "due_term", "due_date", "is_gst", "contact_person",
            "contact_no", "email", "done_by", "brokerage", "broker_remarks", "delivery_date",
            "transport", "ship_to", "ship_to_address", "state", "reference", "remarks",
            "show_shipping_address_on_bill", "is_active"
        ):
            if field in provided:
                value = getattr(purchase_data, field)
                if field == "order_no" and value:
                    value = value.strip()
                setattr(purchase, field, value)

        if ("due_term" in provided or "bill_date" in provided) and purchase.due_term is not None:
            purchase.due_date = purchase.bill_date + timedelta(days=purchase.due_term)

        db.commit()
        db.refresh(purchase)
        purchase.party_name = party.name
        return purchase

    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to update purchase") from error


def delete_purchase_by_id(db: Session, purchase_id: int):
    try:
        purchase = _get_active_purchase(db, purchase_id)
        for row in purchase.items:
            item_master = db.query(ItemMaster).filter(ItemMaster.id == row.item_id).first()
            if item_master:
                item_master.current_stock = max(0.0, (item_master.current_stock or 0.0) - row.quantity)
        purchase.is_active = False
        db.commit()
        return {"message": "Purchase deleted successfully"}
    except HTTPException:
        db.rollback()
        raise
    except Exception as error:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to delete purchase") from error


def get_all_purchases(db: Session, search: Optional[str] = None, skip: int = 0, limit: int = 100):
    try:
        query = db.query(Purchase).join(Party, Purchase.party_id == Party.id).filter(Purchase.is_active.is_(True))
        if search:
            value = search.strip()
            query = query.filter(or_(
                Purchase.bill_no.ilike(f"%{value}%"),
                Purchase.order_no.ilike(f"%{value}%"),
                Party.name.ilike(f"%{value}%"),
            ))
        purchases = query.order_by(Purchase.id.desc()).offset(skip).limit(limit).all()
        for purchase in purchases:
            purchase.party_name = purchase.party.name if purchase.party else "Unknown"
            purchase.item_count = len(purchase.items)
            # Use PurchaseItem snapshot values so history remains correct
            # even if Item Master is later edited, deactivated, or deleted.
            purchase.item_names = [row.item_name for row in purchase.items]
            purchase.hsn_codes = [row.hsn_code for row in purchase.items]
            purchase.purchase_prices = [float(row.price or 0) for row in purchase.items]
        return purchases
    except Exception as error:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch purchases") from error


def calculate_purchase_totals(items):
    taxable_total = sgst_total = cgst_total = igst_total = 0.0
    lines = []

    for item in items:
        sgst = item.sgst or 0.0
        cgst = item.cgst or 0.0
        igst = item.igst or 0.0
        discount = item.disc_percent or 0.0

        if igst > 0 and (sgst > 0 or cgst > 0):
            raise HTTPException(status_code=400, detail="IGST cannot be applied together with CGST or SGST")

        gross = item.quantity * item.price
        taxable = gross - (gross * discount / 100)
        sgst_amount = taxable * sgst / 100
        cgst_amount = taxable * cgst / 100
        igst_amount = taxable * igst / 100
        amount = taxable + sgst_amount + cgst_amount + igst_amount

        taxable_total += taxable
        sgst_total += sgst_amount
        cgst_total += cgst_amount
        igst_total += igst_amount
        lines.append({"amount": round(amount, 2)})

    net_total = taxable_total + sgst_total + cgst_total + igst_total
    grand_total = round(net_total, 0)
    round_off = grand_total - net_total

    return (
        round(taxable_total, 2),
        round(sgst_total, 2),
        round(cgst_total, 2),
        round(igst_total, 2),
        round(round_off, 2),
        round(grand_total, 2),
        lines,
    )
