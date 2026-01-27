# @file        interactive_llm_test.py
# @description Interactive LLM testing tool for thread management and chat
# @author      [Peiyu Wang]
# @date        26/1/2026
# @license     © 2026 . All rights reserved.
"""
Interactive LLM Testing Tool

Run with: python -m src.backend.tests.interactive_llm_test

Prerequisites:
- Server must be running (uvicorn src.backend.main:app --reload)
- Set SUPABASE_JWT_SECRET and other required env vars
- Set TEST_EMAIL and TEST_PASSWORD for automatic login
"""
import os
import sys
from pathlib import Path
import json
from typing import Optional
from datetime import datetime

import dotenv

# Add project root to path
project_root = Path(__file__).parent.parent.parent.parent
sys.path.insert(0, str(project_root))

import httpx
import asyncio


# =============================================================================
# Configuration
# =============================================================================
dotenv.load_dotenv()
HOST = os.getenv('HOST', '0.0.0.0')
PORT = int(os.getenv('PORT', '8000'))
BASE_URL = os.getenv('TEST_BASE_URL', f'http://localhost:{PORT}')

# Test credentials from environment
TEST_EMAIL = os.getenv('TEST_EMAIL', '')
TEST_PASSWORD = os.getenv('TEST_PASSWORD', '')
SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.getenv('SUPABASE_KEY', '')

# Default project ID for testing
DEFAULT_PROJECT_ID = "f39b82e9-51ef-4244-be6c-9b2fd19f4eac"

# Output directory for saved conversations
OUTPUT_DIR = Path(__file__).parent / 'conversation_exports'
OUTPUT_DIR.mkdir(exist_ok=True)


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
    print(f'  0. Back to previous menu')
    print(f'{"─"*70}')


def print_messages(messages: list):
    """Print conversation messages in a readable format"""
    print(f'\n💬 Conversation History:')
    print(f'{"─"*70}')
    
    if not messages:
        print('  No messages yet.')
    else:
        for i, msg in enumerate(messages, 1):
            role = msg.get('role', 'unknown')
            content = msg.get('content', '')
            timestamp = msg.get('timestamp', msg.get('created_at', ''))
            
            # Format role with emoji
            role_emoji = '👤' if role == 'user' else '🤖' if role == 'assistant' else '⚙️'
            
            print(f'\n{role_emoji} [{role.upper()}] {timestamp}')
            print(f'   {content}')
    
    print(f'{"─"*70}')


