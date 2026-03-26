"""Audit log utility."""
import logging
from datetime import datetime

logger = logging.getLogger("audit")


def log_action(admin_id: int, action: str, entity: str, entity_id: int = None, details: dict = None):
    """Log an admin action for audit trail."""
    logger.info(
        "audit_action",
        extra={
            "admin_id": admin_id,
            "action": action,
            "entity": entity,
            "entity_id": entity_id,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat(),
        }
    )
