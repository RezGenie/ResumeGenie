import openai
import json
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
import numpy as np

from app.core.config import settings
from app.models.models import Resume, JobDescription

openai.api_key = settings.OPENAI_API_KEY


class JobAnalyzer:
    def __init__(self):
        pass
    
    async def analyze_fit(self, resume: Resume, job_description: JobDescription) -> Dict[str, Any]:
        """Analyze how well a resume fits a job description"""
        
        # Calculate similarity score using embeddings
        fit_score = self._calculate_similarity(resume.embedding, job_description.embedding)
        
        # Extract skills from both resume and job description
        resume_skills = self._extract_skills_from_text(resume.content)
        job_skills = self._extract_skills_from_text(job_description.content)
        
        # Find matching and missing skills
        matching_skills = list(set(resume_skills) & set(job_skills))
        missing_skills = list(set(job_skills) - set(resume_skills))
        
        # Generate AI feedback
        ai_feedback = await self._generate_ai_feedback(
            resume.content, 
            job_description.content,
            fit_score,
            matching_skills,
            missing_skills
        )
        
        return {
            'fit_score': fit_score,
            'matching_skills': json.dumps(matching_skills),
            'missing_skills': json.dumps(missing_skills),
            'ai_feedback': ai_feedback
        }
    
    def _calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        if not embedding1 or not embedding2:
            return 0.0
        
        # Convert to numpy arrays
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        # Calculate cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        
        # Convert to percentage (0-100)
        return float((similarity + 1) / 2 * 100)
    
    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skills from text using keyword matching"""
        
        # Comprehensive list of technical skills
        tech_skills = [
            # Programming Languages
            'python', 'javascript', 'java', 'c++', 'c#', 'go', 'rust', 'typescript',
            'php', 'ruby', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'sql',
            
            # Web Technologies
            'react', 'angular', 'vue.js', 'node.js', 'express', 'django', 'flask',
            'fastapi', 'spring', 'laravel', 'rails', 'asp.net', 'html', 'css',
            'sass', 'bootstrap', 'tailwind', 'webpack', 'vite',
            
            # Databases
            'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'sqlite',
            'dynamodb', 'cassandra', 'neo4j', 'influxdb',
            
            # Cloud & DevOps
            'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ansible',
            'jenkins', 'gitlab ci', 'github actions', 'circleci', 'travis ci',
            
            # Data & ML
            'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'keras',
            'spark', 'hadoop', 'airflow', 'kafka', 'tableau', 'power bi',
            
            # Tools & Frameworks
            'git', 'linux', 'bash', 'vim', 'vs code', 'intellij', 'jira',
            'confluence', 'slack', 'teams'
        ]
        
        # Soft skills
        soft_skills = [
            'leadership', 'communication', 'teamwork', 'problem solving',
            'analytical', 'creative', 'adaptable', 'detail oriented',
            'time management', 'project management', 'collaboration'
        ]
        
        all_skills = tech_skills + soft_skills
        text_lower = text.lower()
        
        found_skills = []
        for skill in all_skills:
            if skill in text_lower:
                found_skills.append(skill)
        
        return found_skills
    
    async def _generate_ai_feedback(
        self, 
        resume_content: str, 
        job_content: str,
        fit_score: float,
        matching_skills: List[str],
        missing_skills: List[str]
    ) -> str:
        """Generate AI feedback using OpenAI"""
        
        prompt = f"""
        As an expert career advisor, analyze this resume against the job description and provide helpful feedback.

        RESUME:
        {resume_content[:2000]}...

        JOB DESCRIPTION:
        {job_content[:1500]}...

        ANALYSIS:
        - Fit Score: {fit_score:.1f}%
        - Matching Skills: {', '.join(matching_skills[:10])}
        - Missing Skills: {', '.join(missing_skills[:10])}

        Please provide:
        1. A brief assessment of the candidate's fit for this role
        2. Top 3 strengths that align with the job requirements
        3. Top 3 areas for improvement or skills to develop
        4. Specific suggestions for improving the resume for this type of role

        Keep the response concise but actionable, under 300 words.
        """
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert career advisor and resume reviewer."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.7
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error generating AI feedback: {e}")
            return f"Analysis complete. Fit score: {fit_score:.1f}%. Consider developing skills in: {', '.join(missing_skills[:5])}."