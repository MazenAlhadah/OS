
let processes = [];

const PRESETS = {
  basic: {
    quantum: 2,
    data: [
      { pid: 'P1', at: 0, bt: 5, priority: 2 },
      { pid: 'P2', at: 1, bt: 3, priority: 1 },
      { pid: 'P3', at: 2, bt: 8, priority: 4 },
      { pid: 'P4', at: 3, bt: 2, priority: 3 },
    ]
  },
  urgency: {
    quantum: 3,
    data: [
      { pid: 'P1', at: 0, bt: 10, priority: 5 },
      { pid: 'P2', at: 1, bt: 2, priority: 1 },
      { pid: 'P3', at: 2, bt: 4, priority: 2 },
      { pid: 'P4', at: 5, bt: 1, priority: 1 },
    ]
  },
  fairness: {
    quantum: 4,
    data: [
      { pid: 'P1', at: 0, bt: 6, priority: 2 },
      { pid: 'P2', at: 0, bt: 6, priority: 2 },
      { pid: 'P3', at: 0, bt: 6, priority: 2 },
      { pid: 'P4', at: 0, bt: 6, priority: 2 },
    ]
  },
  starvation: {
    quantum: 2,
    data: [
      { pid: 'P1', at: 0, bt: 2, priority: 1 },
      { pid: 'P2', at: 1, bt: 4, priority: 1 },
      { pid: 'P3', at: 2, bt: 3, priority: 1 },
      { pid: 'P4', at: 0, bt: 15, priority: 9 },
    ]
  }
};

function loadPreset(name) {
  const p = PRESETS[name];
  if (!p) return;
  processes = p.data.map(d => ({ ...d }));
  document.getElementById('timeQuantum').value = p.quantum;
  renderTable();
  hideResults();
  showMsg('inputError', '', false);
}

function addProcess() {
  const pid = document.getElementById('pid').value.trim().toUpperCase();
  const at = parseFloat(document.getElementById('arrivalTime').value);
  const bt = parseFloat(document.getElementById('burstTime').value);
  const priority = parseFloat(document.getElementById('priority').value);

  if (!pid) return showMsg('inputError', '❌ Process ID cannot be empty.', true);
  if (processes.find(p => p.pid === pid)) return showMsg('inputError', `❌ Process ID "${pid}" already exists.`, true);
  if (isNaN(at) || at < 0) return showMsg('inputError', '❌ Arrival Time must be ≥ 0.', true);
  if (isNaN(bt) || bt <= 0) return showMsg('inputError', '❌ Burst Time must be > 0.', true);
  if (isNaN(priority) || priority < 1) return showMsg('inputError', '❌ Priority must be a number ≥ 1.', true);

  showMsg('inputError', '', false);
  processes.push({ pid, at, bt, priority });
  renderTable();
  ['pid', 'arrivalTime', 'burstTime', 'priority'].forEach(id => {
    const el = document.getElementById(id);
    el.value = (id === 'arrivalTime') ? '0' : '';
  });
  document.getElementById('pid').focus();
}

function deleteProcess(pid) {
  processes = processes.filter(p => p.pid !== pid);
  renderTable();
  hideResults();
}

function resetAll() {
  processes = [];
  renderTable();
  hideResults();
  showMsg('inputError', '', false);
  document.getElementById('timeQuantum').value = 2;
  document.getElementById('preemptiveToggle').checked = false;
}

function renderTable() {
  const tbody = document.getElementById('processTableBody');
  if (processes.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-table">No processes added yet. Use the form above or load a preset.</td></tr>`;
    return;
  }
  tbody.innerHTML = processes.map(p => `
    <tr>
      <td class="pid-cell">${p.pid}</td>
      <td>${p.at}</td>
      <td>${p.bt}</td>
      <td>${p.priority}</td>
      <td>
        <button class="btn btn-danger btn-sm" onclick="deleteProcess('${p.pid}')">🗑 Delete</button>
      </td>
    </tr>
  `).join('');
}

