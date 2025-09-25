"""
Advanced Report Generation API for RezGenie
Provides comprehensive text reports for missing skills analysis.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from enum import Enum

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.services.report_service import ReportService, ReportFormat

router = APIRouter()


class ReportFormatEnum(str, Enum):
    """API enum for report formats."""
    detailed = "detailed"
    summary = "summary"
    executive = "executive"
    action_oriented = "action_oriented"


@router.get("/reports/missing-skills")
async def generate_missing_skills_report(
    format: ReportFormatEnum = Query(ReportFormatEnum.detailed, description="Report format type"),
    days_back: int = Query(90, ge=7, le=365, description="Number of days to analyze (7-365)"),
    industry_filter: Optional[str] = Query(None, description="Filter by industry (optional)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate comprehensive missing skills text report.
    
    This endpoint analyzes your job application history and generates detailed
    reports about missing skills, learning recommendations, and career guidance.
    
    - **format**: Type of report (detailed, summary, executive, action_oriented)
    - **days_back**: Number of days to analyze (default: 90 days)
    - **industry_filter**: Optional industry filter (e.g., "technology", "finance")
    
    Returns:
    - **detailed**: Comprehensive 5-10 page report with learning roadmap
    - **summary**: 1-page overview with key insights
    - **executive**: Brief strategic overview for decision makers
    - **action_oriented**: Focus on specific next steps and daily actions
    """
    try:
        report_service = ReportService()
        
        # Convert enum to ReportFormat
        report_format = ReportFormat(format.value)
        
        # Generate the report
        report_text = await report_service.generate_missing_skills_report(
            user_id=current_user.id,
            db=db,
            report_format=report_format,
            days_back=days_back,
            industry_filter=industry_filter
        )
        
        return {
            "success": True,
            "report": report_text,
            "metadata": {
                "format": format.value,
                "analysis_period_days": days_back,
                "industry_filter": industry_filter,
                "generated_at": report_service.cache_service._get_current_time().isoformat(),
                "user_id": current_user.id
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate missing skills report: {str(e)}"
        )


@router.get("/reports/skills-comparison")
async def generate_skills_comparison_report(
    comparison_ids: List[int] = Query(..., description="List of job comparison IDs to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate comparative skills analysis across multiple job applications.
    
    This endpoint compares missing skills patterns across specific job applications
    to identify common gaps and strategic learning priorities.
    
    - **comparison_ids**: List of job comparison IDs to analyze
    
    Returns comparative analysis showing:
    - Common skills missing across multiple positions
    - Position-specific skill requirements
    - Strategic recommendations for maximum impact
    """
    try:
        if not comparison_ids or len(comparison_ids) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least 2 comparison IDs are required for comparative analysis"
            )
        
        if len(comparison_ids) > 20:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum 20 comparisons allowed for analysis"
            )
        
        report_service = ReportService()
        
        # Generate comparative report
        report_text = await report_service.generate_skills_comparison_report(
            user_id=current_user.id,
            db=db,
            comparison_ids=comparison_ids
        )
        
        return {
            "success": True,
            "report": report_text,
            "metadata": {
                "comparison_count": len(comparison_ids),
                "comparison_ids": comparison_ids,
                "generated_at": report_service.cache_service._get_current_time().isoformat(),
                "user_id": current_user.id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate skills comparison report: {str(e)}"
        )


@router.get("/reports/export/{format}")
async def export_report(
    format: str,
    report_type: str = Query("missing-skills", description="Type of report to export"),
    days_back: int = Query(90, ge=7, le=365),
    industry_filter: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export report in different formats (future: PDF, DOCX).
    
    Currently supports text format, with plans for:
    - PDF exports with formatting
    - DOCX exports for editing
    - Email delivery options
    
    - **format**: Export format (currently only 'txt' supported)
    - **report_type**: Type of report to export
    - **days_back**: Analysis period in days
    - **industry_filter**: Optional industry filter
    """
    try:
        if format.lower() != "txt":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only 'txt' format is currently supported. PDF and DOCX coming soon!"
            )
        
        report_service = ReportService()
        
        # Generate the report
        if report_type == "missing-skills":
            report_text = await report_service.generate_missing_skills_report(
                user_id=current_user.id,
                db=db,
                report_format=ReportFormat.DETAILED,
                days_back=days_back,
                industry_filter=industry_filter
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid report type. Supported: 'missing-skills'"
            )
        
        # Return as downloadable content
        from fastapi.responses import PlainTextResponse
        
        filename = f"rezgenie-skills-report-{current_user.id}-{report_service.cache_service._get_current_time().strftime('%Y%m%d')}.txt"
        
        return PlainTextResponse(
            content=report_text,
            media_type="text/plain",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/plain; charset=utf-8"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export report: {str(e)}"
        )


@router.get("/reports/preview")
async def preview_report_structure(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Preview available report types and user's analysis capacity.
    
    Returns information about:
    - Available report formats
    - User's job comparison history summary
    - Estimated report contents and length
    - Analysis limitations or recommendations
    """
    try:
        from sqlalchemy import select, and_, func
        from app.models.job_comparison import JobComparison
        from datetime import datetime, timedelta
        
        # Get user's comparison statistics
        cutoff_date = datetime.now() - timedelta(days=90)
        
        query = select(func.count(JobComparison.id)).where(
            and_(
                JobComparison.user_id == current_user.id,
                JobComparison.created_at >= cutoff_date,
                JobComparison.is_processed.is_(True)
            )
        )
        
        result = await db.execute(query)
        comparison_count = result.scalar() or 0
        
        # Determine available analysis
        analysis_capacity = "full" if comparison_count >= 5 else "limited" if comparison_count >= 2 else "insufficient"
        
        return {
            "success": True,
            "user_analysis_summary": {
                "total_comparisons_last_90_days": comparison_count,
                "analysis_capacity": analysis_capacity,
                "recommendation": {
                    "full": "All report types available with comprehensive insights",
                    "limited": "Basic reports available, consider more job applications for deeper analysis",
                    "insufficient": "Need at least 2 job comparisons for meaningful analysis"
                }[analysis_capacity]
            },
            "available_report_formats": {
                "detailed": {
                    "description": "Comprehensive 5-10 page report with learning roadmap",
                    "estimated_length": "2500-4000 words",
                    "best_for": "In-depth career planning and skill development"
                },
                "summary": {
                    "description": "1-page overview with key insights",
                    "estimated_length": "300-500 words", 
                    "best_for": "Quick overview and immediate actions"
                },
                "executive": {
                    "description": "Brief strategic overview for decision makers",
                    "estimated_length": "200-300 words",
                    "best_for": "High-level strategic planning"
                },
                "action_oriented": {
                    "description": "Focus on specific next steps and daily actions",
                    "estimated_length": "400-600 words",
                    "best_for": "Implementation and daily practice"
                }
            },
            "sample_sections": [
                "Executive Summary",
                "Critical Skills Gaps",
                "Learning Roadmap (30/60/90 days)",
                "Industry-Specific Analysis", 
                "Resource Recommendations",
                "Action Plan with Timeline"
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report preview: {str(e)}"
        )