#!/usr/bin/env python3
"""Check user preferences"""

import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import get_db
from app.models.user_preferences import UserPreferences
from sqlalchemy import select


async def check_preferences():
    async for db in get_db():
        try:
            result = await db.execute(select(UserPreferences))
            prefs = result.scalars().all()
            
            print(f"Total preference records: {len(prefs)}")
            
            for p in prefs:
                print(f"\n{'='*50}")
                print(f"User ID: {p.user_id}")
                print(f"Skills: {p.skills}")
                print(f"Target Titles: {p.target_titles}")
                print(f"Location: {p.location_pref}")
                print(f"Remote OK: {p.remote_ok}")
                print(f"Salary Min: {p.salary_min}")
                print(f"{'='*50}")
            
            break
        except Exception as e:
            print(f"Error: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(check_preferences())
