// Array para armazenar os locais
let locais = JSON.parse(localStorage.getItem('locais')) || [];

// Elementos DOM
const form = document.getElementById('local-form');
const listaLocais = document.getElementById('lista-locais');
const filtroStatus = document.getElementById('filtro-status');
const btnSalvarArquivo = document.getElementById('salvar-arquivo');
const btnCarregarArquivo = document.getElementById('btn-carregar-arquivo');
const inputCarregarArquivo = document.getElementById('carregar-arquivo');
const btnMostrarForm = document.getElementById('btn-mostrar-form');
const btnFecharForm = document.getElementById('btn-fechar-form');
const formContainer = document.getElementById('form-container');
const modalOverlay = document.getElementById('modal-overlay');
const btnEditarPorRep = document.getElementById('btn-editar-por-rep');
const btnExcluirPorRep = document.getElementById('btn-excluir-por-rep');

// Funções
function salvarNoLocalStorage() {
    localStorage.setItem('locais', JSON.stringify(locais));
}

function adicionarLocal(e) {
    e.preventDefault();
    
    const rep = document.getElementById('rep').value;
    const endereco = document.getElementById('endereco').value;
    const status = document.getElementById('status').value;
    const nomeVitima = document.getElementById('nomeVitima').value;
    const telefoneVitima = document.getElementById('telefoneVitima').value;
    const tipoExame = document.getElementById('tipoExame').value;
    const resumoCaso = document.getElementById('resumoCaso').value;
    
    // Verificar se o REP já existe
    const existeRep = locais.some(local => local.rep === rep);
    if (existeRep) {
        alert('Já existe um local com este número de REP!');
        return;
    }
    
    const novoLocal = {
        id: Date.now(),
        rep,
        endereco,
        status,
        nomeVitima,
        telefoneVitima,
        tipoExame,
        resumoCaso
    };
    
    locais.push(novoLocal);
    salvarNoLocalStorage();
    atualizarListaLocais();
    
    // Esconder formulário após adicionar
    fecharModal();
    
    // Limpar formulário
    form.reset();
}

function excluirLocal(id) {
    if (confirm('Tem certeza que deseja excluir este local?')) {
        locais = locais.filter(local => local.id !== id);
        salvarNoLocalStorage();
        atualizarListaLocais();
    }
}

function excluirPorRep() {
    const rep = prompt('Digite o número de REP do local que deseja excluir:');
    if (!rep) return;
    
    const local = locais.find(l => l.rep === rep);
    if (!local) {
        alert('Não foi encontrado nenhum local com este número de REP!');
        return;
    }
    
    excluirLocal(local.id);
}

function editarLocal(id) {
    const local = locais.find(local => local.id === id);
    
    // Preencher o formulário com os dados do local
    document.getElementById('rep').value = local.rep;
    document.getElementById('endereco').value = local.endereco;
    document.getElementById('status').value = local.status;
    document.getElementById('nomeVitima').value = local.nomeVitima || '';
    document.getElementById('telefoneVitima').value = local.telefoneVitima || '';
    document.getElementById('tipoExame').value = local.tipoExame || '';
    document.getElementById('resumoCaso').value = local.resumoCaso || '';
    
    // Remover o local da lista
    locais = locais.filter(local => local.id !== id);
    salvarNoLocalStorage();
    atualizarListaLocais();
    
    // Mostrar formulário para edição
    abrirModal();
}

function editarPorRep() {
    const rep = prompt('Digite o número de REP do local que deseja editar:');
    if (!rep) return;
    
    const local = locais.find(l => l.rep === rep);
    if (!local) {
        alert('Não foi encontrado nenhum local com este número de REP!');
        return;
    }
    
    editarLocal(local.id);
}

function abrirNoMaps(endereco) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
    window.open(url, '_blank');
}

