import os
import shutil
import uuid
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlmodel import Session, select

from app.auth import get_current_admin
from app.config import settings
from app.database import get_session
from app.models import BuildRequest, ContactSubmission, EditorSettings, LayoutPreset, Order, Product
from app.schemas import (
    BuildRequestRead,
    ContactRead,
    EditorSettingsRead,
    EditorSettingsUpdate,
    LayoutPresetCreate,
    LayoutPresetRead,
    LayoutPresetUpdate,
    OrderRead,
    ProductCreate,
    ProductRead,
    ProductUpdate,
)
from app.routers.products import product_to_read
from app.services.product_images import (
    ALLOWED_IMAGE_EXT,
    product_images_dir,
)

router = APIRouter(prefix="/admin", tags=["admin"])
files_router = APIRouter(prefix="/files", tags=["files"])


def ensure_upload_dirs() -> None:
    os.makedirs(os.path.join(settings.upload_dir, "firmware"), exist_ok=True)
    os.makedirs(os.path.join(settings.upload_dir, "build-guides"), exist_ok=True)
    os.makedirs(os.path.join(settings.upload_dir, "product-images"), exist_ok=True)


def _remove_product_images(product_id: int) -> None:
    image_dir = product_images_dir(product_id, settings.upload_dir)
    if os.path.isdir(image_dir):
        shutil.rmtree(image_dir, ignore_errors=True)


