# @file        process.py
# @description 
# @author      [Peiyu Wang]
# @date        21/1/2026
# @license     © 2026 . All rights reserved.
import logging

from fastapi import APIRouter, Depends

from src.backend.api.deps import get_rag_service
from src.backend.schemas.rag import RagRequest, UploadResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/process', tags=['process'])


@router.post('/chat/user_id/project_id', response_model=UploadResponse):
async def upload(rag_request: RagRequest,
                 rag_service = Depends(get_rag_service)):
    """
        Upload the file to the server, and processed to rag database for later use
    :param rag_request: user request to upload the files
    :param rag_service: 
    :return: 
    """
    try:
        if validate_request(rag_request):
            response = rag_service.process(rag_request)
            if response.isValid:
                # todo log
                return UploadResponse(response=response)
    #to do throw error and log
    
