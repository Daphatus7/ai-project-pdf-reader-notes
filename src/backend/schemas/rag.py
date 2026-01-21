# @file        rag.py
# @description 
# @author      [Peiyu Wang]
# @date        21/1/2026
# @license     © 2026 . All rights reserved.
from pydantic import BaseModel


class RagRequest(BaseModel):
    """
        request send to backend for uploading a pdf as context
    """
    ...

class UploadResponse(BaseModel):
    """
        response after uploading the pdf
    """
    ...

class RagDeleteRequest(BaseModel):
    """
        Request to delete the rag context from the vector database.
    """
    ...
class RagDeleteResponse(BaseModel):
    """
        Response from deleting the rag, e.g. fail, does not exist, success and so on.
    """