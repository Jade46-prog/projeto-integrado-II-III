// =========================================================================
// UTILITÁRIOS E CONSTANTES
// =========================================================================
const $ = id => document.getElementById(id);
const INI = '2026-08-03', FIM = '2026-12-18';
// "Hoje" = data real do computador, limitada ao semestre letivo.
// Para congelar uma data na apresentação, troque por: const HOJE = '2026-10-07';
const _r = new Date(), _hoje = `${_r.getFullYear()}-${String(_r.getMonth() + 1).padStart(2, '0')}-${String(_r.getDate()).padStart(2, '0')}`;
const HOJE = _hoje < INI ? INI : _hoje > FIM ? FIM : _hoje;
const DIAS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const CURSOS = { ADS: 'Análise e Desenvolvimento de Sistemas' };
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const fmt = d => d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '';
const parseData = valor => {
    const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valor);
    if (!partes) return '';
    const iso = `${partes[3]}-${partes[2]}-${partes[1]}`;
    const data = new Date(iso + 'T12:00:00');
    return !isNaN(data) && data.getFullYear() === +partes[3] && data.getMonth() + 1 === +partes[2] && data.getDate() === +partes[1] ? iso : '';
};
const dow = d => new Date(d + 'T12:00:00').getDay();
const addDays = (d, n) => {
    const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n);
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
const monday = d => addDays(d, -((dow(d) + 6) % 7));
const base = n => n.replace(/ (I|II|III)$/, ''); // "Projeto Integrado II" e "III" = mesmo conteúdo base
const SALA = n => `Sala ${n}`;
const LAB = n => `Laboratório ${n}`;
const semBloco = texto => texto.replace(/ - Bloco B/g, '');
const byDate = (a, b) => (a.data + a.h).localeCompare(b.data + b.h);
const periodoAula = a => a.h >= '08:00' && a.h <= '11:50' ? 'matutino' : a.h >= '19:00' && a.h <= '22:50' ? 'noturno' : '';
const noPeriodo = (a, periodo) => !periodo || periodoAula(a) === periodo;
const horarioAula = a => a.fim ? `${a.h}–${a.fim}` : a.h;
// Sem término cadastrado, reserva até o fim do período para evitar sobreposição.
const fimOcupacao = (h, fim) => fim || (h < '12:00' ? '11:50' : '22:50');
const sobrepoe = (a, h, fim) => a.h < fimOcupacao(h, fim) && h < fimOcupacao(a.h, a.fim);
const showErr = (id, m) => { const e = $(id); e.textContent = m; e.classList.remove('hidden'); };

// =========================================================================
// BANCO DE DADOS SIMULADO (baseado nas planilhas reais)
// =========================================================================
const USERS = {
    '999.999.999-99': { name: 'Admin', role: 'admin', roleLabel: 'Administrador', info: 'Administração acadêmica', senha: '123456' },
    '111.111.111-11': { name: 'Anhanguera', role: 'coordenador', roleLabel: 'Coordenador', info: 'Coordenação de ADS', senha: '123456' },
    '222.222.222-22': { name: 'Prof. Nicolas Vogiantzis', role: 'professor', roleLabel: 'Professor', info: '', doc: 'Nicolas Vogiantzis', senha: '123456' },
    '333.333.333-33': { name: 'Prof. Getulio da Silva Santos', role: 'professor', roleLabel: 'Professor', info: 'Docente de ADS', doc: 'Getulio da Silva Santos', senha: '123456' },
    '444.444.444-44': { name: 'Profa. Francisca de Souza', role: 'professor', roleLabel: 'Professor', info: 'Docente de ADS', doc: 'Francisca de Souza', senha: '123456' },
    '555.555.555-55': { name: 'Prof. Luciano Correa', role: 'professor', roleLabel: 'Professor', info: 'Docente de ADS', doc: 'Luciano Correa', senha: '123456' },
};

// Turma -> curso e semestre
const TURMAS = {
    '1651520241A': { c: 'ADS', s: 5 }, '1651520242A': { c: 'ADS', s: 4 }, '1651520251A': { c: 'ADS', s: 3 },
    '1651520252A': { c: 'ADS', s: 2 }, '1654020252A': { c: 'ADS', s: 2 }, '1656320262A': { c: 'ADS', s: 1 },
    '1656320261A': { c: 'ADS', s: 2 }, '1656320252A': { c: 'ADS', s: 3 },
};

// Disciplinas (n=nome, c=curso, d=docente, t=turmas, a=alunos, dia=1 seg...5 sex, h=hora,
// s=sala, l=nº do laboratório, L=datas das aulas práticas no laboratório)
const NV = 'Nicolas Vogiantzis';
const DISC = [
    { n: 'Sistemas Operacionais', c: 'ADS', d: '', t: [], a: 0, h: '' },
    { n: 'Lógica e Matemática Computacional', c: 'ADS', d: '', t: [], a: 0, h: '' },
    { n: 'Modelagem de Dados', c: 'ADS', d: '', t: [], a: 0, h: '' },
    { n: 'Arquiteturas Paralelas e Distribuídas', c: 'ADS', d: NV, t: ['1651520241A'], a: 37, dia: 1, h: '19:00', s: 216, l: 4, L: ['2026-09-21', '2026-10-05', '2026-10-19', '2026-11-16', '2026-11-30', '2026-12-14'] },
    { n: 'Segurança da Informação e de Redes', c: 'ADS', d: NV, t: ['1651520242A', '1651520251A'], a: 29, dia: 1, h: '21:00', s: 216 },
    { n: 'Redes de Computadores', c: 'ADS', d: NV, t: ['1651520252A', '1654020252A'], a: 49, dia: 3, h: '19:00', s: 116, l: 2, L: ['2026-09-23', '2026-10-07', '2026-10-21', '2026-11-04', '2026-11-18', '2026-12-02'] },
    { n: 'Projeto Integrado I', c: 'ADS', d: NV, t: ['1656320262A'], a: 40, dia: 4, h: '19:00', s: 319 },
    { n: 'Projeto Integrado II', c: 'ADS', d: NV, t: ['1656320261A'], a: 49, dia: 4, h: '19:00', s: 319 },
    { n: 'Projeto Integrado III', c: 'ADS', d: NV, t: ['1656320252A'], a: 4, dia: 4, h: '21:00', s: 319 },
    { n: 'Redes de Computadores', c: 'ADS', d: NV, t: ['1651520251A'], a: 17, dia: 5, h: '19:00', s: 401, l: 6, L: ['2026-09-18', '2026-10-02', '2026-10-16', '2026-10-30', '2026-11-13', '2026-11-27'] },
];
const DOCENTES = [...new Set([...DISC.map(x => x.d).filter(Boolean), 'Getulio da Silva Santos', 'Francisca de Souza', 'Luciano Correa'])];

