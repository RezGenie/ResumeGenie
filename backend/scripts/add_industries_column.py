#!/usr/bin/env python3
"""
Add industries column to user_preferences table
"""

import asyncio
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import get_db


async def add_industries_column():
    """Add industries column if it doesn't exist"""
    async for db in get_db():
        try:
            # Check if column exists
            check_sql = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='user_preferences' 
                AND column_name='industries'
            """)
            
            result = await db.execute(check_sql)
            exists = result.fetchone()
            
            if exists:
                print("✅ Industries column already exists!")
            else:
                # Add column
                add_sql = text("""
                    ALTER TABLE user_preferences 
                    ADD COLUMN industries JSONB DEFAULT '[]'
                """)
                
                await db.execute(add_sql)
                await db.commit()
                
                print("✅ Successfully added industries column!")
            
            break
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            raise


if __name__ == "__main__":
    asyncio.run(add_industries_column())
