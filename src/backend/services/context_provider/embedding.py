import base64
import json
import os
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

# 0. 环境变量
load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


def __extract_pdf_text(path: str) -> list[Element]:
    """用 unstructured 从 PDF 提取纯文本，并拼成一个长字符串。"""
    chunks = partition_pdf(
        filename=path,
        infer_table_structure=True,            # extract tables
        strategy="hi_res",                     # mandatory to infer tables
        extract_image_block_types=["Image","Table"],   # Add 'Table' to list to extract image of tables
        extract_images_in_pdf=True,
        # image_output_dir_path=output_path,   # if None, images and tables will saved in base64
        extract_image_block_to_payload=True,   # if true, will extract base64 for API usage
        chunking_strategy="by_title",          # or 'basic'
        max_characters=5000,                  # defaults to 500
        # combine_text_under_n_chars=0,       # defaults to 0
        new_after_n_chars=6000,
    )

    return chunks

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


def build_vectorstore(pdf_path: str) -> InMemoryVectorStore:
    """加载 PDF → 切块 → 建 InMemoryVectorStore。"""
    chunks = __extract_pdf_text(pdf_path)
    
    # Save chunks to JSON
    save_chunks_to_json(chunks, 'chunks.json')

    print("--- Extracted chunks ---")
    for index, chunk in enumerate(chunks):
        print(chunk)
        print("-----")
        print(f"Chunk {index}")
    print("------Image and table-----")

    elements = chunks[0].metadata.orig_elements
    chunk_images = [el for el in elements if 'Image' in str(type(el))]
    if chunk_images:
        chunk_images[0].to_dict()
        print(chunk_images)
    else:
        print("No images found in first chunk")

    tables = []
    texts = []
    
    for chunk in chunks:
        if "Table" in str(type(chunk)):
            print("Chunxx tables----", chunk)
            tables.append(chunk)
    
        if "CompositeElement" in str(type((chunk))):
            print("Chunxx composite----", chunk)
            texts.append(chunk)

    def get_images_base64(chunks):
        images_b64 = []
        
        for chunk in chunks:
            if "CompositeElement" in str(type(chunk)):
                chunk_els = chunk.metadata.orig_elements
                for el in chunk_els:
                    if "Image" in str(type(el)):
                        images_b64.append(el.metadata.image_base64)
        return images_b64

    images = get_images_base64(chunks)
    def display_base64_image(base64_code):
    # Decode the base64 string to binary
        image_data = base64.b64decode(base64_code)
        # Display the image
        display(Image(data=image_data))
    
    print("------Images Display-----")
    if images:
        display_base64_image(images[0])
    else:
        print("No images found in chunks")
    print("------Image Display End-----")
    
    # 2. 创建 Embeddings（最新的 langchain_openai 写法）
    embeddings = OpenAIEmbeddings(
        model="text-embedding-3-small",
        api_key=OPENAI_API_KEY,
    )

    # 3. 建立 InMemoryVectorStore
    vector_store = InMemoryVectorStore.from_documents(
        documents=[Document(page_content=str(chunk)) for chunk in chunks],
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


if __name__ == "__main__":
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    pdf_path = os.path.join(script_dir, "exam21-final.pdf")

    # 1. 建向量库
    vectorstore = build_vectorstore(pdf_path)

    # 2. 构建 RAG chain
    # rag_chain, retriever = build_rag_chain(vectorstore)
    # 
    # 
    # while True:
    #     question = input("Question: ")
    #     answer = rag_chain.invoke(question)
    #     print("Answer:", answer)

