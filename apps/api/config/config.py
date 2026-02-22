import os
import yaml
from typing import Literal, Optional
from pydantic import BaseModel
from dotenv import load_dotenv


class CookieConfig(BaseModel):
    domain: str


class GeneralConfig(BaseModel):
    development_mode: bool
    logfire_enabled: bool


class SecurityConfig(BaseModel):
    auth_jwt_secret_key: str


class AIConfig(BaseModel):
    openai_api_key: str | None
    is_ai_enabled: bool | None


class S3ApiConfig(BaseModel):
    bucket_name: str | None
    endpoint_url: str | None


class ContentDeliveryConfig(BaseModel):
    type: Literal["filesystem", "s3api"]
    s3api: S3ApiConfig


class HostingConfig(BaseModel):
    domain: str
    ssl: bool
    port: int
    use_default_org: bool
    allowed_origins: list
    allowed_regexp: str
    self_hosted: bool
    app_base_url: str
    cookie_config: CookieConfig
    content_delivery: ContentDeliveryConfig


class MailingConfig(BaseModel):
    resend_api_key: str
    system_email_address: str


class DatabaseConfig(BaseModel):
    sql_connection_string: Optional[str]


class RedisConfig(BaseModel):
    redis_connection_string: Optional[str]


class InternalPaystackConfig(BaseModel):
    paystack_secret_key: str | None
    paystack_public_key: str | None
    paystack_webhook_secret: str | None


class InternalPaymentsConfig(BaseModel):
    paystack: InternalPaystackConfig


class LearnHouseConfig(BaseModel):
    site_name: str
    site_description: str
    contact_email: str
    general_config: GeneralConfig
    hosting_config: HostingConfig
    database_config: DatabaseConfig
    redis_config: RedisConfig
    security_config: SecurityConfig
    ai_config: AIConfig
    mailing_config: MailingConfig
    payments_config: InternalPaymentsConfig


