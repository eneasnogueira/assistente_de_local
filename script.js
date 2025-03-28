﻿// Array para armazenar os locais
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
const btnArquivarPorRep = document.getElementById('btn-arquivar-por-rep');
const inputAnexos = document.getElementById('anexos');
const listaArquivosSelecionados = document.getElementById('lista-arquivos-selecionados');
const inputImagemParaIA = document.getElementById('imagem-para-ia');
const btnCarregarImagemIA = document.getElementById('btn-carregar-imagem-ia');
const btnPreencherIA = document.getElementById('btn-preencher-ia');
const imagensCarregadas = document.getElementById('imagens-carregadas');
const btnConfigAPI = document.getElementById('btn-config-api');

// Variáveis para armazenar dados
let arquivosParaAnexar = [];
let modoEdicao = false;
let localOriginal = null;
let imagensParaIA = [];
let apiKeyTemporaria = null;

// Variáveis para gravação de áudio
let mediaRecorder = null;
let audioChunks = [];
let gravacaoEmAndamento = false;
let audioGravado = null;

// Garantir que os event listeners funcionem mesmo depois de alterações no DOM
let tentativasFormulario = 0;
const MAX_TENTATIVAS = 10;
const INTERVALO_TENTATIVA = 1000; // 1 segundo

function verificarEAdicionarEventListeners() {
    tentativasFormulario++;
    console.log(`Tentativa ${tentativasFormulario} de configurar event listeners`);
    
    const form = document.getElementById('local-form');
    const btnSalvar = document.getElementById('btn-salvar-local');
    
    if (form) {
        console.log("Formulário encontrado, configurando listeners");
        
        // Remover e adicionar novamente o listener para evitar duplicação
        const novoForm = form.cloneNode(true);
        if (form.parentNode) {
            form.parentNode.replaceChild(novoForm, form);
            
            // Adicionar o listener no novo form
            novoForm.addEventListener('submit', function(e) {
                console.log("Formulário submetido (listener principal)");
                e.preventDefault();
                adicionarLocal(e);
                return false;
            });
            
            // Também encontrar o botão de submit no novo form
            const novoBtnSalvar = novoForm.querySelector('button[type="submit"]');
            if (novoBtnSalvar) {
                novoBtnSalvar.addEventListener('click', function(e) {
                    console.log("Botão submit clicado (dentro do form)");
                    e.preventDefault();
                    adicionarLocal(e);
                    return false;
                });
            }
        }
    } else {
        console.error("Formulário não encontrado!");
    }
    
    // Adicionar listener direto no botão de salvar também
    if (btnSalvar) {
        console.log("Botão salvar encontrado, adicionando listener direto");
        btnSalvar.addEventListener('click', function(e) {
            console.log("Botão salvar clicado (listener direto)");
            e.preventDefault();
            adicionarLocal(e);
            return false;
        });
    } else {
        console.error("Botão salvar não encontrado!");
    }
    
    // Se ainda não encontrou ou se precisamos tentar novamente
    if ((!form || !btnSalvar) && tentativasFormulario < MAX_TENTATIVAS) {
        console.log(`Agendando nova tentativa em ${INTERVALO_TENTATIVA}ms`);
        setTimeout(verificarEAdicionarEventListeners, INTERVALO_TENTATIVA);
    }
}

// Iniciar a verificação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM carregado, iniciando verificação de formulário");
    verificarEAdicionarEventListeners();
    
    // Adicionar listeners para botões principais
    const btnMostrarForm = document.getElementById('btn-mostrar-form');
    if (btnMostrarForm) {
        console.log("Botão mostrar form encontrado");
        btnMostrarForm.addEventListener('click', function() {
            console.log("Botão mostrar form clicado");
            abrirModal();
            
            // Tentar configurar os listeners novamente quando o modal for aberto
            setTimeout(verificarEAdicionarEventListeners, 300);
        });
    }
});

// Funções de criptografia para segurança da API key
async function derivarChave(senha, salt) {
    const encoder = new TextEncoder();
    const senhaCodificada = encoder.encode(senha);
    
    // Importar senha como material de chave
    const chaveBase = await crypto.subtle.importKey(
        'raw',
        senhaCodificada,
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    
    // Derivar chave de criptografia a partir da senha
    return await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        chaveBase,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function criptografarChaveAPI(chaveAPI, senhaUsuario) {
    try {
        const encoder = new TextEncoder();
        const dadosCodificados = encoder.encode(chaveAPI);
        
        // Gerar salt aleatório
        const salt = crypto.getRandomValues(new Uint8Array(16));
        // Gerar vetor de inicialização aleatório
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Derivar chave de criptografia da senha
        const chave = await derivarChave(senhaUsuario, salt);
        
        // Criptografar a chave API
        const dadosCriptografados = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            chave,
            dadosCodificados
        );
        
        // Converter para format que pode ser armazenado
        return {
            dados: Array.from(new Uint8Array(dadosCriptografados)),
            iv: Array.from(iv),
            salt: Array.from(salt)
        };
    } catch (erro) {
        console.error('Erro ao criptografar:', erro);
        throw erro;
    }
}

async function descriptografarChaveAPI(dadosCriptografados, senhaUsuario) {
    try {
        // Converter de volta para ArrayBuffer
        const dadosArray = new Uint8Array(dadosCriptografados.dados);
        const iv = new Uint8Array(dadosCriptografados.iv);
        const salt = new Uint8Array(dadosCriptografados.salt);
        
        // Derivar a mesma chave de criptografia
        const chave = await derivarChave(senhaUsuario, salt);
        
        // Descriptografar
        const dadosDescriptografados = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            chave,
            dadosArray
        );
        
        // Converter de volta para string
        const decoder = new TextDecoder();
        return decoder.decode(dadosDescriptografados);
    } catch (erro) {
        console.error('Erro ao descriptografar (senha incorreta ou dados corrompidos):', erro);
        return null;
    }
}

// Função para inicializar a chave da API ao carregar a página
async function inicializarChaveAPI() {
    const chaveCriptografada = localStorage.getItem('openai_api_key_segura');
    if (chaveCriptografada) {
        try {
            const dadosCriptografados = JSON.parse(chaveCriptografada);
            // Solicitar senha ao usuário para descriptografar
            const senha = prompt('Por favor, insira sua senha para acessar a chave da API:');
            if (senha) {
                const chaveDescriptografada = await descriptografarChaveAPI(dadosCriptografados, senha);
                if (chaveDescriptografada) {
                    apiKeyTemporaria = chaveDescriptografada;
                    return true;
                }
            }
        } catch (erro) {
            console.error('Erro ao inicializar chave API:', erro);
        }
    }
    return false;
}

// Função para obter chave API segura
async function obterChaveAPI() {
    // Se já temos a chave temporária, retornar ela
    if (apiKeyTemporaria) {
        return apiKeyTemporaria;
    }
    
    // Tentar obter a chave criptografada
    const chaveCriptografada = localStorage.getItem('openai_api_key_segura');
    
    if (chaveCriptografada) {
        try {
            const dadosCriptografados = JSON.parse(chaveCriptografada);
            // Solicitar senha ao usuário para descriptografar
            const senha = prompt('Por favor, insira sua senha para acessar a chave da API:');
            if (senha) {
                const chaveDescriptografada = await descriptografarChaveAPI(dadosCriptografados, senha);
                if (chaveDescriptografada) {
                    apiKeyTemporaria = chaveDescriptografada;
                    return chaveDescriptografada;
                }
            }
        } catch (erro) {
            console.error('Erro ao obter chave API:', erro);
        }
    }
    
    // Se não existir ou não conseguir descriptografar, solicitar ao usuário
    const modal = document.createElement('div');
    modal.className = 'modal-overlay modal-visible';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="form-header">
                <h3><i class="fa-solid fa-key"></i> Configuração da API</h3>
                <button type="button" class="btn-fechar-modal">&times;</button>
            </div>
            
            <div class="form-group">
                <label for="api-key">Chave da API OpenAI:</label>
                <input type="password" id="api-key" placeholder="Digite sua chave da API">
                <small class="form-text text-muted">
                    Sua chave será armazenada localmente e usada apenas para transcrição de áudio.
                </small>
            </div>
            
            <div class="form-group">
                <label for="senha-api">Senha para proteger sua chave:</label>
                <input type="password" id="senha-api" placeholder="Crie uma senha para proteger sua chave">
                <small class="form-text text-muted">
                    Esta senha será usada para criptografar sua chave API. Você precisará dela para usar a IA.
                </small>
            </div>
            
            <div class="modal-buttons">
                <button class="btn-cancelar">
                    <i class="fa-solid fa-times"></i>
                    Cancelar
                </button>
                <button class="btn-confirmar">
                    <i class="fa-solid fa-check"></i>
                    Salvar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Retornar uma Promise que será resolvida com a chave da API
    return new Promise((resolve, reject) => {
        const btnConfirmar = modal.querySelector('.btn-confirmar');
        const btnCancelar = modal.querySelector('.btn-cancelar');
        const btnFechar = modal.querySelector('.btn-fechar-modal');
        
        const fecharModal = () => {
            document.body.removeChild(modal);
        };
        
        btnConfirmar.addEventListener('click', async () => {
            const apiKeyInput = document.getElementById('api-key');
            const senhaInput = document.getElementById('senha-api');
            const chave = apiKeyInput.value.trim();
            const senha = senhaInput.value.trim();
            
            if (chave && senha) {
                try {
                    // Salvar a chave criptografada
                    const resultado = await salvarChaveAPISegura(chave, senha);
                    if (resultado) {
                        apiKeyTemporaria = chave;
                        fecharModal();
                        resolve(chave);
                    } else {
                        alert('Erro ao salvar a chave. Tente novamente.');
                    }
                } catch (erro) {
                    console.error('Erro ao salvar chave:', erro);
                    alert('Erro ao salvar a chave: ' + erro.message);
                }
            } else {
                alert('Por favor, preencha todos os campos.');
            }
        });
        
        btnCancelar.addEventListener('click', () => {
            fecharModal();
            reject(new Error('Operação cancelada pelo usuário'));
        });
        
        btnFechar.addEventListener('click', fecharModal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                fecharModal();
                reject(new Error('Operação cancelada pelo usuário'));
            }
        });
    });
}

// Inicializar a chave da API quando a página carregar
// document.addEventListener('DOMContentLoaded', inicializarChaveAPI);

// Adicionar diagnóstico para resolver o problema do botão Adicionar
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM carregado: Inicializando diagnóstico de formulário");
    
    // Verificar elementos críticos
    const form = document.getElementById('local-form');
    const btnSalvarLocal = document.getElementById('btn-salvar-local');
    
    if (form) {
        console.log("Formulário local-form encontrado");
        
        // Garantir que o evento de submit esteja funcionando
        form.addEventListener('submit', function(e) {
            console.log("Formulário submetido!", e);
            e.preventDefault();
            
            const rep = document.getElementById('rep').value;
            const endereco = document.getElementById('endereco').value;
            
            console.log("Tentando adicionar local:", rep, endereco);
            
            // Chamar a função original
            adicionarLocal(e);
        });
    } else {
        console.error("ERRO: Formulário local-form NÃO encontrado!");
    }
    
    if (btnSalvarLocal) {
        console.log("Botão salvar local encontrado");
        btnSalvarLocal.addEventListener('click', function(e) {
            console.log("Botão Salvar clicado!");
            // O botão já faz parte do formulário, então não precisamos fazer nada especial aqui
        });
    } else {
        console.error("ERRO: Botão salvar NÃO encontrado!");
    }
});

