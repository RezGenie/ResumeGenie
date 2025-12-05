#!/usr/bin/env python3
"""
Backfill User Preferences from Existing Resumes
One-time script to create user preferences for users who uploaded resumes before auto-preference feature
"""

import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import get_db
from app.models.resume import Resume
from app.models.user_preferences import UserPreferences
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def backfill_user_preferences():
    """Create user preferences for all users with processed resumes but no preferences"""
    
    from app.celery.tasks.resume_processing import _create_user_preferences_from_resume
    
    async for db in get_db():
        try:
            # Find all processed resumes
            result = await db.execute(
                select(Resume).where(Resume.is_processed == True)
            )
            resumes = result.scalars().all()
            
            logger.info(f"Found {len(resumes)} processed resumes")
            
            created_count = 0
            updated_count = 0
            skipped_count = 0
            
            for resume in resumes:
                try:
                    # Check if user already has preferences
                    pref_result = await db.execute(
                        select(UserPreferences).where(UserPreferences.user_id == resume.user_id)
                    )
                    existing_pref = pref_result.scalar_one_or_none()
                    
                    if existing_pref:
                        logger.info(f"User {resume.user_id} already has preferences, skipping...")
                        skipped_count += 1
                        continue
                    
                    # Create preferences from resume
                    logger.info(f"Creating preferences for user {resume.user_id} from resume {resume.id}")
                    await _create_user_preferences_from_resume(resume, db)
                    created_count += 1
                    
                    logger.info(f"✅ Created preferences for user {resume.user_id}")
                    
                except Exception as e:
                    logger.error(f"Failed to create preferences for user {resume.user_id}: {e}")
                    continue
            
            logger.info(f"""
╔══════════════════════════════════════╗
║   Preference Backfill Complete!      ║
╠══════════════════════════════════════╣
║ Created: {created_count:4d}                        ║
║ Updated: {updated_count:4d}                        ║
║ Skipped: {skipped_count:4d}                        ║
╚══════════════════════════════════════╝
            """)
            
            break  # Exit the async generator
            
        except Exception as e:
            logger.error(f"Backfill failed: {e}")
            raise


if __name__ == "__main__":
    try:
        asyncio.run(backfill_user_preferences())
        print("\n✅ Successfully backfilled user preferences!")
        sys.exit(0)
    except KeyboardInterrupt:
        logger.info("Script interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Script failed: {e}")
        sys.exit(1)
