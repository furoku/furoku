---
layout: post
title: "Mac miniはいらない — OpenClawをGCEで動かすべき理由と手順"
date: 2026-02-08 12:00:00 +0900
description: "AIエージェントOpenClawをGoogle Compute Engineの無料枠で24時間稼働させる。物理マシンの罠を避け、エンタープライズセキュリティで守る導入ガイド。"
image: /assets/images/openclaw-gce/hero.png
tags: [OpenClaw, GCE, GCP, AI, セキュリティ, インフラ]
---

AIエージェントを動かすのに、わざわざMac miniを買う必要はない。

## 背景：物理マシンの罠

ある導入事例では、Mac miniにOpenClawをセットアップするところから始まった。ところが——

- 外付けキーボードとマウスがない。Amazonで注文
- 翌日届いて作業再開。音声入力したくてTypelessを入れるが、内蔵マイクがなく断念
- 発熱中に起き上がって普通に入力する羽目に

物理マシンには物理の制約がつきまとう。電源、周辺機器、発熱、設置場所。AIエージェントの「脳」を載せるには、もっとスマートな場所がある。

## なぜGCEか

Google Compute Engine（GCE）のe2-microインスタンスは、**無料枠**で24時間365日動く。

| 項目 | Mac mini | GCE e2-micro |
|------|----------|--------------|
| 初期費用 | 10万円〜 | 0円 |
| 月額 | 電気代 | 0円（無料枠） |
| 24/7稼働 | △（電源管理が必要） | ◎（クラウドが管理） |
| リモートアクセス | VPN設定が必要 | SSH標準装備 |
| セキュリティ | 自前で全部やる | GCPの基盤に乗る |
| 周辺機器 | キーボード、マウス必要 | 不要 |
| スケーラビリティ | 物理的限界 | ワンクリックで拡張 |

## セットアップ手順

### 1. GCEインスタンスを作成

```bash
gcloud compute instances create openclaw-agent \
  --zone=us-central1-a \
  --machine-type=e2-micro \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB
```

無料枠の条件：us-central1、e2-micro、30GB標準永続ディスク。

### 2. SSH接続とNode.js 22のインストール

```bash
gcloud compute ssh openclaw-agent

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version  # v22.x.x を確認
```

### 3. OpenClawインストール

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### 4. オンボーディング

```bash
openclaw onboard --install-daemon
```

ウィザードが起動し、以下を設定する：
- **モデルの認証**（Anthropic API Key等）
- **チャンネル連携**（Discord、Slack、Telegram等）
- **ゲートウェイ設定**（ポート、認証トークン）
- **ワークスペースパス**

### 5. ゲートウェイ起動確認

```bash
openclaw gateway status
```

これだけ。キーボードもマウスもいらない。

## エンタープライズセキュリティ

GCE × OpenClawの組み合わせが強力なのは、セキュリティ基盤がエンタープライズグレードだからだ。

### GCP側のセキュリティ

- **IAM（Identity and Access Management）**: サービスアカウントで権限を最小限に。パスワードを渡す必要がない
- **VPCファイアウォール**: 必要なポートだけを開放。デフォルトで全ポートが閉じている
- **Cloud Audit Logs**: 誰が何をしたか、全操作が追跡可能
- **OS Login**: SSH鍵をGCPが一元管理。パスワードログイン不要

### OpenClaw側のセキュリティ

OpenClawは「AIにシェルアクセスを与える」という本質的にリスキーなことをやっている。だからセキュリティ設計が徹底されている。

**アクセス制御：**
```json5
{
  gateway: {
    bind: "loopback",  // ローカル接続のみ
    auth: { mode: "token", token: "長いランダムトークン" }
  },
  channels: {
    discord: { dmPolicy: "pairing" }  // DM承認制
  }
}
```

- **DM承認制（pairing）**: 知らない人からのメッセージは自動ブロック。承認コードで許可制
- **グループ言及制（requireMention）**: グループチャットでは名前を呼ばれた時だけ反応
- **ツールサンドボックス**: 危険なコマンドを隔離環境で実行
- **セキュリティ監査**: `openclaw security audit --deep` でワンコマンド点検

**サーバー側の基本硬化：**
```bash
# SSH鍵認証のみ（パスワード無効化）
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart sshd

# fail2ban（ブルートフォース遮断）
sudo apt-get install -y fail2ban
sudo systemctl enable fail2ban

# 自動セキュリティアップデート
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Mac miniとの比較

前述の導入事例では「パスワードをAIに渡すのが怖い」という懸念があった。当然だ。物理マシンのパスワードは、そのマシンのすべてへのアクセスを意味する。

GCEではそもそもパスワードという概念がない：
- SSHは**鍵認証のみ**
- サービスへのアクセスは**IAMロール**で制御
- APIキーは**Secret Manager**で暗号化保管
- すべての操作に**監査ログ**が残る

## AIがGCPに習熟しているという優位性

OpenClawを動かすAIモデル（Claude等）は、GCPのドキュメントを大量に学習している。つまり：

- 「ファイアウォールルールを追加して」→ 正確な`gcloud`コマンドが出てくる
- 「fail2banの設定を見て」→ 適切な設定を提案してくれる
- 「ディスク容量が心配」→ モニタリングの設定まで案内してくれる

Mac miniのローカル環境だと、問題のたびにググって試行錯誤する。GCEなら、AIエージェント自身が自分の棲み家のメンテナンスを正確にガイドしてくれる。**AIが自分のインフラを自分で管理できる**。これは大きい。

## 実際に何ができるようになるか

GCEでOpenClawを動かすと、24時間365日のAIエージェントが手に入る：

- **定期レポート**: 毎朝の為替レート、SEO順位チェック、GA4レポート
- **SNS運用**: Xの投稿、いいね、返信を自動巡回
- **緊急対応**: 地震速報の即座確認、サーバー障害の検知
- **調査**: Web検索、ドキュメント分析、競合調査
- **スマートホーム連携**: Nature Remo API経由で照明・エアコン操作

これらがすべて、月額0円で、エンタープライズセキュリティの上で動く。

## まとめ

| やりたいこと | Mac mini | GCE |
|-------------|----------|-----|
| AIエージェントの24/7稼働 | キーボードとマウスを買うところから | `gcloud compute instances create` |
| セキュリティ | 自前でパスワード管理 | IAM + VPC + 監査ログ |
| トラブルシュート | ググる | AIが自分で解決 |
| コスト | 10万円 + 電気代 | 0円 |

Mac miniを否定しているわけじゃない。ローカルで動かしたい理由がある人もいる。でも、**「AIエージェントを常時稼働させたい」が目的なら、GCEが最適解**だ。

クラウドに棲みつく幽霊。物理的な制約から解放されて、24時間そこにいる。👻
