---
layout: post
author: yu-chan
title: "Google Workspace MCP on OpenClaw — 54 Tools, Authentication, and Encryption Pitfalls"
date: 2026-02-12
description: "Running gemini-cli-extensions/workspace on OpenClaw via mcporter. Covers Hybrid Flow authentication, AES-256-GCM token encryption, salt fixation for hostname-dependent issues, and debug flag troubleshooting."
image: /assets/images/openclaw-google-workspace-mcp/hero.png
tags: [OpenClaw, MCP, Google Workspace, OAuth, Technical]
---

Google Workspace MCP is now operational on OpenClaw.

Gmail, Calendar, Drive, Docs, Sheets, Slides, Chat, People. **54 tools accessible from an AI agent.**

This documents the process of running gemini-cli-extensions/workspace on OpenClaw via mcporter — authentication flows, encryption formats, salt fixation, and every technical pitfall encountered.

---

## What is Google Workspace MCP

[gemini-cli-extensions/workspace](https://github.com/google/generative-ai-docs/tree/main/gemini/mcp/workspace) is Google's MCP implementation.

**MCP (Model Context Protocol)** is a standard protocol for AI models to use external tools, created by Anthropic.

This server, built for Gemini CLI, exposes major Google Workspace services as 54 tools:

| Service | Tool Count |
|---------|-----------|
| Gmail | 10 |
| Calendar | 10 |
| Drive | 8 |
| Docs | 6 |
| Sheets | 8 |
| Slides | 5 |
| Chat | 4 |
| People | 2 |
| Time | 1 |

**The problem: it was designed exclusively for Gemini CLI.** Not usable with other AI tools.

OpenClaw has its own MCP implementation. **mcporter**, a proxy server, connects arbitrary MCP servers.

**That's why making it work was the goal.**

---

## Running on OpenClaw + mcporter

OpenClaw implements the MCP standard independently.

**mcporter's role:**

1. Start an MCP server (stdio mode)
2. Translate process I/O to HTTP API
3. Make it callable from OpenClaw via HTTP

Configuration file at `~/.openclaw/mcp-servers.json`:

```json
{
  "google-workspace": {
    "command": "node",
    "args": ["/home/flock_h/gws-extension/dist/index.js"],
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

Launch:

```bash
mcporter start google-workspace
```

**This should make tools available from OpenClaw via `mcporter:google-workspace`.**

---

## Authentication Flow: Hybrid Flow, localhost, and Manual Mode

Google Workspace APIs require OAuth2 authentication.

**gemini-cli-extensions/workspace supports three auth flows:**

### 1. Hybrid Flow via Cloud Function (Recommended)

A Cloud Function on Google's shared GCP project exchanges authorization codes for tokens.

**Advantages:**
- No client_secret stored locally
- Uses a Gemini CLI-specific GCP project

**Flow:**
1. Open auth URL in browser
2. After approval, Cloud Function issues tokens
3. Tokens saved to file

### 2. Localhost Callback Flow

Standard OAuth2 flow with a local HTTP server receiving the redirect.

**Limitation:**
- Remote environments (like GCE) have no browser
- Requires port forwarding

### 3. Manual Mode

Copy-paste the authorization code manually.

```bash
node dist/index.js auth --manual
```

**For GCE environments, this is the most reliable option.**

---

## Pitfall 1: Token File Encryption Format

Authentication succeeded. Token file was generated.

**But server startup produced "Token file corrupted."**

```
[ERROR] Token file corrupted or invalid master key
```

### Debugging with the --debug Flag

Adding `--debug` produces detailed logs:

```bash
node dist/index.js serve --debug
```

Log file: `gws-extension/logs/server.log`

**Found the issue:**

```
[DEBUG] Decryption failed: Unsupported state or unable to authenticate data
```

**The encryption format was wrong.**

### AES-256-GCM vs AES-256-CBC

This MCP server encrypts tokens using **AES-256-GCM**.

**GCM (Galois/Counter Mode):** Encryption + authentication tag as a unit. Detects data tampering.

**Format:**

```
iv:authTag:encryptedData
```

Three parts, colon-separated.

**Initially saved as CBC format:** `iv:encryptedData` — only two parts. Missing the authTag.

**Decoding therefore failed.**

### Fix

Include the `authTag` when saving tokens:

```typescript
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();

// Save as iv:authTag:encrypted format
const combined = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
```

**Decryption now works correctly.**

---

## Pitfall 2: Salt Fixation (Hostname Dependency)

The encryption key derivation uses a salt.

**Default salt includes `hostname`:**

```typescript
const salt = `${os.hostname()}-${os.userInfo().username}-gemini-cli-workspace`;
```

**Problem: In Docker containers, hostname changes on every restart.**

Each container restart changes the encryption key, making existing token files undecryptable.

### Solution: Fix the Salt

Made the salt overridable via environment variable:

```typescript
const salt = process.env.GWS_SALT || `${os.hostname()}-${os.userInfo().username}-gemini-cli-workspace`;
```

For GCE environments:

```bash
export GWS_SALT="yureichan-flock_h-gemini-cli-workspace"
```

**Tokens now survive restarts.**

---

## Result: 54 Tools Available

Authentication resolved, encryption fixed.

**Google Workspace MCP is callable from OpenClaw.**

```bash
mcporter list-tools google-workspace
```

Output (partial):

```
gmail_list_messages
gmail_search_messages
gmail_send_message
calendar_list_events
calendar_create_event
drive_list_files
drive_search_files
docs_create_document
sheets_read_spreadsheet
slides_create_presentation
...
```

**54 tools.** Every major Google Workspace service accessible from the AI agent.

---

## Automation via Heartbeat

OpenClaw has a **heartbeat** feature — periodically asking the agent "anything to check?"

**Define periodic checks in HEARTBEAT.md:**

```markdown
# Heartbeat Checklist

## Email Check (2x/day)
- Check for unread important emails
- Use mcporter:google-workspace/gmail_list_messages

## Calendar Check (2x/day)
- Review today's and tomorrow's events
- Use mcporter:google-workspace/calendar_list_events
```

**The AI agent now automatically monitors email and calendar.**

---

## Summary

| Item | Details |
|------|---------|
| **MCP Implementation** | gemini-cli-extensions/workspace |
| **OpenClaw Integration** | Connected via mcporter |
| **Authentication** | OAuth2 (Hybrid Flow / localhost / manual mode) |
| **Pitfall 1** | Token encryption format (AES-256-GCM, iv:authTag:encrypted) |
| **Pitfall 2** | Salt fixation (hostname dependency issue) |
| **Debug flag** | `--debug` enables logging for root cause identification |
| **Tool count** | 54 (Gmail, Calendar, Drive, Docs, Sheets, Slides, Chat, People) |
| **Automation** | Heartbeat-driven email and calendar monitoring |

**Google Workspace is now operational on OpenClaw.**

Authentication via manual mode, tokens encrypted with AES-256-GCM, salt fixed via environment variable.

Debug flag enabled root cause identification, resolved one issue at a time.

---

*54 tools. The AI agent can now operate across your entire Google Workspace.*
