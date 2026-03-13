const CAT_COLORS = {
  Food: '#e8845a', Transport: '#5a9ee8', Housing: '#8a6de8',
  Entertainment: '#e85a9e', Health: '#5ae8a0', Shopping: '#e8d45a',
  Education: '#5ae8d4', Other: '#a8a8a8'
};

let pieChart = null, barChart = null;

// ---- TABS ----
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'dashboard') loadStats();
    if (tab.dataset.tab === 'expenses') loadExpenses();
  });
});

// ---- TOAST ----
function toast(msg, type = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type === 'error' ? ' error' : '');
  setTimeout(() => el.classList.remove('show'), 2800);
}

// ---- FORMAT ----
function fmt(n) { return '$' + Number(n).toFixed(2); }
function fmtDate(d) {
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// ---- LOAD EXPENSES ----
async function loadExpenses() {
  const cat = document.getElementById('filter-category').value;
  const start = document.getElementById('filter-start').value;
  const end = document.getElementById('filter-end').value;
  const params = new URLSearchParams();
  if (cat) params.append('category', cat);
  if (start) params.append('start', start);
  if (end) params.append('end', end);
  const res = await fetch('/api/expenses?' + params);
  const data = await res.json();
  renderExpenses(data);
}

function renderExpenses(data) {
  const list = document.getElementById('expense-list');
  if (!data.length) {
    list.innerHTML = '<div class="empty-state">No expenses found</div>';
    return;
  }
  list.innerHTML = data.map(e => `
    <div class="expense-item" data-id="${e._id}">
      <span class="expense-cat-badge" style="background:${CAT_COLORS[e.category] || '#888'}"></span>
      <div class="expense-main">
        <div class="expense-title">${escHtml(e.title)}</div>
        <div class="expense-meta">${e.category} · ${fmtDate(e.date)}${e.note ? ' · ' + escHtml(e.note) : ''}</div>
      </div>
      <div class="expense-amount">${fmt(e.amount)}</div>
      <div class="expense-actions">
        <button class="btn-icon" onclick="openEdit('${e._id}')">Edit</button>
        <button class="btn-icon del" onclick="deleteExpense('${e._id}')">Del</button>
      </div>
    </div>
  `).join('');
}

// ---- LOAD STATS ----
async function loadStats() {
  const res = await fetch('/api/stats');
  const data = await res.json();
  const breakdown = data.breakdown || {};

  // totals
  const totalCount = Object.values(breakdown).reduce((a, v) => a + v.count, 0);
  document.getElementById('total-amount').textContent = fmt(data.total || 0);
  document.getElementById('total-count').textContent = `${totalCount} transaction${totalCount !== 1 ? 's' : ''}`;

  // top category
  const sorted = Object.entries(breakdown).sort((a, b) => b[1].total - a[1].total);
  if (sorted.length) {
    document.getElementById('top-category').textContent = sorted[0][0];
    document.getElementById('top-amount').textContent = fmt(sorted[0][1].total);
  }

  // this month
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthEntry = (data.monthly || []).find(m => m.label === monthKey);
  document.getElementById('month-amount').textContent = fmt(monthEntry ? monthEntry.total : 0);

  // pie chart
  const labels = Object.keys(breakdown);
  const vals = labels.map(k => breakdown[k].total);
  const colors = labels.map(k => CAT_COLORS[k] || '#888');

  if (pieChart) pieChart.destroy();
  const pieCtx = document.getElementById('pie-chart').getContext('2d');
  pieChart = new Chart(pieCtx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: vals, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }] },
    options: {
      cutout: '68%',
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` }
      }},
      animation: { duration: 600 }
    }
  });

  // legend
  const legend = document.getElementById('pie-legend');
  legend.innerHTML = labels.map((l, i) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${colors[i]}"></span>
      <span class="legend-label">${l}</span>
      <span class="legend-val">${fmt(vals[i])}</span>
    </div>
  `).join('');

  // bar chart
  const monthly = data.monthly || [];
  if (barChart) barChart.destroy();
  const barCtx = document.getElementById('bar-chart').getContext('2d');
  barChart = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: monthly.map(m => m.label),
      datasets: [{
        label: 'Total',
        data: monthly.map(m => m.total),
        backgroundColor: 'rgba(200,169,110,0.25)',
        borderColor: 'rgba(200,169,110,0.9)',
        borderWidth: 1,
        borderRadius: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } }
      },
      scales: {
        x: { ticks: { color: '#888', font: { family: 'DM Mono', size: 11 } }, grid: { color: '#2a2a2a' } },
        y: { ticks: { color: '#888', font: { family: 'DM Mono', size: 11 }, callback: v => '$' + v }, grid: { color: '#2a2a2a' } }
      },
      animation: { duration: 600 }
    }
  });
}

// ---- ADD EXPENSE ----
const today = new Date().toISOString().split('T')[0];
document.getElementById('f-date').value = today;

document.getElementById('expense-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const body = {
    title: document.getElementById('f-title').value,
    amount: document.getElementById('f-amount').value,
    category: document.getElementById('f-category').value,
    date: document.getElementById('f-date').value,
    note: document.getElementById('f-note').value,
  };
  const res = await fetch('/api/expenses', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (res.ok) {
    toast('Expense saved!');
    e.target.reset();
    document.getElementById('f-date').value = today;
  } else {
    const err = await res.json();
    toast(err.error || 'Error saving', 'error');
  }
});

// ---- FILTER ----
document.getElementById('btn-filter').addEventListener('click', loadExpenses);
document.getElementById('btn-clear-filter').addEventListener('click', () => {
  document.getElementById('filter-category').value = 'All';
  document.getElementById('filter-start').value = '';
  document.getElementById('filter-end').value = '';
  loadExpenses();
});

// ---- DELETE ----
async function deleteExpense(id) {
  if (!confirm('Delete this expense?')) return;
  await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
  toast('Deleted');
  loadExpenses();
}

// ---- EDIT MODAL ----
async function openEdit(id) {
  const res = await fetch('/api/expenses');
  const all = await res.json();
  const e = all.find(x => x._id === id);
  if (!e) return;
  document.getElementById('m-id').value = e._id;
  document.getElementById('m-title').value = e.title;
  document.getElementById('m-amount').value = e.amount;
  document.getElementById('m-category').value = e.category;
  document.getElementById('m-date').value = e.date;
  document.getElementById('m-note').value = e.note || '';
  document.getElementById('modal-overlay').classList.add('open');
}

document.getElementById('edit-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('m-id').value;
  const body = {
    title: document.getElementById('m-title').value,
    amount: document.getElementById('m-amount').value,
    category: document.getElementById('m-category').value,
    date: document.getElementById('m-date').value,
    note: document.getElementById('m-note').value,
  };
  const res = await fetch(`/api/expenses/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (res.ok) {
    closeModal();
    toast('Updated!');
    loadExpenses();
  } else {
    toast('Update failed', 'error');
  }
});

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

// ---- HELPERS ----
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---- INIT ----
loadStats();
loadExpenses();
