#!/usr/bin/env python3
"""
Job Quality Validation Script
Validates all jobs in database and reports quality metrics
"""
import asyncio
import sys
from pathlib import Path
from typing import Dict, List

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.job import Job
from app.services.job_validator import job_validator
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def validate_all_jobs() -> Dict:
    """Validate all jobs in database"""
    logger.info("🔍 Validating all jobs in database...")
    logger.info("=" * 60)
    
    results = {
        'total': 0,
        'valid': 0,
        'invalid': 0,
        'warnings': 0,
        'quality_scores': [],
        'inclusive_jobs': 0,
        'errors_by_type': {},
        'warnings_by_type': {}
    }
    
    async with AsyncSessionLocal() as db:
        # Get all jobs
        result = await db.execute(select(Job))
        jobs = result.scalars().all()
        
        results['total'] = len(jobs)
        logger.info(f"Found {len(jobs)} jobs to validate\n")
        
        for i, job in enumerate(jobs, 1):
            if i % 100 == 0:
                logger.info(f"Progress: {i}/{len(jobs)} jobs validated...")
            
            # Convert job to dict
            job_data = {
                'title': job.title,
                'company': job.company,
                'snippet': job.snippet,
                'redirect_url': job.redirect_url,
                'provider_job_id': job.provider_job_id,
                'location': job.location,
                'salary_min': job.salary_min,
                'salary_max': job.salary_max,
                'tags': job.tags,
                'posted_at': job.posted_at,
                'remote': job.remote
            }
            
            # Validate
            is_valid, errors, warnings = job_validator.validate_job(job_data)
            
            if is_valid:
                results['valid'] += 1
            else:
                results['invalid'] += 1
                # Track error types
                for error in errors:
                    error_type = error.split(':')[0] if ':' in error else error
                    results['errors_by_type'][error_type] = results['errors_by_type'].get(error_type, 0) + 1
            
            if warnings:
                results['warnings'] += 1
                # Track warning types
                for warning_type in warnings.keys():
                    results['warnings_by_type'][warning_type] = results['warnings_by_type'].get(warning_type, 0) + 1
            
            # Calculate quality score
            quality_score = job_validator.calculate_quality_score(job_data)
            results['quality_scores'].append(quality_score)
            
            # Check inclusivity
            if job_validator.is_inclusive_job(job_data):
                results['inclusive_jobs'] += 1
    
    return results


async def print_report(results: Dict) -> None:
    """Print validation report"""
    logger.info("\n" + "=" * 60)
    logger.info("📊 VALIDATION REPORT")
    logger.info("=" * 60)
    
    total = results['total']
    valid = results['valid']
    invalid = results['invalid']
    warnings = results['warnings']
    
    logger.info(f"\nTotal jobs: {total}")
    logger.info(f"Valid jobs: {valid} ({valid/total*100 if total > 0 else 0:.1f}%)")
    logger.info(f"Invalid jobs: {invalid} ({invalid/total*100 if total > 0 else 0:.1f}%)")
    logger.info(f"Jobs with warnings: {warnings} ({warnings/total*100 if total > 0 else 0:.1f}%)")
    
    # Quality scores
    if results['quality_scores']:
        avg_quality = sum(results['quality_scores']) / len(results['quality_scores'])
        min_quality = min(results['quality_scores'])
        max_quality = max(results['quality_scores'])
        
        logger.info(f"\nQuality Scores:")
        logger.info(f"  Average: {avg_quality:.1f}/100")
        logger.info(f"  Min: {min_quality:.1f}/100")
        logger.info(f"  Max: {max_quality:.1f}/100")
        
        # Quality distribution
        excellent = sum(1 for s in results['quality_scores'] if s >= 90)
        good = sum(1 for s in results['quality_scores'] if 70 <= s < 90)
        fair = sum(1 for s in results['quality_scores'] if 50 <= s < 70)
        poor = sum(1 for s in results['quality_scores'] if s < 50)
        
        logger.info(f"\nQuality Distribution:")
        logger.info(f"  Excellent (90-100): {excellent} ({excellent/total*100:.1f}%)")
        logger.info(f"  Good (70-89): {good} ({good/total*100:.1f}%)")
        logger.info(f"  Fair (50-69): {fair} ({fair/total*100:.1f}%)")
        logger.info(f"  Poor (<50): {poor} ({poor/total*100:.1f}%)")
    
    # Inclusivity
    inclusive = results['inclusive_jobs']
    logger.info(f"\nInclusive jobs: {inclusive} ({inclusive/total*100 if total > 0 else 0:.1f}%)")
    
    # Error types
    if results['errors_by_type']:
        logger.info(f"\nError Types:")
        for error_type, count in sorted(results['errors_by_type'].items(), key=lambda x: x[1], reverse=True):
            logger.info(f"  {error_type}: {count}")
    
    # Warning types
    if results['warnings_by_type']:
        logger.info(f"\nWarning Types:")
        for warning_type, count in sorted(results['warnings_by_type'].items(), key=lambda x: x[1], reverse=True):
            logger.info(f"  {warning_type}: {count}")
    
    # Recommendations
    logger.info("\n" + "=" * 60)
    logger.info("💡 RECOMMENDATIONS")
    logger.info("=" * 60)
    
    if invalid > 0:
        logger.info(f"🔴 {invalid} invalid jobs should be removed")
        logger.info("   → Run: python scripts/cleanup_jobs_database.py")
    
    if avg_quality < 70:
        logger.info("🟡 Average quality is below 70 - consider improving ingestion filters")
    
    if inclusive < total * 0.3:
        logger.info("🟡 Less than 30% of jobs show inclusive language")
        logger.info("   → Consider adding more diverse seed queries")
    
    if not results['errors_by_type'] and not results['warnings_by_type']:
        logger.info("✅ All jobs pass validation!")


async def main():
    """Main validation function"""
    logger.info("🧪 RezGenie Job Quality Validation")
    logger.info("=" * 60)
    
    try:
        results = await validate_all_jobs()
        await print_report(results)
        
        logger.info("\n" + "=" * 60)
        logger.info("✅ VALIDATION COMPLETE")
        logger.info("=" * 60)
        
        return 0
        
    except Exception as e:
        logger.error(f"❌ Validation failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
