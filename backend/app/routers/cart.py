from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlmodel import Session, select

from app.database import get_session
from app.models import Product
from app.schemas import CartItemPayload, CartItemUpdate, CartRead
from app.services.product_images import primary_image_url
from app.services.redis_cart import clear_cart, get_cart, new_session_id, save_cart

router = APIRouter(prefix="/cart", tags=["cart"])

SESSION_COOKIE = "kbds_session"


def get_session_id(request: Request, response: Response) -> str:
    session_id = request.cookies.get(SESSION_COOKIE)
    if not session_id:
        session_id = new_session_id()
        response.set_cookie(
            key=SESSION_COOKIE,
            value=session_id,
            httponly=True,
            samesite="lax",
            max_age=60 * 60 * 24 * 7,
        )
    return session_id


def build_cart_read(session_id: str, cart: dict, session: Session) -> CartRead:
    items = []
    total = 0
    count = 0

    for entry in cart.get("items", []):
        product = session.get(Product, entry["product_id"])
        if not product:
            continue
        qty = entry.get("quantity", 1)
        items.append(
            {
                "product_id": product.id,
                "slug": product.slug,
                "name": product.name,
                "price_cents": product.price_cents,
                "image_url": primary_image_url(product),
                "quantity": qty,
            }
        )
        total += product.price_cents * qty
        count += qty

    return CartRead(session_id=session_id, items=items, total_cents=total, item_count=count)


@router.get("", response_model=CartRead)
def read_cart(
    request: Request,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
) -> CartRead:
    session_id = get_session_id(request, response)
    cart = get_cart(session_id)
    return build_cart_read(session_id, cart, session)


@router.post("/items", response_model=CartRead)
def add_item(
    payload: CartItemPayload,
    request: Request,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
) -> CartRead:
    product = session.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.in_stock:
        raise HTTPException(status_code=400, detail="Product out of stock")

    session_id = get_session_id(request, response)
    cart = get_cart(session_id)
    items = cart.get("items", [])

    found = False
    for item in items:
        if item["product_id"] == payload.product_id:
            item["quantity"] = item.get("quantity", 1) + payload.quantity
            found = True
            break
    if not found:
        items.append({"product_id": payload.product_id, "quantity": payload.quantity})

    cart["items"] = items
    save_cart(session_id, cart)
    return build_cart_read(session_id, cart, session)


@router.patch("/items/{product_id}", response_model=CartRead)
def update_item(
    product_id: int,
    payload: CartItemUpdate,
    request: Request,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
) -> CartRead:
    session_id = get_session_id(request, response)
    cart = get_cart(session_id)
    items = cart.get("items", [])

    for item in items:
        if item["product_id"] == product_id:
            item["quantity"] = payload.quantity
            break

    cart["items"] = [i for i in items if i.get("quantity", 0) > 0]
    save_cart(session_id, cart)
    return build_cart_read(session_id, cart, session)


@router.delete("/items/{product_id}", response_model=CartRead)
def remove_item(
    product_id: int,
    request: Request,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
) -> CartRead:
    session_id = get_session_id(request, response)
    cart = get_cart(session_id)
    cart["items"] = [i for i in cart.get("items", []) if i["product_id"] != product_id]
    save_cart(session_id, cart)
    return build_cart_read(session_id, cart, session)


@router.delete("", response_model=CartRead)
def delete_cart(
    request: Request,
    response: Response,
    session: Annotated[Session, Depends(get_session)],
) -> CartRead:
    session_id = get_session_id(request, response)
    clear_cart(session_id)
    return build_cart_read(session_id, {"items": []}, session)
