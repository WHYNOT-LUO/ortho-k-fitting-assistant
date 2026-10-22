# 角膜塑形镜验配助手 · Ortho-K Fitting Assistant

> **Research and demonstration prototype. Not for clinical decisions.**
> Every suggestion must be judged by a qualified optometrist. No rule in this
> app has been confirmed by the clinic yet (see [Rules](#how-the-rules-work)).

A web app that supports orthokeratology (ortho-k) lens fitting. It follows the
fitting workflow from a local clinic: history → basic tests → biometer →
corneal topography → lens design → follow-up. Each case is checked against the
clinic's rules, and every fitting is recorded as structured data. The aim is
fewer trial lenses, fewer factory reorders and more consistent fits.

The clinic notes in `ortho-k-fitting-notes.md` are the source of truth for the
workflow, the rules (R1–R17) and the test cases (T1–T4).

---

## What it does

| Part | What you can do |
|---|---|
| **1. Case entry** | Enter history, basic tests (refraction average line, keratometry, IOP, fundus), biometer values with SD or raw readings, and topography (Sim K at 3/5/7 mm, e-values, shape factor, keratoconus panel), side by side for OD and OS. Anonymous case IDs only. Chinese by default, English toggle. |
| **2. Suitability screening** | Each fitted eye is checked against R1–R17. A flag has a level (OK / note / caution / stop), a plain-language reason, the rule ID and the numbers behind it. Missing data shows as "not checked", never as OK. The optometrist can agree, disagree or note each flag, and the response is saved. |
| **4. Follow-up** | Log visits: trial lenses with the fluorescein result (loose / ideal / tight), the tear-layer direction and the adjustment made, reorders with a reason, the "fit successful" tick, AL, refraction, over-refraction and post-wear topography. Includes an axial-length chart with growth per year (R11) and flags for R12–R15. |
| **3. Design suggestion** | Suggests 4-curve or 5-curve with the reasons (D1–D7). When rules conflict, for example a child with low myopia, both reasons are shown and the optometrist chooses. The decision is saved with the rules version. The lens actually ordered can be copied in from the manufacturer's software. **The app never calculates lens parameters.** |
| **6. Dashboard** | Trial lenses per case and per eye, the fit-related reorder rate, average visits until a successful fit, the right-first-time rate, and how often the design suggestion was accepted. Includes charts, a per-case table and an optional cost estimate. |
| **5. Summaries and data** | An optometrist summary and a plain-language note for parents (no medical promises), in both languages. CSV export (one row per eye, one row per visit) and a JSON backup. [`docs/ml-data-plan.md`](docs/ml-data-plan.md) explains the future "best first lens" model. |
| **Stretch** | Upload a post-wear topography image, mark the centre and scale, and the app counts red pixels in the central 3 mm. Experimental. |
| **Simulated maps (demo cases)** | Each synthetic case shows axial curvature maps drawn from its own numbers: a pre-fit map from the 5 mm Sim K, axes and e-value, and a post-wear map at each follow-up (blue flattened centre, red ring, decentred when the visit is marked "red inside the central 3 mm"). The image check runs on every post-wear map automatically. Each map is watermarked SIMULATED and can be saved as a PNG for slides. |

The parts were built in the order 1 → 2 → 4 → 3 → 6 → 5 → stretch, with a
commit after each (`git log`).

---

## Run it on your computer

You need [Node.js](https://nodejs.org/) 20 or newer (this was built with 22).

```bash
cd "Ortho-K Fitting Assistant"
npm install          # once, downloads the libraries
npm run dev          # starts the app
```

Open the address it prints (usually <http://localhost:5173>). Click **加载合成演示病例 / Load synthetic demo cases** to explore with the demo data.

Other commands:

```bash
npm test             # runs the automated tests
npm run build        # makes the production version in dist/
npm run preview      # serves dist/ locally to check the production version
```

## Put it online for free (GitHub Pages)

The app is a static website with no server, so it can be hosted for free. The
deploy script is already in `.github/workflows/deploy.yml`.

1. Create an empty repository on GitHub, e.g. `ortho-k-fitting-assistant`.
   Free GitHub Pages needs a **public** repository on a personal account,
   which means the **code** is public. Patient data is never in the code,
   because it lives only in each user's browser.
2. Connect this folder and push:
   ```bash
   git remote add origin https://github.com/<your-username>/ortho-k-fitting-assistant.git
   git push -u origin main
   ```
3. On GitHub, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
4. The **Actions** tab shows the build (tests run first). When it is green, the
   app is live at `https://<your-username>.github.io/ortho-k-fitting-assistant/`.
   Every later `git push` redeploys it.

**Alternative (no GitHub):** run `npm run build`, then drag the `dist` folder
onto <https://app.netlify.com/drop>.

> `ortho-k-fitting-notes.md` (your clinic notes) is **not** committed yet.
> Decide whether you want it public before adding it to the repository.

---

## How it is built (and why)

**Tech stack:** React + TypeScript + Vite, Vitest for tests, Chart.js for charts. No backend.

```
src/
  config/clinicRules.ts   ← EVERY rule and threshold, in one editable file
  domain/                 ← the logic, no screens: easy to test
    types.ts              the case data model (no name / birth date / phone fields)
    fieldSpecs.ts         every exam field once: label, unit, sanity range
    screening.ts          Part 2: R1–R10, R16, R17 and notes rules N1–N3
    followup.ts           Part 4: R11–R15, supplier-guide step G1
    design.ts             Part 3: D1–D7 suggestion + decision record
    metrics.ts            Part 6: dashboard numbers
    summary.ts            Part 5: optometrist and parent text
    topoImage.ts          stretch: red pixels in the central zone
    topoMap.ts            simulated pre-fit and post-wear maps for demo cases
    *.test.ts             automated tests (T1–T4 from the notes, boundaries, …)
  storage/                local storage, JSON backup, CSV export
  i18n/zh.ts, en.ts       all wording; TypeScript checks both languages have every key
  components/, pages/     the screens
  data/syntheticCases.ts  demo cases, all marked SYNTHETIC
docs/ml-data-plan.md      data needed for a future model
```

**Key decisions in plain language:**

1. **No server; data stays in the browser.** Nothing is uploaded, which
   protects privacy and makes hosting free. The cost: data lives in one browser
   on one device and is lost if the site data is cleared. So there is a
   **JSON backup** to export and import.
2. **One rules file.** Every number the app judges by is in
   `src/config/clinicRules.ts`, with its source (clinic notes, supplier guide,
   AI search, or added for the app), any assumption we made, and a
   `confirmed` switch. Flags from unconfirmed rules say so on screen.
3. **Logic separate from screens.** The rules are plain functions that take
   numbers and return flags. That is why the automated tests can check them, including the
   exact expected results of test cases T1–T4 from the clinic notes.
4. **Never silent.** Missing data is shown as "not checked", not as OK. Design
   conflicts show both reasons. A measurement with a high SD (R17) marks the
   flags that depend on it as unreliable.
5. **Decision support only.** The optometrist accepts or rejects every
   suggestion, and the app records the response, the decision and the rules
   version at that moment. It never calculates lens parameters.
6. **"AI layer" honestly named.** The summaries are template text built from
   the flags, not a large language model. They are free, private and
   repeatable. The real AI step is the future model trained on the exported
   data ([plan](docs/ml-data-plan.md)).
7. **Privacy by design.** The form has no name, birth date or phone fields;
   age is stored in whole years. The CSV export swaps dates for "days since the
   first exam" and leaves out free-text notes.

## How the rules work

Open the **规则 / Rules** page in the app. It lists every rule with its
description, source, assumption and open question, and it can print a sign-off
checklist for the optometrist. To change a rule:

1. Edit the number in `src/config/clinicRules.ts`.
2. Set `confirmed: true` once the optometrist agrees.
3. Bump `RULES_VERSION`.
4. Run `npm test`. Some tests check thresholds and may need updating if a
   number changes.

**Assumptions to confirm** (also listed on the Rules page):

| Rule | What we assumed | Open question |
|---|---|---|
| R1–R3 | Uses keratometer K1/K2; falls back to topography 5 mm, then biometer | — |
| R4 | e @6 mm; 0.40–0.60 counts as "about 0.5"; above 0.60 warns about tightening | Q3 |
| R6 | No flag if the refraction is already cycloplegic | — |
| R8/R9 | Uses refractive cylinder C; above 200 degrees is a warning | Q6 |
| R10 | Compares 7 mm with 5 mm Sim K, in D, either meridian, > 0.50 | Q1 |
| R11 | 12-month window scaled to mm/year; needs a gap of at least 6 months (about a week of slack); > 0.30 mm/year = "likely weak" | Q2 |
| R13/R14 | Residual of −0.50 D or worse = under-correction; +0.50 D or more = over-correction | — |
| R16 | High myopia −6.00 D or worse, fast progression 0.50 D/yr or more, long AL 26.00 mm or more; any age | — |
| R17 | SD limits: AL 0.02 mm, CCT 10 μm, AD/LT/VT 0.05 mm, K 0.25 D (population SD) | — |
| D2 | "High myopia" for design = −4.00 D or more | Q4 |
| D4 | "Child" = under 12 | Q4 |
| D7 | Regular cornea = corneal astigmatism ≤ 1.50 D, K within 40–46, no R10 flag, KC panel not suspect | — |
| G1 | Shows only the direction (steeper / keep / flatter), never a value | Q5 |
| B1 | Clinic baseline numbers not provided yet | Q7 |

---

## Limitations

- **Not validated.** The rules come from one clinic's notes and an AI search,
  and none is confirmed yet. The app has only been tested with synthetic data.
- **Demo data is made up.** Ten synthetic cases (T1–T4 from the notes plus
  six more) are clearly labelled. Dashboard numbers from them mean nothing
  about real clinics.
- **One browser, one device.** There is no sync or multi-user access. Use the
  JSON backup.
- **Manual data entry.** Values are typed from printouts. Typos are caught
  only by soft range checks.
- **Simulated maps are illustrations, not data.** They come from a smooth
  textbook model (toric conic shape plus a simple ortho-k treatment profile)
  and carry nothing beyond the numbers they are drawn from. They appear only
  for synthetic cases, because a smooth map for a real patient could hide real
  irregularity such as keratoconus.
- **The image check is a rough experiment.** It depends on the map's colour
  scale, the user's centre and scale clicks, and a 5% threshold that has never
  been tested on real maps.
- **Trial-lens and order parameters are free text** until the supplier
  guide's full parameter format is known (Q5).
- **No dark mode, no accounts, no audit log** beyond the saved decisions and
  responses.

## Next steps

1. Go through the Rules page with the optometrist and answer Q1–Q7. Update
   `clinicRules.ts` and mark each rule confirmed.
2. With the clinic's permission, enter a handful of real anonymised cases to
   test the workflow and timing.
3. Add structured trial-lens and order fields for the clinic's lens brand
   (Q5), the key input for a future model.
4. Optional: read the autorefractor and biometer printouts automatically (photo
   or PDF to numbers) to cut typing time.
5. Collect cases until there is enough data
   ([how many](docs/ml-data-plan.md#3-how-many-cases)), then try the first
   "will this first lens fit?" model against the dashboard baseline.
