/* Timer popup, gesture-unlocked chime, and optional browser alerts. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WorkoutAlerts = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function create(host, doc) {
    const $ = id => doc.getElementById(id);
    const dialog = $("timer-finished-dialog"), list = $("timer-finished-list");
    const soundToggle = $("timer-sound"), testButton = $("timer-test-sound");
    const notificationButton = $("timer-enable-notifications"), status = $("timer-alert-status");
    const screenStatus = $("timer-screen-status");
    const nav = host.navigator || {};
    const isIOS = /iPad|iPhone|iPod/.test(nav.userAgent || "") ||
      (nav.platform === "MacIntel" && nav.maxTouchPoints > 1);
    let activeTimers = 0, screenLock = null, requestingLock = false;
    function screenMessage(message) { if (screenStatus) screenStatus.textContent = message; }
    async function syncScreenLock() {
      if (!activeTimers || doc.hidden) {
        const lock = screenLock; screenLock = null;
        if (lock) { try { await lock.release(); } catch (_) {} }
        if (!activeTimers) screenMessage("");
        return;
      }
      if (!nav.wakeLock) {
        screenMessage("Keep this page visible and your screen unlocked until the timer finishes.");
        return;
      }
      if (screenLock || requestingLock) return;
      requestingLock = true;
      try {
        const lock = await nav.wakeLock.request("screen");
        if (!activeTimers || doc.hidden) { await lock.release(); return; }
        screenLock = lock;
        screenMessage("Keeping your screen awake while a timer runs.");
        lock.addEventListener("release", () => {
          if (screenLock !== lock) return;
          screenLock = null;
          if (activeTimers) screenMessage("Screen stay-awake ended. Keep your screen unlocked for the timer alert.");
        });
      } catch (_) {
        screenMessage("Your phone couldn't stay awake automatically. Keep your screen unlocked for the timer alert.");
      } finally { requestingLock = false; }
    }
    function setActiveTimers(count) { activeTimers = count; void syncScreenLock(); }
    doc.addEventListener("visibilitychange", () => {
      void syncScreenLock();
      if (!doc.hidden && audio && activeTimers) unlockSound();
    });
    const soundKey = "daily-workout:timer-sound";
    let audio = null, registration = null, registrationFailed = false;
    const tones = new Set();
    try { soundToggle.checked = host.localStorage.getItem(soundKey) !== "off"; } catch (_) { soundToggle.checked = true; }
    testButton.disabled = !soundToggle.checked;
    function stopSound() {
      for (const tone of tones) { try { tone.stop(); } catch (_) {} }
      tones.clear();
    }
    function unlockSound() {
      if (!soundToggle.checked) return;
      try {
        const Audio = host.AudioContext || host.webkitAudioContext;
        if (!Audio) { status.textContent = "This browser has no chime support. The timer popup will still appear."; return; }
        if (!audio || audio.state === "closed") audio = new Audio();
        if (audio.state === "suspended" || audio.state === "interrupted") audio.resume().catch(() => {
          status.textContent = "Tap Test chime to enable sound, and check your phone's volume.";
        });
        // Start a silent buffer during the tap, priming iPhone's audio output.
        if (audio.createBufferSource && audio.createBuffer) {
          const prime = audio.createBufferSource();
          prime.buffer = audio.createBuffer(1, 1, audio.sampleRate || 44100);
          prime.connect(audio.destination);
          prime.onended = () => prime.disconnect();
          prime.start(0);
        }
      } catch (_) { status.textContent = "Sound is unavailable right now. The timer popup will still appear."; }
    }
    async function playChime() {
      if (!soundToggle.checked) return;
      unlockSound();
      if (!audio) return;
      try {
        if (audio.state === "suspended" || audio.state === "interrupted") await audio.resume();
        if (audio.state !== "running" || !soundToggle.checked) return;
        stopSound();
        const start = audio.currentTime;
        [784, 988, 1175, 784, 988, 1568].forEach((frequency, i) => {
          const tone = audio.createOscillator(), gain = audio.createGain(), at = start + i * .19;
          tone.type = "sine"; tone.frequency.setValueAtTime(frequency, at);
          gain.gain.setValueAtTime(.0001, at);
          gain.gain.linearRampToValueAtTime(.13, at + .012);
          gain.gain.exponentialRampToValueAtTime(.0001, at + .17);
          tone.connect(gain); gain.connect(audio.destination);
          tone.onended = () => { tones.delete(tone); tone.disconnect(); gain.disconnect(); };
          tones.add(tone); tone.start(at); tone.stop(at + .18);
        });
      } catch (_) { status.textContent = "The chime could not play. Tap Test chime and check your volume."; }
    }
    function supportsNotifications() {
      return !!(!isIOS && host.isSecureContext && host.Notification && host.navigator.serviceWorker);
    }
    function registerWorker() {
      if (!registration) registration = host.navigator.serviceWorker.register(new URL("notification-worker.js", doc.baseURI).href)
        .then(() => host.navigator.serviceWorker.ready)
        .then(worker => { registrationFailed = false; return worker; })
        .catch(error => { registration = null; registrationFailed = true; throw error; });
      return registration;
    }
    function refreshPermission() {
      if (!supportsNotifications()) {
        if (isIOS) status.textContent = "On iPhone, use the timer popup and chime with Safari visible. Tap Test chime, turn up your volume, and turn off Silent Mode if needed. Locked-screen alerts aren't available here.";
        notificationButton.disabled = true;
        notificationButton.textContent = isIOS ? "Use timer popups on iPhone" : "Browser alerts unavailable here";
      } else if (host.Notification.permission === "granted" && registrationFailed) {
        notificationButton.disabled = false;
        notificationButton.textContent = "Retry browser alerts";
      } else if (host.Notification.permission === "granted") {
        notificationButton.disabled = true;
        notificationButton.textContent = "Browser alerts enabled";
      } else if (host.Notification.permission === "denied") {
        notificationButton.disabled = true;
        notificationButton.textContent = "Browser alerts blocked in settings";
      } else {
        notificationButton.disabled = false;
        notificationButton.textContent = "Enable browser alerts";
      }
    }
    async function enableNotifications() {
      if (!supportsNotifications()) return;
      notificationButton.disabled = true;
      try {
        // Invoke from the button gesture before awaiting worker registration.
        const permission = await host.Notification.requestPermission();
        if (permission === "granted") {
          await registerWorker();
          status.textContent = "Browser alerts enabled. Timer popups and sound remain available while the page is open.";
        } else {
          status.textContent = permission === "denied" ? "Browser alerts are blocked. You can still use the popup and chime." : "Browser alerts weren't enabled. You can try again when you're ready.";
        }
      } catch (_) {
        status.textContent = "Browser alerts could not be enabled. The popup and chime are still available.";
      }
      refreshPermission();
    }
    async function browserAlert(name, link) {
      if (!supportsNotifications() || host.Notification.permission !== "granted" || !doc.hidden) return;
      try {
        const worker = await registerWorker();
        await worker.showNotification("Timer done! · Daily", {
          body: name + " is finished. Open your workout when you're ready.",
          tag: "daily-timer-" + name,
          icon: new URL("icon.svg", doc.baseURI).href,
          data: { url: link }
        });
      } catch (_) {
        status.textContent = "The browser alert was unavailable. Your timer-finished popup is ready.";
        refreshPermission();
      }
    }
    function dismiss() {
      stopSound();
      if (dialog.open && typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      dialog.classList.remove("fallback-open");
      list.replaceChildren();
    }
    function finished(name, link) {
      const item = doc.createElement("li"); item.textContent = name + " timer complete.";
      list.append(item);
      if (!dialog.open) {
        if (typeof dialog.showModal === "function") dialog.showModal();
        else { dialog.classList.add("fallback-open"); dialog.setAttribute("open", ""); $("timer-dismiss").focus(); }
      }
      void playChime();
      void browserAlert(name, link);
    }
    $("timer-dismiss").addEventListener("click", dismiss);
    dialog.addEventListener("close", () => { stopSound(); list.replaceChildren(); });
    soundToggle.addEventListener("change", () => {
      try { host.localStorage.setItem(soundKey, soundToggle.checked ? "on" : "off"); } catch (_) {}
      testButton.disabled = !soundToggle.checked;
      if (soundToggle.checked) unlockSound(); else stopSound();
    });
    testButton.addEventListener("click", () => { unlockSound(); void playChime(); });
    notificationButton.addEventListener("click", enableNotifications);
    refreshPermission();
    return { unlockSound, finished, dismiss, setActiveTimers };
  }
  return { create };
});
