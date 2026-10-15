function dadosParaBackup() {
    return { AULAS, NOTIFS, uid, CURSOS, TURMAS, DISC, USERS, DOCENTES };
}

function exportarDados() {
    if (me?.role !== 'admin') return;
    const backup = { formato: 'projeto-integrado', versao: 1, exportadoEm: new Date().toISOString(), dados: dadosParaBackup() };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url;
    link.download = `backup-projeto-integrado-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    adminFeedback('Download do backup iniciado. Guarde o arquivo em local privado.');
}

function validarBackup(backup) {
    const falhar = () => { throw new Error('Arquivo de backup inválido ou incompatível.'); };
    const objeto = v => v && typeof v === 'object' && !Array.isArray(v);
    const texto = v => typeof v === 'string' && !/[<>]/.test(v);
    const textos = v => Array.isArray(v) && v.every(texto);
    const seguro = v => {
        if (!v || typeof v !== 'object') return;
        Object.entries(v).forEach(([k, val]) => {
            if (['__proto__', 'constructor', 'prototype'].includes(k)) falhar();
            seguro(val);
        });
    };
    seguro(backup);
    if (backup?.formato !== 'projeto-integrado' || backup.versao !== 1 || !objeto(backup.dados)) falhar();
    const s = backup.dados;
    if (!objeto(s.CURSOS) || !objeto(s.TURMAS) || !objeto(s.USERS) || !Array.isArray(s.DISC) || !Array.isArray(s.AULAS) || !Array.isArray(s.NOTIFS) || !textos(s.DOCENTES) || !Number.isInteger(s.uid)) falhar();
    if (!Object.entries(s.CURSOS).every(([k, n]) => /^[A-Z][A-Z0-9]{1,11}$/.test(k) && texto(n))) falhar();
    if (!Object.values(s.TURMAS).every(t => objeto(t) && s.CURSOS[t.c] && Number.isInteger(t.s) && t.s > 0)) falhar();
    const turmas = t => textos(t) && t.every(k => Object.hasOwn(s.TURMAS, k));
    if (!s.DISC.every(d => objeto(d) && texto(d.n) && texto(d.d) && s.CURSOS[d.c] && turmas(d.t) && typeof d.h === 'string')) falhar();
    if (!Object.entries(s.USERS).every(([cpf, u]) => /^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf) && objeto(u) && texto(u.name) && typeof u.senha === 'string' && ['admin', 'coordenador', 'professor'].includes(u.role) && (u.role !== 'professor' || texto(u.doc)) && (!u.cursos || textos(u.cursos) && u.cursos.every(c => s.CURSOS[c])))) falhar();
    if (!Object.values(s.USERS).some(u => u.role === 'admin')) falhar();
    const ids = new Set();
    if (!s.AULAS.every(a => {
        if (!objeto(a) || !Number.isInteger(a.id) || ids.has(a.id) || a.id < 1 || a.id >= s.uid) return false;
        ids.add(a.id);
        return texto(a.n) && texto(a.d) && s.DOCENTES.includes(a.d) && s.CURSOS[a.c] && turmas(a.t) && a.t.every(t => s.TURMAS[t].c === a.c) && /^\d{4}-\d{2}-\d{2}$/.test(a.data) && /^\d{2}:\d{2}$/.test(a.h) && (!a.fim || /^\d{2}:\d{2}$/.test(a.fim)) && texto(a.sala) && texto(a.orig) && typeof a.pub === 'boolean' && ['OK', 'CANCELADA'].includes(a.st);
    })) falhar();
    if (!s.NOTIFS.every(n => objeto(n) && turmas(n.t) && typeof n.txt === 'string' && !/[<>]/.test(n.txt.replace(/<\/?b>/g, '')) && typeof n.lida === 'boolean')) falhar();
    return s;
}

async function restaurarDados(input) {
    if (me?.role !== 'admin' || !input.files[0]) return;
    try {
        const s = validarBackup(JSON.parse(await input.files[0].text()));
        if (me?.role !== 'admin') return;
        if (!confirm(`Restaurar ${Object.keys(s.CURSOS).length} curso(s), ${Object.keys(s.USERS).length} conta(s) e ${s.AULAS.length} aula(s)? Os dados atuais deste navegador serão substituídos. Exporte um backup antes de continuar.`)) return;
        localStorage.setItem(KEY, JSON.stringify(s));
        location.reload();
    } catch (erro) {
        adminFeedback('Não foi possível restaurar o backup. Verifique se o arquivo foi exportado pelo portal e se há espaço no navegador.');
    } finally { input.value = ''; }
}