function showMsg(id, text, show) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('show', show);
  el.style.display = show ? 'block' : 'none';
}

function fmt(n) { return isNaN(n) ? '—' : n.toFixed(2); }

function hideResults() {
  document.querySelectorAll('.result-section').forEach(el => el.classList.remove('visible'));
}

function showResults() {
  document.querySelectorAll('.result-section').forEach(el => el.classList.add('visible'));
}

const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#38bdf8',
  '#a78bfa', '#fb923c', '#34d399', '#f472b6', '#facc15',
  '#60a5fa', '#4ade80'
];
function getColor(index) { return PALETTE[index % PALETTE.length]; }

function runRoundRobin(procs, quantum) {
  const jobs = procs.map(p => ({ ...p, rem: p.bt, firstRun: -1, ct: 0 }))
    .sort((a, b) => a.at - b.at || a.pid.localeCompare(b.pid));

  const gantt = [];
  const queue = [];
  let time = 0;
  let done = 0;
  const n = jobs.length;
  let nextIdx = 0; 

  while (nextIdx < n && jobs[nextIdx].at <= time) queue.push(nextIdx++);

  while (done < n) {
    if (queue.length === 0) {
      if (nextIdx < n) {
        time = jobs[nextIdx].at;
        while (nextIdx < n && jobs[nextIdx].at <= time) queue.push(nextIdx++);
      }
      if (queue.length === 0) break;
    }

    const idx = queue.shift();
    const job = jobs[idx];

    if (job.firstRun === -1) job.firstRun = time;

    const slice = Math.min(quantum, job.rem);
    const start = time;
    time += slice;
    job.rem -= slice;

    gantt.push({ pid: job.pid, start, end: time });

    while (nextIdx < n && jobs[nextIdx].at <= time) queue.push(nextIdx++);

    if (job.rem > 0) {
      queue.push(idx);
    } else {
      job.ct = time;
      done++;
    }
  }

  const result = jobs.map(j => ({
    pid: j.pid,
    at: j.at,
    bt: j.bt,
    ct: j.ct,
    wt: j.ct - j.at - j.bt,
    tat: j.ct - j.at,
    rt: j.firstRun - j.at
  }));

  return { gantt, result };
}

function runPriorityNonPreemptive(procs) {
  const jobs = procs.map(p => ({ ...p, rem: p.bt, done: false, ct: 0, firstRun: -1 }));
  const gantt = [];
  let time = 0;
  let completed = 0;
  const n = jobs.length;

  while (completed < n) {
    const avail = jobs.filter(j => !j.done && j.at <= time);
    if (avail.length === 0) {
      // Idle
      const next = jobs.filter(j => !j.done).sort((a, b) => a.at - b.at)[0];
      if (next) time = next.at;
      continue;
    }
    avail.sort((a, b) => a.priority - b.priority || a.at - b.at);
    const job = avail[0];
    if (job.firstRun === -1) job.firstRun = time;
    const start = time;
    time += job.rem;
    job.rem = 0;
    job.done = true;
    job.ct = time;
    completed++;
    gantt.push({ pid: job.pid, start, end: time });
  }

  const result = jobs.map(j => ({
    pid: j.pid, at: j.at, bt: j.bt, priority: j.priority,
    ct: j.ct, wt: j.ct - j.at - j.bt, tat: j.ct - j.at, rt: j.firstRun - j.at
  }));
  return { gantt, result };
}

