# Loss Event Probability Model

This document describes a quantitative model for estimating annual loss from a security threat. It is organised in two parts:

- **Part 1 — Getting Started**: the core formula, frequency estimation, and a deterministic expected-loss calculation using basic arithmetic. Suitable for first-time users and quick scenario assessments.
- **Part 2 — Advanced**: lognormal loss distributions, Monte Carlo simulation, loss exceedance curves, secondary losses, and a framework for separating probability-reducing and consequence-reducing controls.

---

# Part 1: Getting Started

## The Formula

```
P(loss event) = F × ( T / (T + P) )
```

| Symbol | Meaning | Range |
|---|---|---|
| **F** | Probability of a threat event in a year (annual) | 0 to 1 |
| **T** | Threat strength | 0 to 1 |
| **P** | Protection strength | 0 to 1 |

The two factors represent:

- **F** — how often something is *attempted* against the asset (threat event frequency).
- **T / (T + P)** — the conditional probability that an attempt becomes a loss, i.e., that protection fails.

Multiplying them gives the probability of an actual loss event.

## Choice of Vulnerability Function

The conditional probability of protection failure uses the **Bradley-Terry form** for paired comparisons:

```
P(loss | threat event) = T / (T + P)
```

This is a well-established functional form used for over 70 years in paired-comparison models — including Elo ratings (chess), sports rankings, and ranking systems for preference data. It treats threat capability and protection strength as competing "strengths" and produces the probability that one prevails.

**Why this form:**

- **Simple inputs.** Requires only two point estimates (T and P) rather than full distributions.
- **Well-established.** Bradley-Terry has decades of empirical use in pairwise comparison settings.
- **Smooth and bounded.** Always returns a value between 0 and 1. When T = P, the result is exactly 0.5. Note that the maximum reachable value for a given P is capped at `1 / (1 + P)` — see Limitations below.

**Worked example.** If T = 0.7 and P = 0.5:

- T / (T + P) = 0.7 / 1.2 ≈ **0.58**

So when threat is moderately stronger than protection, the conditional probability of loss given a threat event is about 58%.

In a spreadsheet, this is computed as `=T/(T+P)`.

### Limitations

Bradley-Terry is a screening approximation, not a probabilistically rigorous calculation. Four limitations worth being explicit about:

- **Scale invariance.** T = P = 0.1 and T = P = 0.9 both produce 0.5, even though "both weak" and "both strong" feel like meaningfully different worlds. The formula captures only the *relative balance* between offense and defense, not the absolute danger level.
- **T and P measure different things.** Threat capability and protection strength are conceptually different. The formula assumes they have been calibrated onto a comparable [0, 1] scale, which is a non-trivial requirement.
- **Output ceiling under strong protection.** Since T is capped at 1, the maximum conditional probability reachable for a given P is `1 / (1 + P)`. Strong protection compresses the output range significantly:

  | P | Ceiling |
  |---|---|
  | 0.3 | 0.77 |
  | 0.5 | 0.67 |
  | 0.7 | 0.59 |
  | 0.9 | 0.53 |

  A highly capable attacker against protection rated at 0.5 can never exceed 67% conditional probability in this model, regardless of T. For scenarios where an advanced attacker should be represented as near-certain to succeed, this is a material limitation.

- **No calibration procedure for T and P.** Every output is sensitive to the ratio T/P, but the framework provides no rubric for arriving at a specific value. Two analysts assessing the same scenario can reach materially different numbers. Treat outputs as relative and analyst-dependent, not absolute, unless your team has established shared definitions and reference scenarios for what "0.3 protection" or "0.7 threat" concretely means in your context.

For settings requiring rigorous probabilistic interpretation (e.g., capital reserves, insurance limits), a distribution-based approach such as FAIR's P(Threat Capability > Resistance Strength) is more appropriate. This model is intended as a screening and prioritization tool.

## Estimating F: Two Methods

The right method depends on whether usable telemetry exists for the threat in question.

### Method 1: Laplace's Rule of Succession (LRS) — when telemetry exists

When threat-attempt data is available, use:

```
F = (s + 1) / (n + 2)
```

| Symbol | Meaning |
|---|---|
| **s** | Number of years in which threat events were observed |
| **n** | Total number of years observed |

