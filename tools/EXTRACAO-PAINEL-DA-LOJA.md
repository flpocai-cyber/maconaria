Use este extrator no navegador antigo, com o sistema já logado.

1. Abra a página de `Sessões` ou uma página de detalhe de sessão no sistema antigo.
2. Pressione `F12` e abra a aba `Console`.
3. Abra o arquivo [tools/extrair-sessoes-paineldaloja.js](D:/donwload2024/CODEX/MACONARIA/tools/extrair-sessoes-paineldaloja.js).
4. Cole o conteúdo inteiro no console e pressione `Enter`.
5. O navegador vai baixar um arquivo `paineldaloja-sessoes-...json`.

Se rodar na listagem de sessões:
- ele tenta abrir todos os links `/sessao/detalhes/...` visíveis na página e baixar o HTML de cada uma.

Se rodar no detalhe de uma sessão:
- ele baixa pelo menos a sessão atual.

Com esse JSON em mãos, eu consigo transformar as presenças para o banco do site novo.
