import traceback
from datetime import timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from api.model.customer_model import Customer
from api.model.item_master_model import ItemMaster
from api.model.quotation_model import Quotation, QuotationItem
from api.schema.quotation_schema import (
    QuotationCreate,
    QuotationUpdate,
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


def _get_quotation(
    db: Session,
    quotation_id: int,
    include_inactive: bool = False,
) -> Quotation:
    query = db.query(Quotation).filter(
        Quotation.id == quotation_id
    )

    if not include_inactive:
        query = query.filter(
            Quotation.is_active.is_(True)
        )

    quotation = query.first()

    if not quotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quotation not found",
        )

    return quotation


def _next_document_number(
    db: Session,
    column,
    prefix: str,
) -> str:
    last_value = (
        db.query(column)
        .order_by(Quotation.id.desc())
        .limit(1)
        .scalar()
    )

    if not last_value:
        return f"{prefix}-0001"

    digits = "".join(character for character in last_value if character.isdigit())
    next_number = int(digits or 0) + 1

    return f"{prefix}-{next_number:04d}"


def _check_duplicate_quotation_no(
    db: Session,
    quotation_no: str,
    exclude_id: Optional[int] = None,
) -> None:
    query = db.query(Quotation).filter(
        func.upper(Quotation.quotation_no)
        == quotation_no.strip().upper()
    )

    if exclude_id is not None:
        query = query.filter(
            Quotation.id != exclude_id
        )

    if query.first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quotation number already exists",
        )


def _attach_history_fields(
    quotation: Quotation,
) -> Quotation:
    quotation.customer_name = (
        quotation.customer.customer_name
        if quotation.customer
        else "Unknown"
    )

    quotation.item_count = len(quotation.items)
    quotation.item_names = [
        item.item_name for item in quotation.items
    ]
    quotation.hsn_codes = [
        item.hsn_code for item in quotation.items
    ]
    quotation.total_boxes = sum(
        item.quantity for item in quotation.items
    )

    return quotation


def calculate_quotation_totals(items):
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

        lines.append({
            "amount": round(amount, 2),
        })

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


def create_quotation(
    db: Session,
    quotation_data: QuotationCreate,
):
    try:
        customer = _get_active_customer(
            db,
            quotation_data.customer_id,
        )

        quotation_no = (
            quotation_data.quotation_no.strip().upper()
            if quotation_data.quotation_no
            else _next_document_number(
                db,
                Quotation.quotation_no,
                "QTN",
            )
        )

        _check_duplicate_quotation_no(
            db,
            quotation_no,
        )

        order_no = (
            quotation_data.order_no.strip()
            if quotation_data.order_no
            else _next_document_number(
                db,
                Quotation.order_no,
                "QO",
            )
        )

        due_date = quotation_data.due_date

        if quotation_data.due_term is not None:
            due_date = (
                quotation_data.quotation_date
                + timedelta(days=quotation_data.due_term)
            )

        (
            taxable_total,
            sgst_total,
            cgst_total,
            igst_total,
            round_off,
            grand_total,
            lines,
        ) = calculate_quotation_totals(
            quotation_data.items
        )

        quotation = Quotation(
            quotation_no=quotation_no,
            order_no=order_no,
            quotation_date=quotation_data.quotation_date,
            due_term=quotation_data.due_term,
            due_date=due_date,

            customer_id=customer.id,
            is_gst=quotation_data.is_gst,

            address=quotation_data.address,
            city=quotation_data.city,
            state=quotation_data.state,
            contact_no=quotation_data.contact_no,
            email=quotation_data.email,

            done_by=quotation_data.done_by,
            brokerage=quotation_data.brokerage or 0.0,
            broker_remarks=quotation_data.broker_remarks,

            taxable_amount=taxable_total,
            sgst_total=sgst_total,
            cgst_total=cgst_total,
            igst_total=igst_total,
            round_off=round_off,
            grand_total=grand_total,

            delivery_date=quotation_data.delivery_date,
            ship_to=quotation_data.ship_to,
            ship_to_address=quotation_data.ship_to_address,
            shipping_state=quotation_data.shipping_state,
            transport=quotation_data.transport,
            reference=quotation_data.reference,
            remarks=quotation_data.remarks,

            show_shipping_address_on_bill=(
                quotation_data.show_shipping_address_on_bill
            ),

            is_active=True,
        )

        db.add(quotation)
        db.flush()

        for item_data, line in zip(
            quotation_data.items,
            lines,
        ):
            item_master = None

            if item_data.item_id is not None:
                item_master = (
                    db.query(ItemMaster)
                    .filter(
                        ItemMaster.id == item_data.item_id
                    )
                    .first()
                )

            quotation_item = QuotationItem(
                quotation_id=quotation.id,
                item_id=(
                    item_master.id
                    if item_master
                    else item_data.item_id
                ),
                item_name=(
                    item_master.name
                    if item_master
                    else item_data.item_name
                ),
                hsn_code=item_data.hsn_code.strip(),
                quantity=item_data.quantity,
                unit=(
                    item_master.unit
                    if item_master
                    else item_data.unit
                ),
                price=item_data.price,
                disc_percent=item_data.disc_percent or 0.0,
                sgst=item_data.sgst or 0.0,
                cgst=item_data.cgst or 0.0,
                igst=item_data.igst or 0.0,
                amount=line["amount"],
            )

            db.add(quotation_item)

        # IMPORTANT: Quotations never change Item Master stock.
        db.commit()
        db.refresh(quotation)

        return _attach_history_fields(quotation)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create quotation",
        )


