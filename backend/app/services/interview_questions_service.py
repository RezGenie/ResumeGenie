"""
Service for generating interview questions based on resume and job description
"""

import json
import logging
from typing import Optional, Dict, Any, List
from app.services.openai_service import openai_service

logger = logging.getLogger(__name__)


async def generate_interview_questions(
    resume_text: str,
    job_description: str,
    num_questions: int = 5,
    difficulty_levels: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Generate interview questions based on resume and job description.
    
    Args:
        resume_text: The candidate's resume text
        job_description: The job description/posting
        num_questions: Number of questions to generate (default: 5)
        difficulty_levels: List of difficulty levels to include (easy, medium, hard)
    
    Returns:
        Dict with generated questions and metadata
    """
    if not difficulty_levels:
        difficulty_levels = ["easy", "medium", "hard"]
    
    system_prompt = (
        "You are an expert hiring manager and interview coach. Your task is to generate "
        "realistic interview questions that a hiring manager would ask based on a candidate's "
        "resume and the job description. Each question should be thoughtful, relevant, and help "
        "assess the candidate's fit for the role."
    )
    
    user_prompt = f"""
Based on the following resume and job description, generate {num_questions} interview questions.

RESUME:
{resume_text[:3000]}

JOB DESCRIPTION:
{job_description[:2000]}

Generate questions with a mix of difficulty levels: {', '.join(difficulty_levels)}.

Return a JSON object with this structure:
{{
    "questions": [
        {{
            "question": "What is the question?",
            "difficulty": "easy|medium|hard",
            "category": "technical|behavioral|situational|background",
            "sampleResponse": "A concise, 2-3 sentence sample response that demonstrates good answer structure",
            "followUp": "Optional follow-up question to go deeper"
        }},
        ...
    ],
    "totalQuestions": {num_questions},
    "generatedAt": "ISO timestamp"
}}

Make the questions specific to the role and resume, not generic. Each sample response should be realistic and demonstrate good interview technique.
"""
    
    try:
        logger.info(f"Generating {num_questions} interview questions")
        
        ai_response = await openai_service.get_chat_completion(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.7,
            max_tokens=2500,
        )
        
        # Parse the response
        cleaned_response = ai_response.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        elif cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]
        
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]
        
        cleaned_response = cleaned_response.strip()
        questions_data = json.loads(cleaned_response)
        
        logger.info(f"Successfully generated {len(questions_data.get('questions', []))} questions")
        
        return {
            "success": True,
            "questions": questions_data.get("questions", []),
            "totalQuestions": questions_data.get("totalQuestions", len(questions_data.get("questions", []))),
            "generatedAt": questions_data.get("generatedAt"),
        }
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        return {
            "success": False,
            "error": "Failed to parse generated questions",
            "questions": [],
        }
    except Exception as e:
        logger.error(f"Error generating interview questions: {e}")
        return {
            "success": False,
            "error": str(e),
            "questions": [],
        }
