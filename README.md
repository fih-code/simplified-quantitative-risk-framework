# Loss Event Probability Model

## Purpose

This document describes a probability model for estimating the likelihood of a loss event from a threat, along with a structured way to estimate primary and secondary loss magnitudes. The model decomposes loss probability into two parts — threat event frequency and the conditional probability that protection fails — and supports two methods for estimating frequency depending on the data available.

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

## Worked Examples

### Example 1 — DDoS attempts requiring mitigation (telemetry exists, LRS)

- Observed: significant DDoS events requiring mitigation in 5 of the last 10 years
- F = (5 + 1) / (10 + 2) = 6 / 12 = **0.50**
- Threat strength T = 0.5, Protection strength P = 0.7
- Vulnerability = T / (T + P) = 0.5 / 1.2 ≈ **0.42**
- P(loss event) = 0.50 × 0.42 = **0.21**

### Example 2 — Ransomware (no telemetry, Beta-PERT)

- Expert estimate of annual probability: min = 5%, mode = 15%, max = 50%
- Confidence = Moderate (λ = 4)
- F = (0.05 + 4 × 0.15 + 0.50) / 6 = 1.15 / 6 = **0.19**
- Threat strength T = 0.8, Protection strength P = 0.4
- Vulnerability = T / (T + P) = 0.8 / 1.2 ≈ **0.67**
- P(loss event) = 0.19 × 0.67 = **0.13**

## Estimating Loss Magnitudes

Both primary and secondary losses are modeled as **lognormal distributions**, and the model combines them with the loss probability using **Monte Carlo simulation**. The probability of a loss event is a point estimate; the loss magnitudes are distributions sampled in simulation.

Lognormal is the natural choice for loss magnitudes because:

- It is bounded at zero (losses cannot be negative).
- It is right-skewed, reflecting that losses tend to cluster near a typical value with occasional larger outliers.
- It is well-suited to elicitation from a confidence interval — two intuitive numbers fully define the distribution.

### The 90% Confidence Interval Elicitation

The simplest way to specify a lognormal distribution is through its **90% confidence interval** — a range within which the estimator is 90% confident the loss will fall. This requires only two numbers:

- **L** — lower bound (5th percentile of plausible loss)
- **U** — upper bound (95th percentile of plausible loss)

From these two numbers, the full lognormal distribution is determined. No expert knowledge of probability distributions is required — only the ability to state a confident range. The estimator answers two intuitive questions:

- "What is the smallest loss I would be surprised to fall below?"
- "What is the largest loss I would be surprised to exceed?"

This is the same elicitation pattern used in Doug Hubbard's calibrated-estimation methodology and the Open FAIR framework.

### Lognormal Parameters from a 90% CI

```
μ = ( ln(L) + ln(U) ) / 2
σ = ( ln(U) − ln(L) ) / 3.29
```

The constant 3.29 is 2 × 1.645, where 1.645 is the z-score for the 5th and 95th percentiles of a standard normal distribution.

### Monte Carlo Simulation

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

### Plotting the Loss Exceedance Curve

The loss exceedance curve (LEC) shows the probability that annual loss exceeds any given threshold. Pass `total_loss` from the Monte Carlo simulation directly as `results_series`. An optional `appetite_pts` list of `(loss, probability)` tuples overlays a risk appetite line.

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

    if appetite_pts and any(p[1] > 0 for p in appetite_pts):
        pts = sorted(appetite_pts, key=lambda p: p[0])
        plt.plot([p[0] for p in pts], [p[1] for p in pts],
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
lec(total_loss, riskscenario="Ransomware")
```

To overlay a risk appetite line, pass `appetite_pts` as a list of `(loss, exceedance_probability)` coordinates — for example, "no more than 5% chance of exceeding 500 MSEK":

```python
lec(total_loss, riskscenario="Ransomware", appetite_pts=[(0, 10), (500, 5)])
```

### Analytical Shortcut (Mean Only)

If only the expected annual loss is needed (no tail or percentile information), the simulation can be skipped using the closed-form lognormal mean:

```
mean = e^(μ + σ²/2)
E[annual loss] = P(loss event) × ( mean_primary + S × mean_secondary )
```

In a spreadsheet:

```
mean = EXP(μ + σ^2/2)
```

This is a fast sanity check but loses all tail information. For any decision involving extreme losses, run the simulation.

## Secondary Losses

Loss events often trigger follow-on consequences beyond the immediate primary loss: regulatory fines, lawsuits, customer churn, reputational damage, increased insurance costs. These are called **secondary losses** in the FAIR taxonomy.

Secondary losses are modeled as conditional on a primary loss occurring, with their own probability and their own lognormal magnitude:

| Symbol | Meaning | Range |
|---|---|---|
| **S** | Probability of meaningful secondary fallout given a primary loss | 0 to 1 |
| **L_secondary, U_secondary** | 90% CI bounds for the secondary lognormal | ≥ 0 |

In each Monte Carlo iteration, if a primary loss occurs, a secondary loss is then sampled with probability S from its own lognormal distribution. If secondary losses are not realistic for a given threat, set S = 0 and the secondary contribution drops out.

### Estimating S

S is elicited using the same patterns as F:

- **Telemetry-based (LRS)** when historical data on escalated incidents exists — rare for secondary losses.
- **Beta-PERT mean** when subject-matter experts can estimate a plausible range — the usual case.

### Estimating Secondary Loss Magnitude

Use a separate lognormal distribution with its own 90% confidence interval, distinct from the primary loss distribution. Secondary losses typically have different drivers (regulatory environment, public visibility, stakeholder response) and often have a wider range than primary losses.

### Worked Example — Ransomware (end-to-end)

Building on Example 2:

- **P(loss event)** = 0.13 (from F × T/(T+P))
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

### Why Secondary Losses Matter

Secondary losses often dominate primary losses, especially for breaches involving personal data, regulated industries, or public-facing services. Stakeholders frequently underestimate both S and the magnitude of secondary impact. Eliciting these carefully — with explicit ranges and confidence levels — is usually more valuable than refining the primary loss estimate.

## Summary

- The formula decomposes loss probability into threat attempt frequency × conditional protection failure: **P(loss event) = F × T/(T+P)**.
- The vulnerability factor uses the **Bradley-Terry form** for paired comparisons. It is a screening approximation, not a probabilistically rigorous calculation.
- Use **LRS** when threat attempts are logged and the profile is stable.
- Use **Beta-PERT** when there is no reliable telemetry, and tune **λ** to reflect confidence.
- Never feed loss incidents into LRS — count attempts, not realized losses.
- Loss magnitudes (both primary and secondary) are modeled as **lognormal** distributions, elicited from a simple **90% confidence interval** (lower and upper bound). No expert knowledge of distributions is required.
- Combine the point-estimate probability with the lognormal magnitudes using **Monte Carlo simulation**. This produces a full annual loss distribution and supports tail metrics (VaR, exceedance curves) — not just an expected value.
- Extend to **secondary losses** using a conditional probability S and a separate lognormal magnitude, sampled in the same Monte Carlo pipeline.
- The full model needs only a small number of inputs per scenario: F (or its components), T, P, S, and 90% CIs for primary and secondary loss magnitudes.
