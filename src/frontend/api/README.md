# Frontend API Architecture

统一的 API 层架构，用于所有后端通信。

## 目录结构

```
src/frontend/api/
├── core/               # 核心基础设施
│   ├── client.ts      # HTTP 客户端（request, post, streamRequest）
│   ├── config.ts      # API 配置（baseURL, endpoints）
│   └── errors.ts      # 错误类型（ApiError）
├── types/             # TypeScript 类型定义
│   ├── common.ts      # 通用类型（InputContent, TextContent, ImageContent）
│   └── llm.ts         # LLM 相关类型
├── services/          # 业务 API 服务
│   └── llm.service.ts # LLM API 服务
└── index.ts           # 统一导出接口
```

## 使用方式

### 基本导入

```typescript
// 导入服务
import { llmService } from '@/api';

// 导入类型
import type { ChatRequest, LLMStructuredOutput } from '@/api';

// 导入错误类
import { ApiError } from '@/api';
```

### LLM 服务示例

```typescript
// 1. 简单文本消息（流式）
for await (const event of llmService.sendMessage('你好', '系统提示')) {
  if (event.type === 'text') {
    console.log(event.content);
  }
}

// 2. 带图片的消息（流式）
const imageUrls = ['data:image/png;base64,...'];
for await (const event of llmService.sendMessageWithImages('解释这张图片', imageUrls)) {
  if (event.type === 'text') {
    console.log(event.content);
  } else if (event.type === 'structured') {
    console.log(event.data); // LLMStructuredOutput
  }
}

// 3. 结构化输出（同步）
const response = await llmService.chatStructuredSync({
  contents: [{ type: 'text', text: '解释量子力学' }],
  expected_content_type: 'explanation'
});
console.log(response.structured_output);
```

## API 方法

### llmService

- `chat(request)` - 同步聊天
- `chatAsync(request)` - 异步聊天
- `chatStream(request)` - 流式聊天（纯文本）
- `chatStructured(request)` - 结构化输出（同步）
- `chatStructuredSync(request)` - 结构化输出（同步，别名）
- `chatStructuredStream(request)` - 结构化输出（流式）
- `chatStructuredStreamImage(request)` - 结构化输出 + 图片（流式）
- `sendMessage(text, systemMessage?)` - 简化方法：发送文本消息
- `sendMessageWithImages(text, imageUrls, systemMessage?)` - 简化方法：发送文本 + 图片

## 类型定义

### 通用类型 (types/common.ts)

```typescript
interface TextContent {
  type: 'text';
  text: string;
}

interface ImageContent {
  type: 'image';
  data: string; // Base64 (无 data URI 前缀)
  mime_type: 'image/png' | 'image/jpeg' | 'image/webp';
  name?: string;
}

type InputContent = TextContent | ImageContent;
```

### LLM 类型 (types/llm.ts)

```typescript
type ContentType = 'explanation' | 'summary' | 'answer' | 'analysis' | 'code' | 'table' | 'list';

interface ChatRequest {
  contents: InputContent[];
  system_message?: string;
}

interface LLMStructuredOutput {
  content: string;
  content_type: ContentType;
  title?: string;
  sections?: Section[];
  key_points?: string[];
  code_blocks?: CodeBlock[];
  math_expressions?: MathExpression[];
  references?: string[];
  suggested_followups?: string[];
}
```

## 架构优势

1. **职责清晰** - 每个目录有明确的职责
2. **消除重复** - 所有 HTTP 逻辑集中在 `core/client.ts`
3. **类型统一** - 所有类型定义在 `types/` 下
4. **易于扩展** - 新增 API 服务时，在 `services/` 下新建文件即可
5. **便于维护** - 修改一处，全局生效
6. **统一入口** - 通过 `api/index.ts` 统一导出

## 向后兼容

为了向后兼容，保留了 `llmApi` 作为 `llmService` 的别名：

```typescript
// 两种写法都可以
import { llmService } from '@/api';
import { llmApi } from '@/api'; // 已废弃，建议使用 llmService
```

## 迁移指南

### 旧代码

```typescript
// ❌ 旧的导入方式
import { llmApi } from '@/features/services/api-services';
```

### 新代码

```typescript
// ✅ 新的导入方式
import { llmService } from '@/api';
// 或使用别名（向后兼容）
import { llmApi } from '@/api';
```

所有 API 完全相同，无需修改调用代码。
