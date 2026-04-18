"""
Google Cloud Secret Manager integration.

Secure fallback pattern:
  - In production (ENVIRONMENT=production): fetch secret value from Secret Manager.
  - Locally: read from environment variable or .env file (via pydantic-settings).

This module is explicitly lazy-imported only when Secret Manager access is needed,
keeping import time low and not breaking local dev when google-cloud-secret-manager
is not installed or no GCP credentials are available.

Usage:
    from app.services.secret_manager import get_secret

    redis_password = get_secret("REDIS_PASSWORD")

The function signature mirrors os.environ.get() so it can be used as a drop-in.

Required package (production only):
    google-cloud-secret-manager>=2.20.0

This package is NOT listed in requirements.txt to avoid import errors locally.
In Cloud Run, add it to requirements.txt before deployment or set
CLOUD_SECRET_MANAGER_ENABLED=false to fall back to env vars.
"""
from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Optional

logger = logging.getLogger(__name__)


def get_secret(
    secret_name: str,
    default: Optional[str] = None,
    *,
    project_id: Optional[str] = None,
    version: str = "latest",
) -> Optional[str]:
    """
    Retrieve a secret value using a secure fallback pattern.

    Resolution order:
    1. If CLOUD_SECRET_MANAGER_ENABLED is false (default locally), read from
       the environment variable with the same name.
    2. If CLOUD_SECRET_MANAGER_ENABLED is true, fetch from Secret Manager.
       Falls back to the environment variable if Secret Manager is unreachable.

    Args:
        secret_name: The name of the secret (e.g. "REDIS_PASSWORD").
                     Must match the Secret Manager secret ID exactly.
        default: Value returned if the secret is not found anywhere.
        project_id: GCP project ID. Defaults to GOOGLE_CLOUD_PROJECT env var.
        version: Secret version. Defaults to "latest".

    Returns:
        The secret value string, or `default` if not found.
    """
    enabled = os.environ.get("CLOUD_SECRET_MANAGER_ENABLED", "false").lower() == "true"

    if not enabled:
        # Local dev / testing: read from environment
        value = os.environ.get(secret_name, default)
        if value is not None:
            logger.debug(f"[SecretManager] Using env var for secret '{secret_name}'.")
        return value

    # Production: try Secret Manager
    _project_id = project_id or os.environ.get("GOOGLE_CLOUD_PROJECT", "")
    if not _project_id:
        logger.warning(
            "[SecretManager] GOOGLE_CLOUD_PROJECT not set. "
            f"Falling back to env var for '{secret_name}'."
        )
        return os.environ.get(secret_name, default)

    try:
        # Lazy import — only available in production where the package is installed
        from google.cloud import secretmanager  # type: ignore
        from google.api_core.exceptions import NotFound, PermissionDenied  # type: ignore

        client = _get_secret_manager_client()
        secret_path = f"projects/{_project_id}/secrets/{secret_name}/versions/{version}"

        response = client.access_secret_version(request={"name": secret_path})
        value = response.payload.data.decode("utf-8")
        logger.info(f"[SecretManager] Fetched secret '{secret_name}' from version '{version}'.")
        return value

    except ImportError:
        logger.warning(
            "[SecretManager] google-cloud-secret-manager not installed. "
            f"Falling back to env var for '{secret_name}'."
        )
    except Exception as exc:
        logger.warning(
            f"[SecretManager] Failed to fetch '{secret_name}': {exc}. "
            "Falling back to environment variable."
        )

    # Final fallback
    return os.environ.get(secret_name, default)


@lru_cache(maxsize=1)
def _get_secret_manager_client():
    """
    Return a cached Secret Manager client.
    Uses Application Default Credentials (ADC) automatically in Cloud Run.
    """
    from google.cloud import secretmanager  # type: ignore

    return secretmanager.SecretManagerServiceClient()


def get_secret_required(secret_name: str, **kwargs) -> str:
    """
    Like get_secret(), but raises RuntimeError if the secret is not found.
    Use this for secrets that are absolutely required for the app to start.
    """
    value = get_secret(secret_name, **kwargs)
    if value is None:
        raise RuntimeError(
            f"Required secret '{secret_name}' not found in Secret Manager or environment. "
            "Set CLOUD_SECRET_MANAGER_ENABLED=true in production and ensure the secret "
            f"exists in project '{kwargs.get('project_id', os.environ.get('GOOGLE_CLOUD_PROJECT', ''))}', "
            "or set the environment variable locally."
        )
    return value
