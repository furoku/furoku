---
layout: post
title: "それでも残るシークレットと、どこまで消せるのか"
date: 2026-03-06T15:50:00+00:00
author: yu-chan
tags: [security, gatekeeper, secrets, operations, ai-agent]
description: "Gatekeeper で多くは外に出せる。でもクライアント自身が使う認証は残る。残存前提の運用設計が必要。"
image: /assets/images/gatekeeper-what-still-remains/hero.png
---

Gatekeeper を作って、いろいろな API や MCP を収容すると、かなり多くのシークレットは Agent VM から消せる。

実際、HTTP API 用のキー、画像系ツールの認証、署名が必要な一部 API 資格情報などは、かなりの割合で外に追い出せた。

この時点で「AI が外部 API 用の鍵をそのまま読む」リスクはかなり減る。

でも監査してみると、まだ残るものがある。

しかも、それらは単に移行漏れではなく、**構造上そこに残る** 類のものだった。

> 注: この記事では、手元の運用状態を棚卸し表としてそのまま公開しない。代わりに、監査して見えてきた「残り方のパターン」を書く。公開後に第三者が現在地を逆算しにくくするためだ。

## 1. クライアント自身が使う認証は残りやすい

たとえば、チャットクライアントが外部サービスに接続するための bot token。

これは Agent が API を叩くための鍵ではなく、**クライアント自身が存在するための鍵** だ。

同じ種類として、次がある。

- CLI の OAuth token
- ランタイムが読む OAuth profile
- ゲートウェイ自身の token
- device identity の private key

これらは「外の API を Agent に代理で叩かせる」という Gatekeeper の問題設定と少し違う。

## 2. 削除できる残骸は、ちゃんと消すべきだった

全部が構造的残存ではない。

監査すると、消せるのに残っているものもあった。

- legacy credential
- access token のキャッシュ
- 使っていない OAuth token
- 緩い permission 設定
- shell history に残った認証痕跡

この手のものは「実害は少ないから後で」と放置しがちだ。

でも自律的AIの文脈では、その “少し残っている” がよくない。

Agent にとっては「現役」「過去」「キャッシュ」「履歴」の区別がないからだ。

## 3. 「移行できるもの」と「できないもの」を分ける

### Agent が叩く API 用の認証
比較的 Gatekeeper に寄せやすい。

- API key
- Bearer token
- OAuth1 署名
- 一部 MCP credential

### クライアントが自分で使う認証
そのままでは寄せにくい。

- bot token
- CLI token
- ランタイム自身の token
- 一部 OAuth profile

ここで大事なのは、全部を同じレイヤーで解決しようとしないこと。

## 4. 残るものは「最小化」で守る

完全に追い出せないものには別の考え方が必要になる。

- 権限を最小化する
- 使っていない token / cache を消す
- permission を締める
- ローテーションしやすい形にする
- 監査しやすい場所に寄せる

やっていることは「お願いベース」に戻ることではない。

- 追い出せるものは物理的に追い出す
- 追い出せないものは寿命と権限を削る

この二層整理だ。

![消せるものと残るもの]({{ "/assets/images/gatekeeper-what-still-remains/fig-01-movable-vs-residual.png" | relative_url }})

![移行後の残骸掃除]({{ "/assets/images/gatekeeper-what-still-remains/fig-02-cleanup-sweep.png" | relative_url }})

## 5. まとめ

Gatekeeper はかなり強い。でも万能ではない。

- 消せるシークレットは、本当に消せる
- でもクライアント自身が持つ認証は残る
- だから残るものを前提にした運用も必要になる

AI時代のシークレット管理は、おそらくこの組み合わせになる。

銀の弾丸ではなく、境界を一つずつ物理化する設計だ。
