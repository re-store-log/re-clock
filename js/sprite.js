/*
 * レストくん（仮）のドット絵をコードで描く。
 * assets/rest-kun/ に PNG が置かれたら app.js がそちらを優先するので、
 * これは本番の画像ができるまでの代役。
 */
(function () {
  "use strict";

  const SIZE = 48;

  const C = {
    fur: "#B8875A",
    furShade: "#96673F",
    light: "#F3E6D0",
    tailLight: "#E6CFAE",
    earIn: "#E2B49B",
    eye: "#2A2320",
    white: "#FFFFFF",
    scarf: "#445565",
    scarfDark: "#33414E",
    outline: "#5A4030",
    gray: "#A7A19B",
    grayDark: "#77716B",
    mug: "#445565",
    steam: "#CDBFAF",
    rice: "#FBF8F2",
    nori: "#2F3A33",
    book: "#445565",
    page: "#F6F4F1",
    cushion: "#CDBFAF",
    cushionDark: "#A89C92",
    leaf: "#A89C92",
    stem: "#8C7B6B",
  };

  // ---------- 描画の道具 ----------

  function grid() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  }

  function set(g, x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && y >= 0 && x < SIZE && y < SIZE) g[y][x] = c;
  }

  function ell(g, cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) set(g, x, y, c);
      }
    }
  }

  function rect(g, x0, y0, x1, y1, c) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(g, x, y, c);
  }

  function dots(g, list, c) {
    list.forEach(([x, y]) => set(g, x, y, c));
  }

  // シルエットの外周に縁取りを付けてドット絵らしくする
  function outline(g) {
    const out = grid();
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        out[y][x] = g[y][x];
        if (g[y][x]) continue;
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const row = g[y + dy];
          return row && row[x + dx];
        });
        if (near) out[y][x] = C.outline;
      }
    }
    return out;
  }

  // ---------- レストくん本体 ----------

  // opt: { dy: 上下の揺れ, tail: しっぽの揺れ, eyes: "open" | "blink" | "happy" }
  function squirrel(g, opt) {
    const dy = opt.dy || 0;
    const t = opt.tail || 0;

    // しっぽ（体の後ろ）
    ell(g, 13 + t, 28, 8, 12, C.fur);
    ell(g, 12 + t, 15, 7, 6, C.fur);
    ell(g, 17 + t, 10, 4.5, 3.5, C.fur);
    ell(g, 13 + t, 29, 4, 8, C.tailLight);
    ell(g, 13 + t, 16, 3.5, 3, C.tailLight);

    // 体
    ell(g, 28, 35 + dy, 10, 10, C.fur);
    ell(g, 29.5, 37 + dy, 6, 7, C.light);

    // 足
    ell(g, 23, 45, 3.5, 2, C.furShade);
    ell(g, 34, 45, 3.5, 2, C.furShade);

    // 耳
    ell(g, 23, 11 + dy, 2.6, 4.2, C.fur);
    ell(g, 36, 11 + dy, 2.6, 4.2, C.fur);
    ell(g, 23, 12 + dy, 1.2, 2.4, C.earIn);
    ell(g, 36, 12 + dy, 1.2, 2.4, C.earIn);
    dots(g, [[22, 6 + dy], [23, 6 + dy], [22, 5 + dy], [36, 6 + dy], [37, 6 + dy], [37, 5 + dy]], C.furShade);

    // 頭
    ell(g, 29.5, 19 + dy, 9, 8, C.fur);
    ell(g, 29.5, 22.5 + dy, 5.5, 3.8, C.light);

    // 目
    const eyes = opt.eyes || "open";
    [25, 33].forEach((ex) => {
      const ey = 17 + dy;
      if (eyes === "open") {
        rect(g, ex, ey, ex + 1, ey + 2, C.eye);
        set(g, ex, ey, C.white);
      } else if (eyes === "blink") {
        rect(g, ex, ey + 2, ex + 1, ey + 2, C.eye);
      } else {
        dots(g, [[ex - 1, ey + 2], [ex, ey + 1], [ex + 1, ey + 1], [ex + 2, ey + 2]], C.eye);
      }
    });

    // 鼻と口
    rect(g, 29, 21 + dy, 30, 21 + dy, C.eye);
    dots(g, [[28, 23 + dy], [29, 24 + dy], [30, 24 + dy], [31, 23 + dy]], C.outline);

    // 濃紺スカーフ
    ell(g, 29.5, 27.5 + dy, 8.5, 2.2, C.scarf);
    ell(g, 29.5, 29.5 + dy, 4, 2, C.scarf);
    rect(g, 36, 27 + dy, 38, 29 + dy, C.scarfDark);
    dots(g, [[39, 30 + dy], [39, 29 + dy], [37, 30 + dy]], C.scarfDark);
    set(g, 29, 30 + dy, C.light);
  }

  function steam(g, f, x, y) {
    const a = f % 2 === 0;
    dots(g, [[x + (a ? 0 : 1), y], [x + (a ? 1 : 0), y - 1], [x + (a ? 0 : 1), y - 2]], C.steam);
  }

  function mug(g, x, y) {
    rect(g, x, y, x + 4, y + 5, C.mug);
    rect(g, x, y, x + 4, y, C.scarfDark);
    dots(g, [[x + 5, y + 1], [x + 6, y + 2], [x + 6, y + 3], [x + 5, y + 4]], C.mug);
  }

  // ---------- 状態ごとのポーズ ----------
  // 各ポーズは frame 番号を受け取り、{ body, soft } を描く。
  // soft は縁取りを付けない部分（湯気など）。

  const POSES = {
    // 身支度中：ノートを抱えて、足元にコーヒー
    prepare: {
      frames: 2,
      draw(g, s, f) {
        squirrel(g, { eyes: f === 1 ? "blink" : "open", tail: f });
        mug(g, 40, 40);
        rect(g, 25, 32, 33, 39, C.book);
        rect(g, 26, 33, 32, 33, C.page);
        ell(g, 25, 35, 2, 2, C.furShade);
        ell(g, 33, 35, 2, 2, C.furShade);
        steam(s, f, 42, 38);
      },
    },
    // お仕事中：ノートPCでタイピング
    work: {
      frames: 3,
      draw(g, s, f) {
        squirrel(g, { eyes: f === 2 ? "blink" : "open" });
        rect(g, 40, 29, 45, 41, C.gray);
        dots(g, [[43, 34], [43, 36]], C.page);
        rect(g, 29, 41, 46, 43, C.grayDark);
        rect(g, 31, 41, 39, 41, C.gray);
        ell(g, 33, f === 1 ? 40 : 39, 2.2, 1.6, C.furShade);
        ell(g, 37, f === 1 ? 39 : 40, 2.2, 1.6, C.furShade);
      },
    },
    // ひと休み：マグカップでコーヒー
    break: {
      frames: 2,
      draw(g, s, f) {
        squirrel(g, { eyes: f === 1 ? "happy" : "open", tail: f });
        ell(g, 36, 30, 3, 2, C.furShade);
        mug(g, 38, 25);
        steam(s, f, 40, 23);
      },
    },
    // お昼ご飯：おにぎりをもぐもぐ
    lunch: {
      frames: 2,
      draw(g, s, f) {
        squirrel(g, { eyes: f === 1 ? "happy" : "open", dy: f === 1 ? 1 : 0 });
        const y = f === 1 ? 25 : 26;
        ell(g, 34, y + 6, 2, 2, C.furShade);
        for (let i = 0; i < 6; i++) rect(g, 38 - i, y + i, 39 + i, y + i, C.rice);
        rect(g, 36, y + 3, 41, y + 5, C.nori);
        ell(g, 44, y + 6, 2, 2, C.furShade);
        if (f === 1) dots(s, [[40, y - 1], [42, y + 1]], C.rice);
      },
    },
    // お仕事おしまい：クッションでのんびり
    finish: {
      frames: 2,
      draw(g, s, f) {
        ell(g, 28, 45, 16, 3.5, C.cushion);
        rect(g, 14, 45, 42, 46, C.cushionDark);
        squirrel(g, { eyes: "happy", dy: f, tail: f });
        ell(g, 25, 36 + f, 2.4, 2, C.furShade);
        ell(g, 34, 36 + f, 2.4, 2, C.furShade);
        rect(g, 44, 36, 44, 44, C.stem);
        ell(g, f === 0 ? 42 : 42.5, 35, 2.2, 1.4, C.leaf);
        ell(g, f === 0 ? 46 : 45.5, 33, 2.2, 1.4, C.leaf);
      },
    },
    // おやすみの日：コーヒーを差し出す
    holiday: {
      frames: 2,
      draw(g, s, f) {
        squirrel(g, { eyes: f === 1 ? "happy" : "open", tail: f });
        ell(g, 38, 33, 4, 2, C.furShade);
        mug(g, 40, 29);
        steam(s, f, 42, 27);
      },
    },
  };

  function render(pose, frame) {
    const g = grid();
    const s = grid();
    pose.draw(g, s, frame);
    const body = outline(g);

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    [body, s].forEach((layer) => {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (layer[y][x]) {
            ctx.fillStyle = layer[y][x];
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });
    return canvas;
  }

  const cache = {};

  // 状態名から、アニメーション用のコマ（canvas の配列）を返す
  window.RestKunSprite = {
    frames(status) {
      if (!cache[status]) {
        const pose = POSES[status] || POSES.work;
        cache[status] = Array.from({ length: pose.frames }, (_, i) => render(pose, i));
      }
      return cache[status];
    },
  };
})();
