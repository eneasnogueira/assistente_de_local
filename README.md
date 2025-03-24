# Gerenciador de Locais

Uma aplicação web simples para gerenciar locais visitados no trabalho, com funcionalidades para salvar e carregar dados.

## Funcionalidades

- Visualização principal em formato de lista para todos os locais
- Adicionar locais com campos obrigatórios (REP, endereço, status) e opcionais (dados da vítima e do caso)
- Preenchimento automático de formulários usando ChatGPT para processar imagens e PDFs
  - Integração direta com a API da OpenAI (GPT-4o) para extração de dados de imagens
  - Conversão automática de PDFs para imagens para processamento visual
  - Processamento visual de documentos com visão computacional
  - Configuração da chave de API da OpenAI
- Anexar arquivos a cada local (imagens, PDFs, documentos, etc.)
  - Possibilidade de anexar um arquivo de cada vez, mantendo os já anexados
  - Remoção individual de anexos
- Expandir/recolher detalhes de cada local diretamente na lista
- Filtrar locais por status (Pendente ou Concluído)
- Abrir o Google Maps para visualizar o endereço de um local
- Editar ou excluir locais informando o número de REP
- Marcar locais como concluídos diretamente da lista
- Exportar todos os locais para um arquivo JSON
- Importar locais de um arquivo JSON

## Campos disponíveis

### Campos obrigatórios
- Número de REP (identificador único que aparece carimbado em documentos oficiais junto à palavra "REP")
- Endereço do local
- Status (Pendente ou Concluído)

### Campos opcionais
- Nome da vítima
- Telefone da vítima
- Tipo de exame
- Resumo do caso
- Arquivos anexados

## Como usar

1. Abra o arquivo `index.html` em qualquer navegador moderno
2. Visualize a lista de locais cadastrados
3. Use os botões no topo da página:
   - **Adicionar Novo Local**: abre um modal para registrar um novo local
   - **Editar Local**: pede o número de REP e abre o formulário para edição
   - **Excluir Local**: pede o número de REP e remove o local correspondente
4. No formulário de adição/edição:
   - Preencha manualmente os campos ou use a opção de IA
   - Para usar IA:
     - Clique em "Configurar API" para adicionar sua chave da API da OpenAI
     - Carregue imagens ou PDFs clicando em "Carregar Imagens/PDFs para IA"
     - Os PDFs serão automaticamente convertidos em imagens para processamento
     - Clique em "Preencher com IA" para iniciar o processamento automático
     - As imagens e PDFs carregados serão automaticamente anexados ao caso
   - Anexe arquivos adicionais conforme necessário
5. Use os botões na tabela para cada local:
   - Botão de expansão (+/-): expande a linha para mostrar os detalhes adicionais
   - Maps: abre o Google Maps com o endereço
   - Concluir: marca o local como concluído (apenas para locais pendentes)
6. Na área expandida, é possível visualizar os detalhes do local, incluindo os arquivos anexados
   - Clique nos nomes dos arquivos para abri-los no navegador
7. Use os botões na parte inferior para salvar ou carregar locais de arquivos

## Integração com IA

A aplicação utiliza a API do ChatGPT (GPT-4o) da OpenAI para extrair informações de imagens e preencher automaticamente o formulário:

1. Você precisará de uma chave de API da OpenAI, que pode ser obtida em [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Clique no botão "Configurar API" no formulário e insira sua chave
3. A chave será armazenada localmente em seu navegador
4. Carregue uma ou mais imagens ou PDFs usando o botão "Carregar Imagens/PDFs para IA"
   - Os arquivos PDF serão automaticamente convertidos em imagens para melhor processamento
5. Clique em "Preencher com IA" para iniciar o processamento automático
6. As imagens carregadas para a IA serão automaticamente anexadas ao caso

O aplicativo enviará as imagens diretamente para a API da OpenAI, que analisará o conteúdo visual e extrairá as informações relevantes. O sistema foi configurado para identificar corretamente o número de REP apenas quando este estiver carimbado próximo à palavra "REP" no documento, evitando falsas identificações. Outras informações como endereço, dados da vítima e resumo do caso são extraídas da melhor forma possível com base no conteúdo das imagens.

### Processamento de PDFs

Quando você carrega um arquivo PDF:
1. O sistema converte cada página do PDF em uma imagem JPEG de alta qualidade
2. A conversão ocorre diretamente no navegador, sem enviar os PDFs para servidores externos
3. As imagens geradas são então processadas pela IA como imagens normais
4. Tanto as imagens convertidas quanto o PDF original são anexados ao caso

**Nota sobre custos:** A utilização da API da OpenAI pode gerar custos conforme sua política de preços. Consulte a [documentação oficial](https://openai.com/pricing) para mais informações.

## Armazenamento

Os dados são armazenados localmente no seu navegador utilizando o localStorage. Isso significa que:

- Os dados persistirão mesmo após fechar o navegador
- Os dados são específicos para o navegador e dispositivo que você está usando
- Os arquivos anexados são convertidos em formato Base64 e armazenados com os demais dados
- Para backup ou transferência de dados, utilize as funções de salvar e carregar arquivo
- A chave da API da OpenAI também é armazenada no localStorage

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- Font Awesome para ícones
- PDF.js para conversão de PDFs em imagens
- localStorage para persistência de dados
- FileReader API para importação/exportação e processamento de arquivos
- Data URL para exibição de arquivos anexados
- OpenAI API (Chat Completions com GPT-4o) para processamento de imagens com visão computacional 