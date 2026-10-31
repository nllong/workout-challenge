# Daily

A cheerful, phone-friendly 30-day workout challenge. Open today's workout, start a timer, and collect a few small wins.

![Daily — small wins, happy days](docs/images/daily-banner.svg)

## What it does

- Daily targets and countdown timers with a completion popup and chime.
- Lighter deload days, rest days, and encouragement as the challenge ramps up.
- A progress calendar that opens today and completed days, keeping future days a surprise.
- One recurring **Daily Workout Challenge** event at **7:30 PM America/Denver** for 30 days, with a notification and a link to [the site](https://workouts.nicholaslong.org/).
- A copyable workout recap with modifications and overall RPE.
- A big confetti celebration when you finish day 30.

![Illustration of a deload workout and the day-30 celebration](docs/images/challenge-preview.svg)

Looking ahead asks for confirmation so you can keep the surprise. Progress and workout check-ins are saved in the browser you use. On iPhone, tap **Test chime**, check your volume and Silent Mode, and keep Safari visible. Timers try to keep the screen awake. This static site cannot reliably send locked-screen timer alerts. Other supported browsers can enable optional browser alerts under **Timer sound & alerts**.

## Run or update

Plain HTML, CSS, and JavaScript. No build step.

Start the local app at http://127.0.0.1:8080:

```sh
make dev
```

Requires Python 3. No packages to install or update. Use `make dev PORT=8081` to change the port.

Edit [challenge.js](challenge.js) for the next challenge, then redeploy through GitHub Pages. Cloudflare handles public HTTPS; keep its DNS record **Proxied**.
