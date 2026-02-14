---
layout: post
title: "Adding Clarity MCP and GSC MCP to OpenClaw — Three-Pillar Analytics with GA4 + Clarity + GSC"
date: 2026-02-12 12:00:00 +0900
categories: [AI, Analytics, OpenClaw]
tags: [MCP, Clarity, Google Search Console, GA4, Analytics]
image: /assets/images/openclaw-clarity-gsc-mcp-analytics/hero.png
---

The OpenClaw analytics environment has been significantly upgraded. Beyond GA4, Microsoft Clarity and Google Search Console (GSC) MCP servers have been added, enabling multi-dimensional analysis from three data sources.

## Two New MCP Servers

### 1. Microsoft Clarity MCP (`@microsoft/clarity-mcp-server`)

Clarity is a free heatmap and session recording tool. Via the MCP server, the following data is accessible:

- **Dead Click / Rage Click**: Locations where clicks produce no response, or where users click repeatedly in frustration
- **Scroll Depth**: How far down the page users read
- **Device-Specific Engagement**: Behavioral differences between desktop and mobile
- **Session Recordings**: Actual user behavior captured as video

The Clarity tag (Tag ID 41) was already configured in GTM, so adding the MCP server immediately enabled analysis.

### 2. Google Search Console MCP (`mcp-server-gsc`)

GSC provides search performance data. Up to 25,000 rows can be retrieved:

- **Top Search Queries**: Keywords driving discovery
- **Page-Level Performance**: Impressions, clicks, CTR, position
- **CTR Improvement Candidates**: High-impression, low-click pages
- **Index Status**: Sitemap and crawl information

## Setup Procedure

### Adding via mcporter

```bash
mcporter add clarity
mcporter add gsc
```

Two MCP servers added with these commands.

### Authentication Configuration

#### Clarity Authentication
Clarity uses per-project authentication. Complete the auth flow in a browser.

#### GSC Authentication
The same service account used for GA4 can be reused:

1. **Enable Search Console API in GCP**
2. **Add the service account in Search Console**
   - Search Console → Settings → Users and permissions
   - Add the service account email with "Owner" permission
3. **Environment variable** (skip if already set for GA4)
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   ```

Authentication complete. GA4, GSC, and Clarity all accessible from the same OpenClaw instance.

## Quick Wins from GSC Integration

Reviewing GSC data immediately revealed actionable improvements:

### 1. "banananl" Query Optimization

- **Impressions**: 193
- **CTR**: Only 5%
- **Position**: 6.5

Appearing in search results but not getting clicked. Adding "BananaNL" explicitly to the meta title could significantly improve CTR.

### 2. "banana x prompt pattern collection" Refinement

- **Impressions**: 24
- **CTR**: 21% (high)
- **Position**: 2.8

Already ranking well with strong CTR. Further title tag optimization could push to position 1.

## Expanding the Cron Job to Three-Pillar Integrated Analysis

The existing "bananaX Daily GA4 Report" cron job was updated to integrate all three data sources:

### Changes

- **Data sources**: GA4 only → GA4 + Clarity + GSC
- **Timeout extension**: 300s → 420s (sequential API calls to three services)
- **Execution time**: 6:00 AM JST daily (21:00 UTC)

Starting the next morning, automated analysis runs in this sequence:

1. **GA4**: Page views, events, conversions
2. **Clarity**: Heatmaps, dead clicks, scroll depth
3. **GSC**: Search queries, CTR, position

Cross-referencing three data sources enables early detection of issues like "appearing in search but not getting clicked" or "getting clicked but immediately bouncing."

## Summary

Adding Clarity MCP and GSC MCP to OpenClaw advances analytics capabilities to the next level:

- **GA4**: Understand "what happened" through metrics
- **Clarity**: Understand "why it happened" through user behavior observation
- **GSC**: Understand "how users found the site" through search data

With three data sources in place, the foundation for a data-driven improvement cycle is complete.
