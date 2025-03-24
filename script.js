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
    
    // Verificar se o REP já existe, apenas se não estiver editando o mesmo REP
    if (!modoEdicao) {
        const existeRep = locais.some(local => local.rep === rep);
        if (existeRep) {
            alert('Já existe um local com este número de REP!');
            return;
        }
    } else if (modoEdicao && localOriginal.rep !== rep) {
        // Se estiver editando, mas mudou o número REP, verificar se o novo REP já existe
        const existeRep = locais.some(local => local.rep === rep);
        if (existeRep) {
            alert('Já existe um local com este número de REP!');
            return;
        }
    }
    
    const novoLocal = {
        id: modoEdicao ? localOriginal.id : Date.now(),
        rep,
        endereco,
        status,
        nomeVitima,
        telefoneVitima,
        tipoExame,
        resumoCaso,
        anexos: arquivosParaAnexar
    };
    
    locais.push(novoLocal);
    salvarNoLocalStorage();
    atualizarListaLocais();
    
    // Resetar modo de edição
    modoEdicao = false;
    localOriginal = null;
    
    // Esconder formulário após adicionar
    fecharModal();
    
    // Limpar formulário e arquivos temporários
    form.reset();
    arquivosParaAnexar = [];
    listaArquivosSelecionados.innerHTML = '';
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
    document.getElementById('status').value = local.status;
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
    // Ao abrir para um novo local, limpar os arquivos
    if (document.getElementById('rep').value === '') {
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

// Funções para carregar imagens para IA
function carregarImagensParaIA() {
    inputImagemParaIA.click();
}

// Função para processar imagens selecionadas
function processarImagensSelecionadas(e) {
    const arquivos = e.target.files;
    
    if (arquivos.length === 0) return;
    
    // Limpar a lista visual
    imagensCarregadas.innerHTML = '';
    // Limpar array de imagens
    imagensParaIA = [];
    
    Array.from(arquivos).forEach(arquivo => {
        // Verificar se o arquivo é uma imagem
        if (!arquivo.type.startsWith('image/')) {
            alert(`O arquivo "${arquivo.name}" não é uma imagem. Por favor, selecione apenas arquivos de imagem.`);
            return;
        }
        
        // Adicionar à lista de imagens para IA
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
    });
    
    // Habilitar botão de preencher com IA se houver imagens carregadas
    btnPreencherIA.disabled = imagensParaIA.length === 0;
    
    // Limpar o input de arquivo para permitir selecionar os mesmos arquivos novamente
    e.target.value = '';
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
        // Verificar a chave da API
        const apiKey = localStorage.getItem('openai_api_key');
        
        if (!apiKey) {
            const key = prompt('Por favor, insira sua chave de API da OpenAI:');
            if (!key) {
                throw new Error('Chave de API não fornecida');
            }
            localStorage.setItem('openai_api_key', key);
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
                content: "Você é um assistente especializado em extrair informações de imagens de casos forenses. Em documentos oficiais, o número de REP é um identificador único que geralmente aparece carimbado no documento junto à palavra 'REP'. Extraia as seguintes informações se disponíveis: número de REP (apenas se estiver do lado da palavra 'REP'), endereço completo, nome da vítima, telefone da vítima, tipo de exame (Constatação de furto, Constatação de danos, etc) e um resumo do caso (descrição do que foi furtado ou danificado). Forneça apenas essas informações em formato JSON."
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Analise estas imagens e extraia as seguintes informações: número de REP, endereço completo, nome da vítima, telefone da vítima, tipo de exame e um resumo do caso. IMPORTANTE: O número de REP deve ser extraído apenas quando estiver próximo à palavra 'REP' ou em um carimbo que contenha 'REP'. Se não houver menção explícita à palavra 'REP', deixe o campo de número REP vazio. Retorne APENAS no formato JSON como este exemplo: {\"rep\":\"12345\",\"endereco\":\"Rua Exemplo, 123\",\"nomeVitima\":\"Nome da Pessoa\",\"telefoneVitima\":\"(11) 99999-9999\",\"tipoExame\":\"Tipo do exame\",\"resumoCaso\":\"Breve resumo do caso\"}. Se algum campo não for encontrado, deixe-o como string vazia."
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
        
        // Mostrar mensagem de sucesso
        alert(`Formulário preenchido com sucesso usando IA!\n\n${imagensParaIA.length} imagem(ns) foram processadas e anexadas ao caso.`);
        
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
    const apiKeyAtual = localStorage.getItem('openai_api_key') || '';
    const novaChave = prompt('Digite sua chave da API da OpenAI:', apiKeyAtual);
    
    if (novaChave !== null) {
        if (novaChave.trim() === '') {
            localStorage.removeItem('openai_api_key');
            alert('Chave da API removida');
        } else {
            localStorage.setItem('openai_api_key', novaChave.trim());
            alert('Chave da API salva com sucesso!');
        }
    }
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
inputAnexos.addEventListener('change', processarArquivosSelecionados);
btnCarregarImagemIA.addEventListener('click', carregarImagensParaIA);
inputImagemParaIA.addEventListener('change', processarImagensSelecionadas);
btnPreencherIA.addEventListener('click', preencherFormularioComIA);
btnConfigAPI.addEventListener('click', configurarAPI);

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
window.abrirAnexo = abrirAnexo; 