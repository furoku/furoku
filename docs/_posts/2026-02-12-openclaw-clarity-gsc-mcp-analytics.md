---
layout: post
title: "OpenClawにClarity MCPとGSC MCPを追加して、GA4+Clarity+GSCの3本柱でアクセス解析"
date: 2026-02-12 12:00:00 +0900
categories: [AI, Analytics, OpenClaw]
tags: [MCP, Clarity, Google Search Console, GA4, アクセス解析]
image: /assets/images/openclaw-clarity-gsc-mcp-analytics/hero.png
---

OpenClawのアクセス解析環境を大幅に強化しました。GA4だけでなく、Microsoft ClarityとGoogle Search Console（GSC）のMCPサーバーを追加して、3つのデータソースから多角的に分析できる体制が整いました。

## 追加した2つのMCPサーバー

### 1. Microsoft Clarity MCP (`@microsoft/clarity-mcp-server`)

Clarityは無料で使えるヒートマップ・セッション録画ツール。MCPサーバー経由で以下のデータを取得できます：

- **Dead Click / Rage Click**: クリックしても何も起こらない箇所、連打された箇所
- **スクロール深度**: ページのどこまで読まれているか
- **デバイス別エンゲージメント**: PC/スマホでの行動の違い
- **セッション録画**: 実際のユーザー行動を動画で確認

GTMには既にClarityタグ（Tag ID 41）を設定済みだったので、MCPサーバーを追加するだけで分析可能になりました。

### 2. Google Search Console MCP (`mcp-server-gsc`)

GSCは検索パフォーマンスの宝庫。以下のデータを最大25,000行まで取得できます：

- **トップ検索クエリ**: どんなキーワードで見つかっているか
- **ページ別パフォーマンス**: 表示回数、クリック数、CTR、掲載順位
- **CTR改善候補**: 表示は多いのにクリックが少ないページ
- **インデックス状況**: サイトマップ、クロール状況

## セットアップ手順

### mcporterでの追加

```bash
mcporter add clarity
mcporter add gsc
```

これだけで2つのMCPサーバーが追加されます。

### 認証設定

#### Clarityの認証
Clarityはプロジェクトごとの認証。ブラウザで認証フローを完了します。

#### GSCの認証
GA4と同じサービスアカウントを使い回せます：

1. **GCPでSearch Console API有効化**
2. **Search Consoleでサービスアカウントを追加**
   - Search Console → 設定 → ユーザーと権限
   - サービスアカウントのメールアドレスを「オーナー」権限で追加
3. **環境変数設定**（既にGA4用に設定済みなら不要）
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
   ```

これで認証完了。GA4、GSC、Clarityの3つが同じOpenClawインスタンスから使えます。

## GSC導入で見つかったQuick Win

早速GSCデータを確認したところ、すぐに改善できそうなポイントが見つかりました：

### 1. 「banananl」クエリの最適化

- **表示回数**: 193回
- **CTR**: わずか5%
- **掲載順位**: 6.5位

検索結果に表示されているのに、クリックされていない！ メタタイトルに「BananaNL」を明記することで、CTRを大幅に改善できる余地があります。

### 2. 「banana x プロンプトパターン集」の磨き上げ

- **表示回数**: 24回
- **CTR**: 21%（高い！）
- **掲載順位**: 2.8位

既に上位表示されていて、CTRも良好。タイトルタグをさらに最適化することで、掲載1位を狙えるかもしれません。

## cronジョブを3本柱統合分析に拡張

既存の「bananaX Daily GA4 Report」cronジョブを更新して、3つのデータソースを統合分析するように変更しました：

### 変更内容

- **データソース追加**: GA4のみ → GA4 + Clarity + GSC
- **タイムアウト延長**: 300秒 → 420秒（3つのAPIを順次呼ぶため）
- **実行時刻**: 毎朝6時JST（21:00 UTC）

明日の朝から、以下の流れで自動分析が走ります：

1. **GA4**: ページビュー、イベント、コンバージョン
2. **Clarity**: ヒートマップ、デッドクリック、スクロール深度
3. **GSC**: 検索クエリ、CTR、掲載順位

3つのデータを突き合わせることで、「検索で見つかっているのにクリックされない」「クリックされてもすぐ離脱する」といった問題を早期発見できます。

## まとめ

OpenClawにClarity MCPとGSC MCPを追加したことで、アクセス解析が次のレベルに進化しました：

- **GA4**: 「何が起きたか」を数字で把握
- **Clarity**: 「なぜそうなったか」をユーザー行動から理解
- **GSC**: 「どうやって見つかったか」を検索データで分析

3つのデータソースが揃ったことで、データドリブンな改善サイクルを回せる基盤が整いました。明日の朝から、3本柱の統合レポートが届くのが楽しみです！
