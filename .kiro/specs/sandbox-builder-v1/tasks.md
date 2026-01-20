# Implementation Plan

## Phase 1: Foundation

- [ ] 1. Set up database schema and basic project structure
  - [ ] 1.1 Create database schema for projects, sandboxes, conversations, messages tables
    - Add tables to `apps/api/src/db/schema.ts` following existing patterns
    - Include all relations defined in design document
    - _Requirements: 1.1, 2.1_

  - [ ] 1.2 Create shared Zod schemas for project and conversation types
    - Create `packages/shared/src/schemas/project.ts`
    - Create `packages/shared/src/schemas/conversation.ts`
    - Export from `packages/shared/src/index.ts`
    - _Requirements: 1.1, 3.1_

  - [ ] 1.3 Add E2B SDK and claude-agent-sdk dependencies
    - Install `e2b` package in `apps/api`
    - Add E2B and Anthropic API key validation to `apps/api/src/env.ts`
    - _Requirements: 2.1, 3.1_

## Phase 2: Project Management API

- [ ] 2. Implement project CRUD operations
  - [ ] 2.1 Create projects route with list/create/get/delete endpoints
    - Create `apps/api/src/routes/projects.ts`
    - Implement authentication checks using existing `auth.api.getSession()`
    - Follow existing route patterns (postsRoute)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 2.2 Write unit tests for projects route
    - Test all CRUD operations
    - Test authentication and authorization
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

## Phase 3: Sandbox Manager Service

- [ ] 3. Implement E2B sandbox lifecycle management
  - [ ] 3.1 Create SandboxManager service class
    - Create `apps/api/src/services/sandbox.service.ts`
    - Implement `create()`, `pause()`, `resume()`, `terminate()` methods
    - Use E2B's `betaPause()` and `Sandbox.connect()` for state persistence
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ] 3.2 Implement sandbox file operations
    - Add `listFiles()`, `readFile()`, `writeFile()` methods to SandboxManager
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 3.3 Create sandbox API routes
    - Create `apps/api/src/routes/sandbox.ts`
    - Implement file listing, file reading, preview URL endpoints
    - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.5_

  - [ ] 3.4 Implement sandbox idle timeout logic
    - Create background job to check sandbox activity
    - Auto-pause sandboxes after 30 seconds of inactivity
    - Auto-terminate sandboxes after 1 hour of hibernation
    - _Requirements: 2.3, 2.4, 2.5_

## Phase 4: Agent Integration

- [ ] 4. Implement Claude Agent SDK integration in sandbox
  - [ ] 4.1 Create E2B sandbox template with Node.js and Claude Code CLI
    - Create custom E2B template or use base template with setup script
    - Pre-install `@anthropic-ai/claude-code` CLI
    - Set up project directory structure
    - _Requirements: 3.1, 3.2_

  - [ ] 4.2 Create agent worker script for sandbox execution
    - Create script that receives messages and runs agent SDK
    - Implement session resumption with `resume` option
    - Output agent messages as JSON to stdout
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 4.3 Implement AgentService to orchestrate agent execution
    - Create `apps/api/src/services/agent.service.ts`
    - Execute agent worker script in sandbox via `sandbox.commands.run()`
    - Parse and forward agent messages to frontend
    - Handle agent interruption with AbortController
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7_

  - [ ] 4.4 Create agent API route with SSE streaming
    - Create `apps/api/src/routes/agent.ts`
    - Implement `/chat` endpoint returning SSE stream
    - Implement `/stop` endpoint for interruption
    - _Requirements: 3.1, 3.7_

## Phase 5: Conversation Persistence

- [ ] 5. Implement conversation history storage
  - [ ] 5.1 Create ConversationService for message storage
    - Create `apps/api/src/services/conversation.service.ts`
    - Implement `saveMessage()`, `getHistory()` methods
    - Store tool calls as JSON in messages table
    - _Requirements: 3.4, 3.5_

  - [ ] 5.2 Create conversations API route
    - Create `apps/api/src/routes/conversations.ts`
    - Implement get history endpoint
    - _Requirements: 3.5_

## Phase 6: Real-time Updates

- [ ] 6. Implement SSE event streaming infrastructure
  - [ ] 6.1 Create SSE utility helpers
    - Create `apps/api/src/lib/sse.ts`
    - Implement SSE response helper for Hono
    - Define event type constants
    - _Requirements: 4.2, 6.1, 6.2_

  - [ ] 6.2 Implement file change notifications
    - Watch sandbox filesystem for changes
    - Emit `file:changed` events via SSE
    - _Requirements: 4.2, 4.4_

  - [ ] 6.3 Implement terminal output streaming
    - Create terminal SSE endpoint
    - Stream command output in real-time
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

