/* Local encouragement and canvas confetti. No dependencies or network requests. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WorkoutJoy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function encouragement(day, kind) {
    if (kind === "deload") return {
      title: "Lighter day. Full credit.",
      text: "Today's smaller targets belong in the plan. Enjoy the breather and collect your gold star.",
      cheer: "Easy does it!"
    };
    if (kind === "rest") return {
      title: "Your mission: recharge.",
      text: "No targets to chase today. Rest gets a checkmark, too. Tomorrow's workout can wait until tomorrow.",
      cheer: "Feet up!"
    };
    if (day === 30 || kind === "finale") return {
      title: "One last page. One big high five.",
      text: "The final targets are here. Take each exercise in turn, make it your own, and give yourself credit for showing up.",
      cheer: "Go, superstar!"
    };
    if (kind === "test") return {
      title: "Curiosity over comparison.",
      text: "Today's max is a snapshot of today. Log what you do and celebrate the effort you brought.",
      cheer: "Your effort counts!"
    };
    const stages = [
      [3, "Start small. Stack a win.", "You only need to meet today's targets. One exercise, one checkmark, one little victory.", "Hello, momentum!"],
      [6, "A little more. A little prouder.", "The targets are stepping up. Keep your attention on the next small piece, and let the checkmarks add up.", "Find your rhythm!"],
      [9, "Small steps still work.", "Bigger numbers don't need a bigger rush. Give this exercise your attention, then move on to the next.", "One win at a time!"],
      [12, "Bigger targets. Same small wins.", "Break the day into manageable pieces. Each exercise you finish deserves its own little celebration.", "You've got this!"],
      [15, "The halfway stretch is here.", "You're in the middle of the plan. Today's effort counts on its own, whatever the earlier days looked like.", "Make today a win!"],
      [18, "Keep your own rhythm.", "These targets ask for more. Take your time, make adjustments when you need them, and keep collecting small wins.", "Your pace. Your win!"],
      [21, "Big numbers, small steps.", "You don't need to think about the whole finish line. Focus on this set, this timer, this checkmark.", "One set at a time!"],
      [24, "The home stretch is in sight.", "Let every completed exercise be a reason to smile. A steady effort is worth celebrating.", "Look at you go!"],
      [28, "Final stretch. Bring the high fives.", "These are the biggest targets before the finale. Take them one exercise at a time and give yourself room for breaks.", "Small wins. Big smiles!"],
      [30, "Make today your next small win.", "Show up in a way that works for you. Every completed day is something to feel good about.", "Keep it joyful!"]
    ];
    const stage = stages.find(s => day <= s[0]) || stages[stages.length - 1];
    return { title: stage[1], text: stage[2], cheer: stage[3] };
  }
  function createCelebration(canvas, host = window, random = Math.random) {
    const context = canvas.getContext("2d");
    const motion = host.matchMedia("(prefers-reduced-motion: reduce)");
    const colors = ["#f6c4e0", "#ddd0fa", "#ffb3d6", "#c49aef", "#f578b5", "#ebc8ff", "#fff5fc"];
    let particles = [], frame = null, started = 0, previous = 0, nextBurst = 650, width = 0, height = 0, running = false;
    function fit() {
      width = host.innerWidth; height = host.innerHeight;
      const ratio = Math.min(host.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    function burst(count) {
      for (let i = 0; i < count && particles.length < 900; i++) {
        particles.push({
          x: random() * width, y: -20 - random() * height * .35,
          vx: (random() - .5) * 240, vy: 90 + random() * 160,
          size: 6 + random() * 9, angle: random() * Math.PI * 2,
          spin: (random() - .5) * 9, color: colors[Math.floor(random() * colors.length)],
          star: random() < .18, phase: random() * Math.PI * 2
        });
      }
    }
    function stop() {
      running = false;
      if (frame !== null) host.cancelAnimationFrame(frame);
      frame = null; particles = []; canvas.hidden = true;
      if (context) context.clearRect(0, 0, width, height);
    }
    function draw(now) {
      if (!running) return;
      const elapsed = now - started;
      if (motion.matches || elapsed >= 9000) { stop(); return; }
      const dt = Math.max(0, Math.min((now - previous) / 1000, .035)); previous = now;
      if (elapsed >= nextBurst && nextBurst <= 4550) { burst(140); nextBurst += 650; }
      context.clearRect(0, 0, width, height);
      particles = particles.filter(p => p.y < height + 40);
      for (const p of particles) {
        p.vy += 55 * dt;
        p.x += (p.vx + Math.sin(elapsed / 450 + p.phase) * 30) * dt;
        p.y += p.vy * dt; p.angle += p.spin * dt;
        context.save(); context.translate(p.x, p.y); context.rotate(p.angle);
        context.fillStyle = p.color;
        if (p.star) {
          context.beginPath();
          for (let i = 0; i < 10; i++) {
            const r = i % 2 ? p.size * .3 : p.size * .65;
            const x = Math.cos(i * Math.PI / 5) * r, y = Math.sin(i * Math.PI / 5) * r;
            if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
          }
          context.closePath(); context.fill();
        } else {
          context.scale(Math.cos(elapsed / 190 + p.phase), 1);
          context.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .65);
        }
        context.restore();
      }
      frame = host.requestAnimationFrame(draw);
    }
    function start() {
      stop();
      if (!context || motion.matches) return false;
      fit(); running = true; canvas.hidden = false;
      started = previous = host.performance.now(); nextBurst = 650;
      burst(260); frame = host.requestAnimationFrame(draw);
      return true;
    }
    host.addEventListener("resize", () => { if (running) fit(); });
    return { start, stop };
  }
  return { encouragement, createCelebration };
});
