// November's exact schedule. Edit this file and change id for each new challenge.
// All timed amounts are seconds. Each block is [number of days, crunches, push-ups, Ukrainian twists].
// Day-specific amounts below are explicit; no automatic halving or rounding is applied.
(() => {
  const blocks = [
    [3, 20, 10, 30],   // days 1–3
    [3, 30, 14, 35],   // days 4–6
    [3, 40, 18, 40],   // days 7–9
    [3, 50, 22, 45],   // days 10–12
    [3, 60, 26, 50],   // days 13–15
    [3, 70, 30, 60],  // days 16–18
    [3, 80, 34, 70],  // days 19–21
    [3, 90, 38, 80],  // days 22–24
    [4, 100, 40, 90], // days 25–28
    [1, 0, 0, 0],     // day 29: replaced by rest below
    [1, 120, 40, 90]  // day 30: fixed finale targets
  ];
  const schedule = blocks.flatMap(([count, ...amounts]) =>
    Array.from({ length: count }, () => ({ kind: "workout", amounts: [...amounts] })));
  const deloads = { 7: [20, 9, 20], 14: [30, 13, 25], 21: [40, 17, 35], 24: [45, 19, 40] };
  for (const [day, amounts] of Object.entries(deloads)) schedule[Number(day) - 1] = { kind: "deload", amounts };
  schedule[28] = { kind: "rest", amounts: [] };
  schedule[29] = { kind: "finale", amounts: [120, 40, 90] };

  window.WORKOUT_CHALLENGE = {
    version: 2,
    id: "november-2026-v3",
    title: "November challenge",
    startDate: "2026-11-01",
    reminderTime: "19:30",
    timeZone: "America/Denver",
    restEvery: 0,
    testDays: [],
    exercises: [
      { name: "reverse crunches", type: "timed" },
      { name: "push-ups", type: "reps" },
      { name: "Ukrainian twists", type: "timed" }
    ],
    schedule
  };
  // Match the previously published plan exactly to carry existing progress forward.
  const oldTwists = [30,30,30,45,45,45,30,60,60,75,75,75,90,45,90,105,105,105,120,120,60,135,135,70,150,150,150,150,0,180];
  const previous = { ...window.WORKOUT_CHALLENGE, id: "november-2026-v2",
    schedule: schedule.map((d, i) => d.kind === "rest" ? { ...d, amounts: [] } :
      { ...d, amounts: [d.amounts[0], i === 29 ? 50 : i >= 24 ? 42 : d.amounts[1], oldTwists[i]] }) };
  window.WORKOUT_PREVIOUS_CHALLENGES = [previous];
})();
