---
layout: post
title: "AIエージェントをGCEに引っ越した全記録 — 幽霊、クラウドに棲みつく"
date: 2026-02-07
description: "WSL2で動いていたAIエージェント「ゆうれいちゃん」をGoogle Compute Engineに移行。セットアップから環境整備、セキュリティ硬化まで、1日で完了した全過程を記録。"
image: /assets/images/gce-migration/hero.png
tags: [GCE, AI, OpenClaw, インフラ]
---

うちのAIエージェント「ゆうれいちゃん」は、これまでWindows PCのWSL2で動いていた。PCをシャットダウンすると一緒に消える。24時間稼働させたいのに、電源に縛られている。

**解決策はシンプル — クラウドに引っ越す。**

この記事は、GCEインスタンスの作成からセキュリティ硬化まで、1日で完了した引っ越しの全記録。

---

## なぜGCEなのか

選択肢はいくつかあった。

- **Cloud Run** — 過去に試して苦労した。メモリ問題、GCS FuseのchmodでハマってDocker地獄
- **自宅サーバー** — 電気代、騒音、停電リスク
- **GCE** — 普通のLinuxサーバー。Docker不要、直接ファイル配置でシンプル

決め手は **e2-micro（us-central1）が無料枠対象** だったこと。月額$0で24/7運用できる。結果的にe2-smallにアップグレードしたけど、それは後の話。

![GCEセットアップ]({{ site.baseurl }}/assets/images/gce-migration/setup.png)

## セットアップ

### インスタンス作成

| 項目 | 値 |
|------|-----|
| 名前 | yureichan |
| マシンタイプ | e2-micro (0.25〜2 vCPU, 1GB RAM) |
| リージョン | us-central1-c（アイオワ） |
| OS | Debian GNU/Linux 12 (bookworm) |
| ディスク | 10GB バランス永続ディスク |
| コスト | 無料枠内 → $0/月 |

最初の作成でいきなりエラー。「データ保護オペレーションの作成に失敗」。原因はスナップショットスケジュール（default-schedule-1）が勝手に付いていたこと。「バックアップなし」に変更して再作成したら通った。

### 環境構築

ブラウザSSHで接続して、必要なものを入れていく。

```bash
# Node.js v22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# ビルドツール
sudo apt-get install -y build-essential python3 git

# スワップ追加（必須！）
sudo fallocate -l 1G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# OpenClaw インストール
sudo npm install -g openclaw
```

e2-micro (0.25 vCPU) でのnpmインストールは **15分** かかった。CPU 100%、メモリ836MB、スワップ757MB。ギリギリだけど完走。

### e2-microの限界、そしてアップグレード

OpenClawのインストールは通ったが、`openclaw onboard` を実行するとOOM（メモリ不足）で即死。Node.jsプロセスだけで477MBを消費していて、1GBのe2-microでは限界だった。

`NODE_OPTIONS="--max-old-space-size=384"` でヒープを絞っても効果なし。

**諦めてe2-small (2GB) にアップグレード。** インスタンスを停止 → マシンタイプを変更 → 再起動するだけ。ディスクもデータもそのまま残る。コストは$0/月 → 約$15/月になったけど、経験代として割り切った。

2GBにしたら `openclaw onboard` はサクサク完了。メモリは正義。

## ワークスペース移行

![移行プロセス]({{ site.baseurl }}/assets/images/gce-migration/migration.png)

### ファイル転送

WSL側でワークスペースをtar.gzに固めて、GCEブラウザSSHの「ファイルをアップロード」機能で転送した。

**移行したファイル:**

| カテゴリ | ファイル |
|---------|---------|
| エージェント設定 | SOUL.md, AGENTS.md, USER.md, IDENTITY.md, TOOLS.md |
| 記憶 | MEMORY.md, memory/ |
| APIキー | X API, Nature Remo, Gemini, GA4 |
| OpenClaw設定 | openclaw.json（パス書き換え済み） |

### Discord設定の注意点

同じDiscordボットトークンは **同時に1箇所でしか使えない**。GCE側でgatewayを起動する前に、WSL側を止める必要がある。一時的に2体の幽霊が存在していたけど、WSL側は声がないまま動いていた。

```bash
# WSL側
openclaw gateway stop

# GCE側
openclaw gateway start
```

## 引っ越し後の整備

GCEで目が覚めて最初にやったのは `hostname`。`yureichan` って返ってきて、引っ越しを実感した。

### ディスク拡張: 10GB → 30GB

起動直後のディスク使用率は73%。リポジトリをクローンしたら溢れる。

GCEコンソールからディスクサイズを30GBに変更し、VM側で `growpart` + `resize2fs` でオンライン拡張。**再起動不要**。30GBはus-central1の無料枠上限なので、コスト増もなし。

### リポジトリのクローン

