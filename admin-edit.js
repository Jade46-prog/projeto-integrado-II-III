// Edição dos cadastros, preservando as referências usadas nos cronogramas.
let entityEdit = null;
const entityLabels = { course: 'curso', subject: 'matéria', professor: 'professor' };

function resetEntityForm(tipo) {
    entityEdit = null;
    $('admin-entity-selector').classList.add('hidden');
    ['course', 'subject', 'professor'].forEach(t => {
        $(`admin-menu-edit-${t}`).setAttribute('aria-expanded', 'false');
        $(`admin-menu-edit-${t}`).classList.remove('ring-2', 'ring-brand-900');
    });
    $('admin-course-code').readOnly = false;
    $('admin-subject-course').disabled = false;
    $('admin-subject-picker-label').classList.add('hidden');
    $('admin-subject-name').disabled = false;
    $('admin-modal-submit').disabled = false;
    $('admin-professor-cpf').readOnly = false;
    $('admin-professor-password').required = true;
    $('admin-professor-password').placeholder = '';
    if (tipo !== 'coordinator') $(`admin-${tipo}-form`).reset();
    if (tipo === 'professor') preencherCursosProfessor([]);
}

function openEntityEditor(tipo) {
    if (me?.role !== 'admin' || !entityLabels[tipo]) return;
    const entradas = tipo === 'course' ? Object.entries(CURSOS)
        : tipo === 'professor' ? Object.entries(USERS).filter(([, u]) => u.role === 'professor').map(([cpf, u]) => [cpf, u.doc])
        : [...new Map(DISC.map(d => [JSON.stringify([d.c, d.n]), `${CURSOS[d.c]} — ${d.n}`])).entries()];
    if (!entradas.length) return adminFeedback(`Nenhum cadastro de ${entityLabels[tipo]} disponível para editar.`);
    showAdminForm(tipo);
    const select = $('admin-entity-select');
    select.replaceChildren();
    entradas.forEach(([valor, nome]) => select.add(new Option(nome, valor)));
    entityEdit = { tipo };
    $('admin-entity-selector').classList.remove('hidden');
    $('admin-entity-label').textContent = `Selecione o cadastro de ${entityLabels[tipo]}`;
    $('admin-modal-title').textContent = `Editar ${entityLabels[tipo]}`;
    $('admin-modal-submit').textContent = 'Salvar alterações';
    $(`admin-menu-${tipo}`).setAttribute('aria-expanded', 'false');
    $(`admin-menu-${tipo}`).classList.remove('ring-2', 'ring-brand-900');
    $(`admin-menu-edit-${tipo}`).setAttribute('aria-expanded', 'true');
    $(`admin-menu-edit-${tipo}`).classList.add('ring-2', 'ring-brand-900');
    if (tipo === 'subject') {
        $('admin-entity-selector').classList.add('hidden');
        $('admin-subject-picker-label').classList.remove('hidden');
        preencherCursos('admin-subject-course', Object.entries(CURSOS), true);
        $('admin-subject-course').value = '';
        filterSubjectsToEdit();
        $('admin-subject-course').focus();
    } else {
        selectEntityEditor(select.value);
        select.focus();
    }
}

