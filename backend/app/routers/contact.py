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
    submission = ContactSubmission(
        name=payload.name,
        email=payload.email,
        message=payload.message,
    )
    session.add(submission)
    session.commit()

    await send_telegram_message(
        format_contact_notification(payload.name, payload.email, payload.message)
    )

    return {"ok": True}
