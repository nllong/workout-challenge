// November's exact schedule. Edit this file and change id for each new challenge.
// All timed amounts are seconds. Each block is [number of days, crunches, push-ups, Ukrainian twists].
// Day-specific amounts below are explicit; no automatic halving or rounding is applied.
(() => {
  const blocks = [
    [3, 20, 10, 30],   // days 1–3
    [3, 30, 14, 45],   // days 4–6
    [3, 40, 18, 60],   // days 7–9
    [3, 50, 22, 75],   // days 10–12
    [3, 60, 26, 90],   // days 13–15
    [3, 70, 30, 105],  // days 16–18
    [3, 80, 34, 120],  // days 19–21
    [3, 90, 38, 135],  // days 22–24
    [4, 100, 42, 150], // days 25–28
    [1, 0, 0, 0],     // day 29: replaced by rest below
    [1, 120, 50, 180]  // day 30: fixed finale targets
  ];
  const schedule = blocks.flatMap(([count, ...amounts]) =>
    Array.from({ length: count }, () => ({ kind: "workout", amounts: [...amounts] })));
  const deloads = { 7: [20, 9, 30], 14: [30, 13, 45], 21: [40, 17, 60], 24: [45, 19, 70] };
  for (const [day, amounts] of Object.entries(deloads)) schedule[Number(day) - 1] = { kind: "deload", amounts };
  schedule[28] = { kind: "rest", amounts: [] };
  schedule[29] = { kind: "finale", amounts: [120, 50, 180] };

  window.WORKOUT_CHALLENGE = {
    version: 2,
    id: "november-2026-v2",
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
})();
