/* Shared browser/Node logic. No runtime dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WorkoutCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const CALENDAR_SITE_URL = "https://workouts.nicholaslong.org/";
  const encoder = new TextEncoder();
  const fail = message => { throw new Error(message); };
  const pad = n => String(n).padStart(2, "0");
  function dateAt(start, offset) {
    const d = new Date(start + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  }
  function validate(c) {
    if (!c || ![1, 2].includes(c.version)) fail("This challenge version is not supported.");
    if (typeof c.id !== "string" || !/^[a-zA-Z0-9-]{8,80}$/.test(c.id)) fail("Invalid challenge ID.");
    if (typeof c.title !== "string" || !c.title.trim() || c.title.length > 100 || /[\r\n]/.test(c.title)) fail("Invalid challenge title.");
    if (typeof c.startDate !== "string" || !/^(20\d{2})-\d{2}-\d{2}$/.test(c.startDate) ||
        !Number.isFinite(Date.parse(c.startDate + "T12:00:00Z")) || dateAt(c.startDate, 0) !== c.startDate) fail("Invalid challenge start date.");
    if (typeof c.reminderTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(c.reminderTime)) fail("Invalid reminder time.");
    if (typeof c.timeZone !== "string" || c.timeZone.length > 80) fail("Invalid time zone.");
    try { new Intl.DateTimeFormat("en-US", { timeZone: c.timeZone }).format(); }
    catch (_) { fail("Time zone is not recognized."); }
    if (!Number.isInteger(c.restEvery) || c.restEvery < 0 || c.restEvery > 30) fail("Rest interval must be 0–30.");
    if (!Array.isArray(c.testDays) || c.testDays.length > 30 || new Set(c.testDays).size !== c.testDays.length ||
        c.testDays.some(n => !Number.isInteger(n) || n < 1 || n > 30)) fail("Invalid test days.");
    if (!Array.isArray(c.exercises) || c.exercises.length < 1 || c.exercises.length > 12) fail("Include 1–12 exercises.");
    c.exercises.forEach(e => {
      if (!e || typeof e.name !== "string" || !e.name.trim() || e.name.length > 60 || /[\u0000-\u001f\u007f]/.test(e.name)) fail("Exercise names must have 1–60 readable characters.");
      if (!["reps", "timed"].includes(e.type)) fail("Exercise type must be reps or timed.");
      if (c.version === 1 && (!Number.isInteger(e.start) || e.start < 1 || !Number.isInteger(e.increase) || e.increase < 0 ||
          e.start + 29 * e.increase > 1000000)) fail("Exercise amounts must be positive whole numbers, increasing to no more than 1,000,000.");
    });
    if (c.version === 2) {
      if (c.restEvery !== 0 || c.testDays.length) fail("Explicit schedules use their own rest days and session types.");
      if (!Array.isArray(c.schedule) || c.schedule.length !== 30) fail("An explicit schedule must contain exactly 30 days.");
      c.schedule.forEach(d => {
        if (!d || !["workout", "deload", "rest", "finale"].includes(d.kind) || !Array.isArray(d.amounts)) fail("Invalid scheduled session.");
        if (d.amounts.length !== (d.kind === "rest" ? 0 : c.exercises.length) ||
            d.amounts.some(n => !Number.isInteger(n) || n < 1 || n > 1000000)) fail("Scheduled targets must be positive whole numbers for every exercise.");
      });
    }
    return c;
  }
  function encodeConfig(c) {
    validate(c);
    const packed = [c.version, c.id, c.title, c.startDate, c.reminderTime, c.timeZone, c.restEvery, c.testDays,
      c.exercises.map(e => c.version === 1 ? [e.name, e.type === "timed" ? 1 : 0, e.start, e.increase] : [e.name, e.type === "timed" ? 1 : 0])];
    if (c.version === 2) packed.push(c.schedule.map(d => [["workout", "deload", "rest", "finale"].indexOf(d.kind), ...d.amounts]));
    const bytes = encoder.encode(JSON.stringify(packed));
    let binary = "";
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeConfig(value) {
    if (typeof value !== "string" || value.length > 16000 || !/^[\w-]+$/.test(value)) fail("The challenge link is invalid or too large.");
    try {
      const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
      const p = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, x => x.charCodeAt(0))));
      if (!Array.isArray(p) || ![1, 2].includes(p[0]) || p.length !== (p[0] === 1 ? 9 : 10) || !Array.isArray(p[8])) fail("Invalid plan.");
      const exercises = p[8].map(e => {
        if (!Array.isArray(e) || e.length !== (p[0] === 1 ? 4 : 2) || ![0, 1].includes(e[1])) fail("Invalid exercise.");
        return p[0] === 1 ? { name: e[0], type: e[1] === 1 ? "timed" : "reps", start: e[2], increase: e[3] } : { name: e[0], type: e[1] === 1 ? "timed" : "reps" };
      });
      const c = { version: p[0], id: p[1], title: p[2], startDate: p[3], reminderTime: p[4], timeZone: p[5],
        restEvery: p[6], testDays: p[7], exercises };
      if (p[0] === 2) {
        if (!Array.isArray(p[9])) fail("Invalid explicit schedule.");
        c.schedule = p[9].map(d => {
          if (!Array.isArray(d) || !Number.isInteger(d[0]) || d[0] < 0 || d[0] > 3) fail("Invalid session kind.");
          return { kind: ["workout", "deload", "rest", "finale"][d[0]], amounts: d.slice(1) };
        });
      }
      return validate(c);
    } catch (_) { fail("The challenge link could not be read. Open the site's home page for the current challenge."); }
  }
  function plan(c) {
    validate(c);
    return Array.from({ length: 30 }, (_, i) => {
      const n = i + 1;
      const kind = c.version === 2 ? c.schedule[i].kind : c.testDays.includes(n) ? "test" : c.restEvery && n % c.restEvery === 0 ? "rest" : "workout";
      return { day: n, date: dateAt(c.startDate, i), kind,
        exercises: kind === "rest" ? [] : c.exercises.map((e, index) => ({ ...e, index, amount: c.version === 2 ? c.schedule[i].amounts[index] : e.start + i * e.increase })) };
    });
  }
  function duration(seconds) { return Math.floor(seconds / 60) + ":" + pad(seconds % 60); }
  function target(e) { return e.amount + (e.type === "timed" ? " s " : " ") + e.name; }
  function summary(d) {
    if (d.kind === "rest") return "Day " + d.day + ": Rest day";
    if (d.kind === "test") return "Day " + d.day + ": Max test — " + d.exercises.map(e => e.name).join(", ");
    return "Day " + d.day + ": " + (d.kind === "deload" ? "Deload — " : d.kind === "finale" ? "Finale — " : "") + d.exercises.map(target).join(", ");
  }
  function trackerNote(c, dayNumber, log = {}) {
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 30) fail("Choose a valid challenge day.");
    const d = plan(c)[dayNumber - 1];
    const complete = d.kind === "rest" ? log.rest === true : d.exercises.every(e =>
      log["done" + e.index] === true && (d.kind !== "test" ||
        (Number.isInteger(log["max" + e.index]) && log["max" + e.index] >= 0)));
    if (!complete) fail("Finish the day's checkmarks to make your tracker note.");
    const checkIn = log.checkIn || {};
    if (!["yes", "no"].includes(checkIn.modified)) fail("Choose whether you modified the workout.");
    const notes = typeof checkIn.modifications === "string" ? checkIn.modifications.trim() : "";
    if (checkIn.modified === "yes" && !notes) fail("Add a short description of your changes.");
    const hasRpe = Number.isInteger(checkIn.rpe) && checkIn.rpe >= 0 && checkIn.rpe <= 10;
    if (!hasRpe && d.kind !== "rest") fail("Choose your overall RPE to finish the note.");
    const lines = [c.title + " — Day " + dayNumber + "/30",
      "Challenge date: " + d.date];
    if (typeof log.completedAt === "string" && Number.isFinite(Date.parse(log.completedAt))) {
      lines.push("Completed on: " + localDate(c.timeZone, Date.parse(log.completedAt)) + " (" + c.timeZone + ")");
    }
    const label = { workout: "Workout", deload: "Deload", rest: "Rest", finale: "Finale", test: "Max test" }[d.kind];
    lines.push("Session: " + label, "Status: " + (checkIn.modified === "yes" ? "Completed with modifications" : "Completed as planned"), "");
    if (d.kind === "rest") lines.push("Planned session: Rest day");
    else {
      lines.push(d.kind === "test" ? "Logged max results:" : checkIn.modified === "yes" ? "Planned targets (see modifications below):" : "Completed:");
      d.exercises.forEach(e => {
        const amount = d.kind === "test" ? log["max" + e.index] : e.amount;
        lines.push("- " + e.name + ": " + (e.type === "timed" ? duration(amount) + " (" + amount + " seconds)" : amount + " reps"));
      });
    }
    lines.push("", "Modifications: " + (checkIn.modified === "yes" ? notes : "None"),
      "Overall RPE: " + (hasRpe ? checkIn.rpe + "/10" : "Not recorded (rest day)"));
    return lines.join("\n");
  }
  function cleanBase(value) {
    const u = new URL(value);
    if (u.protocol !== "https:" || u.username || u.password) fail("Enter the published HTTPS site address.");
    u.search = ""; u.hash = "";
    return u.href;
  }
  function dayUrl(base, c, n) {
    if (!Number.isInteger(n) || n < 1 || n > 30) fail("Day must be 1–30.");
    const u = new URL(base);
    u.search = ""; u.hash = "";
    u.searchParams.set("day", String(n));
    u.searchParams.set("plan", encodeConfig(c));
    return u.href;
  }
  const formatters = new Map();
  function zonedParts(ms, zone) {
    if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat("en-CA", {
      timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    }));
    const parts = {};
    formatters.get(zone).formatToParts(new Date(ms)).forEach(p => { if (p.type !== "literal") parts[p.type] = Number(p.value); });
    return parts;
  }
  function partsMillis(p) { return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second); }
  // Discover nearby UTC offsets, then verify exact wall-clock matches.
  // Fall-back overlap: earlier occurrence. Spring-forward gap: explicit error.
  function wallToUtc(date, time, zone) {
    const wall = Date.parse(date + "T" + time + ":00Z");
    const offsets = new Set();
    for (let h = -36; h <= 36; h += 6) {
      const sample = wall + h * 3600000;
      offsets.add(partsMillis(zonedParts(sample, zone)) - sample);
    }
    const candidates = [...offsets].map(offset => wall - offset).filter(ms => partsMillis(zonedParts(ms, zone)) === wall).sort((a, b) => a - b);
    if (!candidates.length) fail(date + " at " + time + " does not exist in " + zone + " because of a clock change. Choose a different reminder time in challenge.js.");
    return candidates[0];
  }
  function localDate(zone, now = Date.now()) {
    const p = zonedParts(now, zone);
    return p.year + "-" + pad(p.month) + "-" + pad(p.day);
  }
  function currentDay(c, now = Date.now()) {
    const today = localDate(c.timeZone, now);
    const raw = Math.round((Date.parse(today + "T12:00:00Z") - Date.parse(c.startDate + "T12:00:00Z")) / 86400000) + 1;
    return { today, raw, day: Math.max(1, Math.min(30, raw)) };
  }
  function icsText(s) { return String(s).replace(/\\/g, "\\\\").replace(/\r\n|\r|\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,"); }
  // Physical content lines <=75 UTF-8 octets, including continuation space.
  function foldLine(s) {
    const lines = [];
    let line = "", bytes = 0;
    for (const char of s) {
      const n = encoder.encode(char).length;
      if (bytes + n > 75) { lines.push(line); line = " "; bytes = 1; }
      line += char; bytes += n;
    }
    lines.push(line);
    return lines.join("\r\n");
  }
  function stamp(ms) { return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); }
  // A bounded VTIMEZONE includes the current offset and every clock change
  // surrounding this 30-day series, so recurrence stays at the chosen local time.
  function calendarTimeZone(c) {
    const offsetAt = ms => partsMillis(zonedParts(ms, c.timeZone)) - ms;
    const from = Date.parse(dateAt(c.startDate, -2) + "T00:00:00Z");
    const until = Date.parse(dateAt(c.startDate, 32) + "T00:00:00Z");
    const step = 6 * 3600000;
    let offset = offsetAt(from);
    const changes = [{ at: from, before: offset, after: offset, kind: "STANDARD" }];
    for (let cursor = from + step; cursor <= until; cursor += step) {
      const next = offsetAt(cursor);
      if (next === offset) continue;
      let low = cursor - step, high = cursor;
      while (high - low > 1000) {
        const mid = Math.floor((low + high) / 2000) * 1000;
        if (offsetAt(mid) === offset) low = mid; else high = mid;
      }
      changes.push({ at: high, before: offset, after: next, kind: next > offset ? "DAYLIGHT" : "STANDARD" });
      offset = next;
    }
    const utcOffset = ms => {
      const seconds = Math.round(Math.abs(ms) / 1000);
      return (ms < 0 ? "-" : "+") + pad(Math.floor(seconds / 3600)) + pad(Math.floor(seconds / 60) % 60) + (seconds % 60 ? pad(seconds % 60) : "");
    };
    const lines = ["BEGIN:VTIMEZONE", "TZID:" + icsText(c.timeZone)];
    changes.forEach(change => lines.push("BEGIN:" + change.kind,
      "DTSTART:" + stamp(change.at + change.before).replace(/Z$/, ""),
      "TZOFFSETFROM:" + utcOffset(change.before), "TZOFFSETTO:" + utcOffset(change.after),
      "TZNAME:" + icsText(c.timeZone), "END:" + change.kind));
    lines.push("END:VTIMEZONE");
    return lines;
  }
  function makeICS(c, base = CALENDAR_SITE_URL, now = Date.now()) {
    validate(c);
    const link = cleanBase(base), title = "Daily Workout Challenge";
    // Reject reminder times that fall into a missing spring-forward hour.
    for (let i = 0; i < 30; i++) wallToUtc(dateAt(c.startDate, i), c.reminderTime, c.timeZone);
    const tzid = /^[A-Za-z0-9_+/-]+$/.test(c.timeZone) ? c.timeZone : '"' + c.timeZone + '"';
    const localStart = c.startDate.replace(/-/g, "") + "T" + c.reminderTime.replace(":", "") + "00";
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Daily Workout//Daily Workout Challenge//EN", "CALSCALE:GREGORIAN",
      ...calendarTimeZone(c),
      "BEGIN:VEVENT", "UID:" + c.id + "-daily@daily-workout.local", "DTSTAMP:" + stamp(now),
      "DTSTART;TZID=" + tzid + ":" + localStart, "DURATION:PT15M", "RRULE:FREQ=DAILY;COUNT=30",
      "SUMMARY:" + title, "DESCRIPTION:" + icsText(link), "URL:" + link,
      "TRANSP:TRANSPARENT", "SEQUENCE:0", "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT0S",
      "DESCRIPTION:" + title, "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
    return lines.map(foldLine).join("\r\n") + "\r\n";
  }
  function inspectICS(ics) {
    if (!ics.endsWith("\r\n") || /(?<!\r)\n|\r(?!\n)/.test(ics)) fail("Calendar must use CRLF line endings.");
    const physical = ics.split("\r\n").slice(0, -1);
    if (physical.some(line => encoder.encode(line).length > 75)) fail("A physical line exceeds 75 octets.");
    const unfolded = ics.replace(/\r\n[ \t]/g, "");
    if (!unfolded.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n") || !unfolded.endsWith("END:VCALENDAR\r\n")) fail("Missing calendar wrapper.");
    const events = [...unfolded.matchAll(/BEGIN:VEVENT\r\n([\s\S]*?)END:VEVENT\r\n/g)].map(m => m[1]);
    if (events.length !== 1) fail("Expected one recurring event.");
    const event = events[0], alarms = [...event.matchAll(/BEGIN:VALARM\r\n([\s\S]*?)END:VALARM\r\n/g)];
    if (alarms.length !== 1 || !alarms[0][1].includes("ACTION:DISPLAY\r\nTRIGGER:PT0S\r\n") ||
        !alarms[0][1].includes("DESCRIPTION:Daily Workout Challenge\r\n")) fail("Missing start-time alert.");
    const props = {}, headers = {};
    event.replace(alarms[0][0], "").split("\r\n").filter(Boolean).forEach(line => {
      let quoted = false, separator = -1;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') quoted = !quoted;
        if (line[i] === ":" && !quoted) { separator = i; break; }
      }
      if (separator < 0) fail("Invalid calendar property.");
      const header = line.slice(0, separator), name = header.split(";")[0];
      (props[name] ||= []).push(line.slice(separator + 1)); headers[name] = header;
    });
    for (const key of ["UID", "DTSTAMP", "DTSTART", "DURATION", "RRULE", "SUMMARY", "DESCRIPTION", "URL"]) {
      if (props[key]?.length !== 1) fail("Missing or duplicate " + key);
    }
    if (!/^\d{8}T\d{6}Z$/.test(props.DTSTAMP[0])) fail("Expected a UTC DTSTAMP.");
    if (props.DURATION[0] !== "PT15M") fail("Expected a 15-minute duration.");
    if (props.RRULE[0] !== "FREQ=DAILY;COUNT=30") fail("Expected 30 daily occurrences.");
    if (props.SUMMARY[0] !== "Daily Workout Challenge") fail("Unexpected recurring event title.");
    const link = props.URL[0];
    if (cleanBase(link) !== link || new URL(link).search || new URL(link).hash) fail("The event must link directly to the website.");
    if (props.DESCRIPTION[0] !== icsText(link)) fail("Description must contain only the website link.");
    const tz = headers.DTSTART.match(/^DTSTART;TZID=(?:"([^"]+)"|(.+))$/);
    if (!tz || !/^\d{8}T\d{6}$/.test(props.DTSTART[0])) fail("Expected a local DTSTART with TZID.");
    const zone = tz[1] || tz[2], value = props.DTSTART[0];
    const date = value.slice(0, 4) + "-" + value.slice(4, 6) + "-" + value.slice(6, 8);
    const time = value.slice(9, 11) + ":" + value.slice(11, 13);
    wallToUtc(date, time, zone);
    const zones = [...unfolded.matchAll(/BEGIN:VTIMEZONE\r\n([\s\S]*?)END:VTIMEZONE\r\n/g)];
    if (zones.length !== 1 || !zones[0][1].startsWith("TZID:" + icsText(zone) + "\r\n")) fail("Missing matching VTIMEZONE.");
    const observances = [...zones[0][1].matchAll(/BEGIN:(STANDARD|DAYLIGHT)\r\n([\s\S]*?)END:\1\r\n/g)];
    if (!observances.length || observances.some(m => !/^DTSTART:\d{8}T\d{6}\r$/m.test(m[2]) ||
        !/^TZOFFSETFROM:[+-]\d{4}(?:\d{2})?\r$/m.test(m[2]) || !/^TZOFFSETTO:[+-]\d{4}(?:\d{2})?\r$/m.test(m[2]))) fail("Invalid timezone observance.");
    return { count: 1, occurrences: 30, timeZone: zone, maxOctets: Math.max(...physical.map(line => encoder.encode(line).length)),
      sample: "BEGIN:VEVENT\r\n" + event + "END:VEVENT", unfolded };
  }
  return { CALENDAR_SITE_URL, trackerNote, validate, duration, dateAt, encodeConfig, decodeConfig, plan, target, summary, cleanBase, dayUrl, wallToUtc, localDate, currentDay,
    icsText, foldLine, makeICS, inspectICS };
});
