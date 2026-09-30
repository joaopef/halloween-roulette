# Cinema Roulette

Roleta de cinema estática para noites de Halloween e Natal. A roda continua a ser a atividade principal; a playlist e a Wall of Fame aparecem ao lado no computador e depois da roleta no telemóvel. Não requer instalação: abre `index.html` ou executa `node serve.mjs` e visita http://localhost:4173.

## Idiomas, temas e dados locais

A interface está disponível em português de Portugal e inglês. O idioma e o som são preferências globais. Cada tema guarda a sua própria playlist e histórico. Os dados ficam no `localStorage` do navegador e não são sincronizados entre dispositivos.

A migração de `halloween-movies-v1`, `halloween-history-v1`, `halloween-sound-v1`, `cinema-roulette-v2`, `cinema-roulette-v3` e `cinema-roulette-v4` cria `cinema-roulette-v5`. As chaves anteriores não são apagadas; ficam como cópias de recuperação. A migração é idempotente: depois de criar v5, não volta a importar os valores anteriores.

O esquema v5 guarda `version`, `activeTheme`, `language`, `soundEnabled` e, para cada tema, `playlist`, `history`, `viewed`, `avoidViewed`, `filters` (disposições selecionadas e duração máxima) e `sessions`. Cada filme tem um `id` estável, o título original, o ano quando aparece no título, `runtimeMinutes`, `genres`, `moods`, `overview`, `posterUrl`, `tmdbRating`, `tmdbId`, `imdbId` e `source`. Filmes introduzidos manualmente recebem um ID local baseado no título original normalizado; isso não faz correspondência automática com títulos traduzidos nem com o catálogo. A Wall of Fame associa o ID ao título e à contagem de sorteios. A lista de sessões guarda até as 100 mais recentes, com a ordem e as durações conhecidas. Marcar ou desmarcar um filme como visto só atualiza `viewed`; não altera a Wall of Fame nem o registo da sessão.

Ao migrar, os títulos, IDs e contagens antigos são mantidos. Os filmes históricos que já não estão na playlist continuam na Wall of Fame. Só se acrescentam metadados editoriais quando o título e o ano coincidem exatamente com a curadoria local; não se associam IDs externos. A passagem de v4 para v5 começa o novo registo de sessões vazio, sem fabricar sessões anteriores.

## Filtros e sessão surpresa

Os filtros afetam apenas a playlist ativa. Com várias disposições selecionadas, basta o filme corresponder a uma delas. “Leve, com ambiente familiar” é uma descrição editorial de tom (por exemplo, comédia, fantasia ou animação de menor intensidade); não garante adequação etária. “Assustador” identifica horror, suspense ou narrativas deliberadamente inquietantes. “Nostálgico” é uma seleção editorial de títulos associados a épocas, séries ou estilos que evocam sessões passadas, e não uma avaliação pessoal do utilizador.

O filtro de duração máxima exclui filmes sem duração conhecida e informa quantos ficam de fora; podes completar a duração em “Metadados dos filmes”, em minutos. Disposições também podem ser editadas manualmente. “Sessão surpresa” aplica a disposição e o tempo escolhidos aos filmes da tua lista, respeitando os filtros e a opção de evitar vistos; não altera a seleção. Cada filme elegível mantém probabilidade igual.

## Maratonas

Uma maratona sorteia um, dois ou três filmes da playlist filtrada, sem repetição dentro da sessão. Se houver menos elegíveis do que o pedido, a roleta informa a quantidade e pergunta se deve sortear os disponíveis. A duração total é apresentada quando todos os filmes têm duração; caso contrário, é identificada como incompleta. Cada filme sorteado incrementa a Wall of Fame uma vez e a sessão mantém a sua ordem. Os vistos podem ser marcados filme a filme sem alterar nenhum dos dois históricos.

## Partilha, importação e cópias de segurança

Os links de partilha usam o fragmento `#playlist=` com JSON em Base64 URL-safe. O objeto tem o formato `{ format: "halloween-roulette-share", version: 1, theme, playlist }`; cada filme contém o `title` original e, quando existe, o ID TMDB. IDs locais são derivados do título original. Não inclui histórico, vistos, duração, idioma, som ou outras preferências. A aplicação só mostra uma pré-visualização; a pessoa escolhe quando importar. A importação acrescenta filmes sem duplicar IDs existentes e não substitui a coleção. Links acima de 1800 caracteres são substituídos por uma opção de transferência JSON.

