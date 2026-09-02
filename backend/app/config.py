from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///data/kbds.db"
    redis_url: str = "memory"

    secret_key: str = "change-me-in-production"
    access_token_expire_minutes: int = 60 * 24
    admin_username: str = "admin"
    admin_password: str = "admin"

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    upload_dir: str = "uploads"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3001,http://127.0.0.1:3001"

    seed_sample_products: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