function runPriorityPreemptive(procs) {
  const jobs = procs.map(p => ({ ...p, rem: p.bt, done: false, ct: 0, firstRun: -1 }));
  const gantt = [];
  let time = 0;
  let completed = 0;
  const n = jobs.length;
  let lastPid = null;
  let lastStart = 0;

  const maxTime = jobs.reduce((s, j) => s + j.bt, 0) + jobs.reduce((m, j) => Math.max(m, j.at), 0) + 1;

  while (completed < n && time <= maxTime) {
    const avail = jobs.filter(j => !j.done && j.at <= time);
    if (avail.length === 0) { time++; continue; }
    avail.sort((a, b) => a.priority - b.priority || a.at - b.at);
    const job = avail[0];

    if (job.firstRun === -1) job.firstRun = time;

    if (job.pid !== lastPid) {
      if (lastPid !== null) gantt.push({ pid: lastPid, start: lastStart, end: time });
      lastPid = job.pid;
      lastStart = time;
    }

    job.rem--;
    time++;

    if (job.rem === 0) {
      job.done = true;
      job.ct = time;
      completed++;
      gantt.push({ pid: job.pid, start: lastStart, end: time });
      lastPid = null;
    }
  }

  if (lastPid !== null) gantt.push({ pid: lastPid, start: lastStart, end: time });

  const result = jobs.map(j => ({
    pid: j.pid, at: j.at, bt: j.bt, priority: j.priority,
    ct: j.ct, wt: j.ct - j.at - j.bt, tat: j.ct - j.at, rt: j.firstRun - j.at
  }));
  return { gantt, result };
}

function renderGantt(containerId, gantt, colorMap, cssClass) {
  const wrapper = document.getElementById(containerId);
  if (!gantt || gantt.length === 0) {
    wrapper.innerHTML = '<div class="gantt-placeholder">No data.</div>'; return;
  }

  const merged = [];
  gantt.forEach(b => {
    const last = merged[merged.length - 1];
    if (last && last.pid === b.pid && last.end === b.start) last.end = b.end;
    else merged.push({ ...b });
  });

  const totalTime = merged[merged.length - 1].end - merged[0].start;
  const minPct = 3;

  let html = '<div class="gantt-chart">';
  let timeHtml = '<div class="gantt-times">';
  const times = new Set();

  merged.forEach(b => {
    const dur = b.end - b.start;
    const widthPct = Math.max(minPct, (dur / totalTime) * 100);
    const color = colorMap[b.pid] || '#6366f1';
    const isIdle = b.pid === 'IDLE';
    const style = isIdle ? '' : `background:${color};`;
    const delay = merged.indexOf(b) * 40;
    html += `
      <div class="${cssClass} gantt-block${isIdle ? ' idle' : ''}"
           style="${style}width:${widthPct}%;animation-delay:${delay}ms"
           title="${b.pid}: ${b.start}→${b.end} (${dur}u)">
        ${isIdle ? '—' : b.pid}
      </div>`;
    times.add(b.start);
    times.add(b.end);
  });

  html += '</div>';
  const sortedTimes = [...times].sort((a, b) => a - b);
  sortedTimes.forEach(t => { timeHtml += `<span>${t}</span>`; });
  timeHtml += '</div>';

  wrapper.innerHTML = html + timeHtml;
}

function renderMetrics(tbodyId, result, hasPriority) {
  const tbody = document.getElementById(tbodyId);
  let wtSum = 0, tatSum = 0, rtSum = 0;
  const n = result.length;

  let rows = result.map(r => {
    wtSum += r.wt;
    tatSum += r.tat;
    rtSum += r.rt;
    const prCell = hasPriority ? `<td>${r.priority}</td>` : '';
    return `<tr>
      <td class="pid-cell">${r.pid}</td>
      <td>${r.at}</td><td>${r.bt}</td>
      ${prCell}
      <td class="col-wt">${fmt(r.wt)}</td>
      <td class="col-tat">${fmt(r.tat)}</td>
      <td class="col-rt">${fmt(r.rt)}</td>
    </tr>`;
  }).join('');

  const prCell = hasPriority ? '<td>—</td>' : '';
  rows += `<tr class="avg-row">
    <td colspan="3">Averages</td>${prCell}
    <td class="col-wt">${fmt(wtSum / n)}</td>
    <td class="col-tat">${fmt(tatSum / n)}</td>
    <td class="col-rt">${fmt(rtSum / n)}</td>
  </tr>`;

  tbody.innerHTML = rows;
  return { avgWT: wtSum / n, avgTAT: tatSum / n, avgRT: rtSum / n };
}

