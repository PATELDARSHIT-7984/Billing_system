import traceback
from datetime import timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from api.model.customer_model import Customer
from api.model.item_master_model import ItemMaster
from api.model.sales_return_model import (
    SalesReturn,
    SalesReturnItem,
)
from api.schema.sales_return_schema import (
    SalesReturnCreate,
    SalesReturnUpdate,
)


def _customer_name(customer) -> str:
    return (
        getattr(customer, "customer_name", None)
        or getattr(customer, "name", None)
        or "Unknown"
    )


def _get_active_customer(
    db: Session,
    customer_id: int,
) -> Customer:
    customer = (
        db.query(Customer)
        .filter(
            Customer.id == customer_id,
            Customer.is_active.is_(True),
        )
        .first()
    )

    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return customer


def _get_sales_return(
    db: Session,
    sales_return_id: int,
) -> SalesReturn:
    record = (
        db.query(SalesReturn)
        .filter(
            SalesReturn.id == sales_return_id,
            SalesReturn.is_active.is_(True),
        )
        .first()
    )

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sales return not found",
        )

    return record


def _next_number(
    db: Session,
    column,
    prefix: str,
) -> str:
    last_value = (
        db.query(column)
        .order_by(SalesReturn.id.desc())
        .limit(1)
        .scalar()
    )

    if not last_value:
        return f"{prefix}-0001"

    digits = "".join(
        character
        for character in str(last_value)
        if character.isdigit()
    )

    return f"{prefix}-{int(digits or 0) + 1:04d}"


def get_next_sales_return_numbers(db: Session):
    return {
        "return_no": _next_number(
            db,
            SalesReturn.return_no,
            "SR",
        ),
        "order_no": _next_number(
            db,
            SalesReturn.order_no,
            "SRO",
        ),
    }


def _check_duplicate_return_no(
    db: Session,
    return_no: str,
    exclude_id: Optional[int] = None,
):
    query = db.query(SalesReturn).filter(
        func.upper(SalesReturn.return_no)
        == return_no.strip().upper()
    )

    if exclude_id is not None:
        query = query.filter(
            SalesReturn.id != exclude_id
        )

    if query.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sales return number already exists",
        )


def _attach_history_fields(record: SalesReturn):
    record.customer_name = (
        _customer_name(record.customer)
        if record.customer
        else "Unknown"
    )
    record.item_count = len(record.items)
    record.item_names = [
        item.item_name for item in record.items
    ]
    record.hsn_codes = [
        item.hsn_code for item in record.items
    ]
    record.total_boxes = sum(
        item.quantity for item in record.items
    )
    return record


def calculate_sales_return_totals(items):
    taxable_total = 0.0
    sgst_total = 0.0
    cgst_total = 0.0
    igst_total = 0.0
    lines = []

    for item in items:
        sgst_rate = item.sgst or 0.0
        cgst_rate = item.cgst or 0.0
        igst_rate = item.igst or 0.0
        discount_rate = item.disc_percent or 0.0

        if igst_rate > 0 and (
            sgst_rate > 0 or cgst_rate > 0
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "IGST cannot be applied together "
                    "with SGST or CGST"
                ),
            )

        gross = item.quantity * item.price
        discount = gross * discount_rate / 100
        taxable = gross - discount

        sgst_amount = taxable * sgst_rate / 100
        cgst_amount = taxable * cgst_rate / 100
        igst_amount = taxable * igst_rate / 100

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


def _build_return_item(
    db: Session,
    record_id: int,
    item_data,
    line,
):
    item_master = None

    if item_data.item_id is not None:
        item_master = (
            db.query(ItemMaster)
            .filter(ItemMaster.id == item_data.item_id)
            .first()
        )

    if not item_master:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Item '{item_data.item_name}' not found",
        )

    item_master.current_stock = (
        item_master.current_stock or 0.0
    ) + item_data.quantity

    return SalesReturnItem(
        sales_return_id=record_id,
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


def create_sales_return(
    db: Session,
    sales_return_data: SalesReturnCreate,
):
    try:
        customer = _get_active_customer(
            db,
            sales_return_data.customer_id,
        )

        numbers = get_next_sales_return_numbers(db)

        return_no = (
            sales_return_data.return_no.strip().upper()
            if sales_return_data.return_no
            else numbers["return_no"]
        )

        _check_duplicate_return_no(
            db,
            return_no,
        )

        order_no = (
            sales_return_data.order_no.strip()
            if sales_return_data.order_no
            else numbers["order_no"]
        )

        due_date = sales_return_data.due_date

        if sales_return_data.due_term is not None:
            due_date = (
                sales_return_data.return_date
                + timedelta(days=sales_return_data.due_term)
            )

        (
            taxable_total,
            sgst_total,
            cgst_total,
            igst_total,
            round_off,
            grand_total,
            lines,
        ) = calculate_sales_return_totals(
            sales_return_data.items
        )

        record = SalesReturn(
            return_no=return_no,
            order_no=order_no,
            original_invoice_no=(
                sales_return_data.original_invoice_no
            ),
            return_date=sales_return_data.return_date,
            due_term=sales_return_data.due_term,
            due_date=due_date,

            customer_id=customer.id,
            is_gst=sales_return_data.is_gst,

            address=sales_return_data.address,
            city=sales_return_data.city,
            state=sales_return_data.state,
            contact_no=sales_return_data.contact_no,
            email=sales_return_data.email,

            done_by=sales_return_data.done_by,
            brokerage=sales_return_data.brokerage or 0.0,
            broker_remarks=sales_return_data.broker_remarks,
            return_reason=sales_return_data.return_reason,

            taxable_amount=taxable_total,
            sgst_total=sgst_total,
            cgst_total=cgst_total,
            igst_total=igst_total,
            round_off=round_off,
            grand_total=grand_total,

            delivery_date=sales_return_data.delivery_date,
            ship_to=sales_return_data.ship_to,
            ship_to_address=sales_return_data.ship_to_address,
            shipping_state=sales_return_data.shipping_state,
            transport=sales_return_data.transport,
            reference=sales_return_data.reference,
            remarks=sales_return_data.remarks,

            show_shipping_address_on_bill=(
                sales_return_data
                .show_shipping_address_on_bill
            ),
            is_active=True,
        )

        db.add(record)
        db.flush()

        for item_data, line in zip(
            sales_return_data.items,
            lines,
        ):
            db.add(
                _build_return_item(
                    db,
                    record.id,
                    item_data,
                    line,
                )
            )

        db.commit()
        db.refresh(record)

        return _attach_history_fields(record)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create sales return",
        )


