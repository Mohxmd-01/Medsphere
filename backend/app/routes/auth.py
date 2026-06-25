from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from app.auth import (
    create_access_token, 
    get_current_user, 
    get_password_hash, 
    verify_password
)
from app.database.mongo import get_mongo_db

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterUser(BaseModel):
    username: str
    password: str
    role: str
    full_name: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str
    full_name: str

@router.post("/register", response_model=dict)
def register(user_data: RegisterUser):
    db = get_mongo_db()
    if db["users"].find_one({"username": user_data.username}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    allowed_roles = ["Physician", "Admin", "Researcher", "DecisionSupport"]
    if user_data.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Allowed roles: {allowed_roles}"
        )
        
    hashed = get_password_hash(user_data.password)
    db["users"].insert_one({
        "username": user_data.username,
        "hashed_password": hashed,
        "role": user_data.role,
        "full_name": user_data.full_name
    })
    return {"message": "User registered successfully"}

@router.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = get_mongo_db()
    user = db["users"].find_one({"username": form_data.username})
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"]}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"],
        "full_name": user["full_name"]
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "username": current_user["username"],
        "role": current_user["role"],
        "full_name": current_user["full_name"]
    }
