from sqlmodel import Session, select

from app.database import engine
from app.models import EditorSettings, Keyboard, KeyboardStatus, LayoutPreset, Product

SAMPLE_PRODUCTS = [
    {
        "slug": "corne-v4",
        "name": "Corne V4",
        "tagline": "42-key columnar split — hand-wired",
        "description": "Classic 3×6+3 Corne layout with per-key RGB optional. RP2040 dual controllers, TRRS link, hot-swap sockets.",
        "description_i18n": {
            "en": "Classic 3×6+3 Corne layout with per-key RGB optional. RP2040 dual controllers, TRRS link, hot-swap sockets.",
            "ru": "Классическая раскладка Corne 3×6+3 с опциональной RGB-подсветкой каждой клавиши. Два контроллера RP2040, TRRS-соединение, hot-swap сокеты.",
            "kz": "Классикалық Corne 3×6+3 орналасуы, әр пернеге RGB қосымша. RP2040 қос контроллер, TRRS байланысы, hot-swap ұялары.",
        },
        "description2": "Includes tenting legs and reset switches. Fully hand-wired and tested before shipping.",
        "description2_i18n": {
            "en": "Includes tenting legs and reset switches. Fully hand-wired and tested before shipping.",
            "ru": "В комплекте ножки для наклона и кнопки сброса. Полностью ручная пайка и тестирование перед отправкой.",
            "kz": "Көлбеу аяқтары және қайта орнату батырмалары кіреді. Жеткізер алдында толық қолмен дәнекерленген және тексерілген.",
        },
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
        "description_i18n": {
            "en": "Low-profile Charybdis Nano with PMW3360 trackball module. BLE/ZMK, per-side battery.",
            "ru": "Низкопрофильная Charybdis Nano с модулем трекбола PMW3360. BLE/ZMK, батарея на каждой половине.",
            "kz": "Жіңішке профильді Charybdis Nano PMW3360 трекбол модулімен. BLE/ZMK, әр жағына батарея.",
        },
        "description2": "34mm ball, ultra-quiet and precise. Great for CAD and long coding sessions.",
        "description2_i18n": {
            "en": "34mm ball, ultra-quiet and precise. Great for CAD and long coding sessions.",
            "ru": "Шар 34 мм, очень тихий и точный. Отлично для CAD и длительных сессий кодинга.",
            "kz": "34 мм шар, өте тыныш және дәл. CAD және ұзақ код жазу үшін тамаша.",
        },
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
        "description_i18n": {
            "en": "Custom 3D-printed shell, hand-soldered matrix, tenting legs included. QMK/VIA compatible.",
            "ru": "Кастомный корпус на 3D-принтере, матрица ручной пайки, ножки в комплекте. Совместимо с QMK/VIA.",
            "kz": "Арнайы 3D-баспа корпусы, қолмен дәнекерленген матрица, көлбеу аяқтары кіреді. QMK/VIA үйлесімді.",
        },
        "description2": "Ergonomic tenting and thumb cluster minimize finger travel. Printed in your color choice.",
        "description2_i18n": {
            "en": "Ergonomic tenting and thumb cluster minimize finger travel. Printed in your color choice.",
            "ru": "Эргономичный наклон и кластер под большой палец минимизируют движение пальцев. Печать в выбранном цвете.",
            "kz": "Эргономикалық көлбеу және бас бармақ кластері саусақ қозғалысын азайтады. Таңдаған түсіңізде басып шығарылады.",
        },
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


KEYBOARD_SEED = {
    "name": "Wireless 40% Unibody Keyboard",
    "slug": "wireless-40-unibody-keyboard",
    "tagline": "Компактная эргономичная моноблок-клавиатура с пазл-дизайном",
    "short_description": "Компактная эргономичная моноблок-клавиатура с пазл-дизайном — для каталога",
    "description": """# Wireless 40% Unibody Keyboard

Компактная эргономичная моноблок-клавиатура с пазл-дизайном. 40% форм-фактор, unibody корпус, оптимизирована для ZMK.

- **Прошивка**: ZMK
- **Контроллер**: nice!nano
- **Связь**: Bluetooth + Wired
- **Корпус**: 3D Printed PETG (White & Cyan)
- **Кейкапы**: OEM Profile
- **Хотсвоп**: Да
""",
    "price_cents": 15000,
    "status": KeyboardStatus.MADE_TO_ORDER,
    "featured": False,
    "images": ["https://images.unsplash.com/photo-1589578228447-e1a4e481c6c8?w=800&q=80"],
    "github_url": "https://github.com/amir1330/zmk-config",
    "firmware": "ZMK",
    "microcontroller": "nice!nano",
    "connectivity": ["BLUETOOTH", "WIRED"],
    "layout_type": "40% Unibody",
    "switches": "Gateron Yellow Hot-swap",
    "keycaps": "OEM Profile",
    "case_material": "3D Printed PETG (White & Cyan)",
    "hotswap": True,
    "trackball": False,
    "battery": "110 mAh",
    "weight_grams": None,
}


def seed_keyboards() -> None:
    """Idempotent seed for spec example — upserts by slug."""
    with Session(engine) as session:
        existing = session.exec(select(Keyboard).where(Keyboard.slug == KEYBOARD_SEED["slug"])).first()
        if existing:
            # update to keep seed in sync but don't duplicate
            for k, v in KEYBOARD_SEED.items():
                setattr(existing, k, v)
            existing.updated_at = __import__("datetime").datetime.utcnow()
            session.add(existing)
            session.commit()
            return
        session.add(Keyboard(**KEYBOARD_SEED))
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
