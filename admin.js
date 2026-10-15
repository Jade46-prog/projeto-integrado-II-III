// Cadastros administrativos da demonstração, persistidos com o cronograma.
const cursosCoordenador = u => u.cursos || [u.curso || 'ADS'];
const canCoordinate = curso => me?.role === 'coordenador' && cursosCoordenador(me).includes(curso);
let coordenadorEditando = null;
const nomeCadastroValido = nome => nome.length >= 2 && nome.length <= 100 && /^[\p{L}\p{N} .,'()\-–]+$/u.test(nome);
const nomeNormalizado = nome => nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function preencherCursos(id, entradas, vazio = false) {
    const select = $(id), anterior = select.value;
    select.replaceChildren();
    if (vazio) select.add(new Option('Selecione o curso', ''));
    entradas.forEach(([codigo, nome]) => select.add(new Option(nome, codigo)));
    if ([...select.options].some(o => o.value === anterior)) select.value = anterior;
}

function refreshCourseFilters() {
    const cursos = Object.entries(CURSOS);
    preencherCursos('f-curso', me?.role === 'coordenador' ? cursos.filter(([c]) => canCoordinate(c)) : cursos);
    F.c = $('f-curso').value;
    const professor = $('f-professor'), docenteAnterior = professor.value;
    const docentes = docentesDoCurso(F.c);
    professor.replaceChildren(new Option('Todos os professores', ''));
    docentes.forEach(d => professor.add(new Option(d, d)));
    if (docentes.includes(docenteAnterior)) professor.value = docenteAnterior;
    F.doc = professor.value;
    const sem = $('f-sem'), anterior = sem.value;
    sem.replaceChildren(new Option('Todos os semestres', ''));
    [...new Set(Object.values(TURMAS).filter(t => t.c === F.c).map(t => t.s))].sort((a, b) => a - b).forEach(s => sem.add(new Option(`${s}º Semestre`, s)));
    if ([...sem.options].some(o => o.value === anterior)) sem.value = anterior;
    F.s = sem.value;
    preencherCursos('aluno-curso', cursos, true);
}

function renderAdmin() {
    if (me?.role !== 'admin') return;
    preencherCursos('admin-subject-course', Object.entries(CURSOS));
    preencherCursosCoordenador();
    const select = $('admin-filter-coordinator'), anterior = select.value;
    select.replaceChildren(new Option('Todos os coordenadores', ''));
    Object.entries(USERS).filter(([, u]) => u.role === 'coordenador').forEach(([cpf, u]) => select.add(new Option(u.name, cpf)));
    if (USERS[anterior]?.role === 'coordenador') select.value = anterior;
    filterAdminCoordinator();
}

function preencherCursosCoordenador(selecionados) {
    selecionados ||= [...document.querySelectorAll('#admin-coordinator-course input:checked')].map(i => i.value);
    $('admin-coordinator-course').replaceChildren();
    Object.entries(CURSOS).forEach(([c, nome]) => {
        const label = document.createElement('label'), input = document.createElement('input');
        label.className = 'flex items-center gap-2 text-sm';
        input.type = 'checkbox'; input.value = c; input.checked = selecionados.includes(c);
        label.append(input, document.createTextNode(nome));
        $('admin-coordinator-course').appendChild(label);
    });
}

function filterAdminCoordinator(limparCurso = false) {
    if (me?.role !== 'admin') return;
    const u = USERS[$('admin-filter-coordinator').value];
    preencherCursos('admin-filter-course', Object.entries(CURSOS).filter(([c]) => !u || cursosCoordenador(u).includes(c)), true);
    if (limparCurso) $('admin-filter-course').value = '';
    renderAdminCourse();
}

function renderAdminCourse() {
    if (me?.role !== 'admin') return;
    const curso = $('admin-filter-course').value;
    const cpf = $('admin-filter-coordinator').value, usuario = USERS[cpf];
    const cursos = Object.hasOwn(CURSOS, curso) && (!usuario || cursosCoordenador(usuario).includes(curso)) ? [curso] : [];
    const selecionado = cursos.length > 0;
    $('admin-course-placeholder').classList.toggle('hidden', selecionado);
    $('admin-course-placeholder').textContent = usuario ? 'Selecione um dos cursos deste coordenador para consultar os professores e as matérias.' : 'Selecione um curso para consultar seus coordenadores, professores e matérias.';
    $('admin-course-details').classList.toggle('hidden', !selecionado && !usuario);
    $('admin-professors-section').classList.toggle('hidden', !selecionado);
    $('admin-subjects-section').classList.toggle('hidden', !selecionado);
    $('admin-coordinators-title').textContent = usuario ? 'Coordenador e cursos sob sua responsabilidade' : 'Coordenadores do curso';
    const listar = (id, linhas) => {
        $(id).replaceChildren();
        linhas.forEach(texto => {
            const li = document.createElement('li');
            li.className = 'rounded-lg border border-slate-200 bg-slate-50 p-4 break-words';
            li.textContent = texto;
            $(id).appendChild(li);
        });
    };
    const materias = [...new Set(DISC.filter(d => cursos.includes(d.c)).map(d => d.n))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const coordenadores = Object.entries(USERS).filter(([id, u]) => u.role === 'coordenador' && (usuario ? id === cpf : cursosCoordenador(u).some(c => cursos.includes(c))));
    const professores = Object.values(USERS).filter(u => u.role === 'professor' && cursosProfessor(u).some(c => cursos.includes(c))).map(u => u.doc).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    listar('admin-professors-list', selecionado ? professores.length ? professores : ['Nenhum professor vinculado a este curso.'] : []);
    listar('admin-subjects-list', selecionado ? materias.length ? materias : ['Nenhuma matéria cadastrada neste curso.'] : []);
    listar('admin-coordinators-list', selecionado && !coordenadores.length ? ['Nenhum coordenador cadastrado neste curso.'] : []);
    coordenadores.forEach(([, u]) => {
        const li = document.createElement('li');
        li.className = 'rounded-lg border border-slate-200 bg-slate-50 p-4 break-words';
        li.textContent = `${u.name} — ${usuario ? cursosCoordenador(u).map(c => CURSOS[c]).filter(Boolean).join(', ') : CURSOS[curso]}`;
        $('admin-coordinators-list').appendChild(li);
    });
}

function adminFeedback(texto) {
    const modalAberto = $('admin-modal').open;
    $('admin-feedback').textContent = modalAberto ? '' : texto;
    $('admin-modal-feedback').textContent = modalAberto ? texto : '';
    $('admin-modal-feedback').classList.toggle('hidden', !modalAberto || !texto);
}

function closeAdminModal() { $('admin-modal').close(); }

function showAdminForm(tipo) {
    if (me?.role !== 'admin') return;
    if (!tipo) { closeAdminModal(); return; }
    resetEntityForm(tipo);
    $('admin-edit-selector').classList.add('hidden');
    $('admin-menu-edit-coordinator').setAttribute('aria-expanded', 'false');
    $('admin-menu-edit-coordinator').classList.remove('ring-2', 'ring-brand-900');
    if (tipo === 'coordinator') {
        coordenadorEditando = null;
        $('admin-coordinator-form').reset();
        $('admin-coordinator-cpf').readOnly = false;
        $('admin-coordinator-password').required = true;
        $('admin-coordinator-password').placeholder = '';
        preencherCursosCoordenador([]);
    }
    ['course', 'subject', 'coordinator', 'professor'].forEach(t => {
        const ativo = t === tipo;
        $(`admin-${t}-form`).classList.toggle('hidden', !ativo);
        $(`admin-menu-${t}`).setAttribute('aria-expanded', String(ativo));
        $(`admin-menu-${t}`).classList.toggle('ring-2', ativo);
        $(`admin-menu-${t}`).classList.toggle('ring-brand-900', ativo);
    });
    adminFeedback('');
    const titulos = { course: 'Cadastrar curso', subject: 'Cadastrar matéria', coordinator: 'Cadastrar coordenador', professor: 'Cadastrar professor' };
    $('admin-modal-title').textContent = titulos[tipo];
    $('admin-modal-submit').setAttribute('form', `admin-${tipo}-form`);
    $('admin-modal-submit').textContent = titulos[tipo];
    if (!$('admin-modal').open) $('admin-modal').showModal();
    $(`admin-${tipo}-form`).querySelector('input, select').focus();
}

function salvarCadastroAdmin(form, rollback) {
    if (!saveState()) { rollback(); adminFeedback('Não foi possível salvar no navegador. O cadastro não foi concluído.'); return; }
    form.reset();
    closeAdminModal();
    updateAll();
    adminFeedback('Cadastro realizado com sucesso.');
}

function cadastrarCurso(e) {
    e.preventDefault();
    if (me?.role !== 'admin') return;
    if (entityEdit?.tipo === 'course') return salvarCursoEditado(e);
    const codigo = $('admin-course-code').value.trim().toUpperCase();
    const nome = $('admin-course-name').value.trim(), semestres = Number($('admin-course-semesters').value);
    if (!/^[A-Z][A-Z0-9]{1,11}$/.test(codigo) || !nomeCadastroValido(nome) || !Number.isInteger(semestres) || semestres < 1 || semestres > 20) return adminFeedback('Informe sigla, nome e quantidade de semestres válidos.');
    if (Object.hasOwn(CURSOS, codigo) || Object.values(CURSOS).some(n => nomeNormalizado(n) === nomeNormalizado(nome))) return adminFeedback('Este curso já está cadastrado.');
    CURSOS[codigo] = nome;
    const turmas = range(1, semestres).map(s => `${codigo}-${s}A`);
    turmas.forEach((t, i) => TURMAS[t] = { c: codigo, s: i + 1 });
    salvarCadastroAdmin(e.target, () => { delete CURSOS[codigo]; turmas.forEach(t => delete TURMAS[t]); });
}

function cadastrarMateria(e) {
    e.preventDefault();
    if (me?.role !== 'admin') return;
    if (entityEdit?.tipo === 'subject') return salvarMateriaEditada(e);
    const curso = $('admin-subject-course').value, nome = $('admin-subject-name').value.trim();
    if (!Object.hasOwn(CURSOS, curso) || !nomeCadastroValido(nome)) return adminFeedback('Selecione o curso e informe um nome válido para a matéria.');
    if (DISC.some(d => d.c === curso && nomeNormalizado(d.n) === nomeNormalizado(nome))) return adminFeedback('Esta matéria já está cadastrada neste curso.');
    DISC.push({ n: nome, c: curso, d: '', t: [], a: 0, h: '' });
    salvarCadastroAdmin(e.target, () => DISC.pop());
}

function cadastrarCoordenador(e) {
    e.preventDefault();
    if (me?.role !== 'admin') return;
    const nome = $('admin-coordinator-name').value.trim(), entrada = $('admin-coordinator-cpf').value.trim();
    const senha = $('admin-coordinator-password').value;
    const cursos = [...document.querySelectorAll('#admin-coordinator-course input:checked')].map(i => i.value);
    if (!nomeCadastroValido(nome) || !/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(entrada) || ((!coordenadorEditando || senha) && senha.length < 6) || !cursos.length || cursos.some(c => !Object.hasOwn(CURSOS, c))) return adminFeedback('Informe nome, CPF com 11 dígitos, senha de pelo menos 6 caracteres e ao menos um curso.');
    const cpf = entrada.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    if (coordenadorEditando ? cpf !== coordenadorEditando : Object.hasOwn(USERS, cpf)) return adminFeedback('Já existe um usuário com este CPF ou o CPF foi alterado.');
    const anterior = USERS[cpf];
    USERS[cpf] = { name: nome, role: 'coordenador', roleLabel: 'Coordenador', cursos, info: `Coordenação de ${cursos.map(c => CURSOS[c]).join(', ')}`, senha: senha || anterior.senha };
    salvarCadastroAdmin(e.target, () => { if (anterior) USERS[cpf] = anterior; else delete USERS[cpf]; });
}

function openEditCoordinator() {
    if (me?.role !== 'admin') return;
    const select = $('admin-edit-coordinator');
    select.replaceChildren();
    Object.entries(USERS).filter(([, u]) => u.role === 'coordenador').forEach(([cpf, u]) => select.add(new Option(u.name, cpf)));
    if (!select.options.length) return adminFeedback('Nenhum coordenador cadastrado para editar.');
    const filtro = $('admin-filter-coordinator').value;
    if (USERS[filtro]?.role === 'coordenador') select.value = filtro;
    editarCoordenador(select.value);
    select.focus();
}

function editarCoordenador(cpf) {
    if (me?.role !== 'admin' || USERS[cpf]?.role !== 'coordenador') return;
    showAdminForm('coordinator');
    $('admin-edit-selector').classList.remove('hidden');
    $('admin-edit-coordinator').value = cpf;
    $('admin-menu-coordinator').setAttribute('aria-expanded', 'false');
    $('admin-menu-coordinator').classList.remove('ring-2', 'ring-brand-900');
    $('admin-menu-edit-coordinator').setAttribute('aria-expanded', 'true');
    $('admin-menu-edit-coordinator').classList.add('ring-2', 'ring-brand-900');
    coordenadorEditando = cpf;
    $('admin-modal-title').textContent = 'Editar coordenador e cursos';
    $('admin-modal-submit').textContent = 'Salvar alterações';
    $('admin-coordinator-name').value = USERS[cpf].name;
    $('admin-coordinator-cpf').value = cpf;
    $('admin-coordinator-cpf').readOnly = true;
    $('admin-coordinator-password').required = false;
    $('admin-coordinator-password').placeholder = 'Deixe vazio para manter a senha';
    preencherCursosCoordenador(cursosCoordenador(USERS[cpf]));
}

function initAdmin() {
    $('admin-modal').addEventListener('close', () => {
        ['course', 'subject', 'coordinator', 'professor', 'edit-course', 'edit-subject', 'edit-coordinator', 'edit-professor'].forEach(t => {
            $(`admin-menu-${t}`).setAttribute('aria-expanded', 'false');
            $(`admin-menu-${t}`).classList.remove('ring-2', 'ring-brand-900');
        });
    });
    $('admin-course-form').addEventListener('submit', cadastrarCurso);
    $('admin-subject-form').addEventListener('submit', cadastrarMateria);
    $('admin-coordinator-form').addEventListener('submit', cadastrarCoordenador);
    $('admin-professor-form').addEventListener('submit', salvarProfessor);
    refreshCourseFilters();
}
