import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from sqlmodel import Field, SQLModel, Column, JSON


class Product(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    name: str
    tagline: str
    description: str
    description_i18n: dict[str, str] | None = Field(default=None, sa_column=Column(JSON))
    description2: str | None = Field(default=None)
    description2_i18n: dict[str, str] | None = Field(default=None, sa_column=Column(JSON))
    price_cents: int
    image_url: str = ""
    image_paths: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    switches: str
    microcontroller: str
    trackball: str | None = None
    firmware_type: str = "ZMK"
    firmware_path: str | None = None
    build_guide_path: str | None = None
    kle_layout: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    in_stock: bool = True
    featured: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Order(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    email: str
    name: str
    phone: str | None = None
    notes: str | None = None
    items_json: list[dict[str, Any]] = Field(sa_column=Column(JSON))
    total_cents: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ContactSubmission(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(default="")
    email: str = Field(default="")
    contact: str | None = Field(default=None)
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EditorSettings(SQLModel, table=True):
    id: int = Field(default=1, primary_key=True)
    snap_step_u: float = 0.25
    rotation_step_deg: float = 5.0
    nudge_fine_u: float = 0.25
    nudge_coarse_u: float = 1.0
    default_mirror_split: bool = True


class LayoutPreset(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    slug: str = Field(index=True, unique=True)
    label: str
    description: str = ""
    form_factor: str  # split | unibody
    static_file: str | None = None
    layout_json: dict[str, Any] | None = Field(default=None, sa_column=Column(JSON))
    enabled: bool = True
    sort_order: int = 0


class BuildRequest(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(default="")
    email: str = Field(default="")
    contact: str | None = Field(default=None)
    phone: str | None = None
    preferences: str = ""
    description: str
    layout_json: dict[str, Any] = Field(sa_column=Column(JSON))
    plate_spec_json: dict[str, Any] = Field(sa_column=Column(JSON))
    plate_summary: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Keyboard / Product listing — AGPL spec ──


class KeyboardStatus(str, Enum):
    IN_STOCK = "IN_STOCK"
    MADE_TO_ORDER = "MADE_TO_ORDER"
    PREORDER = "PREORDER"
    OUT_OF_STOCK = "OUT_OF_STOCK"


class Connectivity(str, Enum):
    BLUETOOTH = "BLUETOOTH"
    WIRED = "WIRED"
    RECEIVER_2_4GHZ = "RECEIVER_2_4GHZ"


class Keyboard(SQLModel, table=True):
    """Custom/ergonomic keyboard listing — see spec section 1."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    slug: str = Field(index=True, unique=True)
    tagline: str = Field(default="")
    short_description: str = Field(default="")
    description: str = Field(default="")  # Markdown

    price_cents: int = Field(default=0, ge=0)
    status: KeyboardStatus = Field(default=KeyboardStatus.MADE_TO_ORDER)
    featured: bool = Field(default=False)
    images: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    github_url: str | None = Field(default=None)

    # Specs / Metadata
    firmware: str | None = Field(default=None)
    microcontroller: str | None = Field(default=None)
    connectivity: list[str] = Field(default_factory=list, sa_column=Column(JSON))  # Connectivity values
    layout_type: str | None = Field(default=None)
    switches: str | None = Field(default=None)
    keycaps: str | None = Field(default=None)
    case_material: str | None = Field(default=None)
    hotswap: bool = Field(default=True)
    trackball: bool = Field(default=False)
    battery: str | None = Field(default=None)
    weight_grams: int | None = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
