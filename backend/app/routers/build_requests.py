from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.models import BuildRequest
from app.schemas import BuildRequestCreate
from app.services.telegram import format_build_request_notification, send_telegram_message

router = APIRouter(prefix="/build-requests", tags=["build-requests"])


@router.post("")
async def submit_build_request(
    payload: BuildRequestCreate,
    session: Annotated[Session, Depends(get_session)],
) -> dict:
    summary = payload.plate_spec.get("summary_text", "")
    if not summary and "layers" in payload.plate_spec:
        summary = _fallback_summary(payload.plate_spec)

    contact_val = payload.contact or payload.email or payload.name or ""
    record = BuildRequest(
        name=payload.name or "",
        email=str(payload.email) if payload.email else "",
        contact=contact_val,
        phone=payload.phone,
        preferences=payload.preferences or "",
        description=payload.description,
        layout_json=payload.layout,
        plate_spec_json=payload.plate_spec,
        plate_summary=summary,
    )
    session.add(record)
    session.commit()
    session.refresh(record)

    await send_telegram_message(
        format_build_request_notification(
            record.id,
            contact_val,
            payload.description,
            summary,
            payload.plate_spec,
            payload.name,
            str(payload.email) if payload.email else None,
            payload.phone,
            payload.preferences,
        )
    )

    return {"ok": True, "request_id": record.id}


def _fallback_summary(plate_spec: dict[str, Any]) -> str:
    lines = [f"Split gap: {plate_spec.get('split_gap_mm', '?')} mm"]
    for layer in plate_spec.get("layers", []):
        lines.append(f"Layer {layer.get('index')}: {len(layer.get('keys', []))} keys")
    return "\n".join(lines)
