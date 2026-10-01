# Cinema Roulette

Roleta de cinema estática para noites de Halloween e Natal. A roda continua a ser a atividade principal; a playlist e a Wall of Fame aparecem ao lado no computador e depois da roleta no telemóvel. Não requer instalação: abre `index.html` ou executa `node serve.mjs` e visita http://localhost:4173.

## Idiomas, temas e dados locais

A interface está disponível em português de Portugal e inglês. O idioma e o som são preferências globais. Cada tema guarda a sua própria playlist e histórico. Os dados ficam no `localStorage` do navegador e não são sincronizados entre dispositivos.

A migração de `halloween-movies-v1`, `halloween-history-v1`, `halloween-sound-v1`, `cinema-roulette-v2`, `cinema-roulette-v3` e `cinema-roulette-v4` cria `cinema-roulette-v5`. As chaves anteriores não são apagadas; ficam como cópias de recuperação. A migração é idempotente: depois de criar v5, não volta a importar os valores anteriores.

O esquema v5 guarda `version`, `activeTheme`, `language`, `soundEnabled`, `musicEnabled` e, para cada tema, `playlist`, `history`, `viewed`, `avoidViewed`, `filters` (disposições selecionadas e duração máxima) e `sessions`. Cada filme tem um `id` estável, o título original, o ano quando aparece no título, `runtimeMinutes`, `genres`, `moods`, `overview`, `posterUrl`, `tmdbRating`, `tmdbId`, `imdbId` e `source`. Filmes introduzidos manualmente recebem um ID local baseado no título original normalizado; isso não faz correspondência automática com títulos traduzidos nem com o catálogo. A Wall of Fame associa o ID ao título e à contagem de sorteios. A lista de sessões guarda até as 100 mais recentes, com a ordem e as durações conhecidas. Marcar ou desmarcar um filme como visto só atualiza `viewed`; não altera a Wall of Fame nem o registo da sessão.

Ao migrar, os títulos, IDs e contagens antigos são mantidos. Os filmes históricos que já não estão na playlist continuam na Wall of Fame. Só se acrescentam metadados editoriais quando o título e o ano coincidem exatamente com a curadoria local; não se associam IDs externos. A passagem de v4 para v5 começa o novo registo de sessões vazio, sem fabricar sessões anteriores.

## Filtros e sessão surpresa

Os filtros afetam apenas a playlist ativa. Com várias disposições selecionadas, basta o filme corresponder a uma delas. “Leve, com ambiente familiar” é uma descrição editorial de tom (por exemplo, comédia, fantasia ou animação de menor intensidade); não garante adequação etária. “Assustador” identifica horror, suspense ou narrativas deliberadamente inquietantes. “Nostálgico” é uma seleção editorial de títulos associados a épocas, séries ou estilos que evocam sessões passadas, e não uma avaliação pessoal do utilizador.

O filtro de duração máxima exclui filmes sem duração conhecida e informa quantos ficam de fora; podes completar a duração em “Metadados dos filmes”, em minutos. Disposições também podem ser editadas manualmente. “Sessão surpresa” aplica a disposição e o tempo escolhidos aos filmes da tua lista, respeitando os filtros e a opção de evitar vistos; não altera a seleção. Cada filme elegível mantém probabilidade igual.

## Maratonas

Uma maratona sorteia um, dois ou três filmes da playlist filtrada, sem repetição dentro da sessão. Se houver menos elegíveis do que o pedido, a roleta informa a quantidade e pergunta se deve sortear os disponíveis. A duração total é apresentada quando todos os filmes têm duração; caso contrário, é identificada como incompleta. Cada filme sorteado incrementa a Wall of Fame uma vez e a sessão mantém a sua ordem. Os vistos podem ser marcados filme a filme sem alterar nenhum dos dois históricos.

## Partilha, importação e cópias de segurança

Os links de partilha usam o fragmento `#playlist=` com JSON em Base64 URL-safe. O objeto tem o formato `{ format: "halloween-roulette-share", version: 1, theme, playlist }`; cada filme contém o `title` original e, quando existe, o ID TMDB. Nos links partilhados, IDs locais são derivados do título; os ficheiros de playlist e backup preservam os IDs estáveis existentes. Não inclui histórico, vistos, duração, idioma, som ou outras preferências. A aplicação só mostra uma pré-visualização; a pessoa escolhe quando importar. A importação acrescenta filmes sem duplicar IDs existentes e não substitui a coleção. Links acima de 1800 caracteres são substituídos por uma opção de transferência JSON.

