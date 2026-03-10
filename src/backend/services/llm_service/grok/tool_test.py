import asyncio
import json
import os

from dotenv import load_dotenv
from xai_sdk import AsyncClient
from xai_sdk.chat import user, tool_result, tool
from xai_sdk.tools import web_search, x_search
from src.backend.services.llm_service.grok.grok import MODEL


load_dotenv()

tools = [
    web_search(),                    # Built-in: runs on xAI servers
    x_search(),
    tool(                            # Custom: runs on your side
        name="save_to_database",
        description="Save research results to the database",
        parameters={
            "type": "object",
            "properties": {
                "data": {"type": "string", "description": "Data to save"}
            },
            "required": ["data"]
        },
    ),
]

def save_to_database(date: str):
    print("Saving data to database...")

# Tool implementations (mock)
def get_temperature(location: str, unit: str = "fahrenheit") -> dict:
    temp = 59 if unit == "fahrenheit" else 15
    return {"location": location, "temperature": temp, "unit": unit}

def get_ceiling(location: str) -> dict:
    return {"location": location, "ceiling": 15000, "unit": "ft"}

tools_map = {
    "save_to_database": save_to_database,
    "get_temperature": get_temperature,
    "get_ceiling": get_ceiling,
}


async def main():
    # Client must be created inside main() so it shares the same event loop as gRPC internals
    client = AsyncClient(
        api_key=os.getenv("XAI_API_KEY"),
        management_api_key=os.getenv("XAI_MANAGEMENT_API_KEY"),
        timeout=600,
    )

    # Build chat and send initial message
    chat = client.chat.create(
        model=MODEL,
        tools=tools,
    )
    chat.append(user("what is trendy on twitter rn?"))
    response = await chat.sample()

    # Process tool calls if model requests them
    if response.tool_calls:
        chat.append(response)

        for tool_call in response.tool_calls:
            name = tool_call.function.name
            # Built-in tools (web_search, x_search) run on xAI servers — skip local dispatch
            if name not in tools_map:
                continue
            args = json.loads(tool_call.function.arguments)
            result = tools_map[name](**args)
            chat.append(tool_result(tool_call.id, json.dumps(result)))

        response = await chat.sample()

    print(response.content)


if __name__ == "__main__":
    asyncio.run(main())
