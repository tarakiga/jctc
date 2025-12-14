"""
SIEM (Security Information and Event Management) integration module.

Provides audit log export capabilities to external SIEM systems
via webhooks, Syslog, and standard formats (CEF, LEEF, JSON).
"""
import asyncio
import aiohttp
import socket
import json
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any
from enum import Enum

from app.models.audit import AuditLog


logger = logging.getLogger(__name__)


class SIEMFormat(str, Enum):
    """Supported SIEM log formats."""
    JSON = "json"
    CEF = "cef"      # Common Event Format (ArcSight, Splunk)
    LEEF = "leef"    # Log Event Extended Format (IBM QRadar)
    SYSLOG = "syslog"


class SIEMExporter:
    """
    Export audit logs to SIEM systems.
    
    Supports:
    - Webhook-based delivery (HTTP POST)
    - Syslog delivery (UDP/TCP)
    - Multiple formats (JSON, CEF, LEEF)
    """
    
    def __init__(
        self,
        webhook_url: Optional[str] = None,
        syslog_host: Optional[str] = None,
        syslog_port: int = 514,
        syslog_protocol: str = "UDP",
        format: SIEMFormat = SIEMFormat.JSON,
        webhook_headers: Optional[Dict[str, str]] = None,
        batch_size: int = 100
    ):
        self.webhook_url = webhook_url
        self.syslog_host = syslog_host
        self.syslog_port = syslog_port
        self.syslog_protocol = syslog_protocol.upper()
        self.format = format
        self.webhook_headers = webhook_headers or {"Content-Type": "application/json"}
        self.batch_size = batch_size
        
        # Facility and severity mappings for Syslog
        self.facility = 10  # Security/authorization (authpriv)
        self.severity_map = {
            "LOW": 6,       # Informational
            "MEDIUM": 5,    # Notice
            "HIGH": 4,      # Warning
            "CRITICAL": 2   # Critical
        }
    
    async def export_logs(self, logs: List[AuditLog]) -> Dict[str, Any]:
        """
        Export a batch of audit logs to configured SIEM systems.
        
        Args:
            logs: List of AuditLog entries to export
            
        Returns:
            Dict with export results and any errors
        """
        results = {
            "exported": 0,
            "failed": 0,
            "errors": []
        }
        
        # Format logs
        formatted_logs = [self._format_log(log) for log in logs]
        
        # Export to webhook if configured
        if self.webhook_url:
            webhook_result = await self._export_to_webhook(formatted_logs)
            results["webhook"] = webhook_result
            if webhook_result.get("success"):
                results["exported"] += len(logs)
            else:
                results["failed"] += len(logs)
                results["errors"].append(webhook_result.get("error"))
        
        # Export to Syslog if configured
        if self.syslog_host:
            syslog_result = await self._export_to_syslog(logs)
            results["syslog"] = syslog_result
            if syslog_result.get("success"):
                results["exported"] += len(logs)
            else:
                results["failed"] += len(logs)
                results["errors"].append(syslog_result.get("error"))
        
        return results
    
    async def _export_to_webhook(self, logs: List[Dict]) -> Dict[str, Any]:
        """Export logs to webhook endpoint."""
        try:
            async with aiohttp.ClientSession() as session:
                payload = {
                    "source": "JCTC",
                    "timestamp": datetime.utcnow().isoformat(),
                    "event_count": len(logs),
                    "events": logs
                }
                
                async with session.post(
                    self.webhook_url,
                    json=payload,
                    headers=self.webhook_headers,
                    timeout=30
                ) as response:
                    if response.status in [200, 201, 202]:
                        return {"success": True, "status": response.status}
                    else:
                        return {
                            "success": False,
                            "status": response.status,
                            "error": await response.text()
                        }
        except Exception as e:
            logger.error(f"Webhook export failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _export_to_syslog(self, logs: List[AuditLog]) -> Dict[str, Any]:
        """Export logs to Syslog server."""
        try:
            if self.syslog_protocol == "UDP":
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            else:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.connect((self.syslog_host, self.syslog_port))
            
            sent_count = 0
            for log in logs:
                message = self._format_syslog_message(log)
                sock.sendto(message.encode(), (self.syslog_host, self.syslog_port))
                sent_count += 1
            
            sock.close()
            return {"success": True, "sent": sent_count}
            
        except Exception as e:
            logger.error(f"Syslog export failed: {e}")
            return {"success": False, "error": str(e)}
    
    def _format_log(self, log: AuditLog) -> Dict[str, Any]:
        """Format a log entry based on configured format."""
        if self.format == SIEMFormat.CEF:
            return self._format_cef(log)
        elif self.format == SIEMFormat.LEEF:
            return self._format_leef(log)
        else:
            return self._format_json(log)
    
    def _format_json(self, log: AuditLog) -> Dict[str, Any]:
        """Format log as JSON."""
        return {
            "id": str(log.id),
            "timestamp": log.created_at.isoformat() if log.created_at else None,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": str(log.entity_id) if log.entity_id else None,
            "user_id": str(log.user_id) if log.user_id else None,
            "ip_address": log.ip_address,
            "severity": log.severity,
            "description": log.description,
            "details": log.details,
            "checksum": log.checksum
        }
    
    def _format_cef(self, log: AuditLog) -> str:
        """
        Format log as Common Event Format (CEF).
        
        CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
        """
        severity = self._cef_severity(log.severity)
        
        # Build extension fields
        extensions = []
        if log.user_id:
            extensions.append(f"suser={log.user_id}")
        if log.ip_address:
            extensions.append(f"src={log.ip_address}")
        if log.entity_type:
            extensions.append(f"cs1={log.entity_type}")
            extensions.append("cs1Label=EntityType")
        if log.entity_id:
            extensions.append(f"cs2={log.entity_id}")
            extensions.append("cs2Label=EntityID")
        if log.created_at:
            extensions.append(f"rt={int(log.created_at.timestamp() * 1000)}")
        
        extension_str = " ".join(extensions)
        
        return (
            f"CEF:0|JCTC|CaseManagement|1.0|{log.action}|"
            f"{log.description or log.action}|{severity}|{extension_str}"
        )
    
    def _format_leef(self, log: AuditLog) -> str:
        """
        Format log as Log Event Extended Format (LEEF) for IBM QRadar.
        
        LEEF:Version|Vendor|Product|Version|EventID|
        """
        fields = []
        if log.user_id:
            fields.append(f"usrName={log.user_id}")
        if log.ip_address:
            fields.append(f"src={log.ip_address}")
        if log.created_at:
            fields.append(f"devTime={log.created_at.strftime('%b %d %Y %H:%M:%S')}")
        if log.severity:
            fields.append(f"sev={self._leef_severity(log.severity)}")
        if log.entity_type:
            fields.append(f"cat={log.entity_type}")
        
        return f"LEEF:2.0|JCTC|CaseManagement|1.0|{log.action}|{chr(9).join(fields)}"
    
    def _format_syslog_message(self, log: AuditLog) -> str:
        """Format as RFC 5424 Syslog message."""
        severity = self.severity_map.get(log.severity, 6)
        priority = (self.facility * 8) + severity
        
        timestamp = log.created_at.strftime("%Y-%m-%dT%H:%M:%S.%fZ") if log.created_at else "-"
        hostname = "jctc-cms"
        app_name = "audit"
        proc_id = "-"
        msg_id = log.action or "-"
        
        # Structured data
        sd = f'[audit@JCTC entity_type="{log.entity_type}" entity_id="{log.entity_id}"]'
        
        message = log.description or ""
        
        return f"<{priority}>1 {timestamp} {hostname} {app_name} {proc_id} {msg_id} {sd} {message}"
    
    def _cef_severity(self, severity: str) -> int:
        """Map severity to CEF severity (0-10)."""
        mapping = {"LOW": 2, "MEDIUM": 5, "HIGH": 7, "CRITICAL": 10}
        return mapping.get(severity, 5)
    
    def _leef_severity(self, severity: str) -> int:
        """Map severity to LEEF severity (1-10)."""
        mapping = {"LOW": 2, "MEDIUM": 5, "HIGH": 7, "CRITICAL": 9}
        return mapping.get(severity, 5)


class SIEMConfiguration:
    """SIEM configuration from settings."""
    
    def __init__(
        self,
        enabled: bool = False,
        webhook_url: Optional[str] = None,
        webhook_api_key: Optional[str] = None,
        syslog_host: Optional[str] = None,
        syslog_port: int = 514,
        syslog_protocol: str = "UDP",
        format: str = "json",
        export_interval_seconds: int = 60,
        batch_size: int = 100
    ):
        self.enabled = enabled
        self.webhook_url = webhook_url
        self.webhook_api_key = webhook_api_key
        self.syslog_host = syslog_host
        self.syslog_port = syslog_port
        self.syslog_protocol = syslog_protocol
        self.format = SIEMFormat(format) if format else SIEMFormat.JSON
        self.export_interval_seconds = export_interval_seconds
        self.batch_size = batch_size
    
    def create_exporter(self) -> SIEMExporter:
        """Create a SIEMExporter from this configuration."""
        headers = {"Content-Type": "application/json"}
        if self.webhook_api_key:
            headers["Authorization"] = f"Bearer {self.webhook_api_key}"
        
        return SIEMExporter(
            webhook_url=self.webhook_url,
            syslog_host=self.syslog_host,
            syslog_port=self.syslog_port,
            syslog_protocol=self.syslog_protocol,
            format=self.format,
            webhook_headers=headers,
            batch_size=self.batch_size
        )