LRS is simple, defensible, and converges to the true rate as data accumulates. With no observations at all, it returns 0.5.

> **Note on binary counting and the 0.5 default.** LRS treats each year as a yes/no observation — a year with 50 events and a year with 1 event both count as "1", so within-year frequency is lost. The 0.5 no-data default is also not neutral for rare strategic threats: for a threat expected to materialise every decade, 0.5 implies it occurs every other year, which is far too pessimistic. If your prior belief is that a threat is rare, anchor with Beta-PERT instead.

**Use when:** threat attempts are logged systematically and the threat profile is stable.

**Typical examples (annual granularity):**
- Significant targeted phishing or spear-phishing campaigns
- DDoS events requiring active mitigation
- Detected intrusion attempts that bypassed perimeter defenses
- Confirmed insider threat events
- Detected ransomware deployment attempts

> **Note on time scale.** LRS works best for threats that don't occur every year. Very high-volume events (e.g., raw phishing emails at the gateway, port scans) will give F ≈ 1 at yearly granularity, which carries no useful signal. For those, either define a higher-fidelity threat category (e.g., "successful intrusion attempts" rather than "any probing activity") or use Beta-PERT.

### Method 2: Beta-PERT mean — when telemetry is missing

When threat-attempt data is sparse, biased, or absent, use the Beta-PERT mean:

```
F = (min + λ · mode + max) / (λ + 2)
```

| Symbol | Meaning |
|---|---|
| **min** | Minimum plausible frequency |
| **mode** | Most likely frequency |
| **max** | Maximum plausible frequency |
| **λ** | Confidence parameter (see table below) |

**Use when:** no reliable historical counts exist, but subject-matter experts can estimate a plausible range.

**Typical examples:**
- Ransomware targeting your sector
- Supply chain compromise
- Insider threat
- Novel or emerging attack vectors

### Confidence Levels for Beta-PERT

The λ parameter controls how much weight the mode receives versus the endpoints. Higher λ = more confidence in the mode.

| Confidence | λ | Formula | Interpretation |
|---|---|---|---|
| Negligible | 1 | (min + mode + max) / 3 | Mode barely weighted; mean ≈ middle of range |
| Low | 2 | (min + 2·mode + max) / 4 | Mode weighted lightly |
| Moderate | 4 | (min + 4·mode + max) / 6 | Standard PERT |
| High | 8 | (min + 8·mode + max) / 10 | Mode dominates; endpoints barely pull |

When confidence is low, the wide upper end of the range drags the estimate up — intuitively reflecting "I'm not sure, so the worst case matters more." When confidence is high, the estimate settles toward the most-likely value.

## Choosing Between Methods

| Situation | Method |
|---|---|
| High-volume logged events (phishing, scans, login failures) | LRS |
| Stable threats with good historical data | LRS |
| Strategic threats with little or no history | Beta-PERT |
| Novel or industry-emerging attack vectors | Beta-PERT |
| Rare events that haven't materialized for this organization | Beta-PERT |

The formula itself stays the same — only the source of F changes.

## Important: Count Threat Events, Not Losses

A common mistake is to apply LRS to historical *loss incidents* rather than *threat events*. This double-counts the threat/protection dynamic: loss incidents already imply that protection failed, and multiplying by the vulnerability factor T/(T+P) shrinks the estimate a second time. The result systematically underestimates risk.

**Always count threat attempts in LRS, not realized losses.** If only loss data is available, use Beta-PERT to estimate threat attempt frequency directly.

## Estimating Expected Annual Loss

The deterministic approach uses the Beta-PERT mean for loss magnitudes — the same formula used for F. Elicit three values per loss type: minimum plausible loss (L_min), most likely loss (mode), and maximum plausible loss (U_max).

```
mean_loss = (L_min + 4 × mode + U_max) / 6
```

> **Important: L_min and U_max here are absolute bounds — the smallest and largest plausible loss.** Part 2 uses different variables (L_5th, U_95th) that represent the 5th and 95th percentiles of a lognormal distribution. These are not the same numbers and cannot be copied between parts.

Loss events often trigger follow-on consequences beyond the immediate primary loss: regulatory fines, lawsuits, customer churn, reputational damage. These are called **secondary losses**. They are modelled as conditional on a primary loss occurring, controlled by S — the probability of secondary fallout given a primary loss. If secondary losses are not relevant, set S = 0.

