-- Migration: Enable pgvector extension
-- Description: Enable the pgvector extension for vector similarity search
-- Date: 2026-01-20

CREATE EXTENSION IF NOT EXISTS vector;
