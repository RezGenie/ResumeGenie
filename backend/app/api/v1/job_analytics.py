"""
Job Comparison Analytics API Endpoints
Advanced analytics and insights for job comparison data.
"""

from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from datetime import datetime, timedelta
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.job_comparison import JobComparison

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/analytics/overview")
async def get_comparison_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = Query(30, description="Number of days to analyze", ge=1, le=365)
):
    """
    Get comprehensive analytics overview for user's job comparisons.
    
    - **days**: Number of days to include in analysis (default: 30)
    
    Returns detailed analytics including:
    - Overall performance trends
    - Industry analysis
    - Skill gap patterns
    - Success rate metrics
    """
    try:
        logger.info(f"Analytics overview requested by user: {current_user.email}")
        
        # Date range for analysis
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get user's comparisons within date range
        query = select(JobComparison).where(
            and_(
                JobComparison.user_id == current_user.id,
                JobComparison.created_at >= start_date,
                JobComparison.is_processed.is_(True)
            )
        ).order_by(desc(JobComparison.created_at))
        
        result = await db.execute(query)
        comparisons = result.scalars().all()
        
        if not comparisons:
            return {
                "message": "No processed comparisons found in the specified time period",
                "period_days": days,
                "total_comparisons": 0
            }
        
        # Calculate analytics
        analytics = await _calculate_comprehensive_analytics(comparisons)
        
        # Add period information
        analytics["analysis_period"] = {
            "days": days,
            "start_date": start_date.isoformat(),
            "end_date": datetime.utcnow().isoformat(),
            "total_comparisons": len(comparisons)
        }
        
        return analytics
        
    except Exception as e:
        logger.error(f"Analytics overview error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate analytics overview"
        )


@router.get("/analytics/trends")
async def get_comparison_trends(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = Query(90, description="Number of days for trend analysis", ge=7, le=365)
):
    """
    Get trend analysis for job comparison performance over time.
    
    - **days**: Number of days to analyze trends (default: 90)
    
    Returns time-series data showing:
    - Score trends over time
    - Application success patterns
    - Skill development progress
    - Industry focus evolution
    """
    try:
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get comparisons with time series data
        query = select(JobComparison).where(
            and_(
                JobComparison.user_id == current_user.id,
                JobComparison.created_at >= start_date,
                JobComparison.is_processed.is_(True)
            )
        ).order_by(JobComparison.created_at)
        
        result = await db.execute(query)
        comparisons = result.scalars().all()
        
        if not comparisons:
            return {"message": "Insufficient data for trend analysis"}
        
        # Generate trend data
        trends = _generate_trend_analysis(comparisons, days)
        
        return trends
        
    except Exception as e:
        logger.error(f"Trend analysis error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate trend analysis"
        )


@router.get("/analytics/skills")
async def get_skill_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    industry: Optional[str] = Query(None, description="Filter by industry")
):
    """
    Get detailed skill analytics from job comparisons.
    
    - **industry**: Optional industry filter
    
    Returns comprehensive skill analysis:
    - Most in-demand skills
    - Skill gaps frequency
    - Learning recommendations
    - Market trend insights
    """
    try:
        # Get user's comparisons
        base_query = select(JobComparison).where(
            and_(
                JobComparison.user_id == current_user.id,
                JobComparison.is_processed.is_(True)
            )
        )
        
        # Apply industry filter if provided (would need industry detection logic)
        if industry:
            # This would need industry classification in the database
            # For now, we'll search in job descriptions and company names
            base_query = base_query.where(
                JobComparison.job_description.ilike(f"%{industry}%") |
                JobComparison.company_name.ilike(f"%{industry}%")
            )
        
        result = await db.execute(base_query)
        comparisons = result.scalars().all()
        
        if not comparisons:
            return {"message": "No comparisons found for skill analysis"}
        
        # Generate skill analytics
        skill_analytics = await _generate_skill_analytics(comparisons, industry)
        
        return skill_analytics
        
    except Exception as e:
        logger.error(f"Skill analytics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate skill analytics"
        )