function renderStats(containerId, avgs, cssClass) {
  const el = document.getElementById(containerId);
  el.innerHTML = ['WT', 'TAT', 'RT'].map((label, i) => {
    const val = [avgs.avgWT, avgs.avgTAT, avgs.avgRT][i];
    return `<div class="stat-card ${cssClass}">
      <div class="stat-label">Avg ${label}</div>
      <div class="stat-value">${fmt(val)}</div>
    </div>`;
  }).join('');
}

function renderLegend(containerId, procs, colorMap) {
  const el = document.getElementById(containerId);
  el.innerHTML = procs.map(p =>
    `<span><span class="legend-dot" style="background:${colorMap[p.pid]}"></span>${p.pid} (P${p.priority})</span>`
  ).join('');
}

function renderComparison(rrAvg, psAvg) {
  const metrics = [
    { label: 'Avg Waiting Time', rrVal: rrAvg.avgWT, psVal: psAvg.avgWT },
    { label: 'Avg Turnaround Time', rrVal: rrAvg.avgTAT, psVal: psAvg.avgTAT },
    { label: 'Avg Response Time', rrVal: rrAvg.avgRT, psVal: psAvg.avgRT },
  ];

  let barsHtml = '';
  let rrWins = 0, psWins = 0;

  metrics.forEach(m => {
    const max = Math.max(m.rrVal, m.psVal) || 1;
    const rrPct = (m.rrVal / max) * 100;
    const psPct = (m.psVal / max) * 100;
    const rrBetter = m.rrVal <= m.psVal;
    const winner = rrBetter ? 'RR' : 'PS';
    if (rrBetter) rrWins++; else psWins++;

    barsHtml += `
      <div class="compare-metric">
        <div class="metric-label">${m.label}
          <span class="winner-badge">✓ ${winner} wins</span>
        </div>
        <div style="margin-bottom:.4rem;">
          <div style="font-size:.74rem;color:var(--rr-light);margin-bottom:.25rem;">Round Robin</div>
          <div class="bar-track">
            <div class="bar-fill rr-bar" style="width:${rrPct}%">${fmt(m.rrVal)}</div>
          </div>
        </div>
        <div>
          <div style="font-size:.74rem;color:var(--ps-light);margin-bottom:.25rem;">Priority</div>
          <div class="bar-track">
            <div class="bar-fill ps-bar" style="width:${psPct}%">${fmt(m.psVal)}</div>
          </div>
        </div>
      </div>`;
  });

  document.getElementById('comparisonBars').innerHTML = barsHtml;

  // Overall winner
  const overallWinner = rrWins >= psWins ? 'Round Robin' : 'Priority Scheduling';
  const winColor = rrWins >= psWins ? 'var(--rr-light)' : 'var(--ps-light)';
  document.getElementById('comparisonSummary').innerHTML = `
    <div class="alert-box success-box">
      <span class="icon"></span>
      <div>
        <strong>Overall Winner: <span style="color:${winColor}">${overallWinner}</span></strong><br/>
        RR won ${rrWins}/3 metrics &nbsp;|&nbsp; Priority won ${psWins}/3 metrics.
      </div>
    </div>`;
}

