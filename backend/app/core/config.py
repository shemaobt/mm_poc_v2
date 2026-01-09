"""
Application configuration
Functional approach with Pydantic Settings
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings - immutable configuration"""

    database_url: str
    port: int = 8000
    anthropic_api_key: str = ""
    gemini_api_key: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


# Pure function to get settings
def get_settings() -> Settings:
    """Get application settings"""
    return Settings()
