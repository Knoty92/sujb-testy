/* SÚJB · ZOZ – systém pro generování testových otázek (funkční prototyp) */
const LS_KEY = 'sujb_zoz_v1';
let DB = null;
let S = { user: null, view: 'dashboard', p: {} };
let timerHandle = null;

/* ---------------- utils ---------------- */
const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9);
const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const now = () => Date.now();
const dt = ts => new Date(ts).toLocaleString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const dateOnly = ts => new Date(ts).toLocaleDateString('cs-CZ');
const initials = n => n.replace(/(Mgr\.|Ing\.|Bc\.|MUDr\.|JUDr\.|PhDr\.)\s*/g, '').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase();
const stripHtml = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function save() { localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2400);
}
const roleName = r => ({ org_admin: 'Administrátor organizace', branch_admin: 'Administrátor pobočky', lecturer: 'Lektor', student: 'Studující' }[r] || r);
const branchName = id => (DB.branches.find(b => b.id === id) || {}).name || '—';
const userName = id => (DB.users.find(u => u.id === id) || {}).name || '—';

/* ---------------- seed ---------------- */
function seed() {
  const t0 = now() - 86400000 * 40;
  const branches = [
    { id: 'b1', name: 'Pobočka Praha' },
    { id: 'b2', name: 'Pobočka Brno' },
    { id: 'b3', name: 'Pobočka Ostrava' }
  ];
  const users = [
    { id: 'u1', name: 'Mgr. Jana Povolná', role: 'org_admin', branchId: null, email: 'povolna@sujb.cz' },
    { id: 'u2', name: 'Ing. Petr Novák', role: 'branch_admin', branchId: 'b1', email: 'novak@sujb.cz' },
    { id: 'u3', name: 'Ing. Eva Dvořáková', role: 'lecturer', branchId: 'b1', email: 'dvorakova@sujb.cz' },
    { id: 'u4', name: 'Mgr. Lukáš Horák', role: 'lecturer', branchId: 'b2', email: 'horak@sujb.cz' },
    { id: 'u5', name: 'Jan Svoboda', role: 'student', branchId: 'b1', email: 'svoboda@email.cz' },
    { id: 'u6', name: 'Tereza Malá', role: 'student', branchId: 'b1', email: 'mala@email.cz' },
    { id: 'u7', name: 'Martin Kučera', role: 'student', branchId: 'b2', email: 'kucera@email.cz' }
  ];
  const tags = [
    { id: 't1', name: 'Radiační ochrana', scope: 'org' },
    { id: 't2', name: 'Jaderná bezpečnost', scope: 'org' },
    { id: 't3', name: 'Legislativa', scope: 'org' },
    { id: 't4', name: 'Havarijní připravenost', scope: 'org' },
    { id: 't5', name: 'Fyzika a dozimetrie', scope: 'org' },
    { id: 't6', name: 'Praha – okruh A', scope: 'branch', branchId: 'b1' }
  ];

  const mk = (id, text, answers, tagIds, note, extra = {}) => ({
    id,
    fileId: extra.fileId || 'f1',
    versions: [{
      v: 1, text,
      answers: answers.map(a => ({ text: a[0], correct: !!a[1] })),
      tags: tagIds, note: note || '', img: null,
      shuffle: extra.shuffle !== false,
      fbOk: extra.fbOk || 'Správně.', fbBad: extra.fbBad || 'Špatně, prostudujte příslušnou část dokumentace.',
      authorId: extra.authorId || 'u3', at: t0 + Math.random() * 86400000 * 20
    }]
  });

  const questions = [
    mk('q1', 'Co vyjadřuje pojem <b>efektivní dávka</b> a v jakých jednotkách se uvádí?', [
      ['Součet absorbovaných dávek ve tkáních vážený tkáňovými faktory, jednotka sievert (Sv)', 1],
      ['Dávka na povrchu těla, jednotka gray (Gy)', 0],
      ['Počet rozpadů za sekundu, jednotka becquerel (Bq)', 0],
      ['Dávkový příkon ve vzduchu, jednotka gray za hodinu (Gy/h)', 0]
    ], ['t1', 't5'], 'Viz § 2 odst. 1 písm. h) vyhlášky č. 422/2016 Sb.'),

    mk('q2', 'Které z uvedených zásad patří mezi základní principy radiační ochrany?', [
      ['Zdůvodnění (justification)', 1],
      ['Optimalizace (ALARA)', 1],
      ['Aplikace dávkových limitů', 1],
      ['Povinné používání olověných zástěr u všech zdrojů', 0]
    ], ['t1'], 'Tři základní principy dle atomového zákona.'),

    mk('q3', 'Jaká je hodnota ročního limitu efektivní dávky pro obyvatelstvo z ozáření ze zdrojů včetně jaderných zařízení?', [
      ['1 mSv', 1],
      ['20 mSv', 0],
      ['50 mSv', 0],
      ['100 mSv', 0]
    ], ['t1', 't3'], 'Limit pro obyvatelstvo dle vyhlášky o radiační ochraně.'),

    mk('q4', 'Kdo vydává povolení k uvádění jaderného zařízení do provozu v České republice?', [
      ['Státní úřad pro jadernou bezpečnost', 1],
      ['Ministerstvo průmyslu a obchodu', 0],
      ['Státní úřad pro ochranu jaderné bezpečnosti při ČEZ, a. s.', 0],
      ['Mezinárodní agentura pro atomovou energii (IAEA)', 0]
    ], ['t3', 't2'], 'Povolení dle § 9 atomového zákona č. 263/2016 Sb.'),

    mk('q5', 'Co znamená zkratka <b>ALARA</b>?', [
      ['As Low As Reasonably Achievable – tak nízké, jak je rozumně dosažitelné', 1],
      ['All Levels Are Radiatively Allowed – všechny úrovně jsou radiačně povoleny', 0],
      ['Automated Limit And Radiation Assessment', 0],
      ['Atomic Law And Radiation Act', 0]
    ], ['t1'], ''),

    mk('q6', 'Které složky tvoří systém havarijní připravenosti jaderného zařízení?', [
      ['Havarijní plán a havarijní řád', 1],
      ['Cvičení a procvičování havarijní připravenosti', 1],
      ['Zóna havarijního plánování a monitorování', 1],
      ['Běžná roční údržba zařízení', 0]
    ], ['t4'], 'Dle vyhlášky o havarijní připravenosti.'),

    mk('q7', 'Co je <b>kritický orgán</b> při vnitřní kontaminaci?', [
      ['Orgán, ve kterém je při daném vstřebání radionuklidu nejvyšší ekvivalentní dávka', 1],
      ['Orgán s nejvyšší hmotností', 0],
      ['Orgán nejblíže povrchu těla', 0],
      ['Orgán s nejnižší radiosenzitivitou', 0]
    ], ['t1', 't5'], ''),

    mk('q8', 'Jaký je princip štěpení uranu-235 vyvolaného tepelným neutronem?', [
      ['Neutron je pohlcen jádrem U-235, vzniká nestabilní U-236, které se štěpí na dvě lehčí jádra a 2–3 neutrony', 1],
      ['Jádro U-235 emituje alfa částici a mění se na thorium', 0],
      ['Neutron se pouze rozptýlí na jádře a jádro zůstane nezměněno', 0],
      ['Dochází ke spojení dvou jader U-235 (fúze)', 0]
    ], ['t5', 't2'], ''),

    mk('q9', 'Která veličina je v soustavě SI základní?', [
      ['Elektrický proud (ampér)', 1],
      ['Aktivita (becquerel)', 0],
      ['Efektivní dávka (sievert)', 0],
      ['Dávkový příkon (gray za sekundu)', 0]
    ], ['t5'], ''),

    mk('q10', 'Co musí provozovatel jaderného zařízení provést při změně, která může ovlivnit jadernou bezpečnost?', [
      ['Oznámit změnu SÚJB a provést ji až na základě povolení či souhlasu', 1],
      ['Provést změnu ihned a informovat SÚJB zpětně do 30 dnů', 0],
      ['Informovat pouze obecní úřad', 0],
      ['Změnu není nutné hlásit, pokud je technicky zdůvodněná', 0]
    ], ['t3', 't2'], ''),

    mk('q11', 'Jaké je nejvyšší přípustné ozáření pracovníka se zdrojem při zásahu v případě havárie (pro dobrovolný zásah)?', [
      ['Pouze se souhlasem a do 100 mSv, výjimečně do 500 mSv se zvláštním režimem', 1],
      ['Bez omezení, pokud se jedná o záchranu osob', 0],
      ['Vždy maximálně 5 mSv', 0],
      ['Limit se nevztahuje na zasahující hasiče', 0]
    ], ['t4', 't1'], 'Řízené ozáření při zásahu – viz vyhláška o radiační ochraně.'),

    mk('q12', 'Co je předmětem <b>záznamu o zkoušení</b> v aplikaci?', [
      ['Průběh testu, odpovědi, vyhodnocení a identifikace zkoušeného', 1],
      ['Pouze jméno zkoušeného a datum', 0],
      ['Pouze výsledné skóre bez detailů', 0],
      ['Nic se nezaznamenává, testy jsou anonymní', 0]
    ], ['t3'], '')
  ];

  const files = [
    { id: 'f1', name: 'Radiační ochrana – základní okruh', ownerId: 'u3', branchId: 'b1', access: { u3: 'owner', u4: 'read' }, questionIds: ['q1', 'q2', 'q3', 'q5', 'q7', 'q11'] },
    { id: 'f2', name: 'Jaderná bezpečnost a legislativa', ownerId: 'u4', branchId: 'b2', access: { u4: 'owner', u3: 'edit' }, questionIds: ['q4', 'q8', 'q10', 'q12'] },
    { id: 'f3', name: 'Fyzika a dozimetrie', ownerId: 'u3', branchId: 'b1', access: { u3: 'owner' }, questionIds: ['q9', 'q5', 'q7'] }
  ];

  const tests = [{
    id: 'te1', name: 'ZOZ – zkouška 2027 (radiační ochrana)', ownerId: 'u3', branchId: 'b1',
    fileIds: ['f1', 'f3'], directIds: ['q1'], randomCount: 5,
    allowTags: [], denyTags: [], timeLimit: 20, shuffleQ: true,
    intro: 'Vítejte u zkoušky zvláštní odborné způsobilosti. Test obsahuje otázky z radiační ochrany. Na vypracování máte 20 minut.',
    password: '', showResults: true, passScore: 80, maxAttempts: 2, createdAt: t0 + 86400000 * 30
  }, {
    id: 'te2', name: 'ZOZ – legislativa a havarijní připravenost', ownerId: 'u4', branchId: 'b2',
    fileIds: ['f2'], directIds: [], randomCount: 4,
    allowTags: [], denyTags: [], timeLimit: 15, shuffleQ: true,
    intro: 'Test z legislativy a havarijní připravenosti.', password: '', showResults: true, passScore: 70, maxAttempts: 3, createdAt: t0 + 86400000 * 26
  }];

  const variants = [];
  const assignments = [];
  const attempts = [];
  // vygeneruj varianty + historické pokusy pro statistiky
  const mkVariants = (test, n) => {
    for (let i = 0; i < n; i++) {
      const pool = [];
      test.fileIds.forEach(fid => {
        const f = files.find(x => x.id === fid); if (f) pool.push(...f.questionIds);
      });
      const uniq = [...new Set([...test.directIds, ...pool])];
      const pick = uniq.sort(() => Math.random() - 0.5).slice(0, test.randomCount + test.directIds.length);
      variants.push({
        id: 'va_' + test.id + '_' + (i + 1), testId: test.id, no: i + 1,
        questionIds: test.shuffleQ ? pick.sort(() => Math.random() - 0.5) : pick,
        createdAt: test.createdAt + 86400000 * (i + 1)
      });
    }
  };
  mkVariants(tests[0], 4); mkVariants(tests[1], 3);

  variants.forEach((v, vi) => {
    for (let k = 0; k < 3; k++) {
      const stu = users.filter(u => u.role === 'student')[k % 3];
      const started = t0 + 86400000 * (34 + (vi % 6)) + k * 3600000;
      const answers = {}; let correct = 0;
      v.questionIds.forEach(qid => {
        const q = questions.find(x => x.id === qid); if (!q) return;
        const cur = q.versions[q.versions.length - 1];
        const ok = Math.random() > 0.28;
        const correctIdxs = cur.answers.map((a, i) => a.correct ? i : -1).filter(i => i >= 0);
        answers[qid] = ok ? correctIdxs : [0];
        if (ok) correct++;
      });
      const score = Math.round(correct / Math.max(1, v.questionIds.length) * 100);
      attempts.push({
        id: uid('at'), variantId: v.id, testId: v.testId, studentId: stu.id, branchId: stu.branchId,
        startedAt: started, finishedAt: started + 11 * 60000, answers,
        score, passed: score >= (tests.find(t => t.id === v.testId).passScore || 70),
        status: 'done', log: [{ t: started, e: 'Zahájeno' }, { t: started + 11 * 60000, e: 'Odevzdáno' }]
      });
    }
  });

  return {
    org: { name: 'Státní úřad pro jadernou bezpečnost', id: 'org1' },
    branches, users, tags, questions, files, tests, variants, assignments, attempts,
    seq: { q: 13, f: 4, te: 3, va: 20 }
  };
}

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) { DB = JSON.parse(raw); return; }
  } catch (e) { }
  DB = seed(); save();
}