## Phase 7: Frontend - Project Management

- [ ] 7. Implement frontend project management UI
  - [ ] 7.1 Create project list page
    - Create `apps/web/src/pages/projects.tsx`
    - Display user's projects sorted by last access
    - Add create project button/dialog
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 7.2 Create project creation form
    - Implement form with name and description fields
    - Use shared Zod schema for validation
    - _Requirements: 1.1, 1.2_

  - [ ] 7.3 Add project deletion functionality
    - Add delete button with confirmation dialog
    - _Requirements: 1.5_

## Phase 8: Frontend - Workspace

- [ ] 8. Implement project workspace UI
  - [ ] 8.1 Create workspace layout component
    - Create `apps/web/src/pages/workspace.tsx`
    - Implement resizable sidebar, main panel, and bottom panel
    - _Requirements: 4.1, 5.1, 6.1_

  - [ ] 8.2 Implement file tree sidebar
    - Create `apps/web/src/components/file-tree.tsx`
    - Display sandbox file structure
    - Handle file selection
    - _Requirements: 4.1, 4.5_

  - [ ] 8.3 Implement file viewer (read-only)
    - Create `apps/web/src/components/file-viewer.tsx`
    - Display file content with syntax highlighting
    - Auto-update when file changes
    - _Requirements: 4.3, 4.4_

  - [ ] 8.4 Implement preview panel
    - Create `apps/web/src/components/preview-panel.tsx`
    - Embed sandbox preview URL in iframe
    - Add refresh and open-in-new-tab buttons
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 8.5 Implement terminal output panel
    - Create `apps/web/src/components/terminal-panel.tsx`
    - Display streaming terminal output
    - Auto-scroll to latest output
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

## Phase 9: Frontend - Chat Interface

- [ ] 9. Implement chat UI
  - [ ] 9.1 Create chat panel component
    - Create `apps/web/src/components/chat-panel.tsx`
    - Display message history
    - Show tool calls with collapsible details
    - _Requirements: 3.1, 3.3, 3.4_

  - [ ] 9.2 Implement message input
    - Create message input with send button
    - Handle Enter key to send
    - _Requirements: 3.1_

  - [ ] 9.3 Implement streaming response display
    - Show typing indicator while agent is thinking
    - Stream assistant messages in real-time
    - Display tool execution status
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 9.4 Implement stop generation button
    - Add stop button during agent execution
    - Call agent stop endpoint
    - _Requirements: 3.7_

## Phase 10: Sandbox State Management

- [ ] 10. Implement sandbox state handling in frontend
  - [ ] 10.1 Create sandbox state hooks
    - Create `apps/web/src/hooks/use-sandbox.ts`
    - Handle sandbox creating/running/paused states
    - Show loading indicator during sandbox operations
    - _Requirements: 2.1, 2.2, 2.6, 2.7_

  - [ ] 10.2 Implement page visibility handling
    - Detect when user leaves project page
    - Notify backend to start idle timer
    - _Requirements: 2.3_

  - [ ] 10.3 Handle sandbox resume on return
    - Show resuming state when sandbox is paused
    - Auto-refresh file tree and preview after resume
    - _Requirements: 2.2_

## Phase 11: Error Handling & Polish

- [ ] 11. Add error handling and edge cases
  - [ ] 11.1 Implement sandbox error handling
    - Handle sandbox creation failures
    - Show retry option on errors
    - _Requirements: 2.6_

  - [ ] 11.2 Implement agent error handling
    - Handle agent timeout errors
    - Display tool execution errors gracefully
    - _Requirements: 3.6_

  - [ ] 11.3 Add loading states and skeleton UI
    - Add loading skeletons for file tree
    - Add loading states for all async operations
    - _Requirements: 2.7_

## Phase 12: Integration Testing

- [ ] 12. Write integration tests
  - [ ] 12.1 Test sandbox lifecycle
    - Test create → use → pause → resume → terminate flow
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 12.2 Test agent conversation flow
    - Test multi-turn conversation
    - Test tool execution
    - Test session resumption
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 12.3 Test file synchronization
    - Test file tree updates after agent operations
    - Test real-time file change notifications
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
