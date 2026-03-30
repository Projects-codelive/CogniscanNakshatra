import uvicorn
import os
import sys

# Ensure the app directory is in the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    # Start the FastAPI app with reload enabled for development
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
