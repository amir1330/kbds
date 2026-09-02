import httpx

from app.config import settings


async def send_telegram_message(text: str) -> None:
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        return

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": settings.telegram_chat_id,
        "text": text,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(url, json=payload)


def format_order_notification(order_id: int, name: str, email: str, total_cents: int, items: list) -> str:
    lines = [
        "<b>New order</b>",
        f"ID: #{order_id}",
        f"Name: {name}",
        f"Email: {email}",
        f"Total: ${total_cents / 100:.0f}",
        "",
        "<b>Items:</b>",
    ]
    for item in items:
        lines.append(f"• {item.get('name')} × {item.get('quantity')} — ${item.get('price_cents', 0) / 100:.0f}")
    return "\n".join(lines)


def format_contact_notification(name: str, email: str, message: str) -> str:
    return "\n".join(
        [
            "<b>Contact form</b>",
            f"Name: {name}",
            f"Email: {email}",
            "",
            message,
        ]
    )


def format_build_request_notification(
    request_id: int,
    name: str,
    email: str,
    phone: str | None,
    preferences: str,
    description: str,
    plate_summary: str,
    plate_spec: dict,
) -> str:
    lines = [
        "<b>🔧 Build request</b>",
        f"ID: #{request_id}",
        f"Name: {name}",
        f"Email: {email}",
    ]
    if phone:
        lines.append(f"Phone: {phone}")
    if preferences:
        lines.append(f"Prefs: {preferences}")
    lines.extend(["", "<b>Description:</b>", description, "", "<b>Plate summary:</b>", plate_summary])

    # Append compact JSON for plate work (truncate if needed for Telegram 4096 limit)
    import json

    plate_json = json.dumps(
        {
            "unit_mm": plate_spec.get("unit_mm"),
            "split_gap_mm": plate_spec.get("split_gap_mm"),
            "layers": plate_spec.get("layers"),
        },
        indent=2,
    )
    msg = "\n".join(lines)
    remaining = 3900 - len(msg)
    if remaining > 200:
        snippet = plate_json[:remaining]
        if len(plate_json) > remaining:
            snippet += "\n… (truncated, full data in DB)"
        lines.extend(["", "<b>Plate JSON:</b>", f"<pre>{_escape_html(snippet)}</pre>"])

    return "\n".join(lines)


def _escape_html(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
