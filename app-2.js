const SUPABASE_URL     = 'https://vzouzbybkbbaiupubfmj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3V6Ynlia2JiYWl1cHViZm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMjE3MjksImV4cCI6MjA5NTc5NzcyOX0.fVuREjAgEPNDasy-dxZlq603ilZNOIgxFuAU9q_fqgE';

const SCHOOLS = [
  'Համlet Պatуryani անvan Мarzadprroc',
  'Армфайтинг Эджмиацин академия',
  'Армфайтинг академия',
  'Греплинг Эджмиацин',
  'Армавири ужья',
  'Армфайтинг Зварtнoc'
];

const MONTHS_HY = ['', 'Հunvar', 'Петрvar', 'Маrт', 'Apрил', 'Mayис', 'Hunис', 'Hulис', 'Оgоstоs', 'Sептемber', 'Нокtemбер', 'Ноябрь', 'Декабрь'];

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser      = null;
let currentAthleteId = null;
let currentCoachId   = null;
let currentWorkerId  = null;
let allAthletes      = [];
let allCoaches       = [];
let allWorkers       = [];
let allSports        = [];
let allCompetitions  = [];
let athleteSortDir   = 'asc';   // 'asc' | 'desc'
let athleteSortField = 'passport_id'; // field name

const DEFAULT_SPORTS = [
  'Ըmbshamart','Brntskamart','Ձyudo','Sambo','Karate',
  'Tajekvondo','Qiqboksing','MMA','Loghutun','Tetev Atletika'
];

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  const { data } = await sb.auth.getSession();
  if (!data.session) { window.location.replace('login.html'); return; }
  currentUser = data.session.user;

  document.getElementById('sidebar-email').textContent = currentUser.email;
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('hy-AM', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  populateSchoolSelect();
  await loadSports();
  loadDashboard();
});

// ============================================================
// SCHOOLS
// ============================================================
function populateSchoolSelect() {
  const sel = document.getElementById('f-school');
  if (!sel) return;
  sel.innerHTML = '<option value="">Yntrel marzadprroc</option>';
  SCHOOLS.forEach(s => {
    const o = document.createElement('option');
    o.value = s; o.textContent = s;
    sel.appendChild(o);
  });
}

// ============================================================
// LOGOUT
// ============================================================
async function handleLogout() {
  await sb.auth.signOut();
  window.location.replace('login.html');
}

// ============================================================
// SPORTS MANAGEMENT
// ============================================================
async function loadSports() {
  const { data } = await sb.from('sports').select('*').order('name');
  if (data && data.length) {
    allSports = data.map(s => s.name);
  } else {
    allSports = [...DEFAULT_SPORTS];
    await sb.from('sports').insert(DEFAULT_SPORTS.map(name => ({ name })));
  }
  populateSportSelects();
}

function populateSportSelects() {
  const selects = ['filter-sport','f-sport','comp-sport','comp-filter-sport','fc-sport','coach-filter-sport'];
  selects.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const current = el.value;
    const isFilter = id.startsWith('filter') || id.includes('filter');
    el.innerHTML = isFilter
      ? '<option value="">Бoлory мarзадзевер</option>'
      : '<option value="">Yntrel мarзадзев</option>';
    allSports.forEach(s => {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      el.appendChild(o);
    });
    if (current) el.value = current;
  });

  if (!document.getElementById('sports-mgr-link')) {
    const nav = document.querySelector('.sidebar-nav');
    const a = document.createElement('div');
    a.id = 'sports-mgr-link';
    a.className = 'nav-item';
    a.innerHTML = '<span class="nav-icon">◧</span> Мarзадзевер';
    a.onclick = () => document.getElementById('sport-modal').style.display = 'flex';
    nav.appendChild(a);
  }
  renderSportManagerList();
}

function renderSportManagerList() {
  const el = document.getElementById('sport-list-mgr');
  if (!el) return;
  el.innerHTML = allSports.map(s => `
    <div class="sport-list-item">
      <span>${s}</span>
      <button class="sport-del-btn" onclick="deleteSport('${s.replace(/'/g,"\\'")}')">✕</button>
    </div>`).join('');
}

async function addSport() {
  const input = document.getElementById('new-sport-name');
  const name  = input.value.trim();
  const err   = document.getElementById('sport-modal-error');
  if (!name) return;
  if (allSports.includes(name)) { err.textContent = 'Мarзадзевн ardenn gyoutyunh uni.'; return; }
  err.textContent = '';
  await sb.from('sports').insert({ name });
  allSports.push(name);
  input.value = '';
  populateSportSelects();
}

async function deleteSport(name) {
  if (!confirm(`Heracnel "${name}"?`)) return;
  await sb.from('sports').delete().eq('name', name);
  allSports = allSports.filter(s => s !== name);
  populateSportSelects();
}

function closeSportModal(e)      { if (e.target.id === 'sport-modal') closeSportModalDirect(); }
function closeSportModalDirect() { document.getElementById('sport-modal').style.display = 'none'; }

// ============================================================
// NAVIGATION
// ============================================================
function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  if (page === 'dashboard')   loadDashboard();
  if (page === 'athletes')    loadAthletes();
  if (page === 'add-athlete' && !document.getElementById('athlete-id').value) resetAthleteForm();
  if (page === 'coaches')     loadCoaches();
  if (page === 'add-coach' && !document.getElementById('coach-id').value) resetCoachForm();
  if (page === 'competitions') loadCompetitions();
  if (page === 'workers')     loadWorkers();
  if (page === 'add-worker' && !document.getElementById('worker-id').value) resetWorkerForm();
}

// ============================================================
// DASHBOARD
// ============================================================
async function loadDashboard() {
  const [{ data: athletes }, { data: comps }, { data: coaches }, { data: workers }] = await Promise.all([
    sb.from('athletes').select('*'),
    sb.from('competitions').select('*'),
    sb.from('coaches').select('*'),
    sb.from('workers').select('*')
  ]);

  allAthletes     = athletes || [];
  allCompetitions = comps    || [];
  allCoaches      = coaches  || [];
  allWorkers      = workers  || [];

  document.getElementById('stat-total').textContent        = allAthletes.length;
  const sports = [...new Set(allAthletes.map(a => a.sport).filter(Boolean))];
  document.getElementById('stat-sports').textContent       = sports.length;
  document.getElementById('stat-competitions').textContent = allCompetitions.length;
  document.getElementById('stat-coaches').textContent      = allCoaches.length;

  const thisMonth  = new Date();
  const monthCount = allAthletes.filter(a => {
    const d = new Date(a.created_at);
    return d.getMonth() === thisMonth.getMonth() && d.getFullYear() === thisMonth.getFullYear();
  }).length;
  document.getElementById('stat-month').textContent = monthCount;

  renderSportBreakdown(allAthletes);
  renderRecentAthletes(allAthletes.slice(-5).reverse());
}

