"""
Enhanced Job Comparison Service
Advanced resume-job matching with sophisticated algorithms and analytics.
"""

import re
import logging
from typing import Dict, List, Any, Optional
from collections import Counter
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
import spacy
from fuzzywuzzy import fuzz

from app.models.job_comparison import JobComparison
from app.models.resume import Resume

logger = logging.getLogger(__name__)

# Load spaCy model for enhanced NLP
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model not found. Advanced NLP features will be limited.")
    nlp = None


@dataclass
class SkillMatch:
    """Represents a skill match with confidence and context."""
    skill: str
    confidence: float
    match_type: str  # exact, fuzzy, synonym, hierarchy
    context: Optional[str] = None


@dataclass
class ComparisonMetrics:
    """Advanced comparison metrics and analytics."""
    overall_score: float
    skill_coverage: float
    experience_alignment: float
    education_match: float
    industry_fit: float
    role_level_match: float
    keyword_density: float
    ats_compatibility: float


class EnhancedComparisonService:
    """Advanced resume-job comparison service with enhanced algorithms."""
    
    # Industry-specific skill weights
    INDUSTRY_WEIGHTS = {
        "technology": {
            "technical_skills": 0.4,
            "programming_languages": 0.3,
            "frameworks": 0.2,
            "soft_skills": 0.1
        },
        "finance": {
            "analytical_skills": 0.35,
            "domain_knowledge": 0.3,
            "regulatory_knowledge": 0.2,
            "soft_skills": 0.15
        },
        "healthcare": {
            "clinical_skills": 0.4,
            "regulatory_compliance": 0.25,
            "patient_care": 0.2,
            "technical_skills": 0.15
        },
        "default": {
            "technical_skills": 0.3,
            "domain_knowledge": 0.25,
            "experience": 0.25,
            "soft_skills": 0.2
        }
    }
    
    # Skill synonyms and hierarchies
    SKILL_SYNONYMS = {
        "javascript": ["js", "ecmascript", "es6", "es2015"],
        "python": ["py", "python3", "python2"],
        "react": ["reactjs", "react.js", "reactnative"],
        "angular": ["angularjs", "angular2", "angular4", "angular8"],
        "database": ["db", "sql", "nosql", "rdbms"],
        "machine learning": ["ml", "artificial intelligence", "ai", "deep learning"],
        "project management": ["pm", "scrum", "agile", "kanban"],
        "data analysis": ["analytics", "data science", "business intelligence", "bi"]
    }
    
    # Role level indicators
    ROLE_LEVELS = {
        "entry": ["junior", "entry", "associate", "trainee", "intern"],
        "mid": ["mid", "intermediate", "regular", "standard"],
        "senior": ["senior", "sr", "lead", "principal", "staff"],
        "executive": ["director", "manager", "head", "chief", "vp", "vice president"]
    }
    
    def __init__(self):
        """Initialize the enhanced comparison service."""
        self._skill_cache = {}
        self._comparison_cache = {}
        
    async def perform_enhanced_comparison(
        self, 
        resume: Resume, 
        job_comparison: JobComparison,
        db: AsyncSession
    ) -> Dict[str, Any]:
        """
        Perform enhanced resume-job comparison with advanced algorithms.
        
        Args:
            resume: Resume object with extracted text
            job_comparison: JobComparison object
            db: Database session for analytics
            
        Returns:
            Enhanced comparison results with detailed metrics
        """
        try:
            logger.info(f"Starting enhanced comparison for job: {job_comparison.id}")
            
            # Extract and normalize text
            resume_text = self._normalize_text(resume.extracted_text)
            job_text = self._normalize_text(job_comparison.job_description)
            
            # Detect industry and role level
            industry = self._detect_industry(job_text, job_comparison.company_name)
            role_level = self._detect_role_level(job_comparison.job_title, job_text)
            
            # Perform advanced skill matching
            skill_analysis = await self._advanced_skill_matching(
                resume_text, job_text, industry
            )
            
            # Calculate enhanced scores
            metrics = await self._calculate_enhanced_metrics(
                resume_text, job_text, skill_analysis, industry, role_level
            )
            
            # Generate context-aware recommendations
            recommendations = await self._generate_enhanced_recommendations(
                skill_analysis, metrics, industry, role_level, db
            )
            
            # Build comprehensive result
            result = {
                "enhanced_metrics": {
                    "overall_score": metrics.overall_score,
                    "skill_coverage": metrics.skill_coverage,
                    "experience_alignment": metrics.experience_alignment,
                    "education_match": metrics.education_match,
                    "industry_fit": metrics.industry_fit,
                    "role_level_match": metrics.role_level_match,
                    "keyword_density": metrics.keyword_density,
                    "ats_compatibility": metrics.ats_compatibility
                },
                "skill_analysis": {
                    "exact_matches": [match.skill for match in skill_analysis["exact_matches"]],
                    "fuzzy_matches": [
                        {"skill": match.skill, "confidence": match.confidence} 
                        for match in skill_analysis["fuzzy_matches"]
                    ],
                    "missing_critical": skill_analysis["missing_critical"],
                    "missing_nice_to_have": skill_analysis["missing_nice_to_have"],
                    "skill_gaps": skill_analysis["skill_gaps"],
                    "transferable_skills": skill_analysis["transferable_skills"]
                },
                "context_analysis": {
                    "industry_detected": industry,
                    "role_level_detected": role_level,
                    "company_size_estimate": self._estimate_company_size(job_comparison.company_name),
                    "location_competitiveness": await self._analyze_location_competitiveness(
                        job_comparison.location, db
                    ),
                    "salary_competitiveness": self._analyze_salary_competitiveness(
                        job_comparison.salary_range, role_level, industry
                    )
                },
                "enhanced_recommendations": recommendations,
                "analytics": await self._generate_comparison_analytics(db, resume.user_id)
            }
            
            logger.info(f"Enhanced comparison completed with overall score: {metrics.overall_score:.3f}")
            return result
            
        except Exception as e:
            logger.error(f"Enhanced comparison failed: {e}")
            raise
    
    def _normalize_text(self, text: str) -> str:
        """Normalize text for better comparison."""
        if not text:
            return ""
        
        # Convert to lowercase and remove extra whitespace
        text = re.sub(r'\s+', ' ', text.lower().strip())
        
        # Remove special characters but keep essential punctuation
        text = re.sub(r'[^\w\s\.\,\;\:\-\+\#]', ' ', text)
        
        return text
    
    def _detect_industry(self, job_text: str, company_name: str) -> str:
        """Detect industry from job description and company name."""
        tech_keywords = [
            "software", "programming", "development", "code", "api", "database",
            "cloud", "devops", "frontend", "backend", "fullstack", "mobile"
        ]
        
        finance_keywords = [
            "finance", "banking", "investment", "trading", "financial", "accounting",
            "audit", "risk", "compliance", "portfolio", "asset", "hedge fund"
        ]
        
        healthcare_keywords = [
            "healthcare", "medical", "hospital", "clinical", "patient", "therapy",
            "pharmaceutical", "biotech", "nursing", "doctor", "physician"
        ]
        
        text_combined = f"{job_text} {company_name}".lower()
        
        tech_score = sum(1 for keyword in tech_keywords if keyword in text_combined)
        finance_score = sum(1 for keyword in finance_keywords if keyword in text_combined)
        healthcare_score = sum(1 for keyword in healthcare_keywords if keyword in text_combined)
        
        max_score = max(tech_score, finance_score, healthcare_score)
        
        if max_score == 0:
            return "default"
        elif max_score == tech_score:
            return "technology"
        elif max_score == finance_score:
            return "finance"
        else:
            return "healthcare"
    
    def _detect_role_level(self, job_title: str, job_text: str) -> str:
        """Detect role level from job title and description."""
        text_combined = f"{job_title} {job_text}".lower()
        
        for level, keywords in self.ROLE_LEVELS.items():
            if any(keyword in text_combined for keyword in keywords):
                return level
        
        # Default based on common patterns
        if any(word in text_combined for word in ["i", "1", "entry", "new"]):
            return "entry"
        elif any(word in text_combined for word in ["ii", "2", "intermediate"]):
            return "mid"
        elif any(word in text_combined for word in ["iii", "3", "senior", "lead"]):
            return "senior"
        else:
            return "mid"  # Default assumption
    
    async def _advanced_skill_matching(
        self, 
        resume_text: str, 
        job_text: str, 
        industry: str
    ) -> Dict[str, Any]:
        """Perform advanced skill matching with synonyms and fuzzy logic."""
        
        # Extract skills from job description
        job_skills = self._extract_skills(job_text)
        resume_skills = self._extract_skills(resume_text)
        
        # Categorize job skills by importance
        critical_skills = self._identify_critical_skills(job_text, job_skills)
        
        # Perform matching
        exact_matches = []
        fuzzy_matches = []
        missing_critical = []
        missing_nice_to_have = []
        
        for skill in job_skills:
            best_match = self._find_best_skill_match(skill, resume_skills)
            
            if best_match:
                if best_match["confidence"] >= 0.9:
                    exact_matches.append(SkillMatch(
                        skill=skill,
                        confidence=best_match["confidence"],
                        match_type="exact"
                    ))
                else:
                    fuzzy_matches.append(SkillMatch(
                        skill=skill,
                        confidence=best_match["confidence"],
                        match_type="fuzzy",
                        context=best_match["matched_skill"]
                    ))
            else:
                if skill in critical_skills:
                    missing_critical.append(skill)
                else:
                    missing_nice_to_have.append(skill)
        
        # Identify skill gaps and transferable skills
        skill_gaps = self._analyze_skill_gaps(missing_critical, industry)
        transferable_skills = self._identify_transferable_skills(resume_skills, job_skills)
        
        return {
            "exact_matches": exact_matches,
            "fuzzy_matches": fuzzy_matches,
            "missing_critical": missing_critical,
            "missing_nice_to_have": missing_nice_to_have,
            "skill_gaps": skill_gaps,
            "transferable_skills": transferable_skills
        }
    
    def _extract_skills(self, text: str) -> List[str]:
        """Extract skills from text using NLP and keyword matching."""
        skills = set()
        
        # Common technical skills pattern
        tech_patterns = [
            r'\b(?:python|java|javascript|react|angular|vue|node\.?js|express)\b',
            r'\b(?:sql|mysql|postgresql|mongodb|redis|elasticsearch)\b',
            r'\b(?:aws|azure|gcp|docker|kubernetes|jenkins|terraform)\b',
            r'\b(?:html|css|bootstrap|tailwind|sass|less)\b',
            r'\b(?:git|github|gitlab|bitbucket|jira|confluence)\b'
        ]
        
        # Extract using regex patterns
        for pattern in tech_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            skills.update([match.lower() for match in matches])
        
        # Use spaCy for entity recognition if available
        if nlp:
            doc = nlp(text)
            for ent in doc.ents:
                if ent.label_ in ["ORG", "PRODUCT", "LANGUAGE"]:
                    # Filter for likely skill terms
                    if len(ent.text) > 2 and not ent.text.isdigit():
                        skills.add(ent.text.lower())
        
        # Add synonym matching
        expanded_skills = set(skills)
        for skill in skills:
            if skill in self.SKILL_SYNONYMS:
                expanded_skills.update(self.SKILL_SYNONYMS[skill])
        
        return list(expanded_skills)
    
    def _identify_critical_skills(self, job_text: str, skills: List[str]) -> List[str]:
        """Identify critical skills based on context and frequency."""
        critical_indicators = [
            "required", "must have", "essential", "mandatory", "critical",
            "minimum", "key", "core", "fundamental", "necessary"
        ]
        
        critical_skills = []
        text_lower = job_text.lower()
        
        for skill in skills:
            # Check if skill appears near critical indicators
            skill_pattern = rf'\b{re.escape(skill)}\b'
            skill_matches = list(re.finditer(skill_pattern, text_lower, re.IGNORECASE))
            
            for match in skill_matches:
                start = max(0, match.start() - 50)
                end = min(len(text_lower), match.end() + 50)
                context = text_lower[start:end]
                
                if any(indicator in context for indicator in critical_indicators):
                    critical_skills.append(skill)
                    break
        
        return critical_skills
    
    def _find_best_skill_match(
        self, 
        target_skill: str, 
        candidate_skills: List[str]
    ) -> Optional[Dict[str, Any]]:
        """Find the best matching skill using fuzzy logic."""
        best_match = None
        best_score = 0
        
        for candidate in candidate_skills:
            # Exact match
            if target_skill.lower() == candidate.lower():
                return {"confidence": 1.0, "matched_skill": candidate}
            
            # Fuzzy match
            score = fuzz.ratio(target_skill.lower(), candidate.lower()) / 100.0
            
            # Synonym match
            if target_skill.lower() in self.SKILL_SYNONYMS:
                if candidate.lower() in self.SKILL_SYNONYMS[target_skill.lower()]:
                    score = max(score, 0.95)
            
            # Partial match for compound skills
            if target_skill.lower() in candidate.lower() or candidate.lower() in target_skill.lower():
                score = max(score, 0.8)
            
            if score > best_score and score >= 0.7:  # Minimum threshold
                best_score = score
                best_match = {"confidence": score, "matched_skill": candidate}
        
        return best_match
    
    def _analyze_skill_gaps(self, missing_skills: List[str], industry: str) -> List[Dict[str, Any]]:
        """Analyze skill gaps and provide learning recommendations."""
        skill_gaps = []
        
        for skill in missing_skills:
            gap_analysis = {
                "skill": skill,
                "priority": "high" if skill in self._get_high_demand_skills(industry) else "medium",
                "learning_resources": self._get_learning_resources(skill),
                "time_to_learn": self._estimate_learning_time(skill),
                "alternatives": self._get_skill_alternatives(skill)
            }
            skill_gaps.append(gap_analysis)
        
        return skill_gaps
    
    def _identify_transferable_skills(
        self, 
        resume_skills: List[str], 
        job_skills: List[str]
    ) -> List[Dict[str, Any]]:
        """Identify transferable skills that could be relevant."""
        transferable = []
        
        # Define skill categories and their transferability
        skill_categories = {
            "programming": ["python", "java", "javascript", "c++", "c#"],
            "databases": ["sql", "mysql", "postgresql", "mongodb", "redis"],
            "cloud": ["aws", "azure", "gcp", "docker", "kubernetes"],
            "frontend": ["react", "angular", "vue", "html", "css"],
            "management": ["agile", "scrum", "kanban", "project management"]
        }
        
        for resume_skill in resume_skills:
            if resume_skill not in job_skills:
                # Find category of resume skill
                for category, skills in skill_categories.items():
                    if resume_skill in skills:
                        # Check if job requires skills from same category
                        job_skills_in_category = [s for s in job_skills if s in skills]
                        if job_skills_in_category:
                            transferable.append({
                                "skill": resume_skill,
                                "category": category,
                                "relevance": "high",
                                "related_job_skills": job_skills_in_category
                            })
        
        return transferable
    
    async def _calculate_enhanced_metrics(
        self,
        resume_text: str,
        job_text: str,
        skill_analysis: Dict[str, Any],
        industry: str,
        role_level: str
    ) -> ComparisonMetrics:
        """Calculate enhanced comparison metrics."""
        
        # Skill coverage score
        total_skills = (
            len(skill_analysis["exact_matches"]) + 
            len(skill_analysis["fuzzy_matches"]) + 
            len(skill_analysis["missing_critical"]) + 
            len(skill_analysis["missing_nice_to_have"])
        )
        
        if total_skills > 0:
            matched_skills = len(skill_analysis["exact_matches"]) + len(skill_analysis["fuzzy_matches"])
            skill_coverage = matched_skills / total_skills
        else:
            skill_coverage = 0.5
        
        # Experience alignment (based on years and role level)
        experience_alignment = self._calculate_experience_alignment(
            resume_text, job_text, role_level
        )
        
        # Education match
        education_match = self._calculate_education_match(resume_text, job_text)
        
        # Industry fit
        industry_fit = self._calculate_industry_fit(resume_text, job_text, industry)
        
        # Role level match
        role_level_match = self._calculate_role_level_match(resume_text, role_level)
        
        # Keyword density
        keyword_density = self._calculate_keyword_density(resume_text, job_text)
        
        # ATS compatibility
        ats_compatibility = self._calculate_ats_compatibility(resume_text, job_text)
        
        # Calculate overall score with weighted components
        overall_score = (
            skill_coverage * 0.35 +
            experience_alignment * 0.25 +
            education_match * 0.15 +
            industry_fit * 0.1 +
            role_level_match * 0.1 +
            ats_compatibility * 0.05
        )
        
        return ComparisonMetrics(
            overall_score=min(1.0, overall_score),
            skill_coverage=skill_coverage,
            experience_alignment=experience_alignment,
            education_match=education_match,
            industry_fit=industry_fit,
            role_level_match=role_level_match,
            keyword_density=keyword_density,
            ats_compatibility=ats_compatibility
        )
    
    def _calculate_experience_alignment(
        self, 
        resume_text: str, 
        job_text: str, 
        role_level: str
    ) -> float:
        """Calculate experience alignment score."""
        # Extract years of experience from both texts
        resume_years = self._extract_years_experience(resume_text)
        job_years = self._extract_years_experience(job_text)
        
        # Default requirements by role level
        level_requirements = {
            "entry": (0, 2),
            "mid": (2, 5),
            "senior": (5, 10),
            "executive": (8, 15)
        }
        
        if job_years is None:
            job_years = level_requirements.get(role_level, (2, 5))
        
        if resume_years is None:
            return 0.5  # Neutral score if we can't determine experience
        
        # Calculate alignment based on experience range
        if isinstance(job_years, tuple):
            min_req, max_req = job_years
            if min_req <= resume_years <= max_req + 2:  # Allow slight overqualification
                return 1.0
            elif resume_years < min_req:
                return max(0.3, resume_years / min_req)
            else:  # Overqualified
                return max(0.7, 1.0 - (resume_years - max_req) * 0.1)
        else:
            # Single number requirement
            if abs(resume_years - job_years) <= 1:
                return 1.0
            else:
                return max(0.3, 1.0 - abs(resume_years - job_years) * 0.1)
    
    def _extract_years_experience(self, text: str) -> Optional[int]:
        """Extract years of experience from text."""
        patterns = [
            r'(\d+)[\+\-\s]*years?\s+of\s+experience',
            r'(\d+)[\+\-\s]*years?\s+experience',
            r'experience\s*:\s*(\d+)[\+\-\s]*years?',
            r'(\d+)[\+\-\s]*yrs?\s+experience'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text.lower())
            if matches:
                return int(matches[0])
        
        return None
    
    def _calculate_education_match(self, resume_text: str, job_text: str) -> float:
        """Calculate education requirement match."""
        education_levels = {
            "phd": 6, "doctorate": 6,
            "masters": 5, "master's": 5, "mba": 5,
            "bachelor": 4, "bachelor's": 4, "bs": 4, "ba": 4,
            "associate": 3, "associate's": 3,
            "diploma": 2, "certificate": 2,
            "high school": 1
        }
        
        # Extract education levels
        resume_edu = 0
        job_edu = 0
        
        for level, score in education_levels.items():
            if level in resume_text.lower():
                resume_edu = max(resume_edu, score)
            if level in job_text.lower():
                job_edu = max(job_edu, score)
        
        if job_edu == 0:
            return 0.8  # No specific requirement
        
        if resume_edu >= job_edu:
            return 1.0
        elif resume_edu == 0:
            return 0.3  # No education info
        else:
            return resume_edu / job_edu
    
    def _calculate_industry_fit(self, resume_text: str, job_text: str, industry: str) -> float:
        """Calculate industry-specific fit."""
        # This would be enhanced with industry-specific keyword analysis
        # For now, simplified implementation
        return 0.75  # Placeholder - would need industry-specific analysis
    
    def _calculate_role_level_match(self, resume_text: str, role_level: str) -> float:
        """Calculate role level alignment."""
        resume_level = self._detect_role_level("", resume_text)
        
        level_hierarchy = {"entry": 1, "mid": 2, "senior": 3, "executive": 4}
        
        resume_score = level_hierarchy.get(resume_level, 2)
        job_score = level_hierarchy.get(role_level, 2)
        
        if resume_score == job_score:
            return 1.0
        elif abs(resume_score - job_score) == 1:
            return 0.8
        else:
            return 0.5
    
    def _calculate_keyword_density(self, resume_text: str, job_text: str) -> float:
        """Calculate keyword density match."""
        job_keywords = self._extract_keywords(job_text)
        resume_keywords = self._extract_keywords(resume_text)
        
        if not job_keywords:
            return 0.5
        
        matches = sum(1 for keyword in job_keywords if keyword in resume_keywords)
        return matches / len(job_keywords)
    
    def _calculate_ats_compatibility(self, resume_text: str, job_text: str) -> float:
        """Calculate ATS compatibility score."""
        # Check for ATS-friendly formatting indicators
        ats_score = 0.5  # Base score
        
        # Keyword presence
        job_keywords = self._extract_keywords(job_text)
        resume_keywords = self._extract_keywords(resume_text)
        keyword_match_ratio = len(set(job_keywords) & set(resume_keywords)) / max(len(job_keywords), 1)
        
        ats_score += keyword_match_ratio * 0.5
        
        return min(1.0, ats_score)
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from text."""
        # Simplified keyword extraction
        words = re.findall(r'\b\w{3,}\b', text.lower())
        # Filter common words and return top keywords
        stopwords = {"the", "and", "for", "are", "but", "not", "you", "all", "can", "had", "her", "was", "one", "our", "out", "day", "get", "use", "man", "new", "now", "way", "may", "say"}
        keywords = [word for word in words if word not in stopwords and len(word) > 3]
        return list(set(keywords))
    
    def _get_high_demand_skills(self, industry: str) -> List[str]:
        """Get high-demand skills for the industry."""
        high_demand = {
            "technology": ["python", "javascript", "react", "aws", "docker", "kubernetes"],
            "finance": ["sql", "python", "excel", "tableau", "risk management"],
            "healthcare": ["hipaa", "clinical", "emr", "patient care"],
            "default": ["communication", "problem solving", "teamwork"]
        }
        return high_demand.get(industry, high_demand["default"])
    
    def _get_learning_resources(self, skill: str) -> List[str]:
        """Get learning resources for a skill."""
        # Simplified resource mapping
        resources = {
            "python": ["Python.org tutorials", "Codecademy Python", "Real Python"],
            "javascript": ["MDN Web Docs", "freeCodeCamp", "JavaScript.info"],
            "react": ["React Official Docs", "React Tutorial", "Scrimba React Course"],
            "default": ["Coursera", "Udemy", "LinkedIn Learning"]
        }
        return resources.get(skill.lower(), resources["default"])
    
    def _estimate_learning_time(self, skill: str) -> str:
        """Estimate time to learn a skill."""
        time_estimates = {
            "python": "2-3 months",
            "javascript": "2-3 months", 
            "react": "1-2 months",
            "sql": "1-2 months",
            "aws": "3-4 months",
            "default": "1-3 months"
        }
        return time_estimates.get(skill.lower(), time_estimates["default"])
    
    def _get_skill_alternatives(self, skill: str) -> List[str]:
        """Get alternative skills that could substitute."""
        alternatives = {
            "python": ["java", "javascript", "r"],
            "react": ["angular", "vue", "svelte"],
            "mysql": ["postgresql", "sqlite", "sql server"],
            "aws": ["azure", "gcp", "digital ocean"],
            "default": []
        }
        return alternatives.get(skill.lower(), alternatives["default"])
    
    def _estimate_company_size(self, company_name: str) -> str:
        """Estimate company size based on name."""
        # This would ideally use a company database
        if not company_name:
            return "unknown"
        
        large_indicators = ["inc", "corp", "corporation", "ltd", "limited", "llc"]
        if any(indicator in company_name.lower() for indicator in large_indicators):
            return "large"
        else:
            return "medium"  # Default assumption
    
    async def _analyze_location_competitiveness(
        self, 
        location: Optional[str], 
        db: AsyncSession
    ) -> Dict[str, Any]:
        """Analyze location-based competitiveness."""
        if not location:
            return {"competitiveness": "unknown", "market_data": None}
        
        # Query similar jobs in the same location
        try:
            query = select(func.count(JobComparison.id)).where(
                JobComparison.location.ilike(f"%{location}%")
            )
            result = await db.execute(query)
            job_count = result.scalar() or 0
            
            competitiveness = "high" if job_count > 100 else "medium" if job_count > 20 else "low"
            
            return {
                "competitiveness": competitiveness,
                "market_data": {
                    "total_jobs": job_count,
                    "location": location
                }
            }
        except Exception as e:
            logger.warning(f"Failed to analyze location competitiveness: {e}")
            return {"competitiveness": "unknown", "market_data": None}
    
    def _analyze_salary_competitiveness(
        self, 
        salary_range: Optional[str], 
        role_level: str, 
        industry: str
    ) -> Dict[str, Any]:
        """Analyze salary competitiveness."""
        if not salary_range:
            return {"competitiveness": "unknown", "analysis": None}
        
        # Extract salary numbers
        salary_numbers = re.findall(r'\$?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)', salary_range)
        
        if not salary_numbers:
            return {"competitiveness": "unknown", "analysis": None}
        
        # Convert to integers
        salaries = [int(s.replace(',', '')) for s in salary_numbers]
        avg_salary = sum(salaries) / len(salaries)
        
        # Industry and role level benchmarks (simplified)
        benchmarks = {
            "technology": {"entry": 70000, "mid": 100000, "senior": 140000, "executive": 200000},
            "finance": {"entry": 60000, "mid": 90000, "senior": 130000, "executive": 180000},
            "healthcare": {"entry": 55000, "mid": 85000, "senior": 120000, "executive": 160000},
            "default": {"entry": 50000, "mid": 75000, "senior": 105000, "executive": 150000}
        }
        
        benchmark = benchmarks.get(industry, benchmarks["default"]).get(role_level, 75000)
        
        competitiveness = "high" if avg_salary > benchmark * 1.2 else "competitive" if avg_salary > benchmark * 0.8 else "below_market"
        
        return {
            "competitiveness": competitiveness,
            "analysis": {
                "offered_salary": avg_salary,
                "market_benchmark": benchmark,
                "difference_percent": ((avg_salary - benchmark) / benchmark) * 100
            }
        }
    
    async def _generate_enhanced_recommendations(
        self,
        skill_analysis: Dict[str, Any],
        metrics: ComparisonMetrics,
        industry: str,
        role_level: str,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Generate enhanced, context-aware recommendations."""
        recommendations = []
        
        # Skill-based recommendations
        if skill_analysis["missing_critical"]:
            recommendations.append({
                "type": "critical_skills",
                "priority": "high",
                "title": "Critical Skills Gap",
                "description": f"Focus on acquiring these critical skills: {', '.join(skill_analysis['missing_critical'][:3])}",
                "action_items": [
                    f"Take a course in {skill}" for skill in skill_analysis["missing_critical"][:3]
                ],
                "impact": "high"
            })
        
        # Experience-based recommendations
        if metrics.experience_alignment < 0.7:
            recommendations.append({
                "type": "experience",
                "priority": "medium",
                "title": "Experience Alignment",
                "description": "Consider highlighting relevant experience more prominently",
                "action_items": [
                    "Add more specific examples of relevant work",
                    "Quantify achievements with numbers and results",
                    "Emphasize leadership or technical complexity"
                ],
                "impact": "medium"
            })
        
        # ATS optimization recommendations
        if metrics.ats_compatibility < 0.8:
            recommendations.append({
                "type": "ats_optimization",
                "priority": "high",
                "title": "ATS Optimization",
                "description": "Improve resume format for better ATS scanning",
                "action_items": [
                    "Include more keywords from job description",
                    "Use standard section headings",
                    "Avoid complex formatting and graphics"
                ],
                "impact": "high"
            })
        
        # Industry-specific recommendations
        if metrics.industry_fit < 0.8:
            industry_recs = await self._get_industry_specific_recommendations(industry, db)
            if industry_recs:
                recommendations.extend(industry_recs)
        
        return recommendations
    
    async def _get_industry_specific_recommendations(
        self, 
        industry: str, 
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Get industry-specific recommendations based on market trends."""
        # This would query market data and trending skills
        industry_recommendations = {
            "technology": [
                {
                    "type": "industry_trend",
                    "priority": "medium",
                    "title": "Tech Industry Trends",
                    "description": "Consider learning cloud technologies and AI/ML basics",
                    "action_items": [
                        "Learn AWS or Azure fundamentals",
                        "Explore Python for data analysis",
                        "Understand microservices architecture"
                    ],
                    "impact": "medium"
                }
            ],
            "finance": [
                {
                    "type": "industry_trend",
                    "priority": "medium", 
                    "title": "Finance Industry Trends",
                    "description": "Focus on fintech and regulatory knowledge",
                    "action_items": [
                        "Learn about blockchain and cryptocurrency",
                        "Understand regulatory compliance (SOX, GDPR)",
                        "Develop data analysis skills"
                    ],
                    "impact": "medium"
                }
            ]
        }
        
        return industry_recommendations.get(industry, [])
    
    async def _generate_comparison_analytics(
        self, 
        db: AsyncSession, 
        user_id: str
    ) -> Dict[str, Any]:
        """Generate analytics about user's comparison history."""
        try:
            # Get user's comparison history
            query = select(JobComparison).where(
                JobComparison.user_id == user_id,
                JobComparison.is_processed.is_(True)
            ).order_by(desc(JobComparison.created_at)).limit(20)
            
            result = await db.execute(query)
            comparisons = result.scalars().all()
            
            if not comparisons:
                return {"message": "No comparison history available"}
            
            # Calculate analytics
            scores = [c.overall_match_score for c in comparisons if c.overall_match_score]
            
            analytics = {
                "total_comparisons": len(comparisons),
                "average_match_score": sum(scores) / len(scores) if scores else 0,
                "best_match_score": max(scores) if scores else 0,
                "improvement_trend": self._calculate_improvement_trend(scores),
                "top_industries": self._analyze_top_industries(comparisons),
                "common_missing_skills": self._analyze_common_missing_skills(comparisons),
                "recommendations_summary": {
                    "focus_areas": ["skill development", "experience highlighting", "ATS optimization"],
                    "success_probability": min(100, int((sum(scores) / len(scores) if scores else 0.5) * 100 + 20))
                }
            }
            
            return analytics
            
        except Exception as e:
            logger.warning(f"Failed to generate comparison analytics: {e}")
            return {"error": "Analytics unavailable"}
    
    def _calculate_improvement_trend(self, scores: List[float]) -> str:
        """Calculate if user's scores are improving over time."""
        if len(scores) < 3:
            return "insufficient_data"
        
        recent_avg = sum(scores[:5]) / min(5, len(scores))  # Last 5 scores
        older_avg = sum(scores[-5:]) / min(5, len(scores))  # First 5 scores
        
        if recent_avg > older_avg + 0.1:
            return "improving"
        elif recent_avg < older_avg - 0.1:
            return "declining"
        else:
            return "stable"
    
    def _analyze_top_industries(self, comparisons: List[JobComparison]) -> List[Dict[str, Any]]:
        """Analyze top industries user is applying to."""
        # This would use industry detection on job descriptions
        # Simplified implementation
        companies = [c.company_name for c in comparisons if c.company_name]
        company_counts = Counter(companies)
        
        return [
            {"name": company, "count": count} 
            for company, count in company_counts.most_common(5)
        ]
    
    def _analyze_common_missing_skills(self, comparisons: List[JobComparison]) -> List[Dict[str, Any]]:
        """Analyze commonly missing skills across comparisons."""
        all_missing = []
        for comparison in comparisons:
            if comparison.missing_skills:
                all_missing.extend(comparison.missing_skills)
        
        skill_counts = Counter(all_missing)
        
        return [
            {"skill": skill, "frequency": count, "priority": "high" if count > 3 else "medium"}
            for skill, count in skill_counts.most_common(10)
        ]


# Initialize the enhanced service
enhanced_comparison_service = EnhancedComparisonService()