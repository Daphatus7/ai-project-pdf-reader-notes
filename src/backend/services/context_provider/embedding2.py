import base64
import json
import logging
import os
from typing import Iterable

from chonkie import RecursiveChunker, Pipeline
from dotenv import load_dotenv
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


def process_pdf(currently_not_used: str):
    
    #load json elements
    
    #get raw text
    raw_file=None
    with open("elements.json", "r", encoding="utf-8") as f:
        raw_file = json.load(f)
        with open("raw.txt", "w", encoding="utf-8") as r:
            for element in raw_file:
                r.write(element["text"] + "\n")
                
    
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
    """用 LCEL 搭一个标准 RAG chain（不依赖老的 RetrievalQA 等旧接口）。"""
    vector_retriever = vector_store.as_retriever(search_kwargs={"k": 4})


    llm = ChatOpenAI(
        model="gpt-5-nano",  # 可以换成你想用的模型
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

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    # LCEL: input 是一个 string（问题）
    # - retriever | format_docs 得到 context
    # - RunnablePassthrough() 保留原始 question
    rag_chain = (
            {
                "context": vector_retriever | format_docs,
                "question": RunnablePassthrough(),
            }
            | prompt
            | llm
            | StrOutputParser()
    )

    return rag_chain, vector_retriever

if __name__ == '__main__':
    # script_dir = os.path.dirname(os.path.abspath(__file__))
    # pdf_path = os.path.join(script_dir, 'exam21-final.pdf')

    process_pdf("EllO")
    # 
    #get context chunks from json
    with open("chunks.json", "r", encoding="utf-8") as f:
        context_chunks = json.load(f)
        vectorstore = build_vectorstore(context_chunks)

        #store vectorstore as json
        with open("vectorstore.json", "w", encoding="utf-8") as v:
            json.dump(vectorstore.__dict__, v, ensure_ascii=False, indent=2)
    # 2. 构建 RAG chain
        rag_chain, retriever = build_rag_chain(vectorstore)

        while True:
            question = input("Question: ")
            answer = rag_chain.invoke(question)
            print("Answer:", answer)