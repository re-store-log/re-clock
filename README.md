# re:clock

Notion に埋め込んで使う、勤務スケジュール連動の時計ウィジェット。
HTML / CSS / Vanilla JS だけの静的サイトで、GitHub Pages でそのまま公開できます。

## ローカルで確認する

```sh
python3 -m http.server 8000
# → http://localhost:8000/
```

## レストくんの画像

`assets/rest-kun/` の `<状態>-01.png`, `-02.png`（最大 `-03.png`）を 850ms ごとに切り替えて表示します。
状態名は `prepare`（身支度中）/ `work`（お仕事中）/ `break`（ひと休み）/ `lunch`（お昼ご飯）/ `finish`（お仕事おしまい）/ `holiday`（おやすみの日）。

画像は `rest-kun-pixel-master.png`（ピクセル版マスター）を基準に、顔・耳・しっぽ・スカーフ・色・頭身をそろえて作っています。
いずれも透過 PNG、104×104 ドットを 3 倍にした 312×312px です。

## 構成

```
index.html
css/style.css
js/app.js      時計・ステータス判定・設定（LocalStorage）・キャラのアニメーション
assets/fonts/  時刻用ピクセルフォント（DotGothic16 の数字だけを抜き出したもの / OFL）
assets/rest-kun/
```
