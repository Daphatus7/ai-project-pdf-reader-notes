# @file        project.py
# @description 
# @author      [Peiyu Wang]
# @date        23/1/2026
# @license     © 2026 . All rights reserved.
from pydantic import BaseModel
class ListProjectsResponse(BaseModel):
    """Response model for listing projects"""
    projects: list[dict]  # List of project details

class CreateProjectRequest(BaseModel):
    """Request model for creating a project"""
    name: str
    description: str | None = None
    
class CreateProjectResponse(BaseModel):
    """Response model for project details
        - success
    """
    response: str # keep it simple for now

class ProjectDeleteRequest(BaseModel):
    """Request model for deleting a project"""
    project_id: str
    
class ProjectDeleteResponse(BaseModel):
    """Response model for project deletion"""
    response: str # keep it simple for now

class GetDocumentsRequest(BaseModel):
    """Request model for getting documents"""
    project_id:  str  
class GetDocumentResponse(BaseModel):
    """Response model for getting projects"""
    documents: list[dict]  # List of project details

class UploadDocumentRequest(BaseModel):
    """Request model for uploading a document"""
    project_id: str
    source_name: str | None = None
    
class UploadDocumentResponse(BaseModel):
    """Response model for document upload"""
    document_id: str
    filename: str
class DeleteDocumentRequest(BaseModel):
    """Request model for deleting a document"""
    document_id: str
    project_id: str
    
class DeleteDocumentResponse(BaseModel):
    """Response model for document deletion"""
    response: str  # keep it simple for now