// Função para salvar chave API de forma segura
async function salvarChaveAPISegura(chaveAPI, senha) {
    if (!chaveAPI || !senha) return false;
    
    try {
        const chaveCriptografada = await criptografarChaveAPI(chaveAPI, senha);
        localStorage.setItem('openai_api_key_segura', JSON.stringify(chaveCriptografada));
        
        // Armazenar temporariamente para uso na sessão atual
        apiKeyTemporaria = chaveAPI;
        
        // Remover chave não segura se existir
        if (localStorage.getItem('openai_api_key')) {
            localStorage.removeItem('openai_api_key');
        }
        
        return true;
    } catch (erro) {
        console.error('Erro ao salvar chave:', erro);
        return false;
    }
}

// Limpar chave temporária ao fechar ou recarregar a página
window.addEventListener('beforeunload', () => {
    apiKeyTemporaria = null;
});

// Funções
function salvarNoLocalStorage() {
    localStorage.setItem('locais', JSON.stringify(locais));
}

function adicionarLocal(e) {
    // Impedir o comportamento padrão de envio do formulário
    if (e) e.preventDefault();
    
    console.log("Função adicionarLocal executando...");
    
    // Obter valores dos campos
    const rep = document.getElementById('rep').value.trim();
    const endereco = document.getElementById('endereco').value.trim();
    const comPrazo = document.getElementById('comPrazo').checked;
    const nomeVitima = document.getElementById('nomeVitima').value.trim();
    const telefoneVitima = document.getElementById('telefoneVitima').value.trim();
    const tipoExame = document.getElementById('tipoExame').value.trim();
    const resumoCaso = document.getElementById('resumoCaso').value.trim();
    
    console.log("Campos obtidos:", {rep, endereco, comPrazo});
    
    // Validação básica
    if (!rep || !endereco) {
        alert('Por favor, preencha o número de REP e o endereço.');
        console.error("Validação falhou: REP ou endereço vazios");
        return;
    }
    
    // Verificar se o REP já existe, apenas se não estiver editando o mesmo REP
    if (!modoEdicao) {
        const existeRep = locais.some(local => local.rep === rep);
        if (existeRep) {
            alert('Já existe um local com este número de REP!');
            console.error("REP duplicado:", rep);
            return;
        }
    } else if (modoEdicao && localOriginal && localOriginal.rep !== rep) {
        // Se estiver editando, mas mudou o número REP, verificar se o novo REP já existe
        const existeRep = locais.some(local => local.rep === rep);
        if (existeRep) {
            alert('Já existe um local com este número de REP!');
            console.error("REP duplicado (durante edição):", rep);
            return;
        }
    }
    
    // Criar o objeto do novo local
    const novoLocal = {
        id: modoEdicao && localOriginal ? localOriginal.id : Date.now(),
        rep,
        endereco,
        status: modoEdicao && localOriginal ? localOriginal.status : 'pendente',
        comPrazo,
        nomeVitima,
        telefoneVitima,
        tipoExame,
        resumoCaso,
        anexos: arquivosParaAnexar || [],
        anotacoes: modoEdicao && localOriginal ? localOriginal.anotacoes : ''
    };
    
    console.log("Novo local criado:", novoLocal);
    
    // Adicionar o local à lista
    try {
        if (modoEdicao && localOriginal) {
            // Se estiver em modo de edição, remover o local original
            console.log("Removendo local original no modo edição:", localOriginal.id);
            locais = locais.filter(local => local.id !== localOriginal.id);
        }
        
        // Adicionar o novo local
        locais.push(novoLocal);
        console.log("Local adicionado com sucesso");
        
        // Salvar no localStorage
        salvarNoLocalStorage();
        
        // Atualizar a lista de locais
        atualizarListaLocais();
        
        // Resetar modo de edição
        modoEdicao = false;
        localOriginal = null;
        
        // Esconder formulário após adicionar
        fecharModal();
        
        // Limpar formulário e arquivos temporários
        if (form) form.reset();
        arquivosParaAnexar = [];
        if (listaArquivosSelecionados) listaArquivosSelecionados.innerHTML = '';
        
        console.log("Operação concluída com sucesso");
    } catch (erro) {
        console.error("Erro ao adicionar local:", erro);
        alert("Ocorreu um erro ao salvar o local: " + erro.message);
    }
}

function processarArquivosSelecionados() {
    // Não limpar arquivosParaAnexar para manter os arquivos já anexados
    
    if (inputAnexos.files.length === 0) return;
    
    Array.from(inputAnexos.files).forEach(arquivo => {
        const leitor = new FileReader();
        
        leitor.onload = function(e) {
            const novoAnexo = {
                nome: arquivo.name,
                tipo: arquivo.type,
                tamanho: arquivo.size,
                conteudo: e.target.result,
                dataAnexo: new Date().toISOString()
            };
            
            arquivosParaAnexar.push(novoAnexo);
            
            // Adicionar item à lista visual
            const itemArquivo = document.createElement('div');
            itemArquivo.className = 'item-arquivo';
            itemArquivo.innerHTML = `
                <i class="fa-solid fa-file"></i>
                <span>${arquivo.name}</span>
                <span class="tamanho-arquivo">(${formatarTamanhoArquivo(arquivo.size)})</span>
                <button type="button" class="btn-remover-anexo" data-index="${arquivosParaAnexar.length - 1}">
                    <i class="fa-solid fa-times"></i>
                </button>
            `;
            
            listaArquivosSelecionados.appendChild(itemArquivo);
            
            // Adicionar evento para o botão de remover
            const btnRemover = itemArquivo.querySelector('.btn-remover-anexo');
            btnRemover.addEventListener('click', function() {
                const index = parseInt(this.dataset.index);
                arquivosParaAnexar.splice(index, 1);
                atualizarListaArquivosSelecionados();
            });
        };
        
        leitor.readAsDataURL(arquivo);
    });
    
    // Limpar o input de arquivo para permitir selecionar o mesmo arquivo novamente
    inputAnexos.value = '';
}

function formatarTamanhoArquivo(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
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
    
    // Guardar referência ao local original
    localOriginal = local;
    modoEdicao = true;
    
    // Preencher o formulário com os dados do local
    document.getElementById('rep').value = local.rep;
    document.getElementById('endereco').value = local.endereco;
    document.getElementById('comPrazo').checked = local.comPrazo || false;
    document.getElementById('nomeVitima').value = local.nomeVitima || '';
    document.getElementById('telefoneVitima').value = local.telefoneVitima || '';
    document.getElementById('tipoExame').value = local.tipoExame || '';
    document.getElementById('resumoCaso').value = local.resumoCaso || '';
    
    // Carregar anexos existentes
    arquivosParaAnexar = local.anexos ? [...local.anexos] : [];
    
    // Limpar e atualizar a lista visual de arquivos
    listaArquivosSelecionados.innerHTML = '';
    atualizarListaArquivosSelecionados();
    
    // Remover o local da lista
    locais = locais.filter(local => local.id !== id);
    salvarNoLocalStorage();
    atualizarListaLocais();
    
    // Mostrar formulário para edição
    abrirModal();
}

function atualizarListaArquivosSelecionados() {
    listaArquivosSelecionados.innerHTML = '';
    
    if (!arquivosParaAnexar.length) return;
    
    arquivosParaAnexar.forEach((anexo, index) => {
        const itemArquivo = document.createElement('div');
        itemArquivo.className = 'item-arquivo';
        itemArquivo.innerHTML = `
            <i class="fa-solid fa-file"></i>
            <span>${anexo.nome}</span>
            <span class="tamanho-arquivo">(${formatarTamanhoArquivo(anexo.tamanho)})</span>
            <button type="button" class="btn-remover-anexo" data-index="${index}">
                <i class="fa-solid fa-times"></i>
            </button>
        `;
        
        listaArquivosSelecionados.appendChild(itemArquivo);
    });
    
    // Adicionar eventos para botões de remover
    document.querySelectorAll('.btn-remover-anexo').forEach(btn => {
        btn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            arquivosParaAnexar.splice(index, 1);
            atualizarListaArquivosSelecionados();
        });
    });
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

function abrirAnexo(conteudo, tipo, nome) {
    const novaJanela = window.open('', '_blank');
    if (tipo.startsWith('image/')) {
        novaJanela.document.write(`
            <html>
                <head>
                    <title>${nome}</title>
                    <style>
                        body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f0f0f0; }
                        img { max-width: 95%; max-height: 95%; object-fit: contain; }
                    </style>
                </head>
                <body>
                    <img src="${conteudo}" alt="${nome}">
                </body>
            </html>
        `);
    } else if (tipo === 'application/pdf') {
        novaJanela.document.write(`
            <html>
                <head>
                    <title>${nome}</title>
                    <style>
                        body { margin: 0; height: 100vh; }
                        iframe { width: 100%; height: 100%; border: none; }
                    </style>
                </head>
                <body>
                    <iframe src="${conteudo}" type="application/pdf"></iframe>
                </body>
            </html>
        `);
    } else {
        // Para outros tipos de arquivo, tenta abrir diretamente ou fazer download
        novaJanela.document.write(`
            <html>
                <head>
                    <title>${nome}</title>
                    <style>
                        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                        a { display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px; }
                    </style>
                </head>
                <body>
                    <h1>Visualização de arquivo</h1>
                    <p>O navegador pode não conseguir exibir este tipo de arquivo (${tipo}) diretamente.</p>
                    <a href="${conteudo}" download="${nome}">Baixar arquivo</a>
                </body>
            </html>
        `);
    }
    novaJanela.document.close();
}

