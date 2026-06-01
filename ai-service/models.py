from pydantic import BaseModel
from typing import List

class Freelancer(BaseModel):
    id: str
    skills: List[str]

class Job(BaseModel):
    id: str
    skills_required: List[str]

class MatchRequest(BaseModel):
    job: Job
    freelancers: List[Freelancer]

class MatchResponse(BaseModel):
    freelancer_id: str
    score: float
