import traceback
from datetime import timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from api.model.item_master_model import ItemMaster
from api.model.party_model import Party
from api.model.purchase_return_model import (
    PurchaseReturn,
    PurchaseReturnItem,
)
from api.schema.purchase_return_schema import (
    PurchaseReturnCreate,
    PurchaseReturnUpdate,
)


def _get_party(db: Session, party_id: int) -> Party:
    party = (
        db.query(Party)
        .filter(
            Party.id == party_id,
            Party.is_active.is_(True),
        )
        .first()
    )

    if not party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found",
        )

    return party


def _get_record(db: Session, record_id: int) -> PurchaseReturn:
    record = (
        db.query(PurchaseReturn)
        .filter(
            PurchaseReturn.id == record_id,
            PurchaseReturn.is_active.is_(True),
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase return not found",
        )

    return record


def _next_number(db: Session, column, prefix: str) -> str:
    last_value = (
        db.query(column)
        .order_by(PurchaseReturn.id.desc())
        .limit(1)
        .scalar()
    )

    if not last_value:
        return f"{prefix}-0001"

    digits = "".join(
        char for char in str(last_value) if char.isdigit()
    )

    return f"{prefix}-{int(digits or 0) + 1:04d}"


def get_next_purchase_return_numbers(db: Session):
    return {
        "return_no": _next_number(
            db,
            PurchaseReturn.return_no,
            "PR",
        ),
        "order_no": _next_number(
            db,
            PurchaseReturn.order_no,
            "PRO",
        ),
    }


def _check_duplicate_return_no(
    db: Session,
    return_no: str,
    exclude_id: Optional[int] = None,
):
    query = db.query(PurchaseReturn).filter(
        func.upper(PurchaseReturn.return_no)
        == return_no.strip().upper()
    )

    if exclude_id is not None:
        query = query.filter(
            PurchaseReturn.id != exclude_id
        )

    if query.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Purchase return number already exists",
        )


def _attach_fields(record: PurchaseReturn):
    record.party_name = (
        record.party.name
        if record.party
        else "Unknown"
    )
    record.item_count = len(record.items)
    record.item_names = [item.item_name for item in record.items]
    record.hsn_codes = [item.hsn_code for item in record.items]
    record.total_quantity = sum(
        item.quantity for item in record.items
    )
    return record


def calculate_totals(items):
    taxable_total = 0.0
    sgst_total = 0.0
    cgst_total = 0.0
    igst_total = 0.0
    lines = []

    for item in items:
        sgst = item.sgst or 0.0
        cgst = item.cgst or 0.0
        igst = item.igst or 0.0
        discount = item.disc_percent or 0.0

        if igst > 0 and (sgst > 0 or cgst > 0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "IGST cannot be used together "
                    "with SGST or CGST"
                ),
            )

        gross = item.quantity * item.price
        discount_amount = gross * discount / 100
        taxable = gross - discount_amount

        sgst_amount = taxable * sgst / 100
        cgst_amount = taxable * cgst / 100
        igst_amount = taxable * igst / 100

        amount = (
            taxable
            + sgst_amount
            + cgst_amount
            + igst_amount
        )

        taxable_total += taxable
        sgst_total += sgst_amount
        cgst_total += cgst_amount
        igst_total += igst_amount

        lines.append({"amount": round(amount, 2)})

    net_total = (
        taxable_total
        + sgst_total
        + cgst_total
        + igst_total
    )

    grand_total = round(net_total)
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


def _subtract_stock_and_build_item(
    db: Session,
    record_id: int,
    item_data,
    line,
):
    item_master = (
        db.query(ItemMaster)
        .filter(
            ItemMaster.id == item_data.item_id,
            ItemMaster.is_active.is_(True),
        )
        .first()
    )

    if not item_master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item '{item_data.item_name}' not found",
        )

    current_stock = item_master.current_stock or 0.0

    if item_data.quantity > current_stock:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Only {current_stock} stock available "
                f"for '{item_master.name}'"
            ),
        )

    item_master.current_stock = (
        current_stock - item_data.quantity
    )

    return PurchaseReturnItem(
        purchase_return_id=record_id,
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
    )