function checkStarvation(result, gantt) {
  const el = document.getElementById('starvationAlert');
  if (!result || result.length === 0) { el.innerHTML = ''; return; }

  const avgWT = result.reduce((s, r) => s + r.wt, 0) / result.length;
  const starved = result.filter(r => r.wt > avgWT * 2.5 && r.wt > 10);

  if (starved.length > 0) {
    el.innerHTML = `
      <div class="alert-box warn-box" style="margin-top:.75rem;">
        <span class="icon"></span>
        <div>
          <strong>Potential Starvation Detected!</strong><br/>
          Process(es) <strong>${starved.map(r => r.pid).join(', ')}</strong>
          had unusually high waiting time (${starved.map(r => fmt(r.wt)).join(', ')} units).
          Low-priority processes may starve without aging mechanisms.
        </div>
      </div>`;
  } else {
    el.innerHTML = `
      <div class="alert-box success-box" style="margin-top:.75rem;">
        <span class="icon">✅</span>
        <div>No significant starvation detected in this run.</div>
      </div>`;
  }
}

function renderFairness(rrResult, psResult) {
  function stdDev(arr) {
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
    return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
  }
  const rrSD = stdDev(rrResult.map(r => r.wt));
  const psSD = stdDev(psResult.map(r => r.wt));
  const fairer = rrSD <= psSD ? 'Round Robin' : 'Priority Scheduling';
  const color = rrSD <= psSD ? 'var(--rr-light)' : 'var(--ps-light)';

  document.getElementById('fairnessSummary').innerHTML = `
    <div class="alert-box info-box">
      <span class="icon"></span>
      <div>
        <strong>Fairness (WT Std Dev):</strong><br/>
        RR: ${fmt(rrSD)} &nbsp;|&nbsp; Priority: ${fmt(psSD)}<br/>
        <strong style="color:${color}">${fairer}</strong> distributes waiting time more evenly.
      </div>
    </div>
    <div class="alert-box info-box" style="margin-top:.5rem;">
      <span class="icon"></span>
      <div>
        <strong>Round Robin</strong> guarantees CPU time to every process within 
        <em>n × quantum</em> units — ideal for time-sharing systems.<br/>
        <strong>Priority Scheduling</strong> serves urgent tasks first but risks 
        starving low-priority processes without aging.
      </div>
    </div>`;
}

function runSimulation() {
  if (processes.length === 0) {
    showMsg('runWarning', ' Add at least one process first.', true);
    return;
  }
  showMsg('runWarning', '', false);

  const quantum = parseInt(document.getElementById('timeQuantum').value);
  if (isNaN(quantum) || quantum <= 0) {
    showMsg('runWarning', ' Time Quantum must be > 0.', true);
    return;
  }

  const isPreemptive = document.getElementById('preemptiveToggle').checked;

  const colorMap = {};
  processes.forEach((p, i) => { colorMap[p.pid] = getColor(i); });

  const rrOut = runRoundRobin(processes, quantum);
  const psOut = isPreemptive
    ? runPriorityPreemptive(processes)
    : runPriorityNonPreemptive(processes);

  renderGantt('rrGanttWrapper', rrOut.gantt, colorMap, 'rr-block');
  renderGantt('psGanttWrapper', psOut.gantt, colorMap, 'ps-block');

  document.getElementById('rrQuantumLabel').textContent = `Quantum = ${quantum}`;
  document.getElementById('psModeLabel').textContent = isPreemptive ? 'Preemptive' : 'Non-Preemptive';

  renderLegend('rrLegend', processes, colorMap);
  renderLegend('psLegend', processes, colorMap);

  const rrAvg = renderMetrics('rrMetricsBody', rrOut.result, false);
  const psAvg = renderMetrics('psMetricsBody', psOut.result, true);

  renderStats('rrStats', rrAvg, 'stat-rr');
  renderStats('psStats', psAvg, 'stat-ps');

  renderComparison(rrAvg, psAvg);

  checkStarvation(psOut.result, psOut.gantt);

  renderFairness(rrOut.result, psOut.result);

  showResults();
  document.getElementById('ganttSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && ['pid', 'arrivalTime', 'burstTime', 'priority'].includes(e.target.id)) {
    addProcess();
  }
});

renderTable();
