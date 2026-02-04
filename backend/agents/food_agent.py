"""Food recognition agent using Groq LLM and Hugging Face for vision."""

import json
import base64
import httpx
from datetime import datetime
from typing import Optional
from groq import Groq

from services.config import get_settings
from models.food import (
    FoodLogExtraction,
    FoodLogExtractionItem,
    FoodItem,
    NutrientTotals,
    ParseFoodLogResponse,
)

# ============ Nutrition Data ============

BASIC_NUTRITION = {
    "egg": {"calories": 155, "protein_g": 13, "carbs_g": 1.1, "fat_g": 11, "unit": "piece", "weight": 50},
    "toast": {"calories": 265, "protein_g": 9, "carbs_g": 49, "fat_g": 3.2, "unit": "slice", "weight": 30},
    "bread": {"calories": 265, "protein_g": 9, "carbs_g": 49, "fat_g": 3.2, "unit": "slice", "weight": 30},
    "rice": {"calories": 130, "protein_g": 2.7, "carbs_g": 28, "fat_g": 0.3, "unit": "cup", "weight": 158},
    "chicken": {"calories": 165, "protein_g": 31, "carbs_g": 0, "fat_g": 3.6, "unit": "100g", "weight": 100},
    "pasta": {"calories": 131, "protein_g": 5, "carbs_g": 25, "fat_g": 1.1, "unit": "cup", "weight": 140},
    "salad": {"calories": 20, "protein_g": 1.5, "carbs_g": 3.5, "fat_g": 0.2, "unit": "cup", "weight": 100},
    "apple": {"calories": 52, "protein_g": 0.3, "carbs_g": 14, "fat_g": 0.2, "unit": "piece", "weight": 182},
    "banana": {"calories": 89, "protein_g": 1.1, "carbs_g": 23, "fat_g": 0.3, "unit": "piece", "weight": 118},
    "milk": {"calories": 42, "protein_g": 3.4, "carbs_g": 5, "fat_g": 1, "unit": "cup", "weight": 244},
    "coffee": {"calories": 2, "protein_g": 0.3, "carbs_g": 0, "fat_g": 0, "unit": "cup", "weight": 240},
    "yogurt": {"calories": 59, "protein_g": 10, "carbs_g": 3.6, "fat_g": 0.4, "unit": "cup", "weight": 245},
    "orange": {"calories": 47, "protein_g": 0.9, "carbs_g": 12, "fat_g": 0.1, "unit": "piece", "weight": 131},
    "sandwich": {"calories": 250, "protein_g": 12, "carbs_g": 30, "fat_g": 10, "unit": "piece", "weight": 150},
    "pizza": {"calories": 266, "protein_g": 11, "carbs_g": 33, "fat_g": 10, "unit": "slice", "weight": 107},
    "burger": {"calories": 295, "protein_g": 17, "carbs_g": 24, "fat_g": 14, "unit": "piece", "weight": 150},
}

# ============ Helper Functions ============

def get_nutrition_info(food_name: str, quantity: float = 1.0) -> dict:
    """Look up nutritional information for a food item."""
    name_lower = food_name.lower()

    nutrition = None
    for key, data in BASIC_NUTRITION.items():
        if key in name_lower:
            nutrition = data
            break

    if nutrition is None:
        return {
            "food_name": food_name,
            "quantity": quantity,
            "calories": round(100 * quantity, 1),
            "protein_g": round(5 * quantity, 1),
            "carbs_g": round(15 * quantity, 1),
            "fat_g": round(3 * quantity, 1),
            "note": "Default estimate - food not in database"
        }

    return {
        "food_name": food_name,
        "quantity": quantity,
        "calories": round(nutrition["calories"] * quantity, 1),
        "protein_g": round(nutrition["protein_g"] * quantity, 1),
        "carbs_g": round(nutrition["carbs_g"] * quantity, 1),
        "fat_g": round(nutrition["fat_g"] * quantity, 1),
        "unit": nutrition["unit"],
    }


