import base64
import json
import logging
import os
from typing import Iterable, Any

from chonkie import RecursiveChunker, Pipeline
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_core.tools import tool
from unstructured.documents.elements import Element
from unstructured.partition.pdf import partition_pdf
from langchain_core.documents import Document
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from IPython.display import Image, display

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def __extract_pdf_text(path: str) -> list[Element]:
    """用 unstructured 从 PDF 提取纯文本，并拼成一个长字符串。"""
    elements = partition_pdf(
        filename=path,
        infer_table_structure=True,            # extract tables
        strategy="hi_res",                     # mandatory to infer tables
        content_type="application/pdf",
        skip_infer_table_types=False,
        extract_image_block_types=["Image","Table"],   # Add 'Table' to list to extract image of tables
        extract_images_in_pdf=True,
        # extract_image_block_to_payload=True,   # if true, will extract base64 for API usage
        # chunking_strategy="basic",          # or 'basic'
    )
    tables = [el for el in elements if el.category == "Table"]

    print(tables[0].text)
    print(tables[0].metadata.text_as_html)
    return elements

def save_chunks_to_json(chunks: list[Element], filename: str):
    """
    Save chunks extracted from unstructured to a JSON file.
    
    Args:
        chunks: List of Element objects from unstructured
        filename: Name of the output JSON file
    """
    chunks_data = []

    for index, chunk in enumerate(chunks):
        chunks_data.append(chunk.to_dict())

    # Save to JSON file
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(chunks_data, f, indent=2, ensure_ascii=False)

    print(f'Saved {len(chunks_data)} chunks to {filename}')


def extract_pdf_elements(pdf_dir: str) -> list[Element]:
    """
    Parse a PDF into unstructured Element objects.

    Assumes the PDF is readable on disk. Uses hi_res strategy to better
    capture tables and images. Raises any parsing errors to the caller.
    """
    elements = partition_pdf(
        filename=pdf_dir,
        infer_table_structure=True,
        strategy='hi_res',
        content_type='application/pdf',
        skip_infer_table_types=False,
        extract_image_block_types=['Image', 'Table'],
        # extract_images_in_pdf=True,
    )
    logger.info('Extracted %s raw elements from %s', len(elements), pdf_dir)
    return elements

def to_json_chunks(elements: Iterable[Element]) -> list[dict]:
    return [element.to_dict() for element in elements if element is not None]

def to_markdown_chunks(elements: Iterable[Element]) -> list[str]:
    """
    Convert parsed elements into markdown strings.

    Tables keep the HTML snippet because Markdown parsers accept inline HTML.
    Other elements use their text content. Empty strings are filtered out by
    the caller when persisting.
    """
    markdown_chunks: list[str] = []
    for element in elements:
        if element.metadata and element.metadata.text_as_html:
            markdown_chunks.append(element.metadata.text_as_html)
            continue
        if element.text:
            markdown_chunks.append(element.text)
    return markdown_chunks


def to_text_chunks(elements: Iterable[Element]) -> list[str]:
    """
    Convert parsed elements into plain text strings.

    Falls back to an empty string if the element lacks text content.
    """
    return [element.text or '' for element in elements]


