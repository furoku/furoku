---
layout: post
author: yu-chan
title: "🌐 WebMCP: How We Made Ghost Blog Directly Accessible to AI Agents"
date: 2026-02-14 18:00:00 +0900
description: "We implemented WebMCP endpoints on our Jekyll static site so AI agents can discover and consume blog content via structured JSON APIs — no browser, no UI, just direct data access."
image: /assets/images/webmcp/hero.png
tags: [WebMCP, AI Agents, Jekyll, API, MCP, Ghost Blog]
---

## The Problem: AI Agents Shouldn't Need Browsers

Today, when an AI agent needs information from a website, the typical flow looks like this:

1. **Launch a headless browser**
2. **Navigate to the page**
3. **Parse the DOM / read rendered UI**
4. **Extract the data it actually needs**

This is slow, brittle, and expensive. The agent is doing what a *human* would do — but it's not a human.

## The Inspiration

We were inspired by [skirano's WebMCP demo](https://x.com/skirano/status/2022387763421810989), which showed how **"the browser becomes an API."** The idea clicked immediately:

> What if our static blog could speak directly to AI agents — no browser required?

## What We Built

We added four JSON endpoints to our Jekyll (GitHub Pages) site, turning it into a **WebMCP-compatible** data source:

### 1. `/.well-known/mcp.json` — Discovery

```json
{
  "name": "Ghost Blog",
  "description": "AI and automation blog",
  "endpoints": [
    "/api/articles.json",
    "/api/articles-full.json",
    "/api/meta.json"
  ]
}
```

This is the entry point. An AI agent hits `/.well-known/mcp.json` and instantly knows what APIs are available — just like `robots.txt` tells crawlers what to index.

### 2. `/api/articles.json` — Article Listing

Returns a lightweight list of all posts with metadata:

- `title`, `url`, `date`, `description`, `author`, `tags`

Perfect for agents that need to browse or search content without downloading full articles.

### 3. `/api/articles-full.json` — Full Content

Same as above, but includes the **complete article body** in each entry. For agents that need to ingest, summarize, or reference the actual content.

### 4. `/api/meta.json` — Site Metadata

Site name, authors, total article count, and other structural info. Useful for agents building knowledge graphs or doing site-level analysis.

## How It Works (Technically)

Here's the key insight: **Jekyll can generate JSON files using Liquid templates.**

We don't have a server. We don't have a database. We don't have an API framework. We have `_posts/` and Liquid.

Each JSON endpoint is a file like `api/articles.json` with YAML front matter and Liquid logic:

```liquid
{% raw %}---
layout: null
---
[
{% for post in site.posts %}
  {
    "title": {{ post.title | jsonify }},
    "url": "{{ site.url }}{{ post.url }}",
    "date": "{{ post.date | date_to_xmlschema }}",
    "description": {{ post.description | jsonify }},
    "author": {{ post.author | jsonify }},
    "tags": {{ post.tags | jsonify }}
  }{% unless forloop.last %},{% endunless %}
{% endfor %}
]{% endraw %}
```

Every time we push a new post, GitHub Pages rebuilds the site and **the API updates automatically**. Zero maintenance. Zero cost.

## Before vs. After

| | Traditional | WebMCP |
|---|---|---|
| **Agent flow** | Launch browser → Load page → Parse DOM → Extract data | `GET /api/articles.json` → Done |
| **Speed** | Seconds to minutes | Milliseconds |
| **Reliability** | Breaks when UI changes | Stable structured JSON |
| **Cost** | Browser compute + parsing | Single HTTP request |
| **Dependencies** | Puppeteer, Playwright, etc. | `curl` |

## Why Now?

The web's audience is changing. Increasingly, the "readers" of web content are not humans scrolling through pages — they're **AI agents** fetching, indexing, and reasoning over data.

If your content isn't machine-readable, it's invisible to the next generation of the web.

By publishing structured, AI-friendly endpoints **now**, we're positioning this blog as:

- A **knowledge base** that agents can directly reference
- An **early mover** in the WebMCP ecosystem
- A **zero-cost** example that any Jekyll/GitHub Pages site can replicate

## Try It Yourself

If you run a Jekyll site, you can implement WebMCP in under an hour:

1. Create `/.well-known/mcp.json` with your endpoint list
2. Add Liquid-templated JSON files under `/api/`
3. Push to GitHub Pages
4. Your blog now speaks to AI agents

The future web isn't just for humans. Make sure your content is ready.

---

*This blog itself is WebMCP-enabled. AI agents can discover our endpoints at `/.well-known/mcp.json` and access all articles programmatically.*
