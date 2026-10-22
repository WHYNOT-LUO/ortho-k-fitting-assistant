# From case records to a "best first lens" model: data plan

The long-term goal is a model that learns from a clinic's past cases and
suggests the first lens most likely to fit. That would mean fewer trial lenses,
fewer factory reorders and less chair time. This app does **not** build that
model yet. It collects the data the model would need, in a clean and consistent
form, and the CSV export is the hand-off.

This document covers what the model would predict, what data it needs, roughly
how many cases that takes, and what must be true before anyone trusts it.

---

## 1. What the model would predict

There are two ways to frame it. Start with A.

| | A. "Will this first lens fit?" (classification) | B. "Which lens should we order?" (regression) |
|---|---|---|
| Input | Measurements + the first lens the manufacturer's software proposes | Measurements only |
| Output | Probability that the eye is fitted **right first time** (1 trial lens, no fit-related reorder) | The final ordered parameters (e.g. alignment curve, target power, diameter) |
| Why it helps | Flags in advance the eyes likely to need extra trials, so the optometrist can spend more care on those | Directly suggests the "best first lens" |
| Difficulty | Needs fewer cases; works with any lens brand | Needs parameters in one consistent format **per manufacturer and design**; needs more cases |

A works alongside the manufacturer's software rather than replacing it, so it is
the safer first step. B is the real goal once enough structured lens data exists.

A third, separate model could later predict **myopia control** (axial length
growth per year) from the same records.

---

## 2. Data each case needs

The app already records most of this. Column names are from the CSV export.

| Role | Data | CSV columns |
|---|---|---|
| **Inputs** | Age, history (family myopia, onset age, progression rate) | `age_years`, `family_myopia`, `myopia_onset_age`, `progression_d_per_year` |
| | Refraction (average line), S.E., cycloplegic or not | `sphere`, `cylinder`, `axis`, `se`, `cycloplegic` |
| | Keratometry and corneal astigmatism | `kK1`, `kK2`, `kCyl` |
| | Biometry with SD | `al`, `cct`, `ad`, `lt`, `vt`, `pupil`, `wtw`, `*Sd` |
| | Topography: Sim K at 3/5/7 mm, DK, e-values, shape factor | `simK1_5`, `simK2_5`, `dk_5`, `e6`, `e7`, `e8`, … |
| **Context** | Flags raised and the optometrist's response to each | `flags_raised`, `flag_responses` |
| | Design suggested and chosen, rules version | `design_suggested`, `design_chosen`, `design_rules_version` |
| **Labels (the answers)** | Every trial lens, fluorescein result and adjustment | `visits.csv`: `trial_lens_labels`, `fluorescein_sequence`, `adjustments` |
| | Lens actually ordered | `lens_design_type`, `lens_diameter_mm`, `lens_target_power_d`, `lens_alignment_curve` |
| | Trial lenses, reorders (with reason), visits to success | `trial_lenses`, `fit_reorders`, `visits_to_success`, `right_first_time` |
| **Outcome** | Final unaided VA, axial length growth per year | `last_va_unaided`, `al_growth_mm_per_year` |

**Gap to close before model B:** trial lens and ordered lens parameters are
currently free text copied from the label or order (`TL-1 …`,
`alignment_curve`). Model B needs them as separate numeric fields in the units
of one manufacturer's fitting guide. That depends on open question **Q5**
(the full curvature range, step sizes and adjustment factors).

---

## 3. How many cases

These are **rules of thumb** to plan with, not guarantees. A statistician
should check them once real numbers are known.

**Count eyes, but split by patient.** Each eye gets its own lens, so the unit
is an eye. But a child's two eyes are very similar, so when the data is split
into training and test sets, both eyes of a case must go to the same side.
Otherwise the test result looks better than it really is.

**Model A (right first time, yes/no).** A common rule for this kind of model
is at least about **10 "events" per predictor** (Peduzzi et al., 1996). The
event is the rarer outcome: eyes that were, or were not, right first time.
With about 15–20 predictors that is 150–200 events. If 40–60% of eyes are not
right first time, that is roughly **300–500 eyes**. Newer methods (Riley et
al., 2020) often ask for more, so redo the calculation with the clinic's real
rates.

**Model B (lens parameters).** This has to be done **per manufacturer and
design**, because parameters from different brands are not comparable. Expect
at least **a few hundred eyes** to estimate how about ten key measurements
relate to the ordered lens. Flexible models (e.g. gradient boosting) usually
need **1,000+ eyes** before they reliably beat a simple baseline.

**Hold-out test set.** Keep **20–30%** of cases aside and never use them for
training. Better still, test on cases from a later time period.

**How long that takes** depends on clinic volume, which is still unknown
(open question **Q7**). For example, at 20 new eyes a month, 300 eyes is about
15 months of records. Several clinics pooling data under the same rules would
be much faster. Retrospective records (past cases entered with permission)
also count.

---

## 4. Data quality rules

A model is only as good as its records. The app already enforces or flags most
of these:

- **One convention for units:** dioptres, minus cylinder, mm, μm (the form
  enforces this).
- **Reliable measurements:** readings that fail the SD check (R17) are flagged.
  Re-measure, don't train on them.
- **Accurate refraction:** with LT > 4 mm, use cycloplegic refraction (R6).
- **Every trial lens recorded**, not just the one that worked. The failures are
  what the model learns from.
- **Reorder reasons recorded.** Lost or damaged lenses are excluded from fit
  outcomes.
- **Decisions recorded with the rules version**, including when the
  optometrist disagreed with a flag.
- **Synthetic cases removed** (`synthetic = 1`) before any analysis.

---

## 5. What "better" means

- **Baseline = current practice:** trial lenses per eye, fit-related reorder
  rate and visits to success, as shown on the dashboard. The clinic's own
  numbers (Q7) go in the rules config for comparison.
- **Model A** is judged on discrimination (AUC) and on whether its
  probabilities are honest (calibration).
- **Model B** is judged on how often the predicted lens is within one step of
  the lens that worked.
- Check results **by subgroup** (young children, high myopia, toric fits),
  where a model can quietly fail.
- Then run a **prospective pilot**. The model suggests and the optometrist
  still decides; compare trial lenses and reorders with the baseline.
- The model must **never** fit a lens on its own. It is decision support,
  like the rest of this app.

---

## 6. Privacy and permission

- Use real patient data **only with the clinic's permission**, and with ethics
  approval if the work is published as research.
- **Anonymous case IDs only.** The link between a case ID and a patient stays
  at the clinic, never in this app.
- The CSV export has **no calendar dates** (days since the first exam instead)
  and **no free-text notes**.
- Data stays in the browser. Pooling data between clinics needs a written
  data-sharing agreement.

---

## 7. Next steps

1. Confirm every rule with the optometrist (Rules page; open questions Q1–Q7).
2. Add structured trial-lens and order fields for the clinic's lens brand (Q5).
3. Enter past cases with permission, and record every new case fully.
4. At about **150 eyes**: a descriptive analysis showing which measurements go
   with extra trials and reorders. This is already useful to the clinic.
5. At about **300–500 eyes**: a first model A, compared with the baseline on
   held-out cases.

---

### References

- Peduzzi P, Concato J, Kemper E, Holford TR, Feinstein AR. A simulation study
  of the number of events per variable in logistic regression analysis.
  *Journal of Clinical Epidemiology*. 1996;49(12):1373–1379.
- Riley RD, Ensor J, Snell KIE, et al. Calculating the sample size required for
  developing a clinical prediction model. *BMJ*. 2020;368:m441.
