from sqlmodel import Session, select

from app.database import engine
from app.models import EditorSettings, LayoutPreset, Product

SAMPLE_PRODUCTS = [
    {
        "slug": "corne-v4",
        "name": "Corne V4",
        "tagline": "42-key columnar split — hand-wired",
        "description": "Classic 3×6+3 Corne layout with per-key RGB optional. RP2040 dual controllers, TRRS link, hot-swap sockets.",
        "price_cents": 32000,
        "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800&q=80",
        "switches": "Gateron Ink Black V2",
        "microcontroller": "RP2040 ×2",
        "trackball": None,
        "firmware_type": "ZMK",
        "in_stock": True,
        "featured": True,
    },
    {
        "slug": "charybdis-nano",
        "name": "Charybdis Nano",
        "tagline": "36-key wireless trackball split",
        "description": "Low-profile Charybdis Nano with PMW3360 trackball module. BLE/ZMK, per-side battery.",
        "price_cents": 48000,
        "image_url": "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=800&q=80",
        "switches": "Kailh Choc Red",
        "microcontroller": "nice!nano ×2",
        "trackball": "PMW3360 34mm",
        "firmware_type": "ZMK",
        "in_stock": True,
        "featured": True,
    },
    {
        "slug": "dactyl-manuform-5x6",
        "name": "Dactyl Manuform 5×6",
        "tagline": "Sculpted ergo with thumb cluster",
        "description": "Custom 3D-printed shell, hand-soldered matrix, tenting legs included. QMK/VIA compatible.",
        "price_cents": 55000,
        "image_url": "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=800&q=80",
        "switches": "Bobagum Silent Linear",
        "microcontroller": "Pro Micro ×2",
        "trackball": None,
        "firmware_type": "QMK",
        "in_stock": False,
        "featured": False,
    },
]


def seed_products() -> None:
    with Session(engine) as session:
        existing = session.exec(select(Product)).first()
        if existing:
            return
        for data in SAMPLE_PRODUCTS:
            session.add(Product(**data))
        session.commit()


DEFAULT_LAYOUT_PRESETS = [
    {
        "slug": "corne",
        "label": "Corne",
        "description": "c0psrul3 crkbd · rotated thumbs",
        "form_factor": "split",
        "static_file": "corne.json",
        "sort_order": 10,
    },
    {
        "slug": "sofle",
        "label": "Sofle",
        "description": "6×4+3 split",
        "form_factor": "split",
        "static_file": "sofle.json",
        "sort_order": 20,
    },
    {
        "slug": "lily58",
        "label": "Lily58",
        "description": "58-key split",
        "form_factor": "split",
        "static_file": "lily58.json",
        "sort_order": 30,
    },
    {
        "slug": "ferris",
        "label": "Ferris",
        "description": "3×5+2 sweep",
        "form_factor": "split",
        "static_file": "ferris.json",
        "sort_order": 40,
    },
    {
        "slug": "blank-split",
        "label": "Blank layout",
        "description": "Empty split canvas",
        "form_factor": "split",
        "static_file": None,
        "sort_order": 50,
    },
    {
        "slug": "blank-unibody",
        "label": "Blank layout",
        "description": "Empty unibody canvas",
        "form_factor": "unibody",
        "static_file": None,
        "sort_order": 5,
    },
    {
        "slug": "60-ansi",
        "label": "60% ANSI",
        "description": "Standard unibody",
        "form_factor": "unibody",
        "static_file": "60-ansi.json",
        "sort_order": 10,
    },
]


def seed_layout_data() -> None:
    with Session(engine) as session:
        if not session.get(EditorSettings, 1):
            session.add(EditorSettings())
            session.commit()

        existing = session.exec(select(LayoutPreset)).first()
        if existing:
            return
        for data in DEFAULT_LAYOUT_PRESETS:
            session.add(LayoutPreset(**data))
        session.commit()
