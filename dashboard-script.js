// ════════════════════════════════════════════════════════════════════════
// STORAGE HELPERS
// ════════════════════════════════════════════════════════════════════════
const LS_WORKOUTS = 'dash_workout_days';   // array of 'YYYY-MM-DD' strings
const LS_WEIGHTS  = 'dash_weight_log';      // array of {date:'YYYY-MM-DD', kg: number}
const LS_GOAL     = 'dash_goal_kg';         // number

function getWorkoutDays() {
  return JSON.parse(localStorage.getItem(LS_WORKOUTS) || '[]');
}
function saveWorkoutDays(arr) {
  localStorage.setItem(LS_WORKOUTS, JSON.stringify(arr));
}
function getWeightLog() {
  return JSON.parse(localStorage.getItem(LS_WEIGHTS) || '[]');
}
function saveWeightLog(arr) {
  localStorage.setItem(LS_WEIGHTS, JSON.stringify(arr));
}
function getGoal() {
  return parseFloat(localStorage.getItem(LS_GOAL)) || 81; // default mid-range goal
}
function saveGoal(val) {
  localStorage.setItem(LS_GOAL, val);
}

// ════════════════════════════════════════════════════════════════════════
// DATE HELPERS
// ════════════════════════════════════════════════════════════════════════
function pad(n) { return String(n).padStart(2, '0'); }
function toISO(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function todayISO() { return toISO(new Date()); }

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEKDAY_LABELS = ['DOM','SEG','TER','QUA','QUI','SEX','SAB'];

// current viewed month state
let viewYear, viewMonth; // viewMonth: 0-11

function initCalendarState() {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
}

// ════════════════════════════════════════════════════════════════════════
// TOAST
// ════════════════════════════════════════════════════════════════════════
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

// ════════════════════════════════════════════════════════════════════════
// CALENDAR RENDER
// ════════════════════════════════════════════════════════════════════════
function changeMonth(delta) {
  viewMonth += delta;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
  renderOverview();
}

function toggleDay(iso) {
  const days = getWorkoutDays();
  const idx = days.indexOf(iso);
  if (idx >= 0) {
    days.splice(idx, 1);
    showToast('Treino desmarcado.');
  } else {
    days.push(iso);
    showToast('✓ Treino marcado!');
  }
  saveWorkoutDays(days);
  renderCalendar();
  renderOverview();
}

function renderCalendar() {
  const label = document.getElementById('cal-month-label');
  label.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  // weekday headers
  WEEKDAY_LABELS.forEach(w => {
    const el = document.createElement('div');
    el.className = 'cal-weekday';
    el.textContent = w;
    grid.appendChild(el);
  });

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstDay.getDay(); // 0 = sunday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const workoutDays = getWorkoutDays();
  const today = todayISO();

  // empty cells before day 1
  for (let i = 0; i < startWeekday; i++) {
    const el = document.createElement('div');
    el.className = 'cal-day empty';
    grid.appendChild(el);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewYear, viewMonth, day);
    const iso = toISO(d);
    const el = document.createElement('div');
    el.className = 'cal-day';

    const isFuture = iso > today;
    const isTrained = workoutDays.includes(iso);
    const isToday = iso === today;

    if (isTrained) el.classList.add('trained');
    if (isToday) el.classList.add('today');
    if (isFuture) el.classList.add('future');

    el.innerHTML = `${day}${isTrained ? '<span class="cal-day-check">✓</span>' : ''}`;

    if (!isFuture) {
      el.onclick = () => toggleDay(iso);
    }
    grid.appendChild(el);
  }
}

// ════════════════════════════════════════════════════════════════════════
// OVERVIEW (DONUT + STAT CARDS)
// ════════════════════════════════════════════════════════════════════════
function getMonthWorkoutCount(year, month) {
  const days = getWorkoutDays();
  const prefix = `${year}-${pad(month+1)}-`;
  return days.filter(d => d.startsWith(prefix)).length;
}

