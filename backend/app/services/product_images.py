import os

from app.models import Product

ALLOWED_IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def product_images_dir(product_id: int, upload_dir: str) -> str:
    return os.path.join(upload_dir, "product-images", str(product_id))


def product_image_urls(product: Product) -> list[str]:
    urls: list[str] = []
    for path in product.image_paths or []:
        filename = os.path.basename(path)
        urls.append(f"/api/files/product-images/{product.id}/{filename}")
    if not urls and product.image_url:
        urls.append(product.image_url)
    return urls


def primary_image_url(product: Product) -> str:
    urls = product_image_urls(product)
    return urls[0] if urls else ""