def get_sales_return_by_id(
    db: Session,
    sales_return_id: int,
):
    return _attach_history_fields(
        _get_sales_return(db, sales_return_id)
    )


def get_all_sales_returns(
    db: Session,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
):
    try:
        query = (
            db.query(SalesReturn)
            .join(
                Customer,
                SalesReturn.customer_id == Customer.id,
            )
            .filter(
                SalesReturn.is_active.is_(True)
            )
        )

        if search:
            value = search.strip()
            customer_name_column = getattr(
                Customer,
                "customer_name",
                getattr(Customer, "name", None),
            )

            filters = [
                SalesReturn.return_no.ilike(f"%{value}%"),
                SalesReturn.order_no.ilike(f"%{value}%"),
                SalesReturn.original_invoice_no.ilike(
                    f"%{value}%"
                ),
            ]

            if customer_name_column is not None:
                filters.append(
                    customer_name_column.ilike(f"%{value}%")
                )

            query = query.filter(or_(*filters))

        records = (
            query
            .order_by(SalesReturn.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return [
            _attach_history_fields(record)
            for record in records
        ]

    except Exception:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch sales returns",
        )


def update_sales_return_by_id(
    db: Session,
    sales_return_id: int,
    sales_return_data: SalesReturnUpdate,
):
    try:
        record = _get_sales_return(
            db,
            sales_return_id,
        )
        fields = sales_return_data.model_fields_set

        if (
            "customer_id" in fields
            and sales_return_data.customer_id is not None
        ):
            customer = _get_active_customer(
                db,
                sales_return_data.customer_id,
            )
            record.customer_id = customer.id

        if (
            "return_no" in fields
            and sales_return_data.return_no is not None
        ):
            return_no = (
                sales_return_data.return_no
                .strip()
                .upper()
            )
            _check_duplicate_return_no(
                db,
                return_no,
                exclude_id=record.id,
            )
            record.return_no = return_no

        if "order_no" in fields:
            record.order_no = (
                sales_return_data.order_no.strip()
                if sales_return_data.order_no
                else None
            )

        if "original_invoice_no" in fields:
            record.original_invoice_no = (
                sales_return_data.original_invoice_no
            )

        if (
            "return_date" in fields
            and sales_return_data.return_date is not None
        ):
            record.return_date = (
                sales_return_data.return_date
            )

        if "due_term" in fields:
            record.due_term = sales_return_data.due_term

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
            record.due_date = sales_return_data.due_date

        simple_fields = [
            "is_gst",
            "address",
            "city",
            "state",
            "contact_no",
            "email",
            "done_by",
            "brokerage",
            "broker_remarks",
            "return_reason",
            "delivery_date",
            "ship_to",
            "ship_to_address",
            "shipping_state",
            "transport",
            "reference",
            "remarks",
            "show_shipping_address_on_bill",
            "is_active",
        ]

        for field in simple_fields:
            if field in fields:
                setattr(
                    record,
                    field,
                    getattr(sales_return_data, field),
                )

        if (
            "items" in fields
            and sales_return_data.items is not None
        ):
            # Undo the previous return stock before applying new rows.
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

                if not item_master:
                    continue

                current_stock = (
                    item_master.current_stock or 0.0
                )

                if current_stock < old_item.quantity:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=(
                            "Cannot update this return because "
                            f"stock for '{old_item.item_name}' "
                            "has already been used."
                        ),
                    )

                item_master.current_stock = (
                    current_stock - old_item.quantity
                )

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
            ) = calculate_sales_return_totals(
                sales_return_data.items
            )

            for item_data, line in zip(
                sales_return_data.items,
                lines,
            ):
                db.add(
                    _build_return_item(
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

        return _attach_history_fields(record)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update sales return",
        )