function renderSportBreakdown(athletes) {
  const counts = {};
  athletes.forEach(a => { if (a.sport) counts[a.sport] = (counts[a.sport] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted[0]?.[1] || 1;
  const el = document.getElementById('sport-breakdown');
  if (!sorted.length) { el.innerHTML = '<div style="color:var(--text3);font-size:13px">Marzikner chkan</div>'; return; }
  el.innerHTML = sorted.map(([sport, count]) => `
    <div class="sport-bar-item">
      <div class="sport-bar-label"><span>${sport}</span><span>${count}</span></div>
      <div class="sport-bar-track"><div class="sport-bar-fill" style="width:${(count/max)*100}%"></div></div>
    </div>`).join('');
}

function renderRecentAthletes(athletes) {
  const el = document.getElementById('recent-athletes');
  if (!athletes.length) { el.innerHTML = '<div style="color:var(--text3);font-size:13px">Marzikner chkan</div>'; return; }
  el.innerHTML = athletes.map(a => {
    const initials  = `${a.name?.[0]||''}${a.surname?.[0]||''}`.toUpperCase();
    const photoHtml = a.photo_url
      ? `<img src="${a.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : initials;
    return `
    <div class="recent-item" onclick="openAthleteDetail('${a.id}')">
      <div class="recent-avatar">${photoHtml}</div>
      <div class="recent-info">
        <div class="recent-name">${a.name} ${a.surname}</div>
        <div class="recent-sport">${a.sport || '—'}</div>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// ATHLETES LIST — TABLE VIEW
// ============================================================
async function loadAthletes() {
  const container = document.getElementById('athletes-table-container');
  container.innerHTML = '<div class="loading"><div class="spinner"></div> Berrnum e...</div>';

  const { data, error } = await sb.from('athletes').select('*').order('created_at', { ascending: true });
  if (error) console.error('loadAthletes error:', error);
  allAthletes = data || [];

  // Populate coach filter from actual data
  populateCoachFilter();
  populateBirthYearFilter();

  applyAthleteFilters();
}

function populateCoachFilter() {
  const sel = document.getElementById('filter-coach');
  if (!sel) return;
  const coaches = [...new Set(allAthletes.map(a => a.coach).filter(Boolean))].sort();
  const cur = sel.value;
  sel.innerHTML = '<option value="">Bolory marzich</option>';
  coaches.forEach(c => {
    const o = document.createElement('option');
    o.value = c; o.textContent = c;
    sel.appendChild(o);
  });
  if (cur) sel.value = cur;
}

function populateBirthYearFilter() {
  const sel = document.getElementById('filter-year');
  if (!sel) return;
  const years = [...new Set(
    allAthletes
      .map(a => a.birthdate ? new Date(a.birthdate).getFullYear() : null)
      .filter(Boolean)
  )].sort((a, b) => b - a);
  const cur = sel.value;
  sel.innerHTML = '<option value="">Bolory tari</option>';
  years.forEach(y => {
    const o = document.createElement('option');
    o.value = y; o.textContent = y;
    sel.appendChild(o);
  });
  if (cur) sel.value = cur;
}

function setAthleteSort(dir) {
  athleteSortDir = dir;
  document.getElementById('sort-asc-btn').classList.toggle('active', dir === 'asc');
  document.getElementById('sort-desc-btn').classList.toggle('active', dir === 'desc');
  applyAthleteFilters();
}

function applyAthleteFilters() {
  const q      = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const sport  = document.getElementById('filter-sport')?.value  || '';
  const gender = document.getElementById('filter-gender')?.value || '';
  const coach  = document.getElementById('filter-coach')?.value  || '';
  const year   = document.getElementById('filter-year')?.value   || '';
  const month  = document.getElementById('filter-month')?.value  || '';
  const status = document.getElementById('filter-status')?.value || '';

  let filtered = allAthletes.filter(a => {
    // search
    if (q) {
      const hay = `${a.name||''} ${a.surname||''} ${a.passport_id||''} ${a.athlete_number||''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    // sport
    if (sport  && a.sport  !== sport)  return false;
    // gender
    if (gender && a.gender !== gender) return false;
    // coach
    if (coach  && a.coach  !== coach)  return false;
    // status
    if (status && a.status !== status) return false;
    // birth year
    if (year && a.birthdate) {
      const y = new Date(a.birthdate).getFullYear();
      if (String(y) !== String(year)) return false;
    } else if (year && !a.birthdate) return false;
    // birth month
    if (month && a.birthdate) {
      const m = new Date(a.birthdate).getMonth() + 1;
      if (String(m) !== String(month)) return false;
    } else if (month && !a.birthdate) return false;
    return true;
  });

  // sort by passport_id (ԱՆՁՆԱԳԻՐ / ID) — numeric-aware
  filtered.sort((a, b) => {
    const va = (a.passport_id || '').toString().toLowerCase();
    const vb = (b.passport_id || '').toString().toLowerCase();
    // empty IDs always go last regardless of direction
    if (!va && !vb) return 0;
    if (!va) return 1;
    if (!vb) return -1;
    // try numeric sort first
    const na = parseFloat(va), nb = parseFloat(vb);
    if (!isNaN(na) && !isNaN(nb) && String(na) === va && String(nb) === vb) {
      return athleteSortDir === 'asc' ? na - nb : nb - na;
    }
    return athleteSortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  renderAthletesTable(filtered);
}

function renderAthletesTable(athletes) {
  const container = document.getElementById('athletes-table-container');
  if (!athletes.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>Marzik chi gtnyel</p></div>`;
    return;
  }

  const rows = athletes.map((a, idx) => {
    const initials  = `${a.name?.[0]||''}${a.surname?.[0]||''}`.toUpperCase();
    const photoHtml = a.photo_url
      ? `<img src="${a.photo_url}">`
      : initials;
    const statusClass = a.status === 'Arxiv' ? 'status-archive' : 'status-active';
    const statusLabel = a.status || 'Aktiv';
    const age = a.birthdate ? Math.floor((Date.now() - new Date(a.birthdate)) / 31557600000) : null;
    return `
    <tr onclick="openAthleteDetail('${a.id}')">
      <td style="color:var(--text3);font-size:.8rem;text-align:center">${idx + 1}</td>
      <td><span class="ath-id-badge">${a.passport_id || '—'}</span></td>
      <td>
        <span class="ath-photo-thumb">${photoHtml}</span>
        <span class="ath-name-cell">${a.surname || ''}</span>
      </td>
      <td>${a.name || '—'}</td>
      <td>${a.sport ? `<span class="ath-sport-tag">${a.sport}</span>` : '—'}</td>
      <td><span class="gender-badge">${a.gender || '—'}</span></td>
      <td>${age ? age + ' t.' : a.birthdate ? new Date(a.birthdate).getFullYear() : '—'}</td>
      <td>${a.coach || '—'}</td>
      <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="table-count">${athletes.length} marzzik</div>
    <div class="athletes-table-wrap">
      <table class="athletes-table">
        <thead>
          <tr>
            <th style="width:44px;text-align:center">#</th>
            <th>Мarзakan Andznagri Нomer</th>
            <th>Azganunh</th>
            <th>Anunh</th>
            <th>Мarзadзev</th>
            <th>Ser</th>
            <th>Tsnnndyan</th>
            <th>Мarзich</th>
            <th>Kargavijak</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function handleSearch() { applyAthleteFilters(); }

// ============================================================
// ATHLETE DETAIL
// ============================================================
async function openAthleteDetail(id) {
  currentAthleteId = id;
  showPage('athlete-detail');

  const content = document.getElementById('athlete-detail-content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Berrnum e...</div>';

  const [{ data: a }, { data: partRows }] = await Promise.all([
    sb.from('athletes').select('*').eq('id', id).single(),
    sb.from('competition_participants')
      .select('*, competitions(id, name, date, sport, location)')
      .eq('athlete_id', id)
      .order('created_at', { ascending: false })
  ]);

  if (!a) { content.innerHTML = '<p style="color:var(--text3)">Marzike chi gtnyel.</p>'; return; }

  const comps = (partRows || []).filter(p => p.competitions);

  const initials = `${a.name?.[0]||''}${a.surname?.[0]||''}`.toUpperCase();
  const age      = a.birthdate ? Math.floor((Date.now() - new Date(a.birthdate)) / 31557600000) : null;

  const photoEl = a.photo_url
    ? `<div class="detail-photo"><img src="${a.photo_url}" onclick="viewImage('${a.photo_url}')"></div>`
    : `<div class="detail-photo">${initials}</div>`;

  const docBtns = [
    a.passport_url ? `<button class="btn-secondary" style="width:100%;font-size:12px;margin-bottom:6px" onclick="viewImage('${a.passport_url}')">▤ Andznagir</button>` : '',
    a.parent1_id_url ? `<button class="btn-secondary" style="width:100%;font-size:12px;margin-bottom:6px" onclick="viewImage('${a.parent1_id_url}')">▤ Ծնող 1 ID</button>` : '',
    a.parent2_id_url ? `<button class="btn-secondary" style="width:100%;font-size:12px;margin-bottom:6px" onclick="viewImage('${a.parent2_id_url}')">▤ Ծնող 2 ID</button>` : '',
  ].join('');

  const extraDocs = a.extra_docs || [];
  const extraDocsHtml = extraDocs.length ? `
    <div class="detail-card-title" style="margin-top:14px">Pastatughtner (${extraDocs.length})</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px">
      ${extraDocs.map((url, i) => {
        const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
        const name  = `Pastataght ${i+1}`;
        return isImg
          ? `<img src="${url}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1.5px solid var(--border2);cursor:zoom-in" onclick="viewImage('${url}')" title="${name}">`
          : `<button class="btn-secondary" style="font-size:11px;padding:8px 10px" onclick="viewImage('${url}')">▤ ${name}</button>`;
      }).join('')}
    </div>` : '';

  const compsHtml = comps.length ? `
    <table class="comp-table">
      <thead><tr><th>Мрцуйт</th><th>Amsatyw</th><th>Qash</th><th>Ardyunq</th></tr></thead>
      <tbody>
        ${comps.map(p => `<tr>
          <td>${p.competitions.name}</td>
          <td>${p.competitions.date ? new Date(p.competitions.date).toLocaleDateString('hy-AM') : '—'}</td>
          <td>${p.weight_class||'—'}</td>
          <td style="color:var(--gold);font-weight:700">${p.result ? getMedalEmoji(p.result)+' '+p.result : '—'}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:var(--text3);font-size:13px">Мрцуйт chi grantsatsvel.</p>';

  const statusClass = a.status === 'Arxiv' ? 'status-archive' : 'status-active';
  const statusLabel = a.status || 'Aktiv';

  const parentsHtml = (a.parent1_name || a.parent2_name) ? `
    <div class="detail-card">
      <div class="detail-card-title">Ծնող / Խնամակալ Տվյալներ</div>
      <div class="detail-fields-grid">
        ${a.parent1_name || a.parent1_surname ? `
          <div class="detail-field"><span class="detail-field-key">Ծնող 1 Անուն Ազգանուն</span><span class="detail-field-val">${a.parent1_name||''} ${a.parent1_surname||''}</span></div>
          <div class="detail-field"><span class="detail-field-key">Ծնող 1 ID</span><span class="detail-field-val">${a.parent1_passport||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Ծնող 1 Հեռախոս</span><span class="detail-field-val">${a.parent1_phone||'—'}</span></div>
        ` : ''}
        ${a.parent2_name || a.parent2_surname ? `
          <div class="detail-field"><span class="detail-field-key">Ծնող 2 Անուն Ազգանուն</span><span class="detail-field-val">${a.parent2_name||''} ${a.parent2_surname||''}</span></div>
          <div class="detail-field"><span class="detail-field-key">Ծնող 2 ID</span><span class="detail-field-val">${a.parent2_passport||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Ծնող 2 Հեռախոս</span><span class="detail-field-val">${a.parent2_phone||'—'}</span></div>
        ` : ''}
      </div>
    </div>` : '';

  content.innerHTML = `
  <div class="detail-layout">
    <div class="detail-sidebar">
      ${photoEl}
      <div class="detail-full-name">${a.name} ${a.surname}</div>
      <div class="detail-sport-badge">${a.sport || 'Мarзadзev chka'}</div>
      <div style="text-align:center;margin-top:4px"><span class="status-badge ${statusClass}">${statusLabel}</span></div>
      <div class="detail-meta-list">
        ${age ? `<div class="detail-meta-item"><span class="detail-meta-key">Tariq</span><span class="detail-meta-val">${age}</span></div>` : ''}
        ${a.gender ? `<div class="detail-meta-item"><span class="detail-meta-key">Ser</span><span class="detail-meta-val">${a.gender}</span></div>` : ''}
        ${a.weight_class ? `<div class="detail-meta-item"><span class="detail-meta-key">Qash</span><span class="detail-meta-val">${a.weight_class}</span></div>` : ''}
        ${a.rank ? `<div class="detail-meta-item"><span class="detail-meta-key">Kochum</span><span class="detail-meta-val">${a.rank}</span></div>` : ''}
        ${a.coach ? `<div class="detail-meta-item"><span class="detail-meta-key">Мarзich</span><span class="detail-meta-val">${a.coach}</span></div>` : ''}
        ${a.school ? `<div class="detail-meta-item"><span class="detail-meta-key">Dprroc</span><span class="detail-meta-val">${a.school}</span></div>` : ''}
        ${a.passport_id ? `<div class="detail-meta-item"><span class="detail-meta-key">Мarзakan Нomer</span><span class="detail-meta-val" style="color:var(--gold);font-weight:700">${a.passport_id}</span></div>` : ''}
        ${a.athlete_number ? `<div class="detail-meta-item"><span class="detail-meta-key">ID 2</span><span class="detail-meta-val">${a.athlete_number}</span></div>` : ''}
      </div>
      ${docBtns}
      ${extraDocsHtml}
    </div>
    <div class="detail-main">
      <div class="detail-card">
        <div class="detail-card-title">Andznakan Tvyalner</div>
        <div class="detail-fields-grid">
          <div class="detail-field"><span class="detail-field-key">Anunh Azganunh</span><span class="detail-field-val">${a.name} ${a.surname}</span></div>
          <div class="detail-field"><span class="detail-field-key">Мarзakan Andznagri Нomer</span><span class="detail-field-val" style="color:var(--gold);font-weight:700">${a.passport_id||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">ID 2</span><span class="detail-field-val">${a.athlete_number||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Tsnnndyan Amsatyw</span><span class="detail-field-val">${a.birthdate ? new Date(a.birthdate).toLocaleDateString('hy-AM') : '—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Ser</span><span class="detail-field-val">${a.gender||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Herakhos</span><span class="detail-field-val">${a.phone||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">El. Prost</span><span class="detail-field-val">${a.email||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Мarзadзev</span><span class="detail-field-val">${a.sport||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Мarзadprroc</span><span class="detail-field-val">${a.school||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Avely</span><span class="detail-field-val">${new Date(a.created_at).toLocaleDateString('hy-AM')}</span></div>
        </div>
        ${a.notes ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
          <div class="detail-field-key" style="margin-bottom:6px">Nshumner</div>
          <div style="font-size:13px;color:var(--text2)">${a.notes}</div></div>` : ''}
      </div>
      ${parentsHtml}
      <div class="detail-card">
        <div class="detail-card-title" style="display:flex;justify-content:space-between;align-items:center">
          Мрцуйтнер (${comps.length})</div>
        ${compsHtml}
      </div>
    </div>
  </div>`;
}

function editCurrentAthlete() {
  if (!currentAthleteId) return;
  const a = allAthletes.find(x => x.id === currentAthleteId);
  if (a) { fillAthleteForm(a); showPage('add-athlete'); document.getElementById('form-title').textContent = 'Khmbagrel Marzik'; }
  else   { loadAthleteForEdit(currentAthleteId); }
}

async function loadAthleteForEdit(id) {
  const { data: a } = await sb.from('athletes').select('*').eq('id', id).single();
  if (!a) return;
  fillAthleteForm(a);
  showPage('add-athlete');
  document.getElementById('form-title').textContent = 'Khmbagrel Marzik';
}

function fillAthleteForm(a) {
  // Always reset first so stale data/previews from a previous form session are cleared,
  // then immediately fill with this athlete's data.
  resetAthleteForm();

  document.getElementById('athlete-id').value    = a.id;
  document.getElementById('f-name').value        = a.name        || '';
  document.getElementById('f-surname').value     = a.surname     || '';
  document.getElementById('f-father-name').value = a.father_name || '';
  document.getElementById('f-birthdate').value   = a.birthdate   || '';
  document.getElementById('f-gender').value      = a.gender      || '';
  document.getElementById('f-passport').value    = a.passport_id || '';
  const numEl = document.getElementById('f-athlete-number');
  if (numEl) numEl.value = a.athlete_number || '';
  document.getElementById('f-nationality').value = a.nationality || '';
  document.getElementById('f-phone').value       = a.phone       || '';
  document.getElementById('f-email').value       = a.email       || '';
  document.getElementById('f-sport').value       = a.sport       || '';
  document.getElementById('f-weight').value      = a.weight_class|| '';
  document.getElementById('f-rank').value        = a.rank        || '';
  document.getElementById('f-coach').value       = a.coach       || '';
  document.getElementById('f-notes').value       = a.notes       || '';
  const schoolSel = document.getElementById('f-school');
  if (schoolSel) schoolSel.value = a.school || '';
  const statusSel = document.getElementById('f-status');
  if (statusSel) statusSel.value = a.status || 'Aktiv';

  // Parent 1
  setVal('f-parent1-name',     a.parent1_name);
  setVal('f-parent1-surname',  a.parent1_surname);
  setVal('f-parent1-passport', a.parent1_passport);
  setVal('f-parent1-phone',    a.parent1_phone);
  if (a.photo_url) {
    const img = document.getElementById('photo-preview');
    img.src = a.photo_url; img.style.display = 'block';
    document.getElementById('photo-placeholder').style.display = 'none';
  }
  if (a.passport_url) {
    const img = document.getElementById('passport-preview');
    img.src = a.passport_url; img.style.display = 'block';
    document.getElementById('passport-placeholder').style.display = 'none';
  }
  // populate parent ID scan previews
  if (a.parent1_id_url) {
    const img = document.getElementById('parent1-id-preview');
    if (img) { img.src = a.parent1_id_url; img.style.display = 'block'; document.getElementById('parent1-id-placeholder').style.display = 'none'; }
  }
  // populate extra docs gallery
  renderExtraDocsEdit(a.extra_docs || []);
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val || '';
}

async function deleteCurrentAthlete() {
  if (!currentAthleteId) return;
  const a    = allAthletes.find(x => x.id === currentAthleteId);
  const name = a ? `${a.name} ${a.surname}` : 'ays marzik';
  if (!confirm(`Джnjel ${name}?`)) return;
  await sb.from('competition_participants').delete().eq('athlete_id', currentAthleteId);
  await sb.from('competitions').delete().eq('athlete_id', currentAthleteId);
  await sb.from('athletes').delete().eq('id', currentAthleteId);
  showPage('athletes');
}

// ============================================================
// ADD / SAVE ATHLETE
// ============================================================
function resetAthleteForm() {
  document.getElementById('athlete-id').value = '';
  document.getElementById('form-title').textContent = 'Avely Marzik';
  ['f-name','f-surname','f-father-name','f-birthdate','f-passport','f-athlete-number','f-nationality',
   'f-phone','f-email','f-weight','f-rank','f-coach','f-notes',
   'f-parent1-name','f-parent1-surname','f-parent1-passport','f-parent1-phone',
   ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const genderEl = document.getElementById('f-gender');
  if (genderEl) genderEl.value = '';
  const sportEl = document.getElementById('f-sport');
  if (sportEl) sportEl.value = '';
  const schoolEl = document.getElementById('f-school');
  if (schoolEl) schoolEl.value = '';
  const statusEl = document.getElementById('f-status');
  if (statusEl) statusEl.value = 'Aktiv';

  ['photo-input','passport-input','extra-docs-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['photo-preview','passport-preview'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.src = ''; el.style.display = 'none'; }
  });
  ['photo-placeholder','passport-placeholder'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  });
  renderExtraDocsEdit([]);
  const errEl = document.getElementById('form-error');
  if (errEl) errEl.textContent = '';
  const sucEl = document.getElementById('form-success');
  if (sucEl) sucEl.textContent = '';
}

function cancelAthleteForm() {
  const editId = document.getElementById('athlete-id').value;
  if (editId) openAthleteDetail(editId);
  else showPage('athletes');
}

async function saveAthlete() {
  const err = document.getElementById('form-error');
  const suc = document.getElementById('form-success');
  const btn = document.getElementById('save-btn');
  err.textContent = ''; suc.textContent = '';

  const name    = document.getElementById('f-name').value.trim();
  const surname = document.getElementById('f-surname').value.trim();
  if (!name || !surname) { err.textContent = 'Anunhe ev azganunh partadir en.'; return; }

  const originalLabel = btn.innerHTML;
  btn.innerHTML = '⏳ Pahvum e...'; btn.disabled = true;

  const payload = {
    name, surname,
    athlete_number: document.getElementById('f-athlete-number')?.value.trim() || null,
    birthdate:    document.getElementById('f-birthdate').value    || null,
    gender:       document.getElementById('f-gender').value       || null,
    passport_id:  document.getElementById('f-passport').value.trim()    || null,
    nationality:  document.getElementById('f-nationality').value.trim() || null,
    phone:        document.getElementById('f-phone').value.trim()       || null,
    email:        document.getElementById('f-email').value.trim()       || null,
    sport:        document.getElementById('f-sport').value        || null,
    weight_class: document.getElementById('f-weight').value.trim()      || null,
    rank:         document.getElementById('f-rank').value.trim()        || null,
    coach:        document.getElementById('f-coach').value.trim()       || null,
    notes:        document.getElementById('f-notes').value.trim()       || null,
    school:       document.getElementById('f-school')?.value            || null,
    status:       document.getElementById('f-status')?.value            || 'Aktiv',
    // Parents
    parent1_name:    document.getElementById('f-parent1-name')?.value.trim()    || null,
    parent1_surname: document.getElementById('f-parent1-surname')?.value.trim() || null,
    parent1_passport:document.getElementById('f-parent1-passport')?.value.trim()|| null,
    parent1_phone:   document.getElementById('f-parent1-phone')?.value.trim()   || null,
  };

  const fatherName = document.getElementById('f-father-name').value.trim();
  if (fatherName) payload.father_name = fatherName;

  const editId = document.getElementById('athlete-id').value;
  let athleteId = editId;
  let dbError;

  try {
    if (editId) {
      const { error } = await sb.from('athletes').update(payload).eq('id', editId);
      dbError = error;
    } else {
      const { data, error } = await sb.from('athletes').insert(payload).select().single();
      dbError = error;
      if (data) athleteId = data.id;
    }
  } catch (e) { dbError = { message: e.message || 'Anspaselي skhal' }; }

  if (dbError) {
    console.error('Supabase error:', dbError);
    err.textContent = `Skhal: ${dbError.message}`;
    btn.innerHTML = originalLabel; btn.disabled = false;
    return;
  }

  if (athleteId) {
    await uploadAthleteFile('photo-input',      athleteId, 'photos',    'photo_url');
    await uploadAthleteFile('passport-input',   athleteId, 'passports', 'passport_url');
    await uploadAthleteFile('parent1-id-input', athleteId, 'parent-ids', 'parent1_id_url');
    await uploadExtraDocs(athleteId);
  }

  btn.innerHTML = originalLabel; btn.disabled = false;
  suc.textContent = editId ? 'Marzikey tharrmacvats e ✓' : 'Marzikey pahvats e ✓';
  setTimeout(() => showPage('athletes'), 1200);
}

async function uploadAthleteFile(inputId, athleteId, bucket, column) {
  const input = document.getElementById(inputId);
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  const ext  = file.name.split('.').pop();
  const path = `${athleteId}/${Date.now()}.${ext}`;
  const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { upsert: true });
  if (upErr) { console.error('Upload error:', upErr); return; }
  const { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(path);
  await sb.from('athletes').update({ [column]: publicUrl }).eq('id', athleteId);
}

// ============================================================
// COACHES LIST
// ============================================================
async function loadCoaches(filter = '') {
  const grid = document.getElementById('coaches-grid');
  grid.innerHTML = '<div class="loading"><div class="spinner"></div> Berrnum e...</div>';

  let query = sb.from('coaches').select('*').order('surname');
  const sport = document.getElementById('coach-filter-sport')?.value;
  if (sport) query = query.eq('sport', sport);

  const { data } = await query;
  allCoaches = data || [];

  let filtered = allCoaches;
  if (filter) {
    const q = filter.toLowerCase();
    filtered = allCoaches.filter(c =>
      (c.name||'').toLowerCase().includes(q) ||
      (c.surname||'').toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>${filter ? 'Мarзich chi gtnyel' : 'Мarзich chka, avely arajine'}</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(c => {
    const initials  = `${c.name?.[0]||''}${c.surname?.[0]||''}`.toUpperCase();
    const photoHtml = c.photo_url
      ? `<img src="${c.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : initials;
    return `
    <div class="athlete-card" onclick="openCoachDetail('${c.id}')">
      <div class="athlete-photo">${photoHtml}</div>
      <div class="athlete-name">${c.name} ${c.surname}</div>
      <div class="athlete-sport">${c.sport||'—'}</div>
      <div class="athlete-meta">${c.qualification||''}</div>
    </div>`;
  }).join('');
}

function handleCoachSearch() {
  const el = document.getElementById('coach-search-input');
  if (el) loadCoaches(el.value);
}

// ============================================================
// COACH DETAIL
// ============================================================
async function openCoachDetail(id) {
  currentCoachId = id;
  showPage('coach-detail');

  const content = document.getElementById('coach-detail-content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Berrnum e...</div>';

  const { data: c } = await sb.from('coaches').select('*').eq('id', id).single();
  if (!c) { content.innerHTML = '<p style="color:var(--text3)">Мarzichy chi gtnyel.</p>'; return; }

  const initials = `${c.name?.[0]||''}${c.surname?.[0]||''}`.toUpperCase();
  const age      = c.birthdate ? Math.floor((Date.now() - new Date(c.birthdate)) / 31557600000) : null;

  const photoEl = c.photo_url
    ? `<div class="detail-photo"><img src="${c.photo_url}" onclick="viewImage('${c.photo_url}')"></div>`
    : `<div class="detail-photo">${initials}</div>`;

  const docBtns = [
    c.passport_url ? `<button class="btn-secondary" style="width:100%;font-size:12px;margin-bottom:6px" onclick="viewImage('${c.passport_url}')">▤ Andznagir</button>` : '',
    c.doc1_url     ? `<button class="btn-secondary" style="width:100%;font-size:12px;margin-bottom:6px" onclick="viewImage('${c.doc1_url}')">▤ Pastataght 1</button>` : '',
    c.doc2_url     ? `<button class="btn-secondary" style="width:100%;font-size:12px;margin-bottom:6px" onclick="viewImage('${c.doc2_url}')">▤ Pastataght 2</button>` : '',
    c.doc3_url     ? `<button class="btn-secondary" style="width:100%;font-size:12px;margin-bottom:6px" onclick="viewImage('${c.doc3_url}')">▤ Ayl Pastataght</button>` : '',
  ].join('');

  content.innerHTML = `
  <div class="detail-layout">
    <div class="detail-sidebar">
      ${photoEl}
      <div class="detail-full-name">${c.name} ${c.surname}</div>
      <div class="detail-sport-badge">${c.sport||'Мarзadзev chka'}</div>
      <div class="detail-meta-list">
        ${age ? `<div class="detail-meta-item"><span class="detail-meta-key">Tariq</span><span class="detail-meta-val">${age}</span></div>` : ''}
        ${c.gender        ? `<div class="detail-meta-item"><span class="detail-meta-key">Ser</span><span class="detail-meta-val">${c.gender}</span></div>` : ''}
        ${c.qualification ? `<div class="detail-meta-item"><span class="detail-meta-key">Orkakavorut.</span><span class="detail-meta-val">${c.qualification}</span></div>` : ''}
        ${c.education     ? `<div class="detail-meta-item"><span class="detail-meta-key">Kretutyun</span><span class="detail-meta-val">${c.education}</span></div>` : ''}
        ${c.phone         ? `<div class="detail-meta-item"><span class="detail-meta-key">Herakhos</span><span class="detail-meta-val">${c.phone}</span></div>` : ''}
        ${c.email         ? `<div class="detail-meta-item"><span class="detail-meta-key">El. Prost</span><span class="detail-meta-val">${c.email}</span></div>` : ''}
      </div>
      ${docBtns}
    </div>
    <div class="detail-main">
      <div class="detail-card">
        <div class="detail-card-title">Andznakan Tvyalner</div>
        <div class="detail-fields-grid">
          <div class="detail-field"><span class="detail-field-key">Anunh Azganunh</span><span class="detail-field-val">${c.name} ${c.surname}</span></div>
          <div class="detail-field"><span class="detail-field-key">Andznagir / ID</span><span class="detail-field-val">${c.passport_id||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Tsnnndyan Amsatyw</span><span class="detail-field-val">${c.birthdate ? new Date(c.birthdate).toLocaleDateString('hy-AM') : '—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Herakhos</span><span class="detail-field-val">${c.phone||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">El. Prost</span><span class="detail-field-val">${c.email||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Avely</span><span class="detail-field-val">${new Date(c.created_at).toLocaleDateString('hy-AM')}</span></div>
        </div>
        ${c.notes ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
          <div class="detail-field-key" style="margin-bottom:6px">Nshumner</div>
          <div style="font-size:13px;color:var(--text2)">${c.notes}</div></div>` : ''}
      </div>
    </div>
  </div>`;
}

async function editCurrentCoach() {
  if (!currentCoachId) return;
  let c = allCoaches.find(x => x.id === currentCoachId);
  if (!c) { const { data } = await sb.from('coaches').select('*').eq('id', currentCoachId).single(); c = data; }
  if (!c) return;
  fillCoachForm(c);
  showPage('add-coach');
  document.getElementById('coach-form-title').textContent = 'Khmbagrel Мarзich';
}

async function deleteCurrentCoach() {
  if (!currentCoachId) return;
  const c    = allCoaches.find(x => x.id === currentCoachId);
  const name = c ? `${c.name} ${c.surname}` : 'ays marzich';
  if (!confirm(`Джnjel ${name}?`)) return;
  await sb.from('coaches').delete().eq('id', currentCoachId);
  showPage('coaches');
}

// ============================================================
// ADD / SAVE COACH
// ============================================================
function resetCoachForm() {
  document.getElementById('coach-id').value = '';
  document.getElementById('coach-form-title').textContent = 'Avely Мarзich';
  ['fc-name','fc-surname','fc-father-name','fc-birthdate','fc-passport',
   'fc-phone','fc-email','fc-qualification','fc-education','fc-notes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  const gEl = document.getElementById('fc-gender'); if (gEl) gEl.value = '';
  const sEl = document.getElementById('fc-sport');  if (sEl) sEl.value  = '';
  ['coach-photo-input','coach-extra-docs-input'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['coach-photo-preview'].forEach(id => {
    const el = document.getElementById(id); if (el) { el.src = ''; el.style.display = 'none'; }
  });
  ['coach-photo-placeholder'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'flex';
  });
  const errEl = document.getElementById('coach-form-error');   if (errEl) errEl.textContent = '';
  const sucEl = document.getElementById('coach-form-success'); if (sucEl) sucEl.textContent = '';
}

function cancelCoachForm() {
  const editId = document.getElementById('coach-id').value;
  if (editId) openCoachDetail(editId);
  else showPage('coaches');
}

function fillCoachForm(c) {
  resetCoachForm();

  document.getElementById('coach-id').value         = c.id;
  document.getElementById('fc-name').value          = c.name          || '';
  document.getElementById('fc-surname').value       = c.surname       || '';
  document.getElementById('fc-father-name').value   = c.father_name   || '';
  document.getElementById('fc-birthdate').value     = c.birthdate     || '';
  document.getElementById('fc-gender').value        = c.gender        || '';
  document.getElementById('fc-passport').value      = c.passport_id   || '';
  document.getElementById('fc-phone').value         = c.phone         || '';
  document.getElementById('fc-email').value         = c.email         || '';
  document.getElementById('fc-sport').value         = c.sport         || '';
  document.getElementById('fc-qualification').value = c.qualification || '';
  document.getElementById('fc-education').value     = c.education     || '';
  document.getElementById('fc-notes').value         = c.notes         || '';

  if (c.photo_url) {
    const img = document.getElementById('coach-photo-preview');
    if (img) { img.src = c.photo_url; img.style.display = 'block'; }
    const ph = document.getElementById('coach-photo-placeholder');
    if (ph) ph.style.display = 'none';
  }
  // c.passport_url / doc1_url / doc2_url / doc3_url shown in gallery below
  // populate extra docs gallery
  const existingCoachDocs = [];
  if (c.passport_url) existingCoachDocs.push(c.passport_url);
  if (c.doc1_url)     existingCoachDocs.push(c.doc1_url);
  if (c.doc2_url)     existingCoachDocs.push(c.doc2_url);
  if (c.doc3_url)     existingCoachDocs.push(c.doc3_url);
  if (Array.isArray(c.extra_docs)) existingCoachDocs.push(...c.extra_docs);
  renderCoachExtraDocsEdit(existingCoachDocs);
}

async function saveCoach() {
  const err = document.getElementById('coach-form-error');
  const suc = document.getElementById('coach-form-success');
  const btn = document.getElementById('save-coach-btn');
  err.textContent = ''; suc.textContent = '';

  const name    = document.getElementById('fc-name').value.trim();
  const surname = document.getElementById('fc-surname').value.trim();
  if (!name || !surname) { err.textContent = 'Anunhe ev azganunh partadir en.'; return; }

  const originalLabel = btn.innerHTML;
  btn.innerHTML = '⏳ Pahvum e...'; btn.disabled = true;

  const payload = {
    name, surname,
    birthdate:     document.getElementById('fc-birthdate').value     || null,
    gender:        document.getElementById('fc-gender').value        || null,
    passport_id:   document.getElementById('fc-passport').value.trim()       || null,
    phone:         document.getElementById('fc-phone').value.trim()          || null,
    email:         document.getElementById('fc-email').value.trim()          || null,
    sport:         document.getElementById('fc-sport').value         || null,
    qualification: document.getElementById('fc-qualification').value.trim()  || null,
    education:     document.getElementById('fc-education').value.trim()      || null,
    notes:         document.getElementById('fc-notes').value.trim()          || null,
  };

  const fatherName = document.getElementById('fc-father-name').value.trim();
  if (fatherName) payload.father_name = fatherName;

  const editId = document.getElementById('coach-id').value;
  let coachId  = editId;
  let dbError;

  try {
    if (editId) {
      const { error } = await sb.from('coaches').update(payload).eq('id', editId);
      dbError = error;
    } else {
      const { data, error } = await sb.from('coaches').insert(payload).select().single();
      dbError = error;
      if (data) coachId = data.id;
    }
  } catch (e) { dbError = { message: e.message || 'Anspaselи skhal' }; }

  if (dbError) {
    err.textContent = `Skhal: ${dbError.message}`;
    btn.innerHTML = originalLabel; btn.disabled = false;
    return;
  }

  if (coachId) {
    await uploadCoachFile('coach-photo-input', coachId, 'coach-photos', 'photo_url');
    await uploadCoachExtraDocs(coachId);
  }

  btn.innerHTML = originalLabel; btn.disabled = false;
  suc.textContent = editId ? 'Мarzichy tharrmacvats e ✓' : 'Мarzichy pahvats e ✓';
  setTimeout(() => showPage('coaches'), 1200);
}

async function uploadCoachFile(inputId, coachId, bucket, column) {
  const input = document.getElementById(inputId);
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  const ext  = file.name.split('.').pop();
  const path = `${coachId}/${Date.now()}.${ext}`;
  const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { upsert: true });
  if (upErr) { console.error('Upload error:', upErr); return; }
  const { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(path);
  await sb.from('coaches').update({ [column]: publicUrl }).eq('id', coachId);
}

// ============================================================
// WORKERS LIST
// ============================================================
async function loadWorkers(filter = '') {
  const grid = document.getElementById('workers-grid');
  grid.innerHTML = '<div class="loading"><div class="spinner"></div> Berrnum e...</div>';

  const { data } = await sb.from('workers').select('*').order('surname');
  allWorkers = data || [];

  let filtered = allWorkers;
  if (filter) {
    const q = filter.toLowerCase();
    filtered = allWorkers.filter(w =>
      (w.name||'').toLowerCase().includes(q) ||
      (w.surname||'').toLowerCase().includes(q) ||
      (w.title||'').toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">◈</div><p>${filter ? 'Ashkhatakich chi gtnyel' : 'Ashkhatakich chka, avely arajine'}</p></div>`;
    return;
  }

  grid.innerHTML = filtered.map(w => {
    const initials  = `${w.name?.[0]||''}${w.surname?.[0]||''}`.toUpperCase();
    const photoHtml = w.photo_url
      ? `<img src="${w.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
      : initials;
    return `
    <div class="athlete-card" onclick="openWorkerDetail('${w.id}')">
      <div class="athlete-photo">${photoHtml}</div>
      <div class="athlete-name">${w.name} ${w.surname}</div>
      <div class="athlete-sport">${w.title||'—'}</div>
      <div class="athlete-meta">${w.salary ? w.salary+'֏' : ''}</div>
    </div>`;
  }).join('');
}

function handleWorkerSearch() {
  const el = document.getElementById('worker-search-input');
  if (el) loadWorkers(el.value);
}

// ============================================================
// WORKER DETAIL
// ============================================================
async function openWorkerDetail(id) {
  currentWorkerId = id;
  showPage('worker-detail');

  const content = document.getElementById('worker-detail-content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Berrnum e...</div>';

  const { data: w } = await sb.from('workers').select('*').eq('id', id).single();
  if (!w) { content.innerHTML = '<p style="color:var(--text3)">Ashkhatakich chi gtnyel.</p>'; return; }

  const initials = `${w.name?.[0]||''}${w.surname?.[0]||''}`.toUpperCase();
  const age      = w.birthdate ? Math.floor((Date.now() - new Date(w.birthdate)) / 31557600000) : null;

  const photoEl = w.photo_url
    ? `<div class="detail-photo"><img src="${w.photo_url}" onclick="viewImage('${w.photo_url}')"></div>`
    : `<div class="detail-photo">${initials}</div>`;

  const docBtns = [
    w.passport_url ? `<button class="btn-secondary" style="width:100%;font-size:12px;margin-bottom:6px" onclick="viewImage('${w.passport_url}')">▤ Andznagir</button>` : '',
    w.doc1_url     ? `<button class="btn-secondary" style="width:100%;font-size:12px;margin-bottom:6px" onclick="viewImage('${w.doc1_url}')">▤ Pastataght 1</button>` : '',
    w.doc2_url     ? `<button class="btn-secondary" style="width:100%;font-size:12px;margin-bottom:6px" onclick="viewImage('${w.doc2_url}')">▤ Pastataght 2</button>` : '',
  ].join('');

  content.innerHTML = `
  <div class="detail-layout">
    <div class="detail-sidebar">
      ${photoEl}
      <div class="detail-full-name">${w.name} ${w.surname}</div>
      <div class="detail-sport-badge">${w.title||'Pashhton chka'}</div>
      <div class="detail-meta-list">
        ${age ? `<div class="detail-meta-item"><span class="detail-meta-key">Tariq</span><span class="detail-meta-val">${age}</span></div>` : ''}
        ${w.phone  ? `<div class="detail-meta-item"><span class="detail-meta-key">Herakhos</span><span class="detail-meta-val">${w.phone}</span></div>` : ''}
        ${w.salary ? `<div class="detail-meta-item"><span class="detail-meta-key">Ashkhatavarj</span><span class="detail-meta-val">${w.salary} ֏</span></div>` : ''}
      </div>
      ${docBtns}
    </div>
    <div class="detail-main">
      <div class="detail-card">
        <div class="detail-card-title">Andznakan Tvyalner</div>
        <div class="detail-fields-grid">
          <div class="detail-field"><span class="detail-field-key">Anunh Azganunh</span><span class="detail-field-val">${w.name} ${w.surname}</span></div>
          <div class="detail-field"><span class="detail-field-key">Andznagir / ID</span><span class="detail-field-val">${w.passport_id||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Tsnnndyan Amsatyw</span><span class="detail-field-val">${w.birthdate ? new Date(w.birthdate).toLocaleDateString('hy-AM') : '—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Herakhos</span><span class="detail-field-val">${w.phone||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">El. Prost</span><span class="detail-field-val">${w.email||'—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Ashkhatavarj</span><span class="detail-field-val">${w.salary ? w.salary + ' ֏' : '—'}</span></div>
          <div class="detail-field"><span class="detail-field-key">Avely</span><span class="detail-field-val">${new Date(w.created_at).toLocaleDateString('hy-AM')}</span></div>
        </div>
        ${w.notes ? `<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border)">
          <div class="detail-field-key" style="margin-bottom:6px">Nshumner</div>
          <div style="font-size:13px;color:var(--text2)">${w.notes}</div></div>` : ''}
      </div>
    </div>
  </div>`;
}

async function editCurrentWorker() {
  if (!currentWorkerId) return;
  let w = allWorkers.find(x => x.id === currentWorkerId);
  if (!w) { const { data } = await sb.from('workers').select('*').eq('id', currentWorkerId).single(); w = data; }
  if (!w) return;
  fillWorkerForm(w);
  showPage('add-worker');
  document.getElementById('worker-form-title').textContent = 'Khmbagrel Ashkhat';
}

async function loadWorkerForEdit(id) {
  const { data: w } = await sb.from('workers').select('*').eq('id', id).single();
  if (!w) return;
  fillWorkerForm(w);
  showPage('add-worker');
  document.getElementById('worker-form-title').textContent = 'Khmbagrel Ashkhat';
}

function fillWorkerForm(w) {
  resetWorkerForm();

  document.getElementById('worker-id').value       = w.id;
  document.getElementById('fw-name').value         = w.name        || '';
  document.getElementById('fw-surname').value      = w.surname     || '';
  document.getElementById('fw-father-name').value  = w.father_name || '';
  document.getElementById('fw-birthdate').value    = w.birthdate   || '';
  document.getElementById('fw-passport').value     = w.passport_id || '';
  document.getElementById('fw-phone').value        = w.phone       || '';
  document.getElementById('fw-email').value        = w.email       || '';
  document.getElementById('fw-title').value        = w.title       || '';
  document.getElementById('fw-salary').value       = w.salary      || '';
  document.getElementById('fw-notes').value        = w.notes       || '';

  if (w.photo_url) {
    const img = document.getElementById('worker-photo-preview');
    if (img) { img.src = w.photo_url; img.style.display = 'block'; }
    const ph = document.getElementById('worker-photo-placeholder');
    if (ph) ph.style.display = 'none';
  }
  // w.passport_url / doc1_url / doc2_url shown in gallery below
  // populate extra docs gallery
  const existingWorkerDocs = [];
  if (w.passport_url) existingWorkerDocs.push(w.passport_url);
  if (w.doc1_url)     existingWorkerDocs.push(w.doc1_url);
  if (w.doc2_url)     existingWorkerDocs.push(w.doc2_url);
  if (Array.isArray(w.extra_docs)) existingWorkerDocs.push(...w.extra_docs);
  renderWorkerExtraDocsEdit(existingWorkerDocs);
}

async function deleteCurrentWorker() {
  if (!currentWorkerId) return;
  const w    = allWorkers.find(x => x.id === currentWorkerId);
  const name = w ? `${w.name} ${w.surname}` : 'ays ashkhatakich';
  if (!confirm(`Джnjel ${name}?`)) return;
  await sb.from('workers').delete().eq('id', currentWorkerId);
  showPage('workers');
}

// ============================================================
// ADD / SAVE WORKER
// ============================================================
function resetWorkerForm() {
  document.getElementById('worker-id').value = '';
  document.getElementById('worker-form-title').textContent = 'Avely Ashkhatakich';
  ['fw-name','fw-surname','fw-father-name','fw-birthdate','fw-passport',
   'fw-phone','fw-email','fw-title','fw-notes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['worker-photo-input','worker-extra-docs-input'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  ['worker-photo-preview'].forEach(id => {
    const el = document.getElementById(id); if (el) { el.src = ''; el.style.display = 'none'; }
  });
  ['worker-photo-placeholder'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'flex';
  });
  const errEl = document.getElementById('worker-form-error');   if (errEl) errEl.textContent = '';
  const sucEl = document.getElementById('worker-form-success'); if (sucEl) sucEl.textContent = '';
}

function cancelWorkerForm() {
  const editId = document.getElementById('worker-id').value;
  if (editId) openWorkerDetail(editId);
  else showPage('workers');
}

async function saveWorker() {
  const err = document.getElementById('worker-form-error');
  const suc = document.getElementById('worker-form-success');
  const btn = document.getElementById('save-worker-btn');
  err.textContent = ''; suc.textContent = '';

  const name    = document.getElementById('fw-name').value.trim();
  const surname = document.getElementById('fw-surname').value.trim();
  const title   = document.getElementById('fw-title').value.trim();

  if (!name || !surname) { err.textContent = 'Anunhe ev azganunh partadir en.'; return; }
  if (!title)            { err.textContent = 'Паshhhтone partadir e.'; return; }

  const originalLabel = btn.innerHTML;
  btn.innerHTML = '⏳ Pahvum e...'; btn.disabled = true;

  const payload = {
    name, surname, title,
    father_name: document.getElementById('fw-father-name').value.trim() || null,
    birthdate:   document.getElementById('fw-birthdate').value          || null,
    passport_id: document.getElementById('fw-passport').value.trim()    || null,
    phone:       document.getElementById('fw-phone').value.trim()       || null,
    email:       document.getElementById('fw-email').value.trim()       || null,
    notes:       document.getElementById('fw-notes').value.trim()       || null,
  };

  const editId = document.getElementById('worker-id').value;
  let workerId = editId;
  let dbError;

  try {
    if (editId) {
      const { error } = await sb.from('workers').update(payload).eq('id', editId);
      dbError = error;
    } else {
      const { data, error } = await sb.from('workers').insert(payload).select().single();
      dbError = error;
      if (data) workerId = data.id;
    }
  } catch (e) { dbError = { message: e.message || 'Anspaselи skhal' }; }

  if (dbError) {
    err.textContent = `Skhal: ${dbError.message}`;
    btn.innerHTML = originalLabel; btn.disabled = false;
    return;
  }

  if (workerId) {
    await uploadWorkerFile('worker-photo-input', workerId, 'worker-photos', 'photo_url');
    await uploadWorkerExtraDocs(workerId);
  }

  btn.innerHTML = originalLabel; btn.disabled = false;
  suc.textContent = editId ? 'Ashkhataky tharrmacvats e ✓' : 'Ashkhataky pahvats e ✓';
  setTimeout(() => showPage('workers'), 1200);
}

async function uploadWorkerFile(inputId, workerId, bucket, column) {
  const input = document.getElementById(inputId);
  if (!input || !input.files || !input.files[0]) return;
  const file = input.files[0];
  const ext  = file.name.split('.').pop();
  const path = `${workerId}/${Date.now()}.${ext}`;
  const { error: upErr } = await sb.storage.from(bucket).upload(path, file, { upsert: true });
  if (upErr) { console.error('Upload error:', upErr); return; }
  const { data: { publicUrl } } = sb.storage.from(bucket).getPublicUrl(path);
  await sb.from('workers').update({ [column]: publicUrl }).eq('id', workerId);
}

// ============================================================
// EXTRA DOCS GALLERY (unlimited documents — athlete)
// ============================================================
let extraDocsExisting = []; // array of URLs from DB, kept in sync with UI removals

function renderExtraDocsEdit(urls) {
  extraDocsExisting = urls || [];
  const container = document.getElementById('extra-docs-list');
  if (!container) return;
  if (!extraDocsExisting.length) { container.innerHTML = '<div style="color:var(--text3);font-size:.8rem">Pastataght chka</div>'; return; }
  container.innerHTML = extraDocsExisting.map((url, i) => {
    const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
    const name  = `Pastataght ${i+1}`;
    return `<div class="extra-doc-chip">
      ${isImg ? `<img src="${url}" onclick="viewImage('${url}')" title="${name}">` : `<span class="extra-doc-icon" onclick="viewImage('${url}')">▤ ${name}</span>`}
      <button class="extra-doc-del" onclick="removeExtraDoc(${i})" title="Heracnel">✕</button>
    </div>`;
  }).join('');
}

async function removeExtraDoc(index) {
  extraDocsExisting.splice(index, 1);
  renderExtraDocsEdit(extraDocsExisting);
  // persist immediately if editing an existing athlete, so a removal isn't lost
  const athleteId = document.getElementById('athlete-id').value;
  if (athleteId) {
    await sb.from('athletes').update({ extra_docs: extraDocsExisting }).eq('id', athleteId);
  }
}

async function uploadExtraDocs(athleteId) {
  const input = document.getElementById('extra-docs-input');
  if (!input || !input.files || !input.files.length) return;
  const newUrls = [];
  for (const file of input.files) {
    const ext  = file.name.split('.').pop();
    const path = `${athleteId}/extra/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('athlete-docs').upload(path, file, { upsert: true });
    if (error) { console.error('Extra doc upload error:', error); continue; }
    const { data: { publicUrl } } = sb.storage.from('athlete-docs').getPublicUrl(path);
    newUrls.push(publicUrl);
  }
  const merged = [...extraDocsExisting, ...newUrls];
  await sb.from('athletes').update({ extra_docs: merged }).eq('id', athleteId);
  extraDocsExisting = merged;
  input.value = '';
}

function handleExtraDocsChange(input) {
  // Live preview of newly-selected files (not yet uploaded) appended after existing ones
  const container = document.getElementById('extra-docs-list');
  if (!container || !input.files || !input.files.length) return;

  const pendingHtml = Array.from(input.files).map(file => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      return `<div class="extra-doc-chip pending"><img src="${url}" title="${file.name}"><span class="extra-doc-pending-badge">new</span></div>`;
    }
    return `<div class="extra-doc-chip pending"><span class="extra-doc-icon">▤ ${file.name}</span><span class="extra-doc-pending-badge">new</span></div>`;
  }).join('');

  renderExtraDocsEdit(extraDocsExisting);
  container.insertAdjacentHTML('beforeend', pendingHtml);
}

// ============================================================
// IMAGE VIEWER
// ============================================================
function viewImage(url) {
  const viewer = document.getElementById('img-viewer');
  const img    = document.getElementById('img-viewer-src');
  if (!viewer || !img) return;
  img.src = url;
  viewer.style.display = 'flex';
}

// ============================================================
// FILE PREVIEW
// ============================================================
function previewFile(input, previewId, placeholderId) {
  if (!input.files || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById(previewId);
    const ph  = document.getElementById(placeholderId);
    if (input.files[0].type.startsWith('image/')) {
      img.src = e.target.result; img.style.display = 'block'; ph.style.display = 'none';
    } else {
      ph.innerHTML = `<span class="upload-icon">▤</span><span style="font-size:11px;text-align:center;padding:8px">${input.files[0].name}</span>`;
    }
  };
  reader.readAsDataURL(input.files[0]);
}


// ============================================================
// COMPETITION HELPERS
// ============================================================
function getMedalEmoji(result) {
  const r = (result || '').toLowerCase();
  if (r.includes('1') || r.includes('gold')   || r.includes('vosk'))   return '🥇';
  if (r.includes('2') || r.includes('silver') || r.includes('ardzath')) return '🥈';
  if (r.includes('3') || r.includes('bronze') || r.includes('bronz'))   return '🥉';
  return '🏅';
}

let athleteOptionsCache = null;
async function getAthleteOptions() {
  if (athleteOptionsCache) return athleteOptionsCache;
  const { data } = await sb.from('athletes').select('id, name, surname, sport').order('surname');
  athleteOptionsCache = data || [];
  return athleteOptionsCache;
}

function closeCompModal(e)       { if (e.target.id === 'comp-modal') closeCompModalDirect(); }
function closeCompModalDirect()  { document.getElementById('comp-modal').style.display = 'none'; }

// ============================================================
// COMPETITION — NEW FLOW (competition-first, then add athletes)
// ============================================================
let currentCompetitionId = null;

// Override loadCompetitions to use new card style
async function loadCompetitions(filter) {
  const list = document.getElementById('competitions-list');
  list.innerHTML = '<div class="loading"><div class="spinner"></div> Berrnum e...</div>';

  let query = sb.from('competitions').select('*, competition_participants(count)').order('date', { ascending: false });
  const sport = document.getElementById('comp-filter-sport')?.value;
  if (sport) query = query.eq('sport', sport);

  const { data } = await query;
  allCompetitions = data || [];

  let filtered = allCompetitions;
  const f = filter || document.getElementById('comp-search')?.value || '';
  if (f) {
    const q = f.toLowerCase();
    filtered = allCompetitions.filter(c =>
      (c.name||'').toLowerCase().includes(q) || (c.location||'').toLowerCase().includes(q)
    );
  }

  if (!filtered.length) {
    list.innerHTML = `<div style="color:var(--text3);padding:40px;text-align:center;font-size:14px">Мрцуйт chi grantsatsvel.</div>`;
    return;
  }

  list.innerHTML = filtered.map(c => {
    const participantCount = c.competition_participants?.[0]?.count || 0;
    const dateStr = c.date ? new Date(c.date).toLocaleDateString('hy-AM') : '—';
    return `
    <div class="comp-item" onclick="openCompDetail('${c.id}')" style="cursor:pointer">
      <div class="comp-medal">🏅</div>
      <div class="comp-info">
        <div class="comp-name">${c.name}</div>
        <div class="comp-meta">
          ${c.sport ? c.sport + ' · ' : ''}
          ${c.location ? c.location + ' · ' : ''}
          ${dateStr}
          <span style="color:var(--gold);margin-left:8px">👥 ${participantCount} marzik</span>
        </div>
        ${c.notes ? `<div style="font-size:.78rem;color:var(--text3);margin-top:4px">${c.notes}</div>` : ''}
      </div>
      <div class="comp-actions">
        <button class="comp-action-btn" onclick="event.stopPropagation();openEditCompetitionModal('${c.id}')" title="Khmbagrel">✎</button>
        <button class="comp-action-btn del" onclick="event.stopPropagation();deleteCompetition('${c.id}')" title="Джnjel">✕</button>
      </div>
    </div>`;
  }).join('');
}

function handleCompSearch() {
  const el = document.getElementById('comp-search');
  if (el) loadCompetitions(el.value);
}

// Open competition detail page showing participants grouped by weight
async function openCompDetail(id) {
  currentCompetitionId = id;
  showPage('comp-detail');
  const content = document.getElementById('comp-detail-content');
  content.innerHTML = '<div class="loading"><div class="spinner"></div> Berrnum e...</div>';

  const [{ data: comp }, { data: parts }] = await Promise.all([
    sb.from('competitions').select('*').eq('id', id).single(),
    sb.from('competition_participants').select('*, athletes(name, surname, photo_url)').eq('competition_id', id).order('weight_class')
  ]);

  if (!comp) { content.innerHTML = '<p style="color:var(--text3)">Мрцуйт chi gtnyel.</p>'; return; }

  const dateStr = comp.date ? new Date(comp.date).toLocaleDateString('hy-AM') : '—';

  // Group participants by weight class
  const byWeight = {};
  (parts || []).forEach(p => {
    const key = p.weight_class || 'Qash chi nshvats';
    if (!byWeight[key]) byWeight[key] = [];
    byWeight[key].push(p);
  });

  const weightGroups = Object.entries(byWeight).map(([weight, participants]) => {
    const rows = participants.map(p => {
      const a = p.athletes;
      const initials = a ? `${a.name?.[0]||''}${a.surname?.[0]||''}`.toUpperCase() : '?';
      const photoHtml = a?.photo_url
        ? `<img src="${a.photo_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
        : initials;
      const medal = p.result ? getMedalEmoji(p.result) : '';
      return `<tr>
        <td>
          <span class="ath-photo-thumb">${photoHtml}</span>
          <span class="ath-name-cell">${a ? a.surname+' '+a.name : '—'}</span>
        </td>
        <td style="color:var(--gold);font-weight:700">${medal} ${p.result||'—'}</td>
        <td style="color:var(--text3);font-size:.82rem">${p.notes||''}</td>
        <td>
          <button class="comp-action-btn" onclick="openEditParticipantModal('${p.id}')" title="Khmbagrel">✎</button>
          <button class="comp-action-btn del" onclick="deleteParticipant('${p.id}')" title="Heracnel">✕</button>
        </td>
      </tr>`;
    }).join('');

    return `
    <div class="detail-card" style="margin-bottom:16px">
      <div class="detail-card-title" style="color:var(--gold)">⚖ ${weight} <span style="color:var(--text3);font-size:.8rem">(${participants.length} marzik)</span></div>
      <table class="comp-table" style="margin-top:8px">
        <thead><tr><th>Мarзик</th><th>Ardyunq</th><th>Nshumner</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  const emptyMsg = parts && parts.length === 0
    ? '<div class="empty-state"><div class="empty-icon">🥊</div><p>Мarziкner ch\'en avelvats. Сеghmek «+ Мarziк avely»</p></div>'
    : '';

  content.innerHTML = `
  <div class="detail-card" style="margin-bottom:20px">
    <div class="detail-card-title" style="font-size:1.3rem;color:var(--text1)">${comp.name}</div>
    <div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:12px">
      ${comp.sport    ? `<div><span style="color:var(--text3);font-size:.8rem">Мarзадзев</span><div style="color:var(--text1);font-weight:600">${comp.sport}</div></div>` : ''}
      ${comp.date     ? `<div><span style="color:var(--text3);font-size:.8rem">Amsatyw</span><div style="color:var(--text1);font-weight:600">${dateStr}</div></div>` : ''}
      ${comp.location ? `<div><span style="color:var(--text3);font-size:.8rem">Vayr</span><div style="color:var(--text1);font-weight:600">${comp.location}</div></div>` : ''}
      <div><span style="color:var(--text3);font-size:.8rem">Мarziкner</span><div style="color:var(--gold);font-weight:700;font-size:1.2rem">${parts ? parts.length : 0}</div></div>
    </div>
    ${comp.notes ? `<div style="margin-top:12px;color:var(--text3);font-size:.88rem">${comp.notes}</div>` : ''}
  </div>
  ${weightGroups || emptyMsg}`;
}

function openNewCompetitionModal() {
  document.getElementById('comp-modal-title').textContent = 'Nor Мрцуйт';
  ['comp-id','comp-name','comp-date','comp-location','comp-notes'].forEach(id => {
    const el = document.getElementById(id); if (el) el.value = '';
  });
  document.getElementById('comp-sport').value = '';
  document.getElementById('comp-error').textContent = '';
  document.getElementById('comp-modal').style.display = 'flex';
}

async function openEditCompetitionModal(id) {
  const { data: c } = await sb.from('competitions').select('*').eq('id', id).single();
  if (!c) return;
  document.getElementById('comp-modal-title').textContent = 'Мрцуйт Khmbagrel';
  document.getElementById('comp-id').value       = c.id;
  document.getElementById('comp-name').value     = c.name || '';
  document.getElementById('comp-date').value     = c.date || '';
  document.getElementById('comp-location').value = c.location || '';
  document.getElementById('comp-sport').value    = c.sport || '';
  document.getElementById('comp-notes').value    = c.notes || '';
  document.getElementById('comp-error').textContent = '';
  document.getElementById('comp-modal').style.display = 'flex';
}

function editCurrentCompetition() {
  if (currentCompetitionId) openEditCompetitionModal(currentCompetitionId);
}

async function saveCompetition() {
  const err  = document.getElementById('comp-error');
  err.textContent = '';
  const name = document.getElementById('comp-name').value.trim();
  if (!name) { err.textContent = 'Мrцуйтi anunh partadir e.'; return; }

  const payload = {
    name,
    date:     document.getElementById('comp-date').value     || null,
    location: document.getElementById('comp-location').value.trim() || null,
    sport:    document.getElementById('comp-sport').value    || null,
    notes:    document.getElementById('comp-notes').value.trim()    || null,
  };

  const editId = document.getElementById('comp-id').value;
  let compId = editId;
  let dbError;

  if (editId) {
    const { error } = await sb.from('competitions').update(payload).eq('id', editId);
    dbError = error;
  } else {
    const { data, error } = await sb.from('competitions').insert(payload).select().single();
    dbError = error;
    if (data) compId = data.id;
  }

  if (dbError) { err.textContent = `Skhal: ${dbError.message}`; return; }

  closeCompModalDirect();
  if (!editId && compId) {
    // New competition: go straight to its detail page to start adding athletes
    currentCompetitionId = compId;
    showPage('comp-detail');
    openCompDetail(compId);
  } else {
    loadCompetitions();
    if (currentCompetitionId === editId) openCompDetail(editId);
  }
}

async function deleteCompetition(id) {
  if (!confirm('Джnjel mrtsuythe?')) return;
  await sb.from('competition_participants').delete().eq('competition_id', id);
  await sb.from('competitions').delete().eq('id', id);
  showPage('competitions');
  loadCompetitions();
}

async function deleteCurrentCompetition() {
  if (currentCompetitionId) await deleteCompetition(currentCompetitionId);
}

// ── PARTICIPANT MODAL ────────────────────────────────────────────────────────
async function openAddParticipantModal() {
  if (!currentCompetitionId) return;
  document.getElementById('participant-modal-title').textContent = 'Мarziк Avely Мrцуйтin';
  document.getElementById('participant-id').value  = '';
  document.getElementById('part-weight').value     = '';
  document.getElementById('part-result').value     = '';
  document.getElementById('part-notes').value      = '';
  document.getElementById('participant-error').textContent = '';

  const athletes = await getAthleteOptions();
  const sel = document.getElementById('part-athlete');
  sel.innerHTML = '<option value="">Yntrel marzik...</option>';
  athletes.forEach(a => {
    const o = document.createElement('option');
    o.value = a.id;
    o.textContent = `${a.surname}, ${a.name}${a.sport ? ' ('+a.sport+')' : ''}`;
    sel.appendChild(o);
  });
  document.getElementById('participant-modal').style.display = 'flex';
}

async function openEditParticipantModal(partId) {
  const { data: p } = await sb.from('competition_participants').select('*').eq('id', partId).single();
  if (!p) return;
  await openAddParticipantModal();
  document.getElementById('participant-modal-title').textContent = 'Мarziк Khmbagrel';
  document.getElementById('participant-id').value  = p.id;
  document.getElementById('part-athlete').value    = p.athlete_id || '';
  document.getElementById('part-weight').value     = p.weight_class || '';
  document.getElementById('part-result').value     = p.result || '';
  document.getElementById('part-notes').value      = p.notes || '';
}

async function saveParticipant() {
  const err = document.getElementById('participant-error');
  err.textContent = '';
  const athleteId   = document.getElementById('part-athlete').value;
  const weight      = document.getElementById('part-weight').value.trim();
  if (!athleteId) { err.textContent = 'Yntrel marzik.'; return; }
  if (!weight)    { err.textContent = 'Qashe partadir e.'; return; }

  const payload = {
    competition_id: currentCompetitionId,
    athlete_id:     athleteId,
    weight_class:   weight,
    result:         document.getElementById('part-result').value.trim() || null,
    notes:          document.getElementById('part-notes').value.trim()  || null,
  };

  const editId = document.getElementById('participant-id').value;
  let dbError;

  if (editId) {
    const { error } = await sb.from('competition_participants').update(payload).eq('id', editId);
    dbError = error;
  } else {
    const { error } = await sb.from('competition_participants').insert(payload);
    dbError = error;
  }

  if (dbError) { err.textContent = `Skhal: ${dbError.message}`; return; }

  closeParticipantModalDirect();
  openCompDetail(currentCompetitionId);
}

async function deleteParticipant(partId) {
  if (!confirm('Heracne′l marzikе mrcuythits?')) return;
  await sb.from('competition_participants').delete().eq('id', partId);
  openCompDetail(currentCompetitionId);
}

function closeParticipantModal(e) { if (e.target.id === 'participant-modal') closeParticipantModalDirect(); }
function closeParticipantModalDirect() { document.getElementById('participant-modal').style.display = 'none'; }

// ============================================================
// COACH EXTRA DOCS GALLERY
// ============================================================
let coachExtraDocsExisting = [];

function renderCoachExtraDocsEdit(urls) {
  coachExtraDocsExisting = urls || [];
  const container = document.getElementById('coach-extra-docs-list');
  if (!container) return;
  if (!coachExtraDocsExisting.length) {
    container.innerHTML = '<div style="color:var(--text3);font-size:.8rem">Pastataght chka</div>';
    return;
  }
  container.innerHTML = coachExtraDocsExisting.map((url, i) => {
    const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
    return `<div class="extra-doc-chip">
      ${isImg ? `<img src="${url}" onclick="viewImage('${url}')" title="Doc ${i+1}">` : `<span class="extra-doc-icon" onclick="viewImage('${url}')">▤ Doc ${i+1}</span>`}
      <button class="extra-doc-del" onclick="removeCoachExtraDoc(${i})">✕</button>
    </div>`;
  }).join('');
}

async function removeCoachExtraDoc(index) {
  coachExtraDocsExisting.splice(index, 1);
  renderCoachExtraDocsEdit(coachExtraDocsExisting);
  const coachId = document.getElementById('coach-id').value;
  if (coachId) await sb.from('coaches').update({ extra_docs: coachExtraDocsExisting }).eq('id', coachId);
}

async function uploadCoachExtraDocs(coachId) {
  const input = document.getElementById('coach-extra-docs-input');
  if (!input || !input.files || !input.files.length) return;
  const newUrls = [];
  for (const file of input.files) {
    const ext  = file.name.split('.').pop();
    const path = `${coachId}/extra/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('coach-docs').upload(path, file, { upsert: true });
    if (error) { console.error('Coach doc upload error:', error); continue; }
    const { data: { publicUrl } } = sb.storage.from('coach-docs').getPublicUrl(path);
    newUrls.push(publicUrl);
  }
  if (newUrls.length) {
    const merged = [...coachExtraDocsExisting, ...newUrls];
    await sb.from('coaches').update({ extra_docs: merged }).eq('id', coachId);
    coachExtraDocsExisting = merged;
  }
  input.value = '';
}

function handleCoachExtraDocsChange(input) {
  const container = document.getElementById('coach-extra-docs-list');
  if (!container || !input.files || !input.files.length) return;
  const pendingHtml = Array.from(input.files).map(file => {
    if (file.type.startsWith('image/')) {
      return `<div class="extra-doc-chip pending"><img src="${URL.createObjectURL(file)}" title="${file.name}"><span class="extra-doc-pending-badge">new</span></div>`;
    }
    return `<div class="extra-doc-chip pending"><span class="extra-doc-icon">▤ ${file.name}</span><span class="extra-doc-pending-badge">new</span></div>`;
  }).join('');
  renderCoachExtraDocsEdit(coachExtraDocsExisting);
  container.insertAdjacentHTML('beforeend', pendingHtml);
}

// ============================================================
// WORKER EXTRA DOCS GALLERY
// ============================================================
let workerExtraDocsExisting = [];

function renderWorkerExtraDocsEdit(urls) {
  workerExtraDocsExisting = urls || [];
  const container = document.getElementById('worker-extra-docs-list');
  if (!container) return;
  if (!workerExtraDocsExisting.length) {
    container.innerHTML = '<div style="color:var(--text3);font-size:.8rem">Pastataght chka</div>';
    return;
  }
  container.innerHTML = workerExtraDocsExisting.map((url, i) => {
    const isImg = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
    return `<div class="extra-doc-chip">
      ${isImg ? `<img src="${url}" onclick="viewImage('${url}')" title="Doc ${i+1}">` : `<span class="extra-doc-icon" onclick="viewImage('${url}')">▤ Doc ${i+1}</span>`}
      <button class="extra-doc-del" onclick="removeWorkerExtraDoc(${i})">✕</button>
    </div>`;
  }).join('');
}

async function removeWorkerExtraDoc(index) {
  workerExtraDocsExisting.splice(index, 1);
  renderWorkerExtraDocsEdit(workerExtraDocsExisting);
  const workerId = document.getElementById('worker-id').value;
  if (workerId) await sb.from('workers').update({ extra_docs: workerExtraDocsExisting }).eq('id', workerId);
}

async function uploadWorkerExtraDocs(workerId) {
  const input = document.getElementById('worker-extra-docs-input');
  if (!input || !input.files || !input.files.length) return;
  const newUrls = [];
  for (const file of input.files) {
    const ext  = file.name.split('.').pop();
    const path = `${workerId}/extra/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await sb.storage.from('worker-docs').upload(path, file, { upsert: true });
    if (error) { console.error('Worker doc upload error:', error); continue; }
    const { data: { publicUrl } } = sb.storage.from('worker-docs').getPublicUrl(path);
    newUrls.push(publicUrl);
  }
  if (newUrls.length) {
    const merged = [...workerExtraDocsExisting, ...newUrls];
    await sb.from('workers').update({ extra_docs: merged }).eq('id', workerId);
    workerExtraDocsExisting = merged;
  }
  input.value = '';
}

function handleWorkerExtraDocsChange(input) {
  const container = document.getElementById('worker-extra-docs-list');
  if (!container || !input.files || !input.files.length) return;
  const pendingHtml = Array.from(input.files).map(file => {
    if (file.type.startsWith('image/')) {
      return `<div class="extra-doc-chip pending"><img src="${URL.createObjectURL(file)}" title="${file.name}"><span class="extra-doc-pending-badge">new</span></div>`;
    }
    return `<div class="extra-doc-chip pending"><span class="extra-doc-icon">▤ ${file.name}</span><span class="extra-doc-pending-badge">new</span></div>`;
  }).join('');
  renderWorkerExtraDocsEdit(workerExtraDocsExisting);
  container.insertAdjacentHTML('beforeend', pendingHtml);
}

// ── patch showPage to handle comp-detail ────────────────────────────────────
window.showPage = function(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navItem = document.querySelector(`[data-page="${page}"]`);
  if (navItem) navItem.classList.add('active');

  if (page === 'dashboard')   loadDashboard();
  if (page === 'athletes')    loadAthletes();
  if (page === 'add-athlete' && !document.getElementById('athlete-id').value) resetAthleteForm();
  if (page === 'coaches')     loadCoaches();
  if (page === 'add-coach' && !document.getElementById('coach-id').value) { resetCoachForm(); renderCoachExtraDocsEdit([]); }
  if (page === 'competitions') loadCompetitions();
  if (page === 'workers')     loadWorkers();
  if (page === 'add-worker' && !document.getElementById('worker-id').value) { resetWorkerForm(); renderWorkerExtraDocsEdit([]); }
};