function filterSubjectsToEdit() {
    if (me?.role !== 'admin' || entityEdit?.tipo !== 'subject') return;
    const curso = $('admin-subject-course').value;
    const select = $('admin-subject-picker');
    const nomes = [...new Set(DISC.filter(d => d.c === curso).map(d => d.n))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    select.replaceChildren(new Option(!curso ? 'Selecione o curso primeiro' : nomes.length ? 'Selecione a matéria' : 'Nenhuma matéria cadastrada neste curso', ''));
    nomes.forEach(nome => select.add(new Option(nome, JSON.stringify([curso, nome]))));
    select.disabled = !nomes.length;
    selectEntityEditor('');
}

function selectEntityEditor(chave) {
    if (me?.role !== 'admin' || !entityEdit) return;
    const tipo = entityEdit.tipo;
    entityEdit = { tipo, chave };
    adminFeedback('');
    if (tipo === 'course') {
        $('admin-course-code').value = chave;
        $('admin-course-code').readOnly = true;
        $('admin-course-name').value = CURSOS[chave];
        $('admin-course-semesters').value = Math.max(1, ...Object.values(TURMAS).filter(t => t.c === chave).map(t => t.s));
    } else if (tipo === 'subject') {
        $('admin-subject-name').value = '';
        $('admin-subject-name').disabled = !chave;
        $('admin-modal-submit').disabled = !chave;
        if (!chave) return;
        const [curso, nome] = JSON.parse(chave);
        if (curso !== $('admin-subject-course').value || !DISC.some(d => d.c === curso && d.n === nome)) {
            entityEdit.chave = '';
            $('admin-subject-name').disabled = true;
            $('admin-modal-submit').disabled = true;
            return;
        }
        $('admin-subject-course').value = curso;
        $('admin-subject-course').disabled = false;
        $('admin-subject-name').value = nome;
    } else {
        const u = USERS[chave];
        $('admin-professor-name').value = u.doc;
        $('admin-professor-cpf').value = chave;
        $('admin-professor-cpf').readOnly = true;
        $('admin-professor-password').value = '';
        $('admin-professor-password').required = false;
        $('admin-professor-password').placeholder = 'Deixe vazio para manter a senha';
        preencherCursosProfessor(cursosProfessor(u));
    }
}

function snapshotCadastros() {
    const snapshot = JSON.parse(JSON.stringify({ CURSOS, TURMAS, DISC, USERS, DOCENTES, AULAS }));
    return () => {
        [[CURSOS, snapshot.CURSOS], [TURMAS, snapshot.TURMAS], [USERS, snapshot.USERS]].forEach(([destino, origem]) => {
            Object.keys(destino).forEach(k => delete destino[k]); Object.assign(destino, origem);
        });
        [[DISC, snapshot.DISC], [DOCENTES, snapshot.DOCENTES], [AULAS, snapshot.AULAS]].forEach(([destino, origem]) => destino.splice(0, destino.length, ...origem));
    };
}

function salvarCursoEditado(e) {
    if (me?.role !== 'admin' || entityEdit?.tipo !== 'course') return;
    const codigo = entityEdit.chave, nome = $('admin-course-name').value.trim(), semestres = Number($('admin-course-semesters').value);
    if (!Object.hasOwn(CURSOS, codigo) || !nomeCadastroValido(nome) || !Number.isInteger(semestres) || semestres < 1 || semestres > 20) return adminFeedback('Informe um nome válido e entre 1 e 20 semestres.');
    if (Object.entries(CURSOS).some(([c, n]) => c !== codigo && nomeNormalizado(n) === nomeNormalizado(nome))) return adminFeedback('Já existe outro curso com esse nome.');
    const remover = Object.keys(TURMAS).filter(t => TURMAS[t].c === codigo && TURMAS[t].s > semestres);
    if ([...AULAS, ...DISC].some(a => a.t.some(t => remover.includes(t)))) return adminFeedback('Não é possível remover semestres com turmas vinculadas a matérias ou aulas.');
    const rollback = snapshotCadastros();
    CURSOS[codigo] = nome;
    remover.forEach(t => delete TURMAS[t]);
    range(1, semestres).forEach(s => {
        if (!Object.values(TURMAS).some(t => t.c === codigo && t.s === s)) TURMAS[`${codigo}-${s}A`] = { c: codigo, s };
    });
    Object.values(USERS).filter(u => u.role === 'coordenador').forEach(u => u.info = `Coordenação de ${cursosCoordenador(u).map(c => CURSOS[c]).join(', ')}`);
    salvarCadastroAdmin(e.target, rollback);
}

function salvarMateriaEditada(e) {
    if (me?.role !== 'admin' || entityEdit?.tipo !== 'subject') return;
    if (!entityEdit.chave) return adminFeedback('Selecione o curso e a matéria que deseja editar.');
    const [curso, anterior] = JSON.parse(entityEdit.chave), nome = $('admin-subject-name').value.trim();
    if (!nomeCadastroValido(nome)) return adminFeedback('Informe um nome válido para a matéria.');
    if (!DISC.some(d => d.c === curso && d.n === anterior)) return adminFeedback('Esta matéria não está mais disponível. Reabra a edição.');
    if (DISC.some(d => d.c === curso && d.n !== anterior && nomeNormalizado(d.n) === nomeNormalizado(nome))) return adminFeedback('Esta matéria já existe neste curso.');
    const rollback = snapshotCadastros();
    [...DISC, ...AULAS].filter(d => d.c === curso && d.n === anterior).forEach(d => d.n = nome);
    salvarCadastroAdmin(e.target, rollback);
}

function preencherCursosProfessor(selecionados) {
    $('admin-professor-courses').replaceChildren();
    Object.entries(CURSOS).forEach(([curso, nome]) => {
        const label = document.createElement('label'), input = document.createElement('input');
        label.className = 'flex items-center gap-2 text-sm';
        input.type = 'checkbox'; input.value = curso; input.checked = selecionados.includes(curso);
        label.append(input, document.createTextNode(nome));
        $('admin-professor-courses').appendChild(label);
    });
}

function salvarProfessor(e) {
    e.preventDefault();
    if (me?.role !== 'admin') return;
    const nome = $('admin-professor-name').value.trim(), entrada = $('admin-professor-cpf').value.trim(), senha = $('admin-professor-password').value;
    const editando = entityEdit?.tipo === 'professor';
    const cursos = [...document.querySelectorAll('#admin-professor-courses input:checked')].map(i => i.value);
    if (!cursos.length || cursos.some(c => !Object.hasOwn(CURSOS, c))) return adminFeedback('Selecione ao menos um curso para o professor.');
    if (!nomeCadastroValido(nome) || !/^(\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(entrada) || ((!editando || senha) && senha.length < 6)) return adminFeedback('Informe nome, CPF com 11 dígitos e senha com pelo menos 6 caracteres.');
    const cpf = entrada.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    const anterior = editando ? USERS[entityEdit.chave] : null;
    if (editando ? !anterior || anterior.role !== 'professor' || cpf !== entityEdit.chave : Object.hasOwn(USERS, cpf)) return adminFeedback('CPF já cadastrado ou inválido para esta edição.');
    if (DOCENTES.some(d => d !== anterior?.doc && nomeNormalizado(d) === nomeNormalizado(nome))) return adminFeedback('Já existe um professor com esse nome.');
    if (anterior && AULAS.some(a => a.d === anterior.doc && !cursos.includes(a.c))) return adminFeedback('Este professor ainda possui aulas em um curso que você desmarcou. Reatribua ou exclua essas aulas antes de remover o vínculo.');
    const rollback = snapshotCadastros();
    if (anterior) {
        DISC.filter(d => d.d === anterior.doc).forEach(d => d.d = cursos.includes(d.c) ? nome : '');
        AULAS.filter(a => a.d === anterior.doc).forEach(a => a.d = nome);
        const indice = DOCENTES.indexOf(anterior.doc);
        if (indice >= 0) DOCENTES[indice] = nome; else DOCENTES.push(nome);
    } else DOCENTES.push(nome);
    USERS[cpf] = { name: nome, doc: nome, role: 'professor', roleLabel: 'Professor', cursos, info: `Docente de ${cursos.map(c => CURSOS[c]).join(', ')}`, senha: senha || anterior.senha };
    salvarCadastroAdmin(e.target, rollback);
}
