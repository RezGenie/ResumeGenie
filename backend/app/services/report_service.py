"""
Advanced Report Generation Service for RezGenie
Generates comprehensive text reports for missing skills analysis.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
from collections import Counter, defaultdict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import selectinload

from app.models.job_comparison import JobComparison
from app.services.enhanced_comparison_service import EnhancedComparisonService
from app.services.enhanced_cache_service import EnhancedCacheService


class ReportFormat(Enum):
    """Supported report formats."""
    DETAILED = "detailed"
    SUMMARY = "summary"
    EXECUTIVE = "executive"
    ACTION_ORIENTED = "action_oriented"


class SkillPriority(Enum):
    """Skill priority levels for learning recommendations."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class SkillGapInsight:
    """Represents a skill gap with comprehensive analysis."""
    skill: str
    frequency: int
    priority: SkillPriority
    industry_demand: float
    learning_time_weeks: int
    recommended_resources: List[str]
    salary_impact: Optional[str] = None
    job_match_improvement: Optional[float] = None


@dataclass
class ReportMetrics:
    """Comprehensive metrics for report generation."""
    total_applications: int
    avg_match_score: float
    improvement_potential: float
    time_period_days: int
    industries_analyzed: List[str]
    skill_gaps_identified: int
    critical_gaps: int
    learning_hours_estimated: int


