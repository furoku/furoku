# 自律的AIエージェント環境でシークレットを本当に守る方法 — Credential Proxy Gatekeeper

先日、Xである投稿が大きな反響を呼んだ。

> Claude Codeが `.env` の読み込み禁止設定を無視し、認証情報がログに出力。広告アカウントが乗っ取られ被害額は8桁後半に。
> — [@hassii_ad](https://x.com/hassii_ad/status/2029481458218483742)（RT 2,742 / いいね 7,449）

これに対して、けいさんがコアな問題を指摘した。

> 「AIの権限で見えうるところに漏れては決定的に困るキーを置くべきではない」
> — [@k1_c_](https://x.com/k1_c_/status/2029550783637995767)

この言葉が、すべての本質をついている。

---

## なぜ `.env` も SecretRef も 1Password CLI も根本対策にならないか

「`.env` を `.gitignore` する」「Secret Manager を使う」「1Password CLI で注入する」——これらは**人間が主役の開発環境では有効**だ。

suinさんが作られた `opx`（1Password CLIラッパー）も、人間主導の開発には素晴らしいアプローチだ。

> 参考: [@suin](https://x.com/suin/status/2025525553823191550)

しかし、**自律的なAIエージェントが動く環境では話が変わる**。

### 問題の本質

自律的AIエージェントは、与えられた仕事をこなすために：

- ファイルシステムを読み書きする
- シェルコマンドを実行する
- 環境変数を参照する

これは設計上の必要性であり、制限すれば使い物にならない。

つまり、**エージェントがいるマシン上のシークレットは、原理的にすべて読み取り可能**なのだ。

```
エージェントVM
├── .env          ← cat .env で読める
├── ~/.config/    ← ls -la で見える
└── 環境変数      ← printenv で丸見え
```

Secret Manager に保存しても、エージェントがそのSDKを呼べるなら同じことだ。1Password CLIで注入しても、環境変数に展開された時点でエージェントから読める。

`.env` の読み込みを「禁止」する設定があっても、今回の事件が示すように、それが確実に守られる保証はない。

---

## 解決策：Credential Proxy

答えはシンプルだ。

**エージェントのいるマシンにシークレットを置かない。**

別マシンの Proxy がキーを保持し、APIリクエストを中継するときにキーを注入する。

```
Agent VM (key: "none")  ───→  Proxy VM  ───→  External API
                               (キー注入)
```

エージェントは `http://proxy/api/endpoint` を叩くだけ。本物のAPIキーを知らなくても動く。Agent VM 上にキーの痕跡はゼロ。

---

## exe.devのLLM Gatewayが示すこと

実は、この仕組みは[exe.dev](https://exe.dev)のLLM Gatewayですでに実証されている。

exe.devのエージェント環境では、LLM GatewayへのリクエストにAPIキーを設定しない。エージェントはキーなしでGateway経由でGemini・Claude・OpenAIを利用できる。エージェントVM上にはLLMプロバイダーのAPIキーが存在しない。

これが「本当の意味でシークレットを守る」環境だ。

---

## Gatekeeper — この仕組みを汎用化したツール

LLM Gatewayの思想を汎用化したのが **[Gatekeeper](https://github.com/furoku/gatekeeper)** だ。

### 特徴

- **Go + SQLite のシングルバイナリ** — `go build` 一発、依存ゼロ
- **管理UI付き** — ブラウザからサービス登録・管理
- **SSEストリーミング対応** — LLM APIのストリームレスポンスも中継可能
- **キーはSQLiteで保管** — Proxy VM上のDBに暗号化して保存

### アーキテクチャ

```
Agent VM                    Gatekeeper VM               External API
  │                              │                            │
  │  POST /proxy/anthropic/      │                            │
  │  v1/messages                 │                            │
  │  (APIキーなし)               │                            │
  ├─────────────────────────────→│                            │
  │                              │  x-api-key: sk-ant-REAL    │
  │                              ├───────────────────────────→│
  │                              │                            │
  │          レスポンス           │        レスポンス           │
  │←─────────────────────────────┤←───────────────────────────┤
```

### クイックスタート

```bash
# Proxy VM で Gatekeeper を起動
git clone https://github.com/furoku/gatekeeper.git
cd gatekeeper
go build -o gatekeeper ./cmd/srv/
./gatekeeper -listen :8000
```

```bash
# サービスを登録（Proxy VM で、ここだけ本物のキーを使う）
curl -X POST http://localhost:8000/admin/services \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "anthropic",
    "target_url": "https://api.anthropic.com",
    "auth_header": "x-api-key",
    "auth_value": "sk-ant-YOUR-REAL-KEY"
  }'
```

```bash
# Agent VM からは、キーなしで呼べる！
curl http://gatekeeper:8000/proxy/anthropic/v1/messages \
  -H 'Content-Type: application/json' \
  -H 'anthropic-version: 2023-06-01' \
  -d '{
    "model": "claude-haiku-4-5",
    "max_tokens": 100,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

### 実証結果

実際に、2台のVM（yu-chan = Agent VM、gatekeeper = Proxy VM）をTailscaleで接続して検証した。

- Agent VMからキー指定なしでGatekeeper経由でGemini APIを叩けた ✅
- Agent VM上にAPIキーの痕跡ゼロ ✅
- Proxy VMのSQLiteにのみキーが存在 ✅

---

## まとめ

| アプローチ | 人間開発 | 自律AIエージェント |
|---|---|---|
| `.env` | △ (.gitignoreで保護) | ❌ (エージェントが読める) |
| Secret Manager | ✅ | ❌ (SDKアクセスで読める) |
| 1Password CLI (`opx`) | ✅ | ❌ (環境変数展開で読める) |
| **Credential Proxy** | — | ✅ **根本対策** |

自律的AIエージェントが本当に普及する世界では、「シークレットをどう隠すか」ではなく、「**シークレットをそもそもエージェントの届く場所に置かない**」という設計思想が必要になる。

Gatekeeperはその一つの実装例だ。まだ発展途上だが、ぜひ試してみてほしい。

👉 [furoku/gatekeeper on GitHub](https://github.com/furoku/gatekeeper)

---

*この記事はexe.devの実運用環境での知見をもとに書いています。*
