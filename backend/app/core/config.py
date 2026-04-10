from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # App
    app_name: str = "Voice Clone Studio"
    debug: bool = True

    # Paths
    base_dir: Path = Path(__file__).parent.parent.parent
    uploads_dir: Path = base_dir / "uploads"
    voices_dir: Path = uploads_dir / "voices"
    videos_dir: Path = uploads_dir / "videos"
    logs_dir: Path = base_dir / "logs"

    # Database
    database_url: str = "sqlite:///./voice_clone.db"

    # API Keys (千问)
    qwen_api_key: str = ""
    qwen_model: str = "qwen-tts"

    # 公网访问 URL（CosyVoice 声音注册需要公网可访问的音频 URL）
    # 本地开发可以使用 ngrok 暴露的 URL，如：https://xxxx.ngrok.io
    # 生产环境使用实际域名，如：https://your-domain.com
    public_base_url: str = ""

    # 日志配置
    log_level: str = "INFO"  # DEBUG, INFO, WARNING, ERROR, CRITICAL
    log_format: str = (
        "%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s:%(lineno)d | %(message)s"
    )
    log_to_file: bool = True
    log_file_max_bytes: int = 10 * 1024 * 1024  # 10MB
    log_backup_count: int = 7  # 保留 7 个备份文件

    # 存储配置
    # 可选值: local (本地存储), obs (华为云OBS)
    STORAGE_TYPE: str = "local"

    # 华为云OBS配置（预留）
    OBS_ENDPOINT: str = ""
    OBS_BUCKET: str = ""
    OBS_ACCESS_KEY: str = ""
    OBS_SECRET_KEY: str = ""
    OBS_DOMAIN: str = ""  # OBS自定义域名（可选，用于CDN加速）

    class Config:
        env_file = ".env"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Ensure directories exist
        self.voices_dir.mkdir(parents=True, exist_ok=True)
        self.videos_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)


settings = Settings()
