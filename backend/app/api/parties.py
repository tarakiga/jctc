from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid
from datetime import datetime

from app.database import get_db
from app.models.parties import Party
from app.models.case import Case
from app.schemas.parties import (
    PartyCreate,
    PartyResponse,
    PartyUpdate,
    PartyWithCases,
    PartySearchResponse
)
from app.utils.auth import get_current_user
from app.schemas.user import User

router = APIRouter()

@router.post("/", response_model=PartyResponse, status_code=status.HTTP_201_CREATED)
async def create_party(
    party: PartyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new party (suspect, victim, or witness)"""
    
    # Generate party ID
    party_id = str(uuid.uuid4())
    
    # Create party record
    db_party = Party(
        id=party_id,
        type=party.type,
        first_name=party.first_name,
        last_name=party.last_name,
        middle_name=party.middle_name,
        date_of_birth=party.date_of_birth,
        place_of_birth=party.place_of_birth,
        nationality=party.nationality,
        identification_type=party.identification_type,
        identification_number=party.identification_number,
        passport_number=party.passport_number,
        known_aliases=party.known_aliases,
        address=party.address,
        city=party.city,
        state=party.state,
        country=party.country,
        postal_code=party.postal_code,
        phone=party.phone,
        email=party.email,
        occupation=party.occupation,
        employer=party.employer,
        physical_description=party.physical_description,
        notes=party.notes,
        status=party.status or "ACTIVE",
        created_by=current_user.id,
        created_at=datetime.utcnow()
    )
    
    try:
        db.add(db_party)
        db.commit()
        db.refresh(db_party)
        
        return PartyResponse.from_orm(db_party)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create party: {str(e)}"
        )

@router.get("/{party_id}", response_model=PartyWithCases)
async def get_party(
    party_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get party details with associated cases"""
    
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )
    
    return PartyWithCases.from_orm(party)

@router.get("/", response_model=List[PartyResponse])
async def list_parties(
    type: Optional[str] = None,
    status: Optional[str] = None,
    nationality: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List parties with optional filters"""
    
    query = db.query(Party)
    
    if type:
        query = query.filter(Party.type == type)
    if status:
        query = query.filter(Party.status == status)
    if nationality:
        query = query.filter(Party.nationality == nationality)
    
    parties = query.offset(skip).limit(limit).all()
    return [PartyResponse.from_orm(party) for party in parties]

@router.put("/{party_id}", response_model=PartyResponse)
async def update_party(
    party_id: str,
    party_update: PartyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update party information"""
    
    db_party = db.query(Party).filter(Party.id == party_id).first()
    if not db_party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )
    
    # Update fields
    update_data = party_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_party, field, value)
    
    db_party.updated_at = datetime.utcnow()
    db_party.updated_by = current_user.id
    
    try:
        db.commit()
        db.refresh(db_party)
        return PartyResponse.from_orm(db_party)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update party: {str(e)}"
        )