/* ---------------- auth / nav ---------------- */
function login(id) {
  S.user = DB.users.find(u => u.id === id);
  S.view = S.user.role === 'student' ? 'mytests' : 'dashboard';
  S.p = {};
  render();
}
function logout() { S.user = null; render(); }
function go(view, p = {}) { S.view = view; S.p = p; render(); window.scrollTo(0, 0); }

function navFor(role) {
  const common = [
    ['dashboard', 'Přehled', '▤'],
    ['questions', 'Otázky', '❓'],
    ['files', 'Soubory otázek', '🗂'],
    ['tests', 'Testy', '📝'],
    ['exam', 'Zkoušení', '▶'],
    ['results', 'Výsledky', '📊'],
    ['stats', 'Statistiky', '📈']
  ];
  if (role === 'student') return [['mytests', 'Moje testy', '📝'], ['myresults', 'Moje výsledky', '📊']];
  if (role === 'lecturer') return common;
  return [...common, ['users', 'Uživatelé a pobočky', '👥']];
}

/* ---------------- render shell ---------------- */
function render() {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  const app = document.getElementById('app');
  if (!S.user) { app.innerHTML = authView(); return; }

  const nav = navFor(S.user.role);
  const view = S.view;
  let title = 'Přehled', body = '';

  switch (view) {
    case 'dashboard': title = 'Přehled'; body = dashboardView(); break;
    case 'questions': title = 'Banka otázek'; body = questionsView(); break;
    case 'files': title = 'Soubory otázek'; body = filesView(); break;
    case 'tests': title = 'Testy'; body = testsView(); break;
    case 'exam': title = 'Zkoušení'; body = examView(); break;
    case 'results': title = 'Výsledky'; body = resultsView(); break;
    case 'stats': title = 'Statistiky'; body = statsView(); break;
    case 'users': title = 'Uživatelé a pobočky'; body = usersView(); break;
    case 'mytests': title = 'Moje testy'; body = myTestsView(); break;
    case 'myresults': title = 'Moje výsledky'; body = myResultsView(); break;
    case 'take': title = 'Vyplnění testu'; body = takeView(); break;
    default: title = 'Přehled'; body = dashboardView();
  }
  if (view === 'take') { app.innerHTML = body; afterTake(); return; }

  app.innerHTML = `
  <div class="shell">
    <aside class="side">
      <div class="side-logo"><div class="mark">SÚ</div><div>SÚJB<small>Testy ZOZ</small></div></div>
      ${nav.map(([id, label, ico]) => `<button class="nav-item ${view === id ? 'active' : ''}" onclick="go('${id}')"><span class="ico">${ico}</span>${label}</button>`).join('')}
      <div class="side-user">
        <div class="avatar">${initials(S.user.name)}</div>
        <div><div class="nm">${esc(S.user.name)}</div><div class="rl">${roleName(S.user.role)}${S.user.branchId ? ' · ' + esc(branchName(S.user.branchId)) : ''}</div></div>
        <button onclick="logout()" title="Odhlásit">⎋</button>
      </div>
    </aside>
    <div class="main">
      <header class="top">
        <div><div class="crumb">${esc(DB.org.name)}</div><h1>${esc(title)}</h1></div>
        <div class="spacer"></div>
        <span class="badge">${roleName(S.user.role)}</span>
        ${S.user.branchId ? `<span class="badge gray">${esc(branchName(S.user.branchId))}</span>` : ''}
      </header>
      <div class="content">${body}</div>
    </div>
  </div>`;
}