def create_purchase_return(
    db: Session,
    data: PurchaseReturnCreate,
):
    try:
        party = _get_party(db, data.party_id)
        numbers = get_next_purchase_return_numbers(db)

        return_no = (
            data.return_no.strip().upper()
            if data.return_no
            else numbers["return_no"]
        )

        _check_duplicate_return_no(db, return_no)

        order_no = (
            data.order_no.strip()
            if data.order_no
            else numbers["order_no"]
        )

        due_date = data.due_date

        if data.due_term is not None:
            due_date = (
                data.return_date
                + timedelta(days=data.due_term)
            )

        (
            taxable_total,
            sgst_total,
            cgst_total,
            igst_total,
            round_off,
            grand_total,
            lines,
        ) = calculate_totals(data.items)

        record = PurchaseReturn(
            return_no=return_no,
            order_no=order_no,
            original_bill_no=data.original_bill_no,
            return_date=data.return_date,
            due_term=data.due_term,
            due_date=due_date,

            party_id=party.id,
            is_gst=data.is_gst,

            address=data.address,
            city=data.city,
            party_state=data.party_state,
            contact_no=data.contact_no,
            email=data.email,

            done_by=data.done_by,
            brokerage=data.brokerage or 0.0,
            broker_remarks=data.broker_remarks,
            return_reason=data.return_reason,

            taxable_amount=taxable_total,
            sgst_total=sgst_total,
            cgst_total=cgst_total,
            igst_total=igst_total,
            round_off=round_off,
            grand_total=grand_total,

            delivery_date=data.delivery_date,
            transport=data.transport,
            ship_to=data.ship_to,
            ship_to_address=data.ship_to_address,
            state=data.state,
            reference=data.reference,
            remarks=data.remarks,

            show_shipping_address_on_bill=(
                data.show_shipping_address_on_bill
            ),
            is_active=True,
        )

        db.add(record)
        db.flush()

        for item_data, line in zip(data.items, lines):
            db.add(
                _subtract_stock_and_build_item(
                    db,
                    record.id,
                    item_data,
                    line,
                )
            )

        db.commit()
        db.refresh(record)

        return _attach_fields(record)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create purchase return",
        )


def get_purchase_return_by_id(db: Session, record_id: int):
    return _attach_fields(_get_record(db, record_id))


def get_all_purchase_returns(
    db: Session,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
):
    try:
        query = (
            db.query(PurchaseReturn)
            .join(
                Party,
                PurchaseReturn.party_id == Party.id,
            )
            .filter(
                PurchaseReturn.is_active.is_(True)
            )
        )

        if search:
            value = search.strip()

            query = query.filter(
                or_(
                    PurchaseReturn.return_no.ilike(
                        f"%{value}%"
                    ),
                    PurchaseReturn.original_bill_no.ilike(
                        f"%{value}%"
                    ),
                    Party.name.ilike(f"%{value}%"),
                )
            )

        records = (
            query
            .order_by(PurchaseReturn.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return [_attach_fields(record) for record in records]

    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch purchase returns",
        )


def update_purchase_return_by_id(
    db: Session,
    record_id: int,
    data: PurchaseReturnUpdate,
):
    try:
        record = _get_record(db, record_id)
        fields = data.model_fields_set

        if (
            "party_id" in fields
            and data.party_id is not None
        ):
            party = _get_party(db, data.party_id)
            record.party_id = party.id

        if (
            "return_no" in fields
            and data.return_no is not None
        ):
            return_no = data.return_no.strip().upper()
            _check_duplicate_return_no(
                db,
                return_no,
                exclude_id=record.id,
            )
            record.return_no = return_no

        if "order_no" in fields:
            record.order_no = data.order_no

        if "original_bill_no" in fields:
            record.original_bill_no = data.original_bill_no

        if (
            "return_date" in fields
            and data.return_date is not None
        ):
            record.return_date = data.return_date

        if "due_term" in fields:
            record.due_term = data.due_term

        if (
            "due_term" in fields
            or "return_date" in fields
        ):
            if record.due_term is not None:
                record.due_date = (
                    record.return_date
                    + timedelta(days=record.due_term)
                )
        elif "due_date" in fields:
            record.due_date = data.due_date

        simple_fields = [
            "is_gst",
            "address",
            "city",
            "party_state",
            "contact_no",
            "email",
            "done_by",
            "brokerage",
            "broker_remarks",
            "return_reason",
            "delivery_date",
            "transport",
            "ship_to",
            "ship_to_address",
            "state",
            "reference",
            "remarks",
            "show_shipping_address_on_bill",
            "is_active",
        ]

        for field in simple_fields:
            if field in fields:
                setattr(record, field, getattr(data, field))

        if (
            "items" in fields
            and data.items is not None
        ):
            # Undo old stock subtraction.
            for old_item in list(record.items):
                if old_item.item_id is None:
                    continue

                item_master = (
                    db.query(ItemMaster)
                    .filter(
                        ItemMaster.id == old_item.item_id
                    )
                    .first()
                )

                if item_master:
                    item_master.current_stock = (
                        item_master.current_stock or 0.0
                    ) + old_item.quantity

            for old_item in list(record.items):
                db.delete(old_item)

            db.flush()

            (
                taxable_total,
                sgst_total,
                cgst_total,
                igst_total,
                round_off,
                grand_total,
                lines,
            ) = calculate_totals(data.items)

            for item_data, line in zip(data.items, lines):
                db.add(
                    _subtract_stock_and_build_item(
                        db,
                        record.id,
                        item_data,
                        line,
                    )
                )

            record.taxable_amount = taxable_total
            record.sgst_total = sgst_total
            record.cgst_total = cgst_total
            record.igst_total = igst_total
            record.round_off = round_off
            record.grand_total = grand_total

        db.commit()
        db.refresh(record)

        return _attach_fields(record)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update purchase return",
        )
