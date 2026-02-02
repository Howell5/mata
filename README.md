# Mata

An AI-powered code sandbox platform that enables developers to create, edit, and preview code in isolated cloud environments with an intelligent coding assistant.

[![GitHub](https://img.shields.io/badge/GitHub-Howell5%2Fmata-blue?logo=github)](https://github.com/Howell5/mata)

## Overview

Mata combines E2B cloud sandboxes with Claude AI to provide a seamless coding experience. Users can create projects, interact with an AI assistant through natural language, and see real-time code changes and previews in isolated development environments.

## Features

- **AI-Powered Coding Assistant**: Chat with Claude AI to write, modify, and debug code
- **Cloud Sandboxes**: Isolated E2B sandbox environments for each project
- **Real-time Preview**: Live preview of your application with hot reload
- **File Management**: Browse, view, and edit files directly in the workspace
- **Integrated Terminal**: Execute commands in your sandbox environment
- **Project Management**: Create and manage multiple projects
- **End-to-End Type Safety**: Full TypeScript support with Hono RPC-style API
- **Authentication**: Social login with Google and GitHub OAuth
- **Credits System**: Pay-as-you-go model with Stripe integration

## Tech Stack

### Backend (`apps/api`)
- **Runtime**: Node.js 20+
- **Framework**: [Hono](https://hono.dev/) - Lightweight, ultrafast web framework
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **AI Integration**: [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk)
- **Cloud Sandboxes**: [E2B](https://e2b.dev/)
- **Payments**: Stripe

### Frontend (`apps/web`)
- **Framework**: React 18 with [Vite](https://vitejs.dev/)
- **State Management**: [TanStack Query](https://tanstack.com/query)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)
- **Routing**: React Router v7
- **Forms**: React Hook Form + Zod

### Shared (`packages/shared`)
- Zod validation schemas
- TypeScript types
- Pricing configuration

### Tooling
- **Monorepo**: pnpm workspaces + [Turborepo](https://turbo.build/)
- **Linting/Formatting**: [Biome](https://biomejs.dev/)
- **Testing**: Vitest

## Project Structure

```
mata/
├── apps/
│   ├── api/                    # Backend API
│   │   ├── src/
│   │   │   ├── db/             # Database schema and connection
│   │   │   ├── routes/         # API endpoints
│   │   │   │   ├── agent.ts    # AI agent chat endpoint
│   │   │   │   ├── sandbox.ts  # Sandbox management
│   │   │   │   ├── projects.ts # Project CRUD
│   │   │   │   └── ...
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── agent.service.ts    # Claude AI integration
│   │   │   │   ├── sandbox.service.ts  # E2B sandbox management
│   │   │   │   └── sandbox-cleanup.service.ts
│   │   │   ├── lib/            # Utilities
│   │   │   ├── auth.ts         # Authentication config
│   │   │   └── index.ts        # App entry point
│   │   └── drizzle.config.ts
│   └── web/                    # Frontend SPA
│       ├── src/
│       │   ├── components/     # UI components
│       │   ├── pages/
│       │   │   ├── workspace/  # Main IDE workspace
│       │   │   │   ├── components/
│       │   │   │   │   ├── chat-panel.tsx
│       │   │   │   │   ├── file-tree.tsx
│       │   │   │   │   ├── file-viewer.tsx
│       │   │   │   │   ├── preview-panel.tsx
│       │   │   │   │   └── terminal-panel.tsx
│       │   │   │   └── index.tsx
│       │   │   ├── projects.tsx
│       │   │   └── ...
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # API client, utilities
│       │   └── main.tsx
│       └── vite.config.ts
└── packages/
    └── shared/                 # Shared types and schemas
        └── src/
            ├── schemas/
            └── config/
```

## Quick Start

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Docker (for PostgreSQL)

### 1. Clone and Install

```bash
git clone git@github.com:Howell5/mata.git
cd mata
pnpm install
```

### 2. Configure Environment Variables

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Edit `apps/api/.env`:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (min 32 chars) |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | Yes | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | Yes | GitHub OAuth client secret |
| `E2B_API_KEY` | Yes | E2B sandbox API key |
| `ANTHROPIC_API_KEY` | Yes | Claude API key |
| `STRIPE_SECRET_KEY` | No | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook secret |

Generate a secure secret:
```bash
openssl rand -base64 32
```

### 3. Start Database

```bash
pnpm docker:up
```

### 4. Initialize Database

```bash
pnpm db:push
```

### 5. Start Development

```bash
pnpm dev
```

- API: http://localhost:3000
- Web: http://localhost:5173

## Commands

```bash
# Development
pnpm dev              # Start all apps
pnpm build            # Build all apps
pnpm lint             # Lint all packages
pnpm format           # Format with Biome
pnpm check            # Check and fix issues

# Database
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Drizzle Studio
pnpm docker:up        # Start PostgreSQL
pnpm docker:down      # Stop PostgreSQL

# Testing (in apps/api)
pnpm test             # Run tests
pnpm test:watch       # Watch mode
pnpm test:coverage    # Coverage report
```

## Architecture

### Workspace Flow

1. User creates a project
2. System provisions an E2B sandbox
3. User chats with AI assistant
4. AI executes code changes in sandbox
5. Changes appear in file tree and preview

### Key Components

**Sandbox Service** (`apps/api/src/services/sandbox.service.ts`)
- Creates and manages E2B sandbox instances
- Handles file operations (read, write, list)
- Executes terminal commands
- Manages sandbox lifecycle (create, pause, resume, terminate)

**Agent Service** (`apps/api/src/services/agent.service.ts`)
- Streams AI responses via SSE
- Integrates Claude Agent SDK
- Manages conversation history

**Workspace Page** (`apps/web/src/pages/workspace/`)
- Resizable panel layout
- Chat panel for AI interaction
- File tree navigation
- Code viewer with syntax highlighting
- Live preview iframe
- Integrated terminal

### Database Schema

- `users` - User accounts
- `projects` - User projects
- `sandboxes` - E2B sandbox instances
- `conversations` - Chat conversations
- `messages` - Individual chat messages
- `orders` - Credit purchase history

## OAuth Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add redirect URI: `http://localhost:3000/api/auth/callback/google`

### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set callback URL: `http://localhost:3000/api/auth/callback/github`

## Deployment

The project includes `zeabur.json` for deployment to [Zeabur](https://zeabur.com).

### Deploy Steps

1. Create Zeabur project
2. Add PostgreSQL service
3. Deploy API service with environment variables
4. Deploy Web service with `VITE_API_URL`
5. Run database migrations

See [Zeabur Documentation](https://zeabur.com/docs) for details.

## License

MIT
