// ═══════════════════════════════════════════════════════════════════════════
// Quantarisk light calculator — interaction logic (vanilla)
// ═══════════════════════════════════════════════════════════════════════════
let fMethod = "direct";
let lecChart = null;
let lastResults = null;

const $ = (id) => document.getElementById(id);
const numv = (id, fb = 0) => { const n = parseFloat($(id).value); return Number.isFinite(n) ? n : fb; };

function fmt(n) {
  if (n === 0) return "0";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toFixed(0);
}

function setFMethod(m) {
  fMethod = m;
  document.querySelectorAll("#fmethodseg button").forEach((b) => b.classList.toggle("active", b.dataset.m === m));
  document.querySelectorAll(".method-panel").forEach((p) => p.classList.remove("active"));
  $("f-" + m).classList.add("active");
  recalc();
}

function computeF() {
  if (fMethod === "direct") return numv("F-direct");
  if (fMethod === "lrs") return (numv("F-lrs-s") + 1) / (numv("F-lrs-n", 1) + 2);
  const min = numv("F-pert-min"), mode = numv("F-pert-mode"), max = numv("F-pert-max"), lam = numv("F-pert-lambda");
  return (min + lam * mode + max) / (lam + 2);
}

// Live derived values (cheap) — runs on every input
function recalc() {
  const F = computeF();
  const T = numv("T"), P = numv("P");
  const denom = T + P;
  const vuln = denom > 0 ? T / denom : 0;
  const pLoss = F * vuln;

  $("f-disp").textContent = F.toFixed(4);
  $("ploss-disp").textContent = pLoss.toFixed(4);

  const tPct = Math.round(vuln * 100);
  $("t-pct").textContent = tPct + "%";
  $("p-pct").textContent = (100 - tPct) + "%";
  $("vuln-fill").style.width = tPct + "%";
  $("vuln-val").textContent = vuln.toFixed(3);
}

function runSimulation() {
  const F = computeF();
  const T = numv("T"), P = numv("P");
  const inputs = {
    p_loss_event: F * (T / (T + P)),
    S: numv("S"),
    L_5th_primary: numv("L5-primary"),
    U_95th_primary: numv("U95-primary"),
    L_5th_secondary: numv("L5-secondary"),
    U_95th_secondary: numv("U95-secondary"),
  };
  const currency = $("currency").value.trim();
  const N = parseInt($("N").value) || 50000;

  const total_loss = monteCarlo(inputs, N);
  const metrics = summarise(total_loss);
  const lec = computeLEC(total_loss, 300);
  lastResults = { inputs, metrics, lec, total_loss, currency, F, T, P };

  // hero
  $("r-mean").textContent = fmt(metrics.expectedAnnualLoss);
  $("r-mean-cur").textContent = currency;
  const zeroPct = 100 * (1 - inputs.p_loss_event);
  $("r-sub").textContent = `${zeroPct.toFixed(0)}% of simulated years see no loss event · ${(N).toLocaleString()} iterations`;

  // metrics
  $("r-median").textContent = fmt(metrics.median);
  $("r-var90").textContent = fmt(metrics.var90);
  $("r-var95").textContent = fmt(metrics.var95);
  $("r-var99").textContent = fmt(metrics.var99);
  ["cur-1","cur-2","cur-3","cur-4"].forEach((id) => $(id).textContent = currency);
  $("loss-years").textContent = `P(loss) = ${inputs.p_loss_event.toFixed(3)}`;

  drawChart(lec, total_loss, currency);
}

function drawChart(lec, total_loss, currency) {
  const sorted = Array.from(total_loss).sort((a, b) => a - b);
  const xMax = sorted[Math.floor(0.99 * sorted.length)] || sorted[sorted.length - 1];
  const yMax = Math.min(100, lec.exceedancePct[0] * 1.1);
  const data = lec.loss.map((x, i) => ({ x, y: lec.exceedancePct[i] }));
  const monoFont = { family: "'IBM Plex Mono'", size: 10 };

  const ctx = $("lec").getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, 230);
  grad.addColorStop(0, "rgba(47,109,240,.18)");
  grad.addColorStop(1, "rgba(47,109,240,0)");

  if (lecChart) lecChart.destroy();
  lecChart = new Chart(ctx, {
    type: "line",
    data: { datasets: [{ data, borderColor: "#2f6df0", borderWidth: 2.5, pointRadius: 0,
      fill: { target: "origin", above: grad }, tension: 0.15 }] },
    options: {
      responsive: true, maintainAspectRatio: false, parsing: false,
      animation: { duration: 600, easing: "easeOutQuart" },
      scales: {
        x: { type: "linear", min: 0, max: xMax,
          title: { display: true, text: `Annual loss (${currency})`, color: "#6a7588", font: monoFont },
          ticks: { callback: (v) => fmt(v), maxTicksLimit: 7, color: "#98a2b5", font: monoFont },
          grid: { color: "#eef2f8" }, border: { color: "#e5eaf2" } },
        y: { min: 0, max: yMax,
          title: { display: true, text: "Exceedance (%)", color: "#6a7588", font: monoFont },
          ticks: { color: "#98a2b5", font: monoFont }, grid: { color: "#eef2f8" }, border: { color: "#e5eaf2" } },
      },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: "#0c1a36", borderColor: "#11244a", borderWidth: 1, padding: 10,
          titleColor: "#fff", bodyColor: "#9fb1d4", titleFont: { family: "'IBM Plex Mono'", size: 12 },
          bodyFont: { family: "'IBM Plex Mono'", size: 11 }, displayColors: false,
          callbacks: { title: (i) => fmt(i[0].parsed.x) + " " + currency,
            label: (i) => i.parsed.y.toFixed(1) + "% chance of exceeding" } },
      },
    },
  });
}

function downloadExcel() {
  if (!lastResults) { runSimulation(); }
  const { inputs, metrics, total_loss, currency, F, T, P } = lastResults;
  const cur = currency || "—";
  const summary = [
    ["INPUTS", ""], ["F — Annual threat frequency", F], ["T — Threat strength", T], ["P — Protection strength", P],
    ["P(loss event)", inputs.p_loss_event], ["S — P(secondary | primary)", inputs.S],
    ["Primary L₅th", inputs.L_5th_primary], ["Primary U₉₅th", inputs.U_95th_primary],
    ["Secondary L₅th", inputs.L_5th_secondary], ["Secondary U₉₅th", inputs.U_95th_secondary], ["Currency", cur],
    [""], ["OUTPUTS", ""], [`Expected Annual Loss (${cur})`, metrics.expectedAnnualLoss],
    [`Median (${cur})`, metrics.median], [`VaR 90% (${cur})`, metrics.var90],
    [`VaR 95% (${cur})`, metrics.var95], [`VaR 99% (${cur})`, metrics.var99],
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[`Iteration`, `Annual Loss (${cur})`],
    ...Array.from(total_loss).map((v, i) => [i + 1, v])]), "Simulation Results");
  XLSX.writeFile(wb, "quantarisk_results.xlsx");
}

// init
if (window.lucide) lucide.createIcons();
recalc();
runSimulation();
