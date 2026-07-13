from sqlalchemy.orm import Session

from api.model.company_profile_model import CompanyProfile
from api.schema.company_profile_schema import CompanyProfileUpdate


def _get_or_create_profile(db: Session) -> CompanyProfile:
    profile = db.query(CompanyProfile).order_by(CompanyProfile.id.asc()).first()
    if profile:
        return profile

    profile = CompanyProfile(
        company_name="Your Company Name",
        terms_and_conditions=[
            "Payments to MSMEs should be made within the applicable statutory period.",
            "Goods once sold will not be taken back or exchanged.",
        ],
        jurisdiction_note="Subject to Ahmedabad jurisdiction.",
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def get_company_profile(db: Session) -> CompanyProfile:
    return _get_or_create_profile(db)


def update_company_profile(db: Session, data: CompanyProfileUpdate) -> CompanyProfile:
    profile = _get_or_create_profile(db)
    for field, value in data.model_dump().items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
