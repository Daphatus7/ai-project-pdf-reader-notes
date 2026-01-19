# @file        test.py
# @description Interactive terminal test for streaming chat functionality
# @author      [Peiyu Wang]
# @date        30/12/2025
# @license     © 2025 . All rights reserved.

"""
Interactive test script for LLM streaming chat.

Run this script from the backend directory to test the streaming chat
functionality directly in the terminal without starting the API server.

Usage:
    python test.py

Commands:
    - Type your message and press Enter to chat
    - Type 'quit', 'exit', or 'q' to exit
    - Type 'clear' to clear the screen
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.backend.schemas import ChatRequest, TextContent
from src.backend.servers import services

# Test filter values - match your document metadata
TEST_USER_ID = "test-user-001"
TEST_SOURCE_IDS = ["32963126-bef3-483c-aa40-f9248e88589d", "28665fec-a0d0-4b04-a9e5-a66a06cb2dbd"]  # exam21-final.json source_id


async def stream_chat(user_message: str):
    """
    Send a chat message and stream the response.

    Args:
        user_message: The user's message
        system_message: Optional system message to set context
    """
    try:
        # Get LLM service
        llm_service = services.get('llm_service')

        # Create chat request
        chat_request = ChatRequest(
            thread_id="1", # fix user thread for testing
            contents=[TextContent(type="text", text=user_message)],
            system_message="You are a helpful assistant."
        )

        # Print divider
        print("ChatGPT:", end=" ", flush=True)

        # Stream response
        # full_response = ""
        # async for chunk in llm_service.chat(chat_request):
        #     # Parse SSE format: "data: {json}\n\n"
        #     if isinstance(chunk, str):
        #         # Remove SSE prefix and parse JSON
        #         if chunk.startswith("data: "):
        #             json_str = chunk[6:].strip()
        #             try:
        #                 data = json.loads(json_str)
        #                 # Only process text chunks for streaming display
        #                 if data.get("type") == "text":
        #                     content = data.get("content", "")
        #                     full_response += content
        #                     print(content, end="", flush=True)
        #             except json.JSONDecodeError:
        #                 pass  # Skip malformed chunks

        full_response = llm_service.chat(chat_request)

        return full_response

    except Exception as e:
        print(f"\n\nError during chat: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return None

async def test_chat(user_message: str, use_filter: bool = True):
    """
   Send a chat message and stream the response.

   Args:
       user_message: The user's message
       use_filter: Whether to apply RAG filter (default True)
   """
    try:
        # Get LLM service
        llm_service = services.get('llm_service')

        # Create chat request with optional RAG filter
        chat_request = ChatRequest(
            thread_id="1",  # fix user thread for testing
            contents=[TextContent(type="text", text=user_message)],
            system_message="You are a helpful assistant.",
            user_id=TEST_USER_ID if use_filter else None,
            source_ids=TEST_SOURCE_IDS if use_filter else None,
        )

        # Print divider
        print("ChatGPT:", end=" ", flush=True)

        full_response = await llm_service.chat(chat_request)

        return full_response

    except Exception as e:
        print(f"\n\nError during chat: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return None

async def main():
    """Main interactive loop."""
    use_filter = True  # RAG filter toggle

    print("LLM Streaming Chat Test")
    print("\nCommands:")
    print("  - Type your message to chat")
    print("  - 'quit', 'exit', or 'q' to exit")
    print("  - 'clear' to clear screen")
    print("  - 'filter' to toggle RAG filter on/off")
    print(f"\nRAG Filter: {'ON' if use_filter else 'OFF'}")
    print(f"  user_id: {TEST_USER_ID}")
    print(f"  source_ids: {TEST_SOURCE_IDS}")

    while True:
        try:
            # Get user input
            user_input = input("\n\nYou: ").strip()

            # Handle commands
            if not user_input:
                continue

            if user_input.lower() in ['quit', 'exit', 'q']:
                print("\nGoodbye!")
                break

            if user_input.lower() == 'clear':
                import os
                os.system('clear' if os.name == 'posix' else 'cls')
                continue

            if user_input.lower() == 'filter':
                use_filter = not use_filter
                print(f"RAG Filter: {'ON' if use_filter else 'OFF'}")
                continue

            # Process chat message
            await test_chat(user_input, use_filter=use_filter)
        except KeyboardInterrupt:
            print("\n\nInterrupted. Goodbye!")
            break
        except EOFError:
            print("\n\nGoodbye!")
            break
        except Exception as e:
            print(f"\nUnexpected error: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc()


if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())