def get_quotation_by_id(
    db: Session,
    quotation_id: int,
):
    quotation = _get_quotation(
        db,
        quotation_id,
    )

    return _attach_history_fields(quotation)


def get_all_quotations(
    db: Session,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
):
    try:
        query = (
            db.query(Quotation)
            .join(
                Customer,
                Quotation.customer_id == Customer.id,
            )
            .filter(
                Quotation.is_active.is_(True)
            )
        )

        if search:
            search_value = search.strip()

            query = query.filter(
                or_(
                    Quotation.quotation_no.ilike(
                        f"%{search_value}%"
                    ),
                    Quotation.order_no.ilike(
                        f"%{search_value}%"
                    ),
                    Customer.customer_name.ilike(
                        f"%{search_value}%"
                    ),
                )
            )

        quotations = (
            query
            .order_by(Quotation.id.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return [
            _attach_history_fields(quotation)
            for quotation in quotations
        ]

    except Exception:
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch quotations",
        )


def update_quotation_by_id(
    db: Session,
    quotation_id: int,
    quotation_data: QuotationUpdate,
):
    try:
        quotation = _get_quotation(
            db,
            quotation_id,
            include_inactive=True,
        )

        fields = quotation_data.model_fields_set

        if (
            "customer_id" in fields
            and quotation_data.customer_id is not None
        ):
            customer = _get_active_customer(
                db,
                quotation_data.customer_id,
            )
            quotation.customer_id = customer.id

        if (
            "quotation_no" in fields
            and quotation_data.quotation_no is not None
        ):
            quotation_no = (
                quotation_data.quotation_no
                .strip()
                .upper()
            )

            _check_duplicate_quotation_no(
                db,
                quotation_no,
                exclude_id=quotation.id,
            )

            quotation.quotation_no = quotation_no

        if "order_no" in fields:
            quotation.order_no = (
                quotation_data.order_no.strip()
                if quotation_data.order_no
                else None
            )

        if (
            "quotation_date" in fields
            and quotation_data.quotation_date is not None
        ):
            quotation.quotation_date = (
                quotation_data.quotation_date
            )

        if "due_term" in fields:
            quotation.due_term = quotation_data.due_term

        if (
            "due_term" in fields
            or "quotation_date" in fields
        ):
            if quotation.due_term is not None:
                quotation.due_date = (
                    quotation.quotation_date
                    + timedelta(days=quotation.due_term)
                )
        elif "due_date" in fields:
            quotation.due_date = quotation_data.due_date

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
                    quotation,
                    field,
                    getattr(quotation_data, field),
                )

        if (
            "items" in fields
            and quotation_data.items is not None
        ):
            for old_item in list(quotation.items):
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
            ) = calculate_quotation_totals(
                quotation_data.items
            )

            for item_data, line in zip(
                quotation_data.items,
                lines,
            ):
                item_master = None

                if item_data.item_id is not None:
                    item_master = (
                        db.query(ItemMaster)
                        .filter(
                            ItemMaster.id == item_data.item_id
                        )
                        .first()
                    )

                db.add(
                    QuotationItem(
                        quotation_id=quotation.id,
                        item_id=(
                            item_master.id
                            if item_master
                            else item_data.item_id
                        ),
                        item_name=(
                            item_master.name
                            if item_master
                            else item_data.item_name
                        ),
                        hsn_code=item_data.hsn_code.strip(),
                        quantity=item_data.quantity,
                        unit=(
                            item_master.unit
                            if item_master
                            else item_data.unit
                        ),
                        price=item_data.price,
                        disc_percent=item_data.disc_percent or 0.0,
                        sgst=item_data.sgst or 0.0,
                        cgst=item_data.cgst or 0.0,
                        igst=item_data.igst or 0.0,
                        amount=line["amount"],
                    )
                )

            quotation.taxable_amount = taxable_total
            quotation.sgst_total = sgst_total
            quotation.cgst_total = cgst_total
            quotation.igst_total = igst_total
            quotation.round_off = round_off
            quotation.grand_total = grand_total

        # IMPORTANT: Quotations never change Item Master stock.
        db.commit()
        db.refresh(quotation)

        return _attach_history_fields(quotation)

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update quotation",
        )


def delete_quotation_by_id(
    db: Session,
    quotation_id: int,
):
    try:
        quotation = _get_quotation(
            db,
            quotation_id,
            include_inactive=True,
        )

        db.delete(quotation)
        db.commit()

        return {
            "message": "Quotation deleted successfully"
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete quotation",
        )
