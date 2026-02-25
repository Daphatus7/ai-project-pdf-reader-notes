from fastapi import APIRouter, Depends

from src.backend.api.deps import get_database_service, get_user
from src.backend.config.plans import get_plan_quotas

router = APIRouter(prefix='/usage', tags=['usage'])


@router.get('')
async def get_usage(
    user=Depends(get_user),
    database_service=Depends(get_database_service),
):
    user_id = user['sub']
    plan = await database_service.get_user_plan(user_id)
    usage = await database_service.get_user_usage(user_id)
    quotas = get_plan_quotas(plan)

    return {
        'plan': plan,
        'projects':  {'current': usage.get('project_count', 0), 'limit': quotas['max_projects']},
        'documents': {'current': usage.get('doc_count', 0),     'limit': quotas['max_documents']},
        'notes':     {'current': usage.get('note_count', 0),    'limit': quotas['max_notes']},
    }