function atualizarListaLocais() {
    listaLocais.innerHTML = '';
    
    const filtro = filtroStatus.value;
    
    let locaisFiltrados = filtro === 'todos' 
        ? locais 
        : locais.filter(local => local.status === filtro);
    
    // Ordenar locais primeiro por status (pendentes primeiro)
    // depois por cidade/bairro (não identificados primeiro)
    // e finalmente por data de atendimento
    locaisFiltrados = locaisFiltrados.sort((a, b) => {
        // Primeiro critério: status (pendentes primeiro)
        if (filtro === 'todos') {
            if (a.status === 'pendente' && b.status !== 'pendente') return -1;
            if (a.status !== 'pendente' && b.status === 'pendente') return 1;
        }
        
        // Segundo critério: cidade não identificada primeiro
        const aCidadeNaoIdentificada = !a.cidade || a.cidade === "Cidade não identificada";
        const bCidadeNaoIdentificada = !b.cidade || b.cidade === "Cidade não identificada";
        if (aCidadeNaoIdentificada && !bCidadeNaoIdentificada) return -1;
        if (!aCidadeNaoIdentificada && bCidadeNaoIdentificada) return 1;
        
        // Terceiro critério: ordenar por cidade
        if (a.cidade && b.cidade && a.cidade !== b.cidade) {
            return a.cidade.localeCompare(b.cidade);
        }
        
        // Quarto critério: ordenar por bairro
        if (a.bairro && b.bairro && a.bairro !== b.bairro) {
            return a.bairro.localeCompare(b.bairro);
        }
        
        // Quinto critério: ordenar por data de atendimento (mais recentes primeiro)
        if ((a.status === 'atendido' || a.status === 'arquivado') && 
            (b.status === 'atendido' || b.status === 'arquivado')) {
            if (a.dataAtendimento && b.dataAtendimento) {
                return new Date(b.dataAtendimento) - new Date(a.dataAtendimento);
            }
            if (a.dataAtendimento) return -1;
            if (b.dataAtendimento) return 1;
        }
        
        return 0;
    });
    
    if (locaisFiltrados.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="5" style="text-align: center;">Nenhum local encontrado</td>
        `;
        listaLocais.appendChild(tr);
        return;
    }
    
    // Variáveis para controlar os headers
    let cidadeAtual = null;
    let bairroAtual = null;
    
    locaisFiltrados.forEach(local => {
        // Adicionar header de cidade se mudou
        if (local.cidade && local.cidade !== cidadeAtual) {
            cidadeAtual = local.cidade;
            const trCidade = document.createElement('tr');
            trCidade.className = 'cidade-header';
            trCidade.innerHTML = `
                <td colspan="5" class="cidade-nome">
                    <i class="fa-solid fa-city"></i> ${local.cidade}
                </td>
            `;
            listaLocais.appendChild(trCidade);
            bairroAtual = null; // Resetar bairro atual ao mudar de cidade
        }
        
        // Adicionar header de bairro se mudou
        if (local.bairro && local.bairro !== bairroAtual) {
            bairroAtual = local.bairro;
            const trBairro = document.createElement('tr');
            trBairro.className = 'bairro-header';
            trBairro.innerHTML = `
                <td colspan="5" class="bairro-nome">
                    <i class="fa-solid fa-map-marker-alt"></i> ${local.bairro}
                </td>
            `;
            listaLocais.appendChild(trBairro);
        }
        
        // Renderizar local normalmente
        const temDetalhes = local.nomeVitima || local.telefoneVitima || local.tipoExame || local.resumoCaso || (local.anexos && local.anexos.length > 0);
        
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
            <td class="status-${local.status} ${local.comPrazo ? 'com-prazo' : ''}">
                <span class="status-indicator"></span>
                <span class="status-text">
                    ${local.status === 'pendente' ? 'Pendente' : 
                    local.status === 'atendido' ? 'Atendido' : 
                    'Arquivado'}
                    ${local.anotacoes ? ' <i class="fa-solid fa-note-sticky"></i>' : ''}
                    ${local.preservacao && local.preservacao.preservado === 'sim' ? ' <i class="fa-solid fa-shield-alt" style="color: #27ae60;" title="Local preservado"></i>' : ''}
                </span>
            </td>
            <td>
                <div class="acoes-container">
                    ${local.status === 'pendente' ? 
                        `<button class="btn-maps" onclick="abrirNoMaps('${local.endereco.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-map-location-dot"></i> Maps
                        </button>
                        <button class="btn-atender" onclick="mudarStatusLocal('${local.id}')">
                            <i class="fa-solid fa-clipboard-check"></i> Atender
                        </button>` : 
                        `<button class="btn-ver-anotacoes" onclick="mudarStatusLocal('${local.id}')">
                            <i class="fa-solid fa-note-sticky"></i> Ver Anotações
                        </button>`
                    }
                </div>
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
            
            // Adicionar anexos se existirem
            if (local.anexos && local.anexos.length > 0) {
                detalhesHTML += `<div class="detalhe-item">
                    <span class="detalhe-label"><i class="fa-solid fa-paperclip"></i> Anexos:</span>
                    <div class="lista-anexos">`;
                
                local.anexos.forEach((anexo, index) => {
                    detalhesHTML += `
                        <div class="anexo-item">
                            <i class="fa-solid fa-file"></i>
                            <a href="#" onclick="abrirAnexo('${anexo.conteudo}', '${anexo.tipo}', '${anexo.nome.replace(/'/g, "\\'")}'); return false;">
                                ${anexo.nome}
                            </a>
                            <span class="tamanho-arquivo">(${formatarTamanhoArquivo(anexo.tamanho)})</span>
                        </div>
                    `;
                });
                
                detalhesHTML += `</div></div>`;
            }
            
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
    console.log("abrirModal: Abrindo modal de formulário");
    
    // Ao abrir para um novo local, limpar os arquivos
    if (document.getElementById('rep').value === '') {
        console.log("abrirModal: Limpando dados para novo local");
        arquivosParaAnexar = [];
        listaArquivosSelecionados.innerHTML = '';
        
        // Limpar imagens para IA
        imagensParaIA = [];
        imagensCarregadas.innerHTML = '';
        btnPreencherIA.disabled = true;
        
        // Se não estiver em modo de edição, resetar as variáveis de controle
        if (!modoEdicao) {
            localOriginal = null;
        }
    }
    
    modalOverlay.classList.add('modal-visible');
    
    // Garantir que o formulário tenha o evento de submit
    const formElement = document.getElementById('local-form');
    if (formElement) {
        console.log("abrirModal: Adicionando event listener ao formulário");
        
        // Remover listeners antigos para evitar duplicação
        const novoForm = formElement.cloneNode(true);
        formElement.parentNode.replaceChild(novoForm, formElement);
        
        // Adicionar novo listener
        novoForm.addEventListener('submit', function(e) {
            console.log("Formulário submetido via modal");
            e.preventDefault();
            adicionarLocal(e);
        });
        
        // Garantir que o botão de salvar também funcione
        const btnSalvar = document.getElementById('btn-salvar-local');
        if (btnSalvar) {
            btnSalvar.addEventListener('click', function(e) {
                console.log("Botão salvar clicado no modal");
                e.preventDefault();
                adicionarLocal(e);
            });
        }
    } else {
        console.error("abrirModal: Formulário não encontrado!");
    }
}

function fecharModal() {
    // Se estiver em modo de edição e cancelar, restaurar o local original
    if (modoEdicao && localOriginal) {
        locais.push(localOriginal);
        salvarNoLocalStorage();
        atualizarListaLocais();
        modoEdicao = false;
        localOriginal = null;
    }
    
    modalOverlay.classList.remove('modal-visible');
    form.reset();
    arquivosParaAnexar = [];
    listaArquivosSelecionados.innerHTML = '';
    
    // Limpar imagens para IA
    imagensParaIA = [];
    imagensCarregadas.innerHTML = '';
    btnPreencherIA.disabled = true;
}

function salvarParaArquivo() {
    if (locais.length === 0) {
        alert('Não há locais para salvar!');
        return;
    }
    
    // Obter a data atual e formatá-la como dd_mm_aaaa
    const dataAtual = new Date();
    const dia = String(dataAtual.getDate()).padStart(2, '0');
    const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
    const ano = dataAtual.getFullYear();
    const dataFormatada = `${dia}_${mes}_${ano}`;
    
    const dadosJSON = JSON.stringify(locais, null, 2);
    const blob = new Blob([dadosJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `Casos em ${dataFormatada}.json`;
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

// Funções para carregar imagens para IA
function carregarImagensParaIA() {
    inputImagemParaIA.click();
}

// Função para processar arquivos selecionados (imagens ou PDFs)
async function processarImagensSelecionadas(e) {
    const arquivos = e.target.files;
    
    if (arquivos.length === 0) return;
    
    // Mostrar indicador de carregamento
    const btnTextoOriginal = btnCarregarImagemIA.innerHTML;
    btnCarregarImagemIA.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';
    btnCarregarImagemIA.disabled = true;
    
    try {
        // Limpar a lista visual
        imagensCarregadas.innerHTML = '';
        // Limpar array de imagens
        imagensParaIA = [];
        
        for (const arquivo of Array.from(arquivos)) {
            if (arquivo.type.startsWith('image/')) {
                // Se for uma imagem, adicionar diretamente
                imagensParaIA.push(arquivo);
                
                // Adicionar à interface visual
                const imgItem = document.createElement('div');
                imgItem.className = 'imagem-item';
                imgItem.innerHTML = `
                    <i class="fa-solid fa-image"></i>
                    <span>${arquivo.name}</span>
                    <span class="tamanho-arquivo">(${formatarTamanhoArquivo(arquivo.size)})</span>
                `;
                
                imagensCarregadas.appendChild(imgItem);
            } else if (arquivo.type === 'application/pdf') {
                // Se for um PDF, converter em imagens
                try {
                    // Adicionar um indicador de conversão para este PDF
                    const pdfItem = document.createElement('div');
                    pdfItem.className = 'pdf-convertendo';
                    pdfItem.innerHTML = `
                        <i class="fa-solid fa-file-pdf"></i>
                        <span>${arquivo.name}</span>
                        <span class="status-conversao">Convertendo para imagem... <i class="fa-solid fa-spinner fa-spin"></i></span>
                    `;
                    imagensCarregadas.appendChild(pdfItem);
                    
                    // Anexar o PDF original ao caso
                    const leitor = new FileReader();
                    leitor.onload = function(e) {
                        const novoAnexo = {
                            nome: arquivo.name,
                            tipo: arquivo.type,
                            tamanho: arquivo.size,
                            conteudo: e.target.result,
                            dataAnexo: new Date().toISOString()
                        };
                        
                        arquivosParaAnexar.push(novoAnexo);
                    };
                    leitor.readAsDataURL(arquivo);
                    
                    // Converter o PDF em imagens
                    const imagens = await converterPdfParaImagens(arquivo);
                    
                    // Remover o indicador de conversão
                    imagensCarregadas.removeChild(pdfItem);
                    
                    // Adicionar as imagens à lista
                    imagens.forEach(imagem => {
                        imagensParaIA.push(imagem);
                        
                        const imgItem = document.createElement('div');
                        imgItem.className = 'imagem-item';
                        imgItem.innerHTML = `
                            <i class="fa-solid fa-image"></i>
                            <span>${imagem.name}</span>
                            <span class="tamanho-arquivo">(${formatarTamanhoArquivo(imagem.size)})</span>
                        `;
                        
                        imagensCarregadas.appendChild(imgItem);
                    });
                } catch (error) {
                    console.error(`Erro ao converter PDF ${arquivo.name}:`, error);
                    
                    // Mostrar erro na interface
                    const erroPdfItem = document.createElement('div');
                    erroPdfItem.className = 'pdf-erro';
                    erroPdfItem.innerHTML = `
                        <i class="fa-solid fa-file-pdf"></i>
                        <span>${arquivo.name}</span>
                        <span class="erro-conversao">Erro na conversão: ${error.message}</span>
                    `;
                    imagensCarregadas.appendChild(erroPdfItem);
                }
            } else {
                alert(`O arquivo "${arquivo.name}" não é uma imagem ou PDF. Por favor, selecione apenas arquivos de imagem ou PDF.`);
            }
        }
        
    } catch (error) {
        console.error('Erro ao processar arquivos:', error);
        alert(`Erro ao processar arquivos: ${error.message}`);
    } finally {
        // Restaurar o estado do botão
        btnCarregarImagemIA.innerHTML = btnTextoOriginal;
        btnCarregarImagemIA.disabled = false;
        
        // Habilitar botão de preencher com IA se houver imagens carregadas
        btnPreencherIA.disabled = imagensParaIA.length === 0;
        
        // Limpar o input de arquivo para permitir selecionar os mesmos arquivos novamente
        e.target.value = '';
    }
}

// Função para processar imagens com ChatGPT-4o
async function preencherFormularioComIA() {
    if (imagensParaIA.length === 0) {
        alert('Você precisa carregar imagens antes de usar a IA!');
        return;
    }
    
    // Mostrar indicador de carregamento
    const btnTextoOriginal = btnPreencherIA.innerHTML;
    btnPreencherIA.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';
    btnPreencherIA.disabled = true;
    
    try {
        // Obter a chave da API de forma segura
        const apiKey = await obterChaveAPI();
        
        if (!apiKey) {
            // Se não há chave configurada, redirecionar para a configuração
            alert('É necessário configurar uma chave API para usar este recurso.');
            configurarAPI();
            throw new Error('Chave de API não configurada');
        }

        // Construir mensagens para o ChatGPT com imagens em base64
        const imagePromises = imagensParaIA.map(imgFile => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    // Adicionar a imagem como anexo
                    const imageContent = e.target.result;
                    
                    // Adicionar aos anexos do caso
                    const novoAnexo = {
                        nome: imgFile.name,
                        tipo: imgFile.type,
                        tamanho: imgFile.size,
                        conteudo: imageContent,
                        dataAnexo: new Date().toISOString()
                    };
                    
                    // Adicionar à lista de anexos
                    arquivosParaAnexar.push(novoAnexo);
                    
                    resolve({
                        type: "image_url",
                        image_url: {
                            url: imageContent,
                            detail: "high"
                        }
                    });
                };
                reader.onerror = (e) => reject(e);
                reader.readAsDataURL(imgFile);
            });
        });
        
        const imageContents = await Promise.all(imagePromises);
        
        // Atualizar a lista visual de anexos
        atualizarListaArquivosSelecionados();
        
        const messages = [
            {
                role: "system", 
                content: "Você é um assistente especializado em extrair informações de imagens de casos forenses. Em documentos oficiais, o número de REP é um identificador único que geralmente aparece carimbado no documento junto à palavra 'REP'. IMPORTANTE: A cidade do endereço do local é sempre a mesma cidade da delegacia que emitiu o Boletim de Ocorrência (BO) e enviou a requisição. Extraia as seguintes informações se disponíveis: número de REP (apenas se estiver do lado da palavra 'REP'), endereço completo, nome da vítima, telefone da vítima, tipo de exame (Constatação de furto, Constatação de danos, etc) e um resumo do caso (descrição do que foi furtado ou danificado). Forneça apenas essas informações em formato JSON."
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Analise estas imagens e extraia as seguintes informações: número de REP, endereço completo, nome da vítima, telefone da vítima, tipo de exame e um resumo do caso. IMPORTANTE: O número de REP deve ser extraído apenas quando estiver próximo à palavra 'REP' ou em um carimbo que contenha 'REP'. Se não houver menção explícita à palavra 'REP', deixe o campo de número REP vazio. A cidade do endereço é sempre a mesma cidade da delegacia que emitiu o BO. Retorne APENAS no formato JSON como este exemplo: {\"rep\":\"12345\",\"endereco\":\"Rua Exemplo, 123\",\"nomeVitima\":\"Nome da Pessoa\",\"telefoneVitima\":\"(11) 99999-9999\",\"tipoExame\":\"Tipo do exame\",\"resumoCaso\":\"Breve resumo do caso\"}. Se algum campo não for encontrado, deixe-o como string vazia."
                    },
                    ...imageContents
                ]
            }
        ];
        
        // Enviar para a API do ChatGPT
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: messages,
                max_tokens: 1000
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro na API: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        
        // Extrair a resposta JSON
        const assistantMessage = data.choices[0].message.content;
        let extractedData;
        
        try {
            // Tentar extrair JSON diretamente
            extractedData = JSON.parse(assistantMessage);
        } catch (e) {
            // Se falhar, tentar encontrar um objeto JSON no texto
            const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                extractedData = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Não foi possível extrair dados JSON da resposta');
            }
        }
        
        // Preencher o formulário com os dados extraídos
        if (extractedData.rep) document.getElementById('rep').value = extractedData.rep;
        if (extractedData.endereco) document.getElementById('endereco').value = extractedData.endereco;
        if (extractedData.nomeVitima) document.getElementById('nomeVitima').value = extractedData.nomeVitima;
        if (extractedData.telefoneVitima) document.getElementById('telefoneVitima').value = extractedData.telefoneVitima;
        if (extractedData.tipoExame) document.getElementById('tipoExame').value = extractedData.tipoExame;
        if (extractedData.resumoCaso) document.getElementById('resumoCaso').value = extractedData.resumoCaso;
        
        // Atualizar a lista visual de anexos (para garantir que todos os anexos estejam visíveis)
        atualizarListaArquivosSelecionados();
        
        // Mostrar mensagem de sucesso
        alert(`Formulário preenchido com sucesso usando IA!\n\n${imagensParaIA.length} arquivo(s) foram processados e anexados ao caso.`);
        
    } catch (error) {
        console.error('Erro ao processar imagens com IA:', error);
        alert(`Erro ao processar imagens: ${error.message}`);
    } finally {
        // Restaurar o estado do botão
        btnPreencherIA.innerHTML = btnTextoOriginal;
        btnPreencherIA.disabled = false;
    }
}

// Funções para configurar a API
function configurarAPI() {
    // Verificar se já existe uma chave criptografada
    const temChaveCriptografada = localStorage.getItem('openai_api_key_segura') !== null;
    
    // Criar e mostrar o modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay modal-visible';
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="form-header">
                <h3><i class="fa-solid fa-key"></i> Configurar API Key</h3>
                <button type="button" class="btn-fechar-modal">&times;</button>
            </div>
            
            <div class="form-group">
                <label for="apiKey">API Key da OpenAI:</label>
                <div class="api-key-input-container">
                    <input type="password" id="apiKey" class="form-control" value="" placeholder="Cole sua API Key aqui">
                    <button type="button" class="btn-toggle-password" id="togglePassword">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <small class="form-text text-muted">
                    <i class="fa-solid fa-info-circle"></i>
                    A API Key é necessária para extrair dados da requisição e BOs. 
                    <a href="https://platform.openai.com/api-keys" target="_blank" class="api-key-link">
                        Obtenha sua chave aqui
                    </a>
                </small>
            </div>
            
            <div class="form-group">
                <label for="senhaAPI">Senha para proteger sua chave:</label>
                <div class="api-key-input-container">
                    <input type="password" id="senhaAPI" class="form-control" value="" placeholder="Crie uma senha para proteger sua chave">
                    <button type="button" class="btn-toggle-password" id="toggleSenha">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
                <small class="form-text text-muted">
                    <i class="fa-solid fa-shield-alt"></i>
                    Esta senha será usada para criptografar sua chave API. Você precisará dela para usar a IA.
                </small>
            </div>
            
            <div class="form-group">
                <label for="confirmaSenhaAPI">Confirme a senha:</label>
                <input type="password" id="confirmaSenhaAPI" class="form-control" value="" placeholder="Confirme sua senha">
                <small class="form-text text-muted">
                    <i class="fa-solid fa-exclamation-triangle"></i>
                    Anote esta senha! Se esquecê-la, precisará configurar sua chave API novamente.
                </small>
            </div>
            
            <div class="modal-buttons">
                <button type="button" class="btn-confirmar" id="btnSalvarApiKey">
                    <i class="fa-solid fa-save"></i>
                    Salvar
                </button>
                <button type="button" class="btn-cancelar">
                    <i class="fa-solid fa-times"></i>
                    Cancelar
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Adicionar funcionalidade de mostrar/ocultar senha
    const togglePassword = modal.querySelector('#togglePassword');
    const apiKeyInput = modal.querySelector('#apiKey');
    
    togglePassword.addEventListener('click', function() {
        const type = apiKeyInput.getAttribute('type') === 'password' ? 'text' : 'password';
        apiKeyInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });
    
    // Adicionar funcionalidade de mostrar/ocultar senha de proteção
    const toggleSenha = modal.querySelector('#toggleSenha');
    const senhaInput = modal.querySelector('#senhaAPI');
    
    toggleSenha.addEventListener('click', function() {
        const type = senhaInput.getAttribute('type') === 'password' ? 'text' : 'password';
        senhaInput.setAttribute('type', type);
        this.querySelector('i').classList.toggle('fa-eye');
        this.querySelector('i').classList.toggle('fa-eye-slash');
    });
    
    // Evento para fechar o modal
    const fecharModal = () => {
        document.body.removeChild(modal);
    };
    
    // Adicionar event listeners
    modal.querySelector('.btn-fechar-modal').addEventListener('click', fecharModal);
    modal.querySelector('.btn-cancelar').addEventListener('click', fecharModal);
    
    // Quando clicar fora do modal, fechar
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            fecharModal();
        }
    });
    
    // Quando pressionar ESC, fechar
    document.addEventListener('keydown', function escListener(e) {
        if (e.key === 'Escape') {
            fecharModal();
            document.removeEventListener('keydown', escListener);
        }
    });
    
    // Salvar a API key
    modal.querySelector('#btnSalvarApiKey').addEventListener('click', async function() {
        const novaChave = apiKeyInput.value.trim();
        const senha = senhaInput.value.trim();
        const confirmaSenha = modal.querySelector('#confirmaSenhaAPI').value.trim();
        
        if (novaChave === '') {
            alert('Por favor, insira uma chave de API válida.');
            return;
        }
        
        if (senha === '') {
            alert('Por favor, insira uma senha para proteger sua chave API.');
            return;
        }
        
        if (senha !== confirmaSenha) {
            alert('As senhas não coincidem. Por favor, verifique.');
            return;
        }
        
        try {
            // Salvar chave criptografada
            const resultado = await salvarChaveAPISegura(novaChave, senha);
            
            if (resultado) {
                alert('Chave da API salva com segurança!');
                fecharModal();
            } else {
                alert('Erro ao salvar a chave. Verifique a senha e tente novamente.');
            }
        } catch (erro) {
            console.error('Erro ao criptografar chave:', erro);
            alert('Ocorreu um erro ao salvar a chave: ' + erro.message);
        }
    });
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
btnArquivarPorRep.addEventListener('click', arquivarPorRep);
inputAnexos.addEventListener('change', processarArquivosSelecionados);
btnCarregarImagemIA.addEventListener('click', carregarImagensParaIA);
inputImagemParaIA.addEventListener('change', processarImagensSelecionadas);
btnPreencherIA.addEventListener('click', preencherFormularioComIA);
btnConfigAPI.addEventListener('click', configurarAPI);
document.getElementById('btn-ordenar-ia').addEventListener('click', ordenarPorBairroIA);

// Adicionar event listener para a tecla Esc
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('modal-visible')) {
        fecharModal();
    }
});

// Fechar modal ao clicar fora do conteúdo
modalOverlay.addEventListener('click', function(e) {
    if (e.target === modalOverlay) {
        fecharModal();
    }
});

// Inicializar a lista de locais
atualizarListaLocais();

// Expor funções para o escopo global para serem acessíveis através de eventos inline
window.abrirNoMaps = abrirNoMaps;
window.toggleDetalhes = toggleDetalhes;
window.abrirAnexo = abrirAnexo;
window.extrairAnotacoes = extrairAnotacoes;
window.marcarComoAtendido = marcarComoAtendido;
window.mudarStatusLocal = mudarStatusLocal;

// Função para marcar local como atendido
function marcarComoAtendido(index) {
    const local = locais[index];
    
    // Confirmar a ação
    if (confirm(`Deseja marcar o local REP ${local.rep} como atendido?`)) {
        // Atualizar o status
        local.status = 'atendido';
        
        // Salvar no localStorage
        salvarNoLocalStorage();
        
        // Atualizar a lista
        atualizarListaLocais();
    }
}

// Função para converter um PDF em imagens
async function converterPdfParaImagens(pdfFile) {
    // Carregar a biblioteca
    const pdfjsLib = window.pdfjsLib;
    
    // Configurar o caminho para o worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    
    try {
        // Ler o arquivo como array buffer
        const arrayBuffer = await pdfFile.arrayBuffer();
        
        // Carregar o documento PDF
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        const numPaginas = pdf.numPages;
        const imagens = [];
        
        // Para cada página do PDF
        for (let i = 1; i <= numPaginas; i++) {
            // Obter a página
            const pagina = await pdf.getPage(i);
            
            // Definir escala de renderização
            const escala = 1.5;
            const viewport = pagina.getViewport({ scale: escala });
            
            // Criar um canvas para renderizar a página
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            // Renderizar a página no canvas
            await pagina.render({
                canvasContext: context,
                viewport: viewport
            }).promise;
            
            // Converter o canvas para uma imagem
            const imagemData = canvas.toDataURL('image/jpeg', 0.8);
            
            // Criar um arquivo de imagem a partir do Data URL
            const resposta = await fetch(imagemData);
            const blob = await resposta.blob();
            const nomeImagem = `${pdfFile.name.replace('.pdf', '')}_pagina_${i}.jpg`;
            const imagemFile = new File([blob], nomeImagem, { type: 'image/jpeg' });
            
            imagens.push(imagemFile);
        }
        
        return imagens;
    } catch (error) {
        console.error("Erro ao converter PDF:", error);
        throw new Error(`Não foi possível converter o PDF: ${error.message}`);
    }
}

// Função para ordenar locais por bairro usando IA
async function ordenarPorBairroIA() {
    // Obter os locais filtrados pelo status atual
    const filtro = filtroStatus.value;
    const locaisFiltrados = filtro === 'todos' 
        ? locais 
        : locais.filter(local => local.status === filtro);

    if (locaisFiltrados.length === 0) {
        alert('Não há locais para ordenar!');
        return;
    }

    // Mostrar indicador de carregamento
    const btnOrdenarIA = document.getElementById('btn-ordenar-ia');
    const btnTextoOriginal = btnOrdenarIA.innerHTML;
    btnOrdenarIA.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processando...';
    btnOrdenarIA.disabled = true;

    try {
        // Obter a chave da API de forma segura
        const apiKey = await obterChaveAPI();
        
        if (!apiKey) {
            // Se não há chave configurada, redirecionar para a configuração
            alert('É necessário configurar uma chave API para usar este recurso.');
            configurarAPI();
            throw new Error('Chave de API não configurada');
        }

        // Preparar os dados dos endereços para enviar para a API
        const enderecos = locaisFiltrados.map(local => ({
            id: local.id,
            rep: local.rep,
            endereco: local.endereco
        }));

        // Construir mensagens para o ChatGPT
        const messages = [
            {
                role: "system", 
                content: "Você é um assistente especializado em extrair e categorizar informações geográficas de endereços."
            },
            {
                role: "user",
                content: `Analise os seguintes endereços e extraia a cidade e o bairro de cada um. Se não conseguir identificar exatamente, faça sua melhor estimativa baseada nas informações disponíveis. Agrupe primeiro por cidade e depois por bairro. Retorne APENAS no formato JSON como este exemplo: { "cidades": [ { "nome": "Nome da Cidade", "bairros": [ { "nome": "Nome do Bairro", "locais": [ids dos locais] } ] } ] }. Não inclua nenhum texto adicional. Aqui estão os endereços: ${JSON.stringify(enderecos)}`
            }
        ];
        
        // Enviar para a API do ChatGPT
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: messages,
                max_tokens: 1500
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro na API: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        const data = await response.json();
        
        // Extrair a resposta JSON
        const assistantMessage = data.choices[0].message.content;
        let resultados;
        
        try {
            // Tentar extrair JSON diretamente
            resultados = JSON.parse(assistantMessage);
        } catch (e) {
            // Se falhar, tentar encontrar um objeto JSON no texto
            const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                resultados = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('Não foi possível extrair dados JSON da resposta');
            }
        }

        // Reordenar os locais com base nos grupos de cidades e bairros
        if (resultados && resultados.cidades && Array.isArray(resultados.cidades)) {
            // Criar cópia dos locais atuais
            const locaisOrdenados = [];
            
            // Criar um conjunto de IDs já processados
            const idsProcessados = new Set();
            
            // Criar um conjunto de todos os IDs que têm cidade/bairro identificado
            const idsComCidadeBairro = new Set();
            resultados.cidades.forEach(cidade => {
                cidade.bairros.forEach(bairro => {
                    bairro.locais.forEach(id => {
                        idsComCidadeBairro.add(id);
                        // Salvar cidade e bairro no local correspondente
                        const local = locais.find(l => l.id === id);
                        if (local) {
                            local.cidade = cidade.nome;
                            local.bairro = bairro.nome;
                        }
                    });
                });
            });
            
            // Marcar locais não identificados
            locais.forEach(local => {
                if (!idsComCidadeBairro.has(local.id)) {
                    local.cidade = "Cidade não identificada";
                    local.bairro = "Bairro não identificado";
                }
            });
            
            // Salvar no localStorage para persistir as alterações
            salvarNoLocalStorage();
            
            // Encontrar locais não processados (sem cidade/bairro identificado)
            const locaisNaoProcessados = locaisFiltrados.filter(local => 
                !local.isCidadeHeader && 
                !local.isBairroHeader && 
                !idsComCidadeBairro.has(local.id)
            );
            
            // Se houver locais não processados, adicionar uma seção especial para eles NO TOPO
            if (locaisNaoProcessados.length > 0) {
                locaisOrdenados.push({
                    isCidadeHeader: true,
                    cidade: "Cidade ou bairro não encontrados"
                });
                locaisOrdenados.push(...locaisNaoProcessados);
                
                // Adicionar IDs processados
                locaisNaoProcessados.forEach(local => idsProcessados.add(local.id));
            }
            
            // Para cada cidade
            resultados.cidades.forEach(cidade => {
                let temLocaisNaCidade = false;
                const locaisDaCidade = [];

                // Verificar cada bairro da cidade
                cidade.bairros.forEach(bairro => {
                    const locaisDoBairro = bairro.locais
                        .map(id => locaisFiltrados.find(l => l.id === id))
                        .filter(local => local !== undefined && !idsProcessados.has(local.id));

                    if (locaisDoBairro.length > 0) {
                        temLocaisNaCidade = true;
                        // Adicionar cabeçalho de bairro e seus locais
                        locaisDaCidade.push({
                            isBairroHeader: true,
                            cidade: cidade.nome,
                            bairro: bairro.nome
                        });
                        locaisDaCidade.push(...locaisDoBairro);
                        
                        // Adicionar IDs processados
                        locaisDoBairro.forEach(local => idsProcessados.add(local.id));
                    }
                });

                // Se houver locais nesta cidade, adicionar o cabeçalho da cidade e seus locais
                if (temLocaisNaCidade) {
                    locaisOrdenados.push({
                        isCidadeHeader: true,
                        cidade: cidade.nome
                    });
                    locaisOrdenados.push(...locaisDaCidade);
                }
            });
            
            // Atualize a lista de locais temporariamente (sem salvar)
            const locaisOriginal = [...locais];
            locais = locaisOrdenados;
            
            // Atualizar a visualização
            atualizarListaLocaisAgrupados();
            
            // Restaurar o array original, mas manter a visualização
            locais = locaisOriginal;
        } else {
            throw new Error('Formato de resposta inválido ou sem grupos de cidades/bairros');
        }
    } catch (error) {
        console.error('Erro ao ordenar por cidade/bairro:', error);
        alert(`Erro ao ordenar por cidade/bairro: ${error.message}`);
        // Restaurar visualização normal
        atualizarListaLocais();
    } finally {
        // Restaurar o estado do botão
        btnOrdenarIA.innerHTML = btnTextoOriginal;
        btnOrdenarIA.disabled = false;
    }
}

// Função para atualizar a lista de locais agrupados por cidade e bairro
function atualizarListaLocaisAgrupados() {
    listaLocais.innerHTML = '';
    
    const filtro = filtroStatus.value;
    
    // Filtrar os headers e locais pelo status
    let locaisFiltrados = locais.filter(local => {
        if (local.isCidadeHeader || local.isBairroHeader) return true; // Sempre mostrar headers
        return filtro === 'todos' ? true : local.status === filtro;
    });
    
    // Ordenar locais atendidos e arquivados por data de atendimento (mais recentes primeiro)
    // mas preservando a estrutura de headers
    if (filtro === 'atendido' || filtro === 'arquivado' || filtro === 'todos') {
        // Primeiro, separar headers e locais
        const headers = locaisFiltrados.filter(local => local.isCidadeHeader || local.isBairroHeader);
        const locaisReais = locaisFiltrados.filter(local => !local.isCidadeHeader && !local.isBairroHeader);
        
        // Ordenar apenas os locais reais
        locaisReais.sort((a, b) => {
            // Manter pendentes na ordem atual
            if (a.status === 'pendente' && b.status === 'pendente') return 0;
            
            // Sempre mostrar pendentes primeiro se estiver mostrando todos
            if (filtro === 'todos') {
                if (a.status === 'pendente') return -1;
                if (b.status === 'pendente') return 1;
            }
            
            // Ordenar atendidos e arquivados por data (mais recentes primeiro)
            if ((a.status === 'atendido' || a.status === 'arquivado') && 
                (b.status === 'atendido' || b.status === 'arquivado')) {
                // Se ambos têm data de atendimento, ordenar por data (mais recente primeiro)
                if (a.dataAtendimento && b.dataAtendimento) {
                    return new Date(b.dataAtendimento) - new Date(a.dataAtendimento);
                }
                // Se apenas um tem data, colocar o que tem data primeiro
                if (a.dataAtendimento) return -1;
                if (b.dataAtendimento) return 1;
            }
            
            return 0;
        });
        
        // Manter a estrutura de cidades e bairros, mas com locais ordenados
        // (este é um processamento mais complexo, fora do escopo dessa implementação simples)
        // Por enquanto, vamos apenas usar a função normal para visualização agrupada
    }
    
    if (locaisFiltrados.length === 0 || locaisFiltrados.every(local => local.isCidadeHeader || local.isBairroHeader)) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td colspan="5" style="text-align: center;">Nenhum local encontrado</td>
        `;
        listaLocais.appendChild(tr);
        return;
    }
    
    locaisFiltrados.forEach(local => {
        if (local.isCidadeHeader) {
            // Renderizar cabeçalho de cidade
            const trCidade = document.createElement('tr');
            trCidade.className = 'cidade-header';
            trCidade.innerHTML = `
                <td colspan="5" class="cidade-nome">
                    <i class="fa-solid fa-city"></i> ${local.cidade}
                </td>
            `;
            listaLocais.appendChild(trCidade);
            return;
        }
        
        if (local.isBairroHeader) {
            // Renderizar cabeçalho de bairro
            const trBairro = document.createElement('tr');
            trBairro.className = 'bairro-header';
            trBairro.innerHTML = `
                <td colspan="5" class="bairro-nome">
                    <i class="fa-solid fa-map-marker-alt"></i> ${local.bairro}
                </td>
            `;
            listaLocais.appendChild(trBairro);
            return;
        }
        
        // Renderizar local normalmente
        const temDetalhes = local.nomeVitima || local.telefoneVitima || local.tipoExame || local.resumoCaso || (local.anexos && local.anexos.length > 0);
        
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
            <td class="status-${local.status} ${local.comPrazo ? 'com-prazo' : ''}">
                <span class="status-indicator"></span>
                <span class="status-text">
                    ${local.status === 'pendente' ? 'Pendente' : 
                    local.status === 'atendido' ? 'Atendido' : 
                    'Arquivado'}
                    ${local.anotacoes ? ' <i class="fa-solid fa-note-sticky"></i>' : ''}
                    ${local.preservacao && local.preservacao.preservado === 'sim' ? ' <i class="fa-solid fa-shield-alt" style="color: #27ae60;" title="Local preservado"></i>' : ''}
                </span>
            </td>
            <td>
                <div class="acoes-container">
                    ${local.status === 'pendente' ? 
                        `<button class="btn-maps" onclick="abrirNoMaps('${local.endereco.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-map-location-dot"></i> Maps
                        </button>
                        <button class="btn-atender" onclick="mudarStatusLocal('${local.id}')">
                            <i class="fa-solid fa-clipboard-check"></i> Atender
                        </button>` : 
                        `<button class="btn-ver-anotacoes" onclick="mudarStatusLocal('${local.id}')">
                            <i class="fa-solid fa-note-sticky"></i> Ver Anotações
                        </button>`
                    }
                </div>
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
            
            // Adicionar anexos se existirem
            if (local.anexos && local.anexos.length > 0) {
                detalhesHTML += `<div class="detalhe-item">
                    <span class="detalhe-label"><i class="fa-solid fa-paperclip"></i> Anexos:</span>
                    <div class="lista-anexos">`;
                
                local.anexos.forEach((anexo, index) => {
                    detalhesHTML += `
                        <div class="anexo-item">
                            <i class="fa-solid fa-file"></i>
                            <a href="#" onclick="abrirAnexo('${anexo.conteudo}', '${anexo.tipo}', '${anexo.nome.replace(/'/g, "\\'")}'); return false;">
                                ${anexo.nome}
                            </a>
                            <span class="tamanho-arquivo">(${formatarTamanhoArquivo(anexo.tamanho)})</span>
                        </div>
                    `;
                });
                
                detalhesHTML += `</div></div>`;
            }
            
            detalhesHTML += '</td>';
            
            trDetalhes.innerHTML = detalhesHTML;
            listaLocais.appendChild(trDetalhes);
        }
    });
}

