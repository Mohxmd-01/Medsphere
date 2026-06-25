from datetime import datetime, timedelta
from typing import Optional, List
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from app.config import settings
from app.database.mongo import get_mongo_db

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 Scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

class TokenData(BaseModel):
    username: str
    role: str

class UserInDB(BaseModel):
    username: str
    hashed_password: str
    role: str  # "Physician", "Admin", "Researcher", "DecisionSupport"
    full_name: str

import bcrypt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        return bcrypt.checkpw(plain_password, hashed_password)
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    if isinstance(password, str):
        password = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password, salt)
    return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None or role is None:
            raise credentials_exception
        token_data = TokenData(username=username, role=role)
    except JWTError:
        raise credentials_exception
        
    db = get_mongo_db()
    user = db["users"].find_one({"username": token_data.username})
    if user is None:
        raise credentials_exception
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: dict = Depends(get_current_user)):
        user_role = current_user.get("role")
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User role '{user_role}' is not authorized to perform this operation. Required: {self.allowed_roles}"
            )
        return current_user

# Predefined checks
require_physician = RoleChecker(["Physician", "Admin"])
require_admin = RoleChecker(["Admin"])
require_any_user = RoleChecker(["Physician", "Admin", "Researcher", "DecisionSupport"])

# Auto-seed standard users for testing ease
def seed_default_users():
    db = get_mongo_db()
    # Check if admin user exists
    if db["users"].count_documents({"username": "doctor"}) == 0:
        hashed = get_password_hash("password123")
        db["users"].insert_one({
            "username": "doctor",
            "hashed_password": hashed,
            "role": "Physician",
            "full_name": "Dr. Sarah Taylor"
        })
        print("[Auth] Seeded default user: doctor / password123 (Physician)")
        
    if db["users"].count_documents({"username": "admin"}) == 0:
        hashed = get_password_hash("admin123")
        db["users"].insert_one({
            "username": "admin",
            "hashed_password": hashed,
            "role": "Admin",
            "full_name": "System Administrator"
        })
        print("[Auth] Seeded default user: admin / admin123 (Admin)")
