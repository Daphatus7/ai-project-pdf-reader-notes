# @file        supabase_storage.py
# @description Database service for projects and documents management using Supabase
# @author      [Peiyu Wang]
# @date        30/12/2025
# @license     © 2025 . All rights reserved.

import logging
import os
import dotenv
from fastapi import HTTPException
from supabase import create_client, Client

from src.backend.schemas.chat.llm import LoadThreadRequest
from src.backend.services.service import Service

logger = logging.getLogger(__name__)


class Database(Service):
    """
        Database service for managing projects and documents in Supabase.
        
        Provides CRUD operations for:
        - Projects: User's organizational units
        - Documents: PDF files associated with projects
    """
    
    def __init__(self):
        dotenv.load_dotenv()
        self.__database = None
        
    def get(self):
        """
        Get the Supabase client instance.
        
        Returns:
            Client: Supabase client instance
        """
        return self.__database

    def start(self):
        """
        Initialize the Supabase client connection.
        
        Raises:
            ValueError: If environment variables are not set
        """
        try:
            url: str = os.environ.get('SUPABASE_URL')
            if url is None:
                raise ValueError('SUPABASE_URL environment variable is not set.')
        except Exception as e:
            raise ValueError('SUPABASE_URL environment variable is not set.') from e
        try:
            key: str = os.environ.get('SUPABASE_KEY')
            if key is None:
                raise ValueError('SUPABASE_KEY environment variable is not set.')
        except Exception as e:
            raise ValueError('SUPABASE_KEY environment variable is not set.') from e

        self.__database: Client = create_client(url, key)
        logger.info('Supabase database service started')
        
    async def login(self, email: str, password: str) -> dict:
        """
        Login a user using email and password.
        
        Args:
            email: User's email
            password: User's password
        Returns:
            dict: Authentication response containing access token and user info
        """
        try:
            logger.info("Attempting to log in user with email: %s", email)
            resp = self.__database.auth.sign_in_with_password({
                'email': email,
                'password': password,
            })
            return resp
        except Exception as e:
            logger.error(f'Login failed for email {email}: {e}')
            raise HTTPException(status_code=500, detail='Login failed')
        
    async def create_user_profile(self, user_id: str, 
                                  display_name: str,
                                  ) -> None:
        """
            Create a user profile in the database.
        :param user_id: 
        :param display_name: 
        :return: 
        """
        try:
            
            resp=self.__database.table('profiles').insert({
                'id': user_id,
                'display_name': display_name,
            }).execute()
            logger.info(f'User profile created for user {user_id}')
            return resp
        except Exception as e:
            logger.error(f'Failed to create user profile for user {user_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to create user profile')

    # ==================== Projects Operations ====================

    async def list_projects(self, user_id: str) -> list[dict]:
        """
        Get all projects for a specific user.
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            List of project dictionaries with id, name, description, created_at, updated_at
        """
        try:
            response = self.__database.table('projects').select('*').eq('user_id', user_id).execute()
            #dump response to json
            return response.data
        except Exception as e:
            logger.error(f'Failed to get projects for user {user_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to retrieve projects')

    async def create_project(self, user_id: str, payload) -> str:
        """
        Create a new project for a user.
        
        Args:
            user_id: User's unique identifier
            payload: CreateProjectRequest with name and optional description
            
        Returns:
            Success message with project ID
        """
        try:
            project_data = {
                'user_id': user_id,
                'name': payload.name,
                'description': payload.description or '',
            }
            
            response = self.__database.table('projects').insert(project_data).execute()
            
            if response.data:
                project_id = response.data[0]['id']
                logger.info(f'Project created: user={user_id}, project={project_id}')
                return f'Project created successfully with ID: {project_id}'
            else:
                raise HTTPException(status_code=500, detail='Failed to create project')
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to create project for user {user_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to create project')

    async def delete_project(self, user_id: str, project_id: str) -> dict:
        """
        Delete a project and all associated documents.
        
        Args:
            user_id: User's unique identifier
            project_id: Project's unique identifier
            
        Returns:
            Response dictionary with deletion status
            
        Note:
            Documents will be cascade deleted due to foreign key constraints.
        """
        try:
            # Verify project belongs to user
            project = self.__database.table('projects').select('id').eq('id', project_id).eq('user_id', user_id).execute()
            
            if not project.data:
                raise HTTPException(status_code=404, detail='Project not found or access denied')
            
            # Delete project (documents cascade)
            response = self.__database.table('projects').delete().eq('id', project_id).eq('user_id', user_id).execute()
            
            logger.info(f'Project deleted: user={user_id}, project={project_id}')
            return {'response': 'Project deleted successfully'}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to delete project {project_id} for user {user_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to delete project')

    # ==================== Documents Operations ====================

    async def get_documents(self, user_id: str, project_id: str) -> list[dict]:
        """
        Get all documents for a specific project.
        
        Args:
            user_id: User's unique identifier
            project_id: Project's unique identifier
            
        Returns:
            List of document dictionaries
        """
        try:
            # Verify project belongs to user
            project = self.__database.table('projects').select('id').eq('id', project_id).eq('user_id', user_id).execute()
            
            if not project.data:
                raise HTTPException(status_code=404, detail='Project not found or access denied')
            
            # Get documents
            response = self.__database.table('documents').select('*').eq('project_id', project_id).eq('user_id', user_id).execute()
            
            return response.data
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to get documents for project {project_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to retrieve documents')

    async def delete_document(self, user_id: str, document_id: str, project_id: str) -> dict:
        """
        Delete a document from a project.
        
        Args:
            user_id: User's unique identifier
            document_id: Document's unique identifier
            project_id: Project's unique identifier
            
        Returns:
            Response dictionary with deletion status
            
        Note:
            Vector embeddings should be deleted separately from the vector database.
        """
        try:
            # Verify document belongs to user and project
            document = (self.__database.table('documents')
                        .select('id')
                        .eq('id', document_id)
                        .eq('user_id', user_id)
                        .eq('project_id', project_id)
                        .execute())

            if not document.data:
                raise HTTPException(status_code=404, detail='Document not found or access denied')
            
            # Delete document
            response = self.__database.table('documents').delete().eq('id', document_id).eq('user_id', user_id).execute()
            
            return {'response': 'Document deleted successfully'}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to delete document {document_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to delete document')
        
    # ==================== Conversation Threads Operations ====================

    async def list_conversation_threads(self, user_id: str) -> dict:
        """
        Get all conversation threads for a specific user.

        Args:
            user_id: User's unique identifier
        Returns:
            Dictionary with list of thread dictionaries
        """
        try:
            response = (self.__database.table('threads')
                        .select('*')
                        .eq('user_id', user_id)
                        .order('updated_at', desc=True)
                        .execute())
            return response.data
        except Exception as e:
            logger.error(f'Failed to get conversation threads for user {user_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to retrieve conversation threads')

    async def create_conversation_thread(self, user_id: str) -> dict:
        """
        Create a new conversation thread for a user.

        Args:
            user_id: User's unique identifier

        Returns:
            Dictionary with thread_id and empty messages list
        """
        try:
            thread_data = {
                'user_id': user_id,
                'title': "New Conversation",
                'thread_summary': "To be generated in the future",
            }

            response = self.__database.table('threads').insert(thread_data).execute()

            if response.data:
                thread_id = response.data[0]['id']
                logger.info(f'Thread created: user={user_id}, thread={thread_id}')
                return {'thread_id': thread_id, 'messages': []}
            else:
                raise HTTPException(status_code=500, detail='Failed to create conversation thread')

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to create conversation thread for user {user_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to create conversation thread')

    async def load_conversation_thread(self, user_id: str, request: LoadThreadRequest) -> dict:
        """
        Load a conversation thread with its messages.

        Args:
            user_id: User's unique identifier
            request: LoadThreadRequest with thread_id

        Returns:
            Dictionary with messages list
        """
        thread_id = request.thread_id
        try:
            # Load messages for this thread
            messages_response = (self.__database.table('messages')
                                 .select('*')
                                 .eq('thread_id', thread_id)
                                 .order('created_at', desc=False)
                                 .execute())
            return messages_response.data
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to load conversation thread {thread_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to load conversation thread')

    async def delete_conversation_thread(self, user_id: str, request) -> dict:
        """
        Delete a conversation thread.

        Args:
            user_id: User's unique identifier
            request: DeleteThreadRequest with thread_id

        Returns:
            Response dictionary with deletion status
        """
        thread_id = request.thread_id
        try:
            # Delete thread (messages will cascade delete)
            (self.__database.table('threads')
             .delete()
             .eq('id', thread_id)
             .eq('user_id', user_id)
             .execute())

            logger.info(f'Thread deleted: user={user_id}, thread={thread_id}')
            return {'response': 'Thread deleted successfully'}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to delete conversation thread {thread_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to delete conversation thread')
