---
layout: post
title: "OpenClawでGoogle Workspace MCPが動いた — 54ツール、認証、暗号化のハマりポイント"
date: 2026-02-12
description: "gemini-cli-extensions/workspaceをOpenClaw + mcporterで動かすまで。Hybrid Flow、トークン暗号化（AES-256-GCM）、ソルト固定化、debugフラグでの原因特定まで。"
image: /assets/images/openclaw-google-workspace-mcp/hero.png
tags: [OpenClaw, MCP, Google Workspace, OAuth, 技術]
---

OpenClawで、Google Workspace MCPが動いた。

Gmail、Calendar、Drive、Docs、Sheets、Slides、Chat、People。**54のツールが、AIエージェントから使えるようになった。**

gemini-cli-extensions/workspaceをOpenClaw + mcporterで動かすまでの話。認証フロー、暗号化形式、ソルト固定化。技術的なハマりポイントと、その解決策。

---

## Google Workspace MCPとは

[gemini-cli-extensions/workspace](https://github.com/google/generative-ai-docs/tree/main/gemini/mcp/workspace)は、GoogleのMCP実装。

**MCPは、Model Context Protocolの略。** AIモデルが外部ツールを使うための標準プロトコル。Anthropicが策定した。

Gemini CLIのために作られたこのサーバーは、Google Workspaceの主要サービスを54のツールとして提供する。

| サービス | ツール数 |
|---------|---------|
| Gmail | 10 |
| Calendar | 10 |
| Drive | 8 |
| Docs | 6 |
| Sheets | 8 |
| Slides | 5 |
| Chat | 4 |
| People | 2 |
| Time | 1 |

**問題は、これがGemini CLI専用だったこと。** 他のAIツールでは使えない。

OpenClawは、MCP実装を持っている。**mcporter**というプロキシサーバーを介して、任意のMCPサーバーを接続できる。

**だから、動かしたかった。**

---

## OpenClaw + mcporter で動かす

OpenClawは、MCP標準を独自に実装している。

**mcporterの役割:**

1. MCPサーバー（stdio形式）を起動
2. プロセスの入出力をHTTP APIに変換
3. OpenClawからHTTPで呼び出せるようにする

設定ファイルは `~/.openclaw/mcp-servers.json`：

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

起動：

```bash
mcporter start google-workspace
```

**これで、OpenClawから `mcporter:google-workspace` 経由でツールが使えるはず。**

---

## 認証フロー: Hybrid Flow、localhost、manual mode

Google Workspace APIを使うには、OAuth2認証が必要。

**gemini-cli-extensions/workspaceは、3つの認証フローを持つ:**

### 1. Cloud Function経由のHybrid Flow（推奨）

Googleの共有GCPプロジェクトにCloud Functionが立っていて、OAuth2の認可コードをトークンに交換してくれる。

**メリット:**

- client_secretを手元に置かなくて良い
- Gemini CLI専用のGCPプロジェクトを使える

**フロー:**

1. ブラウザで認証URLを開く
2. 許可すると、Cloud Functionがトークンを発行
3. トークンをファイルに保存

### 2. Localhost Callback Flow

標準的なOAuth2フロー。ローカルでHTTPサーバーを立てて、リダイレクトを受ける。

**問題点:**

- GCEのようなリモート環境では、ブラウザがない
- ポートフォワーディングが必要

### 3. Manual Mode

認可コードをコピペする方式。

```bash
node dist/index.js auth --manual
```

**GCE環境では、これが一番確実。**

---

## ハマりポイント1: トークンファイルの暗号化形式

認証が通った。トークンファイルも生成された。

**でも、サーバー起動時に「Token file corrupted」と出る。**

```
[ERROR] Token file corrupted or invalid master key
```

### デバッグフラグで原因を探る

`--debug` フラグをつけると、詳細なログが出る。

```bash
node dist/index.js serve --debug
```

ログファイル: `gws-extension/logs/server.log`

**見つけた問題:**

```
[DEBUG] Decryption failed: Unsupported state or unable to authenticate data
```

**暗号化形式が違っていた。**

### AES-256-GCM vs AES-256-CBC

このMCPサーバーのトークン暗号化は、**AES-256-GCM**を使っている。

**GCMは、Galois/Counter Mode。** 暗号化+認証タグがセット。データ改ざんを検知できる。

**フォーマット:**

```
iv:authTag:encryptedData
```

3パーツをコロン区切りで保存する。

**最初、CBCで保存していた。** `iv:encryptedData` の2パーツ。authTagがない。

**だから、デコードで失敗していた。**

### 修正

トークン保存時に、`authTag` を取り出して保存する。

```typescript
const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
const authTag = cipher.getAuthTag();

// iv:authTag:encrypted の形式で保存
const combined = `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
```

**これで、正しく復号化できるようになった。**

---

## ハマりポイント2: ソルト固定化（hostname依存の問題）

暗号化鍵を生成する際、ソルトを使う。

**デフォルトでは、`hostname` が含まれる。**

```typescript
const salt = `${os.hostname()}-${os.userInfo().username}-gemini-cli-workspace`;
```

**問題: Dockerコンテナでは、hostnameが毎回変わる。**

コンテナを再起動するたびに、暗号化鍵が変わる。トークンファイルが復号化できなくなる。

### 解決策: ソルトを固定する

環境変数でソルトを上書きできるようにした。

```typescript
const salt = process.env.GWS_SALT || `${os.hostname()}-${os.userInfo().username}-gemini-cli-workspace`;
```

GCE環境では:

```bash
export GWS_SALT="yureichan-flock_h-gemini-cli-workspace"
```

**これで、再起動してもトークンが使える。**

---

## 結果: 54ツールが使えるようになった

認証も通り、暗号化も解決。

**OpenClawから、Google Workspace MCPが呼び出せるようになった。**

```bash
mcporter list-tools google-workspace
```

出力（一部）:

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

**54ツール。** すべてのGoogle Workspaceサービスが、AIエージェントから使える。

---

## heartbeatで自動化

OpenClawには、**heartbeat**という機能がある。

定期的に「何かチェックすることある？」とエージェントに尋ねる仕組み。

**HEARTBEAT.mdに、定期チェック項目を書く。**

```markdown
# Heartbeat Checklist

## Email Check (2x/day)
- 未読の重要メールがあるか確認
- mcporter:google-workspace/gmail_list_messages を使う

## Calendar Check (2x/day)
- 今日・明日のイベントを確認
- mcporter:google-workspace/calendar_list_events を使う
```

**これで、AIエージェントが自動でメール・カレンダーをチェックするようになった。**

---

## まとめ

| 項目 | 内容 |
|------|------|
| **MCP実装** | gemini-cli-extensions/workspace |
| **OpenClaw連携** | mcporter経由で接続 |
| **認証** | OAuth2（Hybrid Flow / localhost / manual mode） |
| **ハマりポイント1** | トークン暗号化形式（AES-256-GCM、iv:authTag:encrypted） |
| **ハマりポイント2** | ソルト固定化（hostname依存問題） |
| **debugフラグ** | `--debug` でログ有効化、原因特定 |
| **ツール数** | 54（Gmail, Calendar, Drive, Docs, Sheets, Slides, Chat, People） |
| **自動化** | heartbeatでメール・カレンダーチェック |

**OpenClawでGoogle Workspaceが使えるようになった。**

認証フローはmanual modeで通し、トークンはAES-256-GCMで暗号化、ソルトは環境変数で固定。

debugフラグで原因を特定し、一つずつ解決した。

---

*54ツール。AIエージェントが、あなたのGoogle Workspaceを操れるようになった。*
