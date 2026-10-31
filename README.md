# Daily / 30-day workout challenge

A static, mobile-first workout site for Nicholas Long. Plain HTML, CSS, and JavaScript; no install, build step, backend, analytics, or third-party assets.

## Use it

Open index.html locally, or serve the folder with:
```sh
python3 -m http.server 8080
```
Then open http://localhost:8080/.

The home page opens the current challenge day in America/Denver. Before the start, it shows day 1; after the end, day 30. Previous/next links and the progress grid preview any day. After checking off a day, an “Up next” panel shows tomorrow's targets and a link. The last day shows the completed-day count. Rest days must be marked complete; test days require a max value (0 is accepted) and a Done check for every exercise.

The challenge is **November 1–30, 2026**, using Nicholas's exact schedule. Timed values are minutes:seconds.

| Days | Reverse crunches | Push-ups | Twists |
| --- | --- | --- | --- |
| 1–3 | 0:20 | 10 | 0:30 |
| 4–6 | 0:30 | 14 | 0:45 |
| 7–9 | 0:40 (day 7: 0:20) | 18 (day 7: 9) | 1:00 (day 7: 0:30) |
| 10–12 | 0:50 | 22 | 1:15 |
| 13–15 | 1:00 (day 14: 0:30) | 26 (day 14: 13) | 1:30 (day 14: 0:45) |
| 16–18 | 1:10 | 30 | 1:45 |
| 19–21 | 1:20 (day 21: 0:40) | 34 (day 21: 17) | 2:00 (day 21: 1:00) |
| 22–24 | 1:30 (day 24: 0:45) | 38 (day 24: 19) | 2:15 (day 24: 1:10) |
| 25–28 | 1:40 | 42 | 2:30 |
| 29 | Rest | Rest | Rest |
| 30 | 2:00 | 50 | 3:00 |

Deload days (7, 14, 21, 24) have a dedicated banner, cheerful mascot/copy, lighter-target labels, and distinct grid/table colors. They earn full completion credit. Day 24 twists are exactly 70 seconds, with no automatic rounding. Day 29 is rest; day 30 is a fixed-target finale, not a max test. There are no max-test days in this revision.

Reminders are 7:30 PM, America/Denver; 15 minutes, with an alert at the start. Calendar titles and descriptions explicitly identify deload and finale sessions. The friendly blush-pink, lavender, and plum theme adapts to dark mode and respects reduced-motion preferences. The mascot is an original inline SVG; no external artwork or font requests are needed.

## Redeploy a new challenge

Edit **challenge.js**: change id, title, startDate, reminderTime, exercises, the blocks (day count and targets), and the explicit deload/rest/finale overrides. All timed targets are stored in seconds. Blocks must total 30 days; every non-rest day must have one positive integer target per exercise.

The version-2 format uses an explicit 30-day schedule; restEvery stays 0 and testDays stays empty. This prevents a generic rest pattern or old max tests from overriding the supplied plan. Version-1 calendar links are still supported with their original progression, rest days, and max tests.

Use a new id for every new challenge or schedule revision. Keep it stable when re-exporting the same calendar. The new schedule has id november-2026-v2 and separate progress from the original sample challenge. Commit and push; Pages redeploys automatically.

Home shows the newly deployed challenge and its current day. Old calendar links continue to open their original plan because they contain the whole configuration. No saved setup is needed on the receiving device.

Completion and max logs use localStorage with try/catch. They are isolated by the complete plan, survive reload, and update between tabs. They do not sync between devices or between domains. When storage is blocked, the UI reports it and keeps the current session usable. The URL includes the plan, never completion or max logs.

Timers use wall-clock deadlines rather than counting interval callbacks, so background throttling does not extend a countdown. Pause/resume/reset and max-test stopwatch are included. Navigating away discards active timers. No push notifications are sent by the website; calendar alerts depend on the importing app's permissions and settings.

## Encouragement and the finale

A daily boost changes with the challenge's stages as targets increase. Deloads, rest days, and the finale get their own supportive messages; the workout buddy's speech bubble changes too. Messages avoid assuming earlier days have been completed.

Checking off the final remaining exercise on day 30 triggers a nine-second shower of colorful confetti and stars in repeated waves. The effect uses a local canvas, caps concurrent particles at 900, and never blocks taps, tracker check-ins, or scrolling. The celebration banner remains after the confetti ends.

Confetti fires on the transition to complete; reopening a completed day or editing RPE/modifications does not trigger it. Unchecking and completing the finale again triggers a new celebration. Navigating away stops and clears the effect. Reduced-motion settings keep the static celebration banner and skip the moving confetti.