def save_messages_to_file(thread_id: str, messages: list):
    """Save messages to JSON file"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = OUTPUT_DIR / f'thread_{thread_id}_{timestamp}.json'
    
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump({
                'thread_id': thread_id,
                'exported_at': datetime.now().isoformat(),
                'message_count': len(messages),
                'messages': messages
            }, f, indent=2, ensure_ascii=False)
        
        print(f'\n💾 Conversation saved to: {filename}')
        return filename
    except Exception as e:
        print(f'\n❌ Failed to save conversation: {e}')
        return None


# =============================================================================
# LLM Thread Management Tests
# =============================================================================
class LLMTests:
    """LLM thread and chat test functions"""
    
    def __init__(self, client: APIClient, project_id: str):
        self.client = client
        self.project_id = project_id
        self.current_thread_id = None
    
    async def create_thread(self):
        """Create a new conversation thread"""
        print_header('Create Thread')
        
        print(f'\n🚀 Creating new conversation thread...')
        
        response = await self.client.post('/api/v1/llm/thread')
        
        if response:
            print_response(response)
            if response.status_code == 200:
                try:
                    data = response.json()
                    messages = data.get('messages', [])
                    # Extract thread_id from first message or response
                    if messages and len(messages) > 0:
                        self.current_thread_id = messages[0].get('thread_id')
                        print(f'\n✅ Thread created with ID: {self.current_thread_id}')
                except Exception as e:
                    print(f'⚠️  Could not extract thread_id: {e}')
    
    async def list_threads(self):
        """List all conversation threads"""
        print_header('List Threads')
        
        print(f'\n🔍 Fetching all threads for project {self.project_id}...')
        
        response = await self.client.get(
            f'/api/v1/llm/thread/list?project_id={self.project_id}'
        )
        
        if response:
            print_response(response)
            if response.status_code == 200:
                try:
                    data = response.json()
                    return data.get('threads', [])
                except Exception as e:
                    print(f'❌ Failed to parse threads: {e}')
        return []
    
    async def delete_thread(self, thread_id: str = None):
        """Delete a conversation thread"""
        print_header('Delete Thread')
        
        if not thread_id:
            thread_id = input('\n🗑️  Enter thread ID to delete: ').strip()
        
        if not thread_id:
            print('⚠️  No thread ID provided')
            return
        
        confirm = input(f'⚠️  Are you sure you want to delete thread {thread_id}? (y/N): ')
        
        if confirm.lower() != 'y':
            print('❌ Deletion cancelled')
            return
        
        print(f'\n🗑️  Deleting thread: {thread_id}')
        
        response = await self.client.delete(
            '/api/v1/llm/thread',
            json={'thread_id': thread_id}
        )
        
        if response:
            print_response(response)
            if response.status_code == 200 and thread_id == self.current_thread_id:
                self.current_thread_id = None
    
    async def load_thread(self, thread_id: str):
        """Load conversation history for a thread"""
        print_header(f'Load Thread: {thread_id}')
        
        print(f'\n📥 Loading messages for thread {thread_id}...')
        
        response = await self.client.post(
            '/api/v1/llm/thread/load',
            json={'thread_id': thread_id}
        )
        
        if response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    messages = data.get('messages', [])
                    
                    # Display messages
                    print_messages(messages)
                    
                    # Save to file
                    save_messages_to_file(thread_id, messages)
                    
                    self.current_thread_id = thread_id
                    return messages
                except Exception as e:
                    print(f'❌ Failed to parse messages: {e}')
            else:
                print_response(response)
        return []
    
    async def chat(self, thread_id: str, user_message: str):
        """Send a chat message to the current thread"""
        print(f'\n💬 Sending message to thread {thread_id}...')
        
        response = await self.client.post(
            '/api/v1/llm/chat',
            json={
                'project_id': self.project_id,
                'thread_id': thread_id,
                'contents': [
                    {
                        'type': 'text',
                        'text': user_message
                    }
                ]
            }
        )
        
        if response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    ai_response = data.get('response', '')
                    
                    print(f'\n🤖 AI Response:')
                    print(f'{"─"*70}')
                    print(ai_response)
                    print(f'{"─"*70}')
                    
                    return ai_response
                except Exception as e:
                    print(f'❌ Failed to parse response: {e}')
            else:
                print_response(response)
        return None
    
    async def interactive_chat(self, thread_id: str):
        """Start interactive chat session with the AI"""
        print_header(f'Chat Session - Thread: {thread_id}')
        
        print('\n💡 Commands:')
        print('  - Type your message to chat')
        print('  - "load" to reload conversation history')
        print('  - "back" or "exit" to return to thread menu')
        
        while True:
            try:
                user_input = input('\n👤 You: ').strip()
                
                if not user_input:
                    continue
                
                if user_input.lower() in ['back', 'exit', 'quit', 'q']:
                    break
                
                if user_input.lower() == 'load':
                    await self.load_thread(thread_id)
                    continue
                
                # Send chat message
                await self.chat(thread_id, user_input)
                
            except KeyboardInterrupt:
                print('\n\n⚠️  Chat interrupted')
                break
            except EOFError:
                break


# =============================================================================
# Thread Selection Menu
# =============================================================================
async def thread_selection_menu(llm_tests: LLMTests):
    """Interactive menu for thread selection and management"""
    
    while True:
        threads = await llm_tests.list_threads()
        
        print_menu('Thread Management', [
            '➕ Create New Thread',
            '📂 Select Existing Thread',
            '🗑️  Delete Thread'
        ])
        
        choice = input('\n👉 Select option: ').strip()
        
        if choice == '1':
            # Create new thread
            await llm_tests.create_thread()
            if llm_tests.current_thread_id:
                # Ask if user wants to start chatting
                start_chat = input(f'\n💬 Start chatting in thread {llm_tests.current_thread_id}? (Y/n): ')
                if start_chat.lower() != 'n':
                    await llm_tests.interactive_chat(llm_tests.current_thread_id)
        
        elif choice == '2':
            # Select existing thread
            if not threads:
                print('\n⚠️  No threads found. Create a thread first.')
                continue
            
            print('\n📋 Available Threads:')
            for i, thread in enumerate(threads, 1):
                thread_id = thread.get('id', thread.get('thread_id', 'unknown'))
                created_at = thread.get('created_at', '')
                message_count = thread.get('message_count', 0)
                print(f'  {i}. Thread {thread_id} - {message_count} messages - {created_at}')
            
            thread_choice = input('\n👉 Select thread number: ').strip()
            
            try:
                thread_idx = int(thread_choice) - 1
                if 0 <= thread_idx < len(threads):
                    selected_thread = threads[thread_idx]
                    thread_id = selected_thread.get('id', selected_thread.get('thread_id'))
                    
                    # Load thread messages
                    await llm_tests.load_thread(thread_id)
                    
                    # Ask if user wants to chat
                    start_chat = input(f'\n💬 Start chatting in this thread? (Y/n): ')
                    if start_chat.lower() != 'n':
                        await llm_tests.interactive_chat(thread_id)
                else:
                    print('⚠️  Invalid thread number')
            except ValueError:
                print('⚠️  Invalid input')
        
        elif choice == '3':
            # Delete thread
            if not threads:
                print('\n⚠️  No threads found.')
                continue
            
            print('\n📋 Available Threads:')
            for i, thread in enumerate(threads, 1):
                thread_id = thread.get('id', thread.get('thread_id', 'unknown'))
                created_at = thread.get('created_at', '')
                print(f'  {i}. Thread {thread_id} - {created_at}')
            
            thread_id = input('\n🗑️  Enter thread ID to delete: ').strip()
            if thread_id:
                await llm_tests.delete_thread(thread_id)
        
        elif choice == '0':
            break
        
        else:
            print('⚠️  Invalid option')


# =============================================================================
# Main Interactive Loop
# =============================================================================
async def main():
    """Main interactive testing loop"""
    
    print_header('Interactive LLM Testing Tool')
    print(f'\n🌐 Server: {BASE_URL}')
    print(f'📦 Project ID: {DEFAULT_PROJECT_ID}')
    print(f'💾 Export Directory: {OUTPUT_DIR}')
    
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
        print(f'   - SUPABASE_KEY')
        return
    
    # Initialize client and test handler
    client = APIClient(BASE_URL, auth_token)
    llm_tests = LLMTests(client, DEFAULT_PROJECT_ID)
    
    # Main loop
    while True:
        print_menu('Main Menu', [
            '🧵 Thread Management & Chat',
            '❌ Exit'
        ])
        
        choice = input('\n👉 Select option: ').strip()
        
        if choice == '1':
            await thread_selection_menu(llm_tests)
        
        elif choice == '2' or choice == '0':
            print('\n👋 Goodbye!')
            break
        
        else:
            print('⚠️  Invalid option')


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\n\n👋 Interrupted by user. Goodbye!')
    except Exception as e:
        print(f'\n❌ Error: {e}')
        import traceback
        traceback.print_exc()
        sys.exit(1)
