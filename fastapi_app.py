from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.workflows import router as workflow_router

app = FastAPI(title="AI Writer MVP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workflow_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "AI Writer MVP API is running"}