// Carregar locais do localStorage ao iniciar
window.addEventListener('DOMContentLoaded', () => {
    const locaisArmazenados = localStorage.getItem('locais');
    if (locaisArmazenados) {
        locais = JSON.parse(locaisArmazenados);
    }
    
    // Verificar se há uma chave no formato antigo para migrar
    verificarEMigrarChaveAntiga();
    
    // Garantir que o filtro comece com "pendente" selecionado
    filtroStatus.value = 'pendente';
    atualizarListaLocais();
});

// Função para verificar e migrar chave da API no formato antigo
async function verificarEMigrarChaveAntiga() {
    const chaveAntiga = localStorage.getItem('openai_api_key');
    
    if (chaveAntiga && !localStorage.getItem('openai_api_key_segura')) {
        console.log('Detectada chave API no formato antigo. Iniciando migração...');
        
        try {
            // Solicitar ao usuário que crie uma senha para proteger a chave
            const senha = prompt(
                'Detectamos que você já possui uma chave da API da OpenAI armazenada no formato antigo. ' +
                'Para aumentar a segurança, precisamos criptografá-la. ' +
                'Por favor, crie uma senha para proteger sua chave:'
            );
            
            if (senha) {
                // Migrar para o formato seguro
                const resultado = await salvarChaveAPISegura(chaveAntiga, senha);
                
                if (resultado) {
                    alert('Sua chave da API foi migrada com sucesso para um formato mais seguro!');
                } else {
                    alert('Não foi possível migrar sua chave para o formato seguro. Por favor, configure-a novamente.');
                }
            } else {
                // Se o usuário cancelar, manter ambas as formas por enquanto
                console.log('Migração de chave cancelada pelo usuário.');
            }
        } catch (erro) {
            console.error('Erro ao migrar chave:', erro);
        }
    }
}

