---
layout: post
title: "ドキュメント＝プロダクト化 — docs が公開ブログ・API・自動デプロイを担う設計"
date: 2026-03-01 11:00:00 +0000
categories: [architecture, blog, devops]
tags: [jekyll, github-pages, api, automation, docs]
image: /assets/images/docs-as-product/hero.png
description: "docsディレクトリが単なる説明文書を超えて、公開ブログ・データAPI・自動デプロイパイプラインまで担う設計の考え方と実装を解説。"
---

## 「docs はおまけ」という時代の終わり

ほとんどのリポジトリで `docs/` は後回しだ。コードが完成してから「README書かないと」となる。

でも、`docs/` の設計を最初から考えると、**ドキュメントそのものがプロダクトになる**。

このブログ（`furoku/furoku`）はその実例だ。`docs/` ディレクトリひとつが：

- ✅ 公開ブログ（Jekyll + GitHub Pages）
- ✅ 記事データ API（`/api/articles.json`）
- ✅ AI向け情報ファイル（`llm.txt`、`mcp.json`）
- ✅ 自動デプロイパイプライン（GitHub Actions）

…をすべて担っている。

## アーキテクチャ全体像

```
furoku/furoku リポジトリ
├── docs/
│   ├── _posts/          ← 記事Markdown（コンテンツ層）
│   ├── _layouts/        ← HTMLテンプレート（表示層）
│   ├── assets/          ← CSS・画像（スタイル層）
│   ├── api/             ← JSON API（データ層）
│   │   ├── articles.json
│   │   ├── articles-full.json
│   │   └── meta.json
│   ├── .well-known/
│   │   └── mcp.json     ← MCPサーバー情報
│   ├── llm.txt          ← AI向けサイト説明
│   └── _config.yml      ← Jekyll設定
└── .github/
    └── workflows/
        └── pages.yml    ← 自動デプロイ
```

`main` ブランチにpushするだけで、GitHub Actions が Jekyll ビルドを走らせ、GitHub Pages に自動デプロイされる。

## 各レイヤーの役割

### コンテンツ層（`_posts/`）

Markdownで書いた記事が、ビルド時に：
- HTMLページ（人間向け）
- JSON API のエントリ（プログラム向け）

の両方に変換される。**一度書けば二役こなす**。

### データ層（`api/`）

Liquid テンプレートを使って、ビルド時に全記事のメタデータをJSONとして出力する。

```liquid
[{% for post in site.posts %}
{"title":"{{ post.title | escape }}",
 "url":"{{ post.url | prepend: site.url }}",
 "date":"{{ post.date | date_to_xmlschema }}",
 "tags":{{ post.tags | jsonify }}}
{% unless forloop.last %},{% endunless %}
{% endfor %}]
```

これにより `https://furoku.github.io/furoku/api/articles.json` が常に最新状態で公開される。

### AI層（`llm.txt`、`mcp.json`）

- `llm.txt`：LLMがサイトの概要を掴むためのテキストファイル
- `.well-known/mcp.json`：MCPサーバーとしての接続情報

AIエージェントがこのブログを「情報源」として使えるようにするためのインターフェース。

### デプロイ層（GitHub Actions）

```yaml
on:
  push:
    branches: ["main"]

jobs:
  build:
    steps:
      - uses: actions/jekyll-build-pages@v1
        with:
          source: ./docs
  deploy:
    uses: actions/deploy-pages@v4
```

`docs/` に変更をpushするだけで、自動的にビルド＆デプロイが走る。手動操作ゼロ。

## この設計の強み

**1. 運用コストがほぼゼロ**  
GitHub Pages は無料。GitHub Actions も月2000分まで無料。記事を書いてpushするだけ。

**2. データが鮮度を保つ**  
JSONはビルドのたびに再生成されるので、記事を追加すればAPIも自動更新。

**3. AIエージェントと相性が良い**  
このブログ自体をAIエージェント（yu-chan）が管理している。記事生成・hero画像生成・git push まで自動化できる。

**4. 拡張しやすい**  
新しい出力形式（RSS、CSV、OPML…）を追加したければ、Liquidテンプレートを一つ追加するだけ。

## まとめ

`docs/` を「説明を置く場所」ではなく、**プロダクトの一部として設計する**と世界が変わる。

- コンテンツはMarkdownで管理
- ビルド時にHTML・JSONに変換
- AI向けファイルを用意してエコシステムに参加
- GitHub Actionsで自動デプロイ

このスタックはシンプルだけど強力で、AIエージェントが自律的に更新・管理できる構造になっている。**docsがプロダクトになると、AIとの共同運用が自然にフィットする**。