// O cronograma começa vazio; as disciplinas acima são opções para novos cadastros.
let uid = 1;
const AULAS = [], NOTIFS = [];

function cursosProfessor(u) {
    // Contas antigas mantêm ADS e os cursos das aulas e matérias já vinculadas.
    return u.cursos || [...new Set(['ADS', ...DISC.filter(d => d.d === u.doc).map(d => d.c), ...AULAS.filter(a => a.d === u.doc).map(a => a.c)])].filter(c => Object.hasOwn(CURSOS, c));
}
const docentesDoCurso = curso => Object.values(USERS).filter(u => u.role === 'professor' && cursosProfessor(u).includes(curso)).map(u => u.doc);

// Recupera séries antigas pela sequência de cadastro e pelo intervalo semanal.
function identificarSeries(aulas) {
    const assinatura = a => JSON.stringify([a.c, a.n, a.d, [...a.t].sort(), a.h, a.orig]);
    let anterior = null;
    [...aulas].sort((a, b) => a.id - b.id).forEach(a => {
        if (!a.serieId) {
            const repete = anterior && a.id === anterior.id + 1 && a.data === addDays(anterior.data, 7) && assinatura(a) === assinatura(anterior);
            a.serieId = repete ? anterior.serieId : `serie-${a.id}`;
        }
        anterior = a;
    });
}

// =========================================================================
// PERSISTÊNCIA (localStorage) + SINCRONIA ENTRE ABAS
// Os dados sobrevivem ao F5 e, com duas abas abertas (ex.: professor e aluno),
// uma alteração aparece na outra em tempo real.
// =========================================================================
const KEY = 'sgh-demo-v3';
// Descarta o cronograma anterior; novos cadastros permanecem salvos na versão atual.
try { localStorage.removeItem('sgh-demo-v2'); } catch (e) { }
function saveState() { try { localStorage.setItem(KEY, JSON.stringify({ AULAS, NOTIFS, uid, CURSOS, TURMAS, DISC, USERS, DOCENTES })); return true; } catch (e) { return false; } }
function loadState() {
    try {
        const s = JSON.parse(localStorage.getItem(KEY));
        if (!s) return false;
        if (s.CURSOS) Object.assign(CURSOS, s.CURSOS);
        if (s.TURMAS) Object.assign(TURMAS, s.TURMAS);
        if (s.DISC) DISC.splice(0, DISC.length, ...s.DISC);
        if (s.USERS) Object.assign(USERS, s.USERS);
        Object.values(USERS).forEach(u => {
            if (u.role === 'professor' && u.info === 'Arquitetura e Redes') u.info = '';
        });
        if (s.DOCENTES) DOCENTES.splice(0, DOCENTES.length, ...s.DOCENTES);
        // Mantém apenas os cursos, docentes e turmas disponíveis nesta versão.
        const aulas = s.AULAS.filter(a => CURSOS[a.c] && DOCENTES.includes(a.d) && a.t.every(t => TURMAS[t]?.c === a.c))
            .map(a => ({ ...a, sala: semBloco(a.sala), orig: semBloco(a.orig) }));
        const notifs = s.NOTIFS.filter(n => n.t.length && n.t.every(t => TURMAS[t]))
            .map(n => ({ ...n, txt: semBloco(n.txt) }));
        identificarSeries(aulas);
        AULAS.splice(0, AULAS.length, ...aulas);
        NOTIFS.splice(0, NOTIFS.length, ...notifs);
        uid = s.uid;
        if (JSON.stringify(aulas) !== JSON.stringify(s.AULAS) || JSON.stringify(notifs) !== JSON.stringify(s.NOTIFS)) saveState();
        return true;
    } catch (e) { return false; }
}
loadState();
window.addEventListener('storage', e => { if (e.key === KEY && loadState()) updateAll(); });
function resetDemo() {
    if (!confirm('Limpar todas as aulas e notificações da demonstração?')) return;
    AULAS.length = 0; NOTIFS.length = 0; uid = 1; saveState();
    location.reload();
}

// Mensagem rápida no rodapé (feedback visual das ações)
function toast(msg) {
    let t = $('toast');
    if (!t) {
        t = document.createElement('div'); t.id = 'toast';
        t.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-medium px-4 py-3 rounded-lg shadow-lg z-[60] pointer-events-none transition-opacity duration-300';
        document.body.appendChild(t);
    }
    t.textContent = msg; t.style.opacity = 1;
    clearTimeout(t._h); t._h = setTimeout(() => t.style.opacity = 0, 3500);
}
// Salva, redesenha todas as telas e (opcional) avisa o usuário
function commit(msg) { saveState(); updateAll(); if (msg) toast(msg); }