O ficheiro de playlist é JSON UTF-8 com `{ format: "halloween-roulette-playlist", version: 1, theme, playlist }`. Cada registo usa `id`, `title`, `year`, `runtimeMinutes`, `genres`, `moods`, `overview`, `translatedTitle`, `posterUrl`, `tmdbRating`, `tmdbId`, `imdbId` e `source`; campos sem valor podem ser `null`. A importação aceita IDs locais estáveis com prefixo `manual:` (incluindo títulos renomeados), IDs curados existentes com prefixo `curated:` ou IDs TMDB numéricos e cartazes HTTPS do domínio de imagens TMDB. A playlist conserva os títulos originais, IDs estáveis e metadados editoriais existentes. A importação aceita até 60 filmes, mostra uma pré-visualização e permite adicionar os filmes sem duplicados ou substituir apenas a playlist do tema. A substituição exige confirmação e preserva a Wall of Fame, os vistos, os filtros e as sessões.

A cópia de segurança tem `{ format: "halloween-roulette-backup", version: 1, savedAt, data }`, em que `data` contém o estado local completo v5: os dois temas, playlists, históricos, vistos, filtros, sessões e preferências globais de idioma e som. A aplicação valida o ficheiro e apresenta um resumo antes de pedir confirmação para substituir os dados locais. Ficheiros de importação estão limitados a 2 MB. Os dados continuam guardados no navegador; estes ficheiros são a forma manual de os transferir entre dispositivos, sem sincronização automática.

O estado da roleta continua na chave local `cinema-roulette-v5`; os formatos de partilha e transferência não criam novas chaves de armazenamento. As chaves legadas continuam preservadas como cópias de recuperação da migração.

O tema Natal começa com a seleção curada em `movies.js`: 13 comédias, animações e clássicos de diferentes épocas, escolhidos por associação festiva e variedade de estilos. Inclui *The Nightmare Before Christmas*, que também pode pertencer a uma sessão de Halloween. A seleção é um ponto de partida editável, não uma recomendação de adequação etária.

## Sons

A roleta e os shuffles mantêm os efeitos de rotação e de fim (`slot.wav` e `ding.mp3`). As portas conservam o fantasma original (`door-ghost.wav`) e usam os MP3 fornecidos de zombie e bruxa em `audio/`. Cada ronda atribui os três tipos de som às portas; o riso da bruxa alterna aleatoriamente entre os dois ficheiros disponíveis. Abrir uma porta reproduz apenas um efeito, e começar outra ronda ou trocar de tema interrompe o anterior. `door-zombie.wav` e `door-witch.wav` ficam como ficheiros antigos, mas já não são usados pelo site.

Em Halloween, a música `audio/halloween-theme.mp3` vem ativa por defeito, em loop a um volume discreto (18%). Tenta reproduzir ao entrar; se o navegador bloquear autoplay, continua ativa e tenta imediatamente com clique, toque, teclado, roda do rato ou scroll. Alguns navegadores só autorizam áudio com clique/toque/teclado, mesmo depois de scroll. O botão “Música ON/OFF” fica no topo ao lado do idioma e controla a faixa independentemente dos efeitos sonoros. A escolha explícita é guardada em `musicEnabled` e `musicPreferenceSet` no estado v5 e nos backups; desligar não é anulado por interações posteriores nem ao voltar a abrir a página. Preferências anteriores sem a nova marca de escolha passam uma vez para o novo valor inicial ativo. A música pausa em Natal ou enquanto a página está oculta; retoma em Halloween quando estava ativada. Uma falha de reprodução diferente do bloqueio de autoplay apresenta uma mensagem PT/EN; desligar e voltar a ativar permite tentar novamente. Backups antigos sem esta preferência continuam válidos.

As portas usam três SVG distintos: madeira castanha rachada, madeira esverdeada com podridão e buracos, e madeira cinzenta com tábuas partidas e reforço inclinado. Todas têm teias e aranhas, mantendo os controlos de teclado e foco. Os MP3 são cópias dos ficheiros entregues pelo utilizador, sem conversão ou cortes; os nomes originais estão em `audio/README.md`.

Halloween oferece quatro modos de sorteio: roleta, portas misteriosas, shuffle de títulos e shuffle de cartazes. Partilham os filtros, a escolha aleatória e o histórico. O shuffle de cartazes mantém elegíveis os filmes sem imagem, mostrando uma capa com o título; uma imagem que falhe também usa essa alternativa. O resultado final corresponde sempre ao cartaz central. O modo respeita o movimento reduzido e fica guardado nas preferências do tema.

## Catálogo online

Os títulos e cartazes são clicáveis e abrem uma janela compacta com sinopse, géneros, duração, nota TMDB, os primeiros seis nomes do elenco e realizador quando disponíveis. Os dados adicionais vêm de `movie/{id}` com `external_ids,credits` no Worker; ficam em cache apenas na memória da página. Títulos manuais precisam de uma correspondência exata por nome/ano. A janela conserva os dados locais se o serviço falhar, fecha com Escape ou ao clicar fora e devolve o foco ao controlo que a abriu. Na roda Halloween com um número ímpar de filmes, a última fatia usa roxo escuro para evitar duas fatias laranjas consecutivas.

