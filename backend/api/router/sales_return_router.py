from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from api.database.dependencies import get_db
from api.schema.sales_return_schema import (
    SalesReturnCreate,
    SalesReturnListResponse,
    SalesReturnResponse,
    SalesReturnUpdate,
)
from api.services.sales_return_service import (
    create_sales_return,
    get_all_sales_returns,
    get_next_sales_return_numbers,
    get_sales_return_by_id,
    update_sales_return_by_id,
)


router = APIRouter(
    prefix="/sales-returns",
    tags=["Sales Returns"],
)


@router.get("/next-numbers")
def next_sales_return_numbers(
    db: Session = Depends(get_db),
):
    return get_next_sales_return_numbers(db)


@router.get(
    "/",
    response_model=list[SalesReturnListResponse],
)
def list_sales_returns(
    db: Session = Depends(get_db),
    search: Optional[str] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=500),
):
    return get_all_sales_returns(
        db=db,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/{sales_return_id}",
    response_model=SalesReturnResponse,
)
def get_single_sales_return(
    sales_return_id: int,
    db: Session = Depends(get_db),
):
    return get_sales_return_by_id(
        db=db,
        sales_return_id=sales_return_id,
    )


@router.post(
    "/",
    response_model=SalesReturnResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_sales_return(
    sales_return: SalesReturnCreate,
    db: Session = Depends(get_db),
):
    return create_sales_return(
        db=db,
        sales_return_data=sales_return,
    )


@router.put(
    "/{sales_return_id}",
    response_model=SalesReturnResponse,
)
def update_sales_return(
    sales_return_id: int,
    sales_return: SalesReturnUpdate,
    db: Session = Depends(get_db),
):
    return update_sales_return_by_id(
        db=db,
        sales_return_id=sales_return_id,
        sales_return_data=sales_return,
    )