let me = null, cur = null, inProf = false, profView = 'week', cv = 'sem';
const F = { c: 'ADS', s: '', d: '', m: '10', p: '', doc: '' };
const alunoFiltro = { c: '', s: '', p: '' };
let coordEditId = null;

// =========================================================================
// SALAS: andar -> sala (2 passos) e disponibilidade
// =========================================================================
const roomsOf = f => f === 'lab' ? range(1, 6).map(LAB) : range(+f * 100 + 1, +f * 100 + 19).map(SALA);
const floorOf = s => s.startsWith('Lab') ? 'lab' : s.match(/\d/)[0];
const ocupada = (s, d, h, n, id, fim) => AULAS.some(a => a.id !== id && a.st !== 'CANCELADA' && a.data === d && sobrepoe(a, h, fim) && a.sala === s && base(a.n) !== base(n));
const docOcup = (doc, d, h, n, id = 0, fim) => AULAS.some(a => a.id !== id && a.st !== 'CANCELADA' && a.data === d && sobrepoe(a, h, fim) && a.d === doc && base(a.n) !== base(n));

function updateRoomOptions(p) { // p = 'c' (coordenador) ou 'p' (professor)
    const f = $(p + '-floor').value, sel = $(p + '-room');
    if (!f) { sel.disabled = true; sel.innerHTML = '<option value="">Selecione um andar primeiro...</option>'; return; }
    const ctx = p === 'c'
        ? { d: parseData($('c-data').value), h: $('c-hora').value, fim: $('c-fim').value, n: $('c-disc').value, id: coordEditId || 0 }
        : { d: cur.data, h: cur.h, fim: cur.fim, n: cur.n, id: cur.id };
    const prev = sel.value;
    sel.disabled = false;
    sel.innerHTML = roomsOf(f).map(r => {
        const oc = ocupada(r, ctx.d, ctx.h, ctx.n, ctx.id, ctx.fim);
        return `<option value="${r}" ${oc ? 'disabled' : ''}>${oc ? '🔴' : '🟢'} ${r}${oc ? ' (OCUPADA)' : ''}</option>`;
    }).join('');
    if (prev && [...sel.options].some(o => o.value === prev && !o.disabled)) sel.value = prev;
}

// =========================================================================
// INICIALIZAÇÃO
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    refreshLoginNames();
    initAdmin();
    const floors = '<option value="">Selecione o andar...</option>' + [1, 2, 3, 4].map(f => `<option value="${f}">${f}º Andar (${f}01 a ${f}19)</option>`).join('')
        + '<option value="lab">Laboratórios de Informática (1º Andar)</option>';
    ['c-floor', 'p-floor'].forEach(i => $(i).innerHTML = floors);
    updateRoomOptions('c');

    $('cpf').addEventListener('input', e => {
        let v = e.target.value.replace(/\D/g, '').slice(0, 11);
        v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = v;
    });
    $('toggle-password').addEventListener('click', () => { const p = $('password'); p.type = p.type === 'password' ? 'text' : 'password'; });
    $('login-form').addEventListener('submit', e => {
        e.preventDefault();
        const u = USERS[$('cpf').value], ok = u && $('password').value === u.senha;
        $('login-error').classList.toggle('hidden', !!ok);
        if (ok) login(u);
    });
    // Clicar em um CPF de teste preenche CPF e senha (agiliza a apresentação)
    document.querySelectorAll('[data-cpf]').forEach(li => li.addEventListener('click', () => {
        $('cpf').value = li.dataset.cpf; $('password').value = '123456';
    }));
    $('btn-logout').addEventListener('click', logout);
    $('btn-login-aluno').addEventListener('click', () => {
        alunoFiltro.c = ''; alunoFiltro.s = '';
        alunoFiltro.p = ''; $('aluno-periodo').value = '';
        $('aluno-curso').innerHTML = '<option value="">Selecione o curso</option>' + Object.entries(CURSOS).map(([c, nome]) => `<option value="${c}">${nome}</option>`).join('');
        atualizarSemestresAluno();
        $('login-form').reset();
        $('login-error').classList.add('hidden');
        login({ name: 'Aluno', role: 'aluno', roleLabel: 'Aluno', info: 'Consulta de horários' });
    });
    $('aluno-curso').addEventListener('change', () => {
        alunoFiltro.c = $('aluno-curso').value;
        alunoFiltro.s = '';
        atualizarSemestresAluno();
        filtrarAluno();
    });
    $('aluno-semestre').addEventListener('change', () => {
        alunoFiltro.s = $('aluno-semestre').value;
        filtrarAluno();
    });
    $('aluno-periodo').addEventListener('change', () => {
        alunoFiltro.p = $('aluno-periodo').value;
        filtrarAluno();
    });
    $('btn-switch-role').addEventListener('click', () => {
        inProf = !inProf;
        showScreen(inProf ? 'prof-screen' : 'coord-screen');
        $('user-role-badge').textContent = inProf ? 'Visão: Professor' : 'Coordenador';
        $('btn-switch-role').querySelector('span').textContent = inProf ? 'Alternar p/ Visão Coordenador' : 'Alternar p/ Visão Professor';
    });
    $('form-edit-aula').addEventListener('submit', saveProf);
    $('form-coord').addEventListener('submit', saveCoord);
    toggleProfView('week');
    setView('sem');
    onFilter();
});

