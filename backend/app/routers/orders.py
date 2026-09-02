from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlmodel import Session

from app.database import get_session
from app.models import Order
from app.schemas import OrderCreate
from app.services.redis_cart import clear_cart, get_cart
from app.services.telegram import format_order_notification, send_telegram_message
from app.routers.cart import build_cart_read, get_session_id

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("")
async def create_order(
    payload: OrderCreate,
    request: Request,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
) -> dict:
    session_id = get_session_id(request, response)
    cart = get_cart(session_id)
    cart_read = build_cart_read(session_id, cart, session)

    if not cart_read.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    order = Order(
        email=payload.email,
        name=payload.name,
        phone=payload.phone,
        notes=payload.notes,
        items_json=cart_read.items,
        total_cents=cart_read.total_cents,
    )
    session.add(order)
    session.commit()
    session.refresh(order)

    clear_cart(session_id)

    await send_telegram_message(
        format_order_notification(
            order.id,
            payload.name,
            payload.email,
            cart_read.total_cents,
            cart_read.items,
        )
    )

    return {"order_id": order.id}
