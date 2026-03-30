from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from datetime import datetime, timedelta
from typing import Optional

router = APIRouter()

class User(BaseModel):
    username: str
    email: str
    full_name: str
    disabled: Optional[bool] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticates the user and returns a JWT token.
    Uses static credentials for demonstration as per clinical specification.
    """
    # Mock authentication logic
    if form_data.username != "eleanor" or form_data.password != "cogniscan":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # In a real scenario, we would use python-jose to encode a JWT
    return {"access_token": "mock_token_eleanor", "token_type": "bearer"}

@router.post("/register")
async def register():
    """Registers a new patient or caregiver user."""
    return {"message": "User registration successful"}