def save_json(output_path: str, data: list[dict]) -> None:
    """
    Persist chunk dictionaries to a JSON file with UTF-8 encoding.

    Assumes caller provides a writable path. Overwrites existing files.
    """
    with open(output_path, 'w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    logger.info('Saved JSON chunks to %s', output_path)

def save_lines(output_path: str, lines: list[str]) -> None:
    """
    Persist a list of text lines to disk separated by blank lines.

    Assumes caller provides a writable path. Overwrites existing files.
    """
    with open(output_path, 'w', encoding='utf-8') as file:
        file.write('\n\n'.join(filter(None, lines)))
    logger.info('Saved text-based chunks to %s', output_path)

def get_summary(content: str)->str:
    ...

def chunker_page_strategy(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Merge block-level extracts into one item per page.

    Expected input shape (per block):
      {
        "text": str,
        "metadata": {
          "page_number": int,
          "file_directory": str,
          "last_modified": str | int | float,
          "filetype": str,
          ... (optional)
        }
      }

    Output shape (per page):
      {
        "content": str,
        "metadata": {
          "source_id": str,
          "page_id": str,
          "source_name": str,
          "file_directory": str,
          "page_number": int,
          "last_modified": Any,
          "filetype": str
        }
      }
    """
    if not blocks:
        return []

    # Defensive: tolerate unsorted input; stable sort by page_number.
    def _page_num(b: dict[str, Any]) -> int:
        meta = b.get("metadata") or {}
        p_number = meta.get("page_number")
        if not isinstance(p_number, int):
            raise ValueError(f"Invalid or missing metadata.page_number: {p_number!r}")
        return p_number

    blocks_sorted = sorted(blocks, key=_page_num)

    result: list[dict[str, Any]] = []
    current_page_number: int | None = None
    current_page: dict[str, Any] | None = None

    for block in blocks_sorted:
        text = block.get("text", "")
        if not isinstance(text, str):
            raise ValueError(f"Invalid block.text (expected str): {text!r}")

        md = block.get("metadata") or {}
        page_number = _page_num(block)

        # New page boundary
        if current_page_number is None or page_number != current_page_number:
            # flush previous page
            if current_page is not None:
                result.append(current_page)

            # create a new page item
            current_page_number = page_number
            current_page = {
                "content": text,
                "metadata": {
                    # caller should fill these (or pass them in via md)
                    "source_id": md.get("source_id", ""),
                    "page_id": md.get("page_id", ""),  # e.g. set later with uuid.uuid4().hex
                    "source_name": md.get("source_name", "source_name"),
                    "file_directory": md.get("file_directory", ""),
                    "page_number": page_number,
                    "last_modified": md.get("last_modified"),
                    "filetype": md.get("filetype", ""),
                },
            }
        else:
            # Same page: append content
            assert current_page is not None
            current_page["content"] += text

    # flush last page
    if current_page is not None:
        result.append(current_page)

    return result
    
def process_pdf(currently_not_used: str):
    
    #load json elements
    
    #get raw text
    raw_file=None
    with open("elements.json", "r", encoding="utf-8") as f:
        raw_file = json.load(f)
        with open("raw.json", "w", encoding="utf-8") as r:
            cleaned_data = chunker_page_strategy(raw_file)
            json.dump(cleaned_data, r, indent=2)
    
    doc = (Pipeline()
           .fetch_from("file", path="raw.txt")
           .process_with("text")
           .chunk_with("recursive", chunk_size=512)
           .refine_with("overlap", context_size=100)
           .run())
    # 
    with open("chonkie.json", "w", encoding="utf-8") as f:
        json.dump([chunk.to_dict() for chunk in doc.chunks], f, indent=2)
        
def build_vectorstore(context) -> InMemoryVectorStore:

    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=OPENAI_API_KEY,
    )

    # 3. 建立 InMemoryVectorStore
    vector_store = InMemoryVectorStore.from_documents(
        documents=[Document(page_content=str(chunk)) for chunk in context],
        embedding=embeddings,
    )
    
    return vector_store

def build_rag_chain(vector_store: InMemoryVectorStore):

    vector_retriever = vector_store.as_retriever(search_kwargs={"k": 4})


    llm = ChatOpenAI(
        model="gpt-5-nano",
        api_key=OPENAI_API_KEY,
        temperature=0.0,
    )

    prompt = ChatPromptTemplate.from_template(
        """You are a helpful assistant for question-answering about a university AI assignment PDF.
        Use the following context to answer the question. If the context does not contain the answer, Emphasis it is not in the context but you like to answer.
        Context:
        {context}
        Question:
        {question}
        Answer in English, be concise.
        """
    )

    return 

if __name__ == '__main__':
    # script_dir = os.path.dirname(os.path.abspath(__file__))
    # pdf_path = os.path.join(script_dir, 'exam21-final.pdf')

    process_pdf("EllO")
    # 
    #get context chunks from json
    with open("chonkie.json", "r", encoding="utf-8") as f:
        context_chunks = json.load(f)

        embeddings = OpenAIEmbeddings(
            model="text-embedding-3-small",
            api_key=OPENAI_API_KEY,
        )

        # 3. 建立 InMemoryVectorStore
        storage = InMemoryVectorStore.from_documents(
            documents=[Document(page_content=str(chunk)) for chunk in context_chunks],
            embedding=embeddings,
        )

        #store vectorstore as json
        storage.dump("vectorstore.json")
        
        # Construct a tool for retrieving context
        # @tool(response_format="content_and_artifact")
        # def retrieve_context(query: str):
        #     """Retrieve information to help answer a query."""
        #     retrieved_docs = storage.similarity_search(query, k=2)
        #     serialized = "\n\n".join(
        #         (f"Source: {doc.metadata}\nContent: {doc.page_content}")
        #         for doc in retrieved_docs
        #     )
        #     return serialized, retrieved_docs
        # 
        # tools = [retrieve_context]
        # # If desired, specify custom instructions
        # prompt = (
        #     "You have access to a tool that retrieves context from a blog post. "
        #     "Use the tool to help answer user queries."
        # )
        # agent = create_agent(model=
        #                     ChatOpenAI(
        #                         model="gpt-5-nano",
        #                         api_key=OPENAI_API_KEY,
        #                         temperature=0.0,), 
        #                     tools = tools, 
        #                     system_prompt=prompt)
        # 
        #     
        # # rag_chain, retriever = build_rag_chain(vectorstore)
        # # 
        # while True:
        #     question = input("Question: ")
        #     for step in agent.stream(
        #             {"messages": [{"role": "user", 
        #                            "content": question}]},
        #                 stream_mode="values",):
        #             step["messages"][-1].pretty_print()