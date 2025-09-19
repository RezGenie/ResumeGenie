import openai
from app.core.config import settings
from typing import List

openai.api_key = settings.OPENAI_API_KEY


class EmbeddingService:
    def __init__(self):
        self.model = "text-embedding-ada-002"
    
    async def generate_embedding(self, text: str) -> List[float]:
        """Generate embeddings for text using OpenAI API"""
        try:
            response = await openai.Embedding.acreate(
                model=self.model,
                input=text
            )
            return response['data'][0]['embedding']
        except Exception as e:
            print(f"Error generating embedding: {e}")
            # Return zero vector as fallback
            return [0.0] * 1536
    
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        try:
            response = await openai.Embedding.acreate(
                model=self.model,
                input=texts
            )
            return [item['embedding'] for item in response['data']]
        except Exception as e:
            print(f"Error generating batch embeddings: {e}")
            # Return zero vectors as fallback
            return [[0.0] * 1536] * len(texts)