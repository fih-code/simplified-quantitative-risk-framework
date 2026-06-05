// ─────────────────────────────────────────────────────────────────────────────
// Loss Event Probability Model — Advanced (Part 2)
// ─────────────────────────────────────────────────────────────────────────────

// ── Lognormal helpers ─────────────────────────────────────────────────────────

// Box-Muller transform: standard normal sample
function randomNormal() {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Sample from lognormal distribution
function randomLognormal(mu, sigma) {
  return Math.exp(mu + sigma * randomNormal());
}

// Derive lognormal parameters from a 90% confidence interval [L_5th, U_95th]
function lognormalParams(L_5th, U_95th) {
  const mu    = (Math.log(L_5th) + Math.log(U_95th)) / 2;
  const sigma = (Math.log(U_95th) - Math.log(L_5th)) / 3.29;
  return { mu, sigma };
}

// ── Consequence control scaling ───────────────────────────────────────────────

// Adjust loss bounds for consequence-reducing controls using Bradley-Terry scaling.
// Returns scaled { L_5th, U_95th }.
// Note: this is a structured heuristic, not a derived formula — see README.
function adjustBoundsForConsequenceControls(L_5th, U_95th, T, P_c_current, P_c_new) {
  const scale = (T + P_c_current) / (T + P_c_new);
  return {
    L_5th:   L_5th   * scale,
    U_95th:  U_95th  * scale,
  };
}

// ── Monte Carlo simulation ────────────────────────────────────────────────────

/**
 * Run Monte Carlo simulation for annual loss.
 *
 * @param {object} inputs
 *   p_loss_event      - annual probability of a loss event: F × T/(T+P)
 *   S                 - P(secondary loss | primary loss)
 *   L_5th_primary     - 5th percentile primary loss (90% CI lower bound)
 *   U_95th_primary    - 95th percentile primary loss (90% CI upper bound)
 *   L_5th_secondary   - 5th percentile secondary loss (90% CI lower bound)
 *   U_95th_secondary  - 95th percentile secondary loss (90% CI upper bound)
 * @param {number} N - number of iterations (default 100,000)
 * @returns {Float64Array} total_loss - simulated annual loss for each iteration
 */
function monteCarlo(inputs, N = 100_000) {
  const {
    p_loss_event,
    S,
    L_5th_primary,   U_95th_primary,
    L_5th_secondary, U_95th_secondary,
  } = inputs;

  const primary   = lognormalParams(L_5th_primary,   U_95th_primary);
  const secondary = lognormalParams(L_5th_secondary, U_95th_secondary);

  const total_loss = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    if (Math.random() < p_loss_event) {
      const primaryLoss   = randomLognormal(primary.mu,   primary.sigma);
      const secondaryLoss = Math.random() < S
        ? randomLognormal(secondary.mu, secondary.sigma)
        : 0;
      total_loss[i] = primaryLoss + secondaryLoss;
    }
  }

  return total_loss;
}

// ── Output metrics ────────────────────────────────────────────────────────────

function percentile(sorted, p) {
  const idx = Math.floor(p * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

function summarise(total_loss) {
  const sorted = Float64Array.from(total_loss).sort();
  const mean   = total_loss.reduce((a, b) => a + b, 0) / total_loss.length;

  return {
    expectedAnnualLoss: mean,
    median:             percentile(sorted, 0.50),
    var90:              percentile(sorted, 0.90),
    var95:              percentile(sorted, 0.95),
    var99:              percentile(sorted, 0.99),
  };
}

// ── Loss Exceedance Curve (LEC) data ─────────────────────────────────────────

/**
 * Compute LEC data points: for each loss threshold, the probability of exceeding it.
 *
 * @param {Float64Array} total_loss
 * @param {number} numPoints - number of points on the curve (default 500)
 * @returns {{ loss: number[], exceedancePct: number[] }}
 */
function computeLEC(total_loss, numPoints = 500) {
  const sorted = Array.from(total_loss).sort((a, b) => a - b);
  const N      = sorted.length;
  const min    = sorted[0];
  const max    = sorted[N - 1];
  const step   = (max - min) / (numPoints - 1);

  const loss         = [];
  const exceedancePct = [];

  for (let i = 0; i < numPoints; i++) {
    const threshold = min + i * step;
    // Binary search for first value >= threshold
    let lo = 0, hi = N;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid] < threshold) lo = mid + 1;
      else hi = mid;
    }
    loss.push(threshold);
    exceedancePct.push(100 * (N - lo) / N);
  }

  return { loss, exceedancePct };
}

// ── Example run (Node.js only) ────────────────────────────────────────────────

if (typeof window === "undefined") {
  const inputs = {
    p_loss_event:      0.13,
    S:                 0.4,
    L_5th_primary:     100_000,
    U_95th_primary:    2_000_000,
    L_5th_secondary:   500_000,
    U_95th_secondary:  10_000_000,
  };

  const total_loss = monteCarlo(inputs, 100_000);
  const metrics    = summarise(total_loss);
  const lec        = computeLEC(total_loss);

  console.log("── Simulation outputs ──────────────────────────────");
  console.log(`Expected annual loss : ${metrics.expectedAnnualLoss.toFixed(0)}`);
  console.log(`Median annual loss   : ${metrics.median.toFixed(0)}`);
  console.log(`VaR 90%              : ${metrics.var90.toFixed(0)}`);
  console.log(`VaR 95%              : ${metrics.var95.toFixed(0)}`);
  console.log(`VaR 99%              : ${metrics.var99.toFixed(0)}`);
  console.log(`LEC data points      : ${lec.loss.length}`);
}

// ── Exports (for use as a module) ─────────────────────────────────────────────

if (typeof module !== "undefined") {
  module.exports = {
    lognormalParams,
    randomLognormal,
    adjustBoundsForConsequenceControls,
    monteCarlo,
    summarise,
    computeLEC,
  };
}
