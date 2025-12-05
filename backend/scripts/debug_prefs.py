#!/usr/bin/env python3
"""Debug user preferences - show exactly what's stored"""

import asyncio
import sys
import json
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.core.database import get_db
from app.models.user_preferences import UserPreferences
from sqlalchemy import select


async def debug_preferences():
    async for db in get_db():
        try:
            result = await db.execute(select(UserPreferences))
            prefs = result.scalars().all()
            
            print(f"\n{'='*60}")
            print(f"TOTAL USER PREFERENCES FOUND: {len(prefs)}")
            print(f"{'='*60}\n")
            
            for p in prefs:
                print(f"User ID: {p.user_id}")
                print(f"Skills: {p.skills}")
                print(f"Target Titles: {p.target_titles}")
                print(f"Location Pref: {p.location_pref}")
                print(f"Remote OK: {p.remote_ok}")
                print(f"Salary Min: {p.salary_min}")
                print(f"Blocked Companies: {p.blocked_companies}")
                print(f"Preferred Companies: {p.preferred_companies}")
                print(f"\nRAW JSON:")
                print(json.dumps({
                    "skills": p.skills,
                    "target_titles": p.target_titles,
                    "location_pref": p.location_pref,
                    "remote_ok": p.remote_ok,
                    "salary_min": p.salary_min
                }, indent=2))
                print(f"\n{'-'*60}\n")
            
            break
        except Exception as e:
            print(f"Error: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(debug_preferences())