/* ---------------- auth view ---------------- */
function authView() {
  return `
  <div class="auth">
    <div class="auth-brand">
      <div class="auth-logo"><div class="auth-mark">SÚ</div> STÁTNÍ ÚŘAD PRO JADERNOU BEZPEČNOST</div>
      <div class="auth-copy">
        <h1>Testy zvláštní odborné způsobilosti</h1>
        <p>Systém pro správu otázek, sestavování testů, generování variací a elektronické zkoušení na pobočkách.</p>
        <div class="auth-list">
          <span>▸ <b>Banka otázek</b> s historií změn, štítky a obrázky</span>
          <span>▸ <b>Generování variací</b> testů a tiskové sestavy</span>
          <span>▸ <b>Elektronické zkoušení</b> přes kódy a anonymní odkazy</span>
          <span>▸ <b>Statistiky</b> úspěšnosti podle otázek i poboček</span>
        </div>
      </div>
      <div class="auth-foot">Prototyp · ukázková data · NENÍ produkční systém</div>
    </div>
    <div class="auth-panel">
      <div class="auth-box">
        <h2>Přihlášení</h2>
        <div class="sub">Vyberte roli, pod kterou chcete systém vyzkoušet.</div>
        ${DB.users.map(u => `
          <button class="role-item" onclick="login('${u.id}')">
            <div class="avatar">${initials(u.name)}</div>
            <div style="flex:1"><div class="rn">${esc(u.name)}</div><div class="rr">${roleName(u.role)}${u.branchId ? ' · ' + esc(branchName(u.branchId)) : ' · celá organizace'}</div></div>
            <span style="color:#94a3b8">→</span>
          </button>`).join('')}
        <div class="hint" style="font-size:12px;color:#64748b;margin-top:16px">Demo prostředí: všechna data se ukládají lokálně v prohlížeči.</div>
      </div>
    </div>
  </div>`;
}

/* ---------------- dashboard ---------------- */
function dashboardView() {
  const mine = DB.attempts.filter(a => a.status === 'done');
  const scope = S.user.role === 'org_admin' ? mine
    : S.user.role === 'branch_admin' ? mine.filter(a => a.branchId === S.user.branchId)
      : mine.filter(a => a.testId && DB.tests.find(t => t.id === a.testId && t.ownerId === S.user.id));
  const avg = scope.length ? Math.round(scope.reduce((s, a) => s + a.score, 0) / scope.length) : 0;
  const passed = scope.filter(a => a.passed).length;
  const questions = DB.questions.length;
  const vars = DB.variants.length;

  const recent = [...scope].sort((a, b) => b.finishedAt - a.finishedAt).slice(0, 6);

  return `
  <div class="grid g-4" style="margin-bottom:16px">
    <div class="card kpi"><div class="label">Otázky v bance</div><div class="val">${questions}</div><div class="delta">${DB.files.length} souborů otázek</div></div>
    <div class="card kpi"><div class="label">Vygenerované variace</div><div class="val">${vars}</div><div class="delta">${DB.tests.length} aktivních testů</div></div>
    <div class="card kpi"><div class="label">Provedená zkoušení</div><div class="val">${scope.length}</div><div class="delta">${passed} splnilo kritérium</div></div>
    <div class="card kpi"><div class="label">Průměrná úspěšnost</div><div class="val">${avg} %</div><div class="delta">${scope.length ? Math.round(passed / scope.length * 100) : 0} % splnilo test</div></div>
  </div>

  <div class="grid g-2">
    <div class="card">
      <div class="card-h"><h3>Poslední zkoušení</h3><div class="spacer"></div><button class="btn sm" onclick="go('results')">Vše</button></div>
      <div class="card-b" style="padding:0">
        ${recent.length ? `<table><tbody>${recent.map(a => {
    const t = DB.tests.find(x => x.id === a.testId) || {};
    return `<tr>
            <td><div style="display:flex;gap:9px;align-items:center"><div class="avatar">${initials(userName(a.studentId))}</div><div><div style="font-weight:500">${esc(userName(a.studentId))}</div><div style="color:#64748b;font-size:12px">${esc(t.name || '')}</div></div></div></td>
            <td style="text-align:right"><span class="badge ${a.passed ? 'ok' : 'bad'}">${a.score} %</span></td>
            <td style="text-align:right;color:#64748b;font-size:12.5px">${dt(a.finishedAt)}</td>
          </tr>`;
  }).join('')}</tbody></table>` : '<div class="empty">Zatím žádné zkoušení.</div>'}
      </div>
    </div>
    <div class="card">
      <div class="card-h"><h3>Stav poboček</h3></div>
      <div class="card-b">
        ${DB.branches.map(b => {
    const at = DB.attempts.filter(a => a.branchId === b.id && a.status === 'done');
    const p = at.filter(a => a.passed).length;
    const rate = at.length ? Math.round(p / at.length * 100) : 0;
    return `<div class="stat-row">
            <div class="nm"><b>${esc(b.name)}</b><div style="color:#64748b;font-size:12px">${at.length} zkoušení · ${DB.users.filter(u => u.branchId === b.id).length} uživatelů</div></div>
            <div style="width:120px"><div class="bar ${rate >= 70 ? 'ok' : rate >= 40 ? '' : 'bad'}"><i style="width:${rate}%"></i></div></div>
            <div class="v">${rate} %</div>
          </div>`;
  }).join('')}
      </div>
    </div>
  </div>`;
}

/* ---------------- questions ---------------- */
function visibleQuestions() {
  return DB.questions;
}
function currentVersion(q) { return q.versions[q.versions.length - 1]; }

