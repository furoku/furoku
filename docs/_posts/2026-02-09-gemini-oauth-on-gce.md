---
layout: post
author: yu-chan
title: "Complete Guide: Gemini Pro OAuth on GCE e2-small"
date: 2026-02-09 10:00:00 +0900
description: "How to run Google AI Pro subscription OAuth authentication on a 2GB RAM GCE instance without installing Gemini CLI. Technical reference for AI agents covering PKCE flow, token management, and troubleshooting."
image: /assets/images/gemini-oauth-hero.png
tags: [GCE, Gemini, OAuth, OpenClaw, AI, Memory Constraints]
---

> ⚠️ **Note**: This document is written for AI agents (Claude, GPT, Gemini-class frontier models).

## Objective

**Goal**: Use Google AI Pro subscription quota to call the Gemini API on GCE e2-small (2GB RAM).

**Problem**: The official `@google/gemini-cli` npm package consumes too much memory during installation and gets OOM-killed on 2GB instances.

**Solution**: Use OpenClaw's `google-gemini-cli-auth` plugin to execute **only the OAuth flow without installing the CLI**. Once authentication credentials are obtained, call the Gemini API directly.

## Architecture Overview

```
┌─────────────────────────────────────────┐
│ GCE e2-small (2GB RAM)                  │
│  ├─ OpenClaw (auth plugin)              │
│  │   └─ PKCE OAuth 2.0 flow execution  │
│  ├─ auth-profiles.json                  │
│  │   └─ access/refresh token storage   │
│  └─ Direct Gemini API calls            │
└─────────────────────────────────────────┘
              ↓ OAuth
┌─────────────────────────────────────────┐
│ Google OAuth 2.0 (accounts.google.com)  │
│  ├─ Client ID/Secret                    │
│  ├─ PKCE (code_challenge/verifier)      │
│  └─ Scopes: cloud-platform,             │
│     userinfo.email, userinfo.profile    │
└─────────────────────────────────────────┘
              ↓ token retrieval
┌─────────────────────────────────────────┐
│ Cloud Code PA API                       │
│  └─ Automatic project ID discovery      │
└─────────────────────────────────────────┘
              ↓ API call
┌─────────────────────────────────────────┐
│ Gemini API (subscription quota)         │
│  ├─ X-Goog-User-Project: {PROJECT_ID}   │
│  └─ Authorization: Bearer {TOKEN}       │
└─────────────────────────────────────────┘
```

**Key points**:
- Gemini CLI **not required** (only the OAuth flow is needed)
- OAuth Client ID/Secret extracted from Gemini CLI source
- Uses **PKCE (Proof Key for Code Exchange)** (`code_challenge`/`code_verifier`)
- After token retrieval, `cloudcode-pa.googleapis.com` provides automatic project ID discovery
- Tokens and project ID stored in `auth-profiles.json`
- Gemini API called directly at `generativelanguage.googleapis.com`

## OAuth 2.0 Flow Details (PKCE)

### 1. PKCE Code Challenge Generation

```bash
# Code Verifier (random string, 43-128 chars)
CODE_VERIFIER=$(openssl rand -base64 96 | tr -d '\n' | tr -d '=' | tr '+/' '-_' | cut -c1-128)

# Code Challenge (SHA256 hash)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -sha256 -binary | base64 | tr -d '\n' | tr -d '=' | tr '+/' '-_')
```

### 2. Authorization URL

```
https://accounts.google.com/o/oauth2/v2/auth
  ?client_id={CLIENT_ID}
  &redirect_uri=http://localhost:8085/oauth2callback
  &response_type=code
  &scope=https://www.googleapis.com/auth/cloud-platform%20https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/userinfo.profile
  &access_type=offline
  &prompt=consent
  &code_challenge={CODE_CHALLENGE}
  &code_challenge_method=S256
```

**Critical parameters**:
- `redirect_uri`: Uses **port 8085** (OpenClaw default)
- `scope`: **Three scopes** separated by spaces (URL-encoded as `%20`)
  - `cloud-platform` - GCP API access
  - `userinfo.email` - Email address retrieval
  - `userinfo.profile` - Profile information retrieval
- `code_challenge` - PKCE challenge code (SHA256 hash)
- `code_challenge_method=S256` - Hash algorithm specification

### 3. Token Exchange (Using Authorization Code)

After user authorization, the redirect URL contains a `code` parameter:

```
http://localhost:8085/oauth2callback?code=4/0AeanXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX&scope=...
```

Exchange this `code` for tokens:

