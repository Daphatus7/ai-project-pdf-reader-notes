import asyncio
import os
from collections.abc import Sequence

import httpx
from dotenv import load_dotenv
from xai_sdk import AsyncClient
from xai_sdk.proto.v6.documents_pb2 import SearchMatch

import logging

logger = logging.getLogger(__name__)

# Module-level shared clients — reused across all requests for connection pooling
load_dotenv()
_xai_client = AsyncClient(
    management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
    api_key=os.getenv("XAI_API_KEY"),
    timeout=600,
)
_http_client = httpx.AsyncClient()


async def create_collection(project_id: str) -> str:
    """Create an xAI Collection for a project. Returns the xAI collection_id."""
    collection = await _xai_client.collections.create(
        name=project_id,
        model_name="grok-embedding-small",
    )
    logger.info(f"Created xAI collection for project={project_id} collection_id={collection.collection_id}")
    return collection.collection_id


async def upload_document(data, name: str, collection_id: str) -> str:
    """Upload PDF to xAI collection via REST API, wait 15s for indexing.
    Returns xAI file_id for storing in DB.
    """
    logger.info(f"Uploading {name} to collection {collection_id}")
    response = await _http_client.post(
        f"https://management-api.x.ai/v1/collections/{collection_id}/documents",
        headers={"Authorization": f"Bearer {os.getenv('XAI_MANAGEMENT_API_KEY')}"},
        files={
            "name": (None, name),
            "data": (name, data, "application/pdf"),
            "content_type": (None, "application/pdf"),
        },
        timeout=3600.0,
    )
    result = response.json()
    logger.info(f"Upload response for {name}: {result}")

    file_id = result["file_metadata"]["file_id"]

    # xAI indexes asynchronously — wait 15s before returning to caller
    logger.info(f"Waiting 15s for {name} to be indexed...")
    await asyncio.sleep(15)

    logger.info(f"Document {name} ready, xai_file_id={file_id}")
    return file_id


async def search_collection(collection_id: str, selected_files: Sequence[str], query: str) -> list[SearchMatch]:
    """
    Search an xAI collection and return top 5 matches from selected files.
    :param collection_id:
    :param query:
    :param selected_files:
    :return: 只返回1，file_id == selected_files中的文件；2，返回的结果数量限制在5条以内；3，返回的结果会被包含在后续的answer generation的context中
    """
    results = await _xai_client.collections.search(
        query=query,
        collection_ids=[collection_id],
        retrieval_mode="hybrid",
    )
    # only return the results from the selected files
    filtered_matches = [item for item in results.matches if item.file_id in selected_files]
    # return top 5 results and the results will be included in the context for answer generation
    return filtered_matches[:5]


async def delete_collection(collection_id: str):
    """删除整个collection文件夹, 包括里面的文件"""
    await _xai_client.collections.delete(collection_id)


async def delete_document(document_id: str):
    """无视文件的删除"""
    response = await _xai_client.files.delete(document_id)
    return response


async def list_files(limit: int = 100) -> list[dict]:
    """List all files uploaded to xAI. Useful for debugging upload status."""
    response = await _xai_client.files.list(limit=limit)
    return [
        {"id": f.id, "filename": f.filename, "size": f.size, "created_at": str(f.created_at)}
        for f in response.data
    ]


async def get_file(file_id: str) -> dict:
    """Get metadata for a specific xAI file by ID."""
    f = await _xai_client.files.get(file_id)
    return {"id": f.id, "filename": f.filename, "size": f.size, "created_at": str(f.created_at)}


async def download_document(document_id: str):
    """
    下载文件内容
    Download the actual content of a file.
    """
    response = await _xai_client.files.content(document_id)
    return response
