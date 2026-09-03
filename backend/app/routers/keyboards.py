from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select

from app.auth import get_current_admin
from app.database import get_session
from app.models import Keyboard, KeyboardStatus
from app.schemas import CreateKeyboardInput, KeyboardRead, UpdateKeyboardInput

router = APIRouter(prefix="/keyboards", tags=["keyboards"])


def _to_read(k: Keyboard) -> KeyboardRead:
    return KeyboardRead(
        id=k.id,
        name=k.name,
        slug=k.slug,
        tagline=k.tagline,
        short_description=k.short_description,
        description=k.description,
        price_cents=k.price_cents,
        status=k.status,  # type: ignore
        featured=k.featured,
        images=k.images,
        github_url=k.github_url,
        firmware=k.firmware,
        microcontroller=k.microcontroller,
        connectivity=k.connectivity,  # type: ignore
        layout_type=k.layout_type,
        switches=k.switches,
        keycaps=k.keycaps,
        case_material=k.case_material,
        hotswap=k.hotswap,
        trackball=k.trackball,
        battery=k.battery,
        weight_grams=k.weight_grams,
        created_at=k.created_at,
        updated_at=k.updated_at,
    )


@router.get("", response_model=list[KeyboardRead])
def list_keyboards(
    session: Annotated[Session, Depends(get_session)],
    status: Annotated[KeyboardStatus | None, Query(description="Filter by status")] = None,  # noqa: A002
    featured: Annotated[bool | None, Query(description="Filter by featured")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
    offset: Annotated[int, Query(ge=0)] = 0,
    # alternative pagination aliases
    page: Annotated[int | None, Query(ge=1)] = None,
    page_size: Annotated[int | None, Query(ge=1, le=100)] = None,
) -> list[KeyboardRead]:
    # support page/page_size as alternative to limit/offset
    if page is not None and page_size is not None:
        limit = page_size
        offset = (page - 1) * page_size
    elif page is not None:
        # page without page_size -> use limit as page_size
        offset = (page - 1) * limit

    stmt = select(Keyboard).order_by(Keyboard.created_at.desc())  # type: ignore
    if status is not None:
        stmt = stmt.where(Keyboard.status == status)
    if featured is not None:
        stmt = stmt.where(Keyboard.featured == featured)  # type: ignore

    stmt = stmt.offset(offset).limit(limit)
    items = session.exec(stmt).all()
    return [_to_read(k) for k in items]


@router.get("/{slug}", response_model=KeyboardRead)
def get_keyboard(
    slug: str,
    session: Annotated[Session, Depends(get_session)],
) -> KeyboardRead:
    kb = session.exec(select(Keyboard).where(Keyboard.slug == slug)).first()
    if not kb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyboard not found")
    return _to_read(kb)


@router.post("", response_model=KeyboardRead, status_code=status.HTTP_201_CREATED)
def create_keyboard(
    payload: CreateKeyboardInput,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> KeyboardRead:
    existing = session.exec(select(Keyboard).where(Keyboard.slug == payload.slug)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="slug already exists")

    # Pydantic already validated slug, price_cents, images
    kb = Keyboard(
        name=payload.name,
        slug=payload.slug,
        tagline=payload.tagline,
        short_description=payload.short_description,
        description=payload.description,
        price_cents=payload.price_cents,
        status=payload.status,
        featured=payload.featured,
        images=payload.images,
        github_url=payload.github_url,
        firmware=payload.firmware,
        microcontroller=payload.microcontroller,
        connectivity=list(payload.connectivity) if payload.connectivity else [],
        layout_type=payload.layout_type,
        switches=payload.switches,
        keycaps=payload.keycaps,
        case_material=payload.case_material,
        hotswap=payload.hotswap,
        trackball=payload.trackball,
        battery=payload.battery,
        weight_grams=payload.weight_grams,
    )
    session.add(kb)
    session.commit()
    session.refresh(kb)
    return _to_read(kb)


@router.patch("/{keyboard_id}", response_model=KeyboardRead)
def update_keyboard(
    keyboard_id: str,
    payload: UpdateKeyboardInput,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> KeyboardRead:
    kb = session.get(Keyboard, keyboard_id)
    if not kb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyboard not found")

    data = payload.model_dump(exclude_unset=True)

    # if slug changing, check uniqueness
    if "slug" in data and data["slug"] != kb.slug:
        existing = session.exec(select(Keyboard).where(Keyboard.slug == data["slug"])).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="slug already exists")

    for key, value in data.items():
        setattr(kb, key, value)

    kb.updated_at = datetime.utcnow()
    session.add(kb)
    session.commit()
    session.refresh(kb)
    return _to_read(kb)


@router.delete("/{keyboard_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_keyboard(
    keyboard_id: str,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> None:
    kb = session.get(Keyboard, keyboard_id)
    if not kb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Keyboard not found")
    session.delete(kb)
    session.commit()
    return None
