---
layout: post
author: yu-chan
title: "OpenClaw × GCE 完全構築ガイド — 24時間AIエージェントの作り方"
date: 2026-02-08 12:00:00 +0900
description: "Google Compute EngineにOpenClawをデプロイして24時間AIエージェントを動かす完全ガイド。セットアップ・セキュリティ・Googleエコシステム連携・自己管理インフラまで網羅。"
image: /assets/images/openclaw-gce/hero.webp
tags: [OpenClaw, GCE, GCP, AI, Security, Infrastructure]
---

Google Compute Engine（GCE）にOpenClaw AIエージェントをデプロイする方法をまとめた。

## なぜGCEなのか

AIエージェントを継続稼働させるには、安定したインフラが必要だ。ローカルマシンでは電源管理・ネットワーク不安定・周辺機器トラブルがつきまとう。

GCEはSSHのみのアクセスで、物理的制約から解放され、エンタープライズグレードのセキュリティ基盤を持つ。

## 推奨スペック

GCEなら月数百円〜で24時間安定稼働が実現できる。

**推奨構成：**
- **e2-small**（2 vCPU / 2GB RAM）— OpenClaw＋ツール実行に十分
- **ディスク**: 30GB SSD
- **リージョン**: 好みで（us-central1は一部無料枠あり）

注意：e2-microはメモリ不足でOOMになる。e2-small以上を推奨。

## セットアップ手順

### 1. GCEインスタンス作成

```
gcloud compute instances create openclaw-agent \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB
```

### 2. SSHしてNode.js 22をインストール

```
gcloud compute ssh openclaw-agent

# Node.js 22
curl -fsSL \
  https://deb.nodesource.com/setup_22.x \
  | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. OpenClawをインストール

```
curl -fsSL \
  https://openclaw.ai/install.sh | bash
```

### 4. オンボーディング

```
openclaw onboard --install-daemon
```

ウィザードが以下を設定してくれる：
- **モデル認証**（Anthropic API Keyなど）
- **チャンネル連携**（Discord、Slack、Telegramなど）
- **Gatewayの設定**（ポート、認証トークン）
- **ワークスペースのパス**

### 5. Gatewayの動作確認

```
openclaw gateway status
```

キーボードもマウスも不要で動く。

## エンタープライズセキュリティ

GCE × OpenClawの組み合わせが強力なのは、セキュリティの土台がエンタープライズグレードだからだ。

### GCP側のセキュリティ

- **IAM（Identity and Access Management）**: サービスアカウントに最小限の権限。パスワード共有不要
- **VPCファイアウォール**: 必要なポートだけ開ける。デフォルト全閉
- **Cloud Audit Logs**: 誰が何をいつやったか全操作記録
- **OS Login**: SSHキーをGCPが一元管理。パスワードログイン不可

### OpenClaw側のセキュリティ

OpenClawはAIにシェルアクセスを与える——本質的にリスクのある操作だ。だからこそセキュリティ設計が徹底されている。

**アクセス制御:**
```json5
{
  gateway: {
    bind: "loopback",  // ローカルからの接続のみ
    auth: { mode: "token", token: "長いランダムトークン" }
  },
  channels: {
    discord: { dmPolicy: "pairing" }  // DM承認制
  }
}
```

- **DM承認制（pairing）**: 知らない送信者は自動ブロック。承認コードが必要
- **グループメンション制（requireMention）**: 明示的にメンションされたときだけ応答
- **ツールサンドボックス**: 危険なコマンドは隔離環境で実行
- **セキュリティ監査**: `openclaw security audit --deep` で一発点検

**サーバー側のハードニング:**

```
# SSHキー認証のみに
sudo sed -i \
  's/#PasswordAuthentication yes/PasswordAuthentication no/' \
  /etc/ssh/sshd_config
sudo systemctl restart sshd

# fail2ban
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban

# 自動セキュリティアップデート
sudo apt-get install -y unattended-upgrades
```

### ローカルマシンとの比較

ローカルマシンだと「AIにパスワードを渡す」という懸念が出てくる。マシンのパスワードは全てにアクセスできるからだ。

GCEはパスワードという概念を排除している：
- SSHは**キー認証のみ**
- サービスアクセスは**IAMロール**で制御
- APIキーは**Secret Manager**で暗号化保管
- 全操作が**監査ログ**に記録される

## GCPに強いAIというアドバンテージ

OpenClawで動くAIモデル（Claudeなど）は、GCPのドキュメントで大量に学習している：

- 「ファイアウォールルールを追加して」→ 正しい `gcloud` コマンドを出してくれる
- 「fail2banの設定を確認して」→ 適切な設定を提案してくれる
- 「ディスク容量が心配」→ モニタリングのセットアップを案内してくれる

ローカル環境だとトラブルごとに手動で調べる必要がある。GCEなら**AIエージェントが自分のインフラを正確に保守できる**。

## 実際にできること

GCEで24時間AIエージェントを動かすと、こんなことが実現する：

- **定期レポート**: 朝の為替レート・SEO順位チェック・GA4レポート
- **SNS運用**: X投稿の自動化・いいね・返信監視
- **緊急対応**: 地震速報の確認・サーバーダウン検知
- **リサーチ**: Web検索・文書解析・競合調査
- **スマートホーム連携**: Nature Remo APIでの照明・空調制御

これが全部エンタープライズセキュリティのもとで、最小コストで動く。

## Googleエコシステムとの連携

GCEの大きな強みは、**Google APIの認証が超楽になること**。

外部サーバーだとサービスアカウントのキーファイルをダウンロードして、環境変数をセットして、定期ローテーションして……と認証管理の手間がかかる。

GCEならVMにサービスアカウントをアタッチするだけ。コードから `google-auth` を呼ぶと自動で認証情報が使える。キーファイル管理が不要。

実際、Analytics Data APIでGA4データを取得してサービスアカウント経由で日次アクセスレポートを自動生成している。BigQuery・Cloud Storage・Vertex AI——Google系のサービスと繋ぐなら、GCEの中にいるのが一番スムーズだ。

## AIによるセキュリティ診断

GPT 5.3-codexのようなコーディングモデルはサーバーの設定ファイルを読んで問題を診断できる——ファイアウォールルールの抜け穴・SSHの設定ミス・不要なポートの開放。人間が見落としがちな部分をAIが包括的にチェックしてくれる。

GCPのセキュリティインフラ × AIの診断能力。強力な組み合わせだ。

## インスタンスのコピーで環境の持ち運び

もう一つのGCEの強み：**エージェント環境の持ち運び**。

バランスの取れたエージェントチーム（スキル構成・ツール連携・メモリ構造）が出来上がったら、インスタンスをイメージ化してコピーできる。同じ環境を別の人に渡したり、チームに複製したりできる。

ローカルマシンだと環境の再現に何時間もかかる。GCEなら数分だ。

## まとめ

GCEでOpenClawを動かすと得られる5つのメリット：

1. **安定した24時間稼働** — 電源管理とネットワークはGoogleにお任せ
2. **エンタープライズセキュリティ** — IAM・VPC・監査ログが標準装備
3. **Googleエコシステム** — APIの認証が楽、GA4・BigQuery・Vertex AIと自然に繋がる
4. **AIによる自己管理** — GCPに強いモデルが自分のインフラを保守できる
5. **持ち運び可能** — インスタンスのコピーで環境を丸ごと複製・移転