@router.get("/products", response_model=list[ProductRead])
def admin_list_products(
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> list[ProductRead]:
    products = session.exec(select(Product).order_by(Product.name)).all()
    return [product_to_read(p) for p in products]


@router.post("/products", response_model=ProductRead)
def create_product(
    payload: ProductCreate,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> ProductRead:
    existing = session.exec(select(Product).where(Product.slug == payload.slug)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")

    product = Product(**payload.model_dump())
    session.add(product)
    session.commit()
    session.refresh(product)
    return product_to_read(product)


@router.patch("/products/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> ProductRead:
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, key, value)
    product.updated_at = datetime.utcnow()
    session.add(product)
    session.commit()
    session.refresh(product)
    return product_to_read(product)


@router.delete("/products/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> None:
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    _remove_product_images(product_id)
    session.delete(product)
    session.commit()


@router.post("/products/{product_id}/images", response_model=ProductRead)
async def upload_product_images(
    product_id: int,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
    files: list[UploadFile] = File(...),
) -> ProductRead:
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    ensure_upload_dirs()
    image_dir = product_images_dir(product_id, settings.upload_dir)
    os.makedirs(image_dir, exist_ok=True)

    paths = list(product.image_paths or [])
    for file in files:
        if not file.filename:
            continue
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in ALLOWED_IMAGE_EXT:
            raise HTTPException(status_code=400, detail="Only image files allowed")
        filename = f"{uuid.uuid4().hex}{ext}"
        dest = os.path.join(image_dir, filename)
        with open(dest, "wb") as f:
            shutil.copyfileobj(file.file, f)
        paths.append(dest)

    if not paths:
        raise HTTPException(status_code=400, detail="No valid image files uploaded")

    product.image_paths = paths
    product.updated_at = datetime.utcnow()
    session.add(product)
    session.commit()
    session.refresh(product)
    return product_to_read(product)


@router.delete("/products/{product_id}/images/{index}", response_model=ProductRead)
def delete_product_image(
    product_id: int,
    index: int,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> ProductRead:
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    paths = list(product.image_paths or [])
    if index < 0 or index >= len(paths):
        raise HTTPException(status_code=404, detail="Image not found")

    path = paths.pop(index)
    if os.path.exists(path):
        os.remove(path)

    product.image_paths = paths
    product.updated_at = datetime.utcnow()
    session.add(product)
    session.commit()
    session.refresh(product)
    return product_to_read(product)


@router.post("/products/{product_id}/images/{index}/cover", response_model=ProductRead)
def set_product_cover_image(
    product_id: int,
    index: int,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> ProductRead:
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    paths = list(product.image_paths or [])
    if index < 0 or index >= len(paths):
        raise HTTPException(status_code=404, detail="Image not found")
    if index == 0:
        return product_to_read(product)

    cover = paths.pop(index)
    paths.insert(0, cover)
    product.image_paths = paths
    product.updated_at = datetime.utcnow()
    session.add(product)
    session.commit()
    session.refresh(product)
    return product_to_read(product)


@router.post("/products/{product_id}/firmware", response_model=ProductRead)
async def upload_firmware(
    product_id: int,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
    file: UploadFile = File(...),
) -> ProductRead:
    if not file.filename or not file.filename.endswith(".uf2"):
        raise HTTPException(status_code=400, detail="Only .uf2 files allowed")

    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    ensure_upload_dirs()
    dest = os.path.join(settings.upload_dir, "firmware", f"{product.slug}.uf2")
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    product.firmware_path = dest
    product.updated_at = datetime.utcnow()
    session.add(product)
    session.commit()
    session.refresh(product)
    return product_to_read(product)


@router.post("/products/{product_id}/build-guide", response_model=ProductRead)
async def upload_build_guide(
    product_id: int,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
    file: UploadFile = File(...),
) -> ProductRead:
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only .pdf files allowed")

    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    ensure_upload_dirs()
    dest = os.path.join(settings.upload_dir, "build-guides", f"{product.slug}.pdf")
    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    product.build_guide_path = dest
    product.updated_at = datetime.utcnow()
    session.add(product)
    session.commit()
    session.refresh(product)
    return product_to_read(product)


def _editor_settings(session: Session) -> EditorSettings:
    row = session.get(EditorSettings, 1)
    if not row:
        row = EditorSettings()
        session.add(row)
        session.commit()
        session.refresh(row)
    return row


@router.get("/editor-settings", response_model=EditorSettingsRead)
def get_editor_settings(
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> EditorSettings:
    return _editor_settings(session)


@router.patch("/editor-settings", response_model=EditorSettingsRead)
def update_editor_settings(
    payload: EditorSettingsUpdate,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> EditorSettings:
    row = _editor_settings(session)
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(row, key, value)
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.get("/layout-presets", response_model=list[LayoutPresetRead])
def admin_list_layout_presets(
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> list[LayoutPreset]:
    return session.exec(
        select(LayoutPreset).order_by(LayoutPreset.sort_order, LayoutPreset.label)
    ).all()


@router.post("/layout-presets", response_model=LayoutPresetRead)
def create_layout_preset(
    payload: LayoutPresetCreate,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> LayoutPreset:
    existing = session.exec(select(LayoutPreset).where(LayoutPreset.slug == payload.slug)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    preset = LayoutPreset(**payload.model_dump())
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return preset


@router.patch("/layout-presets/{preset_id}", response_model=LayoutPresetRead)
def update_layout_preset(
    preset_id: int,
    payload: LayoutPresetUpdate,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> LayoutPreset:
    preset = session.get(LayoutPreset, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(preset, key, value)
    session.add(preset)
    session.commit()
    session.refresh(preset)
    return preset


@router.delete("/layout-presets/{preset_id}", status_code=204)
def delete_layout_preset(
    preset_id: int,
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> None:
    preset = session.get(LayoutPreset, preset_id)
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    session.delete(preset)
    session.commit()


@router.get("/orders", response_model=list[OrderRead])
def admin_list_orders(
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> list[Order]:
    return session.exec(select(Order).order_by(Order.created_at.desc())).all()


@router.get("/contacts", response_model=list[ContactRead])
def admin_list_contacts(
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> list[ContactSubmission]:
    return session.exec(select(ContactSubmission).order_by(ContactSubmission.created_at.desc())).all()


@router.get("/build-requests", response_model=list[BuildRequestRead])
def admin_list_build_requests(
    _: Annotated[str, Depends(get_current_admin)],
    session: Annotated[Session, Depends(get_session)],
) -> list[BuildRequest]:
    return session.exec(select(BuildRequest).order_by(BuildRequest.created_at.desc())).all()


@files_router.get("/firmware/{product_id}")
def download_firmware(product_id: int, session: Annotated[Session, Depends(get_session)]):
    product = session.get(Product, product_id)
    if not product or not product.firmware_path or not os.path.exists(product.firmware_path):
        raise HTTPException(status_code=404, detail="Firmware not found")
    return FileResponse(product.firmware_path, filename=f"{product.slug}.uf2")


@files_router.get("/build-guide/{product_id}")
def download_build_guide(product_id: int, session: Annotated[Session, Depends(get_session)]):
    product = session.get(Product, product_id)
    if not product or not product.build_guide_path or not os.path.exists(product.build_guide_path):
        raise HTTPException(status_code=404, detail="Build guide not found")
    return FileResponse(product.build_guide_path, filename=f"{product.slug}-build-guide.pdf")


@files_router.get("/product-images/{product_id}/{filename}")
def get_product_image(product_id: int, filename: str, session: Annotated[Session, Depends(get_session)]):
    product = session.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Image not found")

    safe_name = os.path.basename(filename)
    image_dir = product_images_dir(product_id, settings.upload_dir)
    path = os.path.join(image_dir, safe_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(path)