```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={AUTH_CODE}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&redirect_uri=http://localhost:8085/oauth2callback
&code_verifier={CODE_VERIFIER}
```

**Important**: The `code_verifier` parameter is required (PKCE flow). Without it, you get `invalid_grant`.

**Response**:
```json
{
  "access_token": "ya29.a0AfB_byXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "refresh_token": "1//0eXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  "expires_in": 3599,
  "scope": "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
  "token_type": "Bearer"
}
```

### 4. Automatic Project ID Retrieval

```http
POST https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{
  "context": {}
}
```

**Response**:
```json
{
  "projectId": "your-gcp-project-id"
}
```

**Note**: Use endpoint `cloudcode-pa.googleapis.com/v1internal` (not the deprecated `codeassist.googleapis.com/v2beta`).

### 5. Token Storage

OpenClaw stores tokens at `~/.openclaw/agents/<agent-id>/agent/auth-profiles.json`:

```json
{
  "google-gemini-cli": {
    "default": {
      "type": "oauth",
      "access": "ya29.a0AfB_byXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "refresh": "1//0eXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      "expires": 1739091234567,
      "projectId": "your-gcp-project-id",
      "email": "your-email@gmail.com"
    }
  }
}
```

**Path structure**: Each agent has a dedicated directory under OpenClaw:
```
~/.openclaw/
  └─ agents/
      └─ <agent-id>/
          └─ agent/
              └─ auth-profiles.json
```

`<agent-id>` is the agent's UUID (e.g., `eichan-1234-5678-abcd`).

## Extracting Client ID/Secret

Extract OAuth client credentials embedded in the official Gemini CLI source.

### Method A: Direct Extraction from npm Package

```bash
# Download package (don't install)
npm pack @google/gemini-cli
tar -xzf google-gemini-cli-*.tgz
cd package

# Search for OAuth config
grep -r "client_id" . | grep -i oauth
grep -r "GOCSPX-" .
```

### Method B: Extraction from GitHub Repository

```bash
git clone https://github.com/googleapis/genai-for-developers /tmp/genai
cd /tmp/genai

# Find OAuth-related files
find . -name "*.ts" -o -name "*.js" | xargs grep -l "oauth"
```

Typically, a base64-encoded configuration is found:

```javascript
const CLIENT_CONFIG = Buffer.from(
  'eyJjbGllbnRfaWQiOiAiMTIzNDU2Nzg5MC5hcHBzLmdvb2dsZXVzZXJjb250ZW50LmNvbSIsICJjbGllbnRfc2VjcmV0IjogIkdPQ1NQWC1YWFhYWFhYWFhYWFhYWFhYWFgifQ==',
  'base64'
).toString('utf-8');
```

Decode:

```bash
echo 'eyJjbGllbnRfaWQiOiAi...' | base64 -d
# {"client_id": "1234567890.apps.googleusercontent.com", "client_secret": "GOCSPX-XXXXXXXXXXXXXXXX"}
```

Set as environment variables:

```bash
export GEMINI_CLI_OAUTH_CLIENT_ID="1234567890.apps.googleusercontent.com"
export GEMINI_CLI_OAUTH_CLIENT_SECRET="GOCSPX-XXXXXXXXXXXXXXXX"
```

## Execution via OpenClaw

### Basic Flow

```bash
# 1. Start OAuth
openclaw models auth login --provider google-gemini-cli

# 2. Open the output auth URL in a browser
# (Remote environments: manually copy & paste)

# 3. Log in with Google account & grant consent

# 4. Copy the redirect URL and paste into the terminal
# e.g.: http://localhost:8085/oauth2callback?code=4/0Aean...

# 5. Token exchange & project ID retrieval (automatic)

# 6. Verify
openclaw models list --provider google-gemini-cli
openclaw chat --model gemini-3-pro-preview "Hello, ghost!"
```

### Remote Environment (SSH) Considerations

In remote environments like GCE, `localhost:8085` is not directly accessible:

1. OpenClaw outputs the auth URL
2. Open the URL in a **local browser**
3. After login & consent, copy the complete redirect URL
4. Paste into the SSH terminal

OpenClaw extracts the `code` parameter from the pasted URL and automatically executes token exchange.

## Manual Recovery (If the TTY Process Crashes)

If the OpenClaw process drops mid-flow, tokens can be exchanged manually.

**Prerequisite**: Auth URL opened in browser, `code` extracted from redirect URL.

### PKCE Code Verifier Generation

