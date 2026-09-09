// Configuração do Supabase
const SUPABASE_URL = 'https://zescvxpzuehwxrolpwwu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UID1Tbtk7d4dgBCacvf-Wg_ckL7JS5G';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// SENHA DO ADMINISTRADOR
const SENHA_ADMIN = 'palmeiras1914';

let designers = [];
let tarefas = [];
let historicoMeses = [];
let isAdmin = sessionStorage.getItem('hub_admin') === 'true';

// --- CONTROLE DE ADMIN ---
function tentarLoginAdmin() {
    if (isAdmin) {
        if (confirm('Deseja sair do modo Administrador?')) {
            sessionStorage.removeItem('hub_admin');
            isAdmin = false;
            atualizarInterfaceAdmin();
            alert('Modo Administrador desativado.');
        }
        return;
    }

    const senhaDigitada = prompt('Digite a senha de Administrador:');
    if (senhaDigitada === SENHA_ADMIN) {
        sessionStorage.setItem('hub_admin', 'true');
        isAdmin = true;
        atualizarInterfaceAdmin();
        alert('Bem-vindo, Administrador! Painel liberado.');
    } else if (senhaDigitada !== null) {
        alert('Senha incorreta!');
    }
}

function atualizarInterfaceAdmin() {
    const elementosAdmin = document.querySelectorAll('.admin-only');
    const btnToggle = document.getElementById('btn-admin-toggle');
    const visitanteSec = document.getElementById('visitante-designers-section');

    elementosAdmin.forEach(el => {
        el.style.display = isAdmin ? 'block' : 'none';
    });

    if (visitanteSec) {
        visitanteSec.style.display = isAdmin ? 'none' : 'block';
    }

    if (btnToggle) {
        if (isAdmin) {
            btnToggle.innerHTML = '<i class="fa-solid fa-unlock"></i> Sair do Modo Admin';
            btnToggle.className = 'btn-warning';
        } else {
            btnToggle.innerHTML = '<i class="fa-solid fa-lock"></i> Entrar como Admin';
            btnToggle.className = 'btn-primary';
        }
    }
    
    renderizarDesigners();
    renderizarTarefas();
    renderizarHistorico(); // Atualiza o histórico para mostrar/esconder o botão de lixeira conforme o login
}

// --- FUNÇÃO DE INICIALIZAÇÃO ---
async function atualizarTudo() {
    await carregarDadosDoBanco();
    renderizarDesigners();
    renderizarTarefas();
    renderizarRanking();
    renderizarHistorico();
    atualizarInterfaceAdmin();
}

// --- BUSCAR DADOS DO SUPABASE ---
async function carregarDadosDoBanco() {
    try {
        const resDesigners = await supabaseClient.from('designers').select('*');
        if (!resDesigners.error) {
            designers = resDesigners.data.map(d => d.nome);
        }

        const resTarefas = await supabaseClient.from('tarefas').select('*');
        if (!resTarefas.error) {
            tarefas = resTarefas.data;
        }

        const resHistorico = await supabaseClient.from('historico_meses').select('*');
        if (!resHistorico.error) {
            historicoMeses = resHistorico.data;
        }
    } catch (err) {
        console.error("Erro ao carregar dados do Supabase:", err);
    }
}

// --- GERENCIAMENTO DE DESIGNERS ---
async function adicionarDesigner(event) {
    event.preventDefault();
    if (!isAdmin) return alert('Acesso negado. Faça login como admin.');

    const inputElement = document.getElementById('designer-name');
    if (!inputElement) return;
    
    const nome = inputElement.value.trim();

    if (nome && !designers.includes(nome)) {
        const { error } = await supabaseClient.from('designers').insert([{ nome }]);
        
        if (error) {
            alert('Erro ao salvar designer no banco.');
            console.error(error);
            return;
        }

        inputElement.value = '';
        await atualizarTudo();
    } else {
        alert('Este designer já está cadastrado ou o nome está vazio.');
    }
}

