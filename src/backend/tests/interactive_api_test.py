# @file        interactive_api_test.py
# @description Interactive API testing tool for projects and documents management
# @author      [Peiyu Wang]
# @date        25/1/2026
# @license     © 2026 . All rights reserved.
"""
Interactive API Testing Tool

Run with: python -m src.backend.tests.interactive_api_test

Prerequisites:
- Server must be running (uvicorn src.backend.main:app --reload)
- Set SUPABASE_JWT_SECRET and other required env vars
- Have a valid user token (or use test mode)
"""
import os
import sys
from pathlib import Path
import json
from typing import Optional

import dotenv

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

import httpx
import asyncio


# =============================================================================
# Authentication
# =============================================================================
async def login_and_get_token() -> Optional[str]:
    """
    Login to Supabase using TEST_EMAIL and TEST_PASSWORD from environment.
    Returns the access token if successful, None otherwise.
    """
    if not TEST_EMAIL or not TEST_PASSWORD:
        return None
    
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        print('⚠️  SUPABASE_URL or SUPABASE_ANON_KEY not set')
        return None
    
    print(f'\n🔐 Logging in as {TEST_EMAIL}...')
    
    auth_url = f'{SUPABASE_URL}/auth/v1/token?grant_type=password'
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(
                auth_url,
                headers={
                    'apikey': SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json'
                },
                json={
                    'email': TEST_EMAIL,
                    'password': TEST_PASSWORD
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                access_token = data.get('access_token')
                if access_token:
                    print(f'✅ Login successful')
                    return access_token
                else:
                    print('❌ No access token in response')
                    return None
            else:
                print(f'❌ Login failed: {response.status_code}')
                print(f'   {response.text}')
                return None
                
        except Exception as e:
            print(f'❌ Login error: {e}')
            return None


# =============================================================================
# API Client
# =============================================================================
class APIClient:
    """HTTP client for API testing"""
    
    def __init__(self, base_url: str, auth_token: Optional[str] = None):
        self.base_url = base_url
        self.auth_token = auth_token
        self.headers = {}
        if auth_token:
            self.headers['Authorization'] = f'Bearer {auth_token}'
    
    async def request(self, method: str, endpoint: str, **kwargs):
        """Make HTTP request"""
        url = f'{self.base_url}{endpoint}'
        
        async with httpx.AsyncClient(timeout=180.0) as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    **kwargs
                )
                return response
            except httpx.ConnectError:
                print(f'\n❌ Cannot connect to server at {self.base_url}')
                print(f'💡 Make sure the server is running:')
                print(f'   uvicorn src.backend.main:app --host {HOST} --port {PORT} --reload')
                return None
            except Exception as e:
                print(f'\n❌ Request failed: {e}')
                return None
    
    async def get(self, endpoint: str, **kwargs):
        return await self.request('GET', endpoint, **kwargs)
    
    async def post(self, endpoint: str, **kwargs):
        return await self.request('POST', endpoint, **kwargs)
    
    async def delete(self, endpoint: str, **kwargs):
        return await self.request('DELETE', endpoint, **kwargs)


# =============================================================================
# Display Helpers
# =============================================================================
def print_header(text: str):
    """Print formatted header"""
    print(f'\n{"="*70}')
    print(f' {text}')
    print(f'{"="*70}')


def print_response(response: httpx.Response):
    """Print formatted API response"""
    print(f'\n📡 Response Status: {response.status_code}')
    print(f'{"─"*70}')
    
    try:
        data = response.json()
        print(json.dumps(data, indent=2, ensure_ascii=False))
    except Exception:
        print(response.text)
    
    print(f'{"─"*70}')


def print_menu(title: str, options: list):
    """Print formatted menu"""
    print(f'\n📋 {title}')
    print(f'{"─"*70}')
    for i, option in enumerate(options, 1):
        print(f'  {i}. {option}')
    print(f'  0. Back to main menu')
    print(f'{"─"*70}')


# =============================================================================
# Project Management Tests
# =============================================================================
class ProjectTests:
    """Project management test functions"""
    
    def __init__(self, client: APIClient):
        self.client = client
    
    async def create_project(self):
        """Test: Create a new project"""
        print_header('Create Project')
        
        # Get input
        user_input = input('\n📝 Enter project name and description (space-separated)\n'
                          '   Example: MyProject This is a test project\n'
                          '   Press Enter for default: ').strip()
        
        if user_input:
            parts = user_input.split(' ', 1)
            name = parts[0]
            description = parts[1] if len(parts) > 1 else ''
        else:
            name = f'Test Project {asyncio.get_event_loop().time():.0f}'
            description = 'Auto-generated test project'
        
        print(f'\n🚀 Creating project: {name}')
        
        response = await self.client.post(
            '/api/v1/projects',
            json={'name': name, 'description': description}
        )
        
        if response:
            print_response(response)
    
    async def list_projects(self):
        """Test: List all projects"""
        print_header('List Projects')
        
        print('\n🔍 Fetching all projects...')
        
        response = await self.client.get('/api/v1/projects')
        
        if response:
            print_response(response)
    
    async def delete_project(self):
        """Test: Delete a project"""
        print_header('Delete Project')
        
        # First, list projects to help user choose
        print('\n🔍 Fetching current projects...')
        response = await self.client.get('/api/v1/projects')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                projects = data.get('projects', [])
                
                if not projects:
                    print('\n⚠️  No projects found. Create a project first.')
                    return
                
                print('\n📋 Available Projects:')
                for i, proj in enumerate(projects, 1):
                    print(f'  {i}. {proj.get("name")} (ID: {proj.get("id")})')
            except Exception as e:
                print(f'❌ Failed to parse projects: {e}')
                return
        else:
            print('❌ Failed to fetch projects')
            return
        
        # Get project ID
        project_id = input('\n🗑️  Enter project ID to delete: ').strip()
        
        if not project_id:
            print('⚠️  No project ID provided')
            return
        
        confirm = input(f'⚠️  Are you sure you want to delete project {project_id}? (y/N): ')
        
        if confirm.lower() != 'y':
            print('❌ Deletion cancelled')
            return
        
        print(f'\n🗑️  Deleting project: {project_id}')
        
        response = await self.client.delete(f'/api/v1/projects/{project_id}')
        
        if response:
            print_response(response)


# =============================================================================
# Document Management Tests
# =============================================================================
class DocumentTests:
    """Document management test functions"""
    
    def __init__(self, client: APIClient):
        self.client = client
    
    async def upload_document(self):
        """Test: Upload a document"""
        print_header('Upload Document')
        
        # Get project ID first
        project_id = input('\n📦 Enter project ID (or press Enter to list projects): ').strip()
        
        if not project_id:
            response = await self.client.get('/api/v1/projects')
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    projects = data.get('projects', [])
                    
                    if not projects:
                        print('\n⚠️  No projects found. Create a project first.')
                        return
                    
                    print('\n📋 Available Projects:')
                    for i, proj in enumerate(projects, 1):
                        print(f'  {i}. {proj.get("name")} (ID: {proj.get("id")})')
                    
                    project_id = input('\n📦 Enter project ID: ').strip()
                except Exception as e:
                    print(f'❌ Failed to parse projects: {e}')
                    return
        
        if not project_id:
            print('⚠️  No project ID provided')
            return
        
        # List available sample documents
        if not SAMPLE_DOCS_DIR.exists():
            print(f'\n⚠️  Sample documents directory not found: {SAMPLE_DOCS_DIR}')
            return
        
        pdf_files = sorted(SAMPLE_DOCS_DIR.glob('*.pdf'))
        
        if not pdf_files:
            print(f'\n⚠️  No PDF files found in {SAMPLE_DOCS_DIR}')
            return
        
        print('\n📄 Available PDF files:')
        for i, pdf in enumerate(pdf_files, 1):
            size_mb = pdf.stat().st_size / (1024 * 1024)
            print(f'  {i}. {pdf.name} ({size_mb:.2f} MB)')
        
        choice = input('\n📤 Select file number to upload: ').strip()
        
        try:
            choice_idx = int(choice) - 1
            if choice_idx < 0 or choice_idx >= len(pdf_files):
                print('⚠️  Invalid choice')
                return
            
            selected_file = pdf_files[choice_idx]
        except ValueError:
            print('⚠️  Invalid input')
            return
        
        # Get optional source name
        source_name = input(f'\n📝 Enter custom document name (or press Enter to use "{selected_file.name}"): ').strip()
        
        print(f'\n🚀 Uploading {selected_file.name} to project {project_id}...')
        
        # Prepare file upload
        with open(selected_file, 'rb') as f:
            files = {'file': (selected_file.name, f, 'application/pdf')}
            data = {}
            if source_name:
                data['source_name'] = source_name
            
            response = await self.client.post(
                f'/api/v1/projects/{project_id}/documents',
                files=files,
                data=data
            )
        
        if response:
            print_response(response)
    
    async def list_documents(self):
        """Test: List documents in a project"""
        print_header('List Documents')
        
        # Get project ID
        project_id = input('\n📦 Enter project ID (or press Enter to list projects): ').strip()
        
        if not project_id:
            response = await self.client.get('/api/v1/projects')
            if response and response.status_code == 200:
                try:
                    data = response.json()
                    projects = data.get('projects', [])
                    
                    if not projects:
                        print('\n⚠️  No projects found. Create a project first.')
                        return
                    
                    print('\n📋 Available Projects:')
                    for i, proj in enumerate(projects, 1):
                        print(f'  {i}. {proj.get("name")} (ID: {proj.get("id")})')
                    
                    project_id = input('\n📦 Enter project ID: ').strip()
                except Exception as e:
                    print(f'❌ Failed to parse projects: {e}')
                    return
        
        if not project_id:
            print('⚠️  No project ID provided')
            return
        
        print(f'\n🔍 Fetching documents for project {project_id}...')
        
        response = await self.client.get(f'/api/v1/projects/{project_id}/documents')
        
        if response:
            print_response(response)
    
    async def delete_document(self):
        """Test: Delete a document"""
        print_header('Delete Document')
        
        # Get project ID and document ID
        project_id = input('\n📦 Enter project ID: ').strip()
        
        if not project_id:
            print('⚠️  No project ID provided')
            return
        
        # List documents to help user choose
        print(f'\n🔍 Fetching documents for project {project_id}...')
        response = await self.client.get(f'/api/v1/projects/{project_id}/documents')
        
        if response and response.status_code == 200:
            try:
                data = response.json()
                documents = data.get('documents', [])
                
                if not documents:
                    print('\n⚠️  No documents found in this project.')
                    return
                
                print('\n📄 Available Documents:')
                for i, doc in enumerate(documents, 1):
                    print(f'  {i}. {doc.get("source_name")} (ID: {doc.get("id")})')
            except Exception as e:
                print(f'❌ Failed to parse documents: {e}')
                return
        else:
            print('❌ Failed to fetch documents')
            return
        
        document_id = input('\n🗑️  Enter document ID to delete: ').strip()
        
        if not document_id:
            print('⚠️  No document ID provided')
            return
        
        confirm = input(f'⚠️  Are you sure you want to delete document {document_id}? (y/N): ')
        
        if confirm.lower() != 'y':
            print('❌ Deletion cancelled')
            return
        
        print(f'\n🗑️  Deleting document: {document_id}')
        
        response = await self.client.delete(
            f'/api/v1/projects/{project_id}/documents/{document_id}'
        )
        
        if response:
            print_response(response)


# =============================================================================
# Main Interactive Loop
# =============================================================================
async def main():
    """Main interactive testing loop"""
    
    print_header('Interactive API Testing Tool')
    print(f'\n🌐 Server: {BASE_URL}')
    print(f'📁 Sample Documents: {SAMPLE_DOCS_DIR}')
    
    # Check if server is accessible
    print(f'\n🔍 Checking server connection...')
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(f'{BASE_URL}/health')
            if response.status_code == 200:
                print(f'✅ Server is running')
            else:
                print(f'⚠️  Server returned status {response.status_code}')
        except Exception as e:
            print(f'❌ Server not accessible: {e}')
            print(f'💡 Start the server with:')
            print(f'   uvicorn src.backend.main:app --host {HOST} --port {PORT} --reload')
            return
    
    # Get authentication token
    auth_token = await login_and_get_token()
    
    if not auth_token:
        print(f'\n⚠️  Authentication failed')
        print(f'💡 Make sure these environment variables are set:')
        print(f'   - TEST_EMAIL')
        print(f'   - TEST_PASSWORD')
        print(f'   - SUPABASE_URL')
        print(f'   - SUPABASE_ANON_KEY')
        
        proceed = input('\n⚠️  Continue without authentication? (y/N): ')
        if proceed.lower() != 'y':
            return
    
    # Initialize client and test handlers
    client = APIClient(BASE_URL, auth_token)
    project_tests = ProjectTests(client)
    document_tests = DocumentTests(client)
    
    # Main loop
    while True:
        print_menu('Main Menu', [
            '🏗️  Project Management',
            '📄 Document Management',
            '❌ Exit'
        ])
        
        choice = input('\n👉 Select option: ').strip()
        
        if choice == '1':
            # Project Management
            while True:
                print_menu('Project Management', [
                    'Create Project',
                    'List Projects',
                    'Delete Project'
                ])
                
                sub_choice = input('\n👉 Select option: ').strip()
                
                if sub_choice == '1':
                    await project_tests.create_project()
                elif sub_choice == '2':
                    await project_tests.list_projects()
                elif sub_choice == '3':
                    await project_tests.delete_project()
                elif sub_choice == '0':
                    break
                else:
                    print('⚠️  Invalid option')
        
        elif choice == '2':
            # Document Management
            while True:
                print_menu('Document Management', [
                    'Upload Document',
                    'List Documents',
                    'Delete Document'
                ])
                
                sub_choice = input('\n👉 Select option: ').strip()
                
                if sub_choice == '1':
                    await document_tests.upload_document()
                elif sub_choice == '2':
                    await document_tests.list_documents()
                elif sub_choice == '3':
                    await document_tests.delete_document()
                elif sub_choice == '0':
                    break
                else:
                    print('⚠️  Invalid option')
        
        elif choice == '3' or choice == '0':
            print('\n👋 Goodbye!')
            break
        
        else:
            print('⚠️  Invalid option')


if __name__ == '__main__':
    # =============================================================================
    # Configuration
    # =============================================================================
    dotenv.load_dotenv()
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', '8000'))
    BASE_URL = os.getenv('TEST_BASE_URL', f'http://localhost:{PORT}')
    
    # Sample documents directory
    SAMPLE_DOCS_DIR = Path(__file__).parent / 'sample_documents'
    
    # Test credentials from environment
    TEST_EMAIL = os.getenv('TEST_EMAIL', '')
    TEST_PASSWORD = os.getenv('TEST_PASSWORD', '')
    SUPABASE_URL = os.getenv('SUPABASE_URL', '')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_KEY', '')
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n\n👋 Interrupted by user. Goodbye!')
    except Exception as e:
        print(f'\n❌ Error: {e}')
        sys.exit(1)