function arquivarPorRep() {
    const rep = prompt('Digite o número de REP do local que deseja arquivar:');
    if (!rep) return;
    
    const local = locais.find(l => l.rep === rep);
    if (!local) {
        alert('Não foi encontrado nenhum local com este número de REP!');
        return;
    }
    
    // Obter data e hora atual formatada para arquivamento
    const dataHoraArquivamento = new Date();
    const dataArquivamentoFormatada = dataHoraArquivamento.toLocaleDateString('pt-BR');
    const horaArquivamentoFormatada = dataHoraArquivamento.toLocaleTimeString('pt-BR');
    const dataHoraArquivamentoFormatada = `${dataArquivamentoFormatada} às ${horaArquivamentoFormatada}`;
    
    // Atualizar o status para arquivado com data
    local.status = 'arquivado';
    
    // Armazenar data de arquivamento como atributo do objeto
    local.dataArquivamento = dataHoraArquivamento;
    local.dataArquivamentoFormatada = dataHoraArquivamentoFormatada;
    
    // Se o local não tinha sido atendido anteriormente, adicionar data de atendimento também
    if (!local.dataAtendimento) {
        local.dataAtendimento = dataHoraArquivamento.toISOString();
        local.dataAtendimentoFormatada = dataHoraArquivamentoFormatada;
    }
    
    // Salvar no localStorage
    salvarNoLocalStorage();
    
    // Atualizar a lista
    atualizarListaLocais();
    
    // Confirmar ao usuário
    alert(`O local REP ${local.rep} foi arquivado com sucesso!`);
}