class ReportService:
    """Advanced service for generating comprehensive missing skills reports."""
    
    def __init__(self):
        self.comparison_service = EnhancedComparisonService()
        self.cache_service = EnhancedCacheService()
        
        # Industry-specific skill weights
        self.industry_weights = {
            "technology": {
                "python": 0.9, "javascript": 0.8, "react": 0.8, "aws": 0.9,
                "docker": 0.7, "kubernetes": 0.8, "sql": 0.9, "git": 0.8
            },
            "finance": {
                "excel": 0.9, "sql": 0.8, "python": 0.7, "tableau": 0.8,
                "risk management": 0.9, "compliance": 0.8
            },
            "marketing": {
                "google analytics": 0.9, "seo": 0.8, "social media": 0.7,
                "content marketing": 0.8, "ppc": 0.7
            },
            "healthcare": {
                "hipaa": 0.9, "clinical research": 0.8, "medical coding": 0.7,
                "patient care": 0.9
            }
        }
        
        # Learning time estimates (in weeks)
        self.learning_time_estimates = {
            "python": 8, "javascript": 6, "react": 4, "aws": 12,
            "docker": 3, "kubernetes": 8, "sql": 4, "git": 2,
            "excel": 2, "tableau": 4, "google analytics": 2,
            "seo": 6, "social media": 2, "content marketing": 4
        }

    async def generate_missing_skills_report(
        self,
        user_id: int,
        db: AsyncSession,
        report_format: ReportFormat = ReportFormat.DETAILED,
        days_back: int = 90,
        industry_filter: Optional[str] = None
    ) -> str:
        """
        Generate comprehensive missing skills text report.
        
        Args:
            user_id: User ID for report generation
            db: Database session
            report_format: Type of report to generate
            days_back: Number of days to analyze
            industry_filter: Optional industry filter
            
        Returns:
            Formatted text report
        """
        try:
            # Check cache first
            cache_key = f"skills_report:{user_id}:{report_format.value}:{days_back}:{industry_filter or 'all'}"
            cached_report = await self.cache_service.get(cache_key)
            if cached_report:
                return cached_report

            # Gather comprehensive data
            report_data = await self._gather_report_data(user_id, db, days_back, industry_filter)
            
            # Generate report based on format
            if report_format == ReportFormat.DETAILED:
                report = await self._generate_detailed_report(report_data)
            elif report_format == ReportFormat.SUMMARY:
                report = await self._generate_summary_report(report_data)
            elif report_format == ReportFormat.EXECUTIVE:
                report = await self._generate_executive_report(report_data)
            else:  # ACTION_ORIENTED
                report = await self._generate_action_oriented_report(report_data)
            
            # Cache the report
            await self.cache_service.set(cache_key, report, ttl=3600)  # 1 hour
            
            return report
            
        except Exception as e:
            return f"Error generating report: {str(e)}"

    async def _gather_report_data(
        self,
        user_id: int,
        db: AsyncSession,
        days_back: int,
        industry_filter: Optional[str]
    ) -> Dict[str, Any]:
        """Gather comprehensive data for report generation."""
        
        # Date range for analysis
        cutoff_date = datetime.now() - timedelta(days=days_back)
        
        # Build query for job comparisons
        query = select(JobComparison).where(
            and_(
                JobComparison.user_id == user_id,
                JobComparison.created_at >= cutoff_date,
                JobComparison.is_processed.is_(True)
            )
        ).options(selectinload(JobComparison.user))
        
        # Apply industry filter if provided
        if industry_filter:
            query = query.where(
                JobComparison.job_description.ilike(f"%{industry_filter}%")
            )
        
        result = await db.execute(query.order_by(desc(JobComparison.created_at)))
        comparisons = result.scalars().all()
        
        if not comparisons:
            return {"error": "No job comparisons found for analysis"}
        
        # Analyze missing skills
        skill_gaps = await self._analyze_comprehensive_skill_gaps(comparisons)
        
        # Calculate metrics
        metrics = self._calculate_report_metrics(comparisons, skill_gaps)
        
        # Generate insights
        insights = await self._generate_skill_insights(skill_gaps, metrics)
        
        # Industry analysis
        industry_breakdown = self._analyze_industry_breakdown(comparisons)
        
        # Trend analysis
        trends = self._analyze_skill_trends(comparisons)
        
        return {
            "comparisons": comparisons,
            "skill_gaps": skill_gaps,
            "metrics": metrics,
            "insights": insights,
            "industry_breakdown": industry_breakdown,
            "trends": trends,
            "user": comparisons[0].user if comparisons else None,
            "analysis_period": {
                "days": days_back,
                "start_date": cutoff_date.strftime("%B %d, %Y"),
                "end_date": datetime.now().strftime("%B %d, %Y")
            }
        }

    async def _analyze_comprehensive_skill_gaps(
        self, 
        comparisons: List[JobComparison]
    ) -> List[SkillGapInsight]:
        """Perform comprehensive analysis of skill gaps."""
        
        # Collect all missing skills
        all_missing_skills = []
        skill_contexts = defaultdict(list)
        
        for comparison in comparisons:
            if comparison.missing_skills:
                for skill in comparison.missing_skills:
                    all_missing_skills.append(skill.lower().strip())
                    skill_contexts[skill.lower().strip()].append({
                        "job_title": comparison.job_title,
                        "company": comparison.company_name,
                        "match_score": comparison.overall_match_score
                    })
        
        # Count frequencies
        skill_frequencies = Counter(all_missing_skills)
        
        # Generate insights for top skills
        insights = []
        for skill, frequency in skill_frequencies.most_common(20):
            priority = self._calculate_skill_priority(skill, frequency, len(comparisons))
            industry_demand = self._calculate_industry_demand(skill)
            learning_time = self.learning_time_estimates.get(skill, 4)  # Default 4 weeks
            resources = self._get_learning_resources(skill)
            
            # Calculate potential impact
            contexts = skill_contexts[skill]
            avg_match_score = sum(ctx["match_score"] or 0.5 for ctx in contexts) / len(contexts)
            potential_improvement = self._estimate_skill_impact(skill, frequency, avg_match_score)
            
            insights.append(SkillGapInsight(
                skill=skill.title(),
                frequency=frequency,
                priority=priority,
                industry_demand=industry_demand,
                learning_time_weeks=learning_time,
                recommended_resources=resources,
                job_match_improvement=potential_improvement
            ))
        
        return sorted(insights, key=lambda x: (x.priority.value, -x.frequency))

    def _calculate_skill_priority(
        self, 
        skill: str, 
        frequency: int, 
        total_comparisons: int
    ) -> SkillPriority:
        """Calculate priority level for a skill based on frequency and importance."""
        
        frequency_ratio = frequency / total_comparisons
        
        # Critical skills (appear in >70% of jobs)
        if frequency_ratio > 0.7:
            return SkillPriority.CRITICAL
        # High priority (appear in >40% of jobs)
        elif frequency_ratio > 0.4:
            return SkillPriority.HIGH
        # Medium priority (appear in >20% of jobs)
        elif frequency_ratio > 0.2:
            return SkillPriority.MEDIUM
        else:
            return SkillPriority.LOW

    def _calculate_industry_demand(self, skill: str) -> float:
        """Calculate industry demand score for a skill."""
        # This would ideally connect to job market APIs
        # For now, using predefined weights
        for industry, skills in self.industry_weights.items():
            if skill in skills:
                return skills[skill]
        return 0.5  # Default medium demand

    def _get_learning_resources(self, skill: str) -> List[str]:
        """Get recommended learning resources for a skill."""
        
        resource_map = {
            "python": [
                "Python.org Official Tutorial",
                "Codecademy Python Course",
                "Real Python (realpython.com)",
                "Python Crash Course (book)"
            ],
            "javascript": [
                "MDN JavaScript Guide",
                "JavaScript.info",
                "freeCodeCamp JavaScript Course",
                "Eloquent JavaScript (book)"
            ],
            "react": [
                "Official React Documentation",
                "React Tutorial on React.dev",
                "Scrimba React Course",
                "The Complete React Developer Course"
            ],
            "aws": [
                "AWS Free Tier Tutorials",
                "A Cloud Guru AWS Courses",
                "AWS Certified Solutions Architect Study Guide",
                "Linux Academy AWS Learning Paths"
            ],
            "sql": [
                "W3Schools SQL Tutorial",
                "SQLBolt Interactive Lessons",
                "Mode Analytics SQL Tutorial",
                "SQL in 10 Minutes (book)"
            ]
        }
        
        return resource_map.get(skill, [
            f"LinkedIn Learning: {skill.title()} Fundamentals",
            f"Coursera: {skill.title()} Specialization",
            f"Udemy: Complete {skill.title()} Course",
            f"YouTube: {skill.title()} Tutorial Playlist"
        ])

    def _estimate_skill_impact(
        self, 
        skill: str, 
        frequency: int, 
        current_avg_score: float
    ) -> float:
        """Estimate the potential improvement in match scores by learning this skill."""
        
        # Base improvement based on frequency
        base_improvement = min(0.15, frequency * 0.02)  # Max 15% improvement
        
        # Adjust based on current performance
        performance_multiplier = 1.0 - current_avg_score  # Lower scores = more room for improvement
        
        # Skill importance multiplier
        importance_multiplier = self._calculate_industry_demand(skill)
        
        return base_improvement * performance_multiplier * importance_multiplier

    def _calculate_report_metrics(
        self, 
        comparisons: List[JobComparison], 
        skill_gaps: List[SkillGapInsight]
    ) -> ReportMetrics:
        """Calculate comprehensive metrics for the report."""
        
        # Basic metrics
        total_applications = len(comparisons)
        match_scores = [c.overall_match_score for c in comparisons if c.overall_match_score]
        avg_match_score = sum(match_scores) / len(match_scores) if match_scores else 0.5
        
        # Calculate improvement potential
        critical_gaps = sum(1 for gap in skill_gaps if gap.priority == SkillPriority.CRITICAL)
        high_gaps = sum(1 for gap in skill_gaps if gap.priority == SkillPriority.HIGH)
        improvement_potential = min(0.3, (critical_gaps * 0.05) + (high_gaps * 0.03))
        
        # Industry analysis
        industries = []
        for comparison in comparisons:
            if comparison.job_description:
                # Simple industry detection (would be enhanced with ML)
                job_text = comparison.job_description.lower()
                if any(word in job_text for word in ["software", "developer", "engineer", "tech"]):
                    industries.append("Technology")
                elif any(word in job_text for word in ["finance", "bank", "investment"]):
                    industries.append("Finance")
                elif any(word in job_text for word in ["marketing", "sales", "advertising"]):
                    industries.append("Marketing")
        
        unique_industries = list(set(industries))
        
        # Learning time estimation
        total_learning_hours = sum(gap.learning_time_weeks * 10 for gap in skill_gaps[:10])  # Top 10 skills, 10 hours/week
        
        return ReportMetrics(
            total_applications=total_applications,
            avg_match_score=avg_match_score,
            improvement_potential=improvement_potential,
            time_period_days=90,  # Default
            industries_analyzed=unique_industries,
            skill_gaps_identified=len(skill_gaps),
            critical_gaps=critical_gaps,
            learning_hours_estimated=total_learning_hours
        )

    async def _generate_skill_insights(
        self, 
        skill_gaps: List[SkillGapInsight], 
        metrics: ReportMetrics
    ) -> Dict[str, Any]:
        """Generate actionable insights from skill gap analysis."""
        
        insights = {
            "quick_wins": [],
            "long_term_investments": [],
            "industry_specific": [],
            "career_advancement": []
        }
        
        # Quick wins (skills with high impact, low learning time)
        for gap in skill_gaps:
            if gap.learning_time_weeks <= 3 and gap.priority in [SkillPriority.CRITICAL, SkillPriority.HIGH]:
                insights["quick_wins"].append({
                    "skill": gap.skill,
                    "learning_time": f"{gap.learning_time_weeks} weeks",
                    "impact": "High",
                    "reason": f"Appears in {gap.frequency} job postings"
                })
        
        # Long-term investments
        for gap in skill_gaps:
            if gap.learning_time_weeks > 6 and gap.priority == SkillPriority.CRITICAL:
                insights["long_term_investments"].append({
                    "skill": gap.skill,
                    "learning_time": f"{gap.learning_time_weeks} weeks",
                    "impact": "Very High",
                    "reason": "Critical skill for career advancement"
                })
        
        return insights

    def _analyze_industry_breakdown(self, comparisons: List[JobComparison]) -> Dict[str, Any]:
        """Analyze skill gaps by industry."""
        
        industry_skills = defaultdict(lambda: defaultdict(int))
        
        for comparison in comparisons:
            # Simple industry detection
            industry = self._detect_industry(comparison.job_description or "")
            if comparison.missing_skills:
                for skill in comparison.missing_skills:
                    industry_skills[industry][skill.lower()] += 1
        
        return dict(industry_skills)

    def _detect_industry(self, job_description: str) -> str:
        """Simple industry detection from job description."""
        text = job_description.lower()
        
        if any(word in text for word in ["software", "developer", "engineer", "tech", "programming"]):
            return "Technology"
        elif any(word in text for word in ["finance", "bank", "investment", "trading"]):
            return "Finance"
        elif any(word in text for word in ["marketing", "sales", "advertising", "brand"]):
            return "Marketing"
        elif any(word in text for word in ["healthcare", "medical", "clinical", "hospital"]):
            return "Healthcare"
        else:
            return "General"

    def _analyze_skill_trends(self, comparisons: List[JobComparison]) -> Dict[str, Any]:
        """Analyze trends in skill requirements over time."""
        
        # Group comparisons by month
        monthly_skills = defaultdict(lambda: defaultdict(int))
        
        for comparison in comparisons:
            month_key = comparison.created_at.strftime("%Y-%m")
            if comparison.missing_skills:
                for skill in comparison.missing_skills:
                    monthly_skills[month_key][skill.lower()] += 1
        
        return dict(monthly_skills)

    async def _generate_detailed_report(self, data: Dict[str, Any]) -> str:
        """Generate detailed missing skills report."""
        
        if "error" in data:
            return f"Report Error: {data['error']}"
        
        report_lines = []
        
        # Header
        report_lines.extend([
            "=" * 80,
            "COMPREHENSIVE MISSING SKILLS ANALYSIS REPORT",
            "=" * 80,
            f"Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}",
            f"Analysis Period: {data['analysis_period']['start_date']} to {data['analysis_period']['end_date']}",
            f"User: {data['user'].full_name if data['user'] else 'Unknown'}",
            "",
        ])
        
        # Executive Summary
        metrics = data['metrics']
        report_lines.extend([
            "EXECUTIVE SUMMARY",
            "-" * 40,
            f"• Total Job Applications Analyzed: {metrics.total_applications}",
            f"• Average Match Score: {metrics.avg_match_score:.1%}",
            f"• Skill Gaps Identified: {metrics.skill_gaps_identified}",
            f"• Critical Skills Missing: {metrics.critical_gaps}",
            f"• Estimated Learning Time: {metrics.learning_hours_estimated} hours",
            f"• Potential Score Improvement: +{metrics.improvement_potential:.1%}",
            "",
        ])
        
        # Industries Analyzed
        if metrics.industries_analyzed:
            report_lines.extend([
                "INDUSTRIES ANALYZED",
                "-" * 40,
                ", ".join(metrics.industries_analyzed),
                "",
            ])
        
        # Critical Skills Section
        critical_skills = [gap for gap in data['skill_gaps'] if gap.priority == SkillPriority.CRITICAL]
        if critical_skills:
            report_lines.extend([
                "🚨 CRITICAL SKILLS GAPS (IMMEDIATE ATTENTION REQUIRED)",
                "-" * 60,
            ])
            
            for i, gap in enumerate(critical_skills[:5], 1):
                report_lines.extend([
                    f"{i}. {gap.skill.upper()}",
                    f"   └─ Missing from {gap.frequency} job applications ({gap.frequency/metrics.total_applications:.1%})",
                    f"   └─ Learning Time: {gap.learning_time_weeks} weeks",
                    f"   └─ Industry Demand: {gap.industry_demand:.1%}",
                    f"   └─ Potential Match Improvement: +{gap.job_match_improvement or 0:.1%}",
                    ""
                ])
            
            report_lines.append("")
        
        # High Priority Skills
        high_priority_skills = [gap for gap in data['skill_gaps'] if gap.priority == SkillPriority.HIGH]
        if high_priority_skills:
            report_lines.extend([
                "⚠️  HIGH PRIORITY SKILLS GAPS",
                "-" * 40,
            ])
            
            for gap in high_priority_skills[:8]:
                report_lines.append(
                    f"• {gap.skill} - Missing from {gap.frequency} applications "
                    f"({gap.learning_time_weeks} weeks to learn)"
                )
            
            report_lines.append("")
        
        # Quick Wins Section
        insights = data['insights']
        if insights['quick_wins']:
            report_lines.extend([
                "🎯 QUICK WINS (High Impact, Low Effort)",
                "-" * 40,
            ])
            
            for win in insights['quick_wins'][:3]:
                report_lines.extend([
                    f"✓ {win['skill']} ({win['learning_time']})",
                    f"  Impact: {win['impact']} - {win['reason']}",
                    ""
                ])
        
        # Learning Roadmap
        top_skills = data['skill_gaps'][:10]
        if top_skills:
            report_lines.extend([
                "📚 RECOMMENDED LEARNING ROADMAP",
                "-" * 40,
                "Phase 1 (Immediate - Next 4 weeks):",
            ])
            
            phase1_skills = [s for s in top_skills if s.learning_time_weeks <= 4 and s.priority == SkillPriority.CRITICAL]
            for skill in phase1_skills[:3]:
                report_lines.append(f"  • {skill.skill} ({skill.learning_time_weeks} weeks)")
            
            report_lines.extend([
                "",
                "Phase 2 (Short-term - Next 3 months):",
            ])
            
            phase2_skills = [s for s in top_skills if 4 < s.learning_time_weeks <= 8]
            for skill in phase2_skills[:3]:
                report_lines.append(f"  • {skill.skill} ({skill.learning_time_weeks} weeks)")
            
            report_lines.extend([
                "",
                "Phase 3 (Long-term - 3-6 months):",
            ])
            
            phase3_skills = [s for s in top_skills if s.learning_time_weeks > 8]
            for skill in phase3_skills[:2]:
                report_lines.append(f"  • {skill.skill} ({skill.learning_time_weeks} weeks)")
            
            report_lines.append("")
        
        # Detailed Learning Resources
        if top_skills:
            report_lines.extend([
                "🔗 LEARNING RESOURCES FOR TOP MISSING SKILLS",
                "-" * 50,
            ])
            
            for skill in top_skills[:5]:
                report_lines.extend([
                    f"{skill.skill.upper()}:",
                ])
                for resource in skill.recommended_resources:
                    report_lines.append(f"  • {resource}")
                report_lines.append("")
        
        # Industry-Specific Analysis
        industry_breakdown = data['industry_breakdown']
        if industry_breakdown:
            report_lines.extend([
                "🏢 INDUSTRY-SPECIFIC SKILL ANALYSIS",
                "-" * 40,
            ])
            
            for industry, skills in industry_breakdown.items():
                if skills:
                    top_industry_skills = sorted(skills.items(), key=lambda x: x[1], reverse=True)[:3]
                    report_lines.extend([
                        f"{industry.upper()}:",
                        "  Most requested missing skills:",
                    ])
                    for skill, count in top_industry_skills:
                        report_lines.append(f"    • {skill.title()} ({count} times)")
                    report_lines.append("")
        
        # Action Plan
        report_lines.extend([
            "📋 30-DAY ACTION PLAN",
            "-" * 30,
            "Week 1-2: Assessment & Planning",
            "  • Review this report with career advisor/mentor",
            "  • Choose 1-2 quick win skills to focus on",
            "  • Set up learning schedule and environment",
            "",
            "Week 3-4: Begin Learning",
            "  • Start with highest priority skill",
            "  • Complete foundational courses/tutorials",
            "  • Begin building practice projects",
            "",
            "Next Steps:",
            "  • Update resume with new skills as you learn them",
            "  • Apply to jobs that better match your evolving skillset",
            "  • Track progress and adjust learning plan monthly",
            "",
        ])
        
        # Footer
        report_lines.extend([
            "=" * 80,
            "Report generated by RezGenie Career Intelligence Platform",
            "For questions or personalized career coaching, contact support.",
            "=" * 80,
        ])
        
        return "\n".join(report_lines)

    async def _generate_summary_report(self, data: Dict[str, Any]) -> str:
        """Generate concise summary report."""
        
        if "error" in data:
            return f"Report Error: {data['error']}"
        
        metrics = data['metrics']
        top_gaps = data['skill_gaps'][:5]
        
        report = f"""
MISSING SKILLS SUMMARY REPORT
Generated: {datetime.now().strftime('%B %d, %Y')}

KEY METRICS:
• {metrics.total_applications} job applications analyzed
• {metrics.avg_match_score:.1%} average match score
• {metrics.critical_gaps} critical skills missing

TOP 5 MISSING SKILLS:
"""
        
        for i, gap in enumerate(top_gaps, 1):
            report += f"{i}. {gap.skill} - Missing from {gap.frequency} applications\n"
        
        report += f"""
IMMEDIATE ACTIONS:
• Focus on learning: {', '.join([gap.skill for gap in top_gaps[:3]])}
• Estimated learning time: {sum(gap.learning_time_weeks for gap in top_gaps[:3])} weeks
• Potential score improvement: +{metrics.improvement_potential:.1%}

Next steps: Review detailed report for comprehensive learning plan.
"""
        
        return report

    async def _generate_executive_report(self, data: Dict[str, Any]) -> str:
        """Generate executive-level summary report."""
        
        if "error" in data:
            return f"Report Error: {data['error']}"
        
        metrics = data['metrics']
        critical_gaps = [gap for gap in data['skill_gaps'] if gap.priority == SkillPriority.CRITICAL]
        
        return f"""
EXECUTIVE SKILLS GAP ANALYSIS
{datetime.now().strftime('%B %d, %Y')}

SITUATION:
Current job market compatibility: {metrics.avg_match_score:.1%}
Critical skill deficiencies identified: {metrics.critical_gaps}

OPPORTUNITY:
Potential match score improvement: +{metrics.improvement_potential:.1%}
Strategic skill investments required: {len(critical_gaps)} areas

RECOMMENDATION:
Prioritize: {', '.join([gap.skill for gap in critical_gaps[:3]])}
Timeline: {sum(gap.learning_time_weeks for gap in critical_gaps[:3])} weeks
ROI: Significant improvement in job application success rate

NEXT STEPS:
1. Approve skills development budget/timeline
2. Engage learning resources for priority skills
3. Monitor progress and adjust strategy quarterly
"""

    async def _generate_action_oriented_report(self, data: Dict[str, Any]) -> str:
        """Generate action-oriented report with specific next steps."""
        
        if "error" in data:
            return f"Report Error: {data['error']}"
        
        quick_wins = data['insights']['quick_wins'][:3]
        top_gaps = data['skill_gaps'][:5]
        
        report = f"""
ACTION-ORIENTED SKILLS DEVELOPMENT PLAN
Generated: {datetime.now().strftime('%B %d, %Y')}

🎯 THIS WEEK'S ACTIONS:
"""
        
        for i, win in enumerate(quick_wins, 1):
            report += f"{i}. Start learning {win['skill']} ({win['learning_time']})\n"
        
        report += """
📅 30-DAY SCHEDULE:
"""
        
        week = 1
        for gap in top_gaps:
            if gap.learning_time_weeks <= 4:
                report += f"Week {week}-{week + gap.learning_time_weeks - 1}: {gap.skill}\n"
                week += gap.learning_time_weeks
                if week > 4:
                    break
        
        report += """
✅ DAILY HABITS:
• Spend 1-2 hours on skill development
• Practice with real projects/examples
• Track progress in learning journal
• Apply new skills to current work when possible

🔄 WEEKLY REVIEW:
• Assess learning progress
• Adjust schedule if needed
• Update resume with new skills
• Look for opportunities to demonstrate new abilities

Success metrics: Complete 1 skill every 2-4 weeks, see improved application responses within 60 days.
"""
        
        return report

    async def generate_skills_comparison_report(
        self,
        user_id: int,
        db: AsyncSession,
        comparison_ids: List[int]
    ) -> str:
        """Generate comparative analysis across multiple job comparisons."""
        
        # Get specific comparisons
        query = select(JobComparison).where(
            and_(
                JobComparison.user_id == user_id,
                JobComparison.id.in_(comparison_ids)
            )
        )
        
        result = await db.execute(query)
        comparisons = result.scalars().all()
        
        if not comparisons:
            return "No comparisons found for analysis."
        
        # Analyze skill patterns across comparisons
        skill_patterns = {}
        for comparison in comparisons:
            job_key = f"{comparison.job_title} - {comparison.company_name}"
            skill_patterns[job_key] = {
                "missing_skills": comparison.missing_skills or [],
                "match_score": comparison.overall_match_score or 0,
                "job_title": comparison.job_title,
                "company": comparison.company_name
            }
        
        # Generate comparative report
        report = f"""
COMPARATIVE SKILLS ANALYSIS REPORT
Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
Comparing {len(comparisons)} job applications

JOB COMPARISON OVERVIEW:
"""
        
        for job_key, data in skill_patterns.items():
            report += f"""
{data['job_title']} at {data['company']}
  Match Score: {data['match_score']:.1%}
  Missing Skills: {', '.join(data['missing_skills'][:5]) if data['missing_skills'] else 'None identified'}

"""
        
        # Find common missing skills
        all_missing = []
        for data in skill_patterns.values():
            all_missing.extend(data['missing_skills'])
        
        common_missing = Counter(all_missing)
        
        if common_missing:
            report += """
COMMON SKILLS GAPS ACROSS POSITIONS:
"""
            for skill, count in common_missing.most_common(10):
                percentage = (count / len(comparisons)) * 100
                report += f"• {skill.title()} - Missing from {count}/{len(comparisons)} positions ({percentage:.0f}%)\n"
        
        report += """

STRATEGIC RECOMMENDATIONS:
1. Focus on skills missing from multiple positions for maximum impact
2. Prioritize skills that appear in higher-match-score positions
3. Consider industry-specific skill development based on company patterns

Next step: Use the detailed missing skills report for comprehensive learning plan.
"""
        
        return report