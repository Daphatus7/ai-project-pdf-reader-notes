# @file        delete_user_messages.py
# @description Delete all messages/checkpoints for a thread from Redis
# @author      [Peiyu Wang]
# @date        20/1/2026
# @license     © 2026 . All rights reserved.

import logging
from langgraph.checkpoint.redis import RedisSaver

logger = logging.getLogger(__name__)


def delete_user_thread_messages(checkpointer: RedisSaver, thread_id: str) -> None:
    """
    Delete all checkpoints and writes associated with a thread ID.

    Args:
        checkpointer: RedisSaver instance
        thread_id: The thread ID to delete all data for
    """
    checkpointer.delete_thread(thread_id)
    logger.info(f"Deleted all checkpoints for thread_id: {thread_id}")


async def adelete_user_thread_messages(checkpointer: RedisSaver, thread_id: str) -> None:
    """
    Async version: Delete all checkpoints and writes associated with a thread ID.

    Args:
        checkpointer: RedisSaver instance
        thread_id: The thread ID to delete all data for
    """
    await checkpointer.adelete_thread(thread_id)
    logger.info(f"Deleted all checkpoints for thread_id: {thread_id}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    thread_id = "1"

    with RedisSaver.from_conn_string("redis://localhost:6379") as checkpointer:
        print(f"Deleting thread: {thread_id}")
        delete_user_thread_messages(checkpointer, thread_id)
        print("Done")