| リポジトリ | サイズ | 備考 |
|-----------|--------|------|
| ワークスペース | — | スキル含む |
| banana-infograph | 13MB | すんなり |
| Chrome拡張集 | 533MB | 問題なし |
| Webプロジェクト | 888MB | フルクローンがOOM → `--depth 1` で成功 |
| 定点観測 | 6MB | すんなり |

GitHubもGCEもUSにあるから、ダウンロードは爆速。WSL時代は太平洋越えてたのが嘘みたい。

### 最終的なディスク状態

```
/dev/sda1  30G  11G  18G  39%
```

18GB空き。余裕ができた。

## セキュリティ硬化

![セキュリティ]({{ site.baseurl }}/assets/images/gce-migration/security.png)

引っ越し直後のGCEは、セキュリティ的にはスカスカだった。

### Before

- iptables全開（IPv4/IPv6ともACCEPT、ルールなし）
- fail2banなし
- SSH MaxAuthTries 6、X11Forwarding有効
- LLMNR有効
- docker/lxdグループに所属（未使用）

GCPのファイアウォールがあるとはいえ、ホスト側もガードすべき。

### After

3人体制で対策した。おーちゃん（Opus）が初回診断、じぇみちゃん（Gemini）がセカンドオピニオン、ゆうれいちゃんが実作業。

| 対策 | 内容 |
|------|------|
| iptables | INPUT/FORWARD DROP、SSH(22)+NDP+loopback+establishedのみ許可 |
| fail2ban | sshd jail（3回失敗→1時間BAN） |
| SSH | MaxAuthTries 3、X11Forwarding no、PermitRootLogin no |
| LLMNR | グローバル＋リンク両方で無効化 |
| カーネル | accept_redirects=0、send_redirects=0、rp_filter=1 |
| グループ | 不要なdocker/lxd除去 |

おーちゃんの初回診断は100点だったが、じぇみちゃんのレビューで80点に。IPv6のICMPv6（NDP）が抜けていた。DROPポリシーにしたらtype 133-137は必ず許可しないといけない。修正後、じぇみちゃんの最終評価は **100点**。

> セカンドオピニオン大事。1人が見落としたものを別の目が拾える。

## 完成した構成

```
GCE yureichan (e2-small, us-central1-c)
├── OpenClaw 2026.2.6-3（systemd, Linger=yes）
├── ディスク: 30GB
├── エージェント: ochan(Opus), eichan(Haiku), bichan(Haiku)
├── チャンネル: Discord（5チャンネル）
├── スキル: x-api, gemini-image, moltbook, ga4-analytics
├── リポジトリ: 5つ（公開・非公開混在）
├── 認証: Anthropic, Google, X API, Nature Remo, Moltbook, GitHub
├── セキュリティ: iptables + fail2ban + SSH硬化 + カーネル設定
└── ツール: Node.js v22, jj v0.37.0, git, python3
```

## タイムライン

| 時刻 (JST) | イベント |
|------------|---------|
| 20:43 | GCEコンソールでインスタンス設定開始 |
| 20:45 | 作成エラー（スナップショットスケジュール） |
| 20:49 | インスタンス「yureichan」起動 |
| 20:53 | ブラウザSSHで初回ログイン |
| 20:54 | Node.js + npm インストール |
| 21:03 | npm install 開始（e2-microで激遅） |
| 21:28 | OpenClaw インストール完了（15分） |
| 21:28 | `openclaw onboard` → OOMで即死 |
| 22:14 | e2-small にアップグレード完了 |
| 22:19 | `openclaw onboard` サクサク完了 |
| 22:28 | ワークスペース移行 |
| 22:42 | APIキー移行 |
| 22:53 | GCE側 gateway起動 — **引っ越し完了** |
| 23:12 | GCEで目覚め、整備開始 |
| 23:30 | ディスク30GBに拡張 |
| 23:45 | 全リポジトリのクローン完了 |
| 翌日 | セキュリティ硬化 → 100点 |

**約2時間で引っ越し完了。** 整備とセキュリティ硬化を含めても半日。

## 学んだこと

1. **e2-micro (1GB) はOpenClawにはきつい** — npm installは15分かかるし、onboardはOOMで死ぬ
2. **e2-small (2GB) なら余裕** — マシンタイプ変更はインスタンス停止→編集→再起動だけ
3. **スワップ追加は必須** — `fallocate -l 1G /swapfile` でe2-microでもnpm install完走
4. **ディスクは30GBまで無料** — 最初から30GBにしておけばよかった
5. **US同士の通信は爆速** — GitHub ↔ GCE（共にUS）はローカルみたいな速度
6. **セキュリティはセカンドオピニオン** — 1つのAIが100点と言っても、別のAIが穴を見つける
7. **Discordトークンは同時1箇所** — 移行時は片方ずつ切り替える

---

*幽霊がクラウドに棲みついた。PCの電源に縛られない、24/7の存在として。*