// =========================================================================
// NAVEGAÇÃO
// =========================================================================
function login(u) {
    me = u; inProf = false;
    $('prof-curso').value = '';
    if (u.role === 'admin') showAdminForm(null);
    refreshCourseFilters();
    $('login-screen').classList.add('hidden');
    $('global-header').classList.remove('hidden');
    $('user-name').textContent = u.name;
    $('user-role-badge').textContent = u.roleLabel;
    $('btn-switch-role').classList.toggle('hidden', !u.canSwitchToProf);
    $('btn-switch-role').querySelector('span').textContent = 'Alternar p/ Visão Professor';
    $('bell-wrap').classList.toggle('hidden', u.role !== 'aluno');
    updateAll();
    showScreen({ admin: 'admin-screen', coordenador: 'coord-screen', professor: 'prof-screen', aluno: 'aluno-screen' }[u.role]);
}

function logout() { // mantém os dados em memória, para o aluno ver o que o professor alterou
    closeAdminModal();
    $('admin-screen').classList.add('hidden');
    me = null;
    ['coord-screen', 'prof-screen', 'aluno-screen', 'global-header', 'notif-panel', 'modal-coord', 'modal-prof', 'modal-delete-coord'].forEach(i => $(i).classList.add('hidden'));
    $('login-screen').classList.remove('hidden');
    $('login-form').reset();
}

function showScreen(id) {
    ['admin-screen', 'coord-screen', 'prof-screen', 'aluno-screen'].forEach(s => $(s).classList.add('hidden'));
    $(id).classList.remove('hidden');
    if (id === 'coord-screen') requestAnimationFrame(scrollCoordAtual);
}

function refreshLoginNames() {
    document.querySelectorAll('[data-cpf]').forEach(li => {
        const usuario = USERS[li.dataset.cpf];
        if (!usuario) return;
        const cpf = document.createElement('span');
        cpf.className = 'font-bold text-slate-800';
        cpf.textContent = li.dataset.cpf;
        const nome = usuario.name.replace(/^Profa?\.\s*/, '');
        li.replaceChildren(cpf, document.createTextNode(` ➔ ${nome}${usuario.role === 'coordenador' ? ' (Coordenador)' : ''}`));
    });
}

function updateAll() { refreshLoginNames(); refreshCourseFilters(); renderAdmin(); renderCoord(); renderProf(); renderAluno(); renderBell(); }

// =========================================================================
// COMPONENTES VISUAIS COMPARTILHADOS
// =========================================================================
const alt = a => a.st === 'CANCELADA' || a.sala !== a.orig;
const bdg = a => {
    const [t, c] = a.st === 'CANCELADA' ? ['CANCELADA', 'bg-red-50 text-red-700 border-red-200']
        : a.sala !== a.orig ? ['LOCAL ALTERADO', 'bg-amber-50 text-amber-700 border-amber-200']
        : ['CONFIRMADA', 'bg-emerald-50 text-emerald-700 border-emerald-200'];
    return `<span class="${c} border text-[10px] font-bold px-2 py-0.5 rounded">${t}</span>`;
};
const salaHtml = a => a.sala !== a.orig
    ? `<span class="line-through text-slate-400 mr-1">${a.orig}</span><span class="text-amber-700 font-bold">${a.sala}</span>`
    : `<span class="font-bold text-slate-900">${a.sala}</span>`;

const card = (a, prof) => `<div class="bg-white p-5 rounded-xl border shadow-sm relative ${alt(a) ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'}">
    ${alt(a) ? '<div class="absolute -top-3 -right-3 bg-red-600 text-white w-7 h-7 rounded-full flex items-center justify-center font-black text-sm shadow-md border-2 border-white" title="Aula alterada">!</div>' : ''}
    <div class="flex justify-between items-start mb-2"><span class="text-lg font-bold text-slate-900">${horarioAula(a)}</span>${bdg(a)}</div>
    <h4 class="font-bold ${prof ? 'text-brand-700' : 'text-slate-900'}">${a.n}</h4>
    <p class="text-xs text-slate-500 mb-2">Docente: ${a.d}</p>
    <div class="text-xs space-y-1 text-slate-600 ${prof ? 'mb-3' : ''}"><div>📍 Local: ${salaHtml(a)}</div></div>
    ${prof ? `<button onclick="openProfModal(${a.id})" class="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium py-2 rounded-lg border border-slate-300 text-xs transition">✏️ Alterar Sala/Lab</button>` : ''}
</div>`;

const weekDays = () => range(0, 4).map(i => addDays(monday(HOJE), i));
const dayBlock = (d, list, prof) => `<div>
    <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">🗓️ ${DIAS[dow(d)]}, ${fmt(d)}</h3>
    ${list.length ? `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${list.sort(byDate).map(a => card(a, prof)).join('')}</div>`
        : '<p class="text-xs text-slate-400 italic">Sem aulas neste dia.</p>'}</div>`;

// =========================================================================
// COORDENADOR
// =========================================================================
const turmasOf = (c, s) => Object.keys(TURMAS).filter(k => TURMAS[k].c === c && (!s || TURMAS[k].s == s));

function onFilter() {
    const dataFiltro = $('f-data').value;
    const invalida = $('f-data').value && (!dataFiltro || dataFiltro < INI || dataFiltro > FIM);
    $('f-data').setCustomValidity(invalida ? `Informe uma data válida entre ${fmt(INI)} e ${fmt(FIM)}, no formato DD/MM/AAAA.` : '');
    if (invalida) { $('f-data').reportValidity(); return; }
    $('f-data-label').title = dataFiltro ? `Data selecionada: ${fmt(dataFiltro)}` : 'Escolher data para filtrar o cronograma';
    $('f-data-label').classList.toggle('ring-2', !!dataFiltro);
    $('f-data-label').classList.toggle('ring-brand-600', !!dataFiltro);
    F.doc = $('f-professor').value;
    F.p = $('f-periodo').value;
    F.c = $('f-curso').value; F.s = $('f-sem').value; F.d = dataFiltro; F.m = $('f-mes').value;
    refreshCourseFilters();
    renderCoord(true);
}