async function excluirDesigner(nome) {
    if (!isAdmin) return alert('Acesso negado. Faça login como admin.');

    if (confirm(`Deseja remover ${nome} da lista de designers?`)) {
        const { error } = await supabaseClient.from('designers').delete().eq('nome', nome);
        
        if (error) {
            alert('Erro ao excluir designer.');
            return;
        }
        await atualizarTudo();
    }
}

function renderizarDesigners() {
    const select = document.getElementById('task-designer-select');
    const badgesDiv = document.getElementById('designers-list-badge');
    const badgesViewDiv = document.getElementById('designers-list-badge-view');
    const valorAtual = select ? select.value : '';

    if (select) select.innerHTML = '<option value="">Selecione um designer...</option>';
    if (badgesDiv) badgesDiv.innerHTML = '';
    if (badgesViewDiv) badgesViewDiv.innerHTML = '';

    designers.forEach(designer => {
        if (select) {
            const option = document.createElement('option');
            option.value = designer;
            option.textContent = designer;
            if (designer === valorAtual) option.selected = true;
            select.appendChild(option);
        }

        if (badgesDiv) {
            const badge = document.createElement('div');
            badge.className = 'designer-badge';
            badge.innerHTML = `<span><i class="fa-solid fa-user"></i> ${designer}</span> <button onclick="excluirDesigner('${designer}')" style="background:transparent; border:none; color:var(--danger); cursor:pointer; margin-left:4px;">&times;</button>`;
            badgesDiv.appendChild(badge);
        }

        if (badgesViewDiv) {
            const badgeView = document.createElement('div');
            badgeView.className = 'designer-badge';
            badgeView.innerHTML = `<span><i class="fa-solid fa-user"></i> ${designer}</span>`;
            badgesViewDiv.appendChild(badgeView);
        }
    });

    const countElement = document.getElementById('count-designers');
    if (countElement) countElement.innerText = designers.length;
}

// --- RANKING E PONTUAÇÃO ---
function renderizarRanking() {
    const rankingContainer = document.getElementById('ranking-container');
    if (!rankingContainer) return;
    
    rankingContainer.innerHTML = '';

    if (designers.length === 0) {
        rankingContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Nenhum designer cadastrado para exibir no ranking.</p>';
        return;
    }

    let pontuacoes = designers.map(designer => {
        let concluidas = tarefas.filter(t => t.designer === designer && t.status === 'done').length;
        let emAndamento = tarefas.filter(t => t.designer === designer && t.status === 'doing').length;
        let pontos = concluidas * 10;
        return { designer, concluidas, emAndamento, pontos };
    });

    pontuacoes.sort((a, b) => b.pontos - a.pontos);

    pontuacoes.forEach((item, index) => {
        let rankHtml = `
            <div class="ranking-item">
                <div class="ranking-info">
                    <span class="ranking-position">#${index + 1}</span>
                    <span class="ranking-name">${item.designer}</span>
                </div>
                <div class="ranking-stats" style="display: flex; gap: 15px; align-items: center; font-size: 0.85rem; color: var(--text-muted);">
                    <span>Concluídas: <strong>${item.concluidas}</strong></span>
                    <span>Em Andamento: <strong>${item.emAndamento}</strong></span>
                    <span class="ranking-points">${item.pontos} pts</span>
                </div>
            </div>
        `;
        rankingContainer.innerHTML += rankHtml;
    });
}