function getCurrentStreak() {
  const days = new Set(getWorkoutDays());
  let streak = 0;
  let cursor = new Date();
  // if today not trained yet, start checking from yesterday
  if (!days.has(toISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (days.has(toISO(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function renderDonut(trained, total) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const pct = total > 0 ? trained / total : 0;
  const dash = circumference * pct;
  const gap = circumference - dash;

  const svg = document.getElementById('donut-svg');
  svg.innerHTML = `
    <circle class="donut-track" cx="90" cy="90" r="${radius}"></circle>
    <circle class="donut-progress" cx="90" cy="90" r="${radius}"
      stroke-dasharray="${dash} ${gap}"></circle>
    <text class="donut-center-value" x="90" y="84">${Math.round(pct*100)}%</text>
    <text class="donut-center-label" x="90" y="106">adesão</text>
  `;

  document.getElementById('donut-legend').innerHTML = `
    <div class="legend-row">
      <div class="legend-dot red"></div>
      <div class="legend-text">Treinou <span class="num">${trained}</span> de ${total} dias</div>
    </div>
    <div class="legend-row">
      <div class="legend-dot empty"></div>
      <div class="legend-text"><span class="num">${total - trained}</span> dias sem treino registrado</div>
    </div>
  `;
}

function renderOverview() {
  const now = new Date();
  const isCurrentMonth = (viewYear === now.getFullYear() && viewMonth === now.getMonth());
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  // total "elapsed" days for adherence calc: full month if past, current day if this month, full month if future shows 0 done
  const totalDaysForPct = isCurrentMonth ? now.getDate() : daysInMonth;

  const trained = getMonthWorkoutCount(viewYear, viewMonth);
  renderDonut(trained, totalDaysForPct);

  // stat cards
  document.getElementById('stat-month-count').textContent = trained;

  const streak = getCurrentStreak();
  document.getElementById('stat-streak').textContent = streak;

  // weight stats
  const log = getWeightLog().slice().sort((a,b) => a.date.localeCompare(b.date));
  if (log.length > 0) {
    const first = log[0].kg;
    const last = log[log.length-1].kg;
    const diff = last - first;
    document.getElementById('stat-current-weight').textContent = last.toFixed(1);
    const diffEl = document.getElementById('stat-weight-diff');
    const sign = diff > 0 ? '+' : '';
    diffEl.textContent = `${sign}${diff.toFixed(1)} kg desde o início`;
    diffEl.parentElement.querySelector('.stat-value').className =
      'stat-value ' + (diff < 0 ? 'accent' : (diff > 0 ? 'accent-red' : ''));
  } else {
    document.getElementById('stat-current-weight').textContent = '–';
    document.getElementById('stat-weight-diff').textContent = 'sem registros';
  }

  document.getElementById('stat-goal-display').textContent = getGoal().toFixed(1);

  renderGoalProgress();
}

// ════════════════════════════════════════════════════════════════════════
// WEIGHT LOG + CHART
// ════════════════════════════════════════════════════════════════════════
function addWeight() {
  const dateInput = document.getElementById('weight-date');
  const kgInput = document.getElementById('weight-kg');
  const date = dateInput.value;
  const kg = parseFloat(kgInput.value);

  if (!date) { showToast('Selecione uma data.'); dateInput.focus(); return; }
  if (isNaN(kg) || kg <= 0) { showToast('Informe um peso válido.'); kgInput.focus(); return; }

  const log = getWeightLog();
  // replace existing entry for same date if exists
  const existingIdx = log.findIndex(e => e.date === date);
  if (existingIdx >= 0) {
    log[existingIdx].kg = kg;
  } else {
    log.push({ date, kg });
  }
  saveWeightLog(log);

  kgInput.value = '';
  renderWeightChart();
  renderWeightLog();
  renderOverview();
  showToast('✓ Peso registrado!');
}

function removeWeight(date) {
  let log = getWeightLog();
  log = log.filter(e => e.date !== date);
  saveWeightLog(log);
  renderWeightChart();
  renderWeightLog();
  renderOverview();
  showToast('Registro removido.');
}

function formatDateBR(iso) {
  const [y,m,d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function renderWeightLog() {
  const container = document.getElementById('weight-log-list');
  const log = getWeightLog().slice().sort((a,b) => b.date.localeCompare(a.date)); // newest first

  if (log.length === 0) {
    container.innerHTML = '<div class="chart-empty">Nenhum registro ainda. Adicione seu peso acima.</div>';
    return;
  }

  // for diff calc, need chronological order
  const chrono = getWeightLog().slice().sort((a,b) => a.date.localeCompare(b.date));

  container.innerHTML = log.map(entry => {
    const idx = chrono.findIndex(e => e.date === entry.date);
    let diffHtml = '<span class="w-diff same">–</span>';
    if (idx > 0) {
      const diff = entry.kg - chrono[idx-1].kg;
      const cls = diff < 0 ? 'down' : (diff > 0 ? 'up' : 'same');
      const arrow = diff < 0 ? '↓' : (diff > 0 ? '↑' : '–');
      diffHtml = `<span class="w-diff ${cls}">${arrow} ${Math.abs(diff).toFixed(1)} kg</span>`;
    }
    return `
      <div class="weight-row">
        <div class="w-date">${formatDateBR(entry.date)}</div>
        <div class="w-value">${entry.kg.toFixed(1)} kg</div>
        ${diffHtml}
        <button class="del-btn" title="Remover" onclick="removeWeight('${entry.date}')">✕</button>
      </div>
    `;
  }).join('');
}

function renderWeightChart() {
  const wrap = document.getElementById('chart-wrap');
  const log = getWeightLog().slice().sort((a,b) => a.date.localeCompare(b.date));

  if (log.length < 2) {
    wrap.innerHTML = '<div class="chart-empty">Adicione pelo menos 2 registros de peso para ver o gráfico de evolução.</div>';
    return;
  }

  const W = Math.max(500, log.length * 70);
  const H = 220;
  const padding = { top: 20, right: 24, bottom: 36, left: 44 };
  const innerW = W - padding.left - padding.right;
  const innerH = H - padding.top - padding.bottom;

  const kgs = log.map(e => e.kg);
  let min = Math.min(...kgs);
  let max = Math.max(...kgs);
  if (min === max) { min -= 1; max += 1; }
  const range = max - min;
  const yPad = range * 0.15 || 1;
  min -= yPad; max += yPad;

  const xStep = log.length > 1 ? innerW / (log.length - 1) : 0;
  const yScale = v => padding.top + innerH - ((v - min) / (max - min)) * innerH;
  const xScale = i => padding.left + i * xStep;

  // grid lines (4 horizontal)
  let gridLines = '';
  let gridLabels = '';
  const gridCount = 4;
  for (let i = 0; i <= gridCount; i++) {
    const val = min + (range + yPad*2) * (1 - i/gridCount);
    const y = padding.top + (innerH / gridCount) * i;
    gridLines += `<line class="chart-grid-line" x1="${padding.left}" y1="${y}" x2="${W-padding.right}" y2="${y}"></line>`;
    gridLabels += `<text x="${padding.left - 10}" y="${y+4}" font-size="10" fill="var(--muted)" text-anchor="end" font-family="var(--font-b)">${val.toFixed(1)}</text>`;
  }

  // line path + area
  let linePath = '';
  let areaPath = '';
  log.forEach((entry, i) => {
    const x = xScale(i);
    const y = yScale(entry.kg);
    linePath += (i === 0 ? 'M' : 'L') + `${x},${y} `;
  });
  areaPath = linePath + `L${xScale(log.length-1)},${padding.top+innerH} L${xScale(0)},${padding.top+innerH} Z`;

  // points + x labels
  let points = '';
  let xLabels = '';
  log.forEach((entry, i) => {
    const x = xScale(i);
    const y = yScale(entry.kg);
    points += `<circle class="chart-point" cx="${x}" cy="${y}" r="4"></circle>`;
    points += `<text class="chart-point-label" x="${x}" y="${y-12}">${entry.kg.toFixed(1)}</text>`;
    const [yy,mm,dd] = entry.date.split('-');
    xLabels += `<text class="chart-axis-label" x="${x}" y="${H-12}">${dd}/${mm}</text>`;
  });

  wrap.innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      ${gridLines}
      ${gridLabels}
      <path class="chart-area" d="${areaPath}"></path>
      <path class="chart-line" d="${linePath}"></path>
      ${points}
      ${xLabels}
    </svg>
  `;
}

// ════════════════════════════════════════════════════════════════════════
// GOAL PROGRESS BAR
// ════════════════════════════════════════════════════════════════════════
function setGoal() {
  const input = document.getElementById('goal-kg-input');
  const val = parseFloat(input.value);
  if (isNaN(val) || val <= 0) { showToast('Informe uma meta válida.'); return; }
  saveGoal(val);
  renderGoalProgress();
  showToast('✓ Meta atualizada!');
}

function renderGoalProgress() {
  const goal = getGoal();
  document.getElementById('goal-kg-input').value = goal;

  const log = getWeightLog().slice().sort((a,b) => a.date.localeCompare(b.date));
  const wrap = document.getElementById('goal-wrap');

  if (log.length === 0) {
    wrap.style.display = 'none';
    return;
  }
  wrap.style.display = 'block';

  const start = log[0].kg;
  const current = log[log.length-1].kg;

  document.getElementById('goal-start-label').textContent = `${start.toFixed(1)} kg`;
  document.getElementById('goal-current-label').textContent = `${current.toFixed(1)} kg`;
  document.getElementById('goal-target-label').textContent = `${goal.toFixed(1)} kg`;

  let pct;
  if (start === goal) {
    pct = 100;
  } else {
    pct = ((start - current) / (start - goal)) * 100;
  }
  pct = Math.max(0, Math.min(100, pct));
  document.getElementById('goal-bar-fill').style.width = pct + '%';
}

// ════════════════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════════════════
function init() {
  initCalendarState();

  // set default date input to today
  const dateInput = document.getElementById('weight-date');
  dateInput.value = todayISO();
  dateInput.max = todayISO();

  document.getElementById('cal-prev').onclick = () => changeMonth(-1);
  document.getElementById('cal-next').onclick = () => changeMonth(1);
  document.getElementById('btn-add-weight').onclick = addWeight;
  document.getElementById('btn-set-goal').onclick = setGoal;

  document.getElementById('weight-kg').addEventListener('keydown', e => {
    if (e.key === 'Enter') addWeight();
  });

  renderCalendar();
  renderOverview();
  renderWeightChart();
  renderWeightLog();
}

document.addEventListener('DOMContentLoaded', init);