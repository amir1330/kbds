import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import admin, auth, build_requests, cart, contact, layout_config, orders, products
from app.routers.admin import files_router
from app.seed import seed_layout_data, seed_products

app = FastAPI(title="kbds.split API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(products.router, prefix="/api")
app.include_router(cart.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(contact.router, prefix="/api")
app.include_router(build_requests.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(layout_config.router, prefix="/api")
app.include_router(files_router, prefix="/api")


@app.on_event("startup")
def on_startup() -> None:
    os.makedirs(settings.upload_dir, exist_ok=True)
    init_db()
    seed_products()
    seed_layout_data()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}