```
E[annual loss] = P(loss event) × (mean_primary + S × mean_secondary)
```

| Symbol | Meaning | Range |
|---|---|---|
| **S** | Probability of secondary loss given a primary loss | 0 to 1 |
| **L_min** | Minimum plausible loss (absolute lower bound) | ≥ 0 |
| **mode** | Most likely loss | ≥ 0 |
| **U_max** | Maximum plausible loss (absolute upper bound) | ≥ 0 |

In Python:

```python
# Inputs
p_loss_event        = 0.13   # from formula: F × T/(T+P)
S                   = 0.4    # P(secondary loss | primary loss)
L_min_primary       = 10     # Minimum primary loss (absolute bound)
mode_primary        = 14     # Most likely primary loss
U_max_primary       = 20     # Maximum primary loss (absolute bound)
L_min_secondary     = 50     # Minimum secondary loss (absolute bound)
mode_secondary      = 70     # Most likely secondary loss
U_max_secondary     = 100    # Maximum secondary loss (absolute bound)

# Beta-PERT means (λ=4, standard PERT)
mean_primary   = (L_min_primary + 4 * mode_primary + U_max_primary) / 6
mean_secondary = (L_min_secondary + 4 * mode_secondary + U_max_secondary) / 6

# Output
expected_annual_loss = p_loss_event * (mean_primary + S * mean_secondary)
```

## Worked Examples

### Example 1 — DDoS attempts requiring mitigation (telemetry exists, LRS)

- Observed: significant DDoS events requiring mitigation in 5 of the last 10 years
- F = (5 + 1) / (10 + 2) = 6 / 12 = **0.50**
- Threat strength T = 0.5, Protection strength P = 0.7
- Vulnerability = T / (T + P) = 0.5 / 1.2 ≈ **0.42**
- P(loss event) = 0.50 × 0.42 = **0.21**

### Example 2 — Ransomware end-to-end (no telemetry, Beta-PERT, deterministic)

- Expert estimate of annual frequency: min = 5%, mode = 15%, max = 50%, confidence = Moderate (λ = 4)
- F = (0.05 + 4 × 0.15 + 0.50) / 6 = **0.19**
- Threat strength T = 0.8, Protection strength P = 0.4
- P(loss event) = 0.19 × 0.67 = **0.13**
- Primary loss: L_min = $100,000, mode = $500,000, U_max = $2,000,000
- mean_primary = (100,000 + 4 × 500,000 + 2,000,000) / 6 = **$683,333**
- S = 0.4 (40% probability of regulatory or reputational fallout)
- Secondary loss: L_min = $500,000, mode = $2,000,000, U_max = $10,000,000
- mean_secondary = (500,000 + 4 × 2,000,000 + 10,000,000) / 6 = **$3,083,333**
- E[annual loss] = 0.13 × (683,333 + 0.4 × 3,083,333) ≈ **$249,167**

---

# Part 2: Advanced

Part 1 gives a single expected-value output using basic arithmetic. Part 2 extends the model in three ways: replacing the Beta-PERT point estimate with a lognormal distribution to capture uncertainty in loss magnitudes, using Monte Carlo simulation to produce a full annual loss distribution with tail metrics, and separating controls into those that reduce the probability of a loss event and those that reduce its consequences.

## Lognormal Loss Distributions

Lognormal is the natural choice for loss magnitudes because:

- It is bounded at zero (losses cannot be negative).
- It is right-skewed, reflecting that losses tend to cluster near a typical value with occasional larger outliers.
- It is well-suited to elicitation from a confidence interval — two intuitive numbers fully define the distribution.

### The 90% Confidence Interval Elicitation

Specify a lognormal distribution through its **90% confidence interval** — a range within which the estimator is 90% confident the loss will fall:

- **L_5th** — lower bound (5th percentile of plausible loss)
- **U_95th** — upper bound (95th percentile of plausible loss)

> **Important: L_5th and U_95th are percentiles, not absolute bounds.** Part 1 uses L_min and U_max as the smallest and largest plausible loss. These are different concepts and the same numbers cannot be used in both parts. If you elicit "the worst case is 2,000,000" and use it as U_95th, you are telling the model that 5% of loss draws will exceed 2,000,000 — which contradicts your own elicitation and fattens the simulated tail.

