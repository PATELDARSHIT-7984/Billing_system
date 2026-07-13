from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from api.database.dependencies import get_db
from api.schema.company_profile_schema import (
    CompanyProfileResponse,
    CompanyProfileUpdate,
)
from api.services.company_profile_service import (
    get_company_profile,
    update_company_profile,
)

router = APIRouter(prefix="/company-profile", tags=["Company Profile"])


@router.get("/", response_model=CompanyProfileResponse)
def read_company_profile(db: Session = Depends(get_db)):
    return get_company_profile(db)


@router.put("/", response_model=CompanyProfileResponse)
def edit_company_profile(
    profile: CompanyProfileUpdate,
    db: Session = Depends(get_db),
):
    return update_company_profile(db, profile)