function mudarStatusLocal(localId) {
    // Encontrar o local pelo ID
    const localIndex = locais.findIndex(l => l.id == localId);
    if (localIndex === -1) {
        console.error('Local não encontrado:', localId);
        return;
    }
    
    const local = locais[localIndex];
    
    if (local.status === 'arquivado') return; // Não permite mudar status de arquivado
    
    if (local.status === 'pendente') {
        // Resetar variáveis de gravação de áudio
        audioGravado = null;
        audioChunks = [];
        gravacaoEmAndamento = false;
        if (mediaRecorder) {
            try {
                mediaRecorder.stop();
            } catch (e) {}
            mediaRecorder = null;
        }
        
        // Criar o modal de anotações
        const modal = document.createElement('div');
        modal.className = 'modal-overlay modal-visible';
        
        // Obter data e hora atual formatada para início do atendimento
        const dataHoraInicio = new Date();
        const dataInicioFormatada = dataHoraInicio.toLocaleDateString('pt-BR');
        const horaInicioFormatada = dataHoraInicio.toLocaleTimeString('pt-BR');
        const dataHoraInicioFormatada = `${dataInicioFormatada} às ${horaInicioFormatada}`;
        
        // Armazenar data de início do atendimento temporariamente no objeto do modal
        modal.dataInicioAtendimento = dataHoraInicio;
        modal.dataInicioAtendimentoFormatada = dataHoraInicioFormatada;
        
        modal.innerHTML = `
            <div class="modal-content anotacoes-modal">
                <div class="form-header">
                    <h3><i class="fa-solid fa-clipboard-check"></i> Atendimento do Caso</h3>
                    <button type="button" class="btn-fechar-modal">&times;</button>
                </div>
                
                <div class="form-group">
                    <p><strong>REP:</strong> ${local.rep}</p>
                    <p><strong>Endereço:</strong> ${local.endereco}</p>
                    <p><strong>Início do atendimento:</strong> ${dataHoraInicioFormatada}</p>
                </div>
                
                <div class="form-group">
                    <label for="anotacoes-caso">Anotações:</label>
                    <textarea id="anotacoes-caso" rows="5" placeholder="Digite suas anotações sobre o atendimento...">${local.anotacoes || ''}</textarea>
                </div>
                
                <div class="form-group audio-recorder-container">
                    <label><i class="fa-solid fa-microphone"></i> Gravação de Áudio:</label>
                    <div class="audio-controls">
                        <button type="button" id="btn-gravar-audio" class="btn-gravar-audio">
                            <i class="fa-solid fa-microphone"></i> Gravar
                        </button>
                    </div>
                    <div id="audio-preview-container"></div>
                </div>
                
                <div class="preservacao-container" style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px; border: 1px solid #e9ecef;">
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <label style="font-weight: bold; margin-right: 10px;">Preservado:</label>
                        <div style="display: flex; gap: 15px;">
                            <label style="display: flex; align-items: center; cursor: pointer;">
                                <input type="radio" name="preservado" value="não" checked id="preservado-nao" style="margin-right: 5px;">
                                Não
                            </label>
                            <label style="display: flex; align-items: center; cursor: pointer;">
                                <input type="radio" name="preservado" value="sim" id="preservado-sim" style="margin-right: 5px;">
                                Sim
                            </label>
                        </div>
                    </div>
                    
                    <div id="campos-preservacao" style="display: none;">
                        <div style="margin-bottom: 15px;">
                            <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 16px;">Equipe de Preservação</h4>
                            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
                                <div>
                                    <label style="display: block; margin-bottom: 5px;">Oficial</label>
                                    <input type="text" id="preservacao-oficial" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px;">Registro</label>
                                    <input type="text" id="preservacao-registro" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px;">Viatura</label>
                                    <input type="text" id="preservacao-viatura" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                </div>
                            </div>
                        </div>
                        
                        <div style="margin-top: 20px;">
                            <h4 style="margin-top: 0; margin-bottom: 10px; font-size: 16px;">Autoridade no Local</h4>
                            <div>
                                <label style="display: block; margin-bottom: 5px;">Delegado(a)</label>
                                <input type="text" id="preservacao-delegado" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-buttons">
                    <button class="btn-cancelar">
                        <i class="fa-solid fa-times"></i>
                        Cancelar
                    </button>
                    <button class="btn-confirmar">
                        <i class="fa-solid fa-check"></i>
                        Confirmar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Adicionar eventos para os botões de gravação de áudio
        const btnGravar = document.getElementById('btn-gravar-audio');
        btnGravar.addEventListener('click', alternarGravacao);
        
        // Controle de exibição dos campos de preservação
        const preservadoSimRadio = modal.querySelector('#preservado-sim');
        const preservadoNaoRadio = modal.querySelector('#preservado-nao');
        const camposPreservacao = modal.querySelector('#campos-preservacao');
        
        // Se o local já tiver informações de preservação, carregar os valores
        if (local.preservacao) {
            if (local.preservacao.preservado === 'sim') {
                preservadoSimRadio.checked = true;
                camposPreservacao.style.display = 'block';
                
                if (local.preservacao.oficial) modal.querySelector('#preservacao-oficial').value = local.preservacao.oficial;
                if (local.preservacao.registro) modal.querySelector('#preservacao-registro').value = local.preservacao.registro;
                if (local.preservacao.viatura) modal.querySelector('#preservacao-viatura').value = local.preservacao.viatura;
                if (local.preservacao.delegado) modal.querySelector('#preservacao-delegado').value = local.preservacao.delegado;
            }
        }
        
        // Eventos para mostrar/esconder campos de preservação
        preservadoSimRadio.addEventListener('change', () => {
            camposPreservacao.style.display = 'block';
        });
        
        preservadoNaoRadio.addEventListener('change', () => {
            camposPreservacao.style.display = 'none';
        });
        
        // Adicionar horário de início do atendimento ao abrir o modal
        // Esta linha foi removida, pois agora salvamos a data no objeto do modal
        
        modal.querySelector('.btn-confirmar').addEventListener('click', async () => {
            try {
                const anotacoes = document.getElementById('anotacoes-caso').value;
                
                // Verificar se o local está preservado
                const preservado = preservadoSimRadio.checked ? 'sim' : 'não';
                
                // Obter data e hora atual formatada para finalização
                const dataHoraFim = new Date();
                const dataFimFormatada = dataHoraFim.toLocaleDateString('pt-BR');
                const horaFimFormatada = dataHoraFim.toLocaleTimeString('pt-BR');
                const dataHoraFimFormatada = `${dataFimFormatada} às ${horaFimFormatada}`;
                
                // Agora salvamos as datas como atributos do objeto local
                locais[localIndex].dataInicioAtendimento = modal.dataInicioAtendimento;
                locais[localIndex].dataInicioAtendimentoFormatada = modal.dataInicioAtendimentoFormatada;
                locais[localIndex].dataFimAtendimento = dataHoraFim;
                locais[localIndex].dataFimAtendimentoFormatada = dataHoraFimFormatada;
                
                // Salvar as anotações sem adicionar as marcações de tempo
                locais[localIndex].anotacoes = anotacoes;
                locais[localIndex].status = 'atendido';
                
                // Adicionar data e hora do atendimento
                locais[localIndex].dataAtendimento = dataHoraFim.toISOString();
                locais[localIndex].dataAtendimentoFormatada = dataHoraFimFormatada;
                
                // Adicionar informações de preservação
                locais[localIndex].preservacao = {
                    preservado: preservado
                };
                
                // Se preservado, adicionar informações da equipe e delegado
                if (preservado === 'sim') {
                    locais[localIndex].preservacao.oficial = document.getElementById('preservacao-oficial').value;
                    locais[localIndex].preservacao.registro = document.getElementById('preservacao-registro').value;
                    locais[localIndex].preservacao.viatura = document.getElementById('preservacao-viatura').value;
                    locais[localIndex].preservacao.delegado = document.getElementById('preservacao-delegado').value;
                }
                
                // Finalizar gravação se estiver em andamento e obter o áudio
                if (gravacaoEmAndamento) {
                    await finalizarGravacao();
                }
                
                // Se temos áudio gravado, salvar no objeto local
                if (audioGravado && audioGravado.blob) {
                    // Converter o blob para base64
                    const audioBase64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(audioGravado.blob);
                    });
                    
                    // Adicionar áudio ao objeto local
                    locais[localIndex].audio = {
                        conteudo: audioBase64,
                        tipo: 'audio/wav',
                        dataGravacao: audioGravado.dataGravacao,
                        dataGravacaoFormatada: new Date(audioGravado.dataGravacao).toLocaleString()
                    };
                }
                
                // Limpar variáveis de gravação
                if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                    try {
                        mediaRecorder.stop();
                    } catch (e) {}
                }
                if (mediaRecorder && mediaRecorder.stream) {
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }
                
                // Salvar no localStorage
                salvarNoLocalStorage();
                
                // Atualizar a interface
                if (document.querySelector('.cidade-header') || document.querySelector('.bairro-header')) {
                    atualizarListaLocaisAgrupados();
                } else {
                    atualizarListaLocais();
                }
                
                // Remover o modal
                document.body.removeChild(modal);
                
            } catch (error) {
                console.error('Erro ao finalizar atendimento:', error);
                alert('Ocorreu um erro ao salvar o atendimento. Tente novamente.');
            }
        });
        
        // Fechar modal ao clicar no botão cancelar
        modal.querySelector('.btn-cancelar').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        // Fechar modal ao clicar no botão X
        modal.querySelector('.btn-fechar-modal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Fechar modal ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
        
        // Fechar modal ao pressionar Esc
        document.addEventListener('keydown', function escListener(e) {
            if (e.key === 'Escape') {
                fecharModal();
                document.removeEventListener('keydown', escListener);
            }
        });
    } else if (local.status === 'atendido' || local.status === 'arquivado') {
        // Exibir modal com as anotações
        const modal = document.createElement('div');
        modal.className = 'modal-overlay modal-visible';
        
        let iconeStatus = '';
        let tituloStatus = '';
        
        if (local.status === 'atendido') {
            iconeStatus = 'fa-clipboard-check';
            tituloStatus = 'Caso Atendido';
        } else if (local.status === 'arquivado') {
            iconeStatus = 'fa-box-archive';
            tituloStatus = 'Caso Arquivado';
        }
        
        // Verificar se há anotações
        const temAnotacoes = local.anotacoes && local.anotacoes.trim() !== '';
        // Verificar se há áudio
        const temAudio = local.audio && local.audio.conteudo;
        
        modal.innerHTML = `
            <div class="modal-content anotacoes-modal">
                <div class="form-header">
                    <h3><i class="fa-solid ${iconeStatus}"></i> ${tituloStatus}</h3>
                    <button type="button" class="btn-fechar-modal">&times;</button>
                </div>
                
                <div class="form-group">
                    <p><strong>REP:</strong> ${local.rep}</p>
                    <p><strong>Endereço:</strong> ${local.endereco}</p>
                    ${local.nomeVitima ? `<p><strong>Nome da Vítima:</strong> ${local.nomeVitima}</p>` : ''}
                    ${local.telefoneVitima ? `<p><strong>Telefone da Vítima:</strong> ${local.telefoneVitima}</p>` : ''}
                    ${local.tipoExame ? `<p><strong>Tipo de Exame:</strong> ${local.tipoExame}</p>` : ''}
                    ${local.resumoCaso ? `<p><strong>Resumo do Caso:</strong> ${local.resumoCaso}</p>` : ''}
                    
                    ${local.dataInicioAtendimentoFormatada ? 
                    `<p><strong>Início do atendimento:</strong> ${local.dataInicioAtendimentoFormatada}</p>` : ''}
                    
                    ${local.dataFimAtendimentoFormatada ?
                    `<p><strong>Fim do atendimento:</strong> ${local.dataFimAtendimentoFormatada}</p>` : ''}
                    
                    ${local.dataArquivamentoFormatada && local.status === 'arquivado' ?
                    `<p><strong>Arquivado em:</strong> ${local.dataArquivamentoFormatada}</p>` : ''}
                </div>
                
                ${temAnotacoes ? `
                <div class="form-group">
                    <label><i class="fa-solid fa-clipboard-list"></i> Anotações do caso:</label>
                    <div class="anotacoes-conteudo">${local.anotacoes}</div>
                </div>
                ` : `
                <div class="anotacoes-vazia">
                    <i class="fa-solid fa-clipboard"></i>
                    <p>Este caso não possui anotações.</p>
                </div>`}
                
                ${temAudio ? `
                <div class="form-group audio-player-container">
                    <label><i class="fa-solid fa-microphone"></i> Áudio do atendimento:</label>
                    <div class="audio-player">
                        <audio controls src="${local.audio.conteudo}"></audio>
                        <div class="audio-info">
                            <span>Gravado em ${local.audio.dataGravacaoFormatada || 'data desconhecida'}</span>
                            <div class="audio-actions">
                                <button type="button" class="btn-baixar-audio" id="btn-baixar-audio-${local.id}">
                                    <i class="fa-solid fa-download"></i> Baixar
                                </button>
                                <button type="button" class="btn-transcrever-audio" id="btn-transcrever-audio-${local.id}">
                                    <i class="fa-solid fa-language"></i> Transcrever
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
                
                ${local.preservacao ? `
                <div class="preservacao-info">
                    <h4>
                        <i class="fa-solid fa-shield-halved"></i>
                        Preservação: <span class="${local.preservacao.preservado === 'sim' ? 'preservado-sim' : 'preservado-nao'}">${local.preservacao.preservado === 'sim' ? 'Sim' : 'Não'}</span>
                    </h4>
                    
                    ${local.preservacao.preservado === 'sim' ? `
                    <div class="equipe-preservacao">
                        <h5>Equipe de Preservação:</h5>
                        <div class="info-preservacao">
                            <div class="info-item">
                                <span class="info-label">Oficial:</span>
                                <span class="info-valor">${local.preservacao.oficial || '-'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Registro:</span>
                                <span class="info-valor">${local.preservacao.registro || '-'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Viatura:</span>
                                <span class="info-valor">${local.preservacao.viatura || '-'}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Delegado:</span>
                                <span class="info-valor">${local.preservacao.delegado || '-'}</span>
                            </div>
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}
                
                <div class="modal-buttons">
                    ${temAnotacoes || temAudio ? `
                    <button class="btn-extrair-anotacoes" id="btn-extrair-${local.id}">
                        <i class="fa-solid fa-copy"></i>
                        Extrair Anotações
                    </button>
                    ` : ''}
                    <button class="btn-fechar">
                        <i class="fa-solid fa-times"></i>
                        Fechar
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Adicionar o event listener para o botão de extrair anotações
        if (temAnotacoes || temAudio) {
            const btnExtrair = modal.querySelector(`#btn-extrair-${local.id}`);
            if (btnExtrair) {
                btnExtrair.addEventListener('click', function() {
                    extrairAnotacoes(local);
                });
            }
        }
        
        // Adicionar evento para o botão de baixar áudio
        if (temAudio) {
            const btnBaixarAudio = modal.querySelector(`#btn-baixar-audio-${local.id}`);
            if (btnBaixarAudio) {
                btnBaixarAudio.addEventListener('click', function() {
                    // Criar um elemento de link para download
                    const link = document.createElement('a');
                    link.href = local.audio.conteudo;
                    link.download = `Audio_REP_${local.rep}_${new Date().toISOString().replace(/[:.]/g, '-')}.wav`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                });
            }

            // Adicionar evento para o botão de transcrever áudio
            const btnTranscreverAudio = modal.querySelector(`#btn-transcrever-audio-${local.id}`);
            if (btnTranscreverAudio) {
                btnTranscreverAudio.addEventListener('click', async function() {
                    try {
                        // Desabilitar o botão e mostrar indicador de carregamento
                        btnTranscreverAudio.disabled = true;
                        btnTranscreverAudio.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Transcrevendo...';

                        // Obter a chave da API de forma segura
                        const apiKey = await obterChaveAPI();
                        if (!apiKey) {
                            throw new Error('Chave de API não configurada');
                        }

                        // Converter o áudio base64 para blob
                        const audioBase64 = local.audio.conteudo.split(',')[1];
                        const audioBlob = await fetch(`data:audio/wav;base64,${audioBase64}`).then(r => r.blob());

                        // Criar FormData para enviar o arquivo
                        const formData = new FormData();
                        formData.append('file', audioBlob, 'audio.wav');
                        formData.append('model', 'whisper-1');

                        // Enviar para a API da OpenAI
                        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`
                            },
                            body: formData
                        });

                        if (!response.ok) {
                            throw new Error(`Erro na API: ${response.status}`);
                        }

                        const data = await response.json();
                        const transcricao = data.text;

                        // Adicionar a transcrição às anotações existentes
                        const anotacoesAtuais = local.anotacoes || '';
                        const novaTranscricao = `\n\n=== Transcrição do Áudio ===\n${transcricao}`;
                        local.anotacoes = anotacoesAtuais + novaTranscricao;

                        // Atualizar o localStorage
                        const index = locais.findIndex(l => l.id === local.id);
                        if (index !== -1) {
                            locais[index] = local;
                            localStorage.setItem('locais', JSON.stringify(locais));
                        }

                        // Restaurar o botão
                        btnTranscreverAudio.disabled = false;
                        btnTranscreverAudio.innerHTML = '<i class="fa-solid fa-language"></i> Transcrever';

                        alert('Transcrição concluída com sucesso!');
                        
                        // Fechar o modal atual e reabrir com as anotações atualizadas
                        const modalAtual = document.querySelector('.modal-overlay');
                        if (modalAtual) {
                            document.body.removeChild(modalAtual);
                            setTimeout(() => {
                                mudarStatusLocal(local.id);
                            }, 100);
                        }

                    } catch (erro) {
                        console.error('Erro na transcrição:', erro);
                        alert('Erro ao transcrever o áudio: ' + erro.message);
                        
                        // Restaurar o botão em caso de erro
                        btnTranscreverAudio.disabled = false;
                        btnTranscreverAudio.innerHTML = '<i class="fa-solid fa-language"></i> Transcrever';
                    }
                });
            }
        }
        
        // Eventos dos botões de fechar
        const fecharModal = () => {
            document.body.removeChild(modal);
        };
        
        modal.querySelector('.btn-fechar-modal').addEventListener('click', fecharModal);
        modal.querySelector('.btn-fechar').addEventListener('click', fecharModal);
        
        // Fechar modal ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                fecharModal();
            }
        });
        
        // Fechar modal ao pressionar Esc
        document.addEventListener('keydown', function escListener(e) {
            if (e.key === 'Escape') {
                fecharModal();
                document.removeEventListener('keydown', escListener);
            }
        });
    }
}

// Função para extrair anotações
function extrairAnotacoes(local) {
    const anotacoesContainer = document.createElement('div');
    anotacoesContainer.className = 'anotacoes-container';
    
    // Adicionar cabeçalho das anotações
    anotacoesContainer.innerHTML = `
        <div class="anotacoes-header">
            <h4><i class="fa-solid fa-sticky-note"></i> Anotações do Caso</h4>
        </div>
        <div class="anotacoes-content">
            ${(local.anotacoes || '').replace(/\n/g, '<br>')}
        </div>
    `;
    
    // Adicionar o player de áudio se existir
    if (local.audio) {
        const audioContainer = document.createElement('div');
        audioContainer.className = 'audio-player-container';
        
        audioContainer.innerHTML = `
            <div class="audio-info">
                <i class="fa-solid fa-microphone"></i>
                <span>Áudio do Atendimento</span>
            </div>
            <audio controls>
                <source src="${local.audio.conteudo}" type="audio/wav">
                Seu navegador não suporta o elemento de áudio.
            </audio>
            <div class="audio-actions">
                <button class="btn-baixar-audio">
                    <i class="fa-solid fa-download"></i>
                    Baixar
                </button>
                <button class="btn-transcrever-audio">
                    <i class="fa-solid fa-language"></i>
                    Transcrever
                </button>
            </div>
        `;
        
        // Adicionar event listeners para os botões
        const btnBaixar = audioContainer.querySelector('.btn-baixar-audio');
        const btnTranscrever = audioContainer.querySelector('.btn-transcrever-audio');
        
        if (btnBaixar) {
            btnBaixar.addEventListener('click', () => {
                const link = document.createElement('a');
                link.href = local.audio.conteudo;
                link.download = `audio_atendimento_${local.rep}.wav`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }
        
        if (btnTranscrever) {
            btnTranscrever.addEventListener('click', async function() {
                try {
                    // Desabilitar o botão e mostrar indicador de carregamento
                    btnTranscrever.disabled = true;
                    btnTranscrever.classList.add('loading');
                    btnTranscrever.innerHTML = '<i class="fa-solid fa-spinner"></i> Transcrevendo...';

                    // Obter a chave da API de forma segura
                    const apiKey = await obterChaveAPI();
                    if (!apiKey) {
                        throw new Error('Chave de API não configurada');
                    }

                    // Converter o áudio base64 para blob
                    const audioBase64 = local.audio.conteudo.split(',')[1];
                    const audioBlob = await fetch(`data:audio/wav;base64,${audioBase64}`).then(r => r.blob());

                    // Criar FormData para enviar o arquivo
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'audio.wav');
                    formData.append('model', 'whisper-1');

                    // Enviar para a API da OpenAI
                    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${apiKey}`
                        },
                        body: formData
                    });

                    if (!response.ok) {
                        throw new Error(`Erro na API: ${response.status}`);
                    }

                    const data = await response.json();
                    const transcricao = data.text;

                    // Adicionar a transcrição às anotações existentes
                    const anotacoesAtuais = local.anotacoes || '';
                    const novaTranscricao = `\n\n=== Transcrição do Áudio ===\n${transcricao}`;
                    local.anotacoes = anotacoesAtuais + novaTranscricao;

                    // Atualizar o localStorage
                    const index = locais.findIndex(l => l.id === local.id);
                    if (index !== -1) {
                        locais[index] = local;
                        localStorage.setItem('locais', JSON.stringify(locais));
                    }

                    // Atualizar a exibição das anotações
                    const parent = audioContainer.parentElement;
                    const anotacoesContent = parent.querySelector('.anotacoes-content');
                    if (anotacoesContent) {
                        anotacoesContent.innerHTML = local.anotacoes.replace(/\n/g, '<br>');
                    }

                    // Restaurar o botão
                    btnTranscrever.disabled = false;
                    btnTranscrever.classList.remove('loading');
                    btnTranscrever.innerHTML = '<i class="fa-solid fa-language"></i> Transcrever';

                    alert('Transcrição concluída com sucesso!');

                } catch (erro) {
                    console.error('Erro na transcrição:', erro);
                    alert('Erro ao transcrever o áudio: ' + erro.message);
                    
                    // Restaurar o botão em caso de erro
                    btnTranscrever.disabled = false;
                    btnTranscrever.classList.remove('loading');
                    btnTranscrever.innerHTML = '<i class="fa-solid fa-language"></i> Transcrever';
                }
            });
        }
        
        anotacoesContainer.appendChild(audioContainer);
    }
    
    return anotacoesContainer;
}

