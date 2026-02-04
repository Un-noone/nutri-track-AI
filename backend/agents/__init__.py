"""Agents package."""

from .food_agent import (
    FoodRecognitionAgent,
    get_food_agent,
    get_food_agent_service,
    FoodAgentService,
    lookup_nutrition,
    extraction_to_response,
    SYSTEM_PROMPT,
)

# Alias for backwards compatibility
AGENT_INSTRUCTION = SYSTEM_PROMPT

__all__ = [
    "FoodRecognitionAgent",
    "get_food_agent",
    "get_food_agent_service",
    "FoodAgentService",
    "lookup_nutrition",
    "extraction_to_response",
    "AGENT_INSTRUCTION",
    "SYSTEM_PROMPT",
]
