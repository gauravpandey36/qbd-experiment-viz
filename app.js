/* ------------------------------------------------------------------
 * QbD Experiment: journal/article version
 * Single responsibility: populate the §VII scenario table from
 * harness output (data/placeholder.json) and wire the live filter.
 * Nothing else. The rest of the page is static editorial HTML.
 * ------------------------------------------------------------------ */

const METRIC_LABELS = {
  M1: 'M1',
  M2: 'M2',
  M3: 'M3',
  M4: 'M4',
  M5: 'M5',
  M6: 'M6',
};

const LAYER_DISPLAY = { A: 'A', B: 'B', C: 'C' };

let SCENARIOS = [];

async function boot() {
  try {
    const res = await fetch('data/placeholder.json', { cache: 'no-store' });
    const data = await res.json();
    SCENARIOS = normalizeScenarios(data);
    renderTable(SCENARIOS);
    document.getElementById('scenario-count').textContent =
      `${SCENARIOS.length} scenarios`;
  } catch (err) {
    console.error('Could not load data/placeholder.json', err);
    const tbody = document.getElementById('scenario-tbody');
    if (tbody) {
      tbody.innerHTML =
        `<tr><td colspan="6" style="padding:20px;color:#a00;font-style:italic">
        Could not load <code>data/placeholder.json</code>.
        If you opened this file via <code>file://</code>, run
        <code>python3 -m http.server</code> and open
        <code>http://127.0.0.1:8000</code>.</td></tr>`;
    }
  }

  const search = document.getElementById('scenario-search');
  if (search) {
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      if (!q) {
        renderTable(SCENARIOS);
        document.getElementById('scenario-count').textContent =
          `${SCENARIOS.length} scenarios`;
        return;
      }
      const filtered = SCENARIOS.filter(s =>
        (s.id + ' ' + s.layer + ' ' + s.family + ' ' + s.source + ' ' + s.what + ' ' + s.metrics)
          .toLowerCase()
          .includes(q)
      );
      renderTable(filtered);
      document.getElementById('scenario-count').textContent =
        `${filtered.length} of ${SCENARIOS.length} scenarios`;
    });
  }
}

function normalizeScenarios(data) {
  // The harness output stores scenarios as data.scenarios = [{scenario_id, layer, family, source, ...}].
  // Map every shape we have seen into a single flat row used by the table.
  const arr = Array.isArray(data.scenarios) ? data.scenarios : [];
  return arr.map(s => {
    const id = s.scenario_id || s.id || '?';
    const layer = (s.layer || '').toString().replace(/^layer[\s_-]?/i, '').toUpperCase() || '?';
    const family = s.family || s.scenario_family || '';
    const sourceObj = s.source || {};
    const sourceType = sourceObj.type || s.source_type || '';
    const sourceCitation = sourceObj.citation || s.source_citation || '';
    const sourceShort = sourceType || (sourceCitation ? sourceCitation.split('.')[0] : '');
    const what = s.what_went_wrong || s.trigger || s.what || '';
    const metrics = Array.isArray(s.primary_metrics_affected)
      ? s.primary_metrics_affected.map(m => m.replace(/_.*$/, '').toUpperCase()).filter(Boolean)
      : [];
    return {
      id, layer, family, source: sourceShort, source_full: sourceCitation,
      what, metrics: metrics.join(', '),
    };
  });
}

function renderTable(rows) {
  const tbody = document.getElementById('scenario-tbody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML =
      `<tr><td colspan="6" style="padding:24px;color:var(--ink-muted);font-style:italic;text-align:center">
       No scenarios match the filter.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="sid">${escapeHtml(r.id)}</td>
      <td class="layer">${escapeHtml(LAYER_DISPLAY[r.layer] || r.layer)}</td>
      <td class="family">${escapeHtml(r.family)}</td>
      <td class="source" title="${escapeAttr(r.source_full)}">${escapeHtml(r.source)}</td>
      <td class="what">${escapeHtml(truncate(r.what, 200))}</td>
      <td class="metrics">${escapeHtml(r.metrics)}</td>
    </tr>
  `).join('');
}

function truncate(s, n) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/\n/g, ' ');
}

document.addEventListener('DOMContentLoaded', boot);
