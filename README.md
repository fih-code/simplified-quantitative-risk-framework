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
- **Full output range.** Can express extreme conditional probabilities — T = 0.95, P = 0.05 yields 0.95, allowing the model to represent "this attack will almost certainly succeed" or "this protection will almost certainly hold."
- **Smooth and bounded.** Always returns a value between 0 and 1. When T = P, the result is exactly 0.5.

**Worked example.** If T = 0.7 and P = 0.5:

- T / (T + P) = 0.7 / 1.2 ≈ **0.58**

So when threat is moderately stronger than protection, the conditional probability of loss given a threat event is about 58%.

In a spreadsheet, this is computed as `=T/(T+P)`.

### Limitations

Bradley-Terry is a screening approximation, not a probabilistically rigorous calculation. Two limitations worth being explicit about:

- **Scale invariance.** T = P = 0.1 and T = P = 0.9 both produce 0.5, even though "both weak" and "both strong" feel like meaningfully different worlds. The formula captures only the *relative balance* between offense and defense, not the absolute danger level.
- **T and P measure different things.** Threat capability and protection strength are conceptually different. The formula assumes they have been calibrated onto a comparable [0, 1] scale, which is a non-trivial requirement.

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

LRS is simple, defensible, and converges to the true rate as data accumulates. With no observations at all, it returns 0.5 — a neutral starting point.

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

The deterministic approach uses the Beta-PERT mean for loss magnitudes — the same formula used for F. Elicit three values per loss type: minimum plausible loss (L), most likely loss (mode), and maximum plausible loss (U).

```
mean_loss = (L + 4 × mode + U) / 6
```

Loss events often trigger follow-on consequences beyond the immediate primary loss: regulatory fines, lawsuits, customer churn, reputational damage. These are called **secondary losses**. They are modelled as conditional on a primary loss occurring, controlled by S — the probability of secondary fallout given a primary loss. If secondary losses are not relevant, set S = 0.

```
E[annual loss] = P(loss event) × (mean_primary + S × mean_secondary)
```

| Symbol | Meaning | Range |
|---|---|---|
| **S** | Probability of secondary loss given a primary loss | 0 to 1 |
| **L** | Minimum plausible loss | ≥ 0 |
| **mode** | Most likely loss | ≥ 0 |
| **U** | Maximum plausible loss | ≥ 0 |

In Python:

```python
# Inputs
p_loss_event    = 0.13   # from formula: F × T/(T+P)
S               = 0.4    # P(secondary loss | primary loss)
L_primary       = 10     # Minimum primary loss
mode_primary    = 14     # Most likely primary loss
U_primary       = 20     # Maximum primary loss
L_secondary     = 50     # Minimum secondary loss
mode_secondary  = 70     # Most likely secondary loss
U_secondary     = 100    # Maximum secondary loss

# Beta-PERT means (λ=4, standard PERT)
mean_primary   = (L_primary + 4 * mode_primary + U_primary) / 6
mean_secondary = (L_secondary + 4 * mode_secondary + U_secondary) / 6

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
- Primary loss: L = $100,000, mode = $500,000, U = $2,000,000
- mean_primary = (100,000 + 4 × 500,000 + 2,000,000) / 6 = **$683,333**
- S = 0.4 (40% probability of regulatory or reputational fallout)
- Secondary loss: L = $500,000, mode = $2,000,000, U = $10,000,000
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

- **L** — lower bound (5th percentile of plausible loss)
- **U** — upper bound (95th percentile of plausible loss)

The estimator answers two questions:
- "What is the smallest loss I would be surprised to fall below?"
- "What is the largest loss I would be surprised to exceed?"

This is the same elicitation pattern used in Doug Hubbard's calibrated-estimation methodology and the Open FAIR framework.

### Lognormal Parameters from a 90% CI

```
μ = ( ln(L) + ln(U) ) / 2
σ = ( ln(U) − ln(L) ) / 3.29
```

The constant 3.29 is 2 × 1.645, where 1.645 is the z-score for the 5th and 95th percentiles of a standard normal distribution.

## Monte Carlo Simulation

The full pipeline combines the point-estimate probability with sampled loss magnitudes over N iterations (typically 10,000 to 100,000). Each iteration represents one possible year:

```python
import numpy as np

# Inputs
p_loss_event   = 0.13         # from formula: F × T/(T+P)
S              = 0.4          # P(secondary loss | primary loss)
L_primary      = 10           # Lower bound primary losses 90% confidence interval
U_primary      = 20           # Upper bound primary losses 90% confidence interval
L_secondary    = 50           # Lower bound secondary losses 90% confidence interval
U_secondary    = 100          # Upper bound secondary losses 90% confidence interval

mu_primary     = (np.log(L_primary) + np.log(U_primary)) / 2
sigma_primary  = (np.log(U_primary) - np.log(L_primary)) / 3.29

mu_secondary   = (np.log(L_secondary) + np.log(U_secondary)) / 2
sigma_secondary= (np.log(U_secondary) - np.log(L_secondary)) / 3.29

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
- **Primary loss 90% CI**: L = $100,000, U = $2,000,000
- **S** = 0.4 (40% probability of regulatory or reputational fallout given a breach)
- **Secondary loss 90% CI**: L = $500,000, U = $10,000,000

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

## Summary

- The formula decomposes loss probability into threat attempt frequency × conditional protection failure: **P(loss event) = F × T/(T+P)**.
- The vulnerability factor uses the **Bradley-Terry form** for paired comparisons. It is a screening approximation, not a probabilistically rigorous calculation.
- Use **LRS** when threat attempts are logged and the profile is stable. Use **Beta-PERT** when there is no reliable telemetry, and tune **λ** to reflect confidence.
- Never feed loss incidents into LRS — count attempts, not realized losses.
- **Part 1 (deterministic):** estimate expected annual loss using the Beta-PERT mean for loss magnitudes — basic arithmetic, single output.
- **Part 2 (simulation):** model loss magnitudes as **lognormal** distributions elicited from a 90% CI, combine with Monte Carlo simulation for a full annual loss distribution and tail metrics (VaR, exceedance curves).
- Extend to **secondary losses** using a conditional probability S and a separate loss distribution sampled in the same pipeline.
- **Controls split into two types**: probability-reducing controls feed into P in the vulnerability function; consequence-reducing controls are modelled by adjusting L and U using `(T + P_c_current) / (T + P_c_new)`. Threat strength T moderates how much consequence controls can reduce losses.