O ficheiro de playlist é JSON UTF-8 com `{ format: "halloween-roulette-playlist", version: 1, theme, playlist }`. Cada registo usa `id`, `title`, `year`, `runtimeMinutes`, `genres`, `moods`, `overview`, `translatedTitle`, `posterUrl`, `tmdbRating`, `tmdbId`, `imdbId` e `source`; campos sem valor podem ser `null`. A importação só aceita IDs locais canónicos ou IDs TMDB numéricos e cartazes HTTPS do domínio de imagens TMDB. A playlist conserva os títulos originais, IDs estáveis e metadados editoriais existentes. A importação aceita até 60 filmes, mostra uma pré-visualização e permite adicionar os filmes sem duplicados ou substituir apenas a playlist do tema. A substituição exige confirmação e preserva a Wall of Fame, os vistos, os filtros e as sessões.

A cópia de segurança tem `{ format: "halloween-roulette-backup", version: 1, savedAt, data }`, em que `data` contém o estado local completo v5: os dois temas, playlists, históricos, vistos, filtros, sessões e preferências globais de idioma e som. A aplicação valida o ficheiro e apresenta um resumo antes de pedir confirmação para substituir os dados locais. Ficheiros de importação estão limitados a 2 MB. Os dados continuam guardados no navegador; estes ficheiros são a forma manual de os transferir entre dispositivos, sem sincronização automática.

O estado da roleta continua na chave local `cinema-roulette-v5`; os formatos de partilha e transferência não criam novas chaves de armazenamento. As chaves legadas continuam preservadas como cópias de recuperação da migração.

O tema Natal começa com a seleção curada em `movies.js`: 13 comédias, animações e clássicos de diferentes épocas, escolhidos por associação festiva e variedade de estilos. Inclui *The Nightmare Before Christmas*, que também pode pertencer a uma sessão de Halloween. A seleção é um ponto de partida editável, não uma recomendação de adequação etária.

## Sons

A roleta e os shuffles usam os efeitos de rotação e de fim (`slot.wav` e `ding.mp3`) já presentes no projeto. As portas usam apenas um dos três efeitos originais sintetizados (`door-zombie.wav`, `door-witch.wav`, `door-ghost.wav`), com ranger de madeira e uma criatura diferente por porta. Não contêm amostras do Minecraft nem vozes gravadas; podem ser regenerados com `node generate-door-sounds.mjs`. O botão de som controla todos os modos e nada toca automaticamente. O repositório não contém registos de origem ou licença dos dois efeitos antigos.

Halloween oferece quatro modos de sorteio: roleta, portas misteriosas, shuffle de títulos e shuffle de cartazes. Partilham os filtros, a escolha aleatória e o histórico. O shuffle de cartazes mantém elegíveis os filmes sem imagem, mostrando uma capa com o título; uma imagem que falhe também usa essa alternativa. O resultado final corresponde sempre ao cartaz central. O modo respeita o movimento reduzido e fica guardado nas preferências do tema.

## Catálogo online

Os títulos e cartazes são clicáveis e abrem uma janela compacta com sinopse, géneros, duração, nota TMDB, os primeiros seis nomes do elenco e realizador quando disponíveis. Os dados adicionais vêm de `movie/{id}` com `external_ids,credits` no Worker; ficam em cache apenas na memória da página. Títulos manuais precisam de uma correspondência exata por nome/ano. A janela conserva os dados locais se o serviço falhar, fecha com Escape ou ao clicar fora e devolve o foco ao controlo que a abriu. Na roda Halloween com um número ímpar de filmes, a última fatia usa roxo escuro para evitar duas fatias laranjas consecutivas.

