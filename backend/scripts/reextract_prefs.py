#!/usr/bin/env python3
"""
Re-extract preferences from resume with better AI prompt
"""

import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import get_db
from app.models.resume import Resume
from app.models.user_preferences import UserPreferences
from app.services.openai_service import openai_service
from sqlalchemy import select
import json
import re
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def reextract_preferences():
    """Re-extract preferences from resume with enhanced prompt"""
    
    async for db in get_db():
        try:
            # Get processed resume
            result = await db.execute(
                select(Resume).where(Resume.is_processed == True)
            )
            resume = result.scalars().first()
            
            if not resume:
                logger.error("No processed resume found")
                return
            
            logger.info(f"Found resume {resume.id} for user {resume.user_id}")
            logger.info(f"Resume text length: {len(resume.extracted_text)}")
            
            # Enhanced extraction prompt
            extraction_prompt = f"""Analyze this software developer resume and extract ALL relevant information:

1. ALL technical skills mentioned (programming languages, frameworks, tools, databases, cloud platforms, etc.)
2. ALL job titles/roles the person has held or would qualify for
3. Location preference (if mentioned)

Resume text:
{resume.extracted_text[:4000]}

Return ONLY a JSON object with this EXACT format (extract as many skills as you can find):
{{
    "skills": ["skill1", "skill2", "skill3", ...],
    "target_titles": ["title1", "title2", "title3", ...],
    "location": "location or null"
}}

Be thorough - extract ALL skills you find, not just the main ones!"""
            
            # Call OpenAI with enhanced prompt
            response = await openai_service.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are an expert resume analyzer. Extract ALL technical skills comprehensively. Return only valid JSON."},
                    {"role": "user", "content": extraction_prompt}
                ],
                temperature=0.2,
                max_tokens=1000
            )
            
            extracted_text = response.choices[0].message.content.strip()
            
            # Remove markdown code blocks if present
            extracted_text = re.sub(r'```json\s*|\s*```', '', extracted_text)
            
            logger.info(f"AI Response: {extracted_text}")
            
            # Parse JSON response
            extracted_data = json.loads(extracted_text)
            
            skills = extracted_data.get("skills", [])
            target_titles = extracted_data.get("target_titles", [])
            location = extracted_data.get("location")
            
            logger.info(f"\n{'='*60}")
            logger.info(f"EXTRACTED DATA:")
            logger.info(f"Skills ({len(skills)}): {skills}")
            logger.info(f"Target Titles ({len(target_titles)}): {target_titles}")
            logger.info(f"Location: {location}")
            logger.info(f"{'='*60}\n")
            
            # Get existing preferences
            pref_result = await db.execute(
                select(UserPreferences).where(UserPreferences.user_id == resume.user_id)
            )
            existing_prefs = pref_result.scalar_one_or_none()
            
            if existing_prefs:
                # Update with new data
                existing_prefs.skills = skills[:25]  # Max 25 skills
                existing_prefs.target_titles = target_titles[:5]  # Max 5 titles
                
                if location and location.lower() != "null" and not existing_prefs.location_pref:
                    existing_prefs.location_pref = location
                
                await db.commit()
                logger.info(f"✅ UPDATED preferences for user {resume.user_id}")
            else:
                # Create new
                new_prefs = UserPreferences(
                    user_id=resume.user_id,
                    skills=skills[:25],
                    target_titles=target_titles[:5],
                    location_pref=location if location and location.lower() != "null" else None,
                    remote_ok=True
                )
                db.add(new_prefs)
                await db.commit()
                logger.info(f"✅ CREATED new preferences for user {resume.user_id}")
            
            logger.info("\n🎉 SUCCESS! Preferences updated with comprehensive skills list!")
            
            break
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response: {e}")
            logger.error(f"Response was: {extracted_text}")
        except Exception as e:
            logger.error(f"Error: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(reextract_preferences())
