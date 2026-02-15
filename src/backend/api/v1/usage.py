from fastapi import APIRouter, Depends

from src.backend.api.deps import get_database_service, get_user
from src.backend.config.config import settings

router = APIRouter(prefix='/usage', tags=['usage'])


@router.get('')
async def get_usage(
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    user_id = user['sub']
    plan = await database_service.get_user_plan(user_id)
    usage = await database_service.get_user_usage(user_id)

    unlimited = {'current': 0, 'limit': -1}

    if plan != 'free':
        return {
            'plan': plan,
            'projects': {**unlimited, 'current': usage.get('project_count', 0)},
            'documents': {**unlimited, 'current': usage.get('doc_count', 0)},
            'notes': {**unlimited, 'current': usage.get('note_count', 0)},
        }

    return {
        'plan': plan,
        'projects': {
            'current': usage.get('project_count', 0),
            'limit': settings.free_max_projects,
        },
        'documents': {
            'current': usage.get('doc_count', 0),
            'limit': settings.free_max_documents,
        },
        'notes': {
            'current': usage.get('note_count', 0),
            'limit': settings.free_max_notes,
        },
    }
