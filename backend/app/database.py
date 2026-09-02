from collections.abc import Generator

from sqlalchemy import inspect, text
from sqlmodel import Session, SQLModel, create_engine

from app.config import settings

engine = create_engine(settings.database_url, echo=False)


def _migrate_product_image_paths() -> None:
    inspector = inspect(engine)
    if "product" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("product")}
    if "image_paths" not in columns:
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE product ADD COLUMN image_paths JSON"))


def _migrate_product_i18n() -> None:
    inspector = inspect(engine)
    if "product" not in inspector.get_table_names():
        return
    columns = {c["name"] for c in inspector.get_columns("product")}
    with engine.begin() as conn:
        if "description_i18n" not in columns:
            conn.execute(text("ALTER TABLE product ADD COLUMN description_i18n JSON"))
        if "description2" not in columns:
            conn.execute(text("ALTER TABLE product ADD COLUMN description2 VARCHAR"))
        if "description2_i18n" not in columns:
            conn.execute(text("ALTER TABLE product ADD COLUMN description2_i18n JSON"))


def _migrate_contact_build_request() -> None:
    inspector = inspect(engine)
    for table, col in [("buildrequest", "contact"), ("contactsubmission", "contact")]:
        if table not in inspector.get_table_names():
            continue
        cols = {c["name"] for c in inspector.get_columns(table)}
        if col not in cols:
            with engine.begin() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} VARCHAR"))


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate_product_image_paths()
    _migrate_product_i18n()
    _migrate_contact_build_request()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session
