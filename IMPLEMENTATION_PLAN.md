# AI PDF Reader Notes - 实施计划

## 项目目标
在最短时间内开发最具价值的内容 - 构建一个AI驱动的PDF阅读笔记系统

## 当前架构分析

### 前端架构
- **框架**: React 18 + TypeScript
- **状态管理**: Zustand (已集成基础store)
- **编辑器**: Tiptap (富文本编辑器,支持Markdown)
- **UI组件**: Radix UI + Tailwind CSS
- **PDF阅读**: @react-pdf-viewer
- **数据获取**: TanStack Query

### 后端架构
- **框架**: FastAPI (Python)
- **LLM集成**: OpenAI, Anthropic, Google Gemini
- **已有模块**:
  - `llm_service`: LLM调用服务
  - `context_engine`: 上下文引擎
  - `note_service`: 笔记服务
  - 数据模型: chat_models, context_models, note_models

---

## 阶段1: 核心对话能力实现 (最高优先级 ✅✅✅)

### 1.1 多对话管理系统

**后端实现**:
```
src/backend/
├── models/
│   └── chat_models/
│       ├── conversation.py       # 对话模型
│       └── message.py            # 消息模型
├── services/
│   └── conversation_service/
│       ├── conversation_manager.py  # 对话管理服务
│       └── context_manager.py      # 上下文管理
├── routes/
│   └── conversation/
│       ├── create_conversation.py
│       ├── list_conversations.py
│       └── get_conversation.py
└── database/
    └── repositories/
        └── conversation_repository.py
```

**数据模型**:
```python
# Conversation Model
- id: UUID
- title: str
- created_at: datetime
- updated_at: datetime
- note_id: UUID (关联笔记)
- metadata: dict (对话配置,如模型选择)

# Message Model
- id: UUID
- conversation_id: UUID
- role: enum(user, assistant, system)
- content: str
- sources: list[Source] (引用来源)
- created_at: datetime
- parent_message_id: UUID (支持分支对话)
```

**前端实现**:
```
src/frontend/
├── stores/
│   └── conversationStore.ts      # Zustand对话状态管理
├── components/
│   └── ConversationList/
│       ├── ConversationList.tsx
│       └── ConversationItem.tsx
└── api/
    └── conversation/
        ├── conversationApi.ts
        └── types.ts
```

**Zustand Store设计**:
```typescript
interface ConversationStore {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];

  // Actions
  createConversation: (noteId: string) => Promise<Conversation>;
  loadConversations: (noteId: string) => Promise<void>;
  selectConversation: (id: string) => void;
  sendMessage: (content: string, images?: File[]) => Promise<void>;
}
```

### 1.2 对话上下文持久化

**实现方案**:
1. **数据库选择**: SQLite (本地开发) / PostgreSQL (生产)
2. **ORM**: SQLAlchemy 或 Prisma (如果使用Node后端)
3. **缓存策略**:
   - 最近N条消息保存在内存
   - 历史消息按需从数据库加载
   - 使用LRU缓存机制

**关键功能**:
- 对话创建时自动保存
- 消息发送后实时保存
- 支持离线加载历史对话
- 定期清理过期对话

---

## 阶段2: PDF上下文理解与RAG (最高优先级 ✅✅✅)

### 2.1 文件处理方案选择

**推荐方案: MinerU (转Markdown)**

**理由**:
1. **与项目架构高度契合**: Tiptap编辑器原生支持Markdown
2. **信息保留完整**: 保留文档结构、格式、表格
3. **后续处理便利**: Markdown易于切分和向量化
4. **引用准确**: 可以精确定位到段落和章节

**许可证问题解决**:
- MinerU使用Apache 2.0许可证,允许商业使用
- 如果开源,保留原作者版权声明即可
- 如果闭源商业,需要在About页面声明使用了MinerU

**备选方案: PaddleOCR + 自研布局分析**
- 仅当MinerU无法满足特殊需求时考虑
- 开发成本高,不符合"最短时间"目标

### 2.2 PDF切分与向量化

**架构设计**:
```
src/backend/
├── services/
│   └── context_engine/
│       ├── pdf_processor.py      # PDF处理(调用MinerU)
│       ├── chunking_service.py   # 智能切分
│       ├── embedding_service.py  # 向量化
│       └── vector_store.py       # 向量存储
└── models/
    └── context_models/
        ├── document.py
        ├── chunk.py
        └── source.py
```

**切分策略**:
```python
# Markdown-aware切分
1. 按照Markdown标题层级切分 (优先)
2. 保持表格、代码块完整性
3. 每个chunk保留上下文信息(父章节标题)
4. chunk大小: 500-1000 tokens,重叠100 tokens

# Metadata存储
- 页码
- 章节标题
- 在原文档中的位置
- chunk类型(正文/表格/代码/图片说明)
```