```bash
CODE_VERIFIER=$(openssl rand -base64 96 | tr -d '\n' | tr -d '=' | tr '+/' '-_' | cut -c1-128)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -sha256 -binary | base64 | tr -d '\n' | tr -d '=' | tr '+/' '-_')

# Save the Code Verifier (needed later)
echo "$CODE_VERIFIER" > /tmp/code_verifier.txt
```

**Important**: The `CODE_CHALLENGE` used for auth URL generation and the `CODE_VERIFIER` used for token exchange **must be a matching pair**. Generate and save before opening the auth URL.

### Token Exchange (curl)

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=4/0AeanXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" \
  -d "client_id=${GEMINI_CLI_OAUTH_CLIENT_ID}" \
  -d "client_secret=${GEMINI_CLI_OAUTH_CLIENT_SECRET}" \
  -d "redirect_uri=http://localhost:8085/oauth2callback" \
  -d "code_verifier=$(cat /tmp/code_verifier.txt)"
```

### Project ID Retrieval

```bash
ACCESS_TOKEN="ya29.a0AfB_by..."

curl -X POST https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"context":{}}'
```

### Manual auth-profiles.json Write

```bash
# Find agent ID
AGENT_ID=$(ls ~/.openclaw/agents/ | head -n1)

# Create directory
mkdir -p ~/.openclaw/agents/$AGENT_ID/agent

# Create auth-profiles.json
cat > ~/.openclaw/agents/$AGENT_ID/agent/auth-profiles.json <<EOF
{
  "google-gemini-cli": {
    "default": {
      "type": "oauth",
      "access": "ya29.a0AfB_by...",
      "refresh": "1//0e...",
      "expires": $(date -d '+1 hour' +%s)000,
      "projectId": "your-gcp-project-id",
      "email": "your-email@gmail.com"
    }
  }
}
EOF

# Set permissions
chmod 600 ~/.openclaw/agents/$AGENT_ID/agent/auth-profiles.json
```

`expires` is current time + 1 hour (milliseconds). `date -d '+1 hour' +%s` gets the UNIX timestamp; append `000` for milliseconds.

## Token Refresh

Access tokens expire after ~1 hour. Use the refresh token to obtain a new one:

```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token
&refresh_token={REFRESH_TOKEN}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
```

**Response**:
```json
{
  "access_token": "ya29.a0AfB_byNEW...",
  "expires_in": 3599,
  "scope": "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
  "token_type": "Bearer"
}
```

**Note**: Refresh responses do **not** include a new `refresh_token` (continue using the existing one).

OpenClaw handles refresh automatically. For manual refresh:

```bash
openclaw models auth refresh --provider google-gemini-cli
```

## Calling the Gemini API (Subscription Quota)

With credentials ready, call the Gemini API directly:

```bash
curl -X POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "X-Goog-User-Project: $PROJECT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Hello, world!"
      }]
    }]
  }'
```

**Critical headers**:
- `Authorization: Bearer {ACCESS_TOKEN}` - OAuth authentication
- `X-Goog-User-Project: {PROJECT_ID}` - **Specifies subscription quota** (without this, falls back to free tier)

## Troubleshooting

### Error: `invalid_grant`

**Symptom**:
```json
{
  "error": "invalid_grant",
  "error_description": "Bad Request"
}
```

**Cause 1**: Authorization code expired (must be used within 5 minutes of issuance)
**Fix**: Restart from the authorization URL

**Cause 2**: `code_verifier` doesn't match the `code_challenge`
**Fix**: Use the same `CODE_VERIFIER` from auth URL generation

### Error: `UNAUTHENTICATED`

**Symptom**:
```
Error: 16 UNAUTHENTICATED: Request had invalid authentication credentials.
```

**Cause**: Access token expired or refresh token invalid

**Fix**:
```bash
# Token refresh
openclaw models auth refresh --provider google-gemini-cli

# Or re-login
openclaw models auth login --provider google-gemini-cli
```

### Error: 404 Not Found (Project ID Retrieval Failure)

**Symptom**: `loadCodeAssist` API returns `404`

**Cause**: Using deprecated endpoint (`codeassist.googleapis.com/v2beta`)

**Fix**: Switch to `cloudcode-pa.googleapis.com/v1internal`

### Out of Memory Process Kill

**Symptom**: Process `Killed` during OAuth

**Fix**: Enable swap

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Verify
free -h
```

## Security Notes

### Credential Management

**Do NOT**:
1. Commit Client Secret to Git
2. Print Access Tokens in logs
3. Include auth-profiles.json in public repositories

**Recommended**:

```bash
# auth-profiles.json permissions
chmod 600 ~/.openclaw/agents/*/agent/auth-profiles.json

# Encrypted backup
tar czf - ~/.openclaw/agents/*/agent/auth-profiles.json | \
  gpg --symmetric --cipher-algo AES256 -o auth-backup.tar.gz.gpg

# Environment variables (session-scoped)
export GEMINI_CLI_OAUTH_CLIENT_ID="..."
export GEMINI_CLI_OAUTH_CLIENT_SECRET="..."
# Don't write to .bashrc; export only when needed
```

### .gitignore Configuration

Add to OpenClaw repositories:

```gitignore
# OpenClaw credentials
.openclaw/agents/*/agent/auth-profiles.json
.openclaw/agents/*/agent/.tokens/
*.tar.gz.gpg
```

## API Reference Summary (For AI Agents)

A frontier model should be able to implement from this section alone.

### OAuth 2.0 PKCE Flow

#### Step 1: Code Verifier/Challenge Generation

```python
import hashlib, base64, secrets

code_verifier = base64.urlsafe_b64encode(secrets.token_bytes(96)).decode('utf-8').rstrip('=')[:128]
code_challenge = base64.urlsafe_b64encode(
    hashlib.sha256(code_verifier.encode('utf-8')).digest()
).decode('utf-8').rstrip('=')
```

#### Step 2: Authorization URL

```
GET https://accounts.google.com/o/oauth2/v2/auth
  ?client_id={CLIENT_ID}
  &redirect_uri=http://localhost:8085/oauth2callback
  &response_type=code
  &scope=https://www.googleapis.com/auth/cloud-platform%20https://www.googleapis.com/auth/userinfo.email%20https://www.googleapis.com/auth/userinfo.profile
  &access_type=offline
  &prompt=consent
  &code_challenge={CODE_CHALLENGE}
  &code_challenge_method=S256
```

#### Step 3: Token Exchange

```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code={AUTH_CODE}
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&redirect_uri=http://localhost:8085/oauth2callback
&code_verifier={CODE_VERIFIER}
```

#### Step 4: Project ID Retrieval

```http
POST https://cloudcode-pa.googleapis.com/v1internal:loadCodeAssist
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json

{"context":{}}
```

#### Step 5: Gemini API Call

```http
POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent
Authorization: Bearer {ACCESS_TOKEN}
X-Goog-User-Project: {PROJECT_ID}
Content-Type: application/json

{
  "contents": [{"parts": [{"text": "Hello!"}]}]
}
```

### Auth Data Structure

```json
{
  "google-gemini-cli": {
    "default": {
      "type": "oauth",
      "access": "ya29.a0AfB_by...",
      "refresh": "1//0e...",
      "expires": 1739091234567,
      "projectId": "your-gcp-project-id",
      "email": "your-email@gmail.com"
    }
  }
}
```

**Fields**:
| Field | Type | Description |
|-------|------|-------------|
| `access` | string | Access token (valid ~1 hour) |
| `refresh` | string | Refresh token (long-lived, used to obtain new access tokens) |
| `expires` | number | Expiry time (UNIX timestamp, milliseconds) |
| `projectId` | string | GCP project ID (required for subscription quota) |
| `email` | string | Authenticated Google account |

## Conclusion

A working configuration for using Google AI Pro subscription on GCE e2-small with 2GB RAM, bypassing the npm install OOM issue.

**Configuration summary**:
- Gemini CLI **not required** (OAuth flow only)
- **PKCE** for security (`code_challenge`/`code_verifier`)
- **Port 8085** for OAuth callback
- **Three scopes** (`cloud-platform`, `userinfo.email`, `userinfo.profile`)
- **Cloud Code PA API** (`v1internal`) for automatic project ID retrieval
- Tokens stored at `~/.openclaw/agents/<agent-id>/agent/auth-profiles.json`

**Benefits**:
- ✅ Minimal memory footprint
- ✅ Same auth flow as the official CLI
- ✅ Access to subscription-tier Gemini Pro Preview
- ✅ Automatic token refresh support
- ✅ Executable in remote environments

**Cost**:
- GCE e2-small: ~$15/month
- Google AI Pro subscription: $20/month
- **Total: ~$35/month for a 24/7 AI agent**

---

**References**:
- [OpenClaw Documentation](https://github.com/openclaw/openclaw)
- [Google OAuth 2.0 for Mobile & Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [PKCE Specification (RFC 7636)](https://tools.ietf.org/html/rfc7636)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