The estimator answers two questions:
- "What is the smallest loss I would be surprised to fall below?" → L_5th
- "What is the largest loss I would be surprised to exceed?" → U_95th

This is the same elicitation pattern used in Doug Hubbard's calibrated-estimation methodology and the Open FAIR framework.

### Lognormal Parameters from a 90% CI

```
μ = ( ln(L_5th) + ln(U_95th) ) / 2
σ = ( ln(U_95th) − ln(L_5th) ) / 3.29
```

The constant 3.29 is 2 × 1.645, where 1.645 is the z-score for the 5th and 95th percentiles of a standard normal distribution.

## Monte Carlo Simulation

The full pipeline combines the point-estimate probability with sampled loss magnitudes over N iterations (typically 10,000 to 100,000). Each iteration represents one possible year:

```python
import numpy as np

# Inputs
p_loss_event       = 0.13    # from formula: F × T/(T+P)
S                  = 0.4     # P(secondary loss | primary loss)
L_5th_primary      = 10      # 5th percentile primary loss (90% CI lower bound)
U_95th_primary     = 20      # 95th percentile primary loss (90% CI upper bound)
L_5th_secondary    = 50      # 5th percentile secondary loss (90% CI lower bound)
U_95th_secondary   = 100     # 95th percentile secondary loss (90% CI upper bound)

mu_primary     = (np.log(L_5th_primary) + np.log(U_95th_primary)) / 2
sigma_primary  = (np.log(U_95th_primary) - np.log(L_5th_primary)) / 3.29

mu_secondary   = (np.log(L_5th_secondary) + np.log(U_95th_secondary)) / 2
sigma_secondary= (np.log(U_95th_secondary) - np.log(L_5th_secondary)) / 3.29

# Simulation
N = 100_000
total_loss = np.zeros(N)

for i in range(N):
    if np.random.random() < p_loss_event:
        primary = np.random.lognormal(mu_primary, sigma_primary)
        secondary = (np.random.lognormal(mu_secondary, sigma_secondary)
                     if np.random.random() < S else 0)
        total_loss[i] = primary + secondary

# Outputs
expected_annual_loss = total_loss.mean()
median_annual_loss   = np.median(total_loss)
var_95               = np.percentile(total_loss, 95)
var_99               = np.percentile(total_loss, 99)
```

The output is a full **annual loss distribution**, which supports:

- **Expected annual loss** — the mean of the simulated values.
- **Loss exceedance curve** — the probability that annual loss exceeds any given threshold.
- **Value at Risk (VaR)** — loss at a given percentile (e.g., 95th, 99th).

This is more informative than a single expected-value number because most loss-related decisions (insurance limits, capital reserves, risk-appetite thresholds) depend on the tail of the distribution, not just the mean.

**Known limitations of this simulation structure:**

- **One event per year.** Each iteration does a single yes/no draw — a simulated year contains at most one loss event. For threats that can recur within a year, the tail is artificially capped. This structure is best suited to low-frequency, high-impact threats.
- **U_95th is not a maximum.** The upper bound is the 95th percentile, not a hard cap. 5% of simulated loss draws will exceed it, and those values drive VaR99 and the far tail of the exceedance curve. The tail metrics are particularly sensitive to how wide the interval is drawn — widening the gap between L_5th and U_95th will meaningfully increase expected loss and VaR figures.
- **All inputs are independent.** F, T, P, S and the loss magnitudes are sampled independently. Correlated bad years — where multiple threats materialise simultaneously, or a large primary loss triggers disproportionately large secondary losses — are not captured. Treat tail figures as scenario-specific, not as system-wide worst cases.

## Plotting the Loss Exceedance Curve

The loss exceedance curve (LEC) shows the probability that annual loss exceeds any given threshold. Pass `total_loss` from the Monte Carlo simulation directly as `results_series`. An optional `appetite_pts` list of `(exceedance_probability, loss)` tuples overlays a risk appetite line.

