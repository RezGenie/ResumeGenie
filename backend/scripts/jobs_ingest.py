#!/usr/bin/env python3
"""
Job Data Ingestion Script
Manual script for ingesting job data from Adzuna API

Usage:
    python scripts/jobs_ingest.py                    # Default ingestion
    python scripts/jobs_ingest.py --queries "python developer" "data analyst"
    python scripts/jobs_ingest.py --pages 5 --dry-run
    python scripts/jobs_ingest.py --generate-embeddings
"""

import asyncio
import argparse
import logging
import sys
from pathlib import Path

# Add the backend directory to the path so we can import our modules
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Import after path setup
try:
    from app.core.config import settings
    from app.services.providers.adzuna import adzuna_provider
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure you're running this script from the backend directory")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('job_ingestion.log')
    ]
)

logger = logging.getLogger(__name__)


async def ingest_jobs(
    queries: list = None,
    pages_per_query: int = 3,
    dry_run: bool = False
) -> dict:
    """
    Ingest jobs from Adzuna API
    
    Args:
        queries: Custom list of search queries (uses defaults if None)
        pages_per_query: Number of pages to fetch per query
        dry_run: If True, only fetch and normalize data without saving
        
    Returns:
        Ingestion results summary
    """
    logger.info("Starting job ingestion process")
    
    if dry_run:
        logger.info("DRY RUN MODE - No data will be saved to database")
    
    try:
        if queries:
            # Use custom queries
            original_queries = adzuna_provider.seed_queries
            adzuna_provider.seed_queries = queries
            logger.info(f"Using custom queries: {queries}")
        
        if dry_run:
            # Dry run - fetch and normalize but don't save
            results = {}
            
            for query in adzuna_provider.seed_queries:
                logger.info(f"Dry run processing query: {query}")
                query_jobs = []
                
                for page in range(1, pages_per_query + 1):
                    try:
                        logger.info(f"Fetching page {page} for query '{query}'")
                        response = await adzuna_provider.fetch_jobs(what=query, page=page)
                        raw_jobs = response.get("results", [])
                        
                        if not raw_jobs:
                            logger.info(f"No more results for query '{query}' at page {page}")
                            break
                        
                        # Normalize jobs
                        for raw_job in raw_jobs:
                            try:
                                normalized = adzuna_provider.normalize_job_data(raw_job)
                                query_jobs.append(normalized)
                                logger.debug(f"Normalized job: {normalized['title']} at {normalized['company']}")
                            except Exception as e:
                                logger.error(f"Failed to normalize job: {e}")
                                continue
                        
                        # Rate limiting
                        await asyncio.sleep(1)
                        
                    except Exception as e:
                        logger.error(f"Failed to fetch page {page} for query '{query}': {e}")
                        continue
                
                results[query] = len(query_jobs)
                logger.info(f"Dry run found {len(query_jobs)} jobs for query '{query}'")
            
        else:
            # Real ingestion
            results = await adzuna_provider.ingest_all_seed_queries(pages_per_query)
        
        # Restore original queries if they were changed
        if queries:
            adzuna_provider.seed_queries = original_queries
        
        total_jobs = sum(results.values())
        logger.info(f"Ingestion complete. Total jobs: {total_jobs}")
        
        return {
            "success": True,
            "total_jobs": total_jobs,
            "results_by_query": results,
            "dry_run": dry_run
        }
        
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "dry_run": dry_run
        }


async def generate_embeddings(batch_size: int = 50) -> dict:
    """
    Generate embeddings for jobs that don't have them
    
    Args:
        batch_size: Number of jobs to process at once
        
    Returns:
        Processing results
    """
    logger.info("Starting embedding generation")
    
    try:
        from app.core.database import get_db
        
        processed_count = 0
        
        async for db in get_db():
            processed_count = await adzuna_provider.generate_embeddings(db, batch_size)
            break  # Exit the async generator
        
        logger.info(f"Generated embeddings for {processed_count} jobs")
        
        return {
            "success": True,
            "processed_count": processed_count
        }
        
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        return {
            "success": False,
            "error": str(e)
        }


async def test_connection() -> bool:
    """Test Adzuna API connection and configuration"""
    logger.info("Testing Adzuna API connection")
    
    try:
        if not settings.adzuna_app_id or not settings.adzuna_app_key:
            logger.error("Adzuna API credentials not configured. Set ADZUNA_APP_ID and ADZUNA_APP_KEY environment variables.")
            return False
        
        # Try fetching one job to test API
        response = await adzuna_provider.fetch_jobs(what="software engineer", page=1)
        
        if response.get("results"):
            logger.info(f"API connection successful. Found {len(response['results'])} jobs")
            return True
        else:
            logger.warning("API connection successful but no results returned")
            return True
            
    except Exception as e:
        logger.error(f"API connection test failed: {e}")
        return False


def main():
    """Main CLI interface"""
    parser = argparse.ArgumentParser(
        description="RezGenie Job Data Ingestion Script",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    # Default ingestion (3 pages per seed query)
    python scripts/jobs_ingest.py
    
    # Custom queries
    python scripts/jobs_ingest.py --queries "python developer" "react engineer"
    
    # More pages per query
    python scripts/jobs_ingest.py --pages 5
    
    # Dry run to test without saving
    python scripts/jobs_ingest.py --dry-run
    
    # Generate embeddings only
    python scripts/jobs_ingest.py --generate-embeddings
    
    # Test API connection
    python scripts/jobs_ingest.py --test-connection
        """
    )
    
    parser.add_argument(
        '--queries',
        nargs='+',
        help='Custom search queries (default: use seed queries)'
    )
    
    parser.add_argument(
        '--pages',
        type=int,
        default=3,
        help='Number of pages to fetch per query (default: 3)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Fetch and normalize data without saving to database'
    )
    
    parser.add_argument(
        '--generate-embeddings',
        action='store_true',
        help='Generate embeddings for existing jobs without them'
    )
    
    parser.add_argument(
        '--test-connection',
        action='store_true',
        help='Test API connection and exit'
    )
    
    parser.add_argument(
        '--batch-size',
        type=int,
        default=50,
        help='Batch size for embedding generation (default: 50)'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    async def run_script():
        # Test connection if requested
        if args.test_connection:
            success = await test_connection()
            return 0 if success else 1
        
        # Generate embeddings if requested
        if args.generate_embeddings:
            result = await generate_embeddings(args.batch_size)
            if result["success"]:
                print(f"✅ Generated embeddings for {result['processed_count']} jobs")
                return 0
            else:
                print(f"❌ Embedding generation failed: {result['error']}")
                return 1
        
        # Run job ingestion
        result = await ingest_jobs(
            queries=args.queries,
            pages_per_query=args.pages,
            dry_run=args.dry_run
        )
        
        if result["success"]:
            mode = "DRY RUN" if result["dry_run"] else "INGESTION"
            print(f"✅ {mode} SUCCESSFUL")
            print(f"Total jobs: {result['total_jobs']}")
            
            for query, count in result["results_by_query"].items():
                print(f"  {query}: {count} jobs")
            
            return 0
        else:
            mode = "Dry run" if result["dry_run"] else "Ingestion"
            print(f"❌ {mode} failed: {result['error']}")
            return 1
    
    # Run the script
    try:
        exit_code = asyncio.run(run_script())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        logger.info("Script interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Script failed with unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()