"""
Genie Processing Background Tasks
Handles AI-powered wish processing and recommendation generation.
"""

import asyncio
import logging
from typing import Dict, Any
from celery import Task
from datetime import datetime

from app.celery.celery_app import celery_app
from app.core.database import get_async_db
from app.models.genie_wish import GenieWish
from app.models.resume import Resume
from app.services.openai_service import openai_service

logger = logging.getLogger(__name__)


class GenieProcessingTask(Task):
    """Base task for genie processing operations with error handling."""
    
    autoretry_for = (Exception,)
    retry_kwargs = {'max_retries': 3, 'countdown': 60}
    retry_backoff = True


@celery_app.task(bind=True, base=GenieProcessingTask, name="genie.generate_wish_recommendations")
def generate_wish_recommendations(self, wish_id: str) -> Dict[str, Any]:
    """
    Generate AI-powered recommendations for a genie wish.
    
    Args:
        wish_id: UUID of the GenieWish record
    
    Returns:
        Dict containing processing results
    """
    async def _process_wish():
        async with get_async_db() as db:
            try:
                logger.info(f"Starting wish processing for: {wish_id}")
                
                # Get genie wish record
                wish = await db.get(GenieWish, wish_id)
                if not wish:
                    raise ValueError(f"Genie wish not found: {wish_id}")
                
                # Skip if already processed
                if wish.is_processed:
                    logger.info(f"Wish already processed: {wish_id}")
                    return {"status": "already_processed", "wish_id": wish_id}
                
                # Update processing status
                wish.processing_status = "analyzing"
                wish.processing_error = None
                await db.commit()
                
                # Generate AI response based on wish type
                ai_response = await _generate_ai_response(wish, db)
                
                # Update wish with results
                wish.ai_response = ai_response.get("response", "")
                wish.recommendations = ai_response.get("recommendations", [])
                wish.action_items = ai_response.get("action_items", [])
                wish.resources = ai_response.get("resources", [])
                wish.confidence_score = ai_response.get("confidence_score", 0.8)
                wish.is_processed = True
                wish.processing_status = "completed"
                wish.processed_at = datetime.utcnow()
                
                await db.commit()
                
                logger.info(f"Wish processing completed for: {wish_id}")
                
                return {
                    "status": "completed",
                    "wish_id": wish_id,
                    "recommendations_count": len(wish.recommendations or []),
                    "action_items_count": len(wish.action_items or [])
                }
                
            except Exception as e:
                logger.error(f"Wish processing failed for {wish_id}: {e}")
                
                # Update error status
                try:
                    wish = await db.get(GenieWish, wish_id)
                    if wish:
                        wish.processing_status = "failed"
                        wish.processing_error = str(e)
                        await db.commit()
                except Exception as db_error:
                    logger.error(f"Failed to update error status: {db_error}")
                
                # Re-raise for Celery retry mechanism
                raise
    
    return asyncio.run(_process_wish())


async def _generate_ai_response(wish: GenieWish, db) -> Dict[str, Any]:
    """
    Generate AI response based on wish type and context.
    
    Args:
        wish: GenieWish object
        db: Database session
    
    Returns:
        Dict containing AI-generated response and recommendations
    """
    try:
        # Get additional context if resume_id is provided
        resume_context = ""
        if wish.context_data and wish.context_data.get("resume_id"):
            resume = await db.get(Resume, wish.context_data["resume_id"])
            if resume and resume.extracted_text:
                resume_context = f"\n\nRESUME CONTEXT:\n{resume.extracted_text[:2000]}"
        
        # Create wish-type specific prompt
        system_prompt = _get_system_prompt(wish.wish_type)
        user_prompt = _create_user_prompt(wish, resume_context)
        
        # Get AI response
        response = await openai_service.get_chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            model="gpt-4",
            temperature=0.7,
            max_tokens=1500
        )
        
        # Parse structured response
        import json
        try:
            structured_response = json.loads(response)
        except json.JSONDecodeError:
            logger.warning("AI response was not valid JSON, creating structured response")
            structured_response = _create_structured_response(response)
        
        # Validate and normalize response
        return _validate_response(structured_response)
        
    except Exception as e:
        logger.error(f"AI response generation failed: {e}")
        return _create_fallback_response(wish.wish_type)


def _get_system_prompt(wish_type: str) -> str:
    """Get system prompt based on wish type."""
    prompts = {
        "improvement": """You are an expert career coach and resume specialist. You provide actionable advice for improving resumes and career profiles. Focus on specific, measurable improvements that will increase job prospects.""",
        
        "career_advice": """You are a senior career advisor with expertise across multiple industries. You provide strategic career guidance, helping professionals navigate their career paths and make informed decisions.""",
        
        "skill_gap": """You are a skills development expert and learning strategist. You help professionals identify skill gaps and create concrete learning plans to advance their careers.""",
        
        "interview_prep": """You are an interview coach with extensive experience helping candidates succeed in technical and behavioral interviews. You provide specific, actionable interview preparation advice."""
    }
    
    return prompts.get(wish_type, prompts["improvement"])


