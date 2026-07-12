import traceback
from typing import Optional

from sqlalchemy.orm import Session
from fastapi import HTTPException

from api.model.bill_model import Bill
from api.model.bill_item_model import BillItem
from api.model.customer_model import Customer
from api.model.item_master_model import ItemMaster


def _generate_invoice_no(db: Session) -> str:
    last_bill = db.query(Bill).order_by(Bill.bill_id.desc()).first()
    if last_bill and last_bill.invoice_no and last_bill.invoice_no.isdigit():
        return str(int(last_bill.invoice_no) + 1)
    return "1"

_ONES = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen",
]
_TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]


def _two_digit_words(n: int) -> str:
    if n < 20:
        return _ONES[n]
    tens, ones = divmod(n, 10)
    return (_TENS[tens] + (" " + _ONES[ones] if ones else "")).strip()


def _three_digit_words(n: int) -> str:
    if n >= 100:
        hundreds, rest = divmod(n, 100)
        return _ONES[hundreds] + " Hundred" + (" " + _two_digit_words(rest) if rest else "")
    return _two_digit_words(n)


def _number_to_words_indian(n: int) -> str:
    if n == 0:
        return "Zero"

    crore, n = divmod(n, 10000000)
    lakh, n = divmod(n, 100000)
    thousand, n = divmod(n, 1000)
    hundred = n

    parts = []
    if crore:
        parts.append(_three_digit_words(crore) + " Crore")
    if lakh:
        parts.append(_three_digit_words(lakh) + " Lakh")
    if thousand:
        parts.append(_three_digit_words(thousand) + " Thousand")
    if hundred:
        parts.append(_three_digit_words(hundred))

    return " ".join(parts)


def _amount_in_words(grand_total: float) -> str:
    rupees = int(grand_total)
    paise = round((grand_total - rupees) * 100)

    words = f"{_number_to_words_indian(rupees)} Rupees"
    if paise:
        words += f" and {_number_to_words_indian(paise)} Paise"
    words += " Only"
    return words

def _resolve_bill_items(db: Session, items_data, is_interstate: bool):
    resolved = []

    for item_data in items_data:

        item = (db.query(ItemMaster).filter(ItemMaster.id == item_data.item_id, ItemMaster.is_active == True).first())

        if not item:
            raise HTTPException(status_code=404, detail=f"Item with ID {item_data.item_id} not found")

        if item.current_stock < item_data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{item.name}'. Available: {item.current_stock}, Requested: {item_data.quantity}",
            )

        rate = item.sale_price or 0.0
        taxable_amount = rate * item_data.quantity
        gst_percent = item.gst_rate or 0.0

        if is_interstate:
            cgst_percent = 0.0
            sgst_percent = 0.0
            igst_percent = gst_percent
        else:
            cgst_percent = gst_percent / 2
            sgst_percent = gst_percent / 2
            igst_percent = 0.0

        cgst_amount = taxable_amount * cgst_percent / 100
        sgst_amount = taxable_amount * sgst_percent / 100
        igst_amount = taxable_amount * igst_percent / 100
        line_total = taxable_amount + cgst_amount + sgst_amount + igst_amount

        resolved.append({
            "item": item,
            "quantity": item_data.quantity,
            "rate": rate,
            "taxable_amount": taxable_amount,
            "gst_percent": gst_percent,
            "cgst_percent": cgst_percent,
            "sgst_percent": sgst_percent,
            "igst_percent": igst_percent,
            "cgst_amount": cgst_amount,
            "sgst_amount": sgst_amount,
            "igst_amount": igst_amount,
            "line_total": line_total,
        })

    return resolved


# ==========================================================
# CREATE BILL
# ==========================================================
def create_bill(db: Session, bill_data):
    try:
        customer = (
            db.query(Customer)
            .filter(Customer.id == bill_data.customer_id, Customer.is_active == True)
            .first()
        )
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        resolved_items = _resolve_bill_items(db, bill_data.items, bill_data.is_interstate)

        subtotal = sum(r["taxable_amount"] for r in resolved_items)
        cgst_total = sum(r["cgst_amount"] for r in resolved_items)
        sgst_total = sum(r["sgst_amount"] for r in resolved_items)
        igst_total = sum(r["igst_amount"] for r in resolved_items)
        taxable_amount = subtotal
        grand_total = round(subtotal + cgst_total + sgst_total + igst_total, 2)
        total_boxes = int(sum(r["quantity"] for r in resolved_items))

        db_bill = Bill(
            invoice_no=_generate_invoice_no(db),
            customer_id=customer.id,
            bill_date=bill_data.bill_date,
            customer_name=customer.customer_name,
            mobile=customer.mobile,
            email=customer.email,
            address=customer.address,
            city=customer.city,
            state=customer.state,
            pincode=customer.pincode,
            buyer_gstin=customer.gstin,
            buyer_pan=customer.pan_card,
            buyer_state_code=customer.state_code,
            total_boxes=total_boxes,
            subtotal=subtotal,
            discount_amount=0.0,
            taxable_amount=taxable_amount,
            cgst_amount=cgst_total,
            sgst_amount=sgst_total,
            igst_amount=igst_total,
            grand_total=grand_total,
            amount_in_words=_amount_in_words(grand_total),
            remarks=bill_data.remarks,
            is_active=True,
        )

        db.add(db_bill)
        db.flush()

        for r in resolved_items:
            item = r["item"]

            db_item = BillItem(
                bill_id=db_bill.bill_id,
                item_id=item.id,
                item_name=item.name,
                brand_name=item.brand,
                hsn_code=item.hsn_code or "",
                unit=item.unit,
                quantity=int(r["quantity"]),
                rate=r["rate"],
                discount_amount=0.0,
                taxable_amount=r["taxable_amount"],
                gst_percent=r["gst_percent"],
                cgst_percent=r["cgst_percent"],
                sgst_percent=r["sgst_percent"],
                igst_percent=r["igst_percent"],
                cgst_amount=r["cgst_amount"],
                sgst_amount=r["sgst_amount"],
                igst_amount=r["igst_amount"],
                line_total=r["line_total"],
            )
            db.add(db_item)

            item.current_stock -= r["quantity"]
            item.last_sale_date = bill_data.bill_date

        db.commit()
        db.refresh(db_bill)
        return db_bill

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to create bill")


# ==========================================================
# GET ALL BILLS
# ==========================================================
def get_all_bills(
    db: Session,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
):
    try:
        query = db.query(Bill).filter(Bill.is_active == True)

        if search:
            query = query.filter(
                (Bill.invoice_no.ilike(f"%{search}%"))
                | (Bill.customer_name.ilike(f"%{search}%"))
            )

        return (query.order_by(Bill.bill_id.desc()).offset(skip).limit(limit).all())

    except Exception:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to fetch bills")


# ==========================================================
# GET BILL BY ID
# ==========================================================
def get_bill_by_id(db: Session, bill_id: int):
    bill = (db.query(Bill).filter(Bill.bill_id == bill_id, Bill.is_active == True).first())

    if not bill:
        raise HTTPException(status_code=404, detail=f"Bill with ID {bill_id} not found")

    return {"bill": bill, "items": bill.bill_items}


# ==========================================================
# UPDATE BILL
# ==========================================================
def update_bill(db: Session, bill_id: int, bill_data):
    try:
        bill = (db.query(Bill).filter(Bill.bill_id == bill_id, Bill.is_active == True).first())

        if not bill:
            raise HTTPException(status_code=404, detail=f"Bill with ID {bill_id} not found")

        customer = (db.query(Customer).filter(Customer.id == bill_data.customer_id, Customer.is_active == True).first())

        if not customer:
            raise HTTPException(status_code=404, detail=f"Customer with ID {bill_data.customer_id} not found")
        
        for old_item in bill.bill_items:
            item_master = db.query(ItemMaster).filter(ItemMaster.id == old_item.item_id).first()
            if item_master:
                item_master.current_stock += old_item.quantity

        for old_item in bill.bill_items:
            db.delete(old_item)

        db.flush()

        resolved_items = _resolve_bill_items(db, bill_data.items, bill_data.is_interstate)

        subtotal = sum(r["taxable_amount"] for r in resolved_items)
        cgst_total = sum(r["cgst_amount"] for r in resolved_items)
        sgst_total = sum(r["sgst_amount"] for r in resolved_items)
        igst_total = sum(r["igst_amount"] for r in resolved_items)
        taxable_amount = subtotal
        grand_total = round(subtotal + cgst_total + sgst_total + igst_total, 2)
        total_boxes = int(sum(r["quantity"] for r in resolved_items))

        for r in resolved_items:
            item = r["item"]

            db_item = BillItem(
                bill_id=bill.bill_id,
                item_id=item.id,
                item_name=item.name,
                brand_name=item.brand,
                hsn_code=item.hsn_code or "",
                unit=item.unit,
                quantity=int(r["quantity"]),
                rate=r["rate"],
                discount_amount=0.0,
                taxable_amount=r["taxable_amount"],
                gst_percent=r["gst_percent"],
                cgst_percent=r["cgst_percent"],
                sgst_percent=r["sgst_percent"],
                igst_percent=r["igst_percent"],
                cgst_amount=r["cgst_amount"],
                sgst_amount=r["sgst_amount"],
                igst_amount=r["igst_amount"],
                line_total=r["line_total"],
            )
            db.add(db_item)

            item.current_stock -= r["quantity"]
            item.last_sale_date = bill_data.bill_date

        bill.customer_id = customer.id
        bill.bill_date = bill_data.bill_date
        bill.customer_name = customer.customer_name
        bill.mobile = customer.mobile
        bill.email = customer.email
        bill.address = customer.address
        bill.city = customer.city
        bill.state = customer.state
        bill.pincode = customer.pincode
        bill.buyer_gstin = customer.gstin
        bill.buyer_pan = customer.pan_card
        bill.buyer_state_code = customer.state_code

        bill.total_boxes = total_boxes
        bill.subtotal = subtotal
        bill.taxable_amount = taxable_amount
        bill.cgst_amount = cgst_total
        bill.sgst_amount = sgst_total
        bill.igst_amount = igst_total
        bill.grand_total = grand_total
        bill.amount_in_words = _amount_in_words(grand_total)
        bill.remarks = bill_data.remarks

        db.commit()
        db.refresh(bill)
        return bill

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Failed to update bill")


# ==========================================================
# DELETE BILL (soft delete, restores the stock it had deducted)
# ==========================================================
def delete_bill(db: Session, bill_id: int):
        bill = (db.query(Bill).filter(Bill.bill_id == bill_id, Bill.is_active == True).first())

        if not bill:
                raise HTTPException(status_code=404, detail=f"Bill with ID {bill_id} not found")

        for item in bill.bill_items:
                item_master = db.query(ItemMaster).filter(ItemMaster.id == item.item_id).first()
                if item_master:
                        item_master.current_stock += item.quantity

        bill.is_active = False
        db.commit()

        return {"message": f"Bill '{bill.invoice_no}' deleted successfully"}