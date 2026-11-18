from typing import List, Optional
from fastapi import APIRouter, HTTPException
from app.core.authorities import Authority, get_authority, list_authorities

router = APIRouter(prefix="/api/authorities", tags=["University Authorities"])


@router.get("", response_model=List[Authority])
async def get_all_authorities():
    """List all supported university & institution Moodle authorities."""
    return list_authorities()


@router.get("/{slug}", response_model=Authority)
async def get_single_authority(slug: str):
    """Get metadata and default configuration for a specific authority."""
    auth = get_authority(slug)
    if not auth:
        raise HTTPException(status_code=404, detail=f"Authority '{slug}' not found.")
    return auth