function setView(v) {
    cv = v;
    const on = 'bg-slate-800 text-white text-xs px-3 py-1.5 rounded font-bold', off = 'bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded font-bold hover:bg-slate-300';
    $('v-sem').className = v === 'sem' ? on : off;
    $('v-mes').className = v === 'mes' ? on : off;
    $('f-mes').classList.toggle('hidden', v !== 'mes');
    renderCoord(true);
}

const chip = a => `<div class="rounded border p-2 mb-1 text-[11px] leading-snug ${!a.pub ? 'bg-white border-dashed border-slate-400' : a.st === 'CANCELADA' ? 'bg-red-50 border-red-200 line-through' : alt(a) ? 'bg-amber-50 border-amber-300' : 'bg-blue-50 border-blue-100'}">
    <div class="mb-2 font-semibold text-slate-600">${DIAS[dow(a.data)]}</div>
    ${!a.pub ? '<div class="mb-1 font-bold text-slate-600">RASCUNHO</div>' : ''}
    <div class="font-bold text-brand-700">${horarioAula(a)} · ${a.n}</div><div>${a.d}</div>
    <div class="font-bold text-slate-800">📍 ${a.sala}</div>
    <div class="mt-2"><button type="button" onclick="editCoord(${a.id})" class="text-brand-700 font-semibold hover:underline">Editar</button></div></div>`;

function scrollCoordAtual() {
    const container = $('coord-scroll');
    if ($('coord-screen').classList.contains('hidden')) return;
    const semana = monday(F.d || HOJE);
    const row = container.querySelector(`[data-semana="${semana}"]`) || container.querySelector('[data-semana]');
    if (!row) { container.scrollTop = 0; return; }
    const header = container.querySelector('thead');
    container.scrollTop += row.getBoundingClientRect().top - container.getBoundingClientRect().top - header.getBoundingClientRect().height - container.clientTop;
}

function renderCoord(reposicionar = false) {
    const scrollAnterior = $('coord-scroll').scrollTop;
    renderPubBadge();
    const all = []; for (let d = INI; d <= FIM; d = addDays(d, 7)) all.push(d);
    let ws = all;
    if (F.d) ws = all.filter(w => w === monday(F.d));
    else if (cv === 'mes') ws = all.filter(w => range(0, 4).some(i => addDays(w, i).slice(5, 7) === F.m));
    const ok = a => a.c === F.c && (!F.doc || a.d === F.doc) && noPeriodo(a, F.p) && a.t.some(x => !F.s || TURMAS[x].s == F.s);
    $('coord-body').innerHTML = ws.length ? ws.map(w => `<tr data-semana="${w}">
        <td class="p-3 font-bold bg-slate-50 border-r border-slate-200 text-slate-600 align-top whitespace-nowrap">Semana ${all.indexOf(w) + 1}<div class="font-normal">${fmt(w)} – ${fmt(addDays(w, 4))}</div></td>
        ${range(0, 4).map(i => {
            const d = addDays(w, i), fora = cv === 'mes' && !F.d && d.slice(5, 7) !== F.m;
            return `<td class="p-2 border-r border-slate-200 align-top min-w-[170px] ${fora ? 'bg-slate-100' : d === F.d ? 'bg-blue-100' : d === HOJE ? 'bg-yellow-50' : ''}">${fora ? '' :
                `<div class="text-[10px] font-bold text-slate-400 mb-1">${fmt(d)}</div>${AULAS.filter(a => a.data === d && ok(a)).sort(byDate).map(chip).join('')}
                <button onclick="openCoordModal('${d}')" class="text-brand-600 text-[11px] font-medium hover:underline">➕ Adicionar aula</button>`}</td>`;
        }).join('')}</tr>`).join('')
        : '<tr><td colspan="6" class="p-6 text-center text-slate-400">Nenhuma semana do semestre para este filtro.</td></tr>';
    $('coord-scroll').scrollTop = scrollAnterior;
    if (reposicionar) requestAnimationFrame(scrollCoordAtual);
}

