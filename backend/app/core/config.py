from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    jwt_secret_key: str
    port: int = 8000

    anthropic_api_key: str = ""
    gemini_api_key: str = ""

    elevenlabs_api_key: str = ""
    elevenlabs_voice_id: str = ""

    gcs_bucket_name: str = ""
    gcs_service_account_json_b64: str = ""
    google_cloud_project: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
