# @file        supabase_storage.py
# @description Database service for projects and documents management using Supabase
# @author      [Peiyu Wang]
# @date        30/12/2025
# @license     © 2025 . All rights reserved.

import logging
import os
import dotenv
from supabase import create_client, Client

from src.backend.schemas.chat.llm import LoadThreadRequest
from src.backend.services.service import Service
from src.backend.config.config import settings
from src.backend.config.plans import get_plan_quotas
from src.backend.schemas.error import (
    AppError, not_found, conflict, internal_error, quota_exceeded,
)

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
        self.__auth_client = None

    def get(self):
        return self.__database

    def start(self):
        url: str = os.environ.get('SUPABASE_URL')
        if url is None:
            raise ValueError('SUPABASE_URL environment variable is not set.')
        key: str = os.environ.get('SUPABASE_SECRET_KEY')
        if key is None:
            raise ValueError('SUPABASE_KEY environment variable is not set.')

        # Separate clients: __database for DB operations (service_role, never mutated),
        # __auth_client for login/register (its auth state will change per call).
        self.__database: Client = create_client(url, key)
        self.__auth_client: Client = create_client(url, key)
        logger.info('Supabase database service started')

    # ==================== Auth Operations ====================

    async def register(self, request) -> dict:
        try:
            logger.info(f"Attempting to register {request.email}")
            resp = self.__auth_client.auth.sign_up({
                "email": request.email,
                "password": request.password,
                "options": {
                    "data": {
                        "username": request.username,
                        "full_name": "atlas user", #todo placeholder, not actually used in production
                    }
                }
            })
            return resp
        except AppError:
            raise
        except Exception as e:
            logger.error(f'Register failed for email {request.email}: {e}')
            internal_error('Registration failed')

    async def login(self, email: str, password: str) -> dict:
        try:
            logger.info("Attempting to log in user with email: %s", email)
            resp = self.__auth_client.auth.sign_in_with_password({
                'email': email,
                'password': password,
            })
            return resp
        except Exception as e:
            logger.error(f'Login failed for email {email}: {e}')
            internal_error('Login failed')

    async def create_user_profile(self, user_id: str, display_name: str) -> None:
        try:
            resp = self.__database.table('profiles').upsert({
                'id': user_id,
                'display_name': display_name,
            }).execute()
            # Initialize usage tracking row
            self.__database.table('user_usages').upsert({
                'user_id': user_id,
            }).execute()
            logger.info(f'User profile created for user {user_id}')
            return resp
        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to create user profile for user {user_id}: {e}')
            internal_error('Failed to create profile')

    # ==================== Quota Enforcement ====================

    async def enforce_quota(self, user_id: str, resource: str) -> bool:
        """Check plan quotas from plan JSON, atomically increment. Raises AppError(429) if exceeded."""
        plan = await self.get_user_plan(user_id)
        quotas = get_plan_quotas(plan)
        resource_map = {
            'project_count': ('max_projects',  'projects'),
            'doc_count':     ('max_documents', 'documents'),
            'note_count':    ('max_notes',     'notes'),
        }
        quota_key, display_name = resource_map[resource]
        limit = quotas[quota_key]
        result = await self.check_and_increment_usage(user_id, resource, limit)
        if not result['allowed']:
            quota_exceeded(display_name, result['current'], limit)
        return True

    async def enforce_token_quota(self, user_id: str):
        """Check token quota (read-only, no increment). Raises AppError(429) if exceeded."""
        plan = await self.get_user_plan(user_id)
        quotas = get_plan_quotas(plan)
        limit = quotas['max_tokens']
        result = await self.check_token_limit(user_id, limit)
        if not result['allowed']:
            quota_exceeded('tokens', result['current'], limit)

    async def track_token_usage(self, user_id: str, tokens: int):
        """Increment token usage for all plans."""
        if tokens and tokens > 0:
            await self.increment_token_usage(user_id, tokens)

    # ==================== Projects Operations ====================

    async def list_projects(self, user_id: str) -> list[dict]:
        try:
            response = self.__database.table('projects').select('*').eq('user_id', user_id).execute()
            return response.data
        except Exception as e:
            logger.error(f'Failed to get projects for user {user_id}: {e}')
            internal_error('Failed to retrieve projects')

    async def create_project(self, user_id: str, payload) -> str:
        """Create a new project with quota enforcement and rollback."""
        incremented = await self.enforce_quota(user_id, 'project_count')
        try:
            project_data = {
                'user_id': user_id,
                'name': payload.name,
                'description': payload.description or '',
            }
            response = self.__database.table('projects').insert(project_data).execute()
            if not response.data:
                internal_error('Failed to create project')
            project_id = response.data[0]['id']
            logger.info(f'Project created: user={user_id}, project={project_id}')
            return f'Project created successfully with ID: {project_id}'
        except AppError:
            if incremented:
                await self.decrement_usage(user_id, 'project_count')
            raise
        except Exception as e:
            if incremented:
                await self.decrement_usage(user_id, 'project_count')
            logger.error(f'Failed to create project for user {user_id}: {e}')
            internal_error('Failed to create project')

    async def delete_project(self, user_id: str, project_id: str) -> dict:
        """Delete a project: storage files → cascade delete → decrement usage."""
        try:
            # Verify project belongs to user
            project = self.__database.table('projects').select('id').eq('id', project_id).eq('user_id', user_id).execute()
            if not project.data:
                not_found('Project')

            # Get documents for storage cleanup and usage count
            docs = self.__database.table('documents').select('document_dir').eq('project_id', project_id).eq('user_id', user_id).execute()
            doc_count = len(docs.data) if docs.data else 0

            # Delete storage files (best-effort)
            storage_paths = [d['document_dir'] for d in (docs.data or []) if d.get('document_dir')]
            if storage_paths:
                try:
                    self.__database.storage.from_('docs').remove(storage_paths)
                    logger.info(f'Deleted {len(storage_paths)} files from storage')
                except Exception as e:
                    logger.error(f'Failed to delete storage files: {e}')

            # Cascade delete project
            self.__database.table('projects').delete().eq('id', project_id).eq('user_id', user_id).execute()
            logger.info(f'Project deleted: user={user_id}, project={project_id}')

            # Decrement usage counters
            await self.decrement_usage(user_id, 'project_count')
            if doc_count > 0:
                await self.decrement_usage_by(user_id, 'doc_count', doc_count)

            return {'response': 'Project deleted successfully'}

        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to delete project {project_id} for user {user_id}: {e}')
            internal_error('Failed to delete project')

    # ==================== Documents Operations ====================

    async def upload_document(
        self, user_id: str, project_id: str, document_name: str, file_data: bytes
    ) -> dict:
        """Create a document record and upload the PDF to Supabase Storage.
        Returns the created document record (including its id).
        Rolls back the DB record if storage upload fails.
        """
        try:
            response = self.__database.table("documents").insert({
                "user_id": user_id,
                "project_id": project_id,
                "document_name": document_name,
                "document_dir": "",
                "description": "",
            }).execute()
            if not response.data:
                internal_error("Failed to create document record")
            document = response.data[0]
            document_id = document["id"]
        except AppError:
            raise
        except Exception as e:
            logger.error(f"Failed to create document record: {e}")
            internal_error("Failed to create document record")

        storage_path = f"{user_id}/documents/{document_id}.pdf"
        try:
            self.__database.storage.from_("docs").upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": "application/pdf"},
            )
            self.__database.table("documents").update(
                {"document_dir": storage_path}
            ).eq("id", document_id).execute()
            logger.info(f"Document uploaded: user={user_id}, document={document_id}")
            document["document_dir"] = storage_path
            return document
        except Exception as e:
            self.__database.table("documents").delete().eq("id", document_id).execute()
            logger.error(f"Storage upload failed, rolled back document record: {e}")
            internal_error("Failed to upload document to storage")



    async def get_documents(self, user_id: str, project_id: str) -> list[dict]:
        try:
            project = self.__database.table('projects').select('id').eq('id', project_id).eq('user_id', user_id).execute()
            if not project.data:
                not_found('Project')
            response = self.__database.table('documents').select('*').eq('project_id', project_id).eq('user_id', user_id).execute()
            return response.data
        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to get documents for project {project_id}: {e}')
            internal_error('Failed to retrieve documents')

    async def delete_document(self, user_id: str, document_id: str, project_id: str) -> dict:
        """Delete a document: storage file → DB record → decrement usage."""
        try:
            document = (self.__database.table('documents')
                        .select('id, document_dir')
                        .eq('id', document_id)
                        .eq('user_id', user_id)
                        .eq('project_id', project_id)
                        .execute())
            if not document.data:
                not_found('Document')

            # Delete from storage
            storage_path = document.data[0].get('document_dir')
            if storage_path:
                self.__database.storage.from_('docs').remove([storage_path])
                logger.info(f'Deleted from storage: {storage_path}')

            # Delete document record
            self.__database.table('documents').delete().eq('id', document_id).eq('user_id', user_id).execute()
            logger.info(f'Document deleted: user={user_id}, project={project_id}, document={document_id}')

            # Decrement usage
            await self.decrement_usage(user_id, 'doc_count')

            return {'response': 'Document deleted successfully'}

        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to delete document {document_id}: {e}')
            internal_error('Failed to delete document')

    async def get_document_url(self, user_id: str, document_id: str, project_id: str) -> str:
        """Get a signed URL for viewing a document PDF."""
        try:
            document = (self.__database.table('documents')
                        .select('document_dir')
                        .eq('id', document_id)
                        .eq('user_id', user_id)
                        .eq('project_id', project_id)
                        .single()
                        .execute())
            if not document.data:
                not_found('Document')
            storage_path = document.data['document_dir']
            signed = self.__database.storage.from_('docs').create_signed_url(storage_path, expires_in=3600)
            return signed['signedURL']
        except AppError:
            raise
        except Exception as e:
            logger.exception(f"Failed to generate document URL: {e}")
            internal_error('Failed to generate document URL')

    # ==================== Conversation Threads Operations ====================

    async def list_conversation_threads(self, user_id: str) -> dict:
        try:
            response = (self.__database.table('threads')
                        .select('*')
                        .eq('user_id', user_id)
                        .order('updated_at', desc=True)
                        .execute())
            return response.data
        except Exception as e:
            logger.error(f'Failed to get conversation threads for user {user_id}: {e}')
            internal_error('Failed to retrieve conversation threads')

    async def create_conversation_thread(self, user_id: str) -> dict:
        try:
            thread_data = {
                'user_id': user_id,
                'title': "New Conversation",
                'thread_summary': "To be generated in the future",
            }
            response = self.__database.table('threads').insert(thread_data).execute()
            if not response.data:
                internal_error('Failed to create conversation thread')
            thread_id = response.data[0]['id']
            logger.info(f'Thread created: user={user_id}, thread={thread_id}')
            return {'thread_id': thread_id,
                    'title': thread_data['title'],
                    'thread_summary': thread_data['thread_summary']}
        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to create conversation thread for user {user_id}: {e}')
            internal_error('Failed to create conversation thread')

    async def load_conversation_thread(self, user_id: str, request: LoadThreadRequest) -> dict:
        thread_id = request.thread_id
        try:
            messages_response = (self.__database.table('messages')
                                 .select('*')
                                 .eq('thread_id', thread_id)
                                 .order('created_at', desc=False)
                                 .execute())
            return messages_response.data
        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to load conversation thread {thread_id}: {e}')
            internal_error('Failed to load conversation thread')

    async def delete_conversation_thread(self, user_id: str, request) -> dict:
        thread_id = request.thread_id
        try:
            (self.__database.table('threads')
             .delete()
             .eq('id', thread_id)
             .eq('user_id', user_id)
             .execute())
            logger.info(f'Thread deleted: user={user_id}, thread={thread_id}')
            return {'response': 'Thread deleted successfully'}
        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to delete conversation thread {thread_id}: {e}')
            internal_error('Failed to delete conversation thread')

    # ==================== Message Persistence Operations ====================

    async def save_message(
        self,
        user_id: str,
        thread_id: str,
        role: str,
        content: list[dict],
        token_count: int
    ) -> dict:
        try:
            message_data = {
                'user_id': user_id,
                'thread_id': thread_id,
                'role': role,
                'content': content,
                'token_count': token_count,
            }
            response = self.__database.table('messages').insert(message_data).execute()
            if not response.data:
                internal_error('Failed to save message')
            logger.info(f'Message saved: thread={thread_id}, role={role}, tokens={token_count}')
            return response.data[0]
        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to save message for thread {thread_id}: {e}')
            internal_error('Failed to save message')

    async def load_recent_messages(
        self,
        thread_id: str,
        max_messages: int | None = None,
        max_tokens: int | None = None
    ) -> list[dict]:
        if max_messages is None:
            max_messages = settings.cold_start_max_messages
        if max_tokens is None:
            max_tokens = settings.cold_start_max_tokens

        try:
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

        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to load messages for thread {thread_id}: {e}')
            internal_error('Failed to load messages')

    async def thread_exists(self, thread_id: str) -> bool:
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
        try:
            response = (self.__database.table('notes')
                        .select('*')
                        .eq('user_id', user_id)
                        .order('updated_at', desc=True)
                        .execute())
            return response.data
        except Exception as e:
            logger.error(f'Failed to get notes for user {user_id}: {e}')
            internal_error('Failed to retrieve notes')

    async def get_note(self, user_id: str, note_id: str) -> dict:
        try:
            response = (self.__database.table('notes')
                        .select('*')
                        .eq('id', note_id)
                        .eq('user_id', user_id)
                        .execute())
            if not response.data:
                not_found('Note')
            return response.data[0]
        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to get note {note_id}: {e}')
            internal_error('Failed to retrieve note')

    async def create_note(self, user_id: str, payload) -> dict:
        """Create a new note with quota enforcement and rollback."""
        incremented = await self.enforce_quota(user_id, 'note_count')
        try:
            note_data = {
                'user_id': user_id,
                'title': payload.title,
                'content_markdown': payload.content_markdown,
                'summary': payload.summary,
                'metadata': payload.metadata or {},
                'version': 1,
            }
            response = self.__database.table('notes').insert(note_data).execute()
            if not response.data:
                internal_error('Failed to create note')
            logger.info(f'Note created: user={user_id}, note={response.data[0]["id"]}')
            return response.data[0]
        except AppError:
            if incremented:
                await self.decrement_usage(user_id, 'note_count')
            raise
        except Exception as e:
            if incremented:
                await self.decrement_usage(user_id, 'note_count')
            logger.error(f'Failed to create note for user {user_id}: {e}')
            internal_error('Failed to create note')

    async def update_note(self, user_id: str, note_id: str, payload) -> dict:
        try:
            # If content is changing, find orphaned images via note_assets table
            orphaned_storage_paths: list[str] = []
            orphaned_asset_ids: list[str] = []
            if payload.content_markdown is not None:
                assets = (self.__database.table('note_assets')
                          .select('id, storage_path, url')
                          .eq('note_id', note_id)
                          .execute())
                if assets.data:
                    new_content = payload.content_markdown
                    for asset in assets.data:
                        if asset['url'] not in new_content:
                            orphaned_storage_paths.append(asset['storage_path'])
                            orphaned_asset_ids.append(asset['id'])

            update_data = {}
            if payload.title is not None:
                update_data['title'] = payload.title
            if payload.content_markdown is not None:
                update_data['content_markdown'] = payload.content_markdown
            if payload.summary is not None:
                update_data['summary'] = payload.summary
            if payload.metadata is not None:
                update_data['metadata'] = payload.metadata

            update_data['version'] = payload.version + 1

            response = (self.__database.table('notes')
                        .update(update_data)
                        .eq('id', note_id)
                        .eq('user_id', user_id)
                        .eq('version', payload.version)
                        .execute())

            if not response.data:
                existing = (self.__database.table('notes')
                           .select('id, version')
                           .eq('id', note_id)
                           .eq('user_id', user_id)
                           .execute())
                if existing.data:
                    conflict(f'Version conflict. Current version: {existing.data[0]["version"]}')
                else:
                    not_found('Note')

            # Update succeeded — clean up orphaned images (best-effort)
            if orphaned_storage_paths:
                self._delete_note_images(orphaned_storage_paths)
                try:
                    self.__database.table('note_assets').delete().in_('id', orphaned_asset_ids).execute()
                except Exception as e:
                    logger.error(f'Failed to delete orphaned note_assets records: {e}')

            logger.info(f'Note updated: user={user_id}, note={note_id}')
            return response.data[0]

        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to update note {note_id}: {e}')
            internal_error('Failed to update note')

    async def delete_note(self, user_id: str, note_id: str) -> dict:
        """Delete a note, its images from storage, and decrement usage."""
        try:
            note = (self.__database.table('notes')
                    .select('id')
                    .eq('id', note_id)
                    .eq('user_id', user_id)
                    .execute())
            if not note.data:
                not_found('Note')

            # Delete associated images from Storage (note_assets cascade-deleted with note)
            assets = (self.__database.table('note_assets')
                      .select('storage_path')
                      .eq('note_id', note_id)
                      .execute())
            if assets.data:
                storage_paths = [a['storage_path'] for a in assets.data]
                self._delete_note_images(storage_paths)

            self.__database.table('notes').delete().eq('id', note_id).execute()
            logger.info(f'Note deleted: user={user_id}, note={note_id}')

            await self.decrement_usage(user_id, 'note_count')

            return {'message': 'Note deleted successfully'}
        except AppError:
            raise
        except Exception as e:
            logger.error(f'Failed to delete note {note_id}: {e}')
            internal_error('Failed to delete note')

    # ==================== Note Image Operations ====================

    def _delete_note_images(self, paths: list[str]) -> None:
        """Delete images from note-images storage bucket (best-effort)."""
        if not paths:
            return
        try:
            self.__database.storage.from_('note-images').remove(paths)
            logger.info(f'Deleted {len(paths)} note image(s) from storage')
        except Exception as e:
            logger.error(f'Failed to delete note images from storage: {e}')

    async def upload_note_image(
        self, user_id: str, note_id: str, file_data: bytes, filename: str, content_type: str
    ) -> str:
        """Upload an image to Supabase Storage, record in note_assets, return public URL."""
        import uuid as uuid_lib
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'jpg'
        image_id = uuid_lib.uuid4().hex
        storage_path = f"{user_id}/{image_id}.{ext}"

        try:
            self.__database.storage.from_('note-images').upload(
                path=storage_path,
                file=file_data,
                file_options={"content-type": content_type},
            )
        except Exception as e:
            logger.error(f'Failed to upload note image for user {user_id}: {e}')
            internal_error('Failed to upload image')

        supabase_url = os.environ.get('SUPABASE_URL', '')
        public_url = f"{supabase_url}/storage/v1/object/public/note-images/{storage_path}"

        try:
            self.__database.table('note_assets').insert({
                'note_id': note_id,
                'user_id': user_id,
                'storage_path': storage_path,
                'url': public_url,
            }).execute()
            logger.info(f'Note image uploaded and recorded: {storage_path}')
        except Exception as e:
            logger.error(f'Failed to record note asset for note {note_id}: {e}')
            # Roll back uploaded image to avoid leaving untracked storage objects
            try:
                self._delete_note_images([storage_path])
            except Exception as cleanup_err:
                logger.error(f'Failed to roll back uploaded note image {storage_path}: {cleanup_err}')
            internal_error('Failed to record note asset')
        return public_url

    # ==================== Usage Tracking Operations ====================

    async def get_user_plan(self, user_id: str) -> str:
        try:
            response = self.__database.table('profiles').select('plan').eq('id', user_id).execute()
            if response.data:
                return response.data[0].get('plan', 'free')
            return 'free'
        except Exception as e:
            logger.error(f'Failed to get user plan for {user_id}: {e}')
            return 'free'

    async def check_and_increment_usage(self, user_id: str, field: str, limit: int) -> dict:
        try:
            response = self.__database.rpc('check_and_increment', {
                'p_user_id': user_id,
                'p_field': field,
                'p_limit': limit,
            }).execute()
            return response.data
        except Exception as e:
            logger.error(f'Usage check_and_increment failed for {user_id}/{field}: {e}')
            internal_error('Failed to check usage quota')

    async def decrement_usage(self, user_id: str, field: str) -> None:
        try:
            self.__database.rpc('decrement_usage', {
                'p_user_id': user_id,
                'p_field': field,
            }).execute()
        except Exception as e:
            logger.error(f'Usage decrement failed for {user_id}/{field}: {e}')

    async def decrement_usage_by(self, user_id: str, field: str, amount: int) -> None:
        try:
            self.__database.rpc('decrement_usage_by', {
                'p_user_id': user_id,
                'p_field': field,
                'p_amount': amount,
            }).execute()
        except Exception as e:
            logger.error(f'Usage batch decrement failed for {user_id}/{field}: {e}')

    async def check_token_limit(self, user_id: str, limit: int) -> dict:
        try:
            response = self.__database.rpc('check_token_limit', {
                'p_user_id': user_id,
                'p_limit': limit,
            }).execute()
            return response.data
        except Exception as e:
            logger.error(f'Token limit check failed for {user_id}: {e}')
            internal_error('Failed to check token quota')

    async def increment_token_usage(self, user_id: str, amount: int) -> int:
        try:
            response = self.__database.rpc('increment_token_usage', {
                'p_user_id': user_id,
                'p_amount': amount,
            }).execute()
            return response.data
        except Exception as e:
            logger.error(f'Token usage increment failed for {user_id}: {e}')

    async def get_user_usage(self, user_id: str) -> dict:
        try:
            response = self.__database.rpc('get_user_usage', {
                'p_user_id': user_id,
            }).execute()
            return response.data
        except Exception as e:
            logger.error(f'Failed to get usage for {user_id}: {e}')
            return {'project_count': 0, 'doc_count': 0, 'note_count': 0, 'token_used': 0}

    # ==================== Stripe / Subscription Operations ====================

    async def get_stripe_customer_id(self, user_id: str) -> str | None:
        try:
            response = (self.__database.table('profiles')
                        .select('stripe_customer_id')
                        .eq('id', user_id)
                        .execute())
            if response.data:
                return response.data[0].get('stripe_customer_id')
            return None
        except Exception as e:
            logger.error(f'Failed to get stripe_customer_id for {user_id}: {e}')
            return None

    async def get_profile_by_stripe_customer(self, stripe_customer_id: str) -> dict | None:
        try:
            response = (self.__database.table('profiles')
                        .select('id, stripe_customer_id, stripe_subscription_id, subscription_status, plan, current_period_end')
                        .eq('stripe_customer_id', stripe_customer_id)
                        .execute())
            if response.data:
                return response.data[0]
            return None
        except Exception as e:
            logger.error(f'Failed to get profile for stripe_customer {stripe_customer_id}: {e}')
            return None

    async def update_profile_stripe(self, user_id: str, **fields) -> None:
        try:
            self.__database.table('profiles').update(fields).eq('id', user_id).execute()
            logger.info(f'Updated stripe fields for user {user_id}: {list(fields.keys())}')
        except Exception as e:
            logger.error(f'Failed to update stripe fields for {user_id}: {e}')
            internal_error('Failed to update subscription')

    async def get_subscription_status(self, user_id: str) -> dict:
        try:
            response = (self.__database.table('profiles')
                        .select('plan, subscription_status, plan_interval, current_period_end, cancel_at_period_end')
                        .eq('id', user_id)
                        .execute())
            return response.data[0] if response.data else {}
        except Exception as e:
            logger.error(f'Failed to get subscription status for {user_id}: {e}')
            return {}

    async def downgrade_to_free(self, stripe_customer_id: str) -> None:
        try:
            profile_resp = self.__database.table('profiles').update({
                'plan': 'free',
                'subscription_status': 'canceled',
                'stripe_subscription_id': None,
                'cancel_at_period_end': False,
                'current_period_end': None,
            }).eq('stripe_customer_id', stripe_customer_id).execute()
            logger.info(f'Downgraded to free: stripe_customer={stripe_customer_id}')

            if not profile_resp.data:
                logger.warning(f'downgrade_to_free: no profile found for stripe_customer={stripe_customer_id}, skipping usage update')
                return

            user_id = profile_resp.data[0]['id']
            logger.info(f"downgrade complete for user={user_id}, quotas enforced via plan config")
        except Exception as e:
            logger.error(f'Failed to downgrade stripe_customer {stripe_customer_id} to free: {e}')
