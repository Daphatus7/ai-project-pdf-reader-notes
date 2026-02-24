# Async Job + Priority Queue + SSE — 20260224

## 概述
将 pdf-backend 的同步 PDF 处理改为异步 Job 模式，支持 free/pro 优先队列、CPU 动态调度、SSE 实时推送。

## 新增文件

### pdf-backend
| 文件 | 作用 |
|------|------|
| `server_configuration.json` | Tier 配置（max_pages, max_file_size_mb, cpu_cores） |
| `schemas/job.py` | JobStatus, Tier, 请求/响应 schema |
| `services/job_store.py` | Redis job 状态存储，one-job-per-user 锁 |
| `services/server_config.py` | 读取 server_configuration.json，lru_cache |
| `services/validator.py` | 文件大小/页数/格式验证，返回 ValidationError |
| `services/cpu_scheduler.py` | Token-bucket CPU 调度器，支持动态扩核 |
| `services/webhook.py` | httpx 发送 webhook，重试 3 次指数退避 |
| `tasks/process_pdf.py` | RQ task：完整 RAG pipeline + 状态更新 + webhook |
| `worker.py` | RQ Worker 入口，high queue 优先于 low queue |
| `railway.toml` | API service Railway 配置 |
| `railway.worker.toml` | Worker service Railway 配置（CPU 自动扩缩） |

### 主后端
| 文件 | 作用 |
|------|------|
| `services/sse_manager.py` | 内存 SSE 连接管理器（job_id → asyncio.Queue） |
| `api/v1/documents.py` | POST /webhook/pdf + GET /stream/{job_id} |

## 修改文件
- `api/v1/documents.py` (pdf-backend) — 改为 enqueue 模式
- `services/rag_service.py` — 新增 `process_sync()` 供 Worker 调用
- `config/config.py` — 新增 `redis_url`
- `requirements.txt` — 新增 rq, redis, httpx
- `Dockerfile` — 新增 worker build target
- `api/v1/router.py` (主后端) — 注册 documents router

## Job 状态流转
```
queued → processing → done
                   ↘ failed
not_supported (验证失败，同步返回，不入队)
```

## 优先级规则
- pro → RQ `high` queue
- free → RQ `low` queue
- Worker 始终先消费 high queue

## CPU 调度
- pro: 4 cores；free: 1 core
- dynamic_scale=true：队列空闲时，任意 tier 临时获得所有可用核心

## Railway 部署结构
```
Railway Project
├── pdf-api     (1 replica, production target)
├── pdf-worker  (1-3 replicas, worker target, CPU autoscale)
└── Redis       (Railway Redis plugin)
```
