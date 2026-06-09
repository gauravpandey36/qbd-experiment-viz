/* ------------------------------------------------------------------
 * QbD Experiment: interactive viz
 * Vanilla JS + Chart.js (CDN). Loads data/placeholder.json then
 * paints Hero stats, Panel 1 (filterable scenario diff), Panel 2
 * (per-metric bar charts), Panel 3 (cost model sliders), Panel 4
 * (CtQ rubric heatmap), Panel 5 (layer-breakdown stacked bar).
 * ------------------------------------------------------------------ */

const PALETTE = {
  trad: '#b45309',
  tradSoft: 'rgba(180, 83, 9, 0.18)',
  qbd: '#0b4a6f',
  qbdSoft: 'rgba(11, 74, 111, 0.18)',
  accent: '#14b8a6',
  ink: '#0f2433',
  inkMuted: '#6b8197',
  line: '#dde7ef',
};

const FAMILIES_ORDER = ['All', 'Monitoring', 'Data Mgmt', 'Protocol Design', 'DCT', 'Safety / PV', 'Statistics', 'Supply'];

let DATA = null;
let activeFamily = 'All';

/* ---------- bootstrap ---------- */
async function boot() {
  try {
    const res = await fetch('data/placeholder.json', { cache: 'no-store' });
    DATA = await res.json();
  } catch (err) {
    console.error('Failed to load data/placeholder.json', err);
    document.body.insertAdjacentHTML('afterbegin',
      '<div style="background:#fee;color:#900;padding:16px;text-align:center;font-family:system-ui">Could not load <code>data/placeholder.json</code>. If you opened the file directly (<code>file://</code>), some browsers block <code>fetch</code>. Try: <code>python3 -m http.server</code> and open <code>http://127.0.0.1:8000</code>.</div>');
    return;
  }
  // paintHero() removed 2026-06-08: hero stats are now static Tailwind Plus markup
  // hardcoded directly in index.html. Keeping the function definition below for
  // reference, but no longer invoked from init.
  paintScenarioFilters();
  paintScenarios();
  paintMetricCharts();
  setupCostModel();
  paintHeatmap('heatmap-trad', DATA.rubric.trad_scores);
  paintHeatmap('heatmap-qbd', DATA.rubric.qbd_scores);
  paintLayerChart();
}

/* ---------- hero ---------- */
function paintHero() {
  const root = document.getElementById('hero-stats');
  root.innerHTML = DATA.headline_stats.map(s => `
    <div class="stat-tile">
      <div class="stat-label-top">${s.label}</div>
      <div class="stat-pair">
        <span class="stat-trad">${s.trad}</span>
        <span class="stat-arrow">&rarr;</span>
        <span class="stat-qbd">${s.qbd}</span>
      </div>
      <div class="stat-delta">${s.delta}</div>
      <div class="stat-source">${s.source}</div>
    </div>
  `).join('');
}

/* ---------- Panel 1 ---------- */
function paintScenarioFilters() {
  const root = document.getElementById('scenario-filters');
  const present = Array.from(new Set(DATA.scenarios.map(s => s.family)));
  const list = FAMILIES_ORDER.filter(f => f === 'All' || present.includes(f));
  root.innerHTML = list.map(f => `
    <button data-family="${f}" class="${f === activeFamily ? 'active' : ''}">${f}</button>
  `).join('');
  root.querySelectorAll('button').forEach(b => {
    b.addEventListener('click', () => {
      activeFamily = b.dataset.family;
      root.querySelectorAll('button').forEach(x => x.classList.toggle('active', x.dataset.family === activeFamily));
      paintScenarios();
    });
  });
}