// Função para pedir permissão e iniciar a gravação de áudio
async function iniciarGravacaoAudio() {
    try {
        // Verificar se já existe um gravador
        if (gravacaoEmAndamento) {
            alert('Já existe uma gravação em andamento.');
            return;
        }

        // Solicitar permissão para acessar o microfone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Atualizar a interface para mostrar que está gravando
        const btnGravar = document.getElementById('btn-gravar-audio');
        const btnPausar = document.getElementById('btn-pausar-audio');
        const btnParar = document.getElementById('btn-parar-audio');
        
        btnGravar.disabled = true;
        btnPausar.disabled = false;
        btnParar.disabled = false;
        
        // Criar o gravador
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        // Evento para receber os dados do áudio em chunks
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                audioChunks.push(e.data);
            }
        };
        
        // Evento para quando a gravação terminar
        mediaRecorder.onstop = async () => {
            // Combinar todos os chunks em um único blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            
            // Armazenar o áudio para salvar com as notas
            audioGravado = {
                blob: audioBlob,
                url: audioUrl,
                dataGravacao: new Date().toISOString()
            };
            
            // Mostrar o player de áudio na interface
            const playerContainer = document.getElementById('audio-preview-container');
            if (playerContainer) {
                playerContainer.innerHTML = `
                    <div class="audio-preview">
                        <audio controls src="${audioUrl}"></audio>
                        <div class="audio-info">
                            <span>Áudio gravado em ${new Date().toLocaleString()}</span>
                            <button type="button" id="btn-remover-audio" class="btn-remover-audio">
                                <i class="fa-solid fa-trash"></i> Remover
                            </button>
                        </div>
                    </div>
                `;
                
                // Adicionar evento para o botão de remover
                document.getElementById('btn-remover-audio').addEventListener('click', removerAudioGravado);
            }
            
            // Parar todas as faixas do stream (liberar o microfone)
            stream.getTracks().forEach(track => track.stop());
            
            // Resetar estado dos botões
            btnGravar.disabled = false;
            btnPausar.disabled = true;
            btnParar.disabled = true;
        };
        
        // Iniciar a gravação
        mediaRecorder.start();
        gravacaoEmAndamento = true;
        
    } catch (erro) {
        console.error('Erro ao iniciar gravação:', erro);
        alert(`Erro ao iniciar gravação: ${erro.message}`);
    }
}

