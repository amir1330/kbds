from typing import Any

from pydantic import BaseModel, EmailStr


class ProductRead(BaseModel):
    id: int
    slug: str
    name: str
    tagline: str
    description: str
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
    name: str
    email: EmailStr
    message: str


class LoginRequest(BaseModel):
    username: str
    password: str


class BuildRequestCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str | None = None
    preferences: str = ""
    description: str
    layout: dict[str, Any]
    plate_spec: dict[str, Any]


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
