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

// Funções
function salvarNoLocalStorage() {
    localStorage.setItem('locais', JSON.stringify(locais));
}

function adicionarLocal(e) {
    e.preventDefault();
    
    const rep = document.getElementById('rep').value;
    const endereco = document.getElementById('endereco').value;
    const status = document.getElementById('status').value;
    
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
        status
    };
    
    locais.push(novoLocal);
    salvarNoLocalStorage();
    atualizarListaLocais();
    
    // Esconder formulário após adicionar
    formContainer.style.display = 'none';
    
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

function editarLocal(id) {
    const local = locais.find(local => local.id === id);
    
    // Preencher o formulário com os dados do local
    document.getElementById('rep').value = local.rep;
    document.getElementById('endereco').value = local.endereco;
    document.getElementById('status').value = local.status;
    
    // Remover o local da lista
    locais = locais.filter(local => local.id !== id);
    salvarNoLocalStorage();
    atualizarListaLocais();
    
    // Mostrar formulário para edição
    formContainer.style.display = 'block';
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
            <td colspan="4" style="text-align: center;">Nenhum local encontrado</td>
        `;
        listaLocais.appendChild(tr);
        return;
    }
    
    locaisFiltrados.forEach(local => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${local.rep}</td>
            <td>${local.endereco}</td>
            <td class="status-${local.status}">${local.status === 'pendente' ? 'Pendente' : 'Concluído'}</td>
            <td>
                <button class="btn-maps" onclick="abrirNoMaps('${local.endereco.replace(/'/g, "\\'")}')">Maps</button>
                <button class="btn-editar" onclick="editarLocal(${local.id})">Editar</button>
                <button class="btn-delete" onclick="excluirLocal(${local.id})">Excluir</button>
            </td>
        `;
        
        listaLocais.appendChild(tr);
    });
}

function mostrarFormulario() {
    formContainer.style.display = 'block';
}

function esconderFormulario() {
    formContainer.style.display = 'none';
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
btnMostrarForm.addEventListener('click', mostrarFormulario);
btnFecharForm.addEventListener('click', esconderFormulario);

// Inicializar a lista de locais
atualizarListaLocais();

// Expor funções para o HTML
window.excluirLocal = excluirLocal;
window.editarLocal = editarLocal;
window.abrirNoMaps = abrirNoMaps; 