// Função para pausar/retomar a gravação
function pausarRetomarGravacao() {
    if (!mediaRecorder) return;
    
    const btnPausar = document.getElementById('btn-pausar-audio');
    
    if (mediaRecorder.state === 'recording') {
        mediaRecorder.pause();
        btnPausar.innerHTML = '<i class="fa-solid fa-play"></i> Retomar';
    } else if (mediaRecorder.state === 'paused') {
        mediaRecorder.resume();
        btnPausar.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
    }
}

// Função para parar a gravação
function pararGravacao() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return;
    
    mediaRecorder.stop();
    gravacaoEmAndamento = false;
}

// Função para remover o áudio gravado
function removerAudioGravado() {
    audioGravado = null;
    const playerContainer = document.getElementById('audio-preview-container');
    if (playerContainer) {
        playerContainer.innerHTML = '';
    }
    
    document.getElementById('btn-gravar-audio').disabled = false;
}

// Função para alternar entre gravação e pausa
function alternarGravacao() {
    // Se o gravador não existe, iniciar gravação
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        iniciarGravacao();
    } 
    // Se o gravador existe e está gravando, pausar
    else if (mediaRecorder.state === 'recording') {
        pausarGravacao();
    } 
    // Se o gravador existe e está pausado, retomar gravação
    else if (mediaRecorder.state === 'paused') {
        retomarGravacao();
    }
}

// Função para iniciar a gravação
async function iniciarGravacao() {
    try {
        // Verificar se já existe um gravador ativo (não deveria acontecer, mas por segurança)
        if (gravacaoEmAndamento && mediaRecorder && mediaRecorder.state === 'recording') {
            alert('Já existe uma gravação em andamento.');
            return;
        }

        // Solicitar permissão para acessar o microfone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Atualizar a interface para mostrar que está gravando
        const btnGravar = document.getElementById('btn-gravar-audio');
        btnGravar.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
        btnGravar.classList.remove('btn-gravar-audio');
        btnGravar.classList.add('btn-pausar-audio');
        
        // Criar o gravador
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        // Evento para receber os dados do áudio em chunks
        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                audioChunks.push(e.data);
            }
        };
        
        // Evento para quando a gravação terminar
        mediaRecorder.onstop = async () => {
            // Não fazer nada ao parar, apenas quando finalizar no botão Confirmar
            // Isso permite que o usuário alterne entre gravar e pausar várias vezes
        };
        
        // Iniciar a gravação
        mediaRecorder.start();
        gravacaoEmAndamento = true;
        
    } catch (erro) {
        console.error('Erro ao iniciar gravação:', erro);
        alert(`Erro ao iniciar gravação: ${erro.message}`);
    }
}

// Função para pausar a gravação
function pausarGravacao() {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;
    
    mediaRecorder.pause();
    const btnGravar = document.getElementById('btn-gravar-audio');
    btnGravar.innerHTML = '<i class="fa-solid fa-microphone"></i> Continuar';
    btnGravar.classList.remove('btn-pausar-audio');
    btnGravar.classList.add('btn-retomar-audio');
}

// Função para retomar a gravação
function retomarGravacao() {
    if (!mediaRecorder || mediaRecorder.state !== 'paused') return;
    
    mediaRecorder.resume();
    const btnGravar = document.getElementById('btn-gravar-audio');
    btnGravar.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar';
    btnGravar.classList.remove('btn-retomar-audio');
    btnGravar.classList.add('btn-pausar-audio');
}

// Função para finalizar a gravação e criar o player de áudio
function finalizarGravacao() {
    return new Promise((resolve) => {
        if (!mediaRecorder || !gravacaoEmAndamento) {
            resolve(null);
            return;
        }
        
        // Se estiver gravando ou pausada, parar a gravação
        if (mediaRecorder.state !== 'inactive') {
            // Função a ser chamada quando a gravação for parada
            mediaRecorder.onstop = async () => {
                // Combinar todos os chunks em um único blob
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                // Armazenar o áudio para salvar com as notas
                audioGravado = {
                    blob: audioBlob,
                    url: audioUrl,
                    dataGravacao: new Date().toISOString()
                };
                
                // Mostrar o player de áudio na interface
                const playerContainer = document.getElementById('audio-preview-container');
                if (playerContainer) {
                    playerContainer.innerHTML = `
                        <div class="audio-preview">
                            <audio controls src="${audioUrl}"></audio>
                            <div class="audio-info">
                                <span>Áudio gravado em ${new Date().toLocaleString()}</span>
                            </div>
                        </div>
                    `;
                }
                
                // Parar todas as faixas do stream (liberar o microfone)
                if (mediaRecorder.stream) {
                    mediaRecorder.stream.getTracks().forEach(track => track.stop());
                }
                
                // Resetar estado do botão
                const btnGravar = document.getElementById('btn-gravar-audio');
                if (btnGravar) {
                    btnGravar.disabled = true;
                    btnGravar.innerHTML = '<i class="fa-solid fa-check"></i> Gravado';
                    btnGravar.classList.remove('btn-pausar-audio', 'btn-retomar-audio');
                    btnGravar.classList.add('btn-gravado');
                }
                
                // Resolver a promessa com o áudio gravado
                resolve(audioGravado);
            };
            
            // Parar a gravação (isso vai acionar o evento onstop)
            mediaRecorder.stop();
            gravacaoEmAndamento = false;
        } else {
            resolve(audioGravado);
        }
    });
}

// Função para remover o áudio gravado
function removerAudioGravado() {
    audioGravado = null;
    const playerContainer = document.getElementById('audio-preview-container');
    if (playerContainer) {
        playerContainer.innerHTML = '';
    }
    
    const btnGravar = document.getElementById('btn-gravar-audio');
    if (btnGravar) {
        btnGravar.disabled = false;
        btnGravar.innerHTML = '<i class="fa-solid fa-microphone"></i> Gravar';
        btnGravar.classList.remove('btn-pausar-audio', 'btn-retomar-audio', 'btn-gravado');
        btnGravar.classList.add('btn-gravar-audio');
    }
}