function paintScenarios() {
  const root = document.getElementById('scenario-grid');
  const filtered = activeFamily === 'All'
    ? DATA.scenarios
    : DATA.scenarios.filter(s => s.family === activeFamily);
  root.innerHTML = filtered.map(s => `
    <div class="scenario-card">
      <div>
        <span class="scenario-id">${s.id}</span>
        <span class="scenario-fam">${s.family}</span>
      </div>
      <div class="scenario-title">${s.title}</div>
      <div class="scenario-source">Source: ${s.source}</div>
      <div class="arms">
        <div class="arm trad">
          <div class="arm-label">Traditional</div>
          <span class="decision-chip ${chipCls(s.trad)}">${s.trad}</span>
        </div>
        <div class="arm qbd">
          <div class="arm-label">QbD</div>
          <span class="decision-chip ${chipCls(s.qbd)}">${s.qbd}</span>
          <div class="arm-path">${s.qbd_path}</div>
        </div>
      </div>
    </div>
  `).join('') || `<div class="card"><p style="color:var(--ink-muted);margin:0;">No scenarios in this family.</p></div>`;
}

function chipCls(decision) {
  return decision.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}

/* ---------- Panel 2: per-metric bar charts ---------- */
function paintMetricCharts() {
  const root = document.getElementById('metric-charts');
  root.innerHTML = DATA.metrics.map(m => `
    <div class="card">
      <h3>${m.id} &middot; ${m.name}</h3>
      <div class="chart-wrap"><canvas id="chart-${m.id}"></canvas></div>
      <p class="caption">Unit: ${m.unit}. Anchor: ${m.source}.</p>
    </div>
  `).join('');

  DATA.metrics.forEach(m => {
    const ctx = document.getElementById(`chart-${m.id}`).getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Traditional', 'QbD'],
        datasets: [{
          label: m.name,
          data: [m.trad, m.qbd],
          backgroundColor: [PALETTE.tradSoft, PALETTE.qbdSoft],
          borderColor: [PALETTE.trad, PALETTE.qbd],
          borderWidth: 2,
          borderRadius: 8,
          maxBarThickness: 80,
          errorBars: { trad: m.trad_err, qbd: m.qbd_err },
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const err = ctx.dataIndex === 0 ? m.trad_err : m.qbd_err;
                return `${ctx.raw} ${m.unit} (±${err})`;
              }
            }
          }
        },
        scales: {
          y: { beginAtZero: true, ticks: { color: PALETTE.inkMuted, font: { family: 'JetBrains Mono' } }, grid: { color: PALETTE.line } },
          x: { ticks: { color: PALETTE.ink, font: { weight: '600' } }, grid: { display: false } }
        }
      },
      plugins: [errorBarPlugin]
    });
  });
}

/* error bars on bar charts (mini-plugin) */
const errorBarPlugin = {
  id: 'errorBars',
  afterDatasetsDraw(chart) {
    const ds = chart.data.datasets[0];
    if (!ds || !ds.errorBars) return;
    const meta = chart.getDatasetMeta(0);
    const ctx = chart.ctx;
    const yScale = chart.scales.y;
    const errs = [ds.errorBars.trad, ds.errorBars.qbd];
    ctx.save();
    ctx.strokeStyle = PALETTE.ink;
    ctx.lineWidth = 1.5;
    meta.data.forEach((bar, i) => {
      const val = ds.data[i];
      const err = errs[i];
      if (err == null) return;
      const xc = bar.x;
      const yTop = yScale.getPixelForValue(val + err);
      const yBot = yScale.getPixelForValue(val - err);
      const w = 10;
      ctx.beginPath();
      ctx.moveTo(xc, yTop); ctx.lineTo(xc, yBot);
      ctx.moveTo(xc - w, yTop); ctx.lineTo(xc + w, yTop);
      ctx.moveTo(xc - w, yBot); ctx.lineTo(xc + w, yBot);
      ctx.stroke();
    });
    ctx.restore();
  }
};

/* ---------- Panel 3: cost model ---------- */
function setupCostModel() {
  const ids = ['s-amend-cost', 's-burn', 's-cycle', 's-sites'];
  ids.forEach(id => {
    document.getElementById(id).addEventListener('input', recomputeCost);
  });
  recomputeCost();
}

