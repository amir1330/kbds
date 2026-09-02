from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.models import ContactSubmission
from app.schemas import ContactCreate
from app.services.telegram import format_contact_notification, send_telegram_message

router = APIRouter(prefix="/contact", tags=["contact"])


@router.post("")
async def submit_contact(
    payload: ContactCreate,
    session: Annotated[Session, Depends(get_session)],
) -> dict:
    # legacy name/email -> contact fallback
    contact_val = payload.contact or payload.email or payload.name or ""
    submission = ContactSubmission(
        name=payload.name or "",
        email=str(payload.email) if payload.email else "",
        contact=contact_val,
        message=payload.message,
    )
    session.add(submission)
    session.commit()

    await send_telegram_message(
        format_contact_notification(contact_val, payload.message, payload.name, payload.email)
    )

    return {"ok": True}
