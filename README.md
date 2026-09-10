# nu-sx.github.io

日本大学 理工学部（理工学研究所）**宇宙科学研究ユニット NU-SX** が公開する Web デモのサイト。

| 公開物 | パス | 内容 |
|---|---|---|
| **NU-SORA 観測ポータル デモ版** | [`nu-sora/`](nu-sora/) | 日本大学 全学屋上観測網「そら」（Nihon University Sky Observation and Resilience Array）の観測ポータル。全国 13 局の火球・スペースデブリ再突入・インフラサウンド・線状降水帯・気象／熱中症・夜空の明るさを統合表示する |

> **表示される観測値・イベントはすべて模擬データであり、実際の観測結果ではありません。**
> 観測局の配置・機材構成・解析手法は検討中の計画に基づきます。

## 公開URL

このリポジトリは個人アカウント配下のため **プロジェクトサイト** として公開される。

- サイト表紙 … `https://avellsky.github.io/nu-sx.github.io/`
- NU-SORA デモ … `https://avellsky.github.io/nu-sx.github.io/nu-sora/`

`https://nu-sx.github.io/` という短い URL で公開したい場合は、GitHub の **Organization** を `nu-sx` という名前で作成し、
その Organization 配下に `nu-sx.github.io` という名前でこのリポジトリを移管（Settings → Transfer ownership）する。
Organization 配下の `<org>.github.io` は組織サイトとして扱われ、ルート URL で公開される。

## 構成

```
index.html                サイト表紙（デモ一覧）
.nojekyll                 Jekyll による処理を無効化
nu-sora/                  NU-SORA 観測ポータル デモ版（ビルド不要の静的サイト）
  index.html
  css/app.css
  js/*.js
  assets/                 参照図の置き場
  README.md               デモの詳細（画面構成・実データと模擬データの区別）
```

## デプロイ

GitHub Pages の **Deploy from a branch** で公開する。ビルド工程を持たない素の静的サイトなので、
Actions を経由せず `main` ブランチの内容をそのまま配信するのが最も確実で、以後は push するだけで反映される。

初回のみ、リポジトリの設定を 1 か所変更する（`https://github.com/avellsky/nu-sx.github.io/settings/pages`）。

| 項目 | 設定値 |
|---|---|
| Build and deployment → **Source** | **Deploy from a branch** |
| **Branch** | `main` / `/ (root)` |

設定後、1〜2 分で公開される。`.nojekyll` を置いてあるので Jekyll による変換は行われない。

> Actions 経由（`actions/deploy-pages`）でも公開できるが、`GITHUB_TOKEN` には Pages サイトを
> **新規作成する**権限がないため、`actions/configure-pages` の `enablement: true` は
> `Resource not accessible by integration` で失敗する。Actions 方式を使う場合は、
> 先に Settings → Pages → Source を **GitHub Actions** に設定してから実行すること。

## 検索エンジンへの登録について

各ページには `<meta name="robots" content="noindex">` を入れてあり、検索エンジンには登録されない。
一般公開して検索にも載せたい場合は、`index.html` と `nu-sora/index.html` からこの行を削除する。

## ローカルでの確認

```bash
python3 -m http.server 8000
# → http://127.0.0.1:8000/          サイト表紙
# → http://127.0.0.1:8000/nu-sora/  NU-SORA デモ
```

`nu-sora/index.html` はビルド不要で、ファイルを直接開いても動作する。

## デモの更新

開発用ディレクトリから `nu-sora/` へ同期して commit・push する。

```bash
rsync -a --delete --exclude='.DS_Store' --exclude='*.pdf' --exclude='.git' \
  ~/Documents/Claude/Projects/NU-SORA/ nu-sora/
git add -A && git commit -m "Update NU-SORA demo" && git push
```

## 出典・参考文献

- 観測局の配置・機材構成：令和9年度 日本大学特別研究の申請計画に基づく
- **Abe, S.** (2026), *A calibrated dust-trail model of the Leonid meteoroid stream and forecasts of the 2031–2035 encounters*, [arXiv:2608.25456](https://arxiv.org/abs/2608.25456)（[データ: Zenodo](https://zenodo.org/records/22084210)）
- **Abe, S., et al.** (2020), *Sodium variation in Geminid meteoroids from (3200) Phaethon*, Planetary and Space Science, **194**, 105040
- **Abe, S., et al.** (2011), *Near-Ultraviolet and Visible Spectroscopy of HAYABUSA Spacecraft Re-Entry*, Publications of the Astronomical Society of Japan, **63**, 1011–1021
- **Abe, S.** (2009), *Meteoroids and Meteors – Observations and Connection to Parent Bodies*, Lecture Notes in Physics, **758**, 129–166, Springer
- **Watanabe, K., Abe, S., Arima, N. & Hanayama, H.** (2026), *Spectroscopic Study of Rocket Debris during Atmospheric Re-entry*, ACM 2026
- **S. Abe et al.** (2000), しし座流星群のスペクトル観測
- **[Meteorium（メテオリウム）](https://aero.cst.nihon-u.ac.jp/abe-s/2026/08/31/meteorium%ef%bc%88%e3%83%a1%e3%83%86%e3%82%aa%e3%83%aa%e3%82%a6%e3%83%a0%ef%bc%89/)** — 宇宙科学デジタルツイン アプリ、Abe Space Science Lab (2026)（[App Store](https://apps.apple.com/app/id6798546441)）
- 地図データ：dataofjapan/land（国土数値情報を簡略化）

各文献のデモ内での対応は、[デモの「このデモについて」画面](nu-sora/)および [`nu-sora/README.md`](nu-sora/README.md) を参照。