SYSTEM_PROMPT = '''You are a nutrition analysis expert. Your task is to analyze food descriptions and return structured nutritional information.

You must respond with ONLY a valid JSON object (no markdown, no explanation, just JSON).

The JSON format must be:
{
  "meal": "Breakfast" | "Lunch" | "Dinner" | "Snack",
  "datetime_local": "ISO datetime string",
  "items": [
    {
      "item_name": "food name",
      "qty": number,
      "unit": "g" | "ml" | "cup" | "piece" | "serving",
      "brand": null,
      "search_query": "food name for search",
      "notes": null,
      "calories": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number
    }
  ],
  "needs_clarification": false,
  "clarification_question": null,
  "confidence": 0.9
}

Rules:
1. Split multiple foods into separate items
2. Provide accurate nutritional estimates based on your knowledge
3. Use reasonable portion sizes if not specified
4. Infer meal type from time or explicit mentions:
   - Breakfast: 05:00-10:59
   - Lunch: 11:00-15:59
   - Dinner: 16:00-21:59
   - Snack: 22:00-04:59

IMPORTANT: Return ONLY the JSON object, nothing else.'''


# ============ Agent Service Class ============

class FoodAgentService:
    """Service class for food parsing using Groq LLM with vision capabilities."""

    def __init__(self):
        settings = get_settings()
        self.groq_client = Groq(api_key=settings.groq_api_key)

    async def parse_text(
        self,
        text: str,
        current_datetime: Optional[str] = None,
        timezone: str = "UTC",
        user_id: str = "default",
    ) -> FoodLogExtraction:
        """Parse natural language food log using Groq."""
        if not current_datetime:
            current_datetime = datetime.now().isoformat()

        user_message = f"""Current datetime: {current_datetime}
Timezone: {timezone}

User food log: {text}

Parse this food log and return the JSON with nutrition information."""

        response = self.groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message}
            ],
            temperature=0.1,
            max_tokens=1024,
        )

        return self._parse_response(response.choices[0].message.content, current_datetime)

    async def analyze_image(
        self,
        image_base64: str,
        context: str = "",
        current_datetime: Optional[str] = None,
        timezone: str = "UTC",
        user_id: str = "default",
    ) -> FoodLogExtraction:
        """Analyze food image using Groq's vision model for nutrition."""
        if not current_datetime:
            current_datetime = datetime.now().isoformat()

        # Use Groq's vision model to analyze the image directly
        image_url = f"data:image/jpeg;base64,{image_base64}"

        vision_prompt = f"""Look at this food image and identify all food items visible.
For each food item, provide:
- The name of the food
- Estimated quantity/portion size
- Any notable characteristics (grilled, fried, raw, etc.)

Current datetime: {current_datetime}
Timezone: {timezone}
Additional context: {context if context else 'None'}

List all visible food items."""

        try:
            # Use Groq's vision-capable model (Llama 4 Scout)
            response = self.groq_client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": vision_prompt},
                            {
                                "type": "image_url",
                                "image_url": {"url": image_url},
                            },
                        ],
                    }
                ],
                temperature=0.1,
                max_tokens=512,
            )

            food_description = response.choices[0].message.content
            print(f"[Vision] Successfully analyzed image: {food_description[:100]}...")
        except Exception as e:
            # Log the error and raise it so the user knows something failed
            print(f"[Vision] Error analyzing image: {type(e).__name__}: {str(e)}")
            raise ValueError(f"Vision analysis failed: {str(e)}")

        # Use the text parser with the vision description
        return await self.parse_text(food_description, current_datetime, timezone, user_id)

    def _infer_meal_from_time(self, hour: int) -> str:
        """Infer meal type from hour of day."""
        if 5 <= hour < 11:
            return "Breakfast"
        elif 11 <= hour < 16:
            return "Lunch"
        elif 16 <= hour < 22:
            return "Dinner"
        else:
            return "Snack"

    def _parse_response(self, response_text: str, current_datetime: str) -> FoodLogExtraction:
        """Parse JSON response from Groq."""
        text = response_text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError(f"No JSON found in response: {text[:200]}")

        json_str = text[start:end]
        data = json.loads(json_str)

        items = []
        for item in data.get("items", []):
            items.append(FoodLogExtractionItem(
                item_name=item.get("item_name", "Unknown"),
                qty=item.get("qty"),
                unit=item.get("unit"),
                brand=item.get("brand"),
                search_query=item.get("search_query", item.get("item_name", "")),
                notes=item.get("notes"),
                calories=item.get("calories"),
                protein_g=item.get("protein_g"),
                carbs_g=item.get("carbs_g"),
                fat_g=item.get("fat_g"),
            ))

        return FoodLogExtraction(
            meal=data.get("meal", self._infer_meal_from_time(datetime.now().hour)),
            datetime_local=data.get("datetime_local", current_datetime),
            items=items,
            needs_clarification=data.get("needs_clarification", False),
            clarification_question=data.get("clarification_question"),
            confidence=data.get("confidence", 0.8),
        )


