# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

This repo is a **documentation-only specification** for a quantitative information-risk model. The single source file is `README.md` (also the GitHub repository readme). There is no build system, test suite, or package manager.

## Model structure

The model has three components:

1. **Loss event probability** — `P(loss event) = F × T/(T+P)` where F is annual threat frequency, T is threat strength [0,1], and P is protection strength [0,1]. The vulnerability factor uses the Bradley-Terry paired-comparison form.

2. **Threat frequency (F)** — estimated one of two ways:
   - **LRS** `(s+1)/(n+2)`: when threat-attempt telemetry exists (count *attempts*, never realized losses — see the "Important" section in the spec)
   - **Beta-PERT** `(min + λ·mode + max)/(λ+2)`: when telemetry is absent; λ ∈ {1, 2, 4, 8} for negligible → high confidence

3. **Loss magnitudes** — modeled as lognormal distributions, parameterized from a 90% CI `[L, U]`: `μ = (ln L + ln U)/2`, `σ = (ln U − ln L)/3.29`. Both primary and secondary losses use this approach. Combined with the loss probability via Monte Carlo simulation (10k–100k iterations) to produce a full annual loss distribution.

## Key constraints

- This model is a **screening and prioritization tool**, not a rigorous probabilistic framework. The Bradley-Terry form has known limitations (scale invariance; T and P must be on a comparable scale).
- For decisions requiring rigorous probabilistic treatment (capital reserves, insurance limits), recommend FAIR's distribution-based P(Threat Capability > Resistance Strength) instead.
- Secondary losses (regulatory fines, reputational damage) are conditional on primary loss via probability S, modeled with a separate lognormal distribution.