@router.get("/analytics/recommendations")
async def get_personalized_recommendations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get personalized recommendations based on comparison history.
    
    Returns AI-powered recommendations:
    - Career development suggestions
    - Skill learning priorities  
    - Industry insights
    - Application strategy tips
    """
    try:
        # Get recent comparisons for recommendation analysis
        query = select(JobComparison).where(
            and_(
                JobComparison.user_id == current_user.id,
                JobComparison.is_processed.is_(True)
            )
        ).order_by(desc(JobComparison.created_at)).limit(50)
        
        result = await db.execute(query)
        comparisons = result.scalars().all()
        
        if not comparisons:
            return {"message": "No comparison history available for recommendations"}
        
        # Generate personalized recommendations
        recommendations = await _generate_personalized_recommendations(
            comparisons, current_user, db
        )
        
        return recommendations
        
    except Exception as e:
        logger.error(f"Personalized recommendations error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate recommendations"
        )


async def _calculate_comprehensive_analytics(comparisons: List[JobComparison]) -> Dict[str, Any]:
    """Calculate comprehensive analytics from comparison data."""
    
    # Basic metrics
    total_comparisons = len(comparisons)
    scores = [c.overall_match_score for c in comparisons if c.overall_match_score is not None]
    
    if not scores:
        return {"error": "No valid scores found"}
    
    avg_score = sum(scores) / len(scores)
    best_score = max(scores)
    
    # Score distribution
    excellent_matches = len([s for s in scores if s > 0.8])
    good_matches = len([s for s in scores if 0.6 < s <= 0.8])
    fair_matches = len([s for s in scores if 0.4 < s <= 0.6])
    poor_matches = len([s for s in scores if s <= 0.4])
    
    # Company analysis
    companies = [c.company_name for c in comparisons if c.company_name]
    unique_companies = len(set(companies))
    
    # Location analysis
    locations = [c.location for c in comparisons if c.location]
    unique_locations = len(set(locations))
    
    # Success rate estimation
    high_match_rate = (excellent_matches + good_matches) / total_comparisons * 100
    
    return {
        "performance_summary": {
            "total_applications_analyzed": total_comparisons,
            "average_match_score": round(avg_score, 3),
            "best_match_score": round(best_score, 3),
            "success_rate_estimate": round(high_match_rate, 1),
            "unique_companies": unique_companies,
            "unique_locations": unique_locations
        },
        "score_distribution": {
            "excellent_matches": excellent_matches,
            "good_matches": good_matches,
            "fair_matches": fair_matches,
            "poor_matches": poor_matches,
            "distribution_percentages": {
                "excellent": round(excellent_matches / total_comparisons * 100, 1),
                "good": round(good_matches / total_comparisons * 100, 1),
                "fair": round(fair_matches / total_comparisons * 100, 1),
                "poor": round(poor_matches / total_comparisons * 100, 1)
            }
        },
        "market_insights": {
            "most_targeted_companies": _get_top_companies(companies),
            "preferred_locations": _get_top_locations(locations),
            "application_velocity": round(total_comparisons / 30, 1),  # per day estimate
            "diversification_score": min(100, (unique_companies / total_comparisons) * 100)
        }
    }


def _generate_trend_analysis(comparisons: List[JobComparison], days: int) -> Dict[str, Any]:
    """Generate trend analysis from comparison data."""
    
    # Group comparisons by week
    weeks = {}
    for comparison in comparisons:
        week_key = comparison.created_at.strftime("%Y-W%U")
        if week_key not in weeks:
            weeks[week_key] = []
        weeks[week_key].append(comparison)
    
    # Calculate weekly trends
    weekly_data = []
    for week, week_comparisons in sorted(weeks.items()):
        scores = [c.overall_match_score for c in week_comparisons if c.overall_match_score]
        if scores:
            weekly_data.append({
                "week": week,
                "comparison_count": len(week_comparisons),
                "average_score": round(sum(scores) / len(scores), 3),
                "best_score": round(max(scores), 3),
                "companies": len(set(c.company_name for c in week_comparisons if c.company_name))
            })
    
    # Calculate improvement trend
    if len(weekly_data) >= 2:
        recent_avg = sum(w["average_score"] for w in weekly_data[-2:]) / 2
        earlier_avg = sum(w["average_score"] for w in weekly_data[:2]) / 2
        improvement = recent_avg - earlier_avg
        
        trend_direction = "improving" if improvement > 0.05 else "declining" if improvement < -0.05 else "stable"
    else:
        trend_direction = "insufficient_data"
        improvement = 0
    
    return {
        "trend_analysis": {
            "direction": trend_direction,
            "improvement_amount": round(improvement, 3),
            "total_weeks": len(weekly_data),
            "analysis_period_days": days
        },
        "weekly_performance": weekly_data,
        "insights": {
            "most_active_week": max(weekly_data, key=lambda x: x["comparison_count"])["week"] if weekly_data else None,
            "best_performance_week": max(weekly_data, key=lambda x: x["average_score"])["week"] if weekly_data else None,
            "consistency_score": _calculate_consistency_score([w["average_score"] for w in weekly_data])
        }
    }


async def _generate_skill_analytics(comparisons: List[JobComparison], industry: Optional[str]) -> Dict[str, Any]:
    """Generate skill analytics from comparison data."""
    
    # This would analyze the analysis_results JSON field if available
    # For now, we'll provide a structured response based on available data
    
    all_skills_mentioned = []
    all_missing_skills = []
    
    for comparison in comparisons:
        if comparison.missing_skills:
            all_missing_skills.extend(comparison.missing_skills)
        
        # Extract skills from job descriptions (simplified)
        job_text = comparison.job_description.lower() if comparison.job_description else ""
        common_skills = ["python", "javascript", "react", "sql", "aws", "docker", "kubernetes", 
                        "agile", "git", "html", "css", "java", "node", "angular", "vue"]
        
        for skill in common_skills:
            if skill in job_text:
                all_skills_mentioned.append(skill)
    
    # Count skill frequencies
    from collections import Counter
    skill_demand = Counter(all_skills_mentioned)
    skill_gaps = Counter(all_missing_skills)
    
    return {
        "skill_market_analysis": {
            "most_in_demand": [
                {"skill": skill, "frequency": count, "percentage": round(count/len(comparisons)*100, 1)}
                for skill, count in skill_demand.most_common(10)
            ],
            "common_skill_gaps": [
                {"skill": skill, "gap_frequency": count, "priority": "high" if count > len(comparisons) * 0.3 else "medium"}
                for skill, count in skill_gaps.most_common(10)
            ],
            "industry_focus": industry or "general",
            "total_comparisons_analyzed": len(comparisons)
        },
        "learning_recommendations": {
            "priority_skills": [skill for skill, _ in skill_gaps.most_common(5)],
            "market_trending": ["python", "react", "aws", "kubernetes", "docker"],  # Would be dynamic
            "estimated_learning_time": "2-4 months for top 3 priority skills"
        }
    }


async def _generate_personalized_recommendations(
    comparisons: List[JobComparison], 
    user: User, 
    db: AsyncSession
) -> Dict[str, Any]:
    """Generate personalized recommendations based on user's comparison history."""
    
    scores = [c.overall_match_score for c in comparisons if c.overall_match_score]
    avg_score = sum(scores) / len(scores) if scores else 0.5
    
    recommendations = []
    
    # Score-based recommendations
    if avg_score < 0.6:
        recommendations.append({
            "type": "improvement",
            "priority": "high",
            "title": "Focus on Skill Development",
            "description": "Your average match score suggests focusing on core skill development",
            "action_items": [
                "Identify the top 3 most frequently missing skills",
                "Complete online courses in these areas",
                "Build portfolio projects to demonstrate competency"
            ]
        })
    
    # Company diversity recommendations
    companies = [c.company_name for c in comparisons if c.company_name]
    unique_companies = len(set(companies))
    
    if len(comparisons) > 10 and unique_companies < len(comparisons) * 0.5:
        recommendations.append({
            "type": "strategy",
            "priority": "medium",
            "title": "Diversify Your Applications",
            "description": "Consider applying to a wider variety of companies and roles",
            "action_items": [
                "Explore companies in adjacent industries",
                "Consider remote opportunities",
                "Look into startup vs enterprise opportunities"
            ]
        })
    
    # Performance trend recommendations
    if len(scores) >= 5:
        recent_avg = sum(scores[-5:]) / 5
        if recent_avg > avg_score:
            recommendations.append({
                "type": "positive",
                "priority": "low",
                "title": "Great Progress!",
                "description": "Your recent applications show improving match scores",
                "action_items": [
                    "Continue current learning trajectory",
                    "Apply to more challenging positions",
                    "Consider negotiating better compensation"
                ]
            })
    
    return {
        "personalized_insights": {
            "user_profile": {
                "experience_level": "mid",  # Would be determined from resume analysis
                "primary_skills": ["programming", "analysis"],  # From resume
                "target_industries": _get_top_industries(comparisons),
            },
            "performance_assessment": {
                "current_competitiveness": "good" if avg_score > 0.7 else "developing",
                "improvement_areas": ["technical skills", "experience alignment"],
                "strengths": ["education background", "relevant experience"]
            }
        },
        "action_plan": recommendations,
        "success_probability": {
            "current_estimate": min(100, int(avg_score * 100 + 10)),
            "with_improvements": min(100, int(avg_score * 100 + 30)),
            "timeline": "3-6 months with focused development"
        }
    }