function fmtUSD(n) {
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + Math.round(n / 1e3).toLocaleString() + 'K';
  return '$' + Math.round(n).toLocaleString();
}

function recomputeCost() {
  const amendCost = +document.getElementById('s-amend-cost').value;
  const burn      = +document.getElementById('s-burn').value;
  const cycle     = +document.getElementById('s-cycle').value;
  const sites     = +document.getElementById('s-sites').value;

  document.getElementById('v-amend-cost').textContent = '$' + amendCost.toLocaleString();
  document.getElementById('v-burn').textContent       = '$' + burn.toLocaleString();
  document.getElementById('v-cycle').textContent      = cycle + ' days';
  document.getElementById('v-sites').textContent      = sites;

  const tradAmends = DATA.metrics.find(m => m.id === 'M1').trad; // 3.3
  const qbdAmends  = DATA.metrics.find(m => m.id === 'M1').qbd;  // 2.0

  const tradTotal = tradAmends * amendCost;
  const qbdTotal  = qbdAmends  * amendCost;
  const deltaCost = tradTotal - qbdTotal;
  const deltaPct  = (deltaCost / tradTotal) * 100;

  // duration delta: QbD saves half the avoided amendments' cycle days
  const avoidedAmends = tradAmends - qbdAmends;
  const deltaDays = Math.round((avoidedAmends / tradAmends) * cycle);
  const burnSave = deltaDays * (burn / 7) * sites;

  document.getElementById('o-trad-total').textContent  = fmtUSD(tradTotal);
  document.getElementById('o-qbd-total').textContent   = fmtUSD(qbdTotal);
  document.getElementById('o-delta-cost').textContent  = fmtUSD(deltaCost);
  document.getElementById('o-delta-pct').textContent   = deltaPct.toFixed(1) + '%';
  document.getElementById('o-delta-days').textContent  = deltaDays + ' days';
  document.getElementById('o-burn-save').textContent   = fmtUSD(burnSave);
}

/* ---------- Panel 4: rubric heatmap ---------- */
function paintHeatmap(elId, scores) {
  const root = document.getElementById(elId);
  const fams = DATA.rubric.ctq_families;
  const lvls = DATA.rubric.level_labels;
  let html = '<div class="hm-h"></div>';
  lvls.forEach(l => { html += `<div class="hm-h">${l}</div>`; });
  fams.forEach((f, i) => {
    html += `<div class="hm-r">${f}</div>`;
    scores[i].forEach((v) => {
      html += `<div class="hm-c lv${v}">${v}</div>`;
    });
  });
  root.innerHTML = html;
}

/* ---------- Panel 5: layer breakdown ---------- */
function paintLayerChart() {
  const ctx = document.getElementById('layer-chart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: DATA.layer_breakdown.layers,
      datasets: [
        {
          label: 'Traditional arm',
          data: DATA.layer_breakdown.trad_amendments,
          backgroundColor: PALETTE.tradSoft,
          borderColor: PALETTE.trad,
          borderWidth: 2,
          borderRadius: 6,
          maxBarThickness: 60,
        },
        {
          label: 'QbD arm',
          data: DATA.layer_breakdown.qbd_amendments,
          backgroundColor: PALETTE.qbdSoft,
          borderColor: PALETTE.qbd,
          borderWidth: 2,
          borderRadius: 6,
          maxBarThickness: 60,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: PALETTE.ink, font: { weight: '600' } } },
        tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw} amendments / protocol` } }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Amendments per protocol', color: PALETTE.inkMuted },
          ticks: { color: PALETTE.inkMuted, font: { family: 'JetBrains Mono' } },
          grid: { color: PALETTE.line }
        },
        x: { ticks: { color: PALETTE.ink, font: { weight: '600' } }, grid: { display: false } }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', boot);
