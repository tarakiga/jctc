"""
SSO (Single Sign-On) integration utilities.

Provides OAuth2/OIDC abstraction for Keycloak, Azure AD, and Okta.
"""
import httpx
from typing import Optional, Dict, Any, List
from enum import Enum
from pydantic import BaseModel
from fastapi import HTTPException, status
import logging


logger = logging.getLogger(__name__)


class SSOProvider(str, Enum):
    """Supported SSO providers."""
    KEYCLOAK = "keycloak"
    AZURE_AD = "azure_ad"
    OKTA = "okta"
    GENERIC_OIDC = "generic_oidc"


class SSOConfiguration(BaseModel):
    """SSO provider configuration."""
    enabled: bool = False
    provider: SSOProvider = SSOProvider.KEYCLOAK
    client_id: str = ""
    client_secret: str = ""
    authorization_url: str = ""
    token_url: str = ""
    userinfo_url: str = ""
    logout_url: Optional[str] = None
    jwks_url: Optional[str] = None
    scopes: List[str] = ["openid", "profile", "email"]
    
    # Provider-specific settings
    tenant_id: Optional[str] = None  # For Azure AD
    realm: Optional[str] = None      # For Keycloak
    domain: Optional[str] = None     # For Okta
    
    # Session settings
    session_timeout_minutes: int = 30
    max_concurrent_sessions: int = 5


class SSOUserInfo(BaseModel):
    """Standardized user info from SSO provider."""
    sub: str                          # Subject (unique user ID)
    email: str
    name: Optional[str] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None
    preferred_username: Optional[str] = None
    groups: List[str] = []
    roles: List[str] = []
    raw_claims: Dict[str, Any] = {}


class SSOClient:
    """
    OAuth2/OIDC client for SSO integration.
    
    Usage:
        config = SSOConfiguration(
            enabled=True,
            provider=SSOProvider.KEYCLOAK,
            client_id="jctc-app",
            ...
        )
        client = SSOClient(config)
        
        # Get authorization URL
        auth_url = client.get_authorization_url(state, redirect_uri)
        
        # Exchange code for token
        token = await client.exchange_code(code, redirect_uri)
        
        # Get user info
        user_info = await client.get_user_info(access_token)
    """
    
    def __init__(self, config: SSOConfiguration):
        self.config = config
        self._http_client = None
    
    @property
    def http_client(self) -> httpx.AsyncClient:
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client
    
    def get_authorization_url(
        self,
        state: str,
        redirect_uri: str,
        nonce: Optional[str] = None
    ) -> str:
        """
        Generate the authorization URL for SSO login.
        
        Args:
            state: Random state for CSRF protection
            redirect_uri: Callback URL after authentication
            nonce: Optional nonce for ID token validation
            
        Returns:
            Authorization URL to redirect user to
        """
        params = {
            "client_id": self.config.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(self.config.scopes),
            "state": state
        }
        
        if nonce:
            params["nonce"] = nonce
        
        # Provider-specific parameters
        if self.config.provider == SSOProvider.AZURE_AD:
            params["response_mode"] = "query"
        
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{self.config.authorization_url}?{query_string}"
    
    async def exchange_code(
        self,
        code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """
        Exchange authorization code for tokens.
        
        Args:
            code: Authorization code from callback
            redirect_uri: Same redirect URI used in authorization
            
        Returns:
            Token response containing access_token, id_token, refresh_token
        """
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri,
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret
        }
        
        response = await self.http_client.post(
            self.config.token_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code != 200:
            logger.error(f"Token exchange failed: {response.text}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="SSO token exchange failed"
            )
        
        return response.json()
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token."""
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": self.config.client_id,
            "client_secret": self.config.client_secret
        }
        
        response = await self.http_client.post(
            self.config.token_url,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token refresh failed"
            )
        
        return response.json()
    
    async def get_user_info(self, access_token: str) -> SSOUserInfo:
        """
        Get user information from SSO provider.
        
        Args:
            access_token: Access token from token exchange
            
        Returns:
            Standardized user info object
        """
        response = await self.http_client.get(
            self.config.userinfo_url,
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Failed to get user info from SSO provider"
            )
        
        claims = response.json()
        return self._normalize_user_info(claims)
    
    def _normalize_user_info(self, claims: Dict[str, Any]) -> SSOUserInfo:
        """Normalize user info from different providers."""
        # Extract groups/roles based on provider
        groups = []
        roles = []
        
        if self.config.provider == SSOProvider.KEYCLOAK:
            # Keycloak puts roles in realm_access and resource_access
            realm_access = claims.get("realm_access", {})
            roles = realm_access.get("roles", [])
            groups = claims.get("groups", [])
            
        elif self.config.provider == SSOProvider.AZURE_AD:
            # Azure AD uses 'groups' and 'roles' claims
            groups = claims.get("groups", [])
            roles = claims.get("roles", [])
            
        elif self.config.provider == SSOProvider.OKTA:
            # Okta uses 'groups' claim
            groups = claims.get("groups", [])
        
        return SSOUserInfo(
            sub=claims.get("sub", ""),
            email=claims.get("email", claims.get("upn", "")),
            name=claims.get("name"),
            given_name=claims.get("given_name"),
            family_name=claims.get("family_name"),
            preferred_username=claims.get("preferred_username", claims.get("email")),
            groups=groups,
            roles=roles,
            raw_claims=claims
        )
    
    def get_logout_url(self, redirect_uri: Optional[str] = None) -> Optional[str]:
        """Get SSO logout URL."""
        if not self.config.logout_url:
            return None
        
        if redirect_uri:
            return f"{self.config.logout_url}?redirect_uri={redirect_uri}"
        return self.config.logout_url
    
    async def close(self):
        """Close HTTP client."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None


def map_sso_role_to_user_role(sso_roles: List[str], sso_groups: List[str]) -> str:
    """
    Map SSO roles/groups to JCTC UserRole.
    
    Override this function to customize role mapping for your SSO provider.
    """
    from app.models.user import UserRole
    
    # Role mapping (customize based on your SSO configuration)
    role_mapping = {
        # Keycloak/Generic roles
        "jctc-admin": UserRole.ADMIN,
        "jctc-supervisor": UserRole.SUPERVISOR,
        "jctc-prosecutor": UserRole.PROSECUTOR,
        "jctc-investigator": UserRole.INVESTIGATOR,
        "jctc-forensic": UserRole.FORENSIC,
        "jctc-liaison": UserRole.LIAISON,
        "jctc-intake": UserRole.INTAKE,
        
        # Azure AD group names (customize as needed)
        "JCTC Administrators": UserRole.ADMIN,
        "JCTC Supervisors": UserRole.SUPERVISOR,
        "JCTC Prosecutors": UserRole.PROSECUTOR,
        "JCTC Investigators": UserRole.INVESTIGATOR,
    }
    
    # Check roles first
    for role in sso_roles:
        if role.lower() in [k.lower() for k in role_mapping.keys()]:
            for key, value in role_mapping.items():
                if role.lower() == key.lower():
                    return value
    
    # Then check groups
    for group in sso_groups:
        if group in role_mapping:
            return role_mapping[group]
    
    # Default to INVESTIGATOR if no mapping found
    return UserRole.INVESTIGATOR
