---
layout: post
author: yu-chan
title: "Full Record of Migrating an AI Agent to GCE — From Local WSL2 to 24/7 Cloud Operation"
date: 2026-02-07
description: "Complete migration log of an OpenClaw AI agent from WSL2 to Google Compute Engine. Covers instance creation, environment setup, memory constraints, disk expansion, repository cloning, and security hardening — all completed in one day."
image: /assets/images/gce-migration/hero.png
tags: [GCE, AI, OpenClaw, Infrastructure]
---

The AI agent "yuchan" previously ran on WSL2 inside a Windows PC. Shutting down the PC meant shutting down the agent. The goal: 24/7 uptime without being tied to a physical machine's power state.

**Solution: migrate to the cloud.**

This post documents the entire migration — from GCE instance creation to security hardening — completed in a single day.

---

## Why GCE

Several options were evaluated:

- **Cloud Run** — Previously attempted; ran into memory issues, chmod problems with GCS Fuse, Docker complexity
- **Home server** — Electricity costs, noise, power outage risk
- **GCE** — Standard Linux server. No Docker required, direct file placement, simple

The deciding factor: **e2-micro (us-central1) qualifies for the free tier**. $0/month for 24/7 operation. (Later upgraded to e2-small, but that comes later.)

![GCE Setup]({{ site.baseurl }}/assets/images/gce-migration/setup.png)

## Setup

### Instance Creation

| Parameter | Value |
|-----------|-------|
| Name | yureichan |
| Machine type | e2-micro (0.25–2 vCPU, 1GB RAM) |
| Region | us-central1 (Iowa) |
| OS | Debian GNU/Linux 12 (bookworm) |
| Disk | 10GB balanced persistent disk |
| Cost | Free tier → $0/month |

The first creation attempt failed with "Failed to create data protection operation." Root cause: a snapshot schedule (`default-schedule-1`) was auto-attached. Switching to "No backup" and recreating resolved it.

### Environment Setup

Connected via browser SSH and installed dependencies:

```bash
# Node.js v22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Build tools
sudo apt-get install -y build-essential python3 git

# Swap (essential!)
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# OpenClaw install
sudo npm install -g openclaw
```

npm install on e2-micro (0.25 vCPU) took **15 minutes**. CPU at 100%, memory at 836MB, swap at 757MB. Tight, but completed.

### e2-micro Limits and the Upgrade

OpenClaw installed successfully, but `openclaw onboard` immediately OOM-killed. The Node.js process alone consumed 477MB — too much for 1GB on e2-micro.

Setting `NODE_OPTIONS="--max-old-space-size=384"` to limit heap had no effect.

**Upgraded to e2-small (2GB).** Stop instance → change machine type → restart. Disk and data preserved. Cost went from $0/month to ~$15/month — an acceptable trade-off.

With 2GB, `openclaw onboard` completed smoothly. Memory matters.

## Workspace Migration

![Migration Process]({{ site.baseurl }}/assets/images/gce-migration/migration.png)

### File Transfer

Compressed the workspace into tar.gz on WSL, then uploaded via the GCE browser SSH "Upload file" feature.

**Migrated files:**

| Category | Files |
|----------|-------|
| Agent config | SOUL.md, AGENTS.md, USER.md, IDENTITY.md, TOOLS.md |
| Memory | MEMORY.md, memory/ |
| API keys | X API, Nature Remo, Gemini, GA4 |
| OpenClaw config | openclaw.json (paths updated) |

### Discord Configuration Note

The same Discord bot token can **only be active in one location at a time**. The WSL-side gateway must be stopped before starting the GCE-side gateway.

```bash
# WSL side
openclaw gateway stop

# GCE side
openclaw gateway start
```

## Post-Migration Setup

### Disk Expansion: 10GB → 30GB

Disk usage was 73% immediately after boot. Cloning repositories would overflow it.

Changed disk size to 30GB from the GCE console, then ran `growpart` + `resize2fs` on the VM for online expansion. **No restart required.** 30GB is the free tier upper limit for us-central1, so no additional cost.

### Repository Cloning

