"""
Advanced OpenAI Integration Service
Handles embeddings generation, GPT-4 recommendations, and AI-powered analysis.
"""

import openai
import asyncio
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
from dataclasses import dataclass
import json
import time

from app.core.config import settings

logger = logging.getLogger(__name__)

# Configure OpenAI
openai.api_key = settings.openai_api_key


@dataclass
class EmbeddingResult:
    """Result from embedding generation."""
    embedding: List[float]
    token_count: int
    model: str
    processing_time: float


@dataclass 
class RecommendationResult:
    """Result from AI recommendation generation."""
    recommendations: List[Dict[str, Any]]
    confidence_score: float
    processing_time: float
    tokens_used: int


class OpenAIError(Exception):
    """Custom OpenAI service error."""
    pass


class OpenAIService:
    """Advanced OpenAI integration service."""
    
    def __init__(self):
        """Initialize OpenAI service."""
        self.embedding_model = settings.openai_embedding_model
        self.chat_model = settings.openai_model
        self.max_retries = 3
        self.retry_delay = 1.0
        
        # Token limits
        self.max_embedding_tokens = 8191  # text-embedding-3-small limit
        self.max_chat_tokens = 128000     # GPT-4 context limit
        
        # Rate limiting
        self.last_embedding_call = 0
        self.last_chat_call = 0
        self.min_call_interval = 0.1  # 100ms between calls
    
    async def _rate_limit_check(self, call_type: str):
        """Implement basic rate limiting."""
        current_time = time.time()
        
        if call_type == "embedding":
            time_since_last = current_time - self.last_embedding_call
            if time_since_last < self.min_call_interval:
                await asyncio.sleep(self.min_call_interval - time_since_last)
            self.last_embedding_call = time.time()
            
        elif call_type == "chat":
            time_since_last = current_time - self.last_chat_call
            if time_since_last < self.min_call_interval:
                await asyncio.sleep(self.min_call_interval - time_since_last)
            self.last_chat_call = time.time()
    
    def _chunk_text(self, text: str, max_tokens: int = 8000) -> List[str]:
        """
        Split text into chunks that fit within token limits.
        
        Args:
            text: Text to chunk
            max_tokens: Maximum tokens per chunk
            
        Returns:
            List of text chunks
        """
        # Rough estimate: 1 token ≈ 4 characters
        max_chars = max_tokens * 4
        
        if len(text) <= max_chars:
            return [text]
        
        chunks = []
        sentences = text.split('. ')
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk + sentence) <= max_chars:
                current_chunk += sentence + ". "
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + ". "
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    async def generate_embedding(self, text: str) -> EmbeddingResult:
        """
        Generate embedding for text using OpenAI API.
        
        Args:
            text: Text to embed
            
        Returns:
            EmbeddingResult with embedding and metadata
            
        Raises:
            OpenAIError: If embedding generation fails
        """
        if not text.strip():
            raise OpenAIError("Cannot generate embedding for empty text")
        
        # Clean and truncate text if necessary
        text = text.strip()
        chunks = self._chunk_text(text, self.max_embedding_tokens)
        
        if len(chunks) > 1:
            logger.warning(f"Text too long, using first chunk only. Total chunks: {len(chunks)}")
            text = chunks[0]
        
        start_time = time.time()
        
        for attempt in range(self.max_retries):
            try:
                await self._rate_limit_check("embedding")
                
                response = await asyncio.to_thread(
                    openai.embeddings.create,
                    model=self.embedding_model,
                    input=text
                )
                
                processing_time = time.time() - start_time
                
                embedding_data = response.data[0]
                
                result = EmbeddingResult(
                    embedding=embedding_data.embedding,
                    token_count=response.usage.total_tokens,
                    model=self.embedding_model,
                    processing_time=processing_time
                )
                
                logger.info(f"Generated embedding: {result.token_count} tokens, {processing_time:.2f}s")
                return result
                
            except openai.RateLimitError as e:
                wait_time = self.retry_delay * (2 ** attempt)
                logger.warning(f"Rate limit hit, waiting {wait_time}s before retry {attempt + 1}")
                await asyncio.sleep(wait_time)
                
            except openai.APIError as e:
                if attempt == self.max_retries - 1:
                    logger.error(f"OpenAI API error after {self.max_retries} attempts: {e}")
                    raise OpenAIError(f"Failed to generate embedding: {str(e)}")
                await asyncio.sleep(self.retry_delay)
                
            except Exception as e:
                logger.error(f"Unexpected error generating embedding: {e}")
                raise OpenAIError(f"Embedding generation failed: {str(e)}")
        
        raise OpenAIError("Failed to generate embedding after all retries")
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """
        Calculate cosine similarity between two embeddings.
        
        Args:
            embedding1: First embedding vector
            embedding2: Second embedding vector
            
        Returns:
            Similarity score between 0 and 1
        """
        try:
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Calculate cosine similarity
            dot_product = np.dot(vec1, vec2)
            norm1 = np.linalg.norm(vec1)
            norm2 = np.linalg.norm(vec2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            similarity = dot_product / (norm1 * norm2)
            
            # Convert from [-1, 1] to [0, 1] range
            normalized_similarity = (similarity + 1) / 2
            
            return float(np.clip(normalized_similarity, 0, 1))
            
        except Exception as e:
            logger.error(f"Error calculating similarity: {e}")
            return 0.0
    
    async def generate_resume_recommendations(
        self,
        resume_text: str,
        job_description: str,
        similarity_score: float,
        recommendation_type: str = "general"
    ) -> RecommendationResult:
        """
        Generate AI-powered resume recommendations.
        
        Args:
            resume_text: Resume text content
            job_description: Job description text
            similarity_score: Calculated similarity score
            recommendation_type: Type of recommendations (skills, ats, formatting, general)
            
        Returns:
            RecommendationResult with recommendations and metadata
        """
        start_time = time.time()
        
        # Create context-aware prompt based on recommendation type
        prompts = {
            "skills": self._create_skills_prompt(resume_text, job_description, similarity_score),
            "ats": self._create_ats_prompt(resume_text, job_description, similarity_score),
            "formatting": self._create_formatting_prompt(resume_text, similarity_score),
            "general": self._create_general_prompt(resume_text, job_description, similarity_score)
        }
        
        prompt = prompts.get(recommendation_type, prompts["general"])
        
        for attempt in range(self.max_retries):
            try:
                await self._rate_limit_check("chat")
                
                response = await asyncio.to_thread(
                    openai.chat.completions.create,
                    model=self.chat_model,
                    messages=[
                        {"role": "system", "content": "You are an expert resume consultant and career advisor with deep knowledge of ATS systems, hiring practices, and resume optimization."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=2000
                )
                
                processing_time = time.time() - start_time
                
                # Parse the response
                recommendations_text = response.choices[0].message.content
                recommendations = self._parse_recommendations_response(recommendations_text, recommendation_type)
                
                # Calculate confidence score based on response quality
                confidence = self._calculate_confidence_score(recommendations_text, similarity_score)
                
                result = RecommendationResult(
                    recommendations=recommendations,
                    confidence_score=confidence,
                    processing_time=processing_time,
                    tokens_used=response.usage.total_tokens
                )
                
                logger.info(f"Generated {len(recommendations)} recommendations: {result.tokens_used} tokens, {processing_time:.2f}s")
                return result
                
            except openai.RateLimitError as e:
                wait_time = self.retry_delay * (2 ** attempt)
                logger.warning(f"Rate limit hit, waiting {wait_time}s before retry {attempt + 1}")
                await asyncio.sleep(wait_time)
                
            except openai.APIError as e:
                if attempt == self.max_retries - 1:
                    logger.error(f"OpenAI API error after {self.max_retries} attempts: {e}")
                    raise OpenAIError(f"Failed to generate recommendations: {str(e)}")
                await asyncio.sleep(self.retry_delay)
                
            except Exception as e:
                logger.error(f"Unexpected error generating recommendations: {e}")
                raise OpenAIError(f"Recommendation generation failed: {str(e)}")
        
        raise OpenAIError("Failed to generate recommendations after all retries")
    
    def _create_skills_prompt(self, resume_text: str, job_description: str, similarity_score: float) -> str:
        """Create prompt for skills-focused recommendations."""
        return f"""
Analyze this resume against the job description and provide specific skills recommendations.

Resume Text:
{resume_text[:3000]}

Job Description:
{job_description[:2000]}

Current Similarity Score: {similarity_score:.2f}

Please provide:
1. Missing key skills that appear in the job description but not in the resume
2. Skills that are mentioned but could be better highlighted
3. Specific technical skills or certifications that would strengthen the application
4. Soft skills that are important for this role
5. Industry-specific skills or knowledge areas to develop

Format your response as a JSON object with the following structure:
{{
    "missing_skills": ["skill1", "skill2", ...],
    "underemphasized_skills": ["skill1", "skill2", ...],
    "recommended_technical": ["skill1", "skill2", ...],
    "recommended_soft": ["skill1", "skill2", ...],
    "development_areas": ["area1", "area2", ...],
    "priority_level": "high|medium|low",
    "impact_explanation": "explanation of how these changes would improve the match"
}}
"""
    
    def _create_ats_prompt(self, resume_text: str, job_description: str, similarity_score: float) -> str:
        """Create prompt for ATS optimization recommendations."""
        return f"""
Analyze this resume for ATS (Applicant Tracking System) optimization against the job description.

Resume Text:
{resume_text[:3000]}

Job Description:
{job_description[:2000]}

Current Similarity Score: {similarity_score:.2f}

Please provide ATS optimization recommendations:
1. Keyword optimization suggestions
2. Formatting improvements for ATS readability
3. Section organization recommendations
4. Action verb suggestions
5. Quantification opportunities

Format your response as a JSON object:
{{
    "keyword_suggestions": [
        {{"keyword": "keyword", "current_frequency": 0, "recommended_frequency": 2, "context": "where to add it"}}
    ],
    "formatting_improvements": ["improvement1", "improvement2", ...],
    "section_recommendations": ["recommendation1", "recommendation2", ...],
    "action_verbs": ["verb1", "verb2", ...],
    "quantification_opportunities": ["opportunity1", "opportunity2", ...],
    "ats_score_prediction": "estimated improvement in ATS score",
    "priority_fixes": ["fix1", "fix2", ...]
}}
"""
    
    def _create_formatting_prompt(self, resume_text: str, similarity_score: float) -> str:
        """Create prompt for formatting recommendations."""
        return f"""
Analyze this resume for formatting and presentation improvements.

Resume Text:
{resume_text[:4000]}

Current Overall Score: {similarity_score:.2f}

Please provide formatting and presentation recommendations:
1. Structure and organization improvements
2. Content flow and readability suggestions
3. Professional presentation enhancements
4. Section prioritization recommendations
5. Length and conciseness suggestions

Format your response as a JSON object:
{{
    "structure_improvements": ["improvement1", "improvement2", ...],
    "readability_suggestions": ["suggestion1", "suggestion2", ...],
    "presentation_enhancements": ["enhancement1", "enhancement2", ...],
    "section_priorities": ["section1", "section2", ...],
    "length_recommendations": {{"current_assessment": "too long/too short/appropriate", "suggestions": ["suggestion1", ...]}}
    "overall_impression": "professional assessment of current formatting"
}}
"""
    
    def _create_general_prompt(self, resume_text: str, job_description: str, similarity_score: float) -> str:
        """Create prompt for general recommendations."""
        return f"""
Provide comprehensive resume optimization recommendations for this job application.

Resume Text:
{resume_text[:3000]}

Job Description:
{job_description[:2000]}

Current Match Score: {similarity_score:.2f}

Please provide a holistic analysis with:
1. Top 3 priority improvements
2. Content enhancement suggestions
3. Strategic positioning recommendations
4. Industry-specific advice
5. Overall competitiveness assessment

Format your response as a JSON object:
{{
    "priority_improvements": [
        {{"improvement": "description", "impact": "high|medium|low", "effort": "high|medium|low"}}
    ],
    "content_enhancements": ["enhancement1", "enhancement2", ...],
    "strategic_positioning": "advice on how to position this candidate",
    "industry_advice": "industry-specific recommendations",
    "competitiveness_score": "score out of 10 with explanation",
    "next_steps": ["step1", "step2", ...],
    "estimated_improvement": "expected improvement in match score"
}}
"""
    
    def _parse_recommendations_response(self, response_text: str, recommendation_type: str) -> List[Dict[str, Any]]:
        """Parse the AI response into structured recommendations."""
        try:
            # Try to parse as JSON first
            parsed_data = json.loads(response_text)
            
            # Convert to standard recommendation format
            recommendations = []
            
            if recommendation_type == "skills":
                recommendations.extend(self._format_skills_recommendations(parsed_data))
            elif recommendation_type == "ats":
                recommendations.extend(self._format_ats_recommendations(parsed_data))
            elif recommendation_type == "formatting":
                recommendations.extend(self._format_formatting_recommendations(parsed_data))
            else:
                recommendations.extend(self._format_general_recommendations(parsed_data))
            
            return recommendations
            
        except json.JSONDecodeError:
            # Fallback: parse as plain text
            logger.warning("Failed to parse JSON response, using text parsing")
            return self._parse_text_recommendations(response_text, recommendation_type)
    
    def _format_skills_recommendations(self, data: Dict) -> List[Dict[str, Any]]:
        """Format skills recommendations."""
        recommendations = []
        
        for skill in data.get("missing_skills", []):
            recommendations.append({
                "type": "skill_gap",
                "category": "missing_skill",
                "title": f"Add Missing Skill: {skill}",
                "description": f"The job description emphasizes '{skill}' but it's not clearly highlighted in your resume.",
                "priority": "high",
                "actionable": True
            })
        
        for skill in data.get("recommended_technical", []):
            recommendations.append({
                "type": "skill_enhancement",
                "category": "technical_skill",
                "title": f"Strengthen Technical Skill: {skill}",
                "description": f"Consider obtaining certification or demonstrating experience in {skill}.",
                "priority": "medium",
                "actionable": True
            })
        
        return recommendations
    
    def _format_ats_recommendations(self, data: Dict) -> List[Dict[str, Any]]:
        """Format ATS recommendations."""
        recommendations = []
        
        for keyword_data in data.get("keyword_suggestions", []):
            recommendations.append({
                "type": "ats_optimization",
                "category": "keyword",
                "title": f"Optimize Keyword: {keyword_data.get('keyword', 'Unknown')}",
                "description": keyword_data.get("context", "Add this keyword to improve ATS matching"),
                "priority": "high",
                "actionable": True
            })
        
        for improvement in data.get("formatting_improvements", []):
            recommendations.append({
                "type": "ats_optimization",
                "category": "formatting",
                "title": "ATS Formatting Improvement",
                "description": improvement,
                "priority": "medium",
                "actionable": True
            })
        
        return recommendations
    
    def _format_formatting_recommendations(self, data: Dict) -> List[Dict[str, Any]]:
        """Format formatting recommendations."""
        recommendations = []
        
        for improvement in data.get("structure_improvements", []):
            recommendations.append({
                "type": "formatting",
                "category": "structure",
                "title": "Structure Improvement",
                "description": improvement,
                "priority": "medium",
                "actionable": True
            })
        
        return recommendations
    
    def _format_general_recommendations(self, data: Dict) -> List[Dict[str, Any]]:
        """Format general recommendations."""
        recommendations = []
        
        for improvement in data.get("priority_improvements", []):
            recommendations.append({
                "type": "general",
                "category": "priority",
                "title": improvement.get("improvement", "Priority Improvement"),
                "description": f"Impact: {improvement.get('impact', 'medium')}, Effort: {improvement.get('effort', 'medium')}",
                "priority": improvement.get("impact", "medium"),
                "actionable": True
            })
        
        return recommendations
    
    def _parse_text_recommendations(self, text: str, recommendation_type: str) -> List[Dict[str, Any]]:
        """Fallback text parsing for recommendations."""
        recommendations = []
        lines = text.split('\n')
        
        current_recommendation = None
        for line in lines:
            line = line.strip()
            if not line:
                continue
            
            # Look for numbered or bulleted items
            if any(line.startswith(prefix) for prefix in ['1.', '2.', '3.', '•', '-', '*']):
                if current_recommendation:
                    recommendations.append(current_recommendation)
                
                current_recommendation = {
                    "type": recommendation_type,
                    "category": "general",
                    "title": line,
                    "description": "",
                    "priority": "medium",
                    "actionable": True
                }
            elif current_recommendation:
                current_recommendation["description"] += " " + line
        
        if current_recommendation:
            recommendations.append(current_recommendation)
        
        return recommendations[:10]  # Limit to 10 recommendations
    
    def _calculate_confidence_score(self, response_text: str, similarity_score: float) -> float:
        """Calculate confidence score for recommendations."""
        base_confidence = 0.7
        
        # Adjust based on response quality indicators
        quality_indicators = [
            "specific" in response_text.lower(),
            "keyword" in response_text.lower(),
            "improve" in response_text.lower(),
            len(response_text) > 200,
            '"' in response_text  # Likely JSON format
        ]
        
        quality_bonus = sum(quality_indicators) * 0.05
        
        # Adjust based on similarity score
        similarity_factor = min(similarity_score * 0.3, 0.2)
        
        final_confidence = min(base_confidence + quality_bonus + similarity_factor, 0.95)
        return round(final_confidence, 2)


# Global OpenAI service instance
openai_service = OpenAIService()