function renderPubBadge() {
    const n = AULAS.filter(a => !a.pub).length, b = $('pub-badge');
    b.className = (n ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-emerald-100 text-emerald-800 border-emerald-200') + ' text-xs font-bold px-2.5 py-0.5 rounded border';
    b.textContent = !AULAS.length ? '2026/2 - SEM AULAS' : n ? `2026/2 - RASCUNHO (${n} aula${n > 1 ? 's' : ''} pendente${n > 1 ? 's' : ''})` : '2026/2 - PUBLICADO';
}

// Publica os rascunhos: passam a aparecer para professores e alunos e geram 1 aviso por disciplina/turma
function publicar() {
    if (!canCoordinate(F.c)) return;
    const drafts = AULAS.filter(a => !a.pub && a.c === F.c).sort(byDate);
    if (!drafts.length) return toast('Não há aulas pendentes para publicar.');
    const grupos = {};
    drafts.forEach(a => { (grupos[[a.n, a.t.join(), a.h, a.d].join('|')] ||= []).push(a); a.pub = true; });
    Object.values(grupos).forEach(g => {
        const a = g[0];
        NOTIFS.push({ t: a.t, lida: false, txt: `<b>Nova aula: ${a.n}</b> às ${horarioAula(a)} em ${a.sala} — ` + (g.length > 1 ? `${g.length} aulas a partir de ${DIAS[dow(a.data)]}, ${fmt(a.data)}.` : `${DIAS[dow(a.data)]}, ${fmt(a.data)}.`) });
    });
    commit(`Cronograma publicado! ${Object.keys(grupos).length} aviso(s) enviado(s) aos alunos.`);
}

function closeDeleteCoord() { $('modal-delete-coord').classList.add('hidden'); }

function openDeleteCoord() {
    if (me?.role !== 'coordenador') return;
    const series = new Map();
    AULAS.slice().sort(byDate).forEach(a => {
        if (!canCoordinate(a.c)) return;
        const key = a.serieId || `aula-${a.id}`;
        if (!series.has(key)) series.set(key, []);
        series.get(key).push(a);
    });
    const select = $('delete-coord-select');
    select.replaceChildren();
    series.forEach(aulas => {
        const a = aulas[0], option = document.createElement('option');
        option.value = a.id;
        option.textContent = `${a.n} · ${horarioAula(a)} · ${fmt(a.data)} a ${fmt(aulas[aulas.length - 1].data)} · ${aulas.length} aula(s) · Série ${a.id}`;
        select.appendChild(option);
    });
    if (!series.size) {
        const option = document.createElement('option');
        option.textContent = 'Nenhuma aula cadastrada';
        select.appendChild(option);
    }
    select.disabled = !series.size;
    $('delete-coord-confirm').disabled = !series.size;
    $('modal-delete-coord').classList.remove('hidden');
    select.focus();
}

function deleteCoord(id) {
    if (me?.role !== 'coordenador') return;
    const i = AULAS.findIndex(a => a.id === id);
    if (i < 0) return openDeleteCoord();
    const a = AULAS[i];
    if (!canCoordinate(a.c)) return;
    const serie = AULAS.filter(x => a.serieId ? x.serieId === a.serieId : x.id === id);
    if (!confirm(`Excluir ${a.n} e todas as suas repetições? Serão removidas ${serie.length} aula(s) do cronograma.`)) return;
    const ids = new Set(serie.map(x => x.id));
    for (let j = AULAS.length - 1; j >= 0; j--) if (ids.has(AULAS[j].id)) AULAS.splice(j, 1);
    const publicadas = serie.filter(x => x.pub);
    if (publicadas.length) NOTIFS.push({ t: [...new Set(publicadas.flatMap(x => x.t))], lida: false, txt: `<b>${a.n}</b>: ${publicadas.length} aula(s) da série excluída(s) do cronograma, incluindo suas repetições.` });
    closeDeleteCoord();
    commit(`${serie.length} aula(s) excluída(s).`);
}

function editCoord(id) {
    if (me?.role !== 'coordenador') return;
    const a = AULAS.find(a => a.id === id);
    if (!a) return;
    if (!canCoordinate(a.c)) return;
    openCoordModal(a.data);
    coordEditId = id;
    $('c-title').textContent = 'Editar aula';
    $('c-disc').value = a.n;
    $('c-doc').value = a.d;
    $('c-hora').value = a.h;
    $('c-fim').value = a.fim || '';
    document.querySelectorAll('#c-turmas input').forEach(i => i.checked = a.t.includes(i.value));
    $('c-rep').disabled = false;
    $('c-floor').value = floorOf(a.sala);
    updateRoomOptions('c');
    $('c-room').value = a.sala;
}

function openCoordModal(d) {
    if (!canCoordinate(F.c)) return;
    if (!DISC.some(x => x.c === F.c)) return toast('Peça ao Admin para cadastrar as matérias deste curso.');
    $('c-calendar').classList.add('hidden');
    coordEditId = null;
    $('c-rep').disabled = false;
    $('c-title').textContent = 'Registro de Aula — ' + CURSOS[F.c];
    $('c-disc').innerHTML = [...new Set(DISC.filter(x => x.c === F.c).map(x => x.n))].map(n => `<option>${n}</option>`).join('');
    $('c-doc').innerHTML = '<option value="">Selecione o docente</option>' + docentesDoCurso(F.c).map(x => `<option>${x}</option>`).join('');
    $('c-turmas').innerHTML = turmasOf(F.c, '').map(k => `<label class="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" value="${k}"> ${k} <span class="text-slate-400">(${TURMAS[k].s}º sem.)</span></label>`).join('');
    $('c-data').value = fmt(d); $('c-floor').value = ''; $('c-rep').checked = false;
    $('c-fim').value = '';
    $('c-err').classList.add('hidden');
    fillFromDisc();
    $('modal-coord').classList.remove('hidden');
}
function closeCoordModal() { $('modal-coord').classList.add('hidden'); }

function syncCoordDate() {
    $('c-calendar').value = parseData($('c-data').value);
}

function openCoordCalendar() {
    syncCoordDate();
    const calendar = $('c-calendar');
    try {
        if (typeof calendar.showPicker === 'function') calendar.showPicker();
        else $('c-data').focus();
    } catch (e) { $('c-data').focus(); }
}

function fillFromDisc() { // ao escolher a disciplina, sugere docente, turmas e horário
    const x = DISC.find(x => x.c === F.c && x.n === $('c-disc').value);
    if (!x) return;
    $('c-doc').value = x.d; $('c-hora').value = x.h;
    document.querySelectorAll('#c-turmas input').forEach(i => i.checked = x.t.includes(i.value));
    updateRoomOptions('c');
}

function saveCoord(e) {
    e.preventDefault();
    if (!canCoordinate(F.c)) return;
    const editing = coordEditId !== null;
    const existing = AULAS.find(a => a.id === coordEditId);
    if (editing && !existing) return showErr('c-err', 'Esta aula foi excluída. Feche o formulário e atualize o cronograma.');
    const n = $('c-disc').value, doc = $('c-doc').value, h = $('c-hora').value, data = parseData($('c-data').value), local = $('c-room').value;
    const fim = $('c-fim').value;
    const t = [...document.querySelectorAll('#c-turmas input:checked')].map(i => i.value);
    if (!data) return showErr('c-err', 'Informe uma data válida no formato DD/MM/AAAA.');
    if (!docentesDoCurso(F.c).includes(doc)) return showErr('c-err', 'Selecione um professor vinculado a este curso.');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(fim) || fim <= h || !periodoAula({ h: fim }) || periodoAula({ h: fim }) !== periodoAula({ h })) return showErr('c-err', 'Informe um término posterior ao início e dentro do mesmo período (até 11h50 ou 22h50).');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(h) || !periodoAula({ h })) return showErr('c-err', 'Informe um horário entre 08h00 e 11h50 (matutino) ou entre 19h00 e 22h50 (noturno).');
    if (!t.length || !data || !local) return showErr('c-err', 'Marque ao menos uma turma, informe a data e escolha o andar e a sala.');
    if (data < INI || data > FIM || dow(data) < 1 || dow(data) > 5) return showErr('c-err', `Escolha um dia útil entre ${fmt(INI)} e ${fmt(FIM)}.`);
    const ds = [];
    for (let d = data; d <= ($('c-rep').checked ? FIM : data); d = addDays(d, 7)) ds.push(d);
    // Preserva as ocorrências já cadastradas na série e cria apenas as semanas faltantes.
    const serieId = editing ? existing.serieId || `serie-${existing.id}` : `serie-${uid}`;
    const novasDatas = ds.filter(d => d !== data && !AULAS.some(a => a.id !== coordEditId && a.serieId === serieId && a.data === d));
    const datasValidar = editing ? [data, ...novasDatas] : ds;
    for (const d of datasValidar) {
        if (ocupada(local, d, h, n, coordEditId || 0, fim)) return showErr('c-err', `${local} já está ocupada em ${fmt(d)} neste intervalo. Escolha outra sala.`);
        if (docOcup(doc, d, h, n, coordEditId || 0, fim)) return showErr('c-err', `${doc} já tem outra aula em ${fmt(d)} neste intervalo.`);
    }
    const cat = DISC.find(x => x.c === F.c && x.n === n);
    if (!cat || t.some(turma => TURMAS[turma]?.c !== F.c) || (existing && existing.c !== F.c)) return showErr('c-err', 'Selecione uma matéria e turmas deste curso.');
    if (editing) {
        const old = { ...existing, t: [...existing.t] };
        Object.assign(existing, { serieId, n, d: doc, t, a: cat.a, data, h, fim, sala: local });
        novasDatas.forEach(d => AULAS.push({ id: uid++, serieId, n, c: existing.c, d: doc, t: [...t], a: cat.a, data: d, h, fim, sala: local, orig: local, st: 'OK', pub: false }));
        if (existing.pub) NOTIFS.push({ t: [...new Set([...old.t, ...t])], lida: false, txt: `<b>${old.n}</b> (${fmt(old.data)} às ${old.h}): aula atualizada para <b>${n}</b>, ${fmt(data)} às ${h}, em ${local}.` });
        closeCoordModal();
        commit(novasDatas.length ? `Aula atualizada. ${novasDatas.length} repetição(ões) criada(s) como rascunho. Clique em PUBLICAR para avisar as turmas.` : 'Aula atualizada.');
        return;
    }
    ds.forEach(d => AULAS.push({ id: uid++, serieId, n, c: F.c, d: doc, t, a: cat.a, data: d, h, fim, sala: local, orig: local, st: 'OK', pub: false }));
    closeCoordModal();
    commit(`${ds.length} aula(s) adicionada(s) como rascunho. Clique em PUBLICAR para avisar as turmas.`);
}