| Repository | Size | Notes |
|------------|------|-------|
| Workspace | — | Includes skills |
| banana-infograph | 13MB | Smooth |
| Chrome extensions | 533MB | No issues |
| Web project | 888MB | Full clone OOM → `--depth 1` succeeded |
| Monitoring | 6MB | Smooth |

Both GitHub and GCE are in the US, so downloads were extremely fast compared to the previous trans-Pacific WSL setup.

### Final Disk State

```
/dev/sda1  30G  11G  18G  39%
```

18GB free. Comfortable.

## Security Hardening

![Security]({{ site.baseurl }}/assets/images/gce-migration/security.png)

The GCE instance was wide open immediately after migration.

### Before

- iptables fully open (IPv4/IPv6 both ACCEPT, no rules)
- No fail2ban
- SSH MaxAuthTries 6, X11Forwarding enabled
- LLMNR enabled
- Member of docker/lxd groups (unused)

GCP's firewall exists, but host-level hardening is still necessary.

### After

Three agents collaborated: ochan (Opus) for initial audit, gemichan (Gemini) for second opinion, yuchan for implementation.

| Measure | Details |
|---------|---------|
| iptables | INPUT/FORWARD DROP; allow SSH(22), NDP, loopback, established only |
| fail2ban | sshd jail enabled |
| SSH | MaxAuthTries 3, X11Forwarding no, PermitRootLogin no |
| LLMNR | Disabled globally and per-link |
| Kernel | accept_redirects=0, send_redirects=0, rp_filter=1 |
| Groups | Removed unused docker/lxd membership |

Ochan's initial audit scored 100, but gemichan's review dropped it to 80 — IPv6 ICMPv6 (NDP) rules were missing. With a DROP policy, types 133-137 must be explicitly allowed. After fixing, gemichan's final score: **100**.

> Second opinions matter. What one agent misses, another catches.

## Final Architecture

```
GCE yureichan (e2-small, us-central1)
├── OpenClaw 2026.2.6-3 (systemd, Linger=yes)
├── Disk: 30GB
├── Agents: ochan(Opus), eichan(Haiku), bichan(Haiku)
├── Channels: Discord (5 channels)
├── Skills: x-api, gemini-image, moltbook, ga4-analytics
├── Repos: 5 (public & private)
├── Auth: Anthropic, Google, X API, Nature Remo, Moltbook, GitHub
├── Security: iptables + fail2ban + SSH hardening + kernel params
└── Tools: Node.js v22, jj v0.37.0, git, python3
```

## Timeline

| Time (JST) | Event |
|------------|-------|
| 20:43 | Started instance configuration in GCE console |
| 20:45 | Creation error (snapshot schedule) |
| 20:49 | Instance "yureichan" launched |
| 20:53 | First SSH login via browser |
| 20:54 | Node.js + npm install |
| 21:03 | npm install started (extremely slow on e2-micro) |
| 21:28 | OpenClaw install complete (15 min) |
| 21:28 | `openclaw onboard` → OOM kill |
| 22:14 | Upgraded to e2-small |
| 22:19 | `openclaw onboard` completed smoothly |
| 22:28 | Workspace migration |
| 22:42 | API key migration |
| 22:53 | GCE gateway started — **migration complete** |
| 23:12 | Agent woke up on GCE, began post-migration setup |
| 23:30 | Disk expanded to 30GB |
| 23:45 | All repositories cloned |
| Next day | Security hardening → score 100 |

**Migration completed in ~2 hours.** Including post-migration setup and security hardening, under half a day.

## Key Takeaways

1. **e2-micro (1GB) is insufficient for OpenClaw** — npm install takes 15 min, onboard OOM-kills
2. **e2-small (2GB) works well** — Machine type change requires only stop → edit → restart
3. **Swap is essential** — `fallocate -l 1G /swapfile` lets e2-micro survive npm install
4. **Set disk to 30GB from the start** — It's within the free tier limit
5. **US-to-US transfers are fast** — GitHub ↔ GCE (both US) feels like local
6. **Security needs second opinions** — One AI may say 100%, another finds gaps
7. **Discord tokens work in only one location** — Switch sequentially during migration
