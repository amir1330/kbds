from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.database import get_session
from app.models import EditorSettings, LayoutPreset
from app.schemas import EditorSettingsRead, LayoutPresetRead

router = APIRouter(prefix="/layout", tags=["layout"])


def _editor_settings(session: Session) -> EditorSettings:
    row = session.get(EditorSettings, 1)
    if not row:
        row = EditorSettings()
        session.add(row)
        session.commit()
        session.refresh(row)
    return row


@router.get("/editor-config", response_model=EditorSettingsRead)
def get_editor_config(session: Annotated[Session, Depends(get_session)]) -> EditorSettings:
    return _editor_settings(session)


@router.get("/presets", response_model=list[LayoutPresetRead])
def list_presets(session: Annotated[Session, Depends(get_session)]) -> list[LayoutPreset]:
    return session.exec(
        select(LayoutPreset).where(LayoutPreset.enabled == True).order_by(LayoutPreset.sort_order, LayoutPreset.label)  # noqa: E712
    ).all()


@router.get("/presets/all", response_model=list[LayoutPresetRead])
def list_all_presets(session: Annotated[Session, Depends(get_session)]) -> list[LayoutPreset]:
    """All presets including disabled — for admin fallback sync."""
    return session.exec(
        select(LayoutPreset).order_by(LayoutPreset.sort_order, LayoutPreset.label)
    ).all()
