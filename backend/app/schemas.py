import re
from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


class ProductRead(BaseModel):
    id: int
    slug: str
    name: str
    tagline: str
    description: str
    description_i18n: dict[str, str] | None = None
    description2: str | None = None
    description2_i18n: dict[str, str] | None = None
    price_cents: int
    image_url: str
    image_urls: list[str] = []
    switches: str
    microcontroller: str
    trackball: str | None
    firmware_type: str
    firmware_url: str | None
    build_guide_url: str | None
    kle_layout: dict[str, Any] | None
    in_stock: bool
    featured: bool


class ProductCreate(BaseModel):
    slug: str
    name: str
    tagline: str
    description: str
    description_i18n: dict[str, str] | None = None
    description2: str | None = None
    description2_i18n: dict[str, str] | None = None
    price_cents: int
    image_url: str = ""
    switches: str
    microcontroller: str
    trackball: str | None = None
    firmware_type: str = "ZMK"
    kle_layout: dict[str, Any] | None = None
    in_stock: bool = True
    featured: bool = False


class ProductUpdate(BaseModel):
    slug: str | None = None
    name: str | None = None
    tagline: str | None = None
    description: str | None = None
    description_i18n: dict[str, str] | None = None
    description2: str | None = None
    description2_i18n: dict[str, str] | None = None
    price_cents: int | None = None
    image_url: str | None = None
    switches: str | None = None
    microcontroller: str | None = None
    trackball: str | None = None
    firmware_type: str | None = None
    kle_layout: dict[str, Any] | None = None
    in_stock: bool | None = None
    featured: bool | None = None


class CartItemPayload(BaseModel):
    product_id: int
    quantity: int = 1


class CartItemUpdate(BaseModel):
    quantity: int


class CartRead(BaseModel):
    session_id: str
    items: list[dict[str, Any]]
    total_cents: int
    item_count: int


class OrderCreate(BaseModel):
    email: EmailStr
    name: str
    phone: str | None = None
    notes: str | None = None


class ContactCreate(BaseModel):
    contact: str
    message: str
    # legacy compat
    name: str | None = None
    email: EmailStr | None = None


class LoginRequest(BaseModel):
    username: str
    password: str


class BuildRequestCreate(BaseModel):
    contact: str
    description: str
    layout: dict[str, Any]
    plate_spec: dict[str, Any]
    # legacy compat
    name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    preferences: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class EditorSettingsRead(BaseModel):
    snap_step_u: float
    rotation_step_deg: float
    nudge_fine_u: float
    nudge_coarse_u: float
    default_mirror_split: bool


class EditorSettingsUpdate(BaseModel):
    snap_step_u: float | None = None
    rotation_step_deg: float | None = None
    nudge_fine_u: float | None = None
    nudge_coarse_u: float | None = None
    default_mirror_split: bool | None = None


class LayoutPresetRead(BaseModel):
    id: int
    slug: str
    label: str
    description: str
    form_factor: str
    static_file: str | None
    layout_json: dict[str, Any] | None
    enabled: bool
    sort_order: int


class LayoutPresetCreate(BaseModel):
    slug: str
    label: str
    description: str = ""
    form_factor: str
    static_file: str | None = None
    layout_json: dict[str, Any] | None = None
    enabled: bool = True
    sort_order: int = 0


class LayoutPresetUpdate(BaseModel):
    slug: str | None = None
    label: str | None = None
    description: str | None = None
    form_factor: str | None = None
    static_file: str | None = None
    layout_json: dict[str, Any] | None = None
    enabled: bool | None = None
    sort_order: int | None = None


class OrderRead(BaseModel):
    id: int
    email: str
    name: str
    phone: str | None = None
    notes: str | None = None
    items_json: list[dict[str, Any]]
    total_cents: int
    created_at: datetime


class ContactRead(BaseModel):
    id: int
    name: str
    email: str
    contact: str | None = None
    message: str
    created_at: datetime


class BuildRequestRead(BaseModel):
    id: int
    name: str
    email: str
    contact: str | None = None
    phone: str | None = None
    preferences: str
    description: str
    layout_json: dict[str, Any]
    plate_spec_json: dict[str, Any]
    plate_summary: str
    created_at: datetime


# ── Keyboard / AGPL spec ──

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class KeyboardStatus(str, Enum):
    IN_STOCK = "IN_STOCK"
    MADE_TO_ORDER = "MADE_TO_ORDER"
    PREORDER = "PREORDER"
    OUT_OF_STOCK = "OUT_OF_STOCK"


