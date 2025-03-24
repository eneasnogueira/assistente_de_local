# Gerenciador de Locais

Uma aplicação web simples para gerenciar locais visitados no trabalho, com funcionalidades para salvar e carregar dados.

## Funcionalidades

- Visualização principal em formato de lista para todos os locais
- Adicionar locais com campos obrigatórios (REP, endereço, status) e opcionais (dados da vítima e do caso)
- Expandir/recolher detalhes de cada local diretamente na lista
- Filtrar locais por status (Pendente ou Concluído)
- Abrir o Google Maps para visualizar o endereço de um local
- Editar ou excluir locais informando o número de REP
- Exportar todos os locais para um arquivo JSON
- Importar locais de um arquivo JSON

## Campos disponíveis

### Campos obrigatórios
- Número de REP (identificador único)
- Endereço do local
- Status (Pendente ou Concluído)

### Campos opcionais
- Nome da vítima
- Telefone da vítima
- Tipo de exame
- Resumo do caso

## Como usar

1. Abra o arquivo `index.html` em qualquer navegador moderno
2. Visualize a lista de locais cadastrados
3. Use os botões no topo da página:
   - **Adicionar Novo Local**: abre um modal para registrar um novo local
   - **Editar Local**: pede o número de REP e abre o formulário para edição
   - **Excluir Local**: pede o número de REP e remove o local correspondente
4. Use os botões na tabela para cada local:
   - Botão de expansão (+/-): expande a linha para mostrar os detalhes adicionais
   - Maps: abre o Google Maps com o endereço
5. Use os botões na parte inferior para salvar ou carregar locais de arquivos

## Armazenamento

Os dados são armazenados localmente no seu navegador utilizando o localStorage. Isso significa que:

- Os dados persistirão mesmo após fechar o navegador
- Os dados são específicos para o navegador e dispositivo que você está usando
- Para backup ou transferência de dados, utilize as funções de salvar e carregar arquivo

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript (Vanilla)
- Font Awesome para ícones
- localStorage para persistência de dados
- FileReader API para importação/exportação de dados 