// --- GERENCIAMENTO DE TAREFAS ---
function renderizarTarefas() {
    const listTodo = document.getElementById('list-todo');
    const listDoing = document.getElementById('list-doing');
    const listDone = document.getElementById('list-done');

    if (listTodo) listTodo.innerHTML = '';
    if (listDoing) listDoing.innerHTML = '';
    if (listDone) listDone.innerHTML = '';

    let contTodo = 0;
    let contDone = 0;

    tarefas.forEach((tarefa) => {
        let acoesHtml = '';
        if (isAdmin) {
            acoesHtml = `
                <div class="task-actions">
                    <select onchange="mudarStatus('${tarefa.id}', this.value)">
                        <option value="todo" ${tarefa.status === 'todo' ? 'selected' : ''}>A Fazer</option>
                        <option value="doing" ${tarefa.status === 'doing' ? 'selected' : ''}>Em Andamento</option>
                        <option value="done" ${tarefa.status === 'done' ? 'selected' : ''}>Concluído</option>
                    </select>
                    <button class="btn-delete-task" onclick="excluirTarefa('${tarefa.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
        } else {
            acoesHtml = `<div class="task-actions"><span style="font-size: 0.8rem; color: var(--text-muted);">Status: ${tarefa.status.toUpperCase()}</span></div>`;
        }

        // Formata a data do jogo (YYYY-MM-DD para DD/MM/YYYY)
        let dataFormatada = '';
        if (tarefa.data_jogo) {
            const partes = tarefa.data_jogo.split('-');
            if (partes.length === 3) {
                dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
            } else {
                dataFormatada = tarefa.data_jogo;
            }
        }

        let cardHtml = `
            <div class="task-card status-${tarefa.status}">
                <div class="task-card-title">${tarefa.titulo}</div>
                <div style="font-size: 0.85rem; color: var(--text-muted);">Designer: <strong>${tarefa.designer}</strong></div>
                <div class="task-card-footer">
                    <span style="display: flex; align-items: center; gap: 6px; color: var(--warning); font-size: 0.85rem;">
                        <i class="fa-solid fa-calendar-days"></i> ${dataFormatada || 'Sem data'}
                    </span>
                    ${acoesHtml}
                </div>
            </div>
        `;

        if (tarefa.status === 'todo') {
            if (listTodo) listTodo.innerHTML += cardHtml;
            contTodo++;
        } else if (tarefa.status === 'doing') {
            if (listDoing) listDoing.innerHTML += cardHtml;
        } else if (tarefa.status === 'done') {
            if (listDone) listDone.innerHTML += cardHtml;
            contDone++;
        }
    });

    if (document.getElementById('count-todo')) document.getElementById('count-todo').innerText = contTodo;
    if (document.getElementById('count-done')) document.getElementById('count-done').innerText = contDone;

    renderizarRanking();
}

async function adicionarTarefa(event) {
    event.preventDefault();
    if (!isAdmin) return alert('Acesso negado. Faça login como admin.');

    const titleInput = document.getElementById('task-title');
    const dateInput = document.getElementById('task-date');
    const designerSelect = document.getElementById('task-designer-select');
    const statusSelect = document.getElementById('task-status');

    if (!titleInput || !designerSelect || !statusSelect) return;

    const titulo = titleInput.value;
    const data_jogo = dateInput ? dateInput.value : null;
    const designer = designerSelect.value;
    const status = statusSelect.value;

    if (!designer) {
        alert('Por favor, selecione um designer!');
        return;
    }

    const { error } = await supabaseClient
        .from('tarefas')
        .insert([{ titulo, data_jogo, designer, status }]);

    if (error) {
        alert('Erro ao adicionar tarefa.');
        console.error(error);
        return;
    }

    titleInput.value = '';
    if (dateInput) dateInput.value = '';
    designerSelect.selectedIndex = 0;

    await atualizarTudo();
}

async function mudarStatus(id, novoStatus) {
    if (!isAdmin) return alert('Acesso negado. Faça login como admin.');

    const { error } = await supabaseClient
        .from('tarefas')
        .update({ status: novoStatus })
        .eq('id', id);

    if (error) {
        alert('Erro ao atualizar status.');
        return;
    }
    await atualizarTudo();
}

async function excluirTarefa(id) {
    if (!isAdmin) return alert('Acesso negado. Faça login como admin.');

    if(confirm('Tem certeza que deseja apagar esta tarefa?')) {
        const { error } = await supabaseClient
            .from('tarefas')
            .delete()
            .eq('id', id);

        if (error) {
            alert('Erro ao excluir tarefa.');
            return;
        }
        await atualizarTudo();
    }
}

// --- ENCERRAR MÊS E HISTÓRICO ---
async function encerrarMes() {
    if (!isAdmin) return alert('Acesso negado. Faça login como admin.');

    if (designers.length === 0) {
        alert('Não há designers cadastrados para encerrar o mês.');
        return;
    }

    if (!confirm('Deseja realmente encerrar o mês atual? Isso salvará o ranking e limpará as tarefas.')) {
        return;
    }

    let pontuacoesFinais = designers.map(designer => {
        let concluidas = tarefas.filter(t => t.designer === designer && t.status === 'done').length;
        let pontos = concluidas * 10;
        return { designer, concluidas, pontos };
    });

    pontuacoesFinais.sort((a, b) => b.pontos - a.pontos);

    let dataAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    dataAtual = dataAtual.charAt(0).toUpperCase() + dataAtual.slice(1);

    await supabaseClient.from('historico_meses').insert([{ data: dataAtual, ranking: pontuacoesFinais }]);
    await supabaseClient.from('tarefas').delete().neq('id', 0);

    await atualizarTudo();
    alert('Mês encerrado e salvo no histórico com sucesso!');
}

async function apagarMesHistorico(id) {
    if (!isAdmin) return alert('Acesso negado. Faça login como admin.');

    if (confirm('Deseja realmente apagar este registro do histórico mensal?')) {
        const { error } = await supabaseClient.from('historico_meses').delete().eq('id', id);
        if (error) {
            alert('Erro ao apagar o mês do histórico.');
            return;
        }
        await atualizarTudo();
    }
}

function renderizarHistorico() {
    const historicoContainer = document.getElementById('historico-container');
    if (!historicoContainer) return;

    historicoContainer.innerHTML = '';

    if (historicoMeses.length === 0) {
        historicoContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 0.9rem;">Nenhum mês encerrado ainda.</p>';
        return;
    }

    historicoMeses.forEach((mes) => {
        let vencedor = mes.ranking && mes.ranking.length > 0 ? mes.ranking[0] : null;
        let textoVencedor = vencedor ? `<div class="historico-vencedor"><i class="fa-solid fa-trophy"></i> Destaque: <strong>${vencedor.designer}</strong> (${vencedor.concluidas} artes)</div>` : '';
        
        let htmlItensRanking = mes.ranking.map(r => `
            <div class="historico-ranking-row">
                <span>${r.designer}</span>
                <span class="historico-ranking-score"><strong>${r.concluidas} artes</strong> (${r.pontos} pts)</span>
            </div>
        `).join('');
        
        let botaoApagar = isAdmin ? `<button class="btn-delete-task" onclick="apagarMesHistorico('${mes.id}')" title="Apagar Mês"><i class="fa-solid fa-trash"></i></button>` : '';

        let cardHtml = `
            <div class="historico-card">
                <div class="historico-top">
                    <div class="historico-titulo"><i class="fa-regular fa-calendar-check"></i> Mês Encerrado: ${mes.data}</div>
                    ${botaoApagar}
                </div>
                ${textoVencedor}
                <div class="historico-ranking-list">
                    ${htmlItensRanking}
                </div>
            </div>
        `;
        historicoContainer.innerHTML += cardHtml;
    });
}

// --- FUNÇÃO PARA CAPTURAR A IMAGEM DO QUADRO ---
function baixarQuadroImagem() {
    const quadro = document.getElementById('quadro-acompanhamento');
    if (!quadro) return;

    html2canvas(quadro, {
        backgroundColor: '#0c0e12',
        scale: 2
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'quadro-designers-palmeiras.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

// --- TEMPO REAL ---
supabaseClient
  .channel('public-db-changes')
  .on('postgres_changes', { event: '*', schema: 'public' }, () => {
    atualizarTudo();
  })
  .subscribe();

// Inicialização
atualizarTudo();