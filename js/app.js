(function () {
  "use strict";

  // ---------- 定数 ----------

  const STORAGE_KEY = "re-clock:settings:v1";
  const FRAME_INTERVAL_MS = 850;
  const MAX_FRAMES = 3;
  const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

  const DEFAULTS = Object.freeze({
    workStart: "08:00",
    lunchStart: "12:30",
    lunchEnd: "13:30",
    workEnd: "18:00",
    breakEnabled: true,
    focusMin: 25,
    breakMin: 5,
    workDays: [1, 2, 3, 4, 5],
    showSeconds: false,
  });

  const STATUSES = {
    prepare: { label: "身支度中", message: "今日も|ゆっくり始めよう", pose: "お仕事の準備中" },
    work: { label: "お仕事中", message: "がんばるぞ！", pose: "PCで作業中" },
    break: { label: "ひと休み", message: "ちょっと休憩", pose: "コーヒーでひと息" },
    lunch: { label: "お昼ご飯", message: "もぐもぐ", pose: "ごはん中" },
    finish: { label: "お仕事おしまい", message: "今日も|いっぱい働いた", pose: "のんびり中" },
    holiday: {
      label: "おやすみの日",
      // 「|」は折り返してよい位置、「\n」は必ず改行する位置
      message: "おや、|今日もお仕事？|お疲れさま！\nでも休憩も|大切だから、|無理しないでね◎",
      pose: "コーヒーをどうぞ",
    },
  };

  // ---------- 設定の読み書き（LocalStorage が使えない環境でも動くように） ----------

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* 読めなければ初期設定で動かす */ }
    return normalize({});
  }

  function saveSettings(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return true;
    } catch (e) {
      return false;
    }
  }

  function normalize(s) {
    const out = Object.assign({}, DEFAULTS, s);
    out.workDays = Array.isArray(out.workDays)
      ? [...new Set(out.workDays.map(Number).filter((d) => d >= 0 && d <= 6))].sort()
      : DEFAULTS.workDays.slice();
    out.focusMin = clampInt(out.focusMin, 1, 240, DEFAULTS.focusMin);
    out.breakMin = clampInt(out.breakMin, 1, 120, DEFAULTS.breakMin);
    ["workStart", "lunchStart", "lunchEnd", "workEnd"].forEach((k) => {
      if (toMinutes(out[k]) === null) out[k] = DEFAULTS[k];
    });
    out.breakEnabled = Boolean(out.breakEnabled);
    out.showSeconds = Boolean(out.showSeconds);
    return out;
  }

  function clampInt(v, min, max, fallback) {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  function toMinutes(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm));
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    return h < 24 && min < 60 ? h * 60 + min : null;
  }

  // ---------- ステータス判定 ----------

  function getStatus(now, s) {
    if (!s.workDays.includes(now.getDay())) return "holiday";

    const t = now.getHours() * 60 + now.getMinutes();
    const workStart = toMinutes(s.workStart);
    const workEnd = toMinutes(s.workEnd);
    const lunchStart = toMinutes(s.lunchStart);
    const lunchEnd = toMinutes(s.lunchEnd);
    const hasLunch = lunchStart < lunchEnd;

    if (t < workStart) return "prepare";
    if (t >= workEnd) return "finish";
    if (hasLunch && t >= lunchStart && t < lunchEnd) return "lunch";
    if (!s.breakEnabled) return "work";

    // 集中→休憩のサイクルは勤務開始から数え、昼休み明けはそこから数え直す
    const origin = hasLunch && t >= lunchEnd && lunchEnd > workStart ? lunchEnd : workStart;
    const pos = (t - origin) % (s.focusMin + s.breakMin);
    return pos >= s.focusMin ? "break" : "work";
  }

  // ---------- 画面 ----------

  const el = {
    widget: document.getElementById("widget"),
    status: document.getElementById("status"),
    date: document.getElementById("date"),
    time: document.getElementById("time"),
    message: document.getElementById("message"),
    character: document.getElementById("character"),
  };

  let settings = loadSettings();
  let currentStatus = null;

  const pad = (n) => String(n).padStart(2, "0");

  function renderClock() {
    const now = new Date();
    el.date.textContent = `${pad(now.getMonth() + 1)}.${pad(now.getDate())}`;
    const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    el.widget.classList.toggle("with-seconds", settings.showSeconds);
    if (settings.showSeconds) {
      el.time.innerHTML = `${hm}<span class="sec">${pad(now.getSeconds())}</span>`;
    } else {
      el.time.textContent = hm;
    }

    // 日付をまたいでも毎回判定し直すので、再読み込みは不要
    const status = getStatus(now, settings);
    if (status !== currentStatus) applyStatus(status);
  }

  function applyStatus(status) {
    currentStatus = status;
    const info = STATUSES[status];
    el.widget.dataset.status = status;
    el.status.textContent = info.label;
    renderMessage(info.message);
    // 切り替わったときだけ、ぽんっと出てくる動きをつける
    el.message.classList.remove("pop");
    void el.message.offsetWidth;
    el.message.classList.add("pop");
    el.message.classList.toggle("long", info.message.length > 24);
    el.character.setAttribute("aria-label", `レストくん（${info.pose}）`);
    showCharacter(status);
  }

  // 文節ごとに折り返さない塊にして、「お疲れさ／ま！」のような変な位置での改行を防ぐ
  function renderMessage(text) {
    el.message.replaceChildren();
    text.split("\n").forEach((line, i) => {
      if (i > 0) el.message.appendChild(document.createElement("br"));
      line.split("|").forEach((phrase) => {
        const span = document.createElement("span");
        span.className = "phrase";
        span.textContent = phrase;
        el.message.appendChild(span);
      });
    });
  }

  // 次の秒の頭に合わせて更新する（setInterval だと少しずつずれるため）
  function tick() {
    renderClock();
    setTimeout(tick, 1000 - (Date.now() % 1000) + 10);
  }

  // バックグラウンドのタブではタイマーが間引かれるので、戻ったらすぐ更新
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) renderClock();
  });

  // ---------- キャラクター（assets/rest-kun/<状態>-01.png, -02.png ... を順に切り替える） ----------

  const framesCache = {};
  // OS の「視差効果を減らす／アニメーションを減らす」設定のときはアニメーションしない
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let animTimer = null;
  let frameIndex = 0;

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.alt = "";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // 読み込めたコマだけを使う（3コマ目を足したいときは画像を置くだけでよい）
  function loadFrames(status) {
    if (!framesCache[status]) {
      framesCache[status] = (async () => {
        const frames = [];
        for (let i = 1; i <= MAX_FRAMES; i++) {
          const img = await loadImage(`./assets/rest-kun/${status}-${pad(i)}.png`);
          if (!img) break;
          frames.push(img);
        }
        return frames;
      })();
    }
    return framesCache[status];
  }

  async function showCharacter(status) {
    const frames = await loadFrames(status);
    if (status !== currentStatus || !frames.length) return;

    clearInterval(animTimer);
    frameIndex = 0;
    el.character.replaceChildren(frames[0]);
    if (frames.length < 2 || reducedMotion.matches) return;
    animTimer = setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      el.character.replaceChildren(frames[frameIndex]);
    }, FRAME_INTERVAL_MS);
  }

  // ---------- 設定モーダル ----------

  const modal = document.getElementById("modal");
  const form = document.getElementById("settings-form");
  const daysBox = document.getElementById("days");
  const errorBox = document.getElementById("form-error");
  const resetArea = document.getElementById("reset-area");
  const openBtn = document.getElementById("open-settings");

  // 時刻は「時」「分」のプルダウンで選ぶ（分は5分刻み）
  const TIME_FIELDS = ["workStart", "workEnd", "lunchStart", "lunchEnd"];
  const MINUTE_STEP = 5;

  function makeSelect(name, label, values, unit) {
    const sel = document.createElement("select");
    sel.name = name;
    sel.setAttribute("aria-label", label);
    values.forEach((v) => sel.add(new Option(pad(v), pad(v))));
    const wrap = document.createElement("span");
    wrap.className = "time-part";
    wrap.append(sel, unit);
    return wrap;
  }

  form.querySelectorAll(".time-select").forEach((box) => {
    const { name, label } = box.dataset;
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const minutes = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);
    box.append(
      makeSelect(`${name}H`, `${label}（時）`, hours, "時"),
      makeSelect(`${name}M`, `${label}（分）`, minutes, "分")
    );
  });

  function setTime(name, hhmm) {
    const [h, m] = hhmm.split(":");
    const minSel = form.elements[`${name}M`];
    // 以前に5分刻み以外で保存された値も選べるようにしておく
    if (![...minSel.options].some((o) => o.value === m)) {
      minSel.add(new Option(m, m));
      [...minSel.options].sort((a, b) => a.value - b.value).forEach((o) => minSel.add(o));
    }
    form.elements[`${name}H`].value = h;
    minSel.value = m;
  }

  function getTime(name) {
    return `${form.elements[`${name}H`].value}:${form.elements[`${name}M`].value}`;
  }

  DAY_LABELS.forEach((label, day) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "day";
    b.textContent = label;
    b.dataset.day = String(day);
    b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => {
      b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true"));
    });
    daysBox.appendChild(b);
  });

  function fillForm(s) {
    TIME_FIELDS.forEach((k) => setTime(k, s[k]));
    form.elements.focusMin.value = s.focusMin;
    form.elements.breakMin.value = s.breakMin;
    form.elements.breakEnabled.checked = s.breakEnabled;
    form.elements.showSeconds.checked = s.showSeconds;
    daysBox.querySelectorAll(".day").forEach((b) => {
      b.setAttribute("aria-pressed", String(s.workDays.includes(Number(b.dataset.day))));
    });
    syncBreakFields();
    errorBox.textContent = "";
  }

  function readForm() {
    const f = form.elements;
    return {
      workStart: getTime("workStart"),
      workEnd: getTime("workEnd"),
      lunchStart: getTime("lunchStart"),
      lunchEnd: getTime("lunchEnd"),
      breakEnabled: f.breakEnabled.checked,
      focusMin: f.focusMin.value,
      breakMin: f.breakMin.value,
      showSeconds: f.showSeconds.checked,
      workDays: [...daysBox.querySelectorAll('.day[aria-pressed="true"]')].map((b) => Number(b.dataset.day)),
    };
  }

  // 問題があれば { message, field }（直してほしい欄の name）を返す
  function validate(raw) {
    const m = (k) => toMinutes(raw[k]);
    if (m("workStart") >= m("workEnd")) {
      return { message: "勤務終了は、勤務開始より後の時刻にしてください。", field: "workEndH" };
    }
    if (m("lunchStart") >= m("lunchEnd")) {
      return { message: "昼休みの終わりは、始まりより後の時刻にしてください。", field: "lunchEndH" };
    }
    if (m("lunchStart") < m("workStart") || m("lunchEnd") > m("workEnd")) {
      return {
        message: `昼休みは勤務時間（${raw.workStart}〜${raw.workEnd}）の中に設定してください。`,
        field: "lunchStartH",
      };
    }
    if (raw.breakEnabled) {
      const ok = (v, max) => /^\d+$/.test(String(v)) && Number(v) >= 1 && Number(v) <= max;
      if (!ok(raw.focusMin, 240)) return { message: "集中時間は 1〜240 分で入力してください。", field: "focusMin" };
      if (!ok(raw.breakMin, 120)) return { message: "休憩時間は 1〜120 分で入力してください。", field: "breakMin" };
    }
    return null;
  }

  function syncBreakFields() {
    const on = form.elements.breakEnabled.checked;
    form.querySelectorAll(".break-only").forEach((node) => {
      node.classList.toggle("is-disabled", !on);
      node.querySelector("input").disabled = !on;
    });
  }

  function openModal() {
    fillForm(settings);
    resetResetArea();
    modal.hidden = false;
    el.widget.inert = true;
    form.elements.workStartH.focus();
  }

  function closeModal() {
    modal.hidden = true;
    el.widget.inert = false;
    openBtn.focus();
  }

  function applySettings(next) {
    settings = normalize(next);
    const saved = saveSettings(settings);
    currentStatus = null; // 表示を必ず更新する
    renderClock();
    return saved;
  }

  // 「初期設定に戻す」はその場で確認する（Notion の埋め込みでは confirm() が出ないことがあるため）
  function resetResetArea() {
    resetArea.innerHTML = '<button type="button" class="btn-text" id="reset">初期設定に戻す</button>';
    resetArea.querySelector("#reset").addEventListener("click", askReset);
  }

  function askReset() {
    resetArea.innerHTML =
      '<span>初期設定に戻しますか？</span>' +
      '<button type="button" class="btn-small danger" data-act="yes">戻す</button>' +
      '<button type="button" class="btn-small" data-act="no">やめる</button>';
    // ここではフォームに初期値を入れるだけ。ほかの変更と同じく「保存」で確定する
    resetArea.querySelector('[data-act="yes"]').addEventListener("click", () => {
      fillForm(normalize(DEFAULTS));
      resetArea.innerHTML = '<span class="note">初期設定を入れました。「保存」で確定します。</span>';
      form.querySelector(".btn-primary").focus();
    });
    resetArea.querySelector('[data-act="no"]').addEventListener("click", resetResetArea);
    resetArea.querySelector('[data-act="no"]').focus();
  }

  openBtn.addEventListener("click", openModal);
  document.getElementById("close-settings").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => {
    if (modal.hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "Tab") {
      const items = [...form.querySelectorAll("button, select, input")].filter((n) => !n.disabled && n.offsetParent);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  // 直し始めたらエラー表示を消す
  form.addEventListener("change", (e) => {
    e.target.removeAttribute("aria-invalid");
    errorBox.textContent = "";
  });
  form.elements.breakEnabled.addEventListener("change", syncBreakFields);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const raw = readForm();
    const err = validate(raw);
    if (err) {
      errorBox.textContent = err.message;
      const field = form.elements[err.field];
      field.setAttribute("aria-invalid", "true");
      field.focus();
      field.scrollIntoView({ block: "nearest" });
      return;
    }
    if (!raw.breakEnabled) {
      // 無効化中の入力欄は空のこともあるので、今の値を引き継ぐ
      raw.focusMin = settings.focusMin;
      raw.breakMin = settings.breakMin;
    }
    if (!applySettings(raw)) {
      errorBox.textContent = "このブラウザでは設定を保存できません（今の表示にだけ反映しました）。";
      return;
    }
    closeModal();
  });

  // ---------- 起動 ----------

  // テスト用に判定関数だけ外から呼べるようにしておく
  window.ReClock = { getStatus, normalize, DEFAULTS };

  tick();
  // 状態が切り替わった瞬間に絵が遅れないよう、全状態の画像を先に読んでおく
  Object.keys(STATUSES).forEach(loadFrames);
})();