As sugestões omitem filmes já na playlist, comparando IDs TMDB conhecidos, títulos originais/traduzidos, anos, acentos e pontuação. Anos diferentes preservam remakes distintos. Uma pesquisa explícita ainda permite encontrar um filme existente, com o botão de adicionar desativado. As recomendações Halloween consultam progressivamente vários filmes de referência através do Worker existente: mostram 16 de cada vez e o botão «Mais recomendações» carrega novos grupos. Não precisam de IDs TMDB guardados na playlist inicial. Aceitam terror; fantasia e filmes familiares exigem referências a Halloween, fantasmas, bruxas, monstros ou outros temas assombrados na sinopse/título. Excluem conteúdo adulto, duplicados e títulos já sugeridos no catálogo curado. Esta seleção é uma regra temática, não uma recomendação personalizada por IA.

O catálogo curado local mantém a roleta utilizável sem serviços externos: 27 sugestões de Halloween e 22 de Natal, com pesquisa por título/ano e coleções temáticas. As sinopses, géneros, durações e disposições desta lista são editoriais; não são dados TMDB. Os 27 filmes de Halloween têm caminhos de cartaz verificados no TMDB e carregam as imagens diretamente do seu CDN. Os 19 filmes iniciais também recebem estes cartazes, incluindo listas já guardadas, sem alterar os títulos, IDs, vistos ou histórico. A lista conserva o ano original de Mickey's House of Villains (2001), embora o TMDB identifique este filme como 2002. Filmes manuais sem correspondência curada continuam com a alternativa ao cartaz; a pesquisa TMDB permite adicionar outros filmes com imagens.

A pesquisa online está ligada ao Worker `https://halloween-cinema-catalog.joaoferreira240.workers.dev/3/`. O token de leitura está guardado como segredo na Cloudflare; a página contém apenas o endereço público do serviço e o logótipo oficial TMDB. O adaptador usa os endpoints TMDB de pesquisa, detalhes e recomendações; os detalhes só mostram um link IMDb quando o endpoint de IDs externos devolve um ID válido. Os cartazes vêm do CDN de imagens TMDB e as notas são sempre identificadas como TMDB. Os títulos existentes e as sugestões locais não recebem uma associação TMDB automática.

Para ativar a integração:

1. Regista a aplicação e obtém o token de leitura TMDB. O worker em `tmdb-proxy/worker.mjs` aceita apenas pesquisa/detalhes/recomendações de filmes, filtra conteúdo adulto e não devolve a credencial ao browser.
2. Publica o worker à parte do GitHub Pages e guarda a credencial como segredo `TMDB_API_READ_ACCESS_TOKEN` no fornecedor; não a coloques no repositório nem no JavaScript da página. O worker usa Durable Objects SQLite para limitar cada IP a 90 pedidos por minuto e não guarda o IP em texto simples.
3. Obtém um dos logótipos aprovados na página oficial de atribuição TMDB e aloja-o por HTTPS.
4. Define, antes de `app.js`, `window.CINEMA_CATALOG_PROXY_URL` para a raiz `/3/` do worker e `window.CINEMA_TMDB_LOGO_URL` para o logótipo oficial alojado. Sem estas duas configurações a aplicação permanece no modo local.

A atribuição e a nota de não aprovação TMDB aparecem automaticamente quando o catálogo online está configurado. A pesquisa é iniciada pelo botão Pesquisar; escrever no campo continua a filtrar as sugestões locais. A pasta `.wrangler` e os ficheiros locais de segredos estão excluídos do Git.

Referências consultadas: [Getting Started](https://developer.themoviedb.org/docs/getting-started), [FAQ](https://developer.themoviedb.org/docs/faq), [pesquisa de filmes](https://developer.themoviedb.org/reference/search-movie), [detalhes de filme](https://developer.themoviedb.org/reference/movie-details), [recomendações](https://developer.themoviedb.org/reference/movie-recommendations), [regras de imagem](https://developer.themoviedb.org/docs/image-basics), [atribuição e logótipos](https://www.themoviedb.org/about/logos-attribution).

## Publicar no GitHub Pages

O site público está alojado em GitHub Pages. A publicação deve apontar para a raiz da branch `main`; a aplicação não usa uma fase de build. Antes de publicar, verifica o teste local com `node smoke-test.mjs`.

## Origem dos dados iniciais

Os 19 títulos de Halloween e o histórico inicial foram preservados da roleta de 2025. Os sufixos dos nomes dos ficheiros foram removidos dos títulos originais.
