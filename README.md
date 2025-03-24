# Gerenciador de Locais

Uma aplicação web simples para gerenciar locais visitados no trabalho, com funcionalidades para salvar e carregar dados.

## Funcionalidades

- Visualização principal em formato de lista para todos os locais
- Adicionar locais com número de REP, endereço e status através de um formulário popup
- Filtrar locais por status (Pendente ou Concluído)
- Abrir o Google Maps para visualizar o endereço de um local
- Editar informações de um local existente
- Excluir locais
- Exportar todos os locais para um arquivo JSON
- Importar locais de um arquivo JSON

## Como usar

1. Abra o arquivo `index.html` em qualquer navegador moderno
2. Visualize a lista de locais cadastrados
3. Clique em "Adicionar Novo Local" para registrar um novo local
4. Use os botões na tabela para cada local:
   - Maps: abre o Google Maps com o endereço
   - Editar: permite modificar as informações
   - Excluir: remove o local da lista
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
- localStorage para persistência de dados
- FileReader API para importação/exportação de dados 