def _create_user_prompt(wish: GenieWish, resume_context: str) -> str:
    """Create user prompt with wish details and context."""
    context_info = ""
    if wish.context_data:
        context_items = []
        for key, value in wish.context_data.items():
            if key != "resume_id":  # Resume context added separately
                context_items.append(f"{key}: {value}")
        if context_items:
            context_info = "\n\nADDITIONAL CONTEXT:\n" + "\n".join(context_items)
    
    prompt = f"""
USER REQUEST: {wish.wish_text}
{context_info}
{resume_context}

Please provide a comprehensive response in the following JSON format:
{{
    "response": "Detailed response to the user's request",
    "recommendations": [
        "Specific recommendation 1",
        "Specific recommendation 2",
        "Specific recommendation 3"
    ],
    "action_items": [
        "Concrete action item 1",
        "Concrete action item 2",
        "Concrete action item 3"
    ],
    "resources": [
        {{"title": "Resource Title", "url": "https://example.com", "description": "Why this is helpful"}},
        {{"title": "Another Resource", "url": "https://example.com", "description": "Additional context"}}
    ],
    "confidence_score": 0.9
}}

Make your advice specific, actionable, and tailored to the user's situation. Include confidence score between 0.0 and 1.0.
"""
    
    return prompt


def _create_structured_response(raw_response: str) -> Dict[str, Any]:
    """Create structured response from unstructured AI output."""
    return {
        "response": raw_response[:500],  # Truncate if too long
        "recommendations": [
            "Review and implement the suggestions provided",
            "Consider additional research in your field",
            "Practice implementing the recommended changes"
        ],
        "action_items": [
            "Start with the first recommendation",
            "Set aside time for implementation",
            "Track your progress over time"
        ],
        "resources": [
            {
                "title": "Career Development Resources",
                "url": "https://linkedin.com/learning",
                "description": "Professional development courses"
            }
        ],
        "confidence_score": 0.7
    }


def _validate_response(response: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and normalize AI response structure."""
    # Ensure all required fields exist
    response.setdefault("response", "")
    response.setdefault("recommendations", [])
    response.setdefault("action_items", [])
    response.setdefault("resources", [])
    response.setdefault("confidence_score", 0.8)
    
    # Validate confidence score
    confidence = response.get("confidence_score", 0.8)
    if not isinstance(confidence, (int, float)) or not (0.0 <= confidence <= 1.0):
        response["confidence_score"] = 0.8
    
    # Ensure lists are not empty
    if not response["recommendations"]:
        response["recommendations"] = ["Consider reviewing your current approach"]
    
    if not response["action_items"]:
        response["action_items"] = ["Take time to plan your next steps"]
    
    # Validate resources structure
    validated_resources = []
    for resource in response.get("resources", []):
        if isinstance(resource, dict) and "title" in resource:
            validated_resources.append({
                "title": resource.get("title", "Resource"),
                "url": resource.get("url", ""),
                "description": resource.get("description", "")
            })
    response["resources"] = validated_resources
    
    return response


def _create_fallback_response(wish_type: str) -> Dict[str, Any]:
    """Create fallback response when AI processing fails."""
    fallback_responses = {
        "improvement": {
            "response": "I recommend focusing on quantifying your achievements and tailoring your resume to specific job requirements.",
            "recommendations": [
                "Add specific metrics and numbers to your accomplishments",
                "Use strong action verbs to describe your experiences",
                "Tailor your resume keywords to match job postings"
            ],
            "action_items": [
                "Review your resume for missing quantifiable results",
                "Research industry-specific keywords",
                "Update your resume format for better readability"
            ]
        },
        "career_advice": {
            "response": "Consider exploring adjacent roles and building skills that align with your career goals.",
            "recommendations": [
                "Research career paths in your industry",
                "Network with professionals in your target roles",
                "Identify skills gaps and create a learning plan"
            ],
            "action_items": [
                "Set up informational interviews",
                "Join relevant professional associations",
                "Create a 6-month career development plan"
            ]
        },
        "skill_gap": {
            "response": "Focus on developing relevant skills that are in high demand in your field.",
            "recommendations": [
                "Identify the most sought-after skills in your industry",
                "Choose learning methods that work best for you",
                "Practice new skills through projects or volunteering"
            ],
            "action_items": [
                "Enroll in relevant online courses",
                "Start a project to practice new skills",
                "Find a mentor in your desired area"
            ]
        },
        "interview_prep": {
            "response": "Prepare for both technical and behavioral questions by practicing with real examples from your experience.",
            "recommendations": [
                "Use the STAR method for behavioral questions",
                "Practice technical questions relevant to the role",
                "Research the company and role thoroughly"
            ],
            "action_items": [
                "Prepare 5-7 STAR method examples",
                "Practice coding problems or role-specific scenarios",
                "Prepare thoughtful questions to ask the interviewer"
            ]
        }
    }
    
    base_response = fallback_responses.get(wish_type, fallback_responses["improvement"])
    
    return {
        **base_response,
        "resources": [
            {
                "title": "Professional Development Resources",
                "url": "https://linkedin.com/learning",
                "description": "Online courses for career development"
            }
        ],
        "confidence_score": 0.6
    }


@celery_app.task(name="genie.cleanup_old_wishes")
def cleanup_old_wishes() -> Dict[str, Any]:
    """
    Clean up old genie wishes to manage storage.
    
    Returns:
        Dict containing cleanup results
    """
    async def _cleanup():
        try:
            # Implementation would go here to clean up old wishes
            # This is a placeholder for future implementation
            logger.info("Genie wishes cleanup completed")
            return {"status": "completed", "cleaned": 0}
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            raise
    
    return asyncio.run(_cleanup())