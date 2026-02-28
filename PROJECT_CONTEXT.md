# Photo Frame App — プロジェクトコンテキスト

## 概要

写真にマット（台紙）と撮影情報テキストを合成してダウンロードできる、ブラウザで動作する静的Webアプリ。
インストール不要・サーバー不要。HTMLファイルをブラウザで開くだけで動作する。

## 公開情報

| 項目                   | 内容                                                                   |
| ---------------------- | ---------------------------------------------------------------------- |
| GitHub Organization    | [LifeOps-Schaccie](https://github.com/LifeOps-Schaccie)                |
| リポジトリ             | [photo-frame-app](https://github.com/LifeOps-Schaccie/photo-frame-app) |
| 公開URL (GitHub Pages) | https://lifeops-schaccie.github.io/photo-frame-app/                    |
| ブランチ               | `main`                                                                 |

## ファイル構成

```
photo-frame-app/
├── index.html          # UIレイアウト・HTML構造
├── style.css           # ダークテーマのスタイル定義
├── app.js              # アプリロジック（状態管理・描画・EXIF）
└── PROJECT_CONTEXT.md  # このファイル（AIセッション引き継ぎ用）
```

## 外部依存

| ライブラリ                                           | 用途               | 読み込み方法   |
| ---------------------------------------------------- | ------------------ | -------------- |
| [exifr v7.1.3](https://github.com/MikeKovarik/exifr) | EXIF情報の読み取り | CDN (jsdelivr) |
| Noto Sans JP / Noto Serif JP / Inter                 | フォント           | Google Fonts   |

## 機能一覧

### 写真の読み込み
- ドラッグ＆ドロップ / クリックで複数枚一括読み込み
- サムネイルストリップで枚数表示・切り替え・削除
- 左右ナビボタン or キーボード（←→）で切り替え

### スタイル設定
- **プリセットスウォッチ**：白/灰・黒/白・灰/白・明灰/黒 の4プリセット
- **カラーピッカー**：台紙の色・文字色を自由に設定
- **フォント**：Noto Sans JP / Noto Serif JP / Inter から選択
- **アスペクト比**：Auto（画像向きに応じ自動） / 4:5 / 5:4 / 3:2 / 2:3
- **余白**：2〜10%（スライダー、0.5%刻み）

### 表示情報（テキスト合成）
各行ごとに「表示する/しない（チェックボックス）」と「太字にする（ラジオ）」を選択できる。  
太字に選ばれた行は常に先頭に配置される。

| フィールドキー | 表示ラベル      | 内容                                       |
| -------------- | --------------- | ------------------------------------------ |
| `cameraLens`   | カメラ / レンズ | EXIF自動取得 + 手動入力                    |
| `settings`     | 設定            | 焦点距離・F値・SS・ISO（EXIF自動）         |
| `date`         | 撮影日          | EXIF DateTimeOriginal 自動（YYYY-MM-DD）   |
| `author`       | 作者            | 手動入力（全枚数共通）                     |
| `location`     | 撮影場所        | 手動入力 + 「ALL」ボタンで全枚数に一括適用 |

### EXIF自動取得フィールド
- `Make` + `Model` → カメラ名（重複プレフィックスを除去）
- `LensModel` / `Lens` / `LensInfo` → レンズ名
- `FocalLength` → `XXmm`
- `FNumber` → `f/X.X`
- `ExposureTime` → `1/XXXs` または `Xs`
- `ISO` / `ISOSpeedRatings` → `ISO XXX`
- `DateTimeOriginal` / `DateTime` → `YYYY-MM-DD`

### エクスポート
- **最大辺サイズ**：2000px / 3000px（デフォルト） / 4000px / 元サイズ
- **形式**：PNG / JPEG (品質90%)
- ダウンロードファイル名：`元ファイル名_framed.png/jpg`
- 「すべてダウンロード」：複数枚を300msインターバルで順次ダウンロード

## コード構造（app.js）

```
app.js
├── DOM Elements（定数宣言）
├── State
│   ├── photos[]          # 各エントリ: { file, image, exifData, camera, lens, settings, date, location }
│   └── currentIndex      # 現在選択中の写真インデックス（-1 = 未選択）
├── File Upload           # drop / click / fileInput.change → handleFiles()
├── Photo Selection       # selectPhoto() / saveCurrentPanelToEntry() / loadEntryToPanel()
├── Thumbnails            # renderThumbnails() / removePhoto() / renderThumbnailHighlight()
├── EXIF Extraction       # extractExif(tags) → { camera, lens, focalLength, ... }
├── Info Lines Config     # getDisplayConfig() / getInfoLinesFromPanel() / getInfoLinesFromEntry()
├── Aspect Ratio          # getAspectRatio(image)
├── Canvas Drawing        # redraw() — プレビュー用メインCanvas描画
├── Offscreen Rendering   # renderEntryToCanvas(entry) — バッチダウンロード用
├── Preset Swatches       # クリックでbgColor・textColorを一括変更
├── Settings Listeners    # 各コントロールの input/change → redraw()
├── Export Scaling        # scaleCanvasForExport(canvas) — 最大辺制限
├── Download              # downloadBtn / downloadAllBtn
└── Navigation            # updateNavButtons() / navPrev / navNext / keyboard
```

## デザインシステム（CSS変数）

```css
--bg-primary:   #0f0f0f   /* メイン背景（プレビューエリア）*/
--bg-secondary: #1a1a1a   /* サイドパネル背景 */
--bg-tertiary:  #252525   /* 入力フィールド・ボタン背景 */
--bg-hover:     #2a2a2a   /* ホバー時 */
--text-primary: #e8e8e8
--text-secondary: #999
--text-muted:   #666
--border-color: #333
--accent:       #6e8efb   /* アクセントカラー（青紫）*/
--accent-hover: #5a7df0
```

## GitHubへの更新方法

アプリを変更した後、AIに以下のように依頼するだけで反映される：

> 「〇〇を変更して、GitHubに反映してください」

AIが内部で以下を実行する：
```powershell
git add .
git commit -m "変更内容の説明"
git push
```

GitHub Pagesへの反映は数分後に自動で行われる。

## 変更履歴

| 日付       | 内容                                                   |
| ---------- | ------------------------------------------------------ |
| 2026-02-28 | 初回リリース。GitHub Pages (LifeOps-Schaccie) にて公開 |

> 今後変更を加えた際は、この表に追記すること。
