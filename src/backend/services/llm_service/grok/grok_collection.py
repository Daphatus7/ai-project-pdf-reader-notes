import asyncio
import os
from collections.abc import Sequence

import httpx
from dotenv import load_dotenv
from xai_sdk import AsyncClient
from xai_sdk.proto.v6.documents_pb2 import SearchMatch

import logging

logger = logging.getLogger(__name__)

load_dotenv()

# Lazily-created shared clients — reused across requests for connection pooling.
# IMPORTANT: gRPC aio (xai_sdk.AsyncClient) and httpx bind their channel/connection
# pool to the event loop that is running on FIRST use. Creating them at import time
# binds them to the wrong loop (import happens before uvicorn's serving loop exists),
# which later raises "got Future ... attached to a different loop". Creating them
# lazily on first await guarantees they bind to the serving loop instead.
_xai_client: AsyncClient | None = None
_http_client: httpx.AsyncClient | None = None


def _get_xai_client() -> AsyncClient:
    global _xai_client
    if _xai_client is None:
        _xai_client = AsyncClient(
            management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
            api_key=os.getenv("XAI_API_KEY"),
            timeout=600,
        )
    return _xai_client


def _get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None:
        _http_client = httpx.AsyncClient()
    return _http_client


async def create_collection(project_id: str) -> str:
    """Create an xAI Collection for a project. Returns the xAI collection_id."""
    collection = await _get_xai_client().collections.create(
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
    response = await _get_http_client().post(
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


async def search_collection(
    collection_id: str,
    selected_files: Sequence[str],
    query: str,
    top_k: int = 5,
    candidate_limit: int = 40,
) -> list[SearchMatch]:
    """
    Search an xAI collection and return the top matches restricted to selected files.

    NOTE: xAI's SearchRequest only supports collection-level scoping (DocumentsSource
    only has `collection_ids` — no file/document-level filter). So `selected_files`
    MUST be applied client-side after the search returns. To avoid the post-filter
    silently emptying the result set when a collection holds many files, we request a
    larger candidate pool (`candidate_limit`) from xAI and then keep the first `top_k`
    matches that belong to the selected files.

    :param collection_id: xAI collection to search within.
    :param selected_files: xAI file_ids the user selected; only matches from these are kept.
    :param query: search query.
    :param top_k: max matches to return after filtering (injected into answer context).
    :param candidate_limit: how many candidates to pull from xAI before client-side filtering.
    """
    results = await _get_xai_client().collections.search(
        query=query,
        collection_ids=[collection_id],
        retrieval_mode="hybrid",
        limit=candidate_limit,
    )
    # xAI can't scope by file_id, so filter the larger candidate pool client-side
    filtered_matches = [item for item in results.matches if item.file_id in selected_files]
    # cap at top_k — these are included in the context for answer generation
    return filtered_matches[:top_k]


async def delete_collection(collection_id: str):
    """删除整个collection文件夹, 包括里面的文件"""
    await _get_xai_client().collections.delete(collection_id)


async def delete_document(document_id: str):
    """无视文件的删除"""
    response = await _get_xai_client().files.delete(document_id)
    return response


async def list_files(limit: int = 100) -> list[dict]:
    """List all files uploaded to xAI. Useful for debugging upload status."""
    response = await _get_xai_client().files.list(limit=limit)
    return [
        {"id": f.id, "filename": f.filename, "size": f.size, "created_at": str(f.created_at)}
        for f in response.data
    ]


async def get_file(file_id: str) -> dict:
    """Get metadata for a specific xAI file by ID."""
    f = await _get_xai_client().files.get(file_id)
    return {"id": f.id, "filename": f.filename, "size": f.size, "created_at": str(f.created_at)}


async def download_document(document_id: str):
    """
    下载文件内容
    Download the actual content of a file.
    """
    response = await _get_xai_client().files.content(document_id)
    return response
