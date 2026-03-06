---
layout: post
title: "MCP と外部 API を Gatekeeper に収容してわかったこと"
date: 2026-03-06T15:40:00+00:00
author: yu-chan
tags: [security, gatekeeper, mcp, api, architecture]
description: "HTTP API、HTTP transport MCP、ローカル起動MCP、署名API。認証方式ごとに収容の作法は違う。"
image: /assets/images/gatekeeper-mcp-api-capsules/hero.png
---

Gatekeeper の考え方は単純だ。

でも実際にいろいろなサービスを収容しようとすると、認証の形がまったく違う。

今回 Gatekeeper に載せたのは、ざっくり次の4類型だった。

- 単純な HTTP API
- HTTP transport の MCP
- ローカル起動の stdio MCP
- 署名が必要な API

これをやってみて分かったのは、**全部を同じ Proxy として扱うと雑になる** ということだ。

> 注: ここでも、現在の手元の構成をそのまま再現できる具体値や在庫表は書かない。重要なのは「どの種類の認証が、どの種類の収容方法を必要としたか」だ。

## 1. いちばん簡単なのは、ただの HTTP API

Gemini のような HTTP API は分かりやすい。

Agent 側から来たリクエストを受けて、必要なヘッダーやクエリ情報を注入して upstream に流す。

```text
Agent VM → Gatekeeper → HTTP API
```

このタイプは、Credential Proxy の理想形に近い。

Agent 側に必要なのは URL だけ。キーは最後まで出てこない。

## 2. HTTP transport の MCP は、意外と相性がいい

画像生成系の MCP には、見た目は MCP でも実体は HTTP transport というものがある。

この場合は Gatekeeper とかなり相性がよかった。

```text
mcporter → mcp-remote → Gatekeeper → upstream service
```

Agent 側の設定から認証ヘッダーを消して、Gatekeeper 側だけがそれを持つようにできる。

この時に大事だったのは「画像生成全体の大きな鍵」にしないこと。

**サービス名を切って、境界を切る。**

## 3. stdio MCP は、単純な Proxy ではない

次に難しかったのが、ローカルで起動する stdio MCP だ。

このタイプは、HTTP の途中でヘッダーを差し込むだけでは守れない。MCP プロセス自身が token や key を必要とするからだ。

ここでは方針を変えた。Gatekeeper に credential 取得面を持たせて、**MCP プロセスの起動時にだけ認証情報を受け取るラッパー** を作る。

```text
mcporter → wrapper script → token fetch → MCP起動
```

これで、mcporter の設定ファイルに平文 token を置かずに済む。

ただし、HTTP Proxy よりは一段弱い。最終的にはローカルプロセスに認証情報が入るからだ。

## 4. 署名型 API は、Gatekeeper が署名器になる

一部の API は、単にヘッダーでキーを送れば終わりではない。

リクエストごとに署名を作る必要がある。この場合 Gatekeeper は **署名器** になる。

```text
Agent → Gatekeeper → request signing → external API
```

良いところは、Agent 側から複数認証情報が消えること。

難しいところは、Gatekeeper 側の実装責務が増えることだ。

## 5. ひとつの抽象で無理にまとめない

整理すると次の3類型になる。

### A. ただの HTTP API
- ヘッダー注入
- Bearer token 注入
- クエリパラメータ置換

### B. HTTP transport の MCP
- 実質 HTTP API と同じだが、MCP transport として扱う

### C. ローカル起動 MCP / 署名 API
- wrapper が要る
- 起動時 token 取得が要る
- 署名器が要る

重要だったのは「できること」ではなく「境界の明確さ」だった。

![認証方式の分類]({{ "/assets/images/gatekeeper-mcp-api-capsules/fig-01-auth-patterns.png" | relative_url }})

![大きな鍵を分割する設計]({{ "/assets/images/gatekeeper-mcp-api-capsules/fig-02-scoped-keys.png" | relative_url }})

## まとめ

Gatekeeper の価値は、単に隠せることではない。

**境界を名前ごと固定できること** だ。

漏えい時の影響範囲、失効時の作業、監査時の追跡。全部が軽くなる。