def _get_top_companies(companies: List[str]) -> List[Dict[str, Any]]:
    """Get top companies from comparison history."""
    from collections import Counter
    company_counts = Counter(companies)
    return [
        {"company": company, "applications": count}
        for company, count in company_counts.most_common(5)
    ]


def _get_top_locations(locations: List[str]) -> List[Dict[str, Any]]:
    """Get top locations from comparison history."""
    from collections import Counter
    location_counts = Counter(locations)
    return [
        {"location": location, "applications": count}
        for location, count in location_counts.most_common(5)
    ]


def _get_top_industries(comparisons: List[JobComparison]) -> List[str]:
    """Extract top industries from job descriptions."""
    # Simplified industry detection
    tech_keywords = ["software", "technology", "programming", "development"]
    finance_keywords = ["finance", "banking", "investment", "financial"]
    healthcare_keywords = ["healthcare", "medical", "hospital", "clinical"]
    
    industries = []
    for comparison in comparisons:
        job_text = comparison.job_description.lower() if comparison.job_description else ""
        company_text = comparison.company_name.lower() if comparison.company_name else ""
        text = f"{job_text} {company_text}"
        
        if any(keyword in text for keyword in tech_keywords):
            industries.append("technology")
        elif any(keyword in text for keyword in finance_keywords):
            industries.append("finance")
        elif any(keyword in text for keyword in healthcare_keywords):
            industries.append("healthcare")
        else:
            industries.append("general")
    
    from collections import Counter
    industry_counts = Counter(industries)
    return [industry for industry, _ in industry_counts.most_common(3)]


def _calculate_consistency_score(scores: List[float]) -> float:
    """Calculate consistency score based on score variance."""
    if len(scores) < 2:
        return 100.0
    
    import statistics
    variance = statistics.variance(scores)
    # Convert variance to consistency percentage (lower variance = higher consistency)
    consistency = max(0, 100 - (variance * 1000))
    return round(consistency, 1)