As sugestões omitem filmes já na playlist, comparando IDs TMDB conhecidos, títulos originais/traduzidos, anos, acentos e pontuação. Anos diferentes preservam remakes distintos. Uma pesquisa explícita ainda permite encontrar um filme existente, com o botão de adicionar desativado. As recomendações Halloween consultam progressivamente vários filmes de referência através do Worker existente: mostram 16 de cada vez e o botão «Mais recomendações» carrega novos grupos. Não precisam de IDs TMDB guardados na playlist inicial. Aceitam terror e mistério, com filtros próprios para os dois géneros; fantasia e filmes familiares exigem referências a Halloween, fantasmas, bruxas, monstros ou outros temas assombrados na sinopse/título. Excluem conteúdo adulto, duplicados e títulos já sugeridos no catálogo curado. Sleepy Hollow (1999), Odd Thomas (2013), Scream (1996) e Monster House (2006), presentes na [lista IMDb de referência](https://www.imdb.com/list/ls052334489/), também orientam as recomendações; a lista não é importada automaticamente. Um filme pode aparecer em mais de uma categoria. Esta seleção é uma regra temática, não uma recomendação personalizada por IA.

O catálogo curado local mantém a roleta utilizável sem serviços externos: 27 sugestões de Halloween e 22 de Natal, com pesquisa por título/ano e coleções temáticas. As sinopses, géneros, durações e disposições desta lista são editoriais; não são dados TMDB. Os 27 filmes de Halloween têm caminhos de cartaz verificados no TMDB e carregam as imagens diretamente do seu CDN. Os 19 filmes iniciais também recebem estes cartazes, incluindo listas já guardadas, sem alterar os títulos, IDs, vistos ou histórico. A lista conserva o ano original de Mickey's House of Villains (2001), embora o TMDB identifique este filme como 2002. Filmes manuais sem correspondência curada continuam com a alternativa ao cartaz; a pesquisa TMDB permite adicionar outros filmes com imagens.

A pesquisa online está ligada ao Worker `https://halloween-cinema-catalog.joaoferreira240.workers.dev/3/`. O token de leitura está guardado como segredo na Cloudflare; a página contém apenas o endereço público do serviço e o logótipo oficial TMDB. O adaptador usa os endpoints TMDB de pesquisa, detalhes e recomendações; os detalhes só mostram um link IMDb quando o endpoint de IDs externos devolve um ID válido. Os cartazes vêm do CDN de imagens TMDB e as notas são sempre identificadas como TMDB. Os títulos existentes e as sugestões locais não recebem uma associação TMDB automática.

Para ativar a integração:

1. Regista a aplicação e obtém o token de leitura TMDB. O worker em `tmdb-proxy/worker.mjs` aceita apenas pesquisa/detalhes/recomendações de filmes, filtra conteúdo adulto e não devolve a credencial ao browser.
2. Publica o worker à parte do GitHub Pages e guarda a credencial como segredo `TMDB_API_READ_ACCESS_TOKEN` no fornecedor; não a coloques no repositório nem no JavaScript da página. O worker usa Durable Objects SQLite para limitar cada IP a 90 pedidos por minuto e não guarda o IP em texto simples.
3. Obtém um dos logótipos aprovados na página oficial de atribuição TMDB e aloja-o por HTTPS.
4. Define, antes de `app.js`, `window.CINEMA_CATALOG_PROXY_URL` para a raiz `/3/` do worker e `window.CINEMA_TMDB_LOGO_URL` para o logótipo oficial alojado. Sem estas duas configurações a aplicação permanece no modo local.

A atribuição e a nota de não aprovação TMDB aparecem automaticamente quando o catálogo online está configurado. A pesquisa é iniciada pelo botão Pesquisar; escrever no campo continua a filtrar as sugestões locais. Os resultados aparecem logo após o pedido de pesquisa, sem esperar por detalhes individuais. Detalhes são pedidos ao abrir ou adicionar um resultado e reutilizam a mesma cache em memória por ID TMDB e idioma. Se os detalhes falharem ao adicionar, conserva-se o registo disponível da pesquisa e apresenta-se o erro. Pedidos têm um timeout de 8 segundos. O limite de pedidos tem uma mensagem distinta da indisponibilidade; `Retry-After`, em segundos ou data HTTP, impede novos pedidos antes do prazo. O Worker propaga e expõe esse cabeçalho tanto do seu limitador como do TMDB. Pedidos substituídos são cancelados e respostas antigas não alteram a pesquisa nem o tema/idioma atuais. A pasta `.wrangler` e os ficheiros locais de segredos estão excluídos do Git.

Referências consultadas: [Getting Started](https://developer.themoviedb.org/docs/getting-started), [FAQ](https://developer.themoviedb.org/docs/faq), [pesquisa de filmes](https://developer.themoviedb.org/reference/search-movie), [detalhes de filme](https://developer.themoviedb.org/reference/movie-details), [recomendações](https://developer.themoviedb.org/reference/movie-recommendations), [regras de imagem](https://developer.themoviedb.org/docs/image-basics), [atribuição e logótipos](https://www.themoviedb.org/about/logos-attribution).

## Publicar no GitHub Pages

O site público está alojado em GitHub Pages. A publicação deve apontar para a raiz da branch `main`; a aplicação não usa uma fase de build. Antes de publicar, verifica o teste local com `node smoke-test.mjs`.

## Origem dos dados iniciais

Os 19 títulos de Halloween e o histórico inicial foram preservados da roleta de 2025. Os sufixos dos nomes dos ficheiros foram removidos dos títulos originais.

## Edição da coleção e recuperação

“Editar filmes” abre um rascunho: escrever não altera a coleção nem normaliza o campo, mantendo espaços, linhas vazias e cursor. “Guardar” valida títulos (até 300 caracteres), remove duplicados e aplica o limite de 60 filmes; erros conservam todo o texto para correção. “Cancelar” abandona o rascunho. Repor a seleção inicial preenche o rascunho e só se aplica ao guardar. Rascunhos por tema permanecem na memória ao trocar de tema, até guardar/cancelar ou fechar a página; não entram nos backups.

A coleção mostra todos os filmes numa lista com ações para editar o título, remover e marcar/desmarcar como visto. A edição individual preserva ID, ano, metadados, vistos e associações aos históricos. Ao guardar uma lista com o mesmo número de linhas únicas, alterações na mesma posição conservam a identidade dos filmes que não foram identificados por título noutra linha. Para renomear e simultaneamente reorganizar, acrescentar ou remover títulos, usa a ação individual para garantir a associação pretendida. O histórico conserva os títulos registados na altura do sorteio. A última remoção pode ser desfeita na página, incluindo os seus metadados; o histórico e os vistos não são apagados. Desfazer não ultrapassa 60 filmes nem cria duplicados.

Falhas de gravação no `localStorage` deixam os dados disponíveis na memória da página. Um aviso persistente PT/EN indica essa situação e permite exportar imediatamente a cópia de segurança completa. Não se apresenta confirmação de gravação quando esta falha. A próxima ação que grava tenta novamente guardar todo o estado e remove o aviso se conseguir. As chaves e migrações existentes mantêm-se.

Junto à roda, “Consultar filmes elegíveis” mostra todos os títulos filtrados, com botões de detalhes acessíveis por teclado. Para 20 ou mais elegíveis em Halloween, sugere-se o shuffle de cartazes sem mudar o modo escolhido. Os cartazes usam botões semânticos; os modais fecham com Escape e devolvem o foco. Mantêm-se o movimento reduzido, os quatro modos e a mesma escolha final no resultado, animação e histórico.

## Organização e verificações

A página continua estática, abrindo diretamente `index.html` ou através de `node serve.mjs`, sem framework, dependências de produção ou build. `translations.js` reúne o texto PT/EN; `storage.js` trata do esquema, migrações e persistência; `tmdb.js` concentra o transporte, pesquisa, detalhes e cache; `drawing.js` reúne o sorteio e animações; `collection.js` trata das transações de edição. `app.js` liga a interface, filtros, histórico, maratonas e transferência de dados. Os scripts clássicos carregam pela ordem declarada no HTML, também em `file://`.

`node smoke-test.mjs` executa os testes simulados sem instalar dependências: migrações, preferências, filtros, quatro modos, animação/resultado/histórico, partilha/backups, rascunhos, IDs, desfazer, falhas e recuperação de armazenamento, pesquisas fora de ordem e propagação de `Retry-After`.

Para os testes num navegador real, executa `npm ci`, `npx playwright install chromium` e `npm test` (ou `npm run test:browser`). Playwright é apenas uma dependência de desenvolvimento. Os testes iniciam um servidor dedicado na porta 4174, bloqueiam os serviços online e verificam Chromium a 1440×1000 e 390×844: guardar/cancelar, cursor, validação, renomeação, desfazer, teclado, abertura/fecho dos modais, devolução de foco, cartazes semânticos, ausência de scroll horizontal e exportação após falha de armazenamento. As capturas ficam em `test-artifacts/`, ignorada no Git. `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite usar um Chromium já instalado.

O workflow `.github/workflows/checks.yml` executa as duas suites em pushes e pull requests e guarda as capturas como artefactos. Não publica nem faz deploy. A verificação visual/automática atual cobre Chromium; Firefox, Safari e leitores de ecrã não foram verificados. A propagação de `Retry-After` foi testada no código do Worker; o Worker requer publicação separada do site no GitHub Pages.