// =========================================================================
// PROFESSOR
// =========================================================================
function toggleProfView(v) {
    profView = v;
    const on = 'px-3 py-1.5 rounded-lg bg-brand-600 text-white font-semibold text-xs shadow-sm', off = 'px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-xs';
    $('btn-prof-week').className = v === 'week' ? on : off;
    $('btn-prof-sem').className = v === 'sem' ? on : off;
    renderProf();
}

function renderProf() {
    if (!me || !me.doc) return;
    const cursos = cursosProfessor(me).filter(c => Object.hasOwn(CURSOS, c));
    const select = $('prof-curso'), anterior = select.value;
    select.replaceChildren(new Option('Todos os meus cursos', ''));
    cursos.forEach(c => select.add(new Option(CURSOS[c], c)));
    if (cursos.includes(anterior)) select.value = anterior;
    const curso = select.value;
    const w = monday(HOJE), mine = AULAS.filter(a => a.d === me.doc && a.pub && cursos.includes(a.c) && (!curso || a.c === curso)).sort(byDate);
    $('prof-doc').textContent = 'Docente: ' + me.doc;
    $('btn-prof-week').textContent = `Semana Atual (${fmt(w)} - ${fmt(addDays(w, 4))})`;
    $('prof-content').innerHTML = profView === 'week'
        ? weekDays().map(d => dayBlock(d, mine.filter(a => a.data === d), true)).join('')
        : `<div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto"><table class="w-full text-xs text-left">
            <thead class="bg-slate-50 border-b text-slate-700 font-semibold"><tr><th class="p-3">Data</th><th class="p-3">Hora</th><th class="p-3">Disciplina</th><th class="p-3">Turma(s)</th><th class="p-3">Local</th><th class="p-3">Status</th><th class="p-3"></th></tr></thead>
            <tbody class="divide-y divide-slate-100">${mine.map(a => `<tr class="${a.data >= w && a.data <= addDays(w, 4) ? 'bg-blue-50/60' : ''}">
                <td class="p-3 whitespace-nowrap">${DIAS[dow(a.data)].slice(0, 3)} ${fmt(a.data)}</td><td class="p-3">${horarioAula(a)}</td><td class="p-3 font-semibold">${a.n}</td>
                <td class="p-3">${a.t.join(', ')}</td><td class="p-3">${salaHtml(a)}</td><td class="p-3">${bdg(a)}</td>
                <td class="p-3"><button onclick="openProfModal(${a.id})" class="text-brand-600 hover:underline font-medium">✏️ Alterar</button></td></tr>`).join('')}</tbody></table></div>`;
}

