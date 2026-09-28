# re:clock

Notion に埋め込んで使う、勤務スケジュール連動の時計ウィジェット。
HTML / CSS / Vanilla JS だけの静的サイトで、GitHub Pages でそのまま公開できます。

## ローカルで確認する

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

## レストくんの画像を差し替える

`assets/rest-kun/` に次の名前で PNG（透過・正方形、256×256 推奨）を置くと、自動でそちらが使われます。
画像が無い状態は、`js/sprite.js` でコードから描いた仮のドット絵を表示します。

| 状態 | ファイル名 |
| --- | --- |
| 身支度中 | `prepare-01.png`, `prepare-02.png` |
| お仕事中 | `work-01.png`, `work-02.png`, `work-03.png` |
| ひと休み | `break-01.png`, `break-02.png` |
| お昼ご飯 | `lunch-01.png`, `lunch-02.png` |
| お仕事おしまい | `finish-01.png`, `finish-02.png` |
| おやすみの日 | `holiday-01.png`, `holiday-02.png` |

コマは `-01` から順に最大3枚まで読み込み、850ms ごとに切り替えます。

## 構成

```
index.html
css/style.css
js/app.js      時計・ステータス判定・設定（LocalStorage）
js/sprite.js   仮のドット絵レストくん
assets/fonts/  時刻用ピクセルフォント（DotGothic16 の数字だけを抜き出したもの / OFL）
assets/rest-kun/
```
