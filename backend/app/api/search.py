from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, aliased
from sqlalchemy import func, or_, and_, text, case
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date
import re
import json

from app.database import get_db
from app.models.case import Case
from app.models.evidence import Evidence
from app.models.parties import Party
from app.models.legal_instruments import LegalInstrument
from app.models.user import User
from app.schemas.search import (
    SearchQuery,
    SearchResult,
    GlobalSearchResponse,
    FacetedSearchRequest,
    FacetedSearchResponse,
    SearchFacet,
    SearchSuggestion,
    AdvancedSearchRequest,
    AdvancedSearchResponse,
    SearchFilter,
    EntitySearchResult
)
from app.utils.auth import get_current_user
from app.schemas.user import User as UserSchema

router = APIRouter()

@router.post("/global", response_model=GlobalSearchResponse)
async def global_search(
    query: str = Query(..., min_length=2, description="Search query (minimum 2 characters)"),
    limit: int = Query(20, le=100, description="Maximum results per entity type"),
    include_entities: List[str] = Query(["cases", "evidence", "parties", "instruments"], 
                                      description="Entity types to search"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Global search across all entities with relevance ranking"""
    
    results = {}
    total_results = 0
    search_time_start = datetime.now()
    
    # Clean and prepare search query
    clean_query = query.strip().lower()
    search_terms = clean_query.split()
    
    # Search Cases
    if "cases" in include_entities:
        case_results = []
        case_query = db.query(Case).filter(
            or_(
                Case.title.ilike(f"%{clean_query}%"),
                Case.description.ilike(f"%{clean_query}%"),
                Case.case_number.ilike(f"%{clean_query}%"),
                Case.notes.ilike(f"%{clean_query}%")
            )
        )
        
        cases = case_query.limit(limit).all()
        
        for case in cases:
            relevance_score = calculate_text_relevance(clean_query, [
                case.title or "",
                case.description or "",
                case.case_number or "",
                case.notes or ""
            ])
            
            case_results.append({
                "id": case.id,
                "title": case.title,
                "subtitle": f"Case {case.case_number}",
                "description": truncate_text(case.description, 150),
                "entity_type": "case",
                "relevance_score": relevance_score,
                "url": f"/cases/{case.id}",
                "metadata": {
                    "status": case.status,
                    "priority": case.priority,
                    "case_type": case.case_type,
                    "created_at": case.created_at.isoformat() if case.created_at else None
                }
            })
        
        results["cases"] = sorted(case_results, key=lambda x: x["relevance_score"], reverse=True)
        total_results += len(case_results)
    
    # Search Evidence
    if "evidence" in include_entities:
        evidence_results = []
        evidence_query = db.query(Evidence).filter(
            or_(
                Evidence.label.ilike(f"%{clean_query}%"),
                Evidence.description.ilike(f"%{clean_query}%"),
                Evidence.source.ilike(f"%{clean_query}%"),
                Evidence.notes.ilike(f"%{clean_query}%"),
                Evidence.acquired_by.ilike(f"%{clean_query}%")
            )
        )
        
        evidence_items = evidence_query.limit(limit).all()
        
        for evidence in evidence_items:
            relevance_score = calculate_text_relevance(clean_query, [
                evidence.label or "",
                evidence.description or "",
                evidence.source or "",
                evidence.notes or ""
            ])
            
            evidence_results.append({
                "id": evidence.id,
                "title": evidence.label,
                "subtitle": f"Evidence - {evidence.type}",
                "description": truncate_text(evidence.description, 150),
                "entity_type": "evidence",
                "relevance_score": relevance_score,
                "url": f"/evidence/{evidence.id}",
                "metadata": {
                    "status": evidence.status,
                    "type": evidence.type,
                    "case_id": evidence.case_id,
                    "acquired_date": evidence.acquired_date.isoformat() if evidence.acquired_date else None
                }
            })
        
        results["evidence"] = sorted(evidence_results, key=lambda x: x["relevance_score"], reverse=True)
        total_results += len(evidence_results)
    
    # Search Parties
    if "parties" in include_entities:
        party_results = []
        party_query = db.query(Party).filter(
            or_(
                Party.first_name.ilike(f"%{clean_query}%"),
                Party.last_name.ilike(f"%{clean_query}%"),
                Party.email.ilike(f"%{clean_query}%"),
                Party.identification_number.ilike(f"%{clean_query}%"),
                Party.passport_number.ilike(f"%{clean_query}%"),
                Party.known_aliases.ilike(f"%{clean_query}%"),
                Party.address.ilike(f"%{clean_query}%")
            )
        )
        
        parties = party_query.limit(limit).all()
        
        for party in parties:
            full_name = f"{party.first_name or ''} {party.last_name or ''}".strip()
            relevance_score = calculate_text_relevance(clean_query, [
                full_name,
                party.email or "",
                party.identification_number or "",
                party.known_aliases or ""
            ])
            
            party_results.append({
                "id": party.id,
                "title": full_name,
                "subtitle": f"{party.type} - {party.nationality or 'Unknown nationality'}",
                "description": f"ID: {party.identification_number or 'N/A'}, Email: {party.email or 'N/A'}",
                "entity_type": "party",
                "relevance_score": relevance_score,
                "url": f"/parties/{party.id}",
                "metadata": {
                    "type": party.type,
                    "nationality": party.nationality,
                    "status": party.status,
                    "identification_type": party.identification_type
                }
            })
        
        results["parties"] = sorted(party_results, key=lambda x: x["relevance_score"], reverse=True)
        total_results += len(party_results)
    
    # Search Legal Instruments
    if "instruments" in include_entities:
        instrument_results = []
        instrument_query = db.query(LegalInstrument).filter(
            or_(
                LegalInstrument.title.ilike(f"%{clean_query}%"),
                LegalInstrument.description.ilike(f"%{clean_query}%"),
                LegalInstrument.reference_number.ilike(f"%{clean_query}%"),
                LegalInstrument.subject_matter.ilike(f"%{clean_query}%"),
                LegalInstrument.issuing_authority.ilike(f"%{clean_query}%")
            )
        )
        
        instruments = instrument_query.limit(limit).all()
        
        for instrument in instruments:
            relevance_score = calculate_text_relevance(clean_query, [
                instrument.title or "",
                instrument.description or "",
                instrument.reference_number or "",
                instrument.subject_matter or ""
            ])
            
            instrument_results.append({
                "id": instrument.id,
                "title": instrument.title,
                "subtitle": f"{instrument.type} - {instrument.reference_number}",
                "description": truncate_text(instrument.description, 150),
                "entity_type": "legal_instrument",
                "relevance_score": relevance_score,
                "url": f"/legal-instruments/{instrument.id}",
                "metadata": {
                    "type": instrument.type,
                    "status": instrument.status,
                    "priority": instrument.priority,
                    "issuing_country": instrument.issuing_country,
                    "issue_date": instrument.issue_date.isoformat() if instrument.issue_date else None
                }
            })
        
        results["instruments"] = sorted(instrument_results, key=lambda x: x["relevance_score"], reverse=True)
        total_results += len(instrument_results)
    
    search_time = (datetime.now() - search_time_start).total_seconds()
    
    return GlobalSearchResponse(
        query=query,
        total_results=total_results,
        search_time_ms=int(search_time * 1000),
        results=results,
        facets={},  # Will be populated in faceted search
        suggestions=generate_search_suggestions(query, results)
    )

@router.post("/faceted", response_model=FacetedSearchResponse)
async def faceted_search(
    request: FacetedSearchRequest,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Advanced faceted search with filtering and aggregations"""
    
    search_time_start = datetime.now()
    results = []
    facets = {}
    
    # Build base query based on entity type
    if request.entity_type == "cases":
        query = build_case_search_query(db, request)
        facets = build_case_facets(db, request)
    elif request.entity_type == "evidence":
        query = build_evidence_search_query(db, request)
        facets = build_evidence_facets(db, request)
    elif request.entity_type == "parties":
        query = build_party_search_query(db, request)
        facets = build_party_facets(db, request)
    elif request.entity_type == "instruments":
        query = build_instrument_search_query(db, request)
        facets = build_instrument_facets(db, request)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid entity type"
        )
    
    # Apply pagination
    total_count = query.count()
    items = query.offset(request.offset).limit(request.limit).all()
    
    # Format results
    for item in items:
        result = format_search_result(item, request.entity_type)
        results.append(result)
    
    search_time = (datetime.now() - search_time_start).total_seconds()
    
    return FacetedSearchResponse(
        query=request.query,
        entity_type=request.entity_type,
        total_results=total_count,
        results=results,
        facets=facets,
        pagination={
            "offset": request.offset,
            "limit": request.limit,
            "total": total_count,
            "pages": (total_count + request.limit - 1) // request.limit
        },
        search_time_ms=int(search_time * 1000),
        applied_filters=request.filters
    )

@router.post("/advanced", response_model=AdvancedSearchResponse)
async def advanced_search(
    request: AdvancedSearchRequest,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Advanced search with complex boolean queries and field-specific searches"""
    
    search_time_start = datetime.now()
    all_results = []
    
    for entity_config in request.entities:
        entity_type = entity_config["type"]
        entity_query = entity_config.get("query", request.query)
        entity_filters = entity_config.get("filters", {})
        
        if entity_type == "cases":
            query = build_advanced_case_query(db, entity_query, entity_filters)
        elif entity_type == "evidence":
            query = build_advanced_evidence_query(db, entity_query, entity_filters)
        elif entity_type == "parties":
            query = build_advanced_party_query(db, entity_query, entity_filters)
        elif entity_type == "instruments":
            query = build_advanced_instrument_query(db, entity_query, entity_filters)
        else:
            continue
        
        items = query.limit(request.max_results_per_entity).all()
        
        for item in items:
            result = format_advanced_search_result(item, entity_type, entity_query)
            all_results.append(result)
    
    # Sort all results by relevance score
    all_results.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)
    
    # Apply global limit
    if request.max_total_results:
        all_results = all_results[:request.max_total_results]
    
    search_time = (datetime.now() - search_time_start).total_seconds()
    
    return AdvancedSearchResponse(
        query=request.query,
        total_results=len(all_results),
        results=all_results,
        search_time_ms=int(search_time * 1000),
        entity_breakdown={
            entity_type: len([r for r in all_results if r["entity_type"] == entity_type])
            for entity_type in ["case", "evidence", "party", "legal_instrument"]
        }
    )

@router.get("/suggestions")
async def get_search_suggestions(
    query: str = Query(..., min_length=1, description="Partial search query"),
    entity_type: Optional[str] = Query(None, description="Filter suggestions by entity type"),
    limit: int = Query(10, le=20, description="Maximum number of suggestions"),
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get search suggestions and autocompletion"""
    
    suggestions = []
    
    # Case suggestions
    if not entity_type or entity_type == "cases":
        case_suggestions = db.query(Case.title, Case.case_number).filter(
            or_(
                Case.title.ilike(f"%{query}%"),
                Case.case_number.ilike(f"%{query}%")
            )
        ).limit(limit).all()
        
        for title, case_number in case_suggestions:
            if title:
                suggestions.append({
                    "text": title,
                    "type": "case_title",
                    "entity": "cases",
                    "metadata": {"case_number": case_number}
                })
    
    # Evidence suggestions
    if not entity_type or entity_type == "evidence":
        evidence_suggestions = db.query(Evidence.label, Evidence.type).filter(
            Evidence.label.ilike(f"%{query}%")
        ).limit(limit).all()
        
        for label, evidence_type in evidence_suggestions:
            if label:
                suggestions.append({
                    "text": label,
                    "type": "evidence_label",
                    "entity": "evidence",
                    "metadata": {"evidence_type": evidence_type}
                })
    
    # Party suggestions
    if not entity_type or entity_type == "parties":
        party_suggestions = db.query(
            Party.first_name,
            Party.last_name,
            Party.type
        ).filter(
            or_(
                Party.first_name.ilike(f"%{query}%"),
                Party.last_name.ilike(f"%{query}%")
            )
        ).limit(limit).all()
        
        for first_name, last_name, party_type in party_suggestions:
            full_name = f"{first_name or ''} {last_name or ''}".strip()
            if full_name:
                suggestions.append({
                    "text": full_name,
                    "type": "party_name",
                    "entity": "parties",
                    "metadata": {"party_type": party_type}
                })
    
    return {
        "query": query,
        "suggestions": suggestions[:limit],
        "total_suggestions": len(suggestions)
    }

@router.get("/filters/{entity_type}")
async def get_available_filters(
    entity_type: str,
    db: Session = Depends(get_db),
    current_user: UserSchema = Depends(get_current_user)
):
    """Get available filter options for an entity type"""
    
    if entity_type == "cases":
        return get_case_filter_options(db)
    elif entity_type == "evidence":
        return get_evidence_filter_options(db)
    elif entity_type == "parties":
        return get_party_filter_options(db)
    elif entity_type == "instruments":
        return get_instrument_filter_options(db)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid entity type"
        )

# Helper functions

def calculate_text_relevance(query: str, texts: List[str]) -> float:
    """Calculate relevance score for text matching"""
    query_lower = query.lower()
    query_words = query_lower.split()
    total_score = 0.0
    
    for text in texts:
        if not text:
            continue
        
        text_lower = text.lower()
        score = 0.0
        
        # Exact match bonus
        if query_lower in text_lower:
            score += 10.0
        
        # Word matching
        for word in query_words:
            if word in text_lower:
                score += 2.0
        
        # Position bonus (earlier matches score higher)
        position = text_lower.find(query_lower)
        if position != -1:
            position_score = max(0, 5 - position / 10)
            score += position_score
        
        total_score += score
    
    return total_score

def truncate_text(text: str, max_length: int) -> str:
    """Truncate text to specified length"""
    if not text or len(text) <= max_length:
        return text or ""
    
    return text[:max_length - 3] + "..."

def generate_search_suggestions(query: str, results: Dict) -> List[str]:
    """Generate search suggestions based on results"""
    suggestions = []
    
    # Add suggestions based on found entities
    for entity_type, entity_results in results.items():
        if entity_results:
            # Get top result titles as suggestions
            for result in entity_results[:3]:
                if result["title"] not in suggestions:
                    suggestions.append(result["title"])
    
    return suggestions[:5]

def build_case_search_query(db: Session, request: FacetedSearchRequest):
    """Build case search query with filters"""
    query = db.query(Case)
    
    # Text search
    if request.query:
        query = query.filter(
            or_(
                Case.title.ilike(f"%{request.query}%"),
                Case.description.ilike(f"%{request.query}%"),
                Case.case_number.ilike(f"%{request.query}%")
            )
        )
    
    # Apply filters
    if request.filters:
        if "status" in request.filters:
            query = query.filter(Case.status.in_(request.filters["status"]))
        if "priority" in request.filters:
            query = query.filter(Case.priority.in_(request.filters["priority"]))
        if "case_type" in request.filters:
            query = query.filter(Case.case_type.in_(request.filters["case_type"]))
        if "date_range" in request.filters:
            date_range = request.filters["date_range"]
            if "start" in date_range:
                query = query.filter(Case.created_at >= date_range["start"])
            if "end" in date_range:
                query = query.filter(Case.created_at <= date_range["end"])
    
    # Sorting
    if request.sort_by:
        if request.sort_by == "created_at":
            query = query.order_by(Case.created_at.desc() if request.sort_order == "desc" else Case.created_at.asc())
        elif request.sort_by == "title":
            query = query.order_by(Case.title.asc())
        # Add more sort options as needed
    
    return query

def build_case_facets(db: Session, request: FacetedSearchRequest) -> Dict:
    """Build facets for case search"""
    facets = {}
    
    # Status facet
    status_counts = db.query(
        Case.status,
        func.count(Case.id).label('count')
    ).group_by(Case.status).all()
    
    facets["status"] = [
        {"value": status, "count": count, "selected": status in request.filters.get("status", [])}
        for status, count in status_counts
    ]
    
    # Priority facet
    priority_counts = db.query(
        Case.priority,
        func.count(Case.id).label('count')
    ).group_by(Case.priority).all()
    
    facets["priority"] = [
        {"value": priority, "count": count, "selected": priority in request.filters.get("priority", [])}
        for priority, count in priority_counts
    ]
    
    return facets

def format_search_result(item, entity_type: str) -> Dict:
    """Format database item as search result"""
    if entity_type == "cases":
        return {
            "id": item.id,
            "title": item.title,
            "subtitle": f"Case {item.case_number}",
            "description": truncate_text(item.description, 150),
            "entity_type": "case",
            "url": f"/cases/{item.id}",
            "metadata": {
                "status": item.status,
                "priority": item.priority,
                "case_type": item.case_type
            }
        }
    # Add formatting for other entity types...
    return {}

def build_evidence_search_query(db: Session, request: FacetedSearchRequest):
    """Build evidence search query - placeholder"""
    return db.query(Evidence)

def build_evidence_facets(db: Session, request: FacetedSearchRequest):
    """Build evidence facets - placeholder"""
    return {}

def build_party_search_query(db: Session, request: FacetedSearchRequest):
    """Build party search query - placeholder"""
    return db.query(Party)

def build_party_facets(db: Session, request: FacetedSearchRequest):
    """Build party facets - placeholder"""
    return {}

def build_instrument_search_query(db: Session, request: FacetedSearchRequest):
    """Build legal instrument search query - placeholder"""
    return db.query(LegalInstrument)

def build_instrument_facets(db: Session, request: FacetedSearchRequest):
    """Build legal instrument facets - placeholder"""
    return {}

def build_advanced_case_query(db: Session, query: str, filters: Dict):
    """Build advanced case query - placeholder"""
    return db.query(Case).limit(10)

def build_advanced_evidence_query(db: Session, query: str, filters: Dict):
    """Build advanced evidence query - placeholder"""
    return db.query(Evidence).limit(10)

def build_advanced_party_query(db: Session, query: str, filters: Dict):
    """Build advanced party query - placeholder"""
    return db.query(Party).limit(10)

def build_advanced_instrument_query(db: Session, query: str, filters: Dict):
    """Build advanced instrument query - placeholder"""
    return db.query(LegalInstrument).limit(10)

def format_advanced_search_result(item, entity_type: str, query: str) -> Dict:
    """Format advanced search result - placeholder"""
    return {"entity_type": entity_type, "relevance_score": 1.0}

def get_case_filter_options(db: Session) -> Dict:
    """Get available filter options for cases"""
    return {
        "status": db.query(Case.status).distinct().all(),
        "priority": db.query(Case.priority).distinct().all(),
        "case_type": db.query(Case.case_type).distinct().all()
    }

def get_evidence_filter_options(db: Session) -> Dict:
    """Get available filter options for evidence"""
    return {
        "status": db.query(Evidence.status).distinct().all(),
        "type": db.query(Evidence.type).distinct().all()
    }

def get_party_filter_options(db: Session) -> Dict:
    """Get available filter options for parties"""
    return {
        "type": db.query(Party.type).distinct().all(),
        "nationality": db.query(Party.nationality).distinct().all()
    }

def get_instrument_filter_options(db: Session) -> Dict:
    """Get available filter options for legal instruments"""
    return {
        "type": db.query(LegalInstrument.type).distinct().all(),
        "status": db.query(LegalInstrument.status).distinct().all()
    }