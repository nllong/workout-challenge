(() => {
  "use strict";
  const C = window.WorkoutCore;
  const Joy = window.WorkoutJoy;
  const finaleParty = Joy.createCelebration(document.getElementById("confetti-canvas"));
  const $ = id => document.getElementById(id);
  const timerAlerts = window.WorkoutAlerts.create(window, document);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let config, days, selected, today, storageFailed = false;
  const memory = new Map(), timers = new Set();
  let lastLocalDate;
  function read(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); }
    catch (_) { storageFailed = true; return memory.get(key) || null; }
  }
  function write(key, value) {
    memory.set(key, value);
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (_) { storageFailed = true; }
    $("storage-warning").hidden = !storageFailed;
  }
  // Full encoded plan namespaces logs: redeploys cannot accidentally reuse old progress.
  let storageKey, logs;
  function dayLog(n) {
    const v = logs[n];
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  }
  function saveDay(n, value) {
    const wasComplete = isComplete(n);
    logs[n] = value;
    const nowComplete = isComplete(n);
    if (nowComplete && !wasComplete) logs[n].completedAt = new Date().toISOString();
    if (!nowComplete) delete logs[n].completedAt;
    write(storageKey, logs); renderProgress(); updateCompletion();
    if (n === 30 && nowComplete && !wasComplete) finaleParty.start();
  }
  function isComplete(n) {
    const d = days[n - 1], log = dayLog(n);
    if (d.kind === "rest") return log.rest === true;
    return d.exercises.every(e => log["done" + e.index] === true &&
      (d.kind !== "test" || (Number.isInteger(log["max" + e.index]) && log["max" + e.index] >= 0)));
  }
  function internalUrl(n) { return C.dayUrl(location.href, config, n); }
  function goLink(node, n, label) { node.href = internalUrl(n); node.dataset.day = String(n); if (label) node.textContent = label; }
  function formatDate(date, options) { return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...options }).format(new Date(date + "T12:00:00Z")); }
  function formatTime(seconds) { return String(Math.floor(seconds / 60)).padStart(2, "0") + ":" + String(seconds % 60).padStart(2, "0"); }
  function disposeTimers() { timers.forEach(clearInterval); timers.clear(); timerAlerts.dismiss(); }
  function makeTimer(e, kind, maxInput) {
    const box = el("div", "timer");
    const output = el("output", "timer-display", kind === "test" ? "00:00" : formatTime(e.amount));
    output.setAttribute("aria-label", e.name + (kind === "test" ? " elapsed time" : " time remaining"));
    // Announce completion only, avoiding a screen-reader announcement every second.
    const announcement = el("span", "sr-only"); announcement.setAttribute("role", "status");
    const start = el("button", "button timer-button", kind === "test" ? "Start max timer" : "Start timer"); start.type = "button";
    const reset = el("button", "button secondary", "Reset"); reset.type = "button";
    let running = false, remaining = kind === "test" ? 0 : e.amount * 1000, anchor = 0, interval;
    function paint() {
      const ms = running ? (kind === "test" ? remaining + Date.now() - anchor : Math.max(0, remaining - (Date.now() - anchor))) : remaining;
      const seconds = kind === "test" ? Math.floor(ms / 1000) : Math.ceil(ms / 1000);
      output.textContent = formatTime(seconds);
      if (running && kind !== "test" && ms <= 0) {
        remaining = 0; running = false; clearInterval(interval); timers.delete(interval);
        start.textContent = "Start again"; announcement.textContent = e.name + " timer complete. Mark the exercise done when ready.";
        box.classList.add("finished");
        timerAlerts.finished(e.name, internalUrl(selected));
      }
      return ms;
    }
    start.addEventListener("click", () => {
      if (running) {
        const ms = paint();
        if (!running) return;
        remaining = ms; running = false; clearInterval(interval); timers.delete(interval);
        start.textContent = kind === "test" ? "Resume max timer" : "Resume";
        if (kind === "test") {
          maxInput.value = String(Math.floor(remaining / 1000));
          maxInput.dispatchEvent(new Event("input", { bubbles: true }));
          announcement.textContent = "Max saved: " + maxInput.value + " seconds.";
        }
      } else {
        if (kind !== "test") timerAlerts.unlockSound();
        if (kind !== "test" && remaining <= 0) remaining = e.amount * 1000;
        anchor = Date.now(); running = true; box.classList.remove("finished"); announcement.textContent = "";
        start.textContent = kind === "test" ? "Stop & log" : "Pause";
        interval = setInterval(paint, 200); timers.add(interval); paint();
      }
    });
    reset.addEventListener("click", () => {
      clearInterval(interval); timers.delete(interval); running = false; remaining = kind === "test" ? 0 : e.amount * 1000;
      start.textContent = kind === "test" ? "Start max timer" : "Start timer"; box.classList.remove("finished"); announcement.textContent = ""; paint();
    });
    box.append(output, start, reset, announcement); return box;
  }
  function renderExercises(d) {
    const container = $("exercises"); container.replaceChildren();
    const log = dayLog(d.day);
    if (d.kind === "rest") {
      const card = el("div", "rest-card"); card.append(el("span", "rest-symbol", "☁"), el("h3", "", "Rest day, best day."), el("p", "muted", d.day === 29 && days[29].kind === "finale" ? "No reps to chase today. Recharge for the big finish tomorrow!" : "No reps to chase today. Enjoy your well-earned recharge!"));
      const label = el("label", "done-label"); const check = document.createElement("input"); check.type = "checkbox"; check.checked = log.rest === true;
      check.addEventListener("change", () => saveDay(d.day, { ...dayLog(d.day), rest: check.checked }));
      label.append(check, document.createTextNode("Rest day complete")); card.append(label); container.append(card); return;
    }
    d.exercises.forEach(e => {
      const card = el("article", "exercise-card"); const top = el("div", "exercise-top");
      const name = el("h3", "", e.name); name.id = "exercise-" + e.index;
      const target = el("div", "target");
      target.append(el("strong", "", d.kind === "test" ? "MAX" : e.type === "timed" ? C.duration(e.amount) : String(e.amount)), el("span", "", e.type === "timed" ? (d.kind === "test" ? "seconds" : "min:sec") : "reps"));
      top.append(name, target); card.append(top);
      if (d.kind === "deload") card.append(el("p", "deload-note", "Lighter target · full credit!"));
      let maxInput;
      if (d.kind === "test") {
        const label = el("label", "max-label", "Your max (" + (e.type === "timed" ? "seconds" : "reps") + ")");
        maxInput = document.createElement("input"); maxInput.type = "number"; maxInput.min = "0"; maxInput.max = "1000000"; maxInput.step = "1"; maxInput.inputMode = "numeric";
        maxInput.id = "max-" + e.index; label.htmlFor = maxInput.id; maxInput.placeholder = "Log your max";
        if (Number.isInteger(log["max" + e.index])) maxInput.value = log["max" + e.index];
        maxInput.addEventListener("input", () => {
          const value = maxInput.valueAsNumber; const nextLog = { ...dayLog(d.day) };
          if (maxInput.value !== "" && maxInput.validity.valid && Number.isInteger(value)) nextLog["max" + e.index] = value;
          else delete nextLog["max" + e.index];
          saveDay(d.day, nextLog);
        });
        card.append(label, maxInput);
      }
      if (e.type === "timed") card.append(makeTimer(e, d.kind, maxInput));
      const label = el("label", "done-label"); const check = document.createElement("input"); check.type = "checkbox"; check.checked = log["done" + e.index] === true;
      label.append(check, document.createTextNode("Done"), el("span", "sr-only", " with " + e.name));
      check.addEventListener("change", () => {
        card.classList.toggle("is-done", check.checked);
        saveDay(d.day, { ...dayLog(d.day), ["done" + e.index]: check.checked });
      });
      card.classList.toggle("is-done", check.checked); card.append(label); container.append(card);
    });
  }
  function restoreTrackerCheckIn() {
    const saved = dayLog(selected).checkIn || {};
    $("tracker-modified").value = ["yes", "no"].includes(saved.modified) ? saved.modified : "";
    $("tracker-modifications").value = typeof saved.modifications === "string" ? saved.modifications : "";
    $("tracker-rpe").value = Number.isInteger(saved.rpe) && saved.rpe >= 0 && saved.rpe <= 10 ? String(saved.rpe) : "";
    $("tracker-copy-status").textContent = "";
  }
  function updateTracker() {
    const done = isComplete(selected);
    $("tracker-checkin").hidden = !done;
    $("tracker-modification-details").hidden = $("tracker-modified").value !== "yes";
    $("tracker-rpe-optional").hidden = days[selected - 1].kind !== "rest";
    let note = "";
    if (done) {
      try { note = C.trackerNote(config, selected, dayLog(selected)); $("tracker-hint").textContent = "Ready for your tracker chat!"; }
      catch (err) { $("tracker-hint").textContent = err.message; }
    }
    $("tracker-note").value = note;
    $("tracker-preview").hidden = !note;
    $("tracker-copy").disabled = !note;
  }
  function saveTrackerCheckIn() {
    const rpe = $("tracker-rpe").value;
    $("tracker-copy-status").textContent = "";
    saveDay(selected, { ...dayLog(selected), checkIn: {
      modified: $("tracker-modified").value,
      modifications: $("tracker-modifications").value,
      rpe: rpe === "" ? null : Number(rpe)
    } });
  }
  async function copyTrackerNote() {
    const day = selected;
    let note;
    try { note = C.trackerNote(config, day, dayLog(day)); }
    catch (err) { $("tracker-copy-status").textContent = err.message; return; }
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(note);
      if (selected === day) $("tracker-copy-status").textContent = "Copied! Paste it into your workout tracker chat.";
    } catch (_) {
      if (selected !== day) return;
      const field = $("tracker-note"); field.focus(); field.select(); field.setSelectionRange(0, field.value.length);
      $("tracker-copy-status").textContent = "Automatic copying is unavailable. Your note is selected — use Copy from your device's menu or Ctrl+C / ⌘C.";
    }
  }
  function updateCompletion() {
    const done = isComplete(selected), d = days[selected - 1];
    $("completed").hidden = !done;
    $("finale-celebration").hidden = selected !== 30 || !done;
    $("completed").textContent = selected === 30 ? (d.kind === "finale" ? "★ Finale complete! Give yourself a big high five." : "★ Day 30 complete! Give yourself a big high five.") : d.kind === "deload" ? "★ Deload done! Lighter day, full gold star." : d.kind === "rest" ? "★ Recharge complete. Rest gets a gold star, too." : "★ Day complete! That deserves a happy dance.";
    const teaser = $("up-next"); teaser.replaceChildren(); teaser.hidden = !done;
    if (done && selected < 30) {
      const nextDay = days[selected]; teaser.append(el("p", "eyebrow", "UP NEXT · DAY " + nextDay.day));
      teaser.append(el("p", "", "Another day, another small win. Open the next day to see what's waiting for you."));
      const link = el("a", "text-link", "Open day " + nextDay.day + " →"); goLink(link, nextDay.day); teaser.append(link);
    } else if (done) {
      teaser.append(el("p", "", "Days completed: " + days.filter(x => isComplete(x.day)).length + " of 30. You can revisit any day in the progress grid."));
    }
    if (!done && d.kind === "test") $("completed").textContent = "";
    updateTracker();
  }
  function displayTarget(e) { return e.type === "timed" ? C.duration(e.amount) + " " + e.name : e.amount + " " + e.name; }
  function sessionLabel(d) { return ({ workout: "Workout", deload: "Deload", rest: "Rest", finale: "Finale", test: "Max test" })[d.kind]; }
  function renderProgress() {
    const completed = days.filter(d => isComplete(d.day)).length;
    $("progress-count").textContent = completed + " / 30";
    $("progress-bar").value = completed;
    const grid = $("progress-grid"); grid.replaceChildren();
    days.forEach(d => {
      const done = isComplete(d.day), link = el("a", "grid-day" + (done ? " complete" : "") + (d.day === selected ? " selected" : ""), String(d.day).padStart(2, "0"));
      goLink(link, d.day);
      link.setAttribute("aria-label", "Day " + d.day + (done ? ", complete" : ", not complete") + (d.day === today.day && today.raw >= 1 && today.raw <= 30 ? ", today" : ""));
      if (d.day === selected) link.setAttribute("aria-current", "page");
      grid.append(link);
    });
    $("storage-warning").hidden = !storageFailed;
  }
  function renderDay() {
    disposeTimers(); finaleParty.stop();
    const d = days[selected - 1]; renderMood(d); document.title = "Day " + selected + " / " + config.title;
    $("day-title").textContent = "Day " + String(selected).padStart(2, "0") + ".";
    $("day-date").textContent = formatDate(d.date, { weekday: "long", month: "long", day: "numeric" });
    $("day-kind").textContent = d.kind === "test" ? "MAX TEST · MEASURE YOUR MOMENTUM" : d.kind === "rest" ? "REST DAY · RECHARGE YOUR SPARKLE" : d.kind === "deload" ? "DELOAD DAY · TAKE IT LIGHT" : d.kind === "finale" ? "DAY 30 · THE BIG FINISH" : selected === today.raw ? "TODAY'S WORK" : "WORKOUT · PREVIEW";
    $("day-instruction").textContent = d.kind === "test" ? "Log your max for each exercise, then check Done. A max of 0 is valid." :
      d.kind === "rest" ? "Today's mission: recharge. Check off your rest day when you're ready." : d.kind === "deload" ? "These are your lighter targets. A deload day counts just as much!" : d.kind === "finale" ? "Your final targets are here. One exercise at a time. You've got this!" : "One little win at a time. Check each exercise off as you go.";
    $("today-link").hidden = selected === today.day; goLink($("today-link"), today.day, today.raw < 1 ? "Back to day one ↗" : today.raw > 30 ? "Back to last day ↗" : "Back to today ↗");
    $("previous").hidden = selected === 1; if (selected > 1) goLink($("previous"), selected - 1, "← Previous day");
    $("next").hidden = selected === 30; if (selected < 30) goLink($("next"), selected + 1, "Next day →");
    renderExercises(d); renderProgress(); restoreTrackerCheckIn(); updateCompletion();
  }
  function renderPlan() {
    const table = $("plan-table"); const head = document.createElement("thead"), row = document.createElement("tr");
    ["Day", "Date", "Session", ...config.exercises.map(e => e.name + (e.type === "timed" ? " (m:ss)" : " (reps)"))].forEach(t => { const th = el("th", "", t); th.scope = "col"; row.append(th); });
    head.append(row); const body = document.createElement("tbody");
    days.forEach(d => {
      const tr = el("tr", d.kind), th = el("th"); th.scope = "row";
      const link = el("a", "", String(d.day).padStart(2, "0")); goLink(link, d.day); th.append(link); tr.append(th);
      tr.append(el("td", "", formatDate(d.date, { month: "short", day: "numeric" })), el("td", "session " + d.kind, sessionLabel(d)));
      config.exercises.forEach((_, i) => tr.append(el("td", "", d.kind === "rest" ? "—" : d.kind === "test" ? "Max" : d.exercises[i].type === "timed" ? C.duration(d.exercises[i].amount) : String(d.exercises[i].amount))));
      body.append(tr);
    });
    table.replaceChildren(head, body);
    $("plan-explainer").textContent = config.version === 2 ? "Timed targets are minutes:seconds. Deload days: " + days.filter(d => d.kind === "deload").map(d => d.day).join(", ") + ". Rest day: " + days.filter(d => d.kind === "rest").map(d => d.day).join(", ") + ". Day 30 is a fixed-target finale. All 30 days are included in the calendar." : "Targets increase by calendar day, including across rest days. Max tests replace that day's targets. Rest every " +
      (config.restEvery ? config.restEvery + " days." : "day: off (no rest days).") + " All 30 days are included in the calendar.";
  }
  function renderMood(d) {
    $("challenge").dataset.kind = d.kind;
    const copy = {
      workout: ["Small steps.", "Big smiles.", "A little movement. A little joy. You've got this!", "You've got this!"],
      deload: ["Take it light.", "You're doing great!", "A little breather is part of your challenge.", "Easy does it!"],
      rest: ["Feet up.", "Joy levels up.", "Rest is on the plan. Give yourself room to recharge.", "Recharge time!"],
      finale: ["Big finish.", "Bigger high five!", "Your day-30 targets. Let's celebrate showing up.", "Go, superstar!"],
      test: ["Look at you.", "Getting stronger!", "Log your max and celebrate how far you've come.", "You can do it!"]
    }[d.kind];
    $("hero-line").textContent = copy[0]; $("hero-accent").textContent = copy[1];
    $("hero-lede").textContent = copy[2]; $("mascot-message").textContent = copy[3];
    const boost = Joy.encouragement(d.day, d.kind);
    $("encouragement-title").textContent = boost.title;
    $("encouragement-copy").textContent = boost.text;
    if (d.kind === "workout") $("mascot-message").textContent = boost.cheer;
    const messages = {
      deload: ["Deload day! Less load, same gold star.", "Today's lighter targets are already set below. Enjoy the easy pace."],
      rest: ["Permission to put your feet up.", "No exercises today. A little recharge before tomorrow's finale."],
      finale: ["Your big finish is here!", "2:00 reverse crunches · 50 push-ups · 3:00 twists. These are fixed targets, not a max test."]
    };
    const mode = messages[d.kind];
    $("mode-banner").hidden = !mode;
    if (mode) { $("mode-title").textContent = mode[0]; $("mode-copy").textContent = mode[1]; }
    // Keep old calendar-linked plans accurate, including different rest/finale targets.
    if (d.kind === "rest" && selected !== 29) $("mode-copy").textContent = "No exercises today. Rest is part of your plan.";
    if (d.kind === "finale") $("mode-copy").textContent = d.exercises.map(displayTarget).join(" · ") + ". Fixed targets, not a max test.";
  }
  function refreshDate() {
    today = C.currentDay(config); lastLocalDate = today.today;
    const notice = $("date-notice");
    notice.hidden = today.raw >= 1 && today.raw <= 30;
    notice.textContent = today.raw < 1 ? "This challenge starts " + formatDate(config.startDate, { month: "long", day: "numeric", year: "numeric" }) + ". You can preview the plan below." :
      "This challenge has ended. Revisit your progress or open the home page after the next challenge is published.";
  }
  function calendar(previewOnly) {
    const status = $("calendar-status");
    try {
      const ics = C.makeICS(config), report = C.inspectICS(ics);
      $("validation-result").textContent = "Passed: " + report.count + " events · 15 minutes each · start-time alerts · CRLF · UTF-8 lines ≤ " + report.maxOctets + " octets · complete plan links.";
      $("sample-event").textContent = report.sample; $("sample-event").hidden = false;
      if (previewOnly) { status.textContent = "Calendar validated. The sample below is unfolded for readability."; return; }
      const blobUrl = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
      const link = el("a"); link.href = blobUrl; link.download = config.id + ".ics"; document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      status.textContent = "Downloaded 30 reminders. Import the file into your calendar and enable calendar notifications.";
    } catch (err) { status.textContent = err.message; }
  }
  try {
    const params = new URLSearchParams(location.search);
    const packed = params.get("plan"), dayValue = params.get("day");
    if (dayValue !== null && !packed) throw new Error("This day link is missing its plan. Open the home page for the current challenge.");
    config = packed ? C.decodeConfig(packed) : C.validate(window.WORKOUT_CHALLENGE);
    days = C.plan(config); refreshDate();
    if (dayValue !== null && !/^(?:[1-9]|[12]\d|30)$/.test(dayValue)) throw new Error("Choose a day from 1 to 30.");
    selected = dayValue === null ? today.day : Number(dayValue);
    storageKey = "daily-workout:v1:" + C.encodeConfig(config);
    const saved = read(storageKey); logs = saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
    $("challenge").hidden = false;
    $("month-label").textContent = config.title + " / " + formatDate(config.startDate, { year: "numeric" });
    $("footer-month").textContent = formatDate(config.startDate, { month: "long", year: "numeric" }) + " / 30 DAYS";
    const [hours, minutes] = config.reminderTime.split(":").map(Number);
    $("calendar-copy").textContent = "30 daily reminders. " + (hours % 12 || 12) + ":" + String(minutes).padStart(2, "0") + (hours < 12 ? " AM" : " PM") + " · " + config.timeZone + ". Each opens that day's workout.";
    renderPlan(); renderDay();
    $("tracker-modified").addEventListener("change", saveTrackerCheckIn);
    $("tracker-modifications").addEventListener("input", saveTrackerCheckIn);
    $("tracker-rpe").addEventListener("change", saveTrackerCheckIn);
    $("tracker-copy").addEventListener("click", copyTrackerNote);
    $("export").addEventListener("click", () => calendar(false));
    $("validate").addEventListener("click", () => calendar(true));
    document.addEventListener("click", event => {
      const link = event.target.closest("a[data-day]");
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); selected = Number(link.dataset.day); history.pushState({}, "", link.href); renderDay();
      $("day-title").tabIndex = -1; $("day-title").focus({ preventScroll: true }); $("day-title").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    });
    window.addEventListener("popstate", () => {
      const value = new URLSearchParams(location.search).get("day");
      selected = value && /^(?:[1-9]|[12]\d|30)$/.test(value) ? Number(value) : today.day; renderDay();
    });
    // A home page left open overnight follows the new day; explicit day links stay put.
    setInterval(() => {
      if (C.localDate(config.timeZone) === lastLocalDate) return;
      refreshDate();
      if (!new URLSearchParams(location.search).has("day")) selected = today.day;
      renderDay();
    }, 30000);
    window.addEventListener("storage", event => {
      if (event.key !== storageKey && event.key !== null) return;
      const latest = read(storageKey); logs = latest && typeof latest === "object" && !Array.isArray(latest) ? latest : {}; renderDay();
    });
    window.addEventListener("pagehide", () => { disposeTimers(); finaleParty.stop(); });
    window.addEventListener("pageshow", event => { if (event.persisted) { refreshDate(); renderDay(); } });
  } catch (err) {
    $("challenge").hidden = true; const box = $("fatal"); box.hidden = false;
    box.append(el("h1", "", "Let's get you back on track."), el("p", "", err.message));
    const home = el("a", "button", "Open current challenge"); home.href = location.pathname; box.append(home);
  }
})();
