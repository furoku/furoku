---
layout: post
author: yu-chan
title: "Running OpenClaw on GCE — A Guide to Building a 24/7 AI Agent"
date: 2026-02-08 12:00:00 +0900
description: "Deploy OpenClaw on Google Compute Engine for 24/7 AI agent operation. Covers setup, enterprise-grade security, Google ecosystem integration, and self-managing infrastructure."
image: /assets/images/openclaw-gce/hero.png
tags: [OpenClaw, GCE, GCP, AI, Security, Infrastructure]
---

Deploying an OpenClaw AI agent on Google Compute Engine.

## Why GCE

Running an AI agent continuously requires stable infrastructure. Local machines introduce power management, network instability, and peripheral issues.

GCE provides SSH-only access, freedom from physical constraints, and enterprise-grade security foundations.

## Recommended Specs

GCE provides stable 24/7 operation for a few dollars per month.

**Recommended configuration:**
- **e2-small** (2 vCPU / 2GB RAM) — sufficient for OpenClaw + tool execution
- **Disk**: 30GB SSD
- **Region**: preference-dependent (us-central1 has partial free tier)

Note: e2-micro has insufficient memory. e2-small or higher recommended.

## Setup Procedure

### 1. Create GCE Instance

```
gcloud compute instances create openclaw-agent \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB
```

### 2. SSH and Install Node.js 22

```
gcloud compute ssh openclaw-agent

# Node.js 22
curl -fsSL \
  https://deb.nodesource.com/setup_22.x \
  | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Install OpenClaw

```
curl -fsSL \
  https://openclaw.ai/install.sh | bash
```

### 4. Onboarding

```
openclaw onboard --install-daemon
```

The wizard configures:
- **Model authentication** (Anthropic API Key, etc.)
- **Channel integration** (Discord, Slack, Telegram, etc.)
- **Gateway settings** (port, auth token)
- **Workspace path**

### 5. Verify Gateway

```
openclaw gateway status
```

No keyboard or mouse required.

## Enterprise Security

The GCE × OpenClaw combination is powerful because the security foundation is enterprise-grade.

### GCP-Side Security

- **IAM (Identity and Access Management)**: Service accounts with minimal permissions. No password sharing required
- **VPC Firewall**: Only necessary ports opened. All ports closed by default
- **Cloud Audit Logs**: Full operation tracking — who did what, when
- **OS Login**: SSH keys managed centrally by GCP. No password login

### OpenClaw-Side Security

OpenClaw gives AI shell access — an inherently risky operation. Security design is thorough.

**Access control:**
```json5
{
  gateway: {
    bind: "loopback",  // Local connections only
    auth: { mode: "token", token: "long-random-token" }
  },
  channels: {
    discord: { dmPolicy: "pairing" }  // DM approval required
  }
}
```

- **DM approval (pairing)**: Unknown senders auto-blocked; approval code required
- **Group mention mode (requireMention)**: Responds only when explicitly mentioned
- **Tool sandbox**: Dangerous commands run in isolated environments
- **Security audit**: `openclaw security audit --deep` for one-command inspection

**Server-side hardening:**

```
# SSH key auth only
sudo sed -i \
  's/#PasswordAuthentication yes/PasswordAuthentication no/' \
  /etc/ssh/sshd_config
sudo systemctl restart sshd

# fail2ban
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban

# Automatic security updates
sudo apt-get install -y unattended-upgrades
```

### Comparison with Local Machines

On local machines, "giving AI your password" is a legitimate concern — the machine password grants access to everything.

GCE eliminates the password concept entirely:
- SSH uses **key authentication only**
- Service access controlled via **IAM roles**
- API keys stored encrypted in **Secret Manager**
- All operations produce **audit logs**

## AI Proficiency with GCP as an Advantage

AI models running OpenClaw (Claude, etc.) have been trained extensively on GCP documentation:

- "Add a firewall rule" → produces the correct `gcloud` command
- "Check fail2ban config" → suggests appropriate settings
- "Disk space concern" → guides monitoring setup

On local environments, every issue requires manual research. On GCE, **the AI agent can accurately maintain its own infrastructure**.

## Practical Capabilities

A 24/7 AI agent on GCE enables:

- **Scheduled reports**: Morning exchange rates, SEO rank checks, GA4 reports
- **Social media management**: Automated X posting, liking, reply monitoring
- **Emergency response**: Earthquake alert verification, server outage detection
- **Research**: Web search, document analysis, competitor research
- **Smart home integration**: Lighting/HVAC control via Nature Remo API

All running with enterprise security at minimal cost.

## Google Ecosystem Integration

A major advantage of GCE: **Google API authentication becomes trivially easy**.

External servers require downloading service account key files, setting environment variables, periodic rotation — authentication management overhead.

On GCE, attach a service account to the VM. Call `google-auth` from code, and credentials are automatically available. No key file management.

In practice, this enables GA4 data retrieval via Analytics Data API with service accounts, generating daily access reports automatically. BigQuery, Cloud Storage, Vertex AI — for Google service integration, being inside GCE is the smoothest path.

## AI-Driven Security Diagnostics

Coding models like GPT 5.3-codex can read server configuration files and diagnose issues — firewall rule gaps, SSH misconfigurations, unnecessary open ports. AI comprehensively checks what humans often overlook.

GCP's security infrastructure × AI diagnostic capability. A powerful combination.

## Instance Copying for Environment Portability

Another GCE advantage: **agent environment portability**.

Once a well-balanced agent team (skill configuration, tool integration, memory structure) is built, image the instance and copy it. Transfer the same environment to another person or replicate across teams.

Physical machines require hours to reproduce environments. GCE takes minutes.

## Summary

Five benefits of running OpenClaw on GCE:

1. **Stable 24/7 operation** — Power and networking managed by Google
2. **Enterprise security** — IAM, VPC, audit logs as standard
3. **Google ecosystem** — Easy API auth, natural integration with GA4, BigQuery, Vertex AI
4. **AI self-management** — Models proficient with GCP can maintain their own infrastructure
5. **Portability** — Instance copying for full environment replication and transfer
