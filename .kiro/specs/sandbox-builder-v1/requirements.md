# Requirements Document

## Introduction

本文档定义了一个类似 Manus/Lovable 的 AI 全栈网页构建产品的 MVP 版本需求。该产品允许用户通过自然语言与 AI Agent 对话，在隔离的沙箱环境中自动生成、修改和预览全栈 Web 应用。

技术栈选型：
- **后端框架**: Hono (轻量、类型安全、边缘友好)
- **沙箱环境**: E2B (云端代码执行沙箱)
- **AI Agent**: @anthropic-ai/claude-agent-sdk
- **前端**: React + TanStack Query

核心设计理念：
- 每个项目对应一个独立的 E2B 沙箱
- 用户离开时沙箱休眠，返回时恢复
- Agent 在沙箱内执行所有代码操作

---

## Requirements

### Requirement 1: 项目管理

**User Story:** As a 用户, I want 创建、查看和管理我的项目列表, so that 我可以组织和访问我的所有 AI 构建的应用。

#### Acceptance Criteria

1. WHEN 用户点击"新建项目" THEN 系统 SHALL 显示项目创建表单，包含项目名称和描述字段
2. WHEN 用户提交项目创建表单 THEN 系统 SHALL 创建项目记录并跳转到项目工作区
3. WHEN 用户访问项目列表页 THEN 系统 SHALL 显示该用户的所有项目，按最后访问时间降序排列
4. WHEN 用户点击某个项目 THEN 系统 SHALL 导航到该项目的工作区
5. WHEN 用户删除项目 THEN 系统 SHALL 终止关联的沙箱并删除项目数据

---

### Requirement 2: 沙箱生命周期管理

**User Story:** As a 用户, I want 我的开发环境在我离开时自动保存状态，返回时自动恢复, so that 我不会丢失工作进度且不会产生不必要的资源消耗。

#### Acceptance Criteria

1. WHEN 用户进入项目工作区 AND 该项目没有活跃沙箱 THEN 系统 SHALL 创建新的 E2B 沙箱并恢复上次保存的文件状态
2. WHEN 用户进入项目工作区 AND 该项目有休眠的沙箱 THEN 系统 SHALL 唤醒沙箱并恢复完整状态
3. WHEN 用户离开项目工作区（关闭页面/切换项目） THEN 系统 SHALL 在 30 秒后将沙箱标记为休眠
4. WHEN 沙箱休眠 THEN 系统 SHALL 保存沙箱的文件系统快照到持久化存储
5. WHEN 沙箱连续休眠超过 1 小时 THEN 系统 SHALL 终止沙箱实例以释放资源
6. IF 沙箱创建失败 THEN 系统 SHALL 显示错误信息并提供重试选项
7. WHEN 沙箱正在启动 THEN 系统 SHALL 显示加载状态指示器

---

### Requirement 3: AI Agent 对话交互

**User Story:** As a 用户, I want 通过自然语言描述我想要的功能，让 AI 自动编写代码, so that 我可以快速构建应用而无需手动编码。

#### Acceptance Criteria

1. WHEN 用户在聊天输入框发送消息 THEN 系统 SHALL 将消息发送给 Claude Agent 并流式显示响应
2. WHEN Agent 决定执行代码操作（创建/修改文件） THEN 系统 SHALL 在沙箱中执行该操作并将结果返回给 Agent
3. WHEN Agent 执行操作 THEN 系统 SHALL 在界面上实时显示 Agent 正在执行的工具调用
4. WHEN Agent 完成响应 THEN 系统 SHALL 保存对话历史到数据库
5. WHEN 用户重新进入项目 THEN 系统 SHALL 加载并显示之前的对话历史
6. IF Agent 执行操作失败 THEN 系统 SHALL 将错误信息返回给 Agent 以便其自行修正
7. WHEN 用户点击"停止生成" THEN 系统 SHALL 中断当前 Agent 执行并保存已完成的部分

---

### Requirement 4: 文件系统同步与展示

**User Story:** As a 用户, I want 实时查看沙箱中的文件结构和内容, so that 我可以了解 AI 生成了什么代码。

#### Acceptance Criteria

1. WHEN 用户进入项目工作区 THEN 系统 SHALL 在侧边栏显示沙箱的文件树结构
2. WHEN Agent 创建或修改文件 THEN 系统 SHALL 在 2 秒内更新文件树显示
3. WHEN 用户点击文件树中的文件 THEN 系统 SHALL 在代码编辑器中显示文件内容（只读模式）
4. WHEN 文件内容被 Agent 修改 AND 该文件正在被查看 THEN 系统 SHALL 实时更新编辑器中的内容
5. WHEN 用户展开文件夹 THEN 系统 SHALL 加载并显示该文件夹下的内容

---

### Requirement 5: 实时预览

**User Story:** As a 用户, I want 实时预览我的 Web 应用运行效果, so that 我可以即时看到 AI 构建的成果。

#### Acceptance Criteria

1. WHEN 沙箱中的开发服务器启动成功 THEN 系统 SHALL 在预览面板中显示应用的实时预览
2. WHEN Agent 修改代码 AND 开发服务器支持热重载 THEN 系统 SHALL 自动刷新预览
3. WHEN 用户点击"刷新预览" THEN 系统 SHALL 强制刷新预览 iframe
4. WHEN 预览加载失败 THEN 系统 SHALL 显示错误信息和控制台输出
5. IF 沙箱暴露了可访问的 URL THEN 系统 SHALL 提供"在新标签页打开"的选项

---

### Requirement 6: 终端输出流

**User Story:** As a 用户, I want 查看沙箱中命令的执行输出, so that 我可以了解构建过程和调试问题。

#### Acceptance Criteria

1. WHEN Agent 执行终端命令 THEN 系统 SHALL 在终端面板中实时流式显示输出
2. WHEN 命令执行完成 THEN 系统 SHALL 显示退出码（成功/失败状态）
3. WHEN 用户滚动终端面板 THEN 系统 SHALL 保留历史输出记录
4. WHEN 新输出产生 AND 用户未手动滚动 THEN 系统 SHALL 自动滚动到最新输出

---

### Requirement 7: 用户认证

**User Story:** As a 用户, I want 安全登录系统并保护我的项目数据, so that 只有我能访问自己的项目。

#### Acceptance Criteria

1. WHEN 未登录用户访问应用 THEN 系统 SHALL 重定向到登录页面
2. WHEN 用户使用有效凭据登录 THEN 系统 SHALL 创建会话并重定向到项目列表
3. WHEN 用户访问其他用户的项目 THEN 系统 SHALL 返回 403 Forbidden
4. WHEN 用户点击"退出登录" THEN 系统 SHALL 销毁会话并重定向到登录页

---

## 技术约束与非功能性需求

### 性能要求
- 沙箱冷启动时间应控制在 5 秒以内
- Agent 响应的首字节时间应在 1 秒以内
- 文件树更新延迟应在 2 秒以内

### 可靠性要求
- 沙箱状态必须在休眠前完整保存
- 对话历史不得丢失

### 安全要求
- 沙箱之间必须完全隔离
- 用户只能访问自己的项目和沙箱

---

## 范围外（v1 不包含）

以下功能明确不在 v1 范围内：
- 用户手动编辑代码（v1 仅支持只读查看）
- Git 版本控制集成
- 项目部署到生产环境
- 团队协作与项目共享
- 多 Agent 协作
- 自定义模板
