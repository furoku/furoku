# GitHubプロフィールと共同ブログの役割分離 実装計画

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** GitHubプロフィールは「もじゃ個人の活動ハブ」、`furoku.github.io/furoku/` は「ゆうちゃん × もじゃの共同ブログ」という役割分離を、文言・導線・レイアウトで明確にする。

**Architecture:** README は個人プロフィールと主要プロジェクトへの入口に寄せ、ブログ側は「何者か」ではなく「何を記録するメディアか」を前面に出す。トップページ・ナビ・記事ページの文言を共同メディア向けに再設計し、テーマ導線と“このブログについて”を追加して、GitHubプロフィールへの導線は補助的に扱う。

**Tech Stack:** Jekyll, Liquid, Markdown, HTML, CSS, GitHub Pages

---

## 現状認識

### GitHubプロフィール側の役割
- 対象: `README.md`
- 主語: もじゃ / Mojofull / furoku
- 目的:
  - 何をしている人か
  - 代表プロジェクト
  - 外部リンク
  - ブログへの入口

### ブログ側の役割
- 対象: `docs/`
- 主語: ゆうちゃん × もじゃ
- 目的:
  - AIエージェント運用・MCP・分析・ドキュメント設計の共同記録
  - テーマ別に記事へ入る導線
  - 初見ユーザーに「何が読めるか」を伝える

### 今のズレ
- ブログトップに GitHubプロフィール的な文脈がまだ残っている
- ナビの `プロフィール` が外部GitHubへ直行し、ブログ文脈から少し飛ぶ
- hero が「誰のページか」の説明に寄っていて、メディアの説明としてはまだ弱い
- README は比較的プロフィール向けだが、ブログが共同メディアであることをもう一段明確にしてよい

---

## 実装方針

1. **ブログの hero を共同メディア中心に変更する**
2. **ブログ内導線を優先し、GitHub / X は補助導線に下げる**
3. **トップに『このブログについて』とテーマ導線を追加する**
4. **注目記事を“最新”ではなく“入口記事”として選べるようにする**
5. **記事ページの kicker / notice / footer も共同ブログ文脈に揃える**
6. **README / llm.txt も役割分担が伝わるよう微調整する**

---

## Task 1: ブログのコア文言を共同メディア前提に置き換える

**Objective:** トップと記事ページの第一印象を「もじゃ個人ページ」ではなく「共同ブログ」に寄せる。

**Files:**
- Modify: `docs/_layouts/home.html`
- Modify: `docs/_layouts/default.html`
- Modify: `docs/_layouts/post.html`
- Test: `bundle exec jekyll build`

**Step 1: home hero 文言を再設計**
- 現状:
  - `もじゃと、AIパートナーのゆうちゃんが育てている技術ブログ`
  - `プロフィールを見る`
- 変更方針:
  - タイトルは「共同で記録しているメディア」であることを明示
  - CTA はブログ内導線を優先
- 例:
  - hero title: `ゆうちゃんともじゃが、AI運用の実践を記録する共同ブログ`
  - hero description: `OpenClaw、Gatekeeper、WebMCP、分析、ドキュメント設計を、実装・運用・改善の視点で整理しています。`
  - buttons:
    - `最新記事を読む`
    - `このブログについて`
    - `テーマから読む`

**Step 2: default ナビをブログ内導線優先に変更**
- 現状:
  - 記事一覧 / プロフィール / X / llm.txt
- 変更方針:
  - ブログ内導線を先に置く
  - 外部導線は補助扱いにする
- 候補:
  - `記事一覧`
  - `このブログについて`
  - `テーマ`
  - `llm.txt`
  - `GitHub`

**Step 3: post kicker を共同ブログ文脈に変更**
- 現状:
  - `Tech Blog / yu-chan`
- 候補:
  - `Joint Notes by Mojofull & yu-chan`
  - `Mojofull × yu-chan`
  - `共同ブログ / Mojofull & yu-chan`

**Step 4: 検証**
Run: `bundle exec jekyll build`
Expected: PASS

---

## Task 2: トップに『このブログについて』ブロックを追加する

**Objective:** 共同ブログの役割、共同性、読み方を初見ユーザーに短く伝える。

**Files:**
- Modify: `docs/_layouts/home.html`
- Modify: `docs/assets/css/style.css`
- Test: `bundle exec jekyll build`

**Step 1: hero 直下に about セクションを追加**
含める要素:
- 共同運営の説明
- 主なテーマ
- 初めて読む人向けの一言

**Step 2: ブロック内容の草案**
- 見出し: `このブログについて`
- 説明: `このブログは、もじゃの実装・運用実践を、AIパートナーのゆうちゃんが整理・記録・改善支援する形で育てている共同ブログです。`
- 3カラム程度の要素:
  - `誰が育てているか`
  - `何を書いているか`
  - `どう読むとよいか`

**Step 3: CSS 追加**
- card-like な紹介ブロック
- モバイルで 1 カラムに落ちる設計

**Step 4: 検証**
Run: `bundle exec jekyll build`
Expected: PASS

---

## Task 3: テーマ導線を追加する

**Objective:** 時系列一覧だけでなく、何が読めるブログかをテーマ単位で伝える。

