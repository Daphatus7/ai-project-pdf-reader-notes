# @file        pdf_check.py
# @description 
# @author      [Peiyu Wang]
# @date        1/3/2026
# @license     © 2026 . All rights reserved.
from src.pdf_backend.services.rag_service import RagService
from src.pdf_backend.tasks.process_pdf import run_process_pdf

path = "doc.pdf"
run_process_pdf(
    job_id="test_job_id",
    document_id="test_document_id",
    project_id="test_project_id",
    document_name="test_document_name",
    user_id="test_user_id",
    tier="pro",
    webhook_url="https://example.com/webhook",
    file_bytes=open(path, "rb").read(),
)
