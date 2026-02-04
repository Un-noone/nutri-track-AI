"""Food parsing and analysis API routes."""

import base64
from datetime import datetime
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends

from models import ParseFoodLogRequest, ParseFoodLogResponse
from agents import get_food_agent, extraction_to_response
from services import get_current_user

router = APIRouter(prefix="/api", tags=["Food Analysis"])


@router.post("/parse-food-log", response_model=ParseFoodLogResponse)
async def parse_food_log(
    request: ParseFoodLogRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Parse a natural language food log entry.

    Example: "I had 2 eggs and toast for breakfast"
    """
    try:
        agent = get_food_agent()

        # Use current time if not provided
        current_datetime = request.current_datetime
        if not current_datetime:
            current_datetime = datetime.now().isoformat()

        # Parse with AI
        extraction = await agent.parse_text(
            text=request.text,
            current_datetime=current_datetime,
            timezone=request.timezone or "UTC",
        )

        # Convert to response with nutrition
        response = extraction_to_response(extraction)
        return response

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to parse food log: {str(e)}"
        )


@router.post("/analyze-food-image", response_model=ParseFoodLogResponse)
async def analyze_food_image(
    image: UploadFile = File(...),
    context: str = Form(""),
    current_datetime: str = Form(None),
    timezone: str = Form("UTC"),
    current_user: dict = Depends(get_current_user),
):
    """
    Analyze a food image and identify items.

    Upload a JPEG/PNG image of food to get nutrition analysis.
    """
    # Validate file type
    if image.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid image type. Use JPEG, PNG, or WebP."
        )

    try:
        # Read and encode image
        contents = await image.read()
        image_base64 = base64.b64encode(contents).decode("utf-8")

        agent = get_food_agent()

        # Use current time if not provided
        if not current_datetime:
            current_datetime = datetime.now().isoformat()

        # Analyze with AI
        extraction = await agent.analyze_image(
            image_base64=image_base64,
            context=context,
            current_datetime=current_datetime,
            timezone=timezone,
        )

        # Mark items as from image
        response = extraction_to_response(extraction)
        for item in response.items:
            item.source = "image"

        return response

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze image: {str(e)}"
        )