# ============ Singleton Instance ============

_agent_service: Optional[FoodAgentService] = None


def get_food_agent_service() -> FoodAgentService:
    """Get the food agent service instance."""
    global _agent_service
    if _agent_service is None:
        _agent_service = FoodAgentService()
    return _agent_service


# ============ Legacy Compatibility ============

class FoodRecognitionAgent:
    """Legacy wrapper - delegates to FoodAgentService."""

    def __init__(self):
        self._service = get_food_agent_service()

    async def parse_text(self, text: str, current_datetime: Optional[str] = None, timezone: str = "UTC"):
        return await self._service.parse_text(text, current_datetime, timezone)

    async def analyze_image(self, image_base64: str, context: str = "", current_datetime: Optional[str] = None, timezone: str = "UTC"):
        return await self._service.analyze_image(image_base64, context, current_datetime, timezone)


def get_food_agent() -> FoodRecognitionAgent:
    """Get the food recognition agent instance (legacy compatibility)."""
    return FoodRecognitionAgent()


# ============ Nutrition Lookup Helper ============

def lookup_nutrition(item_name: str, qty: Optional[float], unit: Optional[str]) -> NutrientTotals:
    """Look up nutrition for a food item."""
    result = get_nutrition_info(item_name, qty or 1.0)

    return NutrientTotals(
        calories=result["calories"],
        protein_g=result["protein_g"],
        carbs_g=result["carbs_g"],
        fat_g=result["fat_g"],
    )


def extraction_to_response(extraction: FoodLogExtraction) -> ParseFoodLogResponse:
    """Convert FoodLogExtraction to ParseFoodLogResponse with nutrition data."""
    items = []
    total_calories = 0
    total_protein = 0
    total_carbs = 0
    total_fat = 0

    for ext_item in extraction.items:
        # Use AI-provided nutrition if available, otherwise fall back to lookup
        if ext_item.calories is not None:
            nutrients = NutrientTotals(
                calories=ext_item.calories,
                protein_g=ext_item.protein_g or 0,
                carbs_g=ext_item.carbs_g or 0,
                fat_g=ext_item.fat_g or 0,
            )
        else:
            nutrients = lookup_nutrition(ext_item.item_name, ext_item.qty, ext_item.unit)

        item = FoodItem(
            name=ext_item.item_name,
            quantity=ext_item.qty or 1,
            unit=ext_item.unit or "serving",
            nutrients_total=nutrients,
            source="text",
            confidence=extraction.confidence,
        )
        items.append(item)

        total_calories += nutrients.calories
        total_protein += nutrients.protein_g
        total_carbs += nutrients.carbs_g
        total_fat += nutrients.fat_g

    return ParseFoodLogResponse(
        items=items,
        logged_at_iso=extraction.datetime_local,
        meal_label=extraction.meal,
        needs_clarification=extraction.needs_clarification,
        clarification_question=extraction.clarification_question,
        confidence_score=extraction.confidence,
    )
