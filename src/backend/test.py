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

from humanfriendly.terminal import output

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.backend.schemas import ChatRequest, TextContent
from src.backend.servers import services


async def stream_chat(user_message: str, system_message: str = None):
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
            thread_id="1",
            contents=[TextContent(type="text", text=user_message)],
            system_message=system_message or "You are a helpful assistant."
        )

        # Print divider
        print("ChatGPT:", end=" ", flush=True)

        # Stream response
        full_response = ""
        async for chunk in llm_service.achat(chat_request):
            # The chunk might be in different formats depending on implementation
            # Adjust based on how your achat method yields chunks
            if isinstance(chunk, str):
                full_response += chunk
            elif isinstance(chunk, bytes):
                text = chunk.decode('utf-8')
                full_response += text
            else:
                # Handle JSON chunks if needed
                full_response += str(chunk)
                
        return full_response

    except Exception as e:
        print(f"\n\nError during chat: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return None


async def main():
    """Main interactive loop."""
    print("LLM Streaming Chat Test")
    print("\nCommands:")
    print("  - Type your message to chat")
    print("  - 'quit', 'exit', or 'q' to exit")
    print("  - 'clear' to clear screen")

    # Optional: Set a custom system message
    system_message = "You are a helpful assistant. Respond concisely and clearly."

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

            # Process chat message
            output = await stream_chat(user_input, system_message)
            print(output)
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