## Copy a completed workout into a tracker chat

After the day's checkmarks are complete, a short check-in asks whether you modified the workout and your overall RPE (0–10). If modified, describe actual reps/times, substitutions, skipped exercises, or breaks. RPE is optional for a rest day. The note becomes available once those answers are complete; the workout itself still counts as done before the check-in.

The generated text includes the challenge date, recorded completion date when available, day/session type, exercises, modifications, and RPE. Modified sessions explicitly label the scheduled amounts as planned targets. Older max-test sessions report their logged results. The check-in saves alongside that day's progress; new completions record a completion timestamp without changing the challenge identity or previous checkmarks.

Use **Copy tracker note**, then paste into the workout tracker chat. A read-only preview also supports manual copying when clipboard access is unavailable. Unchecking an exercise hides the note until the day is complete again. Check-in text and RPE stay in browser storage and are not included in calendar URLs.

## Deploy to GitHub Pages

From this folder:

```sh
gh auth status
# If needed: gh auth login --hostname github.com
# This folder is already a local Git repository.
# After a first commit, create and push an empty GitHub repository:
gh repo create nllong/workout-challenge --public --source=. --remote=origin --push
```

If that repository name already exists, connect the intended empty repository instead. Do not overwrite an existing repository.

1. On GitHub, open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select **main** and **/ (root)**, then Save.
4. Wait for the Pages deployment. The default URL is https://nllong.github.io/workout-challenge/.
5. Open the site, inspect **The full 30-day plan**, then download the calendar. Under **Calendar links & format preview**, confirm the published address. On a hosted HTTPS page it is detected automatically.

The .nojekyll file bypasses Jekyll processing. Runtime assets all use relative paths, so both project paths and custom-domain roots work. No npm or GitHub Actions workflow is needed.

GitHub reference: [Creating a Pages site](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site).

## Custom domain with Cloudflare

Assuming the intended hostname is **workouts.nicholaslong.org**:

1. In the GitHub repository's **Settings → Pages → Custom domain**, enter workouts.nicholaslong.org and Save. With branch deployment, GitHub creates the CNAME file. Pull that commit before your next local push.
2. In Cloudflare's nicholaslong.org zone, add a **CNAME** named **workouts**, targeting **nllong.github.io** (no repository path). Use **DNS only** while GitHub verifies DNS and provisions HTTPS.
3. Once GitHub finishes provisioning the certificate, enable **Enforce HTTPS** in Pages settings.
4. Open https://workouts.nicholaslong.org/. Export the calendar from this final address, or explicitly set that address in the calendar link field.

If you mean a child hostname such as challenge.workouts.nicholaslong.org, use that exact hostname in GitHub and the corresponding DNS record instead. No CNAME is included yet because the final hostname has not been configured.

[GitHub custom-domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) · [Cloudflare DNS records](https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/).

Export after choosing the final domain: old imported events keep their original URLs. Moving from GitHub's domain to a custom domain does not transfer localStorage history.

## Calendar format and validation

The download has exactly 30 VEVENTs, including deload, rest, and finale days (or test days in older linked plans). Each includes:
- A stable, unique UID per challenge/day and UTC DTSTAMP.
- UTC DTSTART/DTEND, resolved independently from the configured Denver wall time for every date, including daylight-saving transitions.
- A 15-minute duration and DISPLAY VALARM with TRIGGER:PT0S.
- The complete day URL in both URL and escaped, plain-text DESCRIPTION.
- CRLF endings; UTF-8-safe folding at at most 75 octets, including the continuation space; escaped backslashes, commas, semicolons, and newlines in TEXT.

Ambiguous fall-back times use the earlier occurrence. A nonexistent spring-forward time causes a clear export error rather than silently shifting the reminder. Change reminderTime in challenge.js if necessary.

**Calendar links & format preview → Validate & preview an event** runs structural checks against the generated file and displays an unfolded sample. Export runs those checks too. The actual file retains RFC folding and CRLF.

[RFC 5545](https://www.rfc-editor.org/rfc/rfc5545) is the format reference. The browser validator checks generated structure, required fields, durations, alerts, line lengths, distinct IDs, and complete-plan links; it is not an exhaustive standards validator. Import behavior still depends on the calendar app. Re-importing may duplicate events in some apps even with stable UIDs; remove the previous import when replacing a challenge.

Developer validation script and results, if present, are in ignored .build/. They are not required to host the site.
