import openai
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.models.models import User, Resume, JobApplication

openai.api_key = settings.OPENAI_API_KEY


class GenieService:
    def __init__(self):
        self.wish_prompts = {
            'ats_tip': self._get_ats_tip_prompt,
            'fit_summary': self._get_fit_summary_prompt, 
            'skills_advice': self._get_skills_advice_prompt
        }
    
    async def generate_wish(self, wish_type: str, user: User) -> str:
        """Generate a daily wish based on type and user context"""
        
        if wish_type not in self.wish_prompts:
            return "Invalid wish type requested."
        
        # Get user context (recent resumes and job applications)
        context = await self._get_user_context(user)
        
        # Generate prompt based on wish type
        prompt_func = self.wish_prompts[wish_type]
        prompt = prompt_func(context)
        
        try:
            response = await openai.ChatCompletion.acreate(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are RezGenie, a helpful AI career advisor. Provide practical, actionable advice in a friendly tone."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.8
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            print(f"Error generating wish: {e}")
            return self._get_fallback_wish(wish_type)
    
    def _get_ats_tip_prompt(self, context: Dict[str, Any]) -> str:
        """Generate prompt for ATS optimization tip"""
        
        base_prompt = "Provide a practical tip for optimizing resumes for Applicant Tracking Systems (ATS)."
        
        if context.get('recent_resume'):
            resume_snippet = context['recent_resume']['content'][:500]
            return f"""
            {base_prompt}
            
            Consider this resume snippet:
            {resume_snippet}
            
            Give a specific, actionable ATS optimization tip that would help this resume get past automated screening systems.
            """
        
        return f"{base_prompt} Focus on formatting, keywords, and structure."
    
    def _get_fit_summary_prompt(self, context: Dict[str, Any]) -> str:
        """Generate prompt for job fit summary"""
        
        if context.get('recent_application'):
            app = context['recent_application']
            return f"""
            Provide a brief summary of job fit analysis for a recent application:
            
            Job: {app.get('job_title', 'Unknown')} at {app.get('company', 'Unknown')}
            Fit Score: {app.get('fit_score', 0):.1f}%
            
            Give encouraging feedback and 1-2 specific suggestions for improvement.
            """
        
        return "Provide general advice on how to assess and improve job fit when applying for positions."
    
    def _get_skills_advice_prompt(self, context: Dict[str, Any]) -> str:
        """Generate prompt for skills development advice"""
        
        base_prompt = "Provide advice on developing in-demand professional skills."
        
        if context.get('missing_skills'):
            skills = context['missing_skills'][:5]  # Top 5 missing skills
            return f"""
            {base_prompt}
            
            Based on recent job market analysis, these skills are frequently requested but missing from profiles:
            {', '.join(skills)}
            
            Pick one skill and provide a specific learning path or resource recommendation.
            """
        
        return f"{base_prompt} Focus on current market trends and practical learning approaches."
    
    async def _get_user_context(self, user: User) -> Dict[str, Any]:
        """Get user context for personalized wishes"""
        # This would typically use the database session passed in
        # For now, return empty context
        return {}
    
    def _get_fallback_wish(self, wish_type: str) -> str:
        """Provide fallback wishes when AI generation fails"""
        
        fallbacks = {
            'ats_tip': "💡 ATS Tip: Use standard section headings like 'Work Experience' and 'Education' to help ATS systems parse your resume correctly.",
            'fit_summary': "🎯 Remember: Focus on quantifying your achievements with specific numbers and metrics that align with job requirements.",
            'skills_advice': "📚 Skill Tip: Consider learning cloud computing basics (AWS/Azure) as it's one of the most in-demand skills across industries."
        }
        
        return fallbacks.get(wish_type, "✨ Keep working on your professional development!")  