function atualizarListaLocais() {
    listaLocais.innerHTML = '';
    
    const filtro = filtroStatus.value;
    
    const locaisFiltrados = filtro === 'todos' 
        ? locais 
        : locais.filter(local => local.status === filtro);
    
    if (locaisFiltrados.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="5" style="text-align: center;">Nenhum local encontrado</td>
        `;
        listaLocais.appendChild(tr);
        return;
    }
    
    locaisFiltrados.forEach(local => {
        const temDetalhes = local.nomeVitima || local.telefoneVitima || local.tipoExame || local.resumoCaso;
        
        // Linha principal
        const tr = document.createElement('tr');
        tr.dataset.id = local.id;
        
        tr.innerHTML = `
            <td class="expandir-col">
                <button type="button" class="btn-expandir ${!temDetalhes ? 'btn-desativado' : ''}" 
                    onclick="${temDetalhes ? `toggleDetalhes(${local.id})` : ''}"
                    ${!temDetalhes ? 'disabled' : ''}>
                    <i class="fa-solid ${temDetalhes ? 'fa-plus' : 'fa-circle-dot fa-xs'} expandir-icon"></i>
                </button>
            </td>
            <td>${local.rep}</td>
            <td>${local.endereco}</td>
            <td class="status-${local.status}">${local.status === 'pendente' ? 'Pendente' : 'Concluído'}</td>
            <td>
                <button class="btn-maps" onclick="abrirNoMaps('${local.endereco.replace(/'/g, "\\'")}')">
                    <i class="fa-solid fa-map-location-dot"></i> Maps
                </button>
            </td>
        `;
        
        listaLocais.appendChild(tr);
        
        // Linha de detalhes (oculta inicialmente)
        if (temDetalhes) {
            const trDetalhes = document.createElement('tr');
            trDetalhes.className = 'linha-detalhes';
            trDetalhes.id = `detalhes-${local.id}`;
            trDetalhes.style.display = 'none';
            
            let detalhesHTML = '<td colspan="5" class="detalhes-container">';
            
            if (local.nomeVitima) detalhesHTML += `<div class="detalhe-item"><span class="detalhe-label"><i class="fa-solid fa-user"></i> Nome da vítima:</span> ${local.nomeVitima}</div>`;
            if (local.telefoneVitima) detalhesHTML += `<div class="detalhe-item"><span class="detalhe-label"><i class="fa-solid fa-phone"></i> Telefone da vítima:</span> ${local.telefoneVitima}</div>`;
            if (local.tipoExame) detalhesHTML += `<div class="detalhe-item"><span class="detalhe-label"><i class="fa-solid fa-stethoscope"></i> Tipo de exame:</span> ${local.tipoExame}</div>`;
            if (local.resumoCaso) detalhesHTML += `<div class="detalhe-item"><span class="detalhe-label"><i class="fa-solid fa-file-lines"></i> Resumo do caso:</span> <div class="detalhe-resumo">${local.resumoCaso}</div></div>`;
            
            detalhesHTML += '</td>';
            
            trDetalhes.innerHTML = detalhesHTML;
            listaLocais.appendChild(trDetalhes);
        }
    });
}

function toggleDetalhes(id) {
    const trDetalhes = document.getElementById(`detalhes-${id}`);
    const linha = document.querySelector(`tr[data-id="${id}"]`);
    const icone = linha.querySelector('.expandir-icon');
    
    if (trDetalhes.style.display === 'none') {
        trDetalhes.style.display = 'table-row';
        icone.classList.remove('fa-plus');
        icone.classList.add('fa-minus');
    } else {
        trDetalhes.style.display = 'none';
        icone.classList.remove('fa-minus');
        icone.classList.add('fa-plus');
    }
}

function abrirModal() {
    modalOverlay.classList.add('modal-visible');
}

function fecharModal() {
    modalOverlay.classList.remove('modal-visible');
    form.reset();
}

function salvarParaArquivo() {
    if (locais.length === 0) {
        alert('Não há locais para salvar!');
        return;
    }
    
    const dadosJSON = JSON.stringify(locais, null, 2);
    const blob = new Blob([dadosJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'meus_locais.json';
    document.body.appendChild(a);
    a.click();
    
    // Limpeza
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

function carregarDeArquivo(e) {
    const arquivo = e.target.files[0];
    
    if (!arquivo) return;
    
    const leitor = new FileReader();
    
    leitor.onload = function(evento) {
        try {
            const dados = JSON.parse(evento.target.result);
            
            if (Array.isArray(dados)) {
                if (confirm('Isso substituirá todos os locais atuais. Deseja continuar?')) {
                    locais = dados;
                    salvarNoLocalStorage();
                    atualizarListaLocais();
                    alert('Locais carregados com sucesso!');
                }
            } else {
                alert('Formato de arquivo inválido!');
            }
        } catch (erro) {
            alert('Erro ao processar o arquivo: ' + erro.message);
        }
    };
    
    leitor.readAsText(arquivo);
    // Resetar o input de arquivo para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
}

// Event Listeners
form.addEventListener('submit', adicionarLocal);
filtroStatus.addEventListener('change', atualizarListaLocais);
btnSalvarArquivo.addEventListener('click', salvarParaArquivo);
btnCarregarArquivo.addEventListener('click', () => inputCarregarArquivo.click());
inputCarregarArquivo.addEventListener('change', carregarDeArquivo);
btnMostrarForm.addEventListener('click', abrirModal);
btnFecharForm.addEventListener('click', fecharModal);
btnEditarPorRep.addEventListener('click', editarPorRep);
btnExcluirPorRep.addEventListener('click', excluirPorRep);

// Fechar modal quando clicar fora do conteúdo
modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
        fecharModal();
    }
});

// Inicializar a lista de locais
atualizarListaLocais();

// Expor funções para o HTML
window.abrirNoMaps = abrirNoMaps;
window.toggleDetalhes = toggleDetalhes; 