```python
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from statsmodels.distributions.empirical_distribution import ECDF
from matplotlib.ticker import FuncFormatter

def lec(results_series, riskscenario, ymax=None, xmin=0, xmax=None, appetite_pts=None, currency="MSEK"):

    result_nparray = np.array(results_series).flatten()

    ecdf = ECDF(result_nparray)
    loss_grid = np.linspace(result_nparray.min(), result_nparray.max(), num=500)
    exceed_prob = 100 * (1 - ecdf(loss_grid))

    if xmax is None:
        xmax = np.percentile(result_nparray, 99)
    if ymax is None:
        ymax = min(100, float(100 * (1 - ecdf(xmin))) * 1.1)

    plt.figure(figsize=(7, 4))

    sns.lineplot(x=loss_grid, y=exceed_prob, linestyle='-', linewidth=2,
                 color='#888B8D', label='Exceedance Probability')

    if appetite_pts and any(p[0] > 0 for p in appetite_pts):
        pts = sorted(appetite_pts, key=lambda p: p[1])
        plt.plot([p[1] for p in pts], [p[0] for p in pts],
                 linestyle='--', linewidth=1.5, color='red',
                 marker='o', markersize=5, label='Risk appetite')

    plt.title(f'{riskscenario} Loss Exceedance Curve', fontsize=16, fontweight='bold')
    plt.xlabel(f'Loss amount ({currency})', fontsize=12)
    plt.ylabel('Exceedance Probability (%)', fontsize=12)

    plt.grid(True, which='both', linestyle='--', linewidth=0.5)
    plt.xticks(fontsize=12)
    plt.yticks(fontsize=12)
    plt.legend(fontsize=10)

    plt.gca().xaxis.set_major_formatter(FuncFormatter(lambda x, _: f'{x:.0f}'))
    plt.ylim(0, ymax)
    plt.xlim(xmin, xmax)
    plt.tight_layout()

    if __name__ == "__main__":
        plt.show()
```

Call it with `total_loss` from the simulation:

```python
lec(total_loss, riskscenario="Ransomware", currency="MSEK")
```

To overlay a risk appetite line, pass `appetite_pts` as a list of `(exceedance_probability, loss)` coordinates — for example, "no more than 5% chance of exceeding 500 MSEK":

```python
lec(total_loss, riskscenario="Ransomware", currency="MSEK", appetite_pts=[(10, 0), (5, 500)])
```

## Secondary Losses

Secondary losses often dominate primary losses, especially for breaches involving personal data, regulated industries, or public-facing services. Stakeholders frequently underestimate both S and the magnitude of secondary impact. Eliciting these carefully — with explicit ranges and confidence levels — is usually more valuable than refining the primary loss estimate.

In the Monte Carlo pipeline, if a primary loss occurs, a secondary loss is then sampled with probability S from its own lognormal distribution. Secondary losses use a separate lognormal distribution with its own 90% confidence interval, distinct from the primary loss distribution. Secondary losses typically have different drivers (regulatory environment, public visibility, stakeholder response) and often have a wider range than primary losses.

### Estimating S

S is elicited using the same patterns as F:

- **Telemetry-based (LRS)** when historical data on escalated incidents exists — rare for secondary losses.
- **Beta-PERT mean** when subject-matter experts can estimate a plausible range — the usual case.

### Worked Example — Ransomware (Monte Carlo)

Building on Example 2 from Part 1:

- **P(loss event)** = 0.13
- **Primary loss 90% CI**: L_5th = $100,000, U_95th = $2,000,000
- **S** = 0.4 (40% probability of regulatory or reputational fallout given a breach)
- **Secondary loss 90% CI**: L_5th = $500,000, U_95th = $10,000,000

Running 100,000 Monte Carlo iterations using the pipeline above, typical outputs are roughly:

| Metric | Approximate Value |
|---|---|
| Expected annual loss (mean) | ~$300,000 |
| Median annual loss | $0 |
| 90th-percentile annual loss | $0 (most years have no loss) |
| 95th-percentile annual loss | ~$1.8M |
| 99th-percentile annual loss | ~$11M |

The shape of the result is informative: in most years the simulated annual loss is zero (because P(loss event) = 0.13, so ~87% of simulated years have no loss event), but in the tail of the distribution losses can be very large. This pattern — long stretches of nothing, punctuated by rare large events — is typical of low-frequency, high-impact threats and is exactly the structure that an expected-value point estimate would hide.

## Modelling Controls

Controls fall into two distinct categories in this model, and it is important to assign each control to the right one.