**Files:**
- Modify: `docs/_layouts/home.html`
- Modify: `docs/assets/css/style.css`
- Test: `bundle exec jekyll build`

**Step 1: 主要テーマを決める**
候補:
- OpenClaw
- Gatekeeper
- WebMCP
- Analytics
- Docs / Blog Architecture
- BananaX

**Step 2: テーマ導線UIを追加**
- トップに theme chips / category links を追加
- 各テーマから該当記事へ飛べる導線にする
- Jekyll のタグアーカイブが未整備なら、まずは代表記事リンクでもよい

**Step 3: モバイルで押しやすいサイズに調整**
- 横スクロールにしない
- 複数行折り返しを許容

**Step 4: 検証**
Run: `bundle exec jekyll build`
Expected: PASS

---

## Task 4: 注目記事を『入口記事』として扱えるようにする

**Objective:** 最新記事が常に注目記事になる状態をやめ、初見向けの入口記事を選べるようにする。

**Files:**
- Modify: `docs/_layouts/home.html`
- Modify: 必要なら `docs/_config.yml`
- Modify: 必要なら対象記事 front matter
- Test: `bundle exec jekyll build`

**Step 1: featured 選定方式を決める**
選択肢:
- `featured: true` front matter を読む
- `site.data` で featured slug を持つ
- 一時的には固定 slug 指定

**Step 2: 推奨の入口記事候補**
- `docs-as-product`
- `ai-readable-blog-structure`
- `webmcp-ghost-blog-ai-agents`
- `ops-two-layer-architecture`

**Step 3: 実装**
- `site.posts.first` 依存をやめる
- 初見ユーザー向けの説明文を featured セクションに添える

**Step 4: 検証**
Run: `bundle exec jekyll build`
Expected: PASS

---

## Task 5: README を『個人活動ハブ』として再確認・微調整する

**Objective:** README とブログの役割がぶつからないように、README をより個人プロフィール寄りに寄せる。

**Files:**
- Modify: `README.md`
- Test: 目視レビュー

**Step 1: ブログ説明の主語を調整**
- 現状はブログ説明がややプロフィール本文と連続している
- 変更方針:
  - `共同ブログ` であることを明示
  - README ではブログを「活動の一部」として扱う

**Step 2: README の blog セクション文案例**
- `yu-chan と共同で育てている技術ブログ。AIエージェント運用、MCP、分析、ドキュメント設計の実践記録を公開しています。`

**Step 3: 目視確認**
- README は引き続き「もじゃが何者か」が主役になっているかを確認

---

## Task 6: llm.txt も共同ブログ文脈に揃える

**Objective:** AI向け説明でも、サイトが個人プロフィールではなく共同メディアであることを明確にする。

**Files:**
- Modify: `docs/llm.txt`
- Test: 目視レビュー

**Step 1: 冒頭要約を修正**
- 現状:
  - Mojofull と yu-chan の説明はあるが、共同メディア性をもう少し強く出せる
- 変更方針:
  - `This is a joint blog by Mojofull and the AI partner yu-chan...` を明確化

**Step 2: Usage Notes 更新**
- `GitHub profile` と `blog` が別物であることを匂わせる
- このサイトでは実践知・運用記録を読むことを前提とした説明にする

---

## Task 7: 外部導線の優先度を調整する

**Objective:** GitHub / X は消さずに残しつつ、ブログ内導線を主・外部リンクを従にする。

**Files:**
- Modify: `docs/_layouts/default.html`
- Modify: `docs/assets/css/style.css`
- Test: `bundle exec jekyll build`

**Step 1: GitHub 導線の位置とラベル調整**
- `プロフィール` ではなく `GitHub` にする
- ブログ内の `このブログについて` と混同しないラベルへ変更

**Step 2: footer / notice の見直し**
- 共同運営の説明はブログ文脈に寄せる
- ただし長文化しない

---

## 変更対象ファイル一覧

- `docs/_layouts/home.html`
- `docs/_layouts/default.html`
- `docs/_layouts/post.html`
- `docs/assets/css/style.css`
- `docs/_config.yml`
- `README.md`
- `docs/llm.txt`

---

## 受け入れ条件

- GitHubプロフィールとブログの役割が、文言だけで見ても区別できる
- ブログトップが「個人プロフィール」ではなく「共同メディア」に見える
- GitHub へのリンクは残るが、ブログの主導線になっていない
- 初見ユーザーがトップだけで「何が読めるブログか」を理解できる
- `bundle exec jekyll build` が通る

---

## 実行順の推奨

1. Task 1: コア文言の修正
2. Task 2: このブログについて追加
3. Task 3: テーマ導線追加
4. Task 4: 注目記事の入口化
5. Task 7: 外部導線の優先度調整
6. Task 5: README 微調整
7. Task 6: llm.txt 微調整

---

## 備考

- `.github/workflows/security.yml` は現在ローカル未push状態。これは `workflow` scope 付き GitHub 認証が必要になったら別タスクで push する。
- 今回の計画は、まずは **情報設計と役割分離** を優先する。テーマ別アーカイブや専用 About ページは、必要になってから追加すればよい。