**向量化方案**:
- **模型选择**: OpenAI text-embedding-3-small (性价比高)
- **向量数据库**:
  - 初期: FAISS (本地,免费)
  - 扩展: Qdrant 或 Pinecone (云端)

### 2.3 信息源引用系统

**核心功能**:
1. **RAG流程**:
   ```
   用户问题 → 向量检索top-K相关chunk →
   构建prompt(问题+context) → LLM生成回答 →
   返回{回答 + 引用来源}
   ```

2. **引用数据结构**:
```python
class Source:
    chunk_id: UUID
    document_id: UUID
    page_number: int
    section_title: str
    content_preview: str  # 前50字
    relevance_score: float
    highlight_text: str   # 实际被引用的片段
```

3. **前端展示**:
```typescript
// 消息组件中显示引用
<Message>
  <MessageContent>{aiResponse}</MessageContent>
  <SourceList>
    {sources.map(source => (
      <SourceCard
        onClick={() => jumpToPDF(source.page, source.highlight)}
      >
        <SourcePreview>{source.section_title}</SourcePreview>
        <PageNumber>P.{source.page}</PageNumber>
      </SourceCard>
    ))}
  </SourceList>
</Message>
```

**创新点**:
- 点击引用直接跳转到PDF对应位置并高亮
- 支持用户手动选择PDF区域添加到对话上下文

---

## 阶段3: 笔记管理功能 (最高优先级 ✅✅✅)

### 3.1 笔记CRUD API

**后端路由**:
```
POST   /api/notes              # 创建笔记
GET    /api/notes              # 获取笔记列表
GET    /api/notes/{id}         # 获取单个笔记
PUT    /api/notes/{id}         # 更新笔记
DELETE /api/notes/{id}         # 删除笔记
POST   /api/notes/{id}/export  # 导出为Markdown
```

**数据模型增强**:
```python
class Note:
    id: UUID
    title: str
    content: str (Tiptap JSON格式)
    pdf_document_id: UUID | None
    conversations: list[Conversation]
    created_at: datetime
    updated_at: datetime
    tags: list[str]
    is_archived: bool
```

### 3.2 前端笔记管理界面优化

**现有问题**:
- 当前使用hardcoded_data,需要连接真实API
- 缺少创建/删除功能

**改进计划**:
```typescript
// 使用TanStack Query管理服务器状态
const { data: notes, isLoading } = useQuery({
  queryKey: ['notes'],
  queryFn: fetchNotes
});

const createNoteMutation = useMutation({
  mutationFn: createNote,
  onSuccess: () => {
    queryClient.invalidateQueries(['notes']);
  }
});
```

**UI改进**:
- 添加"新建笔记"按钮
- 笔记卡片右上角添加删除图标(带确认弹窗)
- 支持笔记搜索和标签筛选
- 显示最后编辑时间

---

## 阶段4: 高级对话功能 (一般优先级 ✅)

### 4.1 对话重发与分支选择

**技术方案**:
```typescript
// 消息支持parent_message_id
interface Message {
  id: string;
  parent_id: string | null;
  children: string[]; // 允许多个子消息(分支)
  is_active: boolean; // 当前激活的分支
}

// UI操作
1. 每条消息旁边显示"重新生成"按钮
2. 如果存在多个分支,显示切换按钮 (← 1/3 →)
3. 点击重新生成创建新的分支
```

**Context管理**:
- 重新生成时,保留该消息之前的所有上下文
- 切换分支时,只将激活分支的消息发送给LLM

### 4.2 超长对话处理

**策略**:
1. **自动摘要**: 超过50条消息时,对早期消息进行摘要压缩
2. **上下文窗口滑动**:
   - 保留最近N条完整消息
   - 早期消息使用摘要版本
3. **使用向量检索**:
   - 将历史对话也向量化
   - 根据当前问题检索相关历史消息

```python
def build_context(conversation_id: str, current_message: str):
    messages = get_all_messages(conversation_id)

    if len(messages) > 50:
        recent = messages[-30:]  # 最近30条完整保留
        old = messages[:-30]
        summary = summarize_messages(old)  # LLM摘要

        # 从历史中检索相关消息
        relevant = vector_search(current_message, old, top_k=5)

        return [summary] + relevant + recent
    else:
        return messages
```

---

## 阶段5: 云端部署准备 (未来扩展)

### 5.1 Docker配置优化

