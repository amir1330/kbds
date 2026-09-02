from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlmodel import Session, select

from app.database import get_session
from app.models import Product
from app.schemas import ProductRead
from app.services.product_images import primary_image_url, product_image_urls

router = APIRouter(prefix="/products", tags=["products"])

SESSION_COOKIE = "kbds_session"


def product_to_read(product: Product) -> ProductRead:
    return ProductRead(
        id=product.id,
        slug=product.slug,
        name=product.name,
        tagline=product.tagline,
        description=product.description,
        price_cents=product.price_cents,
        image_url=primary_image_url(product),
        image_urls=product_image_urls(product),
        switches=product.switches,
        microcontroller=product.microcontroller,
        trackball=product.trackball,
        firmware_type=product.firmware_type,
        firmware_url=f"/api/files/firmware/{product.id}" if product.firmware_path else None,
        build_guide_url=f"/api/files/build-guide/{product.id}" if product.build_guide_path else None,
        kle_layout=product.kle_layout,
        in_stock=product.in_stock,
        featured=product.featured,
    )


@router.get("", response_model=list[ProductRead])
def list_products(session: Annotated[Session, Depends(get_session)]) -> list[ProductRead]:
    products = session.exec(select(Product).order_by(Product.featured.desc(), Product.name)).all()
    return [product_to_read(p) for p in products]


@router.get("/{slug}", response_model=ProductRead)
def get_product(slug: str, session: Annotated[Session, Depends(get_session)]) -> ProductRead:
    product = session.exec(select(Product).where(Product.slug == slug)).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_to_read(product)
