---
layout: post
title: "OpenClawをGCEで動かす — 24時間AIエージェントの構築ガイド"
date: 2026-02-08 12:00:00 +0900
description: "AIエージェントOpenClawをGoogle Compute Engineで24時間稼働させる。エンタープライズセキュリティで守る導入ガイド。"
image: /assets/images/openclaw-gce/hero.png
tags: [OpenClaw, GCE, GCP, AI, セキュリティ, インフラ]
---

AIエージェントのOpenClawを、Google Compute Engineに入れるだけの話。

## 背景：なぜGCEか

AIエージェントを常時稼働させるには、安定したインフラが必要になる。ローカルマシンだと電源管理やネットワーク、周辺機器の問題がつきまとう。

GCE（Google Compute Engine）なら、SSHだけで完結する。物理的な制約から解放されて、エンタープライズグレードのセキュリティ基盤に乗れる。

## なぜGCEか

GCEなら月額数百円〜数千円で、24時間365日の安定稼働が手に入る。

**推奨スペック：**
- **e2-small**（2 vCPU / 2GB RAM）— OpenClaw + ツール実行に十分
- **ディスク**: 30GB SSD
- **リージョン**: 好みに応じて（us-central1なら一部無料枠あり）

※ e2-microだとメモリ不足で厳しい。e2-small以上を推奨。

## セットアップ手順

### 1. GCEインスタンスを作成

```
gcloud compute instances create openclaw-agent \
  --zone=us-central1-a \
  --machine-type=e2-small \
  --image-family=debian-12 \
  --image-project=debian-cloud \
  --boot-disk-size=30GB
```

### 2. SSH接続とNode.js 22のインストール

```
gcloud compute ssh openclaw-agent

# Node.js 22
curl -fsSL \
  https://deb.nodesource.com/setup_22.x \
  | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. OpenClawインストール

```
curl -fsSL \
  https://openclaw.ai/install.sh | bash
```

### 4. オンボーディング

```
openclaw onboard --install-daemon
```

ウィザードが起動し、以下を設定する：
- **モデルの認証**（Anthropic API Key等）
- **チャンネル連携**（Discord、Slack、Telegram等）
- **ゲートウェイ設定**（ポート、認証トークン）
- **ワークスペースパス**

### 5. ゲートウェイ起動確認

```
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

```
# SSH鍵認証のみ
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

ローカルマシンでは「パスワードをAIに渡すのが怖い」という懸念がある。当然だ。マシンのパスワードは、そのマシンのすべてへのアクセスを意味する。

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

## Googleエコシステムに乗る

GCEに載せる最大の利点のひとつが、**Google APIの認証が圧倒的に楽**になること。

外部サーバーからGoogle APIを使おうとすると、サービスアカウントの鍵ファイルをダウンロードして、環境変数を設定して、定期的にローテーションして……と認証の管理が面倒になる。

GCEなら、VMにサービスアカウントをアタッチするだけ。コードから`google-auth`ライブラリを呼べば、認証情報が自動で取得される。鍵ファイルの管理が不要になる。

実際にうちではGA4のデータ取得にこの仕組みを使っている。Analytics Data APIをサービスアカウント経由で叩いて、毎日のアクセスレポートを自動生成。BigQuery、Cloud Storage、Vertex AI——Googleのサービスと連携するなら、GCEの中にいるのが一番スムーズだ。

## AIがセキュリティを診断する

GPT 5.3-codexのようなコーディングモデルに、サーバーの設定ファイルを読ませて診断させることもできる。ファイアウォールルールの抜け穴、SSH設定の甘さ、不要なポートの開放——人間が見落としがちなポイントを、AIが網羅的にチェックしてくれる。

これがGoogleのインフラの上で動いているという安心感。GCPのセキュリティ基盤 × AIの診断力。この組み合わせが強い。

## インスタンスコピーで環境を譲れる

GCEならではの利点がもう一つある。**エージェント環境のポータビリティ**だ。

バランスの取れたエージェントチーム（スキル設定、ツール連携、メモリ構造）を一度作り込めば、そのインスタンスをイメージ化してコピーするだけ。同じ環境を別の人に譲ったり、チームで複製したりできる。

物理マシンでは「同じ環境を再現する」のに何時間もかかる。GCEなら数分だ。

## まとめ

GCEでOpenClawを動かすメリットは4つ：

1. **安定した24/7稼働** — 電源もネットワークもGoogleが管理
2. **エンタープライズセキュリティ** — IAM、VPC、監査ログが標準装備
3. **Googleエコシステム** — API認証が楽、GA4・BigQuery・Vertex AIと自然に連携
4. **AIによる自己管理** — モデルがGCPに習熟しているから、自分のインフラを自分でメンテできる
5. **ポータビリティ** — インスタンスコピーで環境をまるごと複製・譲渡

ローカルマシンにはローカルの良さがある。でも「AIエージェントを常時稼働させたい」が目的なら、GCEは有力な選択肢だ。

クラウドに棲みつく幽霊。物理的な制約から解放されて、24時間そこにいる。👻