**多阶段构建**:
```dockerfile
# 前端构建
FROM node:20 AS frontend-builder
WORKDIR /app/frontend
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 后端
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=frontend-builder /app/frontend/dist ./static
COPY src/backend ./backend

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.2 云端部署选项

**推荐方案**:
1. **Railway.app** (最简单,适合MVP)
   - 自动CI/CD
   - 免费额度足够初期使用
   - 支持PostgreSQL

2. **Render** (备选)
   - 类似Railway,更稳定
   - 免费额度较低

3. **自建VPS** (AWS/DigitalOcean)
   - 成本可控
   - 需要配置Nginx、SSL等

---

## 数据库Schema设计

```sql
-- 笔记表
CREATE TABLE notes (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content JSONB,  -- Tiptap JSON
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT FALSE
);

-- PDF文档表
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    file_path VARCHAR(500),
    markdown_path VARCHAR(500),
    processed_at TIMESTAMP
);

-- 对话表
CREATE TABLE conversations (
    id UUID PRIMARY KEY,
    note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
    title VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 消息表
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    parent_message_id UUID REFERENCES messages(id),
    role VARCHAR(20) CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    sources JSONB,  -- 引用来源数组
    created_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 文档切片表 (向量检索)
CREATE TABLE chunks (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding VECTOR(1536),  -- 使用pgvector扩展
    page_number INT,
    section_title VARCHAR(255),
    metadata JSONB,
    INDEX ON embedding USING ivfflat
);
```

---

## 技术栈总结

### 确定使用
| 层级 | 技术 | 理由 |
|------|------|------|
| 前端框架 | React + TypeScript | 已有 |
| 状态管理 | Zustand | 已集成,轻量级 |
| 富文本编辑器 | Tiptap | 已有,功能强大 |
| UI组件库 | Radix UI + Tailwind | 已有 |
| 数据获取 | TanStack Query | 已有,最佳实践 |
| 后端框架 | FastAPI | 已有,性能好 |
| LLM集成 | OpenAI/Anthropic SDK | 已有 |
| PDF处理 | **MinerU** | 推荐,转Markdown |
| 向量数据库 | **FAISS** (初期) | 免费,易部署 |
| 嵌入模型 | OpenAI text-embedding-3-small | 性价比高 |
| 关系数据库 | **SQLite** (开发) / **PostgreSQL** (生产) | 标准选择 |

---

## 开发优先级与时间分配

### Sprint 1 (Week 1-2): MVP核心功能
- [ ] 多对话管理后端API ⭐⭐⭐
- [ ] 对话持久化(SQLite) ⭐⭐⭐
- [ ] 前端对话列表UI ⭐⭐⭐
- [ ] 笔记CRUD API ⭐⭐⭐

### Sprint 2 (Week 3-4): PDF智能处理
- [ ] 集成MinerU PDF处理 ⭐⭐⭐
- [ ] 实现chunking策略 ⭐⭐⭐
- [ ] 向量化与FAISS存储 ⭐⭐⭐
- [ ] RAG检索实现 ⭐⭐⭐

### Sprint 3 (Week 5-6): 信息源与引用
- [ ] 信息源追踪系统 ⭐⭐⭐
- [ ] 前端引用卡片显示 ⭐⭐
- [ ] PDF跳转与高亮 ⭐⭐
- [ ] 笔记管理UI优化 ⭐⭐

### Sprint 4 (Week 7+): 高级功能
- [ ] 对话重发机制 ⭐
- [ ] 超长对话处理 ⭐
- [ ] Docker配置优化 ⭐
- [ ] 云端部署准备 ⭐

---

## 风险与挑战

| 风险 | 影响 | 缓解策略 |
|------|------|---------|
| MinerU处理复杂PDF失败 | 高 | 提前测试各类PDF,准备PaddleOCR备选方案 |
| 向量检索准确度不足 | 中 | 优化chunking策略,调整检索参数,考虑Rerank模型 |
| LLM API成本过高 | 中 | 使用本地模型(Ollama)作为备选,实现模型切换 |
| 前后端状态同步复杂 | 低 | 使用TanStack Query的乐观更新,WebSocket实时通信 |

---

## 下一步行动

1. **立即开始**: 搭建数据库Schema,实现对话管理后端API
2. **并行开发**: 前端对话UI + PDF处理服务测试
3. **持续集成**: 每个Sprint结束进行Demo,收集反馈
4. **文档优先**: 每个功能完成后立即更新API文档

---

## 附录: 关键代码示例

### Zustand对话Store完整示例
```typescript
import { create } from 'zustand';
import { conversationApi } from '@/api/conversation';

interface ConversationStore {
  conversations: Conversation[];
  currentConversationId: string | null;
  messages: Message[];
  isLoading: boolean;

  createConversation: (noteId: string, title?: string) => Promise<void>;
  loadConversations: (noteId: string) => Promise<void>;
  selectConversation: (id: string) => Promise<void>;
  sendMessage: (content: string, images?: File[]) => Promise<void>;
  regenerateMessage: (messageId: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  isLoading: false,

  createConversation: async (noteId, title = 'New Conversation') => {
    set({ isLoading: true });
    try {
      const newConv = await conversationApi.create({ noteId, title });
      set(state => ({
        conversations: [...state.conversations, newConv],
        currentConversationId: newConv.id,
        messages: [],
        isLoading: false
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loadConversations: async (noteId) => {
    set({ isLoading: true });
    const conversations = await conversationApi.list(noteId);
    set({ conversations, isLoading: false });
  },

  selectConversation: async (id) => {
    set({ isLoading: true });
    const messages = await conversationApi.getMessages(id);
    set({
      currentConversationId: id,
      messages,
      isLoading: false
    });
  },

  sendMessage: async (content, images) => {
    const { currentConversationId } = get();
    if (!currentConversationId) return;

    // 乐观更新
    const optimisticMessage = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content,
      created_at: new Date().toISOString()
    };
    set(state => ({
      messages: [...state.messages, optimisticMessage]
    }));

    try {
      const response = await conversationApi.sendMessage(
        currentConversationId,
        { content, images }
      );

      // 替换临时消息并添加AI回复
      set(state => ({
        messages: [
          ...state.messages.filter(m => m.id !== optimisticMessage.id),
          response.userMessage,
          response.assistantMessage
        ]
      }));
    } catch (error) {
      // 移除临时消息
      set(state => ({
        messages: state.messages.filter(m => m.id !== optimisticMessage.id)
      }));
      throw error;
    }
  },

  regenerateMessage: async (messageId) => {
    const { currentConversationId } = get();
    if (!currentConversationId) return;

    const response = await conversationApi.regenerate(
      currentConversationId,
      messageId
    );

    set(state => ({
      messages: [...state.messages, response.newMessage]
    }));
  },

  deleteConversation: async (id) => {
    await conversationApi.delete(id);
    set(state => ({
      conversations: state.conversations.filter(c => c.id !== id),
      currentConversationId: state.currentConversationId === id
        ? null
        : state.currentConversationId
    }));
  }
}));
```

### FastAPI对话路由示例
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from ..database import get_db
from ..services.conversation_service import ConversationService
from ..models.request_models import CreateConversationRequest, SendMessageRequest
from ..models.chat_models import ConversationResponse, MessageResponse

router = APIRouter(prefix="/api/conversations", tags=["conversations"])

@router.post("", response_model=ConversationResponse)
async def create_conversation(
    request: CreateConversationRequest,
    db: Session = Depends(get_db)
):
    """创建新对话"""
    service = ConversationService(db)
    conversation = service.create_conversation(
        note_id=request.note_id,
        title=request.title
    )
    return conversation

@router.get("/note/{note_id}", response_model=List[ConversationResponse])
async def list_conversations(
    note_id: UUID,
    db: Session = Depends(get_db)
):
    """获取笔记的所有对话"""
    service = ConversationService(db)
    return service.list_by_note(note_id)

@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conversation_id: UUID,
    db: Session = Depends(get_db)
):
    """获取对话的所有消息"""
    service = ConversationService(db)
    return service.get_messages(conversation_id)

@router.post("/{conversation_id}/messages", response_model=dict)
async def send_message(
    conversation_id: UUID,
    request: SendMessageRequest,
    db: Session = Depends(get_db)
):
    """发送消息并获取AI回复"""
    service = ConversationService(db)

    # 保存用户消息
    user_msg = service.save_message(
        conversation_id=conversation_id,
        role="user",
        content=request.content
    )

    # 构建上下文
    context = service.build_context(conversation_id)

    # 调用LLM
    from ..services.llm_service import LLMService
    llm = LLMService()
    ai_response = await llm.chat(context)

    # 保存AI回复
    ai_msg = service.save_message(
        conversation_id=conversation_id,
        role="assistant",
        content=ai_response.content,
        sources=ai_response.sources
    )

    return {
        "userMessage": user_msg,
        "assistantMessage": ai_msg
    }

@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: UUID,
    db: Session = Depends(get_db)
):
    """删除对话"""
    service = ConversationService(db)
    service.delete(conversation_id)
    return {"status": "deleted"}
```

---

**文档版本**: v1.0
**最后更新**: 2025-12-28
**下次审查**: Sprint 1结束后
