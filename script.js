/* =========================================================
   OUR QUIZ — app.js
   ---------------------------------------------------------
   Talks to the Google Apps Script Web App (Code.gs) which
   reads/writes Google Sheets, once API_URL below is set.
   Until then it runs in demo mode using localStorage only,
   so the UI can be tested before the Sheet + Apps Script
   deployment is ready.
   ========================================================= */

(function () {
  "use strict";

  /* =========================================================
     ### BACKEND HOOK ###
     วาง URL ที่ได้จากขั้นตอน Deploy > Web app ของ Google Apps Script
     ตรงนี้ (ลงท้ายด้วย /exec) แล้วเว็บจะเปลี่ยนจาก localStorage demo
     ไปใช้ Google Sheets จริงทันที โดยไม่ต้องแก้โค้ดส่วนอื่น

     ปล่อยเป็นค่าว่าง "" ไว้ = เว็บจะทำงานแบบ demo ด้วย localStorage
     (ใช้ทดสอบ UI ได้ก่อนที่ Apps Script จะพร้อม)
  ========================================================= */
  const API_URL = ""; // เช่น "https://script.google.com/macros/s/AKfycb.../exec"

  async function apiGet_(action, user) {
    const res = await fetch(`${API_URL}?action=${action}&user=${user}`);
    return await res.json();
  }
  async function apiPost_(params) {
    const res = await fetch(API_URL, {
      method: "POST",
      body: new URLSearchParams(params) // เลี่ยง CORS preflight โดยตั้งใจ ห้ามเปลี่ยนเป็น JSON.stringify
    });
    return await res.json();
  }

  /* ---------------- i18n dictionary ---------------- */
  const I18N = {
    lo: {
      welcome_hint: "ແຕະໜ້າຈໍເພື່ອເລີ່ມ",
      settings_title: "ຕັ້ງຄ່າ",
      settings_theme: "ໂທນສີ",
      settings_sound: "ສຽງ",
      settings_lang: "ພາສາ",
      close: "ປິດ",
      dash_answer: "ຕອບຄຳຖາມ",
      dash_view: "ເບິ່ງຄຳຕອບ",
      dash_reset: "ລຶບຂໍ້ມູນ ແລະ ຕອບໃໝ່",
      resume_title: "ທ່ານຕອບຄ້າງໄວ້",
      resume_body: "ທ່ານຕ້ອງການຕອບຕໍ່ຈາກເກົ່າ ຫຼື ເລີ່ມໃໝ່ທັງໝົດ?",
      resume_restart: "ເລີ່ມໃໝ່",
      resume_continue: "ຕອບຕໍ່",
      reset_title: "ຢືນຢັນການລຶບ",
      reset_body: "ຄຳຕອບຂອງທ່ານຈະຖືກລຶບເພື່ອເລີ່ມຕອບໃໝ່ ຢືນຢັນ ຫຼື ບໍ່?",
      cancel: "ບໍ່ຢືນຢັນ",
      confirm: "ຢືນຢັນ",
      answer_placeholder: "ພິມຄຳຕອບຂອງທ່ານ...",
      prev: "ຍ້ອນກັບ",
      next: "ຖັດໄປ",
      confirm_done: "ຕອບຄຳຖາມຄົບແລ້ວ!",
      confirm_button: "ຢືນຢັນ",
      view_empty: "ຍັງບໍ່ມີຄຳຕອບເທື່ອ",
      unsaved_warning: "ຄຳຕອບອາດຍັງບໍ່ຖືກບັນທຶກ ທ່ານຕ້ອງການອອກຈາກໜ້ານີ້ບໍ?"
    },
    en: {
      welcome_hint: "Tap anywhere to start",
      settings_title: "Settings",
      settings_theme: "Theme",
      settings_sound: "Sound",
      settings_lang: "Language",
      close: "Close",
      dash_answer: "Answer questions",
      dash_view: "View answers",
      dash_reset: "Reset & answer again",
      resume_title: "You have unfinished answers",
      resume_body: "Continue where you left off, or start over?",
      resume_restart: "Start over",
      resume_continue: "Continue",
      reset_title: "Confirm reset",
      reset_body: "Your answers will be deleted so you can start again. Continue?",
      cancel: "Cancel",
      confirm: "Confirm",
      answer_placeholder: "Type your answer...",
      prev: "Back",
      next: "Next",
      confirm_done: "All done!",
      confirm_button: "Confirm",
      view_empty: "No answers yet",
      unsaved_warning: "Your answer may not be saved yet. Leave this page?"
    }
  };

  /* ---------------- offline fallback question bank ----------------
     ใช้เฉพาะตอน API_URL ยังว่างอยู่ (โหมด demo) หรือถ้าเรียก backend
     ไม่สำเร็จ (เช่น อินเทอร์เน็ตหลุด) — เมื่อ API_URL ถูกตั้งค่าแล้ว
     คำถามจริงจะถูกดึงจาก Questions_Mond / Questions_Fan ใน Google Sheets
  ------------------------------------------------------------- */
  const QUESTION_BANK = {
    mond: [
      { id: 1, lo: "ຄວາມຊົງຈຳທຳອິດທີ່ຈື່ໄດ້ກ່ຽວກັບເຮົາສອງຄົນແມ່ນຫຍັງ?", en: "What is the first memory you have of us?" },
      { id: 2, lo: "ມື້ໃດທີ່ເຈົ້າມີຄວາມສຸກທີ່ສຸດກັບຂ້ອຍ?", en: "Which day were you happiest with me?" },
      { id: 3, lo: "ຖ້າໃຫ້ໄປທ່ຽວນຳກັນ ຢາກໄປໃສທີ່ສຸດ?", en: "If we could travel anywhere together, where would it be?" }
    ],
    fan: [
      { id: 1, lo: "ຄວາມຊົງຈຳທຳອິດທີ່ຈື່ໄດ້ກ່ຽວກັບເຮົາສອງຄົນແມ່ນຫຍັງ?", en: "What is the first memory you have of us?" },
      { id: 2, lo: "ສິ່ງທີ່ຮັກແພງທີ່ສຸດໃນຕົວຂ້ອຍແມ່ນຫຍັງ?", en: "What do you love most about me?" },
      { id: 3, lo: "ຢາກໃຫ້ເຮົາເຮັດຫຍັງນຳກັນໃນປີໜ້າ?", en: "What do you want us to do together next year?" }
    ]
  };

  const PASTEL_CYCLE = ["#F6E9FF", "#E6F3FF", "#FFF0DE", "#E9FFF1", "#FFE9F0", "#EEF0FF"];

  /* ---------------- state ---------------- */
  const state = {
    user: null,          // 'mond' | 'fan'
    theme: localStorage.getItem("oq_theme") || "purple",
    lang: localStorage.getItem("oq_lang") || "lo",
    sound: localStorage.getItem("oq_sound") !== "off",
    qIndex: 0,
    lastBgIndex: -1,
    questions: []         // filled in when entering the question flow for a user
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ---------------- screen navigation ---------------- */
  function showScreen(name) {
    $$(".screen").forEach((s) => s.classList.toggle("active", s.dataset.screen === name));
  }

  /* ---------------- i18n render ---------------- */
  function applyI18n() {
    document.body.dataset.lang = state.lang;
    const dict = I18N[state.lang];
    $$("[data-i18n]").forEach((el) => {
      const key = el.dataset.i18n;
      if (dict[key]) el.textContent = dict[key];
    });
    $$("[data-i18n-placeholder]").forEach((el) => {
      const key = el.dataset.i18nPlaceholder;
      if (dict[key]) el.placeholder = dict[key];
    });
    $$(".lang-btn").forEach((b) => b.classList.toggle("active", b.dataset.langChoice === state.lang));
  }

  /* ---------------- theme ---------------- */
  function applyTheme() {
    document.body.dataset.theme = state.theme;
    $$(".swatch").forEach((s) => s.classList.toggle("selected", s.dataset.themeChoice === state.theme));
    localStorage.setItem("oq_theme", state.theme);
  }

  /* ---------------- draft (always local — this is just the typing backup,
     it protects against refresh/close and is never meant to live in the
     Sheet) ---------------------------------------------------------- */
  const draftKey = (user) => `oq_draft_${user}`;
  function loadDraft(user) {
    try { return JSON.parse(localStorage.getItem(draftKey(user))) || {}; }
    catch { return {}; }
  }
  function saveDraft(user, draft) {
    localStorage.setItem(draftKey(user), JSON.stringify(draft));
  }

  /* ---------------- local fallback "sheet" (used only when API_URL is empty,
     or if a real API call fails) ------------------------------------- */
  const answersKey = (user) => `oq_answers_${user}`;
  function loadAnswersLocal(user) {
    try { return JSON.parse(localStorage.getItem(answersKey(user))) || {}; }
    catch { return {}; }
  }
  function saveAnswerLocal(user, questionId, answerLo) {
    const answers = loadAnswersLocal(user);
    answers[questionId] = { lo: answerLo, en: answerLo /* no real translation in demo mode */, ts: Date.now() };
    localStorage.setItem(answersKey(user), JSON.stringify(answers));
  }
  function deleteAnswersLocal(user) {
    localStorage.removeItem(answersKey(user));
    localStorage.removeItem(draftKey(user));
  }

  /* ---------------- unified data layer ----------------
     These are what the rest of the UI code calls. They use the real
     Google Sheets backend when API_URL is set, and fall back to
     localStorage (demo mode, or if a network call fails) otherwise.
  ----------------------------------------------------- */
  async function getQuestions(user) {
    if (API_URL) {
      try {
        const list = await apiGet_("getQuestions", user);
        if (Array.isArray(list) && list.length) return list;
      } catch (err) { console.error("getQuestions failed, using offline list:", err); }
    }
    return QUESTION_BANK[user];
  }

  async function getAnswers(user) {
    if (API_URL) {
      try { return await apiGet_("getAnswers", user); }
      catch (err) { console.error("getAnswers failed, using local copy:", err); }
    }
    return loadAnswersLocal(user);
  }

  async function saveAnswer(user, questionId, answerLo) {
    if (API_URL) {
      try {
        await apiPost_({ action: "saveAnswer", user, questionId, answerLo });
        return;
      } catch (err) { console.error("saveAnswer failed, saved locally instead:", err); }
    }
    saveAnswerLocal(user, questionId, answerLo);
  }

  async function deleteAnswers(user) {
    if (API_URL) {
      try {
        await apiPost_({ action: "deleteAnswers", user });
      } catch (err) { console.error("deleteAnswers (remote) failed:", err); }
    }
    deleteAnswersLocal(user); // clear the local copy/draft either way
  }

  /* ---------------- random, non-repeating pastel background ---------------- */
  function randomizeQuestionBg() {
    let idx;
    do { idx = Math.floor(Math.random() * PASTEL_CYCLE.length); }
    while (idx === state.lastBgIndex);
    state.lastBgIndex = idx;
    $("#screen-question").style.background = PASTEL_CYCLE[idx];
  }

  /* ---------------- question flow ---------------- */
  async function renderQuestion() {
    const list = state.questions;
    const q = list[state.qIndex];
    $("#question-progress").textContent = `${state.qIndex + 1} / ${list.length}`;
    $("#question-text").textContent = state.lang === "lo" ? q.lo : q.en;
    const draft = loadDraft(state.user);
    const answers = await getAnswers(state.user);
    const saved = answers[q.id];
    $("#answer-input").value = draft[q.id] ?? (saved ? saved.lo : "");
    randomizeQuestionBg();
  }

  async function goToQuestionScreen() {
    state.questions = await getQuestions(state.user);
    const answers = await getAnswers(state.user);
    const draft = loadDraft(state.user);
    const hasProgress = Object.keys(draft).length > 0 || Object.keys(answers).length > 0;
    const answeredCount = Object.keys(answers).length;

    if (hasProgress && answeredCount > 0 && answeredCount < state.questions.length) {
      $("#resume-overlay").classList.add("active");
    } else {
      state.qIndex = answeredCount < state.questions.length ? answeredCount : 0;
      showScreen("question");
      renderQuestion();
    }
  }

  async function commitCurrentAnswer() {
    const q = state.questions[state.qIndex];
    const text = $("#answer-input").value.trim();
    if (!text) return;
    await saveAnswer(state.user, q.id, text);
    const draft = loadDraft(state.user);
    delete draft[q.id];
    saveDraft(state.user, draft);
  }

  function stashDraft() {
    const q = state.questions[state.qIndex];
    const draft = loadDraft(state.user);
    draft[q.id] = $("#answer-input").value;
    saveDraft(state.user, draft); // ---- LocalStorage backup so refresh/close never loses in-progress typing
  }

  /* ---------------- view answers ---------------- */
  async function renderViewList() {
    const list = await getQuestions(state.user);
    const answers = await getAnswers(state.user);
    const container = $("#view-list");
    container.innerHTML = "";
    const answeredIds = Object.keys(answers);
    $("#view-empty").hidden = answeredIds.length > 0;

    list.forEach((q) => {
      const a = answers[q.id];
      if (!a) return;
      const row = document.createElement("button");
      row.className = "answer-card-row";
      row.textContent = state.lang === "lo" ? q.lo : q.en;
      row.addEventListener("click", () => {
        $("#detail-question").textContent = state.lang === "lo" ? q.lo : q.en;
        $("#detail-answer").textContent = state.lang === "lo" ? a.lo : a.en;
        $("#answer-detail-overlay").classList.add("active");
      });
      container.appendChild(row);
    });
  }

  /* ---------------- wire up events ---------------- */
  function init() {
    applyTheme();
    applyI18n();

    // Welcome -> tap anywhere
    $("#screen-welcome").addEventListener("click", () => {
      if (state.sound) {
        const bgm = $("#bgm");
        bgm.play().catch(() => {}); // autoplay only unlocks after a user gesture — this click is that gesture
      }
      showScreen("select");
    });

    // Player select
    $("#btn-select-mond").addEventListener("click", () => enterDashboard("mond"));
    $("#btn-select-fan").addEventListener("click", () => enterDashboard("fan"));

    function enterDashboard(user) {
      state.user = user;
      $("#dashboard-username").textContent = user === "mond" ? "ມົນ" : "ແຟນ";
      showScreen("dashboard");
    }

    // Back buttons
    $$("[data-back-to]").forEach((btn) => {
      btn.addEventListener("click", () => showScreen(btn.dataset.backTo));
    });

    // Settings sheet
    $("#btn-open-settings").addEventListener("click", () => $("#settings-overlay").classList.add("active"));
    $("#btn-close-settings").addEventListener("click", () => $("#settings-overlay").classList.remove("active"));
    $$(".swatch").forEach((s) => s.addEventListener("click", () => { state.theme = s.dataset.themeChoice; applyTheme(); }));
    $$(".lang-btn").forEach((b) => b.addEventListener("click", () => {
      state.lang = b.dataset.langChoice;
      localStorage.setItem("oq_lang", state.lang);
      applyI18n();
    }));
    $("#toggle-sound").addEventListener("change", (e) => {
      state.sound = e.target.checked;
      localStorage.setItem("oq_sound", state.sound ? "on" : "off");
      const bgm = $("#bgm");
      if (!state.sound) bgm.pause(); else bgm.play().catch(() => {});
    });
    $("#toggle-sound").checked = state.sound;

    // Dashboard actions
    $("#btn-go-answer").addEventListener("click", goToQuestionScreen);
    $("#btn-go-view").addEventListener("click", async () => { await renderViewList(); showScreen("view"); });
    $("#btn-go-reset").addEventListener("click", () => $("#reset-overlay").classList.add("active"));

    // Resume prompt
    $("#btn-resume-continue").addEventListener("click", async () => {
      $("#resume-overlay").classList.remove("active");
      const answers = await getAnswers(state.user);
      state.qIndex = Object.keys(answers).length;
      showScreen("question");
      renderQuestion();
    });
    $("#btn-resume-restart").addEventListener("click", async () => {
      $("#resume-overlay").classList.remove("active");
      await deleteAnswers(state.user);
      state.qIndex = 0;
      showScreen("question");
      renderQuestion();
    });

    // Reset confirm
    $("#btn-reset-cancel").addEventListener("click", () => $("#reset-overlay").classList.remove("active"));
    $("#btn-reset-confirm").addEventListener("click", async () => {
      await deleteAnswers(state.user);
      $("#reset-overlay").classList.remove("active");
    });

    // Question nav
    $("#btn-q-next").addEventListener("click", async () => {
      await commitCurrentAnswer();
      if (state.qIndex < state.questions.length - 1) {
        state.qIndex += 1;
        renderQuestion();
      } else {
        showScreen("confirm");
      }
    });
    $("#btn-q-prev").addEventListener("click", () => {
      stashDraft();
      if (state.qIndex > 0) {
        state.qIndex -= 1;
        renderQuestion();
      } else {
        showScreen("dashboard");
      }
    });
    $("#answer-input").addEventListener("input", stashDraft);

    // Confirm screen
    $("#btn-confirm-submit").addEventListener("click", () => showScreen("dashboard"));

    // Answer detail popup
    $("#btn-close-detail").addEventListener("click", () => $("#answer-detail-overlay").classList.remove("active"));

    // Guard against losing an in-progress answer on refresh/close
    window.addEventListener("beforeunload", (e) => {
      const onQuestionScreen = $("#screen-question").classList.contains("active");
      const hasText = $("#answer-input") && $("#answer-input").value.trim().length > 0;
      if (onQuestionScreen && hasText) {
        e.preventDefault();
        e.returnValue = I18N[state.lang].unsaved_warning;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