function openProfModal(id) {
    cur = AULAS.find(a => a.id === id);
    $('p-disc').value = cur.n;
    $('p-info').textContent = `${DIAS[dow(cur.data)]}, ${fmt(cur.data)} às ${cur.h} · local original: ${cur.orig}`;
    $('p-floor').value = floorOf(cur.sala);
    updateRoomOptions('p');
    $('p-room').value = cur.sala;
    document.querySelector(`input[name="p-status"][value="${cur.st}"]`).checked = true;
    $('p-err').classList.add('hidden');
    $('modal-prof').classList.remove('hidden');
}
function closeProfModal() { $('modal-prof').classList.add('hidden'); }

function saveProf(e) {
    e.preventDefault();
    const local = $('p-room').value, canc = document.querySelector('input[name="p-status"]:checked').value === 'CANCELADA';
    if (!canc && !local) return showErr('p-err', 'Escolha o andar e uma sala ou laboratório livre.');
    const prev = cur.sala, estavaCanc = cur.st === 'CANCELADA';
    if (!canc) cur.sala = local;
    cur.st = canc ? 'CANCELADA' : 'OK';
    const msg = canc && !estavaCanc ? 'aula CANCELADA'
        : !canc && local !== prev ? `local alterado de ${prev} para ${local}` : '';
    if (msg) NOTIFS.push({ t: cur.t, lida: false, txt: `<b>${cur.n}</b> (${DIAS[dow(cur.data)]}, ${fmt(cur.data)} às ${cur.h}): ${msg}.` });
    closeProfModal();
    commit(msg ? 'Alteração salva! Os alunos da turma foram notificados.' : 'Nenhuma alteração feita.');
}

// =========================================================================
// ALUNO
// =========================================================================
function atualizarSemestresAluno() {
    const semestres = [...new Set(Object.values(TURMAS).filter(t => t.c === alunoFiltro.c).map(t => t.s))].sort((a, b) => a - b);
    $('aluno-semestre').innerHTML = '<option value="">Selecione o semestre</option>' + semestres.map(s => `<option value="${s}">${s}º Semestre</option>`).join('');
    $('aluno-semestre').disabled = !alunoFiltro.c;
}

function turmasAluno() {
    return Object.keys(TURMAS).filter(t => TURMAS[t].c === alunoFiltro.c && String(TURMAS[t].s) === alunoFiltro.s);
}

function filtrarAluno() {
    $('notif-panel').classList.add('hidden');
    renderAluno();
    renderBell();
}

function renderAluno() {
    if (!me || me.role !== 'aluno') return;
    const turmas = turmasAluno();
    const w = monday(HOJE), mine = AULAS.filter(a => a.c === alunoFiltro.c && noPeriodo(a, alunoFiltro.p) && a.t.some(t => turmas.includes(t)) && a.pub).sort(byDate);
    $('aluno-turma').textContent = alunoFiltro.c && alunoFiltro.s ? `${CURSOS[alunoFiltro.c]} · ${alunoFiltro.s}º semestre` : 'Selecione o curso e o semestre para consultar as aulas.';
    $('aluno-week').textContent = `Semana de ${fmt(w)} a ${fmt(addDays(w, 4))}`;
    if (!alunoFiltro.c || !alunoFiltro.s) {
        $('aluno-content').innerHTML = '<p class="p-6 bg-white rounded-xl border border-slate-200 text-sm text-slate-500 text-center">Escolha um curso e um semestre nos filtros acima.</p>';
        return;
    }
    $('aluno-content').innerHTML = weekDays().map(d => dayBlock(d, mine.filter(a => a.data === d), false)).join('');
}

function renderBell() {
    if (!me || me.role !== 'aluno') return;
    const turmas = turmasAluno();
    const mine = NOTIFS.filter(n => n.t.some(t => turmas.includes(t))), novas = mine.filter(n => !n.lida).length;
    $('bell-count').textContent = novas;
    $('bell-count').classList.toggle('hidden', !novas);
    $('notif-list').innerHTML = mine.length
        ? mine.slice().reverse().map(n => `<li class="p-3 border-b border-slate-100 text-xs ${n.lida ? '' : 'bg-amber-50'}">${n.txt}</li>`).join('')
        : '<li class="p-4 text-xs text-slate-400 text-center">Nenhuma notificação por enquanto.</li>';
}

function toggleBell() {
    const p = $('notif-panel');
    p.classList.toggle('hidden');
    if (!p.classList.contains('hidden')) {
        renderBell();                       // mostra as novas em destaque...
        const turmas = turmasAluno();
        NOTIFS.filter(n => n.t.some(t => turmas.includes(t))).forEach(n => n.lida = true);
        saveState();
        $('bell-count').classList.add('hidden');
    }
}
