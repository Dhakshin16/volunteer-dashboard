from fastapi import APIRouter, Depends
from app.utils.dependencies import get_current_user
from app.services.donation_service import create_donation, list_donations_by_user
from app.schemas.models import DonationIn

router = APIRouter()


@router.post("/")
def post_donation(payload: DonationIn, user=Depends(get_current_user)):
    return create_donation(user["id"], payload.model_dump())


@router.get("/me")
def my_donations(user=Depends(get_current_user)):
    return list_donations_by_user(user["id"])
