from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Any, Union
from datetime import datetime, date

class SearchQuery(BaseModel):
    """Basic search query"""
    query: str = Field(..., min_length=1, max_length=500, description="Search query text")
    entity_types: Optional[List[str]] = Field(default=["cases", "evidence", "parties", "instruments"])
    limit: Optional[int] = Field(default=20, ge=1, le=100)
    
    @field_validator('entity_types')
    @classmethod
    def validate_entity_types(cls, v):
        valid_types = {"cases", "evidence", "parties", "instruments"}
        if not all(entity_type in valid_types for entity_type in v):
            raise ValueError("Invalid entity types")
        return v

class SearchResult(BaseModel):
    """Individual search result"""
    id: str
    title: str
    subtitle: Optional[str] = None
    description: Optional[str] = None
    entity_type: str
    relevance_score: float
    url: str
    metadata: Dict[str, Any] = {}
    highlighted_fields: Optional[Dict[str, str]] = {}

    class Config:
        from_attributes = True

class EntitySearchResult(BaseModel):
    """Search results for a specific entity type"""
    entity_type: str
    total_results: int
    results: List[SearchResult]
    facets: Optional[Dict[str, List[Dict[str, Any]]]] = {}

    class Config:
        from_attributes = True

class GlobalSearchResponse(BaseModel):
    """Global search response across all entities"""
    query: str
    total_results: int
    search_time_ms: int
    results: Dict[str, List[SearchResult]]
    facets: Dict[str, Any] = {}
    suggestions: List[str] = []
    
    class Config:
        from_attributes = True

class SearchFilter(BaseModel):
    """Search filter definition"""
    field: str
    operator: str = Field(default="equals", description="Filter operator: equals, contains, in, range, exists")
    value: Union[str, int, float, List[str], Dict[str, Any]]
    label: Optional[str] = None

class DateRangeFilter(BaseModel):
    """Date range filter"""
    start: Optional[date] = None
    end: Optional[date] = None
    field: str = "created_at"

class FacetedSearchRequest(BaseModel):
    """Faceted search request with filters and sorting"""
    query: Optional[str] = None
    entity_type: str = Field(..., description="Entity type to search: cases, evidence, parties, instruments")
    filters: Dict[str, Any] = {}
    facets: List[str] = []
    sort_by: Optional[str] = "relevance"
    sort_order: str = Field(default="desc", description="Sort order: asc or desc")
    offset: int = Field(default=0, ge=0)
    limit: int = Field(default=20, ge=1, le=100)
    include_facets: bool = True
    include_highlights: bool = True

    @field_validator('entity_type')
    @classmethod
    def validate_entity_type(cls, v):
        valid_types = {"cases", "evidence", "parties", "instruments"}
        if v not in valid_types:
            raise ValueError("Invalid entity type")
        return v

    @field_validator('sort_order')
    @classmethod
    def validate_sort_order(cls, v):
        if v not in ["asc", "desc"]:
            raise ValueError("Sort order must be 'asc' or 'desc'")
        return v

class FacetValue(BaseModel):
    """Facet value with count"""
    value: str
    count: int
    selected: bool = False

class SearchFacet(BaseModel):
    """Search facet definition"""
    field: str
    label: str
    facet_type: str = Field(default="terms", description="Facet type: terms, range, date_histogram")
    values: List[FacetValue]
    total_values: Optional[int] = None

class FacetedSearchResponse(BaseModel):
    """Faceted search response"""
    query: Optional[str]
    entity_type: str
    total_results: int
    results: List[SearchResult]
    facets: Dict[str, List[FacetValue]]
    pagination: Dict[str, int]
    search_time_ms: int
    applied_filters: Dict[str, Any]

    class Config:
        from_attributes = True

class AdvancedSearchRequest(BaseModel):
    """Advanced search request with complex queries"""
    query: str
    query_type: str = Field(default="simple", description="Query type: simple, boolean, phrase, fuzzy")
    entities: List[Dict[str, Any]] = Field(..., description="Entity configurations with specific queries and filters")
    global_filters: Dict[str, Any] = {}
    boost_fields: Dict[str, float] = {}  # Field boost weights
    max_results_per_entity: int = Field(default=10, ge=1, le=50)
    max_total_results: Optional[int] = Field(default=100, ge=1, le=500)
    minimum_score: float = Field(default=0.0, description="Minimum relevance score threshold")
    include_explanations: bool = False  # Include relevance score explanations

