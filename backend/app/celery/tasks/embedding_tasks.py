# app/celery/tasks/embedding_tasks.py

from celery import shared_task

@shared_task(name="embedding.generate")
def generate_embedding(text: str) -> dict:
    """
    A simple Celery task stub for generating embeddings.
    Replace the body with your actual embedding logic.
    """
    # For now, just return a fake "embedding" vector
    # In real code, you might call OpenAI, HuggingFace, etc.
    embedding = [ord(c) % 10 for c in text][:10]  # toy example
    return {"text": text, "embedding": embedding}
