from fastapi import FastAPI
from models import MatchRequest, MatchResponse
from matcher import match_freelancers
from typing import List

app = FastAPI(title="Freelancer AI Matcher")

@app.post("/match", response_model=List[MatchResponse])
async def match(request: MatchRequest):
    results = match_freelancers(request.job, request.freelancers)
    return results

@app.get("/")
def read_root():
    return {"message": "AI Matcher is running"}
