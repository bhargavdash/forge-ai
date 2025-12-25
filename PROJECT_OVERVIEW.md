# forge-ai --- Modular Monolith MVP

> **Status:** MVP Architecture Finalized\
> **Purpose:** Learning-focused autonomous coding agent\
> **Scope:** Free-tier only, non-commercial, solo project

---

## 1. Project Overview

**forge-ai** is an open-source, simplified version of Devin AI
--- an autonomous AI coding assistant that can:

- Read GitHub issues
- Understand a codebase
- Plan a solution
- Write code
- Run tests in a sandbox
- Fix failures automatically
- Create a GitHub Pull Request

This project is intentionally **not production-grade**. It is designed
to deeply understand: - Agentic AI systems - Orchestration logic -
LLM-driven code generation - Tool usage (GitHub, sandboxes, databases)

---

## 2. Core Product Flow

    GitHub Issue
        ↓
    Planner Agent (creates plan)
        ↓
    Coder Agent (writes code)
        ↓
    Sandbox (runs tests)
        ↓
    Fix loop (if tests fail)
        ↓
    Reviewer Agent
        ↓
    GitHub Pull Request
        ↓
    Human Review & Merge

This loop is the **entire product**.

---

## 3. Architectural Decision: Modular Monolith

### Why NOT Microservices (For Now)

- Solo developer
- Free-tier constraints
- High orchestration complexity
- Debugging overhead
- Slower iteration speed

Microservices would slow learning and development without adding value
at the MVP stage.

### Chosen Approach: Modular Monolith

- Single Express server
- Single deployment unit
- Clear internal module boundaries
- Centralized orchestration
- Easy future extraction into services

> **Key Rule:**\
> All modules are coordinated through the **Task Orchestrator**.\
> No module talks to another implicitly.

---

## 4. High-Level Architecture

    Client (Web / CLI)
            ↓
    Express API Server
            ↓
    Task Orchestrator (State Machine)
            ↓
    Planner | Coder | Reviewer Agents
            ↓
    LLM Gateway (Gemini)
            ↓
    Sandbox + GitHub
            ↓
    PostgreSQL Storage

---

## 5. Core Internal Modules

### 5.1 API Layer

**Responsibilities** - GitHub OAuth - Repository & issue selection -
Task creation - Task status & logs

**Tech** - Express - Passport.js - JWT - Zod

---

### 5.2 Task Orchestrator (The Brain)

The orchestrator is the **single source of truth** for execution.

**Responsibilities** - State machine - Context management - Retry
logic - Agent sequencing - Failure recovery

**State Flow**

    INIT → PLAN → CODE → TEST
            ↑         ↓
            └── FIX ← FAIL
                    ↓
                 REVIEW → PR → COMPLETE

**Execution Context**

```ts
{
  (taskId, repository, issue, plan, modifiedFiles, testResults, retryCount, conversationHistory);
}
```

---

### 5.3 AI Agents

#### Planner Agent

- Reads GitHub issue
- Searches codebase
- Produces step-by-step execution plan

#### Coder Agent

- Implements plan steps
- Generates diffs
- Fixes test failures

#### Reviewer Agent

- Performs quality checks
- Identifies obvious bugs
- Approves or rejects changes

---

### 5.4 LLM Gateway

**Purpose** - Abstract AI provider - Central prompt handling - Response
parsing - Easy model replacement

**Initial Model** - Gemini 2.0 Flash (free tier)

---

### 5.5 GitHub Integration Module

**Responsibilities** - Fetch issues - Clone repositories - Create
branches - Commit code - Open Pull Requests

**Tech** - Octokit - simple-git

---

### 5.6 Sandbox Manager

**Responsibilities** - Provision sandbox - Copy code - Install
dependencies - Run tests - Capture output - Destroy sandbox

**MVP Constraints** - Synchronous execution - No streaming logs - One
language at a time

---

### 5.7 Storage Layer

**PostgreSQL (Supabase Free Tier)** - users - repositories - tasks -
task_logs - embeddings (pgvector)

No Redis or queues required for MVP.

---

## 6. Tech Stack Summary

### Backend

- Node.js 20
- Express
- TypeScript
- Prisma
- PostgreSQL

### AI

- Gemini 2.0 Flash

### Sandbox

- E2B

### Frontend

- React + Vite (minimal UI)

---

## 7. Explicit Non-Goals (MVP)

- No microservices
- No Kubernetes
- No WebSockets
- No browser automation
- No real-time timelines
- No collaboration features
- No monetization

---

## 8. Post-MVP Evolution Path

Once the MVP is stable:

- Extract Sandbox Manager into service
- Extract GitHub integration into service
- Introduce BullMQ / Redis
- Add WebSocket progress updates
- Parallelize agents

> **Important:** Agent logic remains unchanged.

---

## 9. Success Criteria

- Can complete simple GitHub issues
- Can run tests automatically
- Can fix failures autonomously
- Produces clean, reviewable PRs
- Codebase remains understandable

---

## 10. Final Note

This project prioritizes **agent correctness over infrastructure
complexity**.

The orchestrator is the product.\
Everything else is replaceable.
