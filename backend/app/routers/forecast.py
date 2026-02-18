from fastapi import APIRouter, Query
from app.services.forecast import generate_forecast

router = APIRouter()


@router.get("/forecast")
async def get_forecast(
    country: str = Query("", max_length=2, description="Country code filter"),
    weeks: int = Query(8, ge=1, le=52, description="Weeks to forecast"),
):
    return await generate_forecast(country_code=country or None, weeks_ahead=weeks)
