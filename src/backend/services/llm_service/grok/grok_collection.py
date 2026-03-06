import os
from collections.abc import Sequence

from dotenv import load_dotenv
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.proto.v6.documents_pb2 import SearchResponse

#load env


def create_collection(user_id: str, project_id: str):
    """
        Create a new collection for the user, essentially a new project
    :param user_id: 
    :param project_id: 
    :return: 
    """
    collection = client.collections.create(
        name=project_id,
        model_name="grok-embedding-small"
    )
    
def upload_document(collection_id: str):
    document = client.collections.upload_document(
        collection_id=collection_id,
        name="ml-fundamentals.txt",
        data=b"...",
    )
    return document
def search_collection(selected_files: Sequence[str], query: str) -> SearchResponse:
    """
    :param query: 
    :param selected_files: 
    :return: 
    """
    results = client.collections.search(
        query=query,
        collection_ids=selected_files, #user selected ids
        retrieval_mode="hybrid",
    )
    return results

def delete_collection(collection_id: str):
    """
        删除整个collection文件夹, 包括里面的文件
    :param collection_id: 
    :return: nothing
    """
    client.collections.delete(collection_id)
    
def delete_document(document_id: str):
    """
        无视文件的删除
    """
    response = client.files.delete(
        document_id
    )
    return response

def download_document(document_id: str):
    """
        下载文件内容
        Download the actual content of a file.
    :param document_id: 
    :return: 
    """
    response = client.files.content(
        document_id
    )
    return response



load_dotenv()


client = Client(
    management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
    api_key=os.getenv("XAI_API_KEY"),
)   

if __name__ == "__main__":
    # Example usage
    try:
        response = search(
            selected_files=["collection_58e69554-1cc5-4388-92b4-8bad7385c45b"],
            query="summarise this?"
        )
        print(response)
        chat = client.chat.create(model="grok-4-1-fast-reasoning")
        chat.append(
          user(
            "总结一下文章内容 \n\n" + response.matches[0].chunk_content
          )
        )
        response = chat.sample()
        print(f"Answer: {response.content}")
        print(f"\nUsage: {response.usage}")
    except Exception as e:
        print(f"Error during search: {e}")
