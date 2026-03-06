# Gatekeeper 続編3本 画像生成プロンプト（Nano Banana 2 / 日本語）

以下のファイル名で保存してください。保存先を間違えないように、各記事の画像ディレクトリに分けています。

---

## 1) gatekeeper-proxy-not-enough

保存先:
- `docs/assets/images/gatekeeper-proxy-not-enough/hero.webp`
- `docs/assets/images/gatekeeper-proxy-not-enough/fig-01-architecture.webp`
- `docs/assets/images/gatekeeper-proxy-not-enough/fig-02-layered-defense.webp`

### hero.webp
```text
日本語技術ブログのヒーロー背景画像。テーマは「Gatekeeperを作ってわかった——プロキシだけでは足りない」。美しい自然風景、朝の光、静かな湖と山の重なり、やわらかい霧、落ち着いた青灰色トーン。文字を載せるため余白を広く確保。人物なし、ロゴなし、画像内テキストなし、16:9。
```

### fig-01-architecture.webp
```text
白背景のミニマルな技術図。日本語ラベルのみ。3つの箱を横並びで配置：「Agent VM」「Gatekeeper」「外部API」。矢印1「シークレットなしリクエスト」、矢印2「認証情報を注入して転送」、戻り矢印「レスポンス」。ロゴなし、実在ホスト名なし、実在IPなし、16:9。
```

### fig-02-layered-defense.webp
```text
白背景の技術アーキテクチャ図。日本語ラベルのみ。3層防御を階層表示：「1. Proxy面/Admin面の分離」「2. Admin面の認証」「3. ネットワーク制御」。許可経路は緑チェック、遮断経路は赤バツで表示。ロゴなし、実ポートなし、実在ホスト名なし、16:9。
```

---

## 2) gatekeeper-mcp-api-capsules

保存先:
- `docs/assets/images/gatekeeper-mcp-api-capsules/hero.webp`
- `docs/assets/images/gatekeeper-mcp-api-capsules/fig-01-auth-patterns.webp`
- `docs/assets/images/gatekeeper-mcp-api-capsules/fig-02-scoped-keys.webp`

### hero.webp
```text
日本語技術ブログのヒーロー背景画像。テーマは「MCPと外部APIをGatekeeperに収容してわかったこと」。美しい自然、複数の流れが合流する川、黄金色の夕方の光、静けさと構造感。タイトル用の余白を大きく確保。人物なし、ロゴなし、画像内テキストなし、16:9。
```

### fig-01-auth-patterns.webp
```text
白背景の編集風ミニマル図。日本語ラベルのみ。縦3カラムで「HTTP API」「HTTP transport MCP」「ローカルstdio MCP / 署名API」。各カラムに認証の扱いを矢印で表示（ヘッダー注入、MCP中継、起動時取得/署名）。ロゴなし、実在名なし、16:9。
```

### fig-02-scoped-keys.webp
```text
白背景の概念図。日本語ラベルのみ。左に「大きな鍵（広すぎる権限）」1つ、右に「用途別の小さな鍵（画像・分析・LLM・ツール）」複数。左は多方面へ拡散矢印、右は1対1接続。スコープ分割の安全性が直感でわかる構図。ロゴなし、16:9。
```

---

## 3) gatekeeper-what-still-remains

保存先:
- `docs/assets/images/gatekeeper-what-still-remains/hero.webp`
- `docs/assets/images/gatekeeper-what-still-remains/fig-01-movable-vs-residual.webp`
- `docs/assets/images/gatekeeper-what-still-remains/fig-02-cleanup-sweep.webp`

### hero.webp
```text
日本語技術ブログのヒーロー背景画像。テーマは「それでも残るシークレットと、どこまで消せるのか」。森の中の光が差す小道、静かな空気、少し緊張感のある美しさ。タイトルを置ける余白を広く。人物なし、ロゴなし、画像内テキストなし、16:9。
```

### fig-01-movable-vs-residual.webp
```text
白背景の比較図。日本語ラベルのみ。左列「移行しやすい認証」、右列「残りやすい認証」。左にAPIキー/Bearer/OAuth署名/MCP認証、右にBotトークン/CLIトークン/ランタイムID/デバイス鍵。落ち着いた配色、読みやすい日本語フォント、16:9。
```

### fig-02-cleanup-sweep.webp
```text
白背景の運用図。日本語ラベルのみ。箱で「現役シークレット」「古い認証」「キャッシュ」「履歴」「バックアップ」を配置。掃除アクションで古い認証・キャッシュ・履歴・バックアップを除去し、最小セットのみ残す。ロゴなし、実ファイル名なし、16:9。
```