class AdvancedSearchResponse(BaseModel):
    """Advanced search response"""
    query: str
    total_results: int
    results: List[SearchResult]
    search_time_ms: int
    entity_breakdown: Dict[str, int]
    query_explanation: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True

class SearchSuggestion(BaseModel):
    """Search suggestion/autocompletion"""
    text: str
    suggestion_type: str = Field(description="Suggestion type: completion, correction, entity")
    entity_type: Optional[str] = None
    score: float = 1.0
    metadata: Dict[str, Any] = {}

class SearchSuggestionsResponse(BaseModel):
    """Search suggestions response"""
    query: str
    suggestions: List[SearchSuggestion]
    total_suggestions: int

    class Config:
        from_attributes = True

class SavedSearch(BaseModel):
    """Saved search configuration"""
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    query: str
    entity_type: str
    filters: Dict[str, Any] = {}
    sort_config: Dict[str, str] = {}
    alert_enabled: bool = False
    alert_frequency: Optional[str] = None  # daily, weekly, monthly
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    last_run: Optional[datetime] = None

    class Config:
        from_attributes = True

class SearchAlert(BaseModel):
    """Search alert for saved searches"""
    id: str
    saved_search_id: str
    alert_type: str = Field(description="Alert type: new_results, threshold_reached")
    condition: Dict[str, Any]  # Alert conditions
    is_active: bool = True
    last_triggered: Optional[datetime] = None
    trigger_count: int = 0

    class Config:
        from_attributes = True

class SearchAnalytics(BaseModel):
    """Search analytics and metrics"""
    period: str
    total_searches: int
    unique_queries: int
    avg_results_per_search: float
    most_common_queries: List[Dict[str, Any]]
    most_searched_entities: Dict[str, int]
    search_performance_ms: float
    zero_result_queries: List[str]

    class Config:
        from_attributes = True

class BooleanQuery(BaseModel):
    """Boolean search query with must/should/must_not clauses"""
    must: List[Dict[str, Any]] = []
    should: List[Dict[str, Any]] = []
    must_not: List[Dict[str, Any]] = []
    minimum_should_match: Optional[int] = None

class FieldQuery(BaseModel):
    """Field-specific search query"""
    field: str
    query: str
    boost: float = 1.0
    analyzer: Optional[str] = None
    operator: str = "or"  # and/or for multi-term queries

class RangeQuery(BaseModel):
    """Range query for numeric/date fields"""
    field: str
    gte: Optional[Union[int, float, date, datetime]] = None  # greater than or equal
    gt: Optional[Union[int, float, date, datetime]] = None   # greater than
    lte: Optional[Union[int, float, date, datetime]] = None  # less than or equal
    lt: Optional[Union[int, float, date, datetime]] = None   # less than

class FuzzyQuery(BaseModel):
    """Fuzzy search query for approximate matching"""
    field: str
    value: str
    fuzziness: Union[int, str] = "AUTO"  # Edit distance or AUTO
    prefix_length: int = 0
    max_expansions: int = 50

class WildcardQuery(BaseModel):
    """Wildcard search query"""
    field: str
    value: str  # With * and ? wildcards
    case_insensitive: bool = True

class ComplexSearchQuery(BaseModel):
    """Complex search query combining multiple query types"""
    boolean: Optional[BooleanQuery] = None
    fields: List[FieldQuery] = []
    ranges: List[RangeQuery] = []
    fuzzy: List[FuzzyQuery] = []
    wildcards: List[WildcardQuery] = []

class SearchExportRequest(BaseModel):
    """Search results export request"""
    search_request: Union[FacetedSearchRequest, AdvancedSearchRequest]
    export_format: str = Field(default="csv", description="Export format: csv, json, excel")
    include_metadata: bool = True
    max_results: int = Field(default=1000, le=10000)
    fields_to_include: Optional[List[str]] = None

class SearchExportResponse(BaseModel):
    """Search results export response"""
    export_id: str
    status: str = Field(description="Export status: pending, processing, completed, failed")
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class SearchIndexStatus(BaseModel):
    """Search index status and statistics"""
    entity_type: str
    total_documents: int
    indexed_documents: int
    last_updated: datetime
    index_size_mb: float
    search_performance_avg_ms: float

    class Config:
        from_attributes = True