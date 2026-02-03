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

from src.backend.schemas import RegisterRequest
from src.backend.schemas.chat.llm import LoadThreadRequest
from src.backend.services.service import Service
from src.backend.config.config import settings

logger = logging.getLogger(__name__)


class SupabaseStorage(Service):
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
    
    async def register(self, request) -> dict:
        try:
            logger.info(f"Attempting to register {request.email}")
            resp = self.__database.auth.sign_up({
                "email": request.email,
                "password": request.password,
                "options": {
                    "data": {
                        "username": request.username,
                        "full_name": request.full_name,
                    }
                }
            })
            return resp
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Register failed for email {request.email}: {e}')
            raise HTTPException(status_code=500, detail='Register failed')   
        
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
            
            resp = self.__database.table('profiles').upsert({
                'id': user_id,
                'display_name': display_name,
            }).execute()
            logger.info(f'User profile created for user {user_id}')
            return resp
        except HTTPException:
            raise
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
                return {'thread_id': thread_id, 
                        'title': thread_data['title'],
                        'thread_summary': thread_data['thread_summary']}
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

    # ==================== Message Persistence Operations ====================

    async def save_message(
        self,
        user_id: str,
        thread_id: str,
        role: str,
        content: list[dict],
        token_count: int
    ) -> dict:
        """
        Save a single message to the database.

        Args:
            user_id: User's unique identifier
            thread_id: Conversation thread ID
            role: Message role ('user', 'assistant', 'system')
            content: Message content as list of ChatContent dicts [{type, text/data, ...}]
            token_count: Token count for this message

        Returns:
            Created message record
        """
        try:

            message_data = {
                'user_id': user_id,
                'thread_id': thread_id,
                'role': role,
                'content': content,
                'token_count': token_count,
            }

            response = self.__database.table('messages').insert(message_data).execute()

            if response.data:
                logger.info(f'Message saved: thread={thread_id}, role={role}, tokens={token_count}')
                return response.data[0]
            else:
                raise HTTPException(status_code=500, detail='Failed to save message')

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to save message for thread {thread_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to save message')

    async def load_recent_messages(
        self,
        thread_id: str,
        max_messages: int | None = None,
        max_tokens: int | None = None
    ) -> list[dict]:
        """
        Load recent messages from a thread with dual limits.

        Stops when either limit is reached (whichever comes first).
        Returns messages in chronological order (oldest first).

        Args:
            thread_id: Conversation thread ID
            max_messages: Maximum messages to load (default: settings.cold_start_max_messages)
            max_tokens: Maximum total tokens (default: settings.cold_start_max_tokens)

        Returns:
            List of message dicts in chronological order
        """
        if max_messages is None:
            max_messages = settings.cold_start_max_messages
        if max_tokens is None:
            max_tokens = settings.cold_start_max_tokens

        try:
            # Fetch messages ordered by newest first, limited by max_messages
            response = (self.__database.table('messages')
                        .select('id, user_id, role, content, token_count, created_at')
                        .eq('thread_id', thread_id)
                        .order('created_at', desc=True)
                        .limit(max_messages)
                        .execute())

            if not response.data:
                logger.info(f"No messages found for thread {thread_id}")
                return []

            # Apply token limit
            selected_messages = []
            total_tokens = 0
            #dump the response data to json
            with open("debug_supabase_messages.json", "w") as f:
                import json
                json.dump(response.data, f, indent=4)

            for msg in response.data:
                msg_tokens = msg.get('token_count', 0)
                if total_tokens + msg_tokens > max_tokens and selected_messages:
                    break
                selected_messages.append(msg)
                total_tokens += msg_tokens

            # Reverse to chronological order (oldest first)
            selected_messages.reverse()

            logger.info(
                f'Cold start: loaded {len(selected_messages)} messages ({total_tokens} tokens) for thread={thread_id}'
            )
            return selected_messages

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to load messages for thread {thread_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to load messages')

    async def thread_exists(self, thread_id: str) -> bool:
        """
        Check if a thread exists in the database.

        Args:
            thread_id: Thread ID to check

        Returns:
            True if thread exists, False otherwise
        """
        try:
            response = (self.__database.table('threads')
                        .select('id')
                        .eq('id', thread_id)
                        .execute())
            return len(response.data) > 0
        except Exception as e:
            logger.error(f'Failed to check thread existence {thread_id}: {e}')
            return False

    # ==================== Notes Operations ====================

    async def list_notes(self, user_id: str) -> list[dict]:
        """
        Get all notes for a specific user.

        Args:
            user_id: User's unique identifier

        Returns:
            List of note dictionaries ordered by updated_at desc
        """
        try:
            response = (self.__database.table('notes')
                        .select('*')
                        .eq('user_id', user_id)
                        .order('updated_at', desc=True)
                        .execute())
            return response.data
        except Exception as e:
            logger.error(f'Failed to get notes for user {user_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to retrieve notes')

    async def get_note(self, user_id: str, note_id: str) -> dict:
        """
        Get a single note by ID.

        Args:
            user_id: User's unique identifier
            note_id: Note's unique identifier

        Returns:
            Note dictionary

        Raises:
            HTTPException 404 if note not found
        """
        try:
            response = (self.__database.table('notes')
                        .select('*')
                        .eq('id', note_id)
                        .eq('user_id', user_id)
                        .execute())

            if not response.data:
                raise HTTPException(status_code=404, detail='Note not found')

            return response.data[0]
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to get note {note_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to retrieve note')

    async def create_note(self, user_id: str, payload) -> dict:
        """
        Create a new note for a user.

        Args:
            user_id: User's unique identifier
            payload: CreateNoteRequest

        Returns:
            Created note dictionary
        """
        try:
            note_data = {
                'user_id': user_id,
                'title': payload.title,
                'content_markdown': payload.content_markdown,
                'summary': payload.summary,
                'metadata': payload.metadata or {},
                'version': 1,
            }
            logger.info(
                f"user_id: {user_id}\n"
                f"title: {payload.title}\n"
                f"content_markdown: {payload.content_markdown}\n"
                f"summary: {payload.summary}\n"
                f"metadata: {payload.metadata}\n"
                f"version: 1\n"
            )

            response = self.__database.table('notes').insert(note_data).execute()

            if response.data:
                logger.info(f'Note created: user={user_id}, note={response.data[0]["id"]}')
                return response.data[0]
            else:
                raise HTTPException(status_code=500, detail='Failed to create note')

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to create note for user {user_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to create note')

    async def update_note(self, user_id: str, note_id: str, payload) -> dict:
        """
        Update a note with optimistic locking.

        Args:
            user_id: User's unique identifier
            note_id: Note's unique identifier
            payload: UpdateNoteRequest

        Returns:
            Updated note dictionary

        Raises:
            HTTPException 404 if note not found
            HTTPException 409 if version conflict (optimistic lock failure)
        """
        try:
            # Build update dict with only provided fields
            update_data = {}
            if payload.title is not None:
                update_data['title'] = payload.title
            if payload.content_markdown is not None:
                update_data['content_markdown'] = payload.content_markdown
            if payload.summary is not None:
                update_data['summary'] = payload.summary
            if payload.metadata is not None:
                update_data['metadata'] = payload.metadata

            # Increment version for optimistic locking
            update_data['version'] = payload.version + 1

            # Update only if version matches (optimistic locking)
            response = (self.__database.table('notes')
                        .update(update_data)
                        .eq('id', note_id)
                        .eq('user_id', user_id)
                        .eq('version', payload.version)
                        .execute())

            if not response.data:
                # Check if note exists but version mismatched
                existing = (self.__database.table('notes')
                           .select('id, version')
                           .eq('id', note_id)
                           .eq('user_id', user_id)
                           .execute())

                if existing.data:
                    raise HTTPException(
                        status_code=409,
                        detail=f'Version conflict. Current version: {existing.data[0]["version"]}'
                    )
                else:
                    raise HTTPException(status_code=404, detail='Note not found')

            logger.info(f'Note updated: user={user_id}, note={note_id}')
            return response.data[0]

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to update note {note_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to update note')

    async def delete_note(self, user_id: str, note_id: str) -> dict:
        """
        Delete a note.

        Args:
            user_id: User's unique identifier
            note_id: Note's unique identifier

        Returns:
            Response dictionary with deletion status
        """
        try:
            # Verify note belongs to user
            note = (self.__database.table('notes')
                    .select('id')
                    .eq('id', note_id)
                    .eq('user_id', user_id)
                    .execute())

            if not note.data:
                raise HTTPException(status_code=404, detail='Note not found')

            # Delete note
            self.__database.table('notes').delete().eq('id', note_id).execute()

            logger.info(f'Note deleted: user={user_id}, note={note_id}')
            return {'message': 'Note deleted successfully'}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f'Failed to delete note {note_id}: {e}')
            raise HTTPException(status_code=500, detail='Failed to delete note')
