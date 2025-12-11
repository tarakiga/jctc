# ==================== COURT SESSIONS MANAGEMENT ====================

@router.get("/{case_id}/court-sessions/")
async def get_court_sessions(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all court sessions for a case."""
    from app.models.prosecution import CourtSession
    
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")
    
    result = await db.execute(
        select(CourtSession)
        .where(CourtSession.case_id == case_id)
        .order_by(CourtSession.session_date.desc())
    )
    sessions = result.scalars().all()
    
    return [{
        "id": str(session.id),
        "case_id": str(session.case_id),
        "session_date": session.session_date.isoformat() if session.session_date else None,
        "court": session.court,
        "judge": session.judge,
        "session_type": session.session_type,
        "notes": session.notes,
        "created_at": session.created_at.isoformat() if session.created_at else None
    } for session in sessions]


@router.post("/{case_id}/court-sessions/")
async def create_court_session(
    case_id: UUID,
    session_data: Dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new court session for a case."""
    from app.models.prosecution import CourtSession
    from datetime import datetime
    
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")
    
    session_date = datetime.fromisoformat(session_data.get('session_date').replace('Z', '+00:00')) if session_data.get('session_date') else None
    
    new_session = CourtSession(
        case_id=case_id,
        session_date=session_date,
        court=session_data.get('court'),
        judge=session_data.get('judge'),
        session_type=session_data.get('session_type'),
        notes=session_data.get('notes')
    )
    
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)
    
    return {
        "id": str(new_session.id),
        "case_id": str(new_session.case_id),
        "session_date": new_session.session_date.isoformat() if new_session.session_date else None,
        "court": new_session.court,
        "judge": new_session.judge,
        "session_type": new_session.session_type,
        "notes": new_session.notes,
        "created_at": new_session.created_at.isoformat() if new_session.created_at else None
    }


# ==================== CASE OUTCOMES MANAGEMENT ====================

@router.get("/{case_id}/outcomes/")
async def get_case_outcomes(
    case_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all outcomes for a case."""
    from app.models.prosecution import Outcome
    
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")
    
    result = await db.execute(
        select(Outcome)
        .where(Outcome.case_id == case_id)
        .order_by(Outcome.closed_at.desc())
    )
    outcomes = result.scalars().all()
    
    return [{
        "id": str(outcome.id),
        "case_id": str(outcome.case_id),
        "disposition": outcome.disposition.value if outcome.disposition else None,
        "sentence": outcome.sentence,
        "restitution": float(outcome.restitution) if outcome.restitution else None,
        "closed_at": outcome.closed_at.isoformat() if outcome.closed_at else None,
        "notes": outcome.notes,
        "created_at": outcome.created_at.isoformat() if outcome.created_at else None
    } for outcome in outcomes]


@router.post("/{case_id}/outcomes/")
async def create_case_outcome(
    case_id: UUID,
    outcome_data: Dict = Body(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Record a case outcome."""
    from app.models.prosecution import Outcome, Disposition
    from datetime import datetime
    from decimal import Decimal
    
    case_result = await db.execute(select(Case).where(Case.id == case_id))
    case_obj = case_result.scalar_one_or_none()
    
    if not case_obj:
        raise HTTPException(status_code=404, detail="Case not found")
    
    closed_at = datetime.fromisoformat(outcome_data.get('closed_at').replace('Z', '+00:00')) if outcome_data.get('closed_at') else datetime.utcnow()
    
    restitution = None
    if outcome_data.get('restitution'):
        restitution = Decimal(str(outcome_data['restitution']))
    
    new_outcome = Outcome(
        case_id=case_id,
        disposition=Disposition(outcome_data.get('disposition')) if outcome_data.get('disposition') else None,
        sentence=outcome_data.get('sentence'),
        restitution=restitution,
        closed_at=closed_at,
        notes=outcome_data.get('notes')
    )
    
    db.add(new_outcome)
    await db.commit()
    await db.refresh(new_outcome)
    
    return {
        "id": str(new_outcome.id),
        "case_id": str(new_outcome.case_id),
        "disposition": new_outcome.disposition.value if new_outcome.disposition else None,
        "sentence": new_outcome.sentence,
        "restitution": float(new_outcome.restitution) if new_outcome.restitution else None,
        "closed_at": new_outcome.closed_at.isoformat() if new_outcome.closed_at else None,
        "notes": new_outcome.notes,
        "created_at": new_outcome.created_at.isoformat() if new_outcome.created_at else None
    }