**Probability-reducing controls** lower the chance that a threat event becomes a loss. They are captured through **P** in the vulnerability function `T / (T + P)`. Examples: firewalls, multi-factor authentication, intrusion detection, access controls.

**Consequence-reducing controls** limit the damage when a loss event does occur. They do not affect `P(loss event)` — instead they reduce the loss magnitude bounds L and U. Examples: backups, incident response plans, data minimisation, contractual liability caps.

### Adjusting Loss Bounds for Consequence Controls

Consequence control strength is expressed as **P_c** on the same 0–1 scale as P. The adjustment applies the Bradley-Terry form to scale the current bounds back to inherent risk (removing existing controls) and then forward to residual risk (applying the planned controls):

```
New L = Current L × (T + P_c_current) / (T + P_c_new)
New U = Current U × (T + P_c_current) / (T + P_c_new)
```

Setting P_c_current = 0 gives inherent loss bounds (no consequence controls at all). Setting P_c_new > P_c_current models the effect of adding or improving controls.

The threat strength T moderates how much consequence controls help — the same improvement in P_c reduces losses less when T is high:

| T | P_c: 0.3 → 0.6 | Scale factor | Interpretation |
|---|---|---|---|
| 0.2 | weak threat | 0.4 / 0.8 = 0.50 | Controls halve the loss bounds |
| 0.5 | moderate threat | 0.8 / 1.1 = 0.73 | Controls reduce bounds by 27% |
| 0.9 | strong threat | 1.2 / 1.5 = 0.80 | Controls reduce bounds by 20% |

In Python:

```python
T             = 0.8   # threat strength (same T used in probability formula)
P_c_current   = 0.3   # current consequence control strength
P_c_new       = 0.6   # planned consequence control strength

scale = (T + P_c_current) / (T + P_c_new)

L_primary_adjusted = L_primary * scale
U_primary_adjusted = U_primary * scale
```

Apply the same scaling to secondary loss bounds if consequence controls also affect secondary losses.

> **Heuristic, not derived.** The Bradley-Terry scaling is borrowed from the probability formula for consistency, but Bradley-Terry models who wins a contest — it outputs probabilities, not damage multipliers. There is no first-principles justification for applying it to loss magnitudes. Two specific limitations: (1) L and U are scaled by the same factor, so the shape of the uncertainty is preserved rather than compressed — real controls often reduce worst-case losses more than typical-case losses; (2) coupling consequence reduction to T assumes a strong attacker also limits how well your controls reduce damage, which may hold for specific mechanisms (e.g., a sophisticated attacker who disables backups before encrypting) but is not generally valid. Use this adjustment as a structured way to express a directional view on consequence controls, not as a precise calculation.

## Summary

- The formula decomposes loss probability into threat attempt frequency × conditional protection failure: **P(loss event) = F × T/(T+P)**.
- The vulnerability factor uses the **Bradley-Terry form** for paired comparisons. It is a screening approximation, not a probabilistically rigorous calculation. The output is capped at `1 / (1 + P)` — strong protection compresses the range. All outputs are analyst-dependent without a shared T/P calibration rubric.
- Use **LRS** when threat attempts are logged and the profile is stable — note it treats each year as binary and the 0.5 no-data default is pessimistic for rare threats. Use **Beta-PERT** when there is no reliable telemetry, and tune **λ** to reflect confidence.
- Never feed loss incidents into LRS — count attempts, not realized losses.
- **Part 1 (deterministic):** estimate expected annual loss using the Beta-PERT mean with absolute bounds (L_min, mode, U_max) — basic arithmetic, single output.
- **Part 2 (simulation):** model loss magnitudes as **lognormal** distributions elicited from a 90% CI (L_5th, U_95th — percentiles, not absolute bounds), combine with Monte Carlo simulation for a full annual loss distribution and tail metrics. Each simulated year contains at most one event; tail figures are sensitive to interval width; all inputs are independent.
- Extend to **secondary losses** using a conditional probability S and a separate loss distribution sampled in the same pipeline.
- **Controls split into two types**: probability-reducing controls feed into P in the vulnerability function; consequence-reducing controls are modelled by adjusting loss bounds using `(T + P_c_current) / (T + P_c_new)`. This scaling is a structured heuristic, not a derived formula.