def get_learnhouse_config() -> LearnHouseConfig:

    load_dotenv()

    # Get the YAML file
    yaml_path = os.path.join(os.path.dirname(__file__), "config.yaml")

    # Load the YAML file
    with open(yaml_path, "r") as f:
        yaml_config = yaml.safe_load(f)
    
    # Ensure yaml_config is not None (defensive programming)
    if yaml_config is None:
        yaml_config = {}

    # General Config

    # Development Mode
    env_development_mode_str = os.environ.get("LEARNHOUSE_DEVELOPMENT_MODE", "None")
    if env_development_mode_str != "None":
        env_development_mode = env_development_mode_str.lower() in ("true", "1", "yes")
    else:
        env_development_mode = None
    development_mode = (
        env_development_mode
        if env_development_mode is not None
        else yaml_config.get("general", {}).get("development_mode")
    )

    # Logfire config
    env_logfire_enabled = os.environ.get("LEARNHOUSE_LOGFIRE_ENABLED", "None")
    logfire_enabled = (
        env_logfire_enabled.lower() == "true" if env_logfire_enabled != "None"
        else yaml_config.get("general", {}).get("logfire_enabled", False)
    )

    # Security Config
    env_auth_jwt_secret_key = os.environ.get("LEARNHOUSE_AUTH_JWT_SECRET_KEY")
    auth_jwt_secret_key = env_auth_jwt_secret_key or yaml_config.get(
        "security", {}
    ).get("auth_jwt_secret_key")

    # Check if environment variables are defined
    env_site_name = os.environ.get("LEARNHOUSE_SITE_NAME")
    env_site_description = os.environ.get("LEARNHOUSE_SITE_DESCRIPTION")
    env_contact_email = os.environ.get("LEARNHOUSE_CONTACT_EMAIL")
    env_domain = os.environ.get("LEARNHOUSE_DOMAIN")
    os.environ.get("LEARNHOUSE_PORT")
    env_ssl = os.environ.get("LEARNHOUSE_SSL")
    env_port = os.environ.get("LEARNHOUSE_PORT")
    env_use_default_org = os.environ.get("LEARNHOUSE_USE_DEFAULT_ORG")
    env_allowed_origins = os.environ.get("LEARNHOUSE_ALLOWED_ORIGINS")
    env_cookie_domain = os.environ.get("LEARNHOUSE_COOKIE_DOMAIN")
    env_app_base_url = os.environ.get("LEARNHOUSE_APP_BASE_URL")

    # Allowed origins should be a comma separated string
    if env_allowed_origins:
        env_allowed_origins = env_allowed_origins.split(",")
    env_allowed_regexp = os.environ.get("LEARNHOUSE_ALLOWED_REGEXP")
    env_self_hosted = os.environ.get("LEARNHOUSE_SELF_HOSTED")
    env_sql_connection_string = os.environ.get("LEARNHOUSE_SQL_CONNECTION_STRING")

    

    # Fill in values with YAML file if they are not provided
    site_name = env_site_name or yaml_config.get("site_name")
    site_description = env_site_description or yaml_config.get("site_description")
    contact_email = env_contact_email or yaml_config.get("contact_email")

    domain = env_domain or yaml_config.get("hosting_config", {}).get("domain")
    ssl = env_ssl or yaml_config.get("hosting_config", {}).get("ssl")
    port = env_port or yaml_config.get("hosting_config", {}).get("port")
    use_default_org = env_use_default_org or yaml_config.get("hosting_config", {}).get(
        "use_default_org"
    )
    allowed_origins = env_allowed_origins or yaml_config.get("hosting_config", {}).get(
        "allowed_origins"
    )
    allowed_regexp = env_allowed_regexp or yaml_config.get("hosting_config", {}).get(
        "allowed_regexp"
    )
    self_hosted = env_self_hosted or yaml_config.get("hosting_config", {}).get(
        "self_hosted"
    )
    app_base_url = env_app_base_url or "http://localhost:3000"  # Read from env or use default

    cookies_domain = env_cookie_domain or yaml_config.get("hosting_config", {}).get(
        "cookies_config", {}
    ).get("domain")
    cookie_config = CookieConfig(domain=cookies_domain)

    env_content_delivery_type = os.environ.get("LEARNHOUSE_CONTENT_DELIVERY_TYPE")
    content_delivery_type: str = env_content_delivery_type or (
        (yaml_config.get("hosting_config", {}).get("content_delivery", {}).get("type"))
        or "filesystem"
    )  # default to filesystem

    env_bucket_name = os.environ.get("LEARNHOUSE_S3_API_BUCKET_NAME")
    env_endpoint_url = os.environ.get("LEARNHOUSE_S3_API_ENDPOINT_URL")
    bucket_name = (
        yaml_config.get("hosting_config", {})
        .get("content_delivery", {})
        .get("s3api", {})
        .get("bucket_name")
    ) or env_bucket_name
    endpoint_url = (
        yaml_config.get("hosting_config", {})
        .get("content_delivery", {})
        .get("s3api", {})
        .get("endpoint_url")
    ) or env_endpoint_url

    content_delivery = ContentDeliveryConfig(
        type=content_delivery_type,  # type: ignore
        s3api=S3ApiConfig(bucket_name=bucket_name, endpoint_url=endpoint_url),  # type: ignore
    )

    # Database config
    sql_connection_string = env_sql_connection_string or yaml_config.get(
        "database_config", {}
    ).get("sql_connection_string")

    # AI Config
    env_openai_api_key = os.environ.get("LEARNHOUSE_OPENAI_API_KEY")
    env_is_ai_enabled_str = os.environ.get("LEARNHOUSE_IS_AI_ENABLED")
    
    openai_api_key = env_openai_api_key or yaml_config.get("ai_config", {}).get(
        "openai_api_key"
    )
    
    # Parse is_ai_enabled from env or yaml
    if env_is_ai_enabled_str:
        is_ai_enabled = env_is_ai_enabled_str.lower() in ("true", "1", "yes")
    else:
        is_ai_enabled = yaml_config.get("ai_config", {}).get("is_ai_enabled", False)

    # Redis config
    env_redis_connection_string = os.environ.get("LEARNHOUSE_REDIS_CONNECTION_STRING")
    redis_connection_string = env_redis_connection_string or yaml_config.get(
        "redis_config", {}
    ).get("redis_connection_string")

    # Mailing config
    env_resend_api_key = os.environ.get("LEARNHOUSE_RESEND_API_KEY")
    env_system_email_address = os.environ.get("LEARNHOUSE_SYSTEM_EMAIL_ADDRESS")
    resend_api_key = env_resend_api_key or yaml_config.get("mailing_config", {}).get(
        "resend_api_key"
    )
    system_email_address = env_system_email_address or yaml_config.get(
        "mailing_config", {}
    ).get("system_email_address")

    # Payments config - Paystack
    env_paystack_secret_key = os.environ.get("LEARNHOUSE_PAYSTACK_SECRET_KEY") or os.environ.get("PAYSTACK_SECRET_KEY")
    env_paystack_public_key = os.environ.get("LEARNHOUSE_PAYSTACK_PUBLIC_KEY") or os.environ.get("PAYSTACK_PUBLIC_KEY")
    env_paystack_webhook_secret = os.environ.get("LEARNHOUSE_PAYSTACK_WEBHOOK_SECRET") or os.environ.get("PAYSTACK_WEBHOOK_SECRET")
    
    # Safely get Paystack config from YAML
    payments_config = yaml_config.get("payments_config", {}) if yaml_config else {}
    paystack_config = payments_config.get("paystack", {}) if isinstance(payments_config, dict) else {}
    
    paystack_secret_key = env_paystack_secret_key or paystack_config.get("paystack_secret_key")
    paystack_public_key = env_paystack_public_key or paystack_config.get("paystack_public_key")
    paystack_webhook_secret = env_paystack_webhook_secret or paystack_config.get("paystack_webhook_secret")

    # Create HostingConfig and DatabaseConfig objects
    hosting_config = HostingConfig(
        domain=domain,
        ssl=bool(ssl),
        port=int(port),
        use_default_org=bool(use_default_org),
        allowed_origins=list(allowed_origins),
        allowed_regexp=allowed_regexp,
        self_hosted=bool(self_hosted),
        app_base_url=app_base_url,
        cookie_config=cookie_config,
        content_delivery=content_delivery,
    )
    database_config = DatabaseConfig(
        sql_connection_string=sql_connection_string,
    )

    # AI Config
    ai_config = AIConfig(
        openai_api_key=openai_api_key,
        is_ai_enabled=bool(is_ai_enabled),
    )

    # Create LearnHouseConfig object
    config = LearnHouseConfig(
        site_name=site_name,
        site_description=site_description,
        contact_email=contact_email,
        general_config=GeneralConfig(
            development_mode=bool(development_mode), 
            logfire_enabled=bool(logfire_enabled)
        ),
        hosting_config=hosting_config,
        database_config=database_config,
        security_config=SecurityConfig(auth_jwt_secret_key=auth_jwt_secret_key),
        ai_config=ai_config,
        redis_config=RedisConfig(redis_connection_string=redis_connection_string),
        mailing_config=MailingConfig(
            resend_api_key=resend_api_key, system_email_address=system_email_address
        ),
        payments_config=InternalPaymentsConfig(
            paystack=InternalPaystackConfig(
                paystack_secret_key=paystack_secret_key,
                paystack_public_key=paystack_public_key,
                paystack_webhook_secret=paystack_webhook_secret
            )
        )
    )

    return config
