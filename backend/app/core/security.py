import os
import re
from typing import List, Optional

def sanitize_secrets(text: str, additional_secrets: Optional[List[str]] = None) -> str:
    """
    Sanitizes sensitive information (API keys, GitHub tokens, database passwords) from error messages and logs.
    """
    if not text:
        return text

    sensitive_values = []
    
    # Gather secrets from environment variables
    keys_to_mask = [
        "GOOGLE_API_KEY",
        "GROQ_API_KEY",
        "GITHUB_TOKEN",
        "GITHUB_SECRET",
        "NEXTAUTH_SECRET",
        "DATABASE_URL"
    ]
    
    for key in keys_to_mask:
        val = os.getenv(key)
        if val and len(str(val)) > 4:
            sensitive_values.append(str(val))

    # Add any additional request-specific secrets (like user access tokens)
    if additional_secrets:
        for secret in additional_secrets:
            if secret and len(str(secret)) > 4:
                sensitive_values.append(str(secret))

    # Remove duplicates and sort by length descending to prevent partial masking issues
    sensitive_values = sorted(list(set(sensitive_values)), key=len, reverse=True)

    # 1. Mask git clone URLs with credentials
    # Match patterns like: https://x-access-token:token@github.com/owner/repo or https://username:password@github.com/owner/repo
    text = re.sub(r'https://[^:]+:[^@]+@github\.com', 'https://***@github.com', text)
    text = re.sub(r'https://[^@]+@github\.com', 'https://***@github.com', text)
    
    # 2. Mask explicit x-access-token prefixes
    text = re.sub(r'x-access-token:[a-zA-Z0-9_]+', 'x-access-token:******', text)

    # 3. Mask any specific sensitive values
    for val in sensitive_values:
        text = text.replace(val, "******")

    return text
