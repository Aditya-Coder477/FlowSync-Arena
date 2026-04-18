"""
Google Cloud Logging integration.

When CLOUD_LOGGING_ENABLED=true (production), this module installs the
google-cloud-logging handler so all Python logging output is forwarded to
Cloud Logging as structured JSON, enabling Log Explorer queries and
Cloud Monitoring log-based metrics.

When disabled (default for local development), standard Python logging is used.

The handler is installed on the root logger so all modules benefit automatically.

Required package (production only):
    google-cloud-logging>=3.10.0

Usage in main.py lifespan:
    from app.services.cloud_logging import setup_cloud_logging
    setup_cloud_logging()
"""
from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)


def setup_cloud_logging() -> None:
    """
    Configure Cloud Logging if CLOUD_LOGGING_ENABLED is set to 'true'.

    This is idempotent — calling it multiple times is safe (the handler is
    only installed once).

    In Cloud Run, structured logs are also captured from stdout/stderr, but
    using the official library provides additional metadata like trace IDs,
    http request context, and log severity routing.
    """
    enabled = os.environ.get("CLOUD_LOGGING_ENABLED", "false").lower() == "true"

    if not enabled:
        logger.info(
            "Cloud Logging disabled (CLOUD_LOGGING_ENABLED=false). "
            "Using standard Python logging."
        )
        return

    try:
        import google.cloud.logging as cloud_logging  # type: ignore
        from google.cloud.logging.handlers import CloudLoggingHandler  # type: ignore

        # Avoid installing the handler twice (e.g. during testing or hot reload)
        root_logger = logging.getLogger()
        for handler in root_logger.handlers:
            if isinstance(handler, CloudLoggingHandler):
                logger.debug("Cloud Logging handler already installed.")
                return

        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT")
        client = cloud_logging.Client(project=project_id)

        # Install the handler on the root logger
        # This replaces the default StreamHandler output with structured JSON
        client.setup_logging(
            log_level=logging.INFO,
            excluded_loggers=("werkzeug", "urllib3.connectionpool"),
        )

        logger.info(
            f"Cloud Logging activated for project '{project_id}'. "
            "All logs will be sent to Cloud Logging."
        )

    except ImportError:
        logger.warning(
            "google-cloud-logging package not installed. "
            "Continuing with standard Python logging. "
            "Add 'google-cloud-logging>=3.10.0' to requirements.txt for production."
        )
    except Exception as exc:
        logger.warning(
            f"Failed to initialize Cloud Logging: {exc}. "
            "Continuing with standard Python logging."
        )


def get_structured_logger(name: str) -> logging.Logger:
    """
    Return a standard logger whose output is automatically routed to
    Cloud Logging when the handler is active.

    All log records include the 'name' field which appears as the
    logName label in Cloud Logging. Use this in service modules for
    easy per-service log filtering.
    """
    return logging.getLogger(name)
