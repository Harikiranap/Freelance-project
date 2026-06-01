from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from typing import List, Dict
from models import Job, Freelancer

def match_freelancers(job: Job, freelancers: List[Freelancer]) -> List[Dict[str, float]]:
    if not freelancers:
        return []

    # Prepare texts
    job_text = " ".join(job.skills_required)
    freelancer_texts = [" ".join(f.skills) for f in freelancers]
    
    # All texts to vectorize
    all_texts = [job_text] + freelancer_texts
    
    # TF-IDF
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(all_texts)
    
    # Calculate cosine similarity between Job (index 0) and Freelancers (index 1 to N)
    cosine_sim = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
    
    # Map results
    results = []
    for i, freelancer in enumerate(freelancers):
        score = float(cosine_sim[i])
        results.append({"freelancer_id": freelancer.id, "score": score})
        
    # Sort by score descending
    results = sorted(results, key=lambda x: x["score"], reverse=True)
    return results[:5]  # Top 5