Connectivity = Literal["BLUETOOTH", "WIRED", "RECEIVER_2_4GHZ"]


class KeyboardRead(BaseModel):
    id: str
    name: str
    slug: str
    tagline: str
    short_description: str
    description: str
    price_cents: int
    status: KeyboardStatus
    featured: bool
    images: list[str]
    github_url: str | None = None
    firmware: str | None = None
    microcontroller: str | None = None
    connectivity: list[Connectivity] = Field(default_factory=list)
    layout_type: str | None = None
    switches: str | None = None
    keycaps: str | None = None
    case_material: str | None = None
    hotswap: bool = True
    trackball: bool = False
    battery: str | None = None
    weight_grams: int | None = None
    created_at: datetime
    updated_at: datetime


class CreateKeyboardInput(BaseModel):
    """POST /api/keyboards — Admin only"""

    name: str = Field(..., min_length=1, max_length=200)
    slug: str = Field(..., min_length=2, max_length=120, description="URL-friendly, lower-case a-z0-9-")
    tagline: str = Field(..., min_length=1, max_length=300)
    short_description: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1, description="Markdown supported")
    price_cents: int = Field(..., ge=0, description="Price in cents, >=0")
    status: KeyboardStatus = Field(default=KeyboardStatus.MADE_TO_ORDER)
    featured: bool = False
    images: list[str] = Field(..., min_length=1, description="At least one image URL")
    github_url: str | None = Field(default=None, max_length=500)
    firmware: str | None = Field(default=None, max_length=100)
    microcontroller: str | None = Field(default=None, max_length=100)
    connectivity: list[Connectivity] = Field(default_factory=list)
    layout_type: str | None = Field(default=None, max_length=100)
    switches: str | None = Field(default=None, max_length=200)
    keycaps: str | None = Field(default=None, max_length=200)
    case_material: str | None = Field(default=None, max_length=200)
    hotswap: bool = True
    trackball: bool = False
    battery: str | None = Field(default=None, max_length=100)
    weight_grams: int | None = Field(default=None, ge=0)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        if not SLUG_RE.match(v):
            raise ValueError("slug must be URL-friendly: lower-case a-z, 0-9 and hyphens, e.g. my-keyboard-40")
        return v

    @field_validator("images")
    @classmethod
    def validate_images(cls, v: list[str]) -> list[str]:
        if not v:
            raise ValueError("images must contain at least one URL")
        for url in v:
            if not url or not url.strip():
                raise ValueError("images URLs must be non-empty strings")
            if not (url.startswith("http://") or url.startswith("https://") or url.startswith("/")):
                raise ValueError(f"images URL must start with http://, https:// or / — got {url!r}")
        return v

    @field_validator("github_url")
    @classmethod
    def validate_github_url(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("github_url must be a valid http(s) URL")
        return v


class UpdateKeyboardInput(BaseModel):
    """PATCH /api/keyboards/:id — Admin only, all fields optional"""

    name: str | None = Field(default=None, min_length=1, max_length=200)
    slug: str | None = Field(default=None, min_length=2, max_length=120)
    tagline: str | None = Field(default=None, min_length=1, max_length=300)
    short_description: str | None = Field(default=None, min_length=1, max_length=500)
    description: str | None = Field(default=None, min_length=1)
    price_cents: int | None = Field(default=None, ge=0)
    status: KeyboardStatus | None = None
    featured: bool | None = None
    images: list[str] | None = Field(default=None, min_length=1)
    github_url: str | None = Field(default=None, max_length=500)
    firmware: str | None = Field(default=None, max_length=100)
    microcontroller: str | None = Field(default=None, max_length=100)
    connectivity: list[Connectivity] | None = None
    layout_type: str | None = Field(default=None, max_length=100)
    switches: str | None = Field(default=None, max_length=200)
    keycaps: str | None = Field(default=None, max_length=200)
    case_material: str | None = Field(default=None, max_length=200)
    hotswap: bool | None = None
    trackball: bool | None = None
    battery: str | None = Field(default=None, max_length=100)
    weight_grams: int | None = Field(default=None, ge=0)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not SLUG_RE.match(v):
            raise ValueError("slug must be URL-friendly: lower-case a-z, 0-9 and hyphens")
        return v

    @field_validator("images")
    @classmethod
    def validate_images(cls, v: list[str] | None) -> list[str] | None:
        if v is None:
            return v
        if not v:
            raise ValueError("images must contain at least one URL")
        for url in v:
            if not url or not url.strip():
                raise ValueError("images URLs must be non-empty strings")
        return v