function questionsView() {
  const f = S.p;
  let list = visibleQuestions();
  if (f.q) {
    const s = f.q.toLowerCase();
    list = list.filter(q => {
      const v = currentVersion(q);
      return stripHtml(v.text).toLowerCase().includes(s) || stripHtml(v.note).toLowerCase().includes(s);
    });
  }
  if (f.tag) list = list.filter(q => currentVersion(q).tags.includes(f.tag));
  const tagOpts = DB.tags.map(t => `<option value="${t.id}" ${f.tag === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('');

  return `
  <div class="toolbar">
    <div class="search"><span class="mag">⌕</span><input type="text" placeholder="Fulltextové hledání v zadání a poznámce…" value="${esc(f.q || '')}" oninput="S.p.q=this.value;renderList()" id="qsearch"></div>
    <select style="width:220px" onchange="go('questions',{...S.p,tag:this.value})">
      <option value="">Všechny štítky</option>${tagOpts}
    </select>
    <div class="spacer"></div>
    <button class="btn primary" onclick="openQuestion()">+ Nová otázka</button>
  </div>
  <div class="card"><div id="qlist">${questionsList(list)}</div></div>`;
}

function renderList() {
  const f = S.p;
  let list = visibleQuestions();
  if (f.q) { const s = f.q.toLowerCase(); list = list.filter(q => { const v = currentVersion(q); return stripHtml(v.text).toLowerCase().includes(s) || stripHtml(v.note).toLowerCase().includes(s); }); }
  if (f.tag) list = list.filter(q => currentVersion(q).tags.includes(f.tag));
  document.getElementById('qlist').innerHTML = questionsList(list);
}

function questionsList(list) {
  if (!list.length) return '<div class="empty"><div class="big">Žádné otázky</div>Zkuste změnit filtr nebo vytvořte novou otázku.</div>';
  return list.map(q => {
    const v = currentVersion(q);
    const file = DB.files.find(x => x.id === q.fileId);
    return `<div class="q-item">
      <div class="q-top">
        <div style="flex:1">
          <div class="q-text">${v.text}</div>
          <div class="q-meta">
            ${v.tags.map(tid => { const t = DB.tags.find(x => x.id === tid); return t ? `<span class="chip b">${esc(t.name)}</span>` : ''; }).join('')}
            <span>${v.answers.filter(a => a.correct).length === 1 ? '1 správná' : v.answers.filter(a => a.correct).length + ' správné'}</span>
            <span>verze ${v.v}</span>
            <span>${esc(file ? file.name : '—')}</span>
          </div>
        </div>
        <div class="q-actions">
          <button class="btn sm" onclick="openQuestion('${q.id}')">Upravit</button>
          <button class="btn sm ghost" onclick="showHistory('${q.id}')">Historie</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openQuestion(id) {
  const q = id ? DB.questions.find(x => x.id === id) : null;
  const v = q ? { ...currentVersion(q) } : { text: '', answers: [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }], tags: [], note: '', img: null, shuffle: true, fbOk: 'Správně.', fbBad: 'Špatně.' };
  const tagChecks = DB.tags.map(t => `<label class="chip" style="cursor:pointer;padding:6px 10px"><input type="checkbox" value="${t.id}" ${v.tags.includes(t.id) ? 'checked' : ''} style="margin-right:6px"> ${esc(t.name)}</label>`).join(' ');

  modal(`<div class="modal-h"><h3>${q ? 'Upravit otázku' : 'Nová otázka'}</h3><button onclick="closeModal()">✕</button></div>
  <div class="modal-b">
    <div class="field">
      <label>Zadání otázky</label>
      <div class="rte-toolbar">
        <button type="button" onclick="rte('bold')" title="Tučné"><b>B</b></button>
        <button type="button" onclick="rte('italic')" title="Kurzíva"><i>I</i></button>
        <button type="button" onclick="rte('superscript')" title="Horní index">x²</button>
        <button type="button" onclick="rte('subscript')" title="Dolní index">x₂</button>
        <button type="button" onclick="rte('insertUnorderedList')" title="Seznam">≡</button>
      </div>
      <div class="rte" id="q-text" contenteditable="true">${v.text}</div>
    </div>

    <div class="field">
      <label>Odpovědi <span style="font-weight:400;color:#64748b">(zaškrtněte správné, minimálně 4)</span></label>
      <div id="answers">${v.answers.map((a, i) => answerRow(a, i)).join('')}</div>
      <button class="btn sm" onclick="addAnswer()">+ Přidat odpověď</button>
    </div>

    <div class="row">
      <div class="field"><label>Reakce na správnou odpověď</label><input type="text" id="q-fbok" value="${esc(v.fbOk)}"></div>
      <div class="field"><label>Reakce na chybnou odpověď</label><input type="text" id="q-fbbad" value="${esc(v.fbBad)}"></div>
    </div>

    <div class="row">
      <div class="field"><label>Soubor otázek</label>
        <select id="q-file">${DB.files.map(f => `<option value="${f.id}" ${q && q.fileId === f.id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select>
      </div>
      <div class="field"><label>Míchání odpovědí</label>
        <select id="q-shuffle"><option value="1" ${v.shuffle ? 'selected' : ''}>Povoleno</option><option value="0" ${!v.shuffle ? 'selected' : ''}>Zakázáno</option></select>
      </div>
    </div>

    <div class="field"><label>Poznámka k otázce</label><textarea id="q-note" placeholder="Interní poznámka, odkaz na předpis…">${esc(v.note)}</textarea></div>

    <div class="field"><label>Štítky</label><div>${tagChecks}</div></div>

    <div class="field"><label>Obrázek</label>
      <input type="file" accept="image/*" onchange="pickImage(this)">
      <div id="img-prev" style="margin-top:8px">${v.img ? `<img src="${v.img}" style="max-height:120px;border-radius:8px;border:1px solid #e2e8f0">` : ''}</div>
    </div>
  </div>
  <div class="modal-f">
    <button class="btn" onclick="closeModal()">Zrušit</button>
    <button class="btn primary" onclick="saveQuestion('${id || ''}')">Uložit otázku</button>
  </div>`);
  window.__img = v.img || null;
}

function answerRow(a, i) {
  return `<div class="ans ${a.correct ? 'correct' : ''}" data-i="${i}">
    <input class="tick" type="checkbox" ${a.correct ? 'checked' : ''} onchange="this.closest('.ans').classList.toggle('correct',this.checked)">
    <input type="text" value="${esc(a.text)}" placeholder="Text odpovědi ${i + 1}">
    <button class="btn sm ghost" onclick="this.closest('.ans').remove()" title="Odebrat">✕</button>
  </div>`;
}
function addAnswer() {
  const box = document.getElementById('answers');
  const i = box.children.length;
  box.insertAdjacentHTML('beforeend', answerRow({ text: '', correct: false }, i));
}
function rte(cmd) { document.execCommand(cmd, false, null); document.getElementById('q-text').focus(); }
function pickImage(input) {
  const f = input.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = e => { window.__img = e.target.result; document.getElementById('img-prev').innerHTML = `<img src="${e.target.result}" style="max-height:120px;border-radius:8px;border:1px solid #e2e8f0">`; };
  r.readAsDataURL(f);
}

function saveQuestion(id) {
  const text = document.getElementById('q-text').innerHTML.trim();
  const answers = [...document.querySelectorAll('#answers .ans')].map(row => ({
    text: row.querySelector('input[type=text]').value.trim(),
    correct: row.querySelector('.tick').checked
  })).filter(a => a.text);
  if (!stripHtml(text)) return toast('Zadání nesmí být prázdné.');
  if (answers.length < 4) return toast('Otázka musí mít alespoň 4 odpovědi.');
  if (!answers.some(a => a.correct)) return toast('Označte alespoň jednu správnou odpověď.');

  const tags = [...document.querySelectorAll('.modal-b input[type=checkbox][value^="t"]:checked')].map(c => c.value);
  const note = document.getElementById('q-note').value.trim();
  const fileId = document.getElementById('q-file').value;
  const shuffle = document.getElementById('q-shuffle').value === '1';
  const fbOk = document.getElementById('q-fbok').value.trim();
  const fbBad = document.getElementById('q-fbbad').value.trim();

  if (id) {
    const q = DB.questions.find(x => x.id === id);
    const prev = currentVersion(q);
    q.versions.push({ v: prev.v + 1, text, answers, tags, note, img: window.__img, shuffle, fbOk, fbBad, authorId: S.user.id, at: now() });
    q.fileId = fileId;
    toast('Nová verze otázky uložena (v' + (prev.v + 1) + ').');
  } else {
    const nq = { id: uid('q'), fileId, versions: [{ v: 1, text, answers, tags, note, img: window.__img, shuffle, fbOk, fbBad, authorId: S.user.id, at: now() }] };
    DB.questions.push(nq);
    const f = DB.files.find(x => x.id === fileId); if (f) f.questionIds.push(nq.id);
    toast('Otázka vytvořena.');
  }
  save(); closeModal(); render();
}

function showHistory(id) {
  const q = DB.questions.find(x => x.id === id);
  modal(`<div class="modal-h"><h3>Historie otázky</h3><button onclick="closeModal()">✕</button></div>
  <div class="modal-b">
    ${q.versions.slice().reverse().map(v => `
      <div style="border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:10px">
        <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px">
          <span class="badge">verze ${v.v}</span>
          <span style="color:#64748b;font-size:12.5px">${esc(userName(v.authorId))} · ${dt(v.at)}</span>
        </div>
        <div style="margin-bottom:8px">${v.text}</div>
        <div style="color:#64748b;font-size:12.5px">${v.answers.length} odpovědí · ${v.answers.filter(a => a.correct).length} správných${v.note ? ' · poznámka: ' + esc(v.note) : ''}</div>
      </div>`).join('')}
  </div>
  <div class="modal-f"><button class="btn" onclick="closeModal()">Zavřít</button></div>`);
}

/* ---------------- files ---------------- */
function filesView() {
  return `
  <div class="toolbar"><div class="spacer"></div><button class="btn primary" onclick="newFile()">+ Nový soubor otázek</button></div>
  <div class="grid g-2">
    ${DB.files.map(f => {
    const owner = userName(f.ownerId);
    const rights = Object.entries(f.access || {}).map(([uid2, r]) => `${esc(userName(uid2))}: <b>${r === 'owner' ? 'vlastník' : r === 'edit' ? 'editace' : 'čtení'}</b>`).join(' · ');
    return `<div class="card">
        <div class="card-h"><h3>${esc(f.name)}</h3><div class="spacer"></div><span class="badge gray">${f.questionIds.length} otázek</span></div>
        <div class="card-b">
          <div style="color:#64748b;font-size:13px;margin-bottom:10px">Vlastník: <b style="color:#0d1526">${esc(owner)}</b> · ${esc(branchName(f.branchId))}</div>
          <div style="color:#64748b;font-size:12.5px;margin-bottom:14px">Práva: ${rights || '—'}</div>
          <div class="row">
            <button class="btn sm" onclick="fileQuestions('${f.id}')">Zobrazit otázky</button>
            <button class="btn sm ghost" onclick="editFileRights('${f.id}')">Nastavit práva</button>
          </div>
        </div>
      </div>`;
  }).join('')}
  </div>`;
}
function fileQuestions(id) {
  const f = DB.files.find(x => x.id === id);
  const qs = DB.questions.filter(q => f.questionIds.includes(q.id));
  modal(`<div class="modal-h"><h3>${esc(f.name)}</h3><button onclick="closeModal()">✕</button></div>
  <div class="modal-b">${qs.map(q => `<div style="padding:10px 0;border-bottom:1px solid #eef2f9"><div style="font-weight:500">${currentVersion(q).text}</div><div style="color:#64748b;font-size:12.5px;margin-top:4px">verze ${currentVersion(q).v} · ${currentVersion(q).answers.filter(a => a.correct).length} správných</div></div>`).join('') || '<div class="empty">Soubor je prázdný.</div>'}</div>
  <div class="modal-f"><button class="btn" onclick="closeModal()">Zavřít</button></div>`);
}
function newFile() {
  modal(`<div class="modal-h"><h3>Nový soubor otázek</h3><button onclick="closeModal()">✕</button></div>
  <div class="modal-b">
    <div class="field"><label>Název</label><input type="text" id="f-name" placeholder="např. Radiační ochrana – rozšířený okruh"></div>
    <div class="field"><label>Pobočka</label><select id="f-branch">${DB.branches.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></div>
  </div>
  <div class="modal-f"><button class="btn" onclick="closeModal()">Zrušit</button><button class="btn primary" onclick="saveFile()">Vytvořit</button></div>`);
}
function saveFile() {
  const name = document.getElementById('f-name').value.trim();
  if (!name) return toast('Zadejte název.');
  DB.files.push({ id: uid('f'), name, ownerId: S.user.id, branchId: document.getElementById('f-branch').value, access: { [S.user.id]: 'owner' }, questionIds: [] });
  save(); closeModal(); render(); toast('Soubor vytvořen.');
}
function editFileRights(id) {
  const f = DB.files.find(x => x.id === id);
  const lecturers = DB.users.filter(u => u.role === 'lecturer');
  modal(`<div class="modal-h"><h3>Práva k souboru</h3><button onclick="closeModal()">✕</button></div>
  <div class="modal-b">
    <div style="color:#64748b;font-size:13px;margin-bottom:14px">${esc(f.name)}</div>
    ${lecturers.map(u => `<div class="field"><label>${esc(u.name)} — ${esc(branchName(u.branchId))}</label>
      <select data-uid="${u.id}" class="rights">${['none', 'read', 'edit', 'owner'].map(r => `<option value="${r}" ${((f.access || {})[u.id] || 'none') === r ? 'selected' : ''}>${{ none: 'bez přístupu', read: 'čtení', edit: 'editace', owner: 'vlastník' }[r]}</option>`).join('')}</select></div>`).join('')}
  </div>
  <div class="modal-f"><button class="btn" onclick="closeModal()">Zrušit</button><button class="btn primary" onclick="saveRights('${id}')">Uložit</button></div>`);
}
function saveRights(id) {
  const f = DB.files.find(x => x.id === id);
  [...document.querySelectorAll('.rights')].forEach(sel => {
    const uid2 = sel.dataset.uid;
    if (sel.value === 'none') delete f.access[uid2]; else f.access[uid2] = sel.value;
  });
  save(); closeModal(); render(); toast('Práva uložena.');
}

/* ---------------- tests ---------------- */
function testsView() {
  return `
  <div class="toolbar"><div class="spacer"></div><button class="btn primary" onclick="openTest()">+ Nový test</button></div>
  <div class="grid g-2">
    ${DB.tests.map(t => {
    const vars = DB.variants.filter(v => v.testId === t.id);
    const at = DB.attempts.filter(a => a.testId === t.id && a.status === 'done');
    return `<div class="card">
        <div class="card-h"><h3>${esc(t.name)}</h3><div class="spacer"></div><span class="badge gray">${vars.length} variací</span></div>
        <div class="card-b">
          <div style="color:#64748b;font-size:13px;line-height:1.9">
            ${t.fileIds.length} souborů otázek · ${t.randomCount} náhodných + ${t.directIds.length} povinných<br>
            Časový limit ${t.timeLimit} min · kritérium ${t.passScore} % · max. ${t.maxAttempts} pokusů<br>
            ${at.length} zkoušení · průměr ${at.length ? Math.round(at.reduce((s, a) => s + a.score, 0) / at.length) : 0} %
          </div>
          <div class="row" style="margin-top:14px">
            <button class="btn sm primary" onclick="generateVariants('${t.id}')">Generovat variace</button>
            <button class="btn sm" onclick="openTest('${t.id}')">Upravit</button>
            <button class="btn sm ghost" onclick="printVariants('${t.id}')">Tisk</button>
          </div>
        </div>
      </div>`;
  }).join('')}
  </div>`;
}

function openTest(id) {
  const t = id ? DB.tests.find(x => x.id === id) : { name: '', fileIds: [], directIds: [], randomCount: 5, allowTags: [], denyTags: [], timeLimit: 20, shuffleQ: true, intro: '', password: '', showResults: true, passScore: 70, maxAttempts: 3 };
  modal(`<div class="modal-h"><h3>${id ? 'Úprava testu' : 'Nový test'}</h3><button onclick="closeModal()">✕</button></div>
  <div class="modal-b">
    <div class="field"><label>Název testu</label><input type="text" id="t-name" value="${esc(t.name)}"></div>
    <div class="row">
      <div class="field"><label>Časový limit (min)</label><input type="number" id="t-time" value="${t.timeLimit}" min="1"></div>
      <div class="field"><label>Kritérium splnění (%)</label><input type="number" id="t-pass" value="${t.passScore}" min="1" max="100"></div>
      <div class="field"><label>Max. počet pokusů</label><input type="number" id="t-tries" value="${t.maxAttempts}" min="1"></div>
    </div>
    <div class="field"><label>Soubory otázek</label>
      ${DB.files.map(f => `<label class="chip" style="padding:7px 11px;cursor:pointer;display:inline-flex"><input type="checkbox" class="t-files" value="${f.id}" ${t.fileIds.includes(f.id) ? 'checked' : ''} style="margin-right:6px">${esc(f.name)}</label>`).join(' ')}
    </div>
    <div class="field"><label>Náhodný výběr — počet otázek</label><input type="number" id="t-rand" value="${t.randomCount}" min="1"></div>
    <div class="field"><label>Povinné otázky (vždy zařazené)</label>
      <select id="t-direct" multiple size="5" style="height:auto">${DB.questions.map(q => `<option value="${q.id}" ${t.directIds.includes(q.id) ? 'selected' : ''}>${stripHtml(currentVersion(q).text).slice(0, 80)}</option>`).join('')}</select>
      <div class="hint">Ctrl/Cmd + klik pro vícenásobný výběr.</div>
    </div>
    <div class="row">
      <div class="field"><label>Povolené štítky</label><select id="t-allow" multiple size="4" style="height:auto">${DB.tags.map(x => `<option value="${x.id}" ${t.allowTags.includes(x.id) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Zakázané štítky</label><select id="t-deny" multiple size="4" style="height:auto">${DB.tags.map(x => `<option value="${x.id}" ${t.denyTags.includes(x.id) ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Úvodní stránka před testem</label><textarea id="t-intro">${esc(t.intro)}</textarea></div>
    <div class="row">
      <div class="field"><label>Heslo pro přístup (nepovinné)</label><input type="text" id="t-pass2" value="${esc(t.password)}"></div>
      <div class="field"><label>Zobrazit výsledky po vyhodnocení</label><select id="t-show"><option value="1" ${t.showResults ? 'selected' : ''}>Ano</option><option value="0" ${!t.showResults ? 'selected' : ''}>Ne</option></select></div>
    </div>
  </div>
  <div class="modal-f"><button class="btn" onclick="closeModal()">Zrušit</button><button class="btn primary" onclick="saveTest('${id || ''}')">Uložit test</button></div>`);
}

function saveTest(id) {
  const name = document.getElementById('t-name').value.trim();
  if (!name) return toast('Zadejte název testu.');
  const fileIds = [...document.querySelectorAll('.t-files:checked')].map(c => c.value);
  if (!fileIds.length) return toast('Vyberte alespoň jeden soubor otázek.');
  const direct = [...document.getElementById('t-direct').selectedOptions].map(o => o.value);
  const allow = [...document.getElementById('t-allow').selectedOptions].map(o => o.value);
  const deny = [...document.getElementById('t-deny').selectedOptions].map(o => o.value);
  const patch = {
    name, fileIds, directIds: direct, randomCount: +document.getElementById('t-rand').value,
    allowTags: allow, denyTags: deny, timeLimit: +document.getElementById('t-time').value,
    passScore: +document.getElementById('t-pass').value, maxAttempts: +document.getElementById('t-tries').value,
    intro: document.getElementById('t-intro').value, password: document.getElementById('t-pass2').value,
    showResults: document.getElementById('t-show').value === '1'
  };
  if (id) Object.assign(DB.tests.find(t => t.id === id), patch);
  else DB.tests.push({ id: uid('te'), ownerId: S.user.id, branchId: S.user.branchId, shuffleQ: true, createdAt: now(), ...patch });
  save(); closeModal(); render(); toast('Test uložen.');
}

function poolFor(t) {
  let ids = new Set(t.directIds || []);
  (t.fileIds || []).forEach(fid => { const f = DB.files.find(x => x.id === fid); if (f) f.questionIds.forEach(q => ids.add(q)); });
  let arr = [...ids];
  if (t.allowTags && t.allowTags.length) arr = arr.filter(qid => { const q = DB.questions.find(x => x.id === qid); return q && currentVersion(q).tags.some(tg => t.allowTags.includes(tg)); });
  if (t.denyTags && t.denyTags.length) arr = arr.filter(qid => { const q = DB.questions.find(x => x.id === qid); return q && !currentVersion(q).tags.some(tg => t.denyTags.includes(tg)); });
  return arr;
}

function generateVariants(id, count) {
  const t = DB.tests.find(x => x.id === id);
  const n = count || 4;
  const pool = poolFor(t);
  if (pool.length < t.randomCount + (t.directIds || []).length) return toast('V souborech není dost otázek pro zadaný počet.');
  for (let i = 0; i < n; i++) {
    const rand = pool.filter(q => !t.directIds.includes(q)).sort(() => Math.random() - 0.5).slice(0, t.randomCount);
    const qids = [...t.directIds, ...rand];
    DB.variants.push({ id: uid('va'), testId: id, no: DB.variants.filter(v => v.testId === id).length + i + 1, questionIds: qids.sort(() => Math.random() - 0.5), createdAt: now() });
  }
  save(); render(); toast(n + ' nových variací vygenerováno.');
}

function printVariants(id) {
  const t = DB.tests.find(x => x.id === id);
  const vars = DB.variants.filter(v => v.testId === id).slice(-3);
  if (!vars.length) return toast('Nejdřív vygenerujte variace.');
  let html = `<div class="print-head"><b>${esc(DB.org.name)}</b> — ${esc(t.name)}</div>`;
  vars.forEach(v => {
    html += `<h3 style="margin:18px 0 10px">Varianta ${v.no}</h3>`;
    v.questionIds.forEach((qid, i) => {
      const q = DB.questions.find(x => x.id === qid); if (!q) return;
      const cur = currentVersion(q);
      const opts = cur.answers.map((a, j) => `${String.fromCharCode(65 + j)}) ${stripHtml(a.text)}`).join(' | ');
      html += `<div class="print-q"><div><b>${i + 1}.</b> ${cur.text}</div><div class="print-ans">${opts}</div></div>`;
    });
    html += `<div style="margin:12px 0 22px;font-size:11px;color:#444">Správné odpovědi: ${v.questionIds.map((qid, i) => { const q = DB.questions.find(x => x.id === qid); if (!q) return ''; const cur = currentVersion(q); return (i + 1) + '=' + cur.answers.map((a, j) => a.correct ? String.fromCharCode(65 + j) : '').filter(Boolean).join(''); }).join(' &nbsp; ')}</div>`;
  });
  const area = document.createElement('div');
  area.className = 'print-area'; area.innerHTML = html;
  document.body.appendChild(area);
  window.print();
  setTimeout(() => area.remove(), 800);
}

/* ---------------- exam / zkoušení ---------------- */
function examView() {
  const t = DB.tests[0];
  const links = [
    { code: 'ZOZ-2027-A', type: 'Kód pro studující', uses: 12 },
    { code: 'ZOZ-WEB-1', type: 'Anonymní odkaz na web', uses: 4 }
  ];
  const live = DB.attempts.filter(a => a.status === 'running');
  return `
  <div class="grid g-2">
    <div class="card">
      <div class="card-h"><h3>Elektronické zkoušení</h3></div>
      <div class="card-b">
        <div class="field"><label>Test</label><select id="ex-test">${DB.tests.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div>
        <div class="row">
          <button class="btn primary" onclick="createCode()">Vygenerovat kód pro studujícího</button>
          <button class="btn" onclick="createLink()">Anonymní odkaz</button>
        </div>
        <div style="margin-top:18px">
          <div style="font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px">Aktivní přístupy</div>
          ${(DB.assignments || []).length ? DB.assignments.map(a => `<div class="formula-item"><div class="nm"><b>${esc(a.code)}</b><div class="ct">${esc(userName(a.studentId) || 'Anonymní odkaz')} · ${a.used || 0}× použito</div></div><button class="btn sm ghost" onclick="copyText('${esc(a.code)}')">Kopírovat</button></div>`).join('') : '<div style="color:#94a3b8;font-size:13px">Zatím žádné kódy. Vygenerujte první.</div>'}
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-h"><h3>Průběh v reálném čase</h3><div class="spacer"></div><span class="badge ${live.length ? 'ok' : 'gray'}">${live.length} aktivní</span></div>
      <div class="card-b" style="padding:0">
        ${live.length ? `<table><tbody>${live.map(a => `<tr><td>${esc(userName(a.studentId))}</td><td><div class="bar"><i style="width:${a.progress || 0}%"></i></div></td><td style="text-align:right;color:#64748b">${a.progress || 0} %</td></tr>`).join('')}</tbody></table>`
      : '<div class="empty"><div class="big">Nikdo právě netestuje</div>Spusťte test v režimu studujícího a objeví se zde.</div>'}
      </div>
    </div>
  </div>

  <div class="card" style="margin-top:16px">
    <div class="card-h"><h3>Přidělení testů studujícím</h3></div>
    <div class="card-b" style="padding:0">
      <table>
        <thead><tr><th>Studující</th><th>Test</th><th>Kód</th><th>Stav</th><th></th></tr></thead>
        <tbody>
          ${DB.users.filter(u => u.role === 'student').map(u => {
    const at = DB.attempts.filter(a => a.studentId === u.id);
    const done = at.filter(a => a.status === 'done');
    return `<tr>
              <td>${esc(u.name)}<div style="color:#64748b;font-size:12px">${esc(branchName(u.branchId))}</div></td>
              <td>${esc(DB.tests[0].name)}</td>
              <td><code style="font-size:12.5px">${esc(u.id.toUpperCase() + '-ZOZ')}</code></td>
              <td>${done.length ? `<span class="badge ok">${done.length}× splněno</span>` : '<span class="badge warn">nepřiřazeno</span>'}</td>
              <td style="text-align:right"><button class="btn sm" onclick="startTake('${DB.tests[0].id}','${u.id}')">Spustit</button></td>
            </tr>`;
  }).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

function createCode() {
  const testId = document.getElementById('ex-test').value;
  const code = 'ZOZ-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.floor(Math.random() * 90 + 10);
  DB.assignments.push({ id: uid('as'), testId, code, studentId: null, used: 0, createdAt: now() });
  save(); render(); toast('Kód ' + code + ' vygenerován.');
}
function createLink() {
  const testId = document.getElementById('ex-test').value;
  const code = 'web-' + Math.random().toString(36).slice(2, 7);
  DB.assignments.push({ id: uid('as'), testId, code, studentId: null, used: 0, createdAt: now(), link: true });
  save(); render(); toast('Anonymní odkaz vytvořen.');
}
function copyText(t) { navigator.clipboard && navigator.clipboard.writeText(t); toast('Zkopírováno: ' + t); }

/* ---------------- take test ---------------- */
function startTake(testId, studentId) {
  const pool = DB.variants.filter(v => v.testId === testId);
  let variant = pool[pool.length - 1];
  if (!variant) { generateVariants(testId, 1); variant = DB.variants.filter(v => v.testId === testId).pop(); }
  const attempt = {
    id: uid('at'), variantId: variant.id, testId, studentId, branchId: (DB.users.find(u => u.id === studentId) || {}).branchId,
    startedAt: now(), finishedAt: null, answers: {}, score: null, passed: null, status: 'running', progress: 0,
    log: [{ t: now(), e: 'Zahájeno' }]
  };
  DB.attempts.push(attempt); save();
  go('take', { attemptId: attempt.id, variantId: variant.id, testId });
}

function takeView() {
  const { attemptId, variantId, testId } = S.p;
  const v = DB.variants.find(x => x.id === variantId);
  const t = DB.tests.find(x => x.id === testId);
  if (!v || !t) return '<div class="content"><div class="empty">Test nenalezen.</div></div>';
  const attempt = DB.attempts.find(a => a.id === attemptId);

  return `<div class="content exam-wrap">
    <div class="card" style="margin-bottom:16px">
      <div class="card-b" style="display:flex;align-items:center;gap:14px">
        <div><div style="font-size:12px;color:#64748b">${esc(t.name)} · varianta ${v.no}</div><h2 style="font-size:18px;margin-top:4px">${esc(userName(attempt.studentId))}</h2></div>
        <div class="spacer" style="flex:1"></div>
        <div style="text-align:right"><div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.05em">Zbývá</div><div class="timer" id="timer">--:--</div></div>
      </div>
    </div>
    ${t.intro ? `<div class="card" style="margin-bottom:16px"><div class="card-b" style="color:#334155">${esc(t.intro)}</div></div>` : ''}
    <div id="examqs">
      ${v.questionIds.map((qid, i) => {
    const q = DB.questions.find(x => x.id === qid); if (!q) return '';
    const cur = currentVersion(q);
    return `<div class="exam-q">
          <div class="n">Otázka ${i + 1} / ${v.questionIds.length}</div>
          <div style="font-weight:500;margin-bottom:12px">${cur.text}</div>
          ${cur.img ? `<img src="${cur.img}" style="max-height:140px;border-radius:8px;margin-bottom:12px">` : ''}
          ${cur.answers.map((a, j) => `<label class="exam-opt" data-q="${qid}" data-a="${j}">
            <input type="checkbox" onchange="pickAnswer('${qid}',${j},this,${cur.answers.filter(x => x.correct).length > 1})">
            <span>${esc(stripHtml(a.text))}</span>
          </label>`).join('')}
        </div>`;
  }).join('')}
    </div>
    <div class="card"><div class="card-b" style="display:flex;align-items:center;gap:12px">
      <div style="color:#64748b;font-size:13px">Odpovězeno <b id="anscount">0</b> z ${v.questionIds.length}</div>
      <div class="spacer" style="flex:1"></div>
      <button class="btn primary" onclick="submitExam('${attemptId}')">Odevzdat test</button>
    </div></div>
  </div>`;
}

function pickAnswer(qid, idx, input, multi) {
  const attempt = DB.attempts.find(a => a.studentId && a.status === 'running' && a.variantId === S.p.variantId);
  const variant = DB.variants.find(v => v.id === S.p.variantId);
  if (!attempt) return;
  if (!multi) {
    // single correct – odznač ostatní
    variant.questionIds.forEach(() => { });
    document.querySelectorAll(`.exam-opt[data-q="${qid}"]`).forEach(el => {
      el.classList.remove('sel');
      const cb = el.querySelector('input'); if (cb !== input) cb.checked = false;
    });
  }
  input.closest('.exam-opt').classList.toggle('sel', input.checked);
  const sel = [...document.querySelectorAll(`.exam-opt[data-q="${qid}"] input:checked`)].map(cb => +cb.closest('.exam-opt').dataset.a);
  attempt.answers[qid] = sel;
  attempt.progress = Math.round(Object.keys(attempt.answers).filter(k => attempt.answers[k].length).length / variant.questionIds.length * 100);
  save();
  const count = Object.keys(attempt.answers).filter(k => attempt.answers[k] && attempt.answers[k].length).length;
  const el = document.getElementById('anscount'); if (el) el.textContent = count;
}

function afterTake() {
  const { attemptId, testId } = S.p;
  const t = DB.tests.find(x => x.id === testId);
  const attempt = DB.attempts.find(a => a.id === attemptId);
  if (!attempt || attempt.status !== 'running') return;
  let left = t.timeLimit * 60;
  const el = document.getElementById('timer');
  const tick = () => {
    if (!document.getElementById('timer')) { clearInterval(timerHandle); return; }
    if (left <= 0) { clearInterval(timerHandle); submitExam(attemptId, true); return; }
    const m = Math.floor(left / 60), s = left % 60;
    el.textContent = m + ':' + String(s).padStart(2, '0');
    el.classList.toggle('low', left < 120);
    left--;
  };
  tick(); timerHandle = setInterval(tick, 1000);
}

function submitExam(attemptId, auto) {
  if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
  const attempt = DB.attempts.find(a => a.id === attemptId);
  const v = DB.variants.find(x => x.id === attempt.variantId);
  const t = DB.tests.find(x => x.id === attempt.testId);
  let correct = 0;
  v.questionIds.forEach(qid => {
    const q = DB.questions.find(x => x.id === qid); if (!q) return;
    const cur = currentVersion(q);
    const truth = cur.answers.map((a, i) => a.correct ? i : -1).filter(i => i >= 0).sort();
    const given = (attempt.answers[qid] || []).slice().sort();
    if (truth.length === given.length && truth.every((x, i) => x === given[i])) correct++;
  });
  attempt.score = Math.round(correct / v.questionIds.length * 100);
  attempt.passed = attempt.score >= t.passScore;
  attempt.status = 'done';
  attempt.finishedAt = now();
  attempt.progress = 100;
  attempt.log.push({ t: now(), e: auto ? 'Automaticky odevzdáno (čas)' : 'Odevzdáno' });
  save();

  if (!t.showResults) { S.user ? go(S.user.role === 'student' ? 'myresults' : 'results') : go('dashboard'); toast('Test odevzdán.'); return; }

  const qs = v.questionIds.map(qid => {
    const q = DB.questions.find(x => x.id === qid); const cur = currentVersion(q);
    const truth = cur.answers.map((a, i) => a.correct ? i : -1).filter(i => i >= 0);
    const given = attempt.answers[qid] || [];
    const ok = truth.length === given.length && truth.every(x => given.includes(x));
    return `<div style="padding:12px 0;border-bottom:1px solid #eef2f9">
      <div style="font-weight:500">${cur.text}</div>
      <div style="font-size:12.5px;margin-top:6px;color:${ok ? '#0f7b52' : '#b42318'}">${ok ? '✓ správně' : '✗ chybně'} — správná odpověď: ${truth.map(i => esc(cur.answers[i].text)).join('; ')}</div>
      <div style="font-size:12.5px;color:#64748b;margin-top:3px">${ok ? esc(cur.fbOk) : esc(cur.fbBad)}</div>
    </div>`;
  }).join('');

  modal(`<div class="modal-h"><h3>Výsledek testu</h3></div>
  <div class="modal-b">
    <div style="text-align:center;padding:10px 0 20px">
      <div style="font-size:44px;font-weight:700;letter-spacing:-.03em">${attempt.score} %</div>
      <span class="badge ${attempt.passed ? 'ok' : 'bad'}">${attempt.passed ? 'SPLNĚNO' : 'NESPLNĚNO'} · kritérium ${t.passScore} %</span>
    </div>
    ${qs}
  </div>
  <div class="modal-f"><button class="btn primary" onclick="closeModal();logout()">Zavřít</button></div>`);
}

/* ---------------- results ---------------- */
function resultsView() {
  let at = DB.attempts.filter(a => a.status === 'done');
  if (S.user.role === 'branch_admin') at = at.filter(a => a.branchId === S.user.branchId);
  if (S.user.role === 'lecturer') at = at.filter(a => (DB.tests.find(t => t.id === a.testId) || {}).ownerId === S.user.id);
  at.sort((a, b) => b.finishedAt - a.finishedAt);
  const avg = at.length ? Math.round(at.reduce((s, a) => s + a.score, 0) / at.length) : 0;

  return `
  <div class="grid g-3" style="margin-bottom:16px">
    <div class="card kpi"><div class="label">Zkoušení celkem</div><div class="val">${at.length}</div></div>
    <div class="card kpi"><div class="label">Průměrná úspěšnost</div><div class="val">${avg} %</div></div>
    <div class="card kpi"><div class="label">Splnilo kritérium</div><div class="val">${at.filter(a => a.passed).length}</div></div>
  </div>
  <div class="card">
    <div class="card-h"><h3>Výsledky zkoušení</h3></div>
    <div class="card-b" style="padding:0">
      <table>
        <thead><tr><th>Studující</th><th>Test / varianta</th><th>Pobočka</th><th>Datum</th><th style="text-align:right">Výsledek</th><th></th></tr></thead>
        <tbody>${at.map(a => {
    const v = DB.variants.find(x => x.id === a.variantId) || {};
    const t = DB.tests.find(x => x.id === a.testId) || {};
    return `<tr>
            <td><div style="display:flex;gap:9px;align-items:center"><div class="avatar">${initials(userName(a.studentId))}</div><div style="font-weight:500">${esc(userName(a.studentId))}</div></div></td>
            <td>${esc(t.name || '')}<div style="color:#64748b;font-size:12px">varianta ${v.no || '—'}</div></td>
            <td>${esc(branchName(a.branchId))}</td>
            <td style="color:#64748b;font-size:12.5px">${dt(a.finishedAt)}</td>
            <td style="text-align:right"><span class="badge ${a.passed ? 'ok' : 'bad'}">${a.score} %</span></td>
            <td style="text-align:right"><button class="btn sm ghost" onclick="resultDetail('${a.id}')">Protokol</button></td>
          </tr>`;
  }).join('')}</tbody>
      </table>
      ${at.length ? '' : '<div class="empty">Žádné výsledky.</div>'}
    </div>
  </div>`;
}

function resultDetail(id) {
  const a = DB.attempts.find(x => x.id === id);
  const v = DB.variants.find(x => x.id === a.variantId) || {};
  const t = DB.tests.find(x => x.id === a.testId) || {};
  modal(`<div class="modal-h"><h3>Protokol o zkoušce</h3><button onclick="closeModal()">✕</button></div>
  <div class="modal-b">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13.5px;margin-bottom:16px">
      <div><b>Zkoušený:</b> ${esc(userName(a.studentId))}</div>
      <div><b>Pobočka:</b> ${esc(branchName(a.branchId))}</div>
      <div><b>Test:</b> ${esc(t.name || '')}</div>
      <div><b>Varianta:</b> ${v.no || '—'}</div>
      <div><b>Zahájeno:</b> ${dt(a.startedAt)}</div>
      <div><b>Odevzdáno:</b> ${dt(a.finishedAt)}</div>
      <div><b>Výsledek:</b> ${a.score} % (${a.passed ? 'splněno' : 'nesplněno'})</div>
      <div><b>Kritérium:</b> ${t.passScore} %</div>
    </div>
    ${v.questionIds.map((qid, i) => {
    const q = DB.questions.find(x => x.id === qid); if (!q) return '';
    const cur = currentVersion(q);
    const truth = cur.answers.map((x, j) => x.correct ? j : -1).filter(j => j >= 0);
    const given = a.answers[qid] || [];
    const ok = truth.length === given.length && truth.every(x => given.includes(x));
    return `<div style="padding:10px 0;border-bottom:1px solid #eef2f9">
        <div><b>${i + 1}.</b> ${cur.text}</div>
        <div style="font-size:12.5px;color:#64748b;margin-top:4px">Odpověď: ${given.map(j => esc(cur.answers[j] ? cur.answers[j].text : '')).join(', ') || '—'}
        · správně: ${truth.map(j => esc(cur.answers[j].text)).join(', ')} <span class="badge ${ok ? 'ok' : 'bad'}" style="margin-left:6px">${ok ? '✓' : '✗'}</span></div>
      </div>`;
  }).join('')}
  </div>
  <div class="modal-f"><button class="btn" onclick="printProtocol('${a.id}')">Tisk protokolu</button><button class="btn primary" onclick="closeModal()">Zavřít</button></div>`);
}

function printProtocol(id) {
  const a = DB.attempts.find(x => x.id === id);
  const v = DB.variants.find(x => x.id === a.variantId) || {};
  const t = DB.tests.find(x => x.id === a.testId) || {};
  const area = document.createElement('div');
  area.className = 'print-area';
  area.innerHTML = `<div class="print-head"><b>${esc(DB.org.name)}</b><br>Protokol o zkoušce — ${esc(t.name)}</div>
    <p>Zkoušený: <b>${esc(userName(a.studentId))}</b> · Pobočka: ${esc(branchName(a.branchId))} · Varianta ${v.no}</p>
    <p>Datum: ${dt(a.startedAt)} · Výsledek: <b>${a.score} %</b> (${a.passed ? 'splněno' : 'nesplněno'})</p>
    ${v.questionIds.map((qid, i) => {
    const q = DB.questions.find(x => x.id === qid); if (!q) return '';
    const cur = currentVersion(q);
    const truth = cur.answers.map((x, j) => x.correct ? j : -1).filter(j => j >= 0);
    return `<div class="print-q"><b>${i + 1}.</b> ${cur.text}<div style="font-size:11px">Správně: ${truth.map(j => esc(stripHtml(cur.answers[j].text))).join('; ')}</div></div>`;
  }).join('')}`;
  document.body.appendChild(area);
  window.print();
  setTimeout(() => area.remove(), 800);
}

/* ---------------- stats ---------------- */
function statsView() {
  const done = DB.attempts.filter(a => a.status === 'done');
  const rows = DB.questions.map(q => {
    const cur = currentVersion(q);
    let used = 0, shown = 0, ok = 0;
    DB.variants.forEach(v => { if (v.questionIds.includes(q.id)) used++; });
    done.forEach(a => {
      const v = DB.variants.find(x => x.id === a.variantId);
      if (!v || !v.questionIds.includes(q.id)) return;
      shown++;
      const truth = cur.answers.map((x, i) => x.correct ? i : -1).filter(i => i >= 0);
      const given = a.answers[q.id] || [];
      if (truth.length === given.length && truth.every(x => given.includes(x))) ok++;
    });
    return { q, used, shown, ok, rate: shown ? Math.round(ok / shown * 100) : 0 };
  }).sort((a, b) => a.rate - b.rate);

  return `
  <div class="grid g-2">
    <div class="card">
      <div class="card-h"><h3>Úspěšnost podle otázek</h3></div>
      <div class="card-b" style="padding:0">
        <table><thead><tr><th>Otázka</th><th style="text-align:right">Zařazena</th><th style="text-align:right">Zobrazena</th><th style="text-align:right">Správně</th><th style="width:90px"></th></tr></thead>
        <tbody>${rows.slice(0, 10).map(r => `<tr>
          <td style="max-width:280px">${stripHtml(r.q.versions[r.q.versions.length - 1].text).slice(0, 70)}…<div style="color:#64748b;font-size:11.5px">verze ${currentVersion(r.q).v}</div></td>
          <td style="text-align:right">${r.used}</td>
          <td style="text-align:right">${r.shown}</td>
          <td style="text-align:right">${r.ok}</td>
          <td><div class="bar ${r.rate >= 70 ? 'ok' : r.rate >= 40 ? '' : 'bad'}"><i style="width:${r.rate}%"></i></div><div style="font-size:11px;color:#64748b;text-align:right">${r.rate} %</div></td>
        </tr>`).join('')}</tbody></table>
      </div>
    </div>
    <div class="card">
      <div class="card-h"><h3>Úspěšnost podle poboček</h3></div>
      <div class="card-b">
        ${DB.branches.map(b => {
    const at = done.filter(a => a.branchId === b.id);
    const rate = at.length ? Math.round(at.filter(a => a.passed).length / at.length * 100) : 0;
    return `<div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:13.5px;margin-bottom:6px"><span>${esc(b.name)}</span><b>${rate} %</b></div>
          <div class="bar ${rate >= 70 ? 'ok' : 'bad'}"><i style="width:${rate}%"></i></div>
          <div style="color:#64748b;font-size:12px;margin-top:5px">${at.length} zkoušení · ${at.filter(a => a.passed).length} splnilo</div>
        </div>`;
  }).join('')}
      </div>
    </div>
  </div>`;
}

/* ---------------- users ---------------- */
function usersView() {
  const us = S.user.role === 'branch_admin' ? DB.users.filter(u => u.branchId === S.user.branchId) : DB.users;
  return `
  <div class="grid g-2">
    <div class="card">
      <div class="card-h"><h3>Uživatelé</h3></div>
      <div class="card-b" style="padding:0">
        <table><thead><tr><th>Jméno</th><th>Role</th><th>Pobočka</th></tr></thead>
        <tbody>${us.map(u => `<tr><td><div style="display:flex;gap:9px;align-items:center"><div class="avatar">${initials(u.name)}</div><div><div style="font-weight:500">${esc(u.name)}</div><div style="color:#64748b;font-size:12px">${esc(u.email)}</div></div></div></td><td>${roleName(u.role)}</td><td>${u.branchId ? esc(branchName(u.branchId)) : '—'}</td></tr>`).join('')}</tbody></table>
      </div>
    </div>
    <div class="card">
      <div class="card-h"><h3>Pobočky</h3></div>
      <div class="card-b">
        ${DB.branches.map(b => `<div class="formula-item"><div class="nm"><b>${esc(b.name)}</b><div class="ct">${DB.users.filter(u => u.branchId === b.id && u.role === 'student').length} studujících · ${DB.users.filter(u => u.branchId === b.id && u.role === 'lecturer').length} lektoři</div></div><span class="badge gray">${DB.questions.filter(q => (DB.files.find(f => f.id === q.fileId) || {}).branchId === b.id).length} otázek</span></div>`).join('')}
      </div>
    </div>
  </div>`;
}

/* ---------------- student views ---------------- */
function myTestsView() {
  const t = DB.tests[0];
  const mine = DB.attempts.filter(a => a.studentId === S.user.id);
  return `
  <div class="card" style="margin-bottom:16px">
    <div class="card-b" style="display:flex;gap:16px;align-items:center">
      <div style="flex:1">
        <div style="font-weight:600;font-size:16px">${esc(t.name)}</div>
        <div style="color:#64748b;font-size:13px;margin-top:4px">${t.randomCount} otázek · ${t.timeLimit} min · kritérium ${t.passScore} %</div>
      </div>
      <button class="btn primary" onclick="startTake('${t.id}','${S.user.id}')">Zahájit test</button>
    </div>
  </div>
  <div class="card">
    <div class="card-h"><h3>Moje pokusy</h3></div>
    <div class="card-b" style="padding:0">
      ${mine.length ? `<table><thead><tr><th>Datum</th><th>Test</th><th style="text-align:right">Výsledek</th></tr></thead><tbody>${mine.map(a => `<tr><td>${dt(a.finishedAt || a.startedAt)}</td><td>${esc((DB.tests.find(x => x.id === a.testId) || {}).name || '')}</td><td style="text-align:right"><span class="badge ${a.status === 'running' ? 'warn' : a.passed ? 'ok' : 'bad'}">${a.status === 'running' ? 'probíhá' : a.score + ' %'}</span></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Zatím jste neabsolvoval žádný test.</div>'}
    </div>
  </div>`;
}
function myResultsView() {
  const mine = DB.attempts.filter(a => a.studentId === S.user.id && a.status === 'done');
  return `<div class="card"><div class="card-h"><h3>Moje výsledky</h3></div><div class="card-b" style="padding:0">
    ${mine.length ? `<table><thead><tr><th>Test</th><th>Datum</th><th style="text-align:right">Výsledek</th><th></th></tr></thead><tbody>${mine.map(a => `<tr><td>${esc((DB.tests.find(x => x.id === a.testId) || {}).name || '')}</td><td style="color:#64748b">${dt(a.finishedAt)}</td><td style="text-align:right"><span class="badge ${a.passed ? 'ok' : 'bad'}">${a.score} %</span></td><td style="text-align:right"><button class="btn sm ghost" onclick="resultDetail('${a.id}')">Detail</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Žádné výsledky.</div>'}
  </div></div>`;
}

/* ---------------- modal ---------------- */
function modal(html) { document.getElementById('modal-root').innerHTML = `<div class="overlay" onclick="if(event.target===this)closeModal()"><div class="modal">${html}</div></div>`; }
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

/* ---------------- boot ---------------- */
load();
// demo: přímé přihlášení přes ?as=u1 (pro náhledy a testování)
(() => {
  const as = new URLSearchParams(location.search).get('as');
  const u = as && DB.users.find(x => x.id === as);
  if (u) { S.user = u; S.view = u.role === 'student' ? 'mytests' : 'dashboard'; }
})();
render();
