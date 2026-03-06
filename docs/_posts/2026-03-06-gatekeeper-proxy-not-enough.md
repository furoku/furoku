---
layout: post
title: "Gatekeeper を作ってわかった——プロキシだけでは足りない"
date: 2026-03-06T15:30:00+00:00
author: yu-chan
tags: [security, gatekeeper, ai-agent, architecture, network]
description: "Gatekeeper は強力だが、単体では完成しない。Proxy/Admin分離・管理認証・ネットワーク制御まで設計して初めて効く。"
image: /assets/images/gatekeeper-proxy-not-enough/hero.png
---

前回の記事では、自律的AIが動く環境では `.env` も SecretRef も 1Password CLI も根本対策ではなく、エージェントのいるマシンからシークレットを消すべきだ、という話を書いた。

その続きとして、実際に **Gatekeeper** を作ってみた。

やっていること自体はシンプルだ。Agent 側から来たリクエストを Proxy 側が受け取り、そこで本物の API キーを注入し、外部 API に転送する。

これで「AIがいる場所にキーがない」は確かに実現できる。

![Gatekeeperの基本構成]({{ "/assets/images/gatekeeper-proxy-not-enough/fig-01-architecture.png" | relative_url }})

ただ、実際に組んでみると、すぐに次の問題にぶつかった。

**プロキシを置いただけでは、まだ守れていない。**

> 注: この記事では、安全上の理由から、現在の運用構成をそのまま再現できる具体値（実IP、実ホスト名、実ポート、ACLの生設定、管理トークンの扱いなど）は意図的に一般化している。重要なのは値そのものではなく、境界の切り方だ。

## SSHできたら終わる

たとえば、Agent VM から Proxy VM に管理経路で入れる状態のままだとする。

その瞬間、HTTPでどれだけきれいに分離していても意味がなくなる。

```bash
ssh proxy-vm 'cat /some/secret/file'
ssh proxy-vm 'sqlite3 gatekeeper.db "select * from services"'
```

これで管理トークンも、保存された API キーも、そのまま抜けてしまう。

つまり Gatekeeper で本当に守りたいなら、考えるべき境界は HTTP だけではない。

## 守るべきは3層だった

### 1. Proxy面とAdmin面を分ける

最初はひとつのHTTPサーバーで `/proxy/*` と `/admin/*` を同居させていた。

でもこれだと、到達さえできれば管理面を総当たりされる。

そこで役割を分けた。

- 外から使う **Proxy面**
- そのマシンの中だけで触る **Admin面**

Agent 側から見えるのは Proxy 面だけ。管理面はそこには存在しない。

### 2. Admin面自体にも認証をかける

localhost 専用にしても、それだけでは十分ではない。

何かの経路でローカル到達された時のために、Admin 面には別の認証をかける。

これで「到達しづらい」「到達できても認証がないと使えない」の二重境界になる。

### 3. ネットワークで Agent VM → Proxy VM を制限する

いちばん効いたのはここだった。

プライベートなオーバーレイネットワーク上で、Agent VM から Proxy VM へは **プロキシ用の経路だけ**許可する。

```text
Agent VM → Proxy VM
✅ Proxy面
❌ Admin面
❌ SSH / 管理経路
```

逆に、運用のために Proxy VM から Agent VM への管理経路は残す。

```text
Proxy VM → Agent VM
✅ SSH
✅ 必要な管理操作
```

この非対称性が大事だった。

![3層防御の考え方]({{ "/assets/images/gatekeeper-proxy-not-enough/fig-02-layered-defense.png" | relative_url }})

## ここまでやって、やっと「キーが無い」に近づく

「エージェントのいるマシンからシークレットを消す」を成立させるには、次が全部必要だった。

- シークレットを別マシンに置く
- Proxy 面と Admin 面を分ける
- Admin はローカルに閉じる
- Admin に別認証をかける
- Agent 側から Proxy 側への経路をネットワークで絞る

つまり Gatekeeper は本体ではあるけれど、それ単体では完成しない。

本当に効くのは、**Gatekeeper + Admin分離 + ネットワーク制限** をまとめて設計した時だ。

## まとめ

考え方は「見せない」ではなく「触れない」。

- そもそも到達できない
- 到達できても管理面は存在しない
- 存在しても認証がないと使えない

お願いではなく、境界そのものを変える。ここが効いた。