@router.delete("/{party_id}")
async def delete_party(
    party_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete party (soft delete)"""
    
    db_party = db.query(Party).filter(Party.id == party_id).first()
    if not db_party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )
    
    # Soft delete
    db_party.status = "DELETED"
    db_party.updated_at = datetime.utcnow()
    db_party.updated_by = current_user.id
    
    try:
        db.commit()
        return {"message": "Party deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete party: {str(e)}"
        )

@router.post("/search", response_model=List[PartySearchResponse])
async def search_parties(
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    identification_number: Optional[str] = None,
    passport_number: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    date_of_birth: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Advanced party search with multiple criteria"""
    
    query = db.query(Party).filter(Party.status != "DELETED")
    
    if first_name:
        query = query.filter(Party.first_name.ilike(f"%{first_name}%"))
    if last_name:
        query = query.filter(Party.last_name.ilike(f"%{last_name}%"))
    if identification_number:
        query = query.filter(Party.identification_number == identification_number)
    if passport_number:
        query = query.filter(Party.passport_number == passport_number)
    if email:
        query = query.filter(Party.email.ilike(f"%{email}%"))
    if phone:
        query = query.filter(Party.phone.ilike(f"%{phone}%"))
    if date_of_birth:
        query = query.filter(Party.date_of_birth == date_of_birth)
    
    parties = query.limit(50).all()  # Limit search results
    return [PartySearchResponse.from_orm(party) for party in parties]

@router.post("/{party_id}/associate-case/{case_id}")
async def associate_party_to_case(
    party_id: str,
    case_id: str,
    role: str,  # Role of party in this specific case (e.g., "PRIMARY_SUSPECT", "WITNESS", "VICTIM")
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Associate a party to a case with a specific role"""
    
    # Check if party exists
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )
    
    # Check if case exists
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Create association (assuming we have a CaseParty association table)
    from app.models.case_party import CaseParty
    
    # Check if association already exists
    existing = db.query(CaseParty).filter(
        CaseParty.case_id == case_id,
        CaseParty.party_id == party_id
    ).first()
    
    if existing:
        # Update existing association
        existing.role = role
        existing.updated_at = datetime.utcnow()
        existing.updated_by = current_user.id
    else:
        # Create new association
        association = CaseParty(
            id=str(uuid.uuid4()),
            case_id=case_id,
            party_id=party_id,
            role=role,
            created_by=current_user.id,
            created_at=datetime.utcnow()
        )
        db.add(association)
    
    try:
        db.commit()
        return {
            "message": "Party associated to case successfully",
            "party_id": party_id,
            "case_id": case_id,
            "role": role
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to associate party to case: {str(e)}"
        )

@router.delete("/{party_id}/dissociate-case/{case_id}")
async def dissociate_party_from_case(
    party_id: str,
    case_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove association between party and case"""
    
    from app.models.case_party import CaseParty
    
    association = db.query(CaseParty).filter(
        CaseParty.case_id == case_id,
        CaseParty.party_id == party_id
    ).first()
    
    if not association:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party-case association not found"
        )
    
    try:
        db.delete(association)
        db.commit()
        return {"message": "Party dissociated from case successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to dissociate party from case: {str(e)}"
        )

@router.get("/case/{case_id}", response_model=List[PartyResponse])
async def get_parties_by_case(
    case_id: str,
    type: Optional[str] = None,  # Filter by party type
    role: Optional[str] = None,  # Filter by role in case
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all parties associated with a case"""
    
    # Check if case exists
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    from app.models.case_party import CaseParty
    
    query = db.query(Party).join(CaseParty).filter(
        CaseParty.case_id == case_id,
        Party.status != "DELETED"
    )
    
    if type:
        query = query.filter(Party.type == type)
    if role:
        query = query.filter(CaseParty.role == role)
    
    parties = query.all()
    return [PartyResponse.from_orm(party) for party in parties]

@router.get("/suspects", response_model=List[PartyResponse])
async def list_suspects(
    status: Optional[str] = None,
    nationality: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all suspects"""
    
    query = db.query(Party).filter(Party.type == "SUSPECT")
    
    if status:
        query = query.filter(Party.status == status)
    if nationality:
        query = query.filter(Party.nationality == nationality)
    
    suspects = query.offset(skip).limit(limit).all()
    return [PartyResponse.from_orm(suspect) for suspect in suspects]

@router.get("/victims", response_model=List[PartyResponse])
async def list_victims(
    status: Optional[str] = None,
    nationality: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all victims"""
    
    query = db.query(Party).filter(Party.type == "VICTIM")
    
    if status:
        query = query.filter(Party.status == status)
    if nationality:
        query = query.filter(Party.nationality == nationality)
    
    victims = query.offset(skip).limit(limit).all()
    return [PartyResponse.from_orm(victim) for victim in victims]

@router.get("/witnesses", response_model=List[PartyResponse])
async def list_witnesses(
    status: Optional[str] = None,
    nationality: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all witnesses"""
    
    query = db.query(Party).filter(Party.type == "WITNESS")
    
    if status:
        query = query.filter(Party.status == status)
    if nationality:
        query = query.filter(Party.nationality == nationality)
    
    witnesses = query.offset(skip).limit(limit).all()
    return [PartyResponse.from_orm(witness) for witness in witnesses]

@router.get("/{party_id}/duplicate-check")
async def check_for_duplicates(
    party_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check for potential duplicate parties"""
    
    party = db.query(Party).filter(Party.id == party_id).first()
    if not party:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Party not found"
        )
    
    potential_duplicates = []
    
    # Check by identification number
    if party.identification_number:
        duplicates = db.query(Party).filter(
            Party.identification_number == party.identification_number,
            Party.id != party_id,
            Party.status != "DELETED"
        ).all()
        potential_duplicates.extend([{
            "party_id": dup.id,
            "match_type": "IDENTIFICATION_NUMBER",
            "match_value": dup.identification_number,
            "confidence": "HIGH",
            "first_name": dup.first_name,
            "last_name": dup.last_name
        } for dup in duplicates])
    
    # Check by passport number
    if party.passport_number:
        duplicates = db.query(Party).filter(
            Party.passport_number == party.passport_number,
            Party.id != party_id,
            Party.status != "DELETED"
        ).all()
        potential_duplicates.extend([{
            "party_id": dup.id,
            "match_type": "PASSPORT_NUMBER",
            "match_value": dup.passport_number,
            "confidence": "HIGH",
            "first_name": dup.first_name,
            "last_name": dup.last_name
        } for dup in duplicates])
    
    # Check by name and date of birth
    if party.first_name and party.last_name and party.date_of_birth:
        duplicates = db.query(Party).filter(
            Party.first_name.ilike(party.first_name),
            Party.last_name.ilike(party.last_name),
            Party.date_of_birth == party.date_of_birth,
            Party.id != party_id,
            Party.status != "DELETED"
        ).all()
        potential_duplicates.extend([{
            "party_id": dup.id,
            "match_type": "NAME_AND_DOB",
            "match_value": f"{dup.first_name} {dup.last_name} ({dup.date_of_birth})",
            "confidence": "MEDIUM",
            "first_name": dup.first_name,
            "last_name": dup.last_name
        } for dup in duplicates])
    
    return {
        "party_id": party_id,
        "potential_duplicates": potential_duplicates,
        "total_found": len(potential_duplicates)
    }