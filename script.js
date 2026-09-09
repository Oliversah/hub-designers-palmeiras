// Configuração do Supabase (Substitua com suas chaves reais)
const SUPABASE_URL = 'https://zescvxpzuehwxrolpwwu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_UID1Tbtk7d4dgBCacvf-Wg_ckL7JS5G';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variáveis locais que vão armazenar os dados vindos do Supabase
let designers = [];
let tarefas = [];
let historicoMeses = [];

// --- FUNÇÃO DE INICIALIZAÇÃO ---
async function atualizarTudo() {
    await carregarDadosDoBanco();
    renderizarDesigners();
    renderizarTarefas();
    renderizarRanking();
    renderizarHistorico();
}

// --- BUSCAR DADOS DO SUPABASE ---
async function carregarDadosDoBanco() {
    try {
        // Busca os designers
        const resDesigners = await supabaseClient.from('designers').select('*');
        if (!resDesigners.error) {
            designers = resDesigners.data.map(d => d.nome);
        }

        // Busca as tarefas
        const resTarefas = await supabaseClient.from('tarefas').select('*');
        if (!resTarefas.error) {
            tarefas = resTarefas.data;
        }

        // Busca o histórico (se tiver a tabela criada)
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
    const nome = document.getElementById('designer-name').value.trim();

    if (nome && !designers.includes(nome)) {
        const { error } = await supabaseClient.from('designers').insert([{ nome }]);
        
        if (error) {
            alert('Erro ao salvar designer no banco.');
            console.error(error);
            return;
        }

        document.getElementById('designer-name').value = '';
        await atualizarTudo();
    } else {
        alert('Este designer já está cadastrado ou o nome está vazio.');
    }
}

async function excluirDesigner(nome) {
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
    const valorAtual = select ? select.value : '';

    if (select) select.innerHTML = '<option value="">Selecione um designer...</option>';
    if (badgesDiv) badgesDiv.innerHTML = '';

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
            badge.innerHTML = `<span><i class="fa-solid fa-user"></i> ${designer}</span> <button onclick="excluirDesigner('${designer}')">&times;</button>`;
            badgesDiv.appendChild(badge);
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
                    <span class="ranking-pos">#${index + 1}</span>
                    <span class="ranking-name">${item.designer}</span>
                </div>
                <div class="ranking-stats">
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
        // Usamos o id gerado pelo Supabase ou o índice local se não houver id
        let cardHtml = `
            <div class="task-card ${tarefa.status}">
                <h4>${tarefa.titulo}</h4>
                <p>Designer: <strong>${tarefa.designer}</strong></p>
                <div class="task-actions">
                    <select onchange="mudarStatus('${tarefa.id}', this.value)">
                        <option value="todo" ${tarefa.status === 'todo' ? 'selected' : ''}>A Fazer</option>
                        <option value="doing" ${tarefa.status === 'doing' ? 'selected' : ''}>Em Andamento</option>
                        <option value="done" ${tarefa.status === 'done' ? 'selected' : ''}>Concluído</option>
                    </select>
                    <button class="btn-delete" onclick="excluirTarefa('${tarefa.id}')" title="Excluir"><i class="fa-solid fa-trash"></i></button>
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
    const titulo = document.getElementById('task-title').value;
    const designer = document.getElementById('task-designer-select').value;
    const status = document.getElementById('task-status').value;

    if (!designer) {
        alert('Por favor, selecione um designer!');
        return;
    }

    const { error } = await supabaseClient
        .from('tarefas')
        .insert([{ titulo, designer, status }]);

    if (error) {
        alert('Erro ao adicionar tarefa.');
        console.error(error);
        return;
    }

    document.getElementById('task-title').value = '';
    document.getElementById('task-designer-select').selectedIndex = 0;

    await atualizarTudo();
}

async function mudarStatus(id, novoStatus) {
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

    // Salva o histórico no Supabase
    await supabaseClient.from('historico_meses').insert([{ data: dataAtual, ranking: pontuacoesFinais }]);

    // Apaga todas as tarefas atuais do banco
    await supabaseClient.from('tarefas').delete().neq('id', 0); // deleta todas

    await atualizarTudo();
    alert('Mês encerrado e salvo no histórico com sucesso!');
}

async function apagarMesHistorico(id) {
    if (confirm('Deseja realmente apagar este registro do histórico mensal?')) {
        await supabaseClient.from('historico_meses').delete().eq('id', id);
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
        let htmlItensRanking = mes.ranking.map(r => `<li>${r.designer}: <strong>${r.concluidas} artes</strong> (${r.pontos} pts)</li>`).join('');
        
        let cardHtml = `
            <div class="historico-card">
                <div class="historico-info" style="width: 100%;">
                    <h4>Mês Encerrado: ${mes.data}</h4>
                    <ul style="padding-left: 20px; color: var(--text-main); font-size: 0.9rem; display: flex; flex-direction: column; gap: 4px;">
                        ${htmlItensRanking}
                    </ul>
                </div>
                <button class="btn-delete" onclick="apagarMesHistorico('${mes.id}')" title="Apagar Mês do Histórico"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        historicoContainer.innerHTML += cardHtml;
    });
}

// --- GERAR IMAGEM DO QUADRO ---
function baixarQuadroImagem() {
    const quadro = document.getElementById('quadro-acompanhamento');
    if (!quadro) return;

    html2canvas(quadro, {
        backgroundColor: '#1a2420',
        scale: 2
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'quadro-designers-palmeiras.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

// Inicializa a aplicação buscando os dados online
atualizarTudo();