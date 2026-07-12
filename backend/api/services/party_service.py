from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from api.model.party_model import Party
from api.schema.party_schema import PartyCreate, PartyUpdate


def _clean_text(value):
    return value.strip() if isinstance(value, str) and value.strip() else None


def _normalize_gstin(value):
    return value.strip().upper() if value else None


def _normalize_pan(value):
    return value.strip().upper() if value else None


def _pan_from_gstin(gstin):
    clean_gstin = _normalize_gstin(gstin)
    return clean_gstin[2:12] if clean_gstin and len(clean_gstin) >= 12 else None


def create_party(db: Session, party_data: PartyCreate):
    gstin = _normalize_gstin(party_data.gstin)
    pan_card = _normalize_pan(party_data.pan_card) or _pan_from_gstin(gstin)

    if gstin:
        existing_gstin = (
            db.query(Party)
            .filter(Party.gstin == gstin, Party.is_active == True)
            .first()
        )
        if existing_gstin:
            raise HTTPException(status_code=400, detail="GSTIN already exists")

    db_party = Party(
        name=party_data.name.strip(),
        party_type=party_data.party_type,
        country_code=party_data.country_code or "+91",
        mobile=_clean_text(party_data.mobile),
        address=_clean_text(party_data.address),
        city=_clean_text(party_data.city),
        state=_clean_text(party_data.state),
        gstin=gstin,
        pan_card=pan_card,
        opening_balance=party_data.opening_balance,
        balance_type=party_data.balance_type,
        opening_remark=_clean_text(party_data.opening_remark),
    )

    db.add(db_party)
    db.commit()
    db.refresh(db_party)
    return db_party


def get_parties(db: Session, skip: int = 0, limit: int = 100, search: str = None):
    query = db.query(Party).filter(Party.is_active == True)

    if search:
        query = query.filter(
            or_(
                Party.name.ilike(f"%{search}%"),
                Party.mobile.ilike(f"%{search}%"),
                Party.city.ilike(f"%{search}%"),
                Party.state.ilike(f"%{search}%"),
                Party.gstin.ilike(f"%{search}%"),
                Party.pan_card.ilike(f"%{search}%"),
            )
        )

    return query.order_by(Party.id.desc()).offset(skip).limit(limit).all()


def get_party_by_id(db: Session, party_id: int):
    party = db.query(Party).filter(Party.id == party_id, Party.is_active == True).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    return party


def update_party_by_id(db: Session, party_id: int, party_data: PartyUpdate):
    party = get_party_by_id(db, party_id)
    data = party_data.model_dump(exclude_unset=True)

    if "gstin" in data:
        data["gstin"] = _normalize_gstin(data.get("gstin"))
        if data["gstin"]:
            existing_gstin = (
                db.query(Party)
                .filter(Party.gstin == data["gstin"], Party.id != party_id, Party.is_active == True)
                .first()
            )
            if existing_gstin:
                raise HTTPException(status_code=400, detail="GSTIN already exists")

    if "pan_card" in data:
        data["pan_card"] = _normalize_pan(data.get("pan_card"))
    elif "gstin" in data and data.get("gstin"):
        data["pan_card"] = _pan_from_gstin(data["gstin"])

    for text_field in ["mobile", "address", "city", "state", "opening_remark"]:
        if text_field in data:
            data[text_field] = _clean_text(data[text_field])

    if "country_code" in data and not data["country_code"]:
        data["country_code"] = "+91"

    if "name" in data and data["name"] is not None:
        data["name"] = data["name"].strip()

    for field, value in data.items():
        setattr(party, field, value)

    db.commit()
    db.refresh(party)
    return party


def delete_party_by_id(db: Session, party_id: int):
    party = get_party_by_id(db, party_id)
    party.is_active = False
    db.commit()
    return {"message": f"Party '{party.name}' deleted successfully."}
