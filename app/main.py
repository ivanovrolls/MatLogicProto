from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI()
@app.get("/", response_class=HTMLResponse)
def home():
    return "<h1>MatsLogic</h1><p>System thinking for the mats.</p>"