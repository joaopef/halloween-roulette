# Cinema Roulette

Roleta de cinema estática para noites de Halloween e Natal. A roda continua a ser a atividade principal; a playlist e a Wall of Fame aparecem ao lado no computador e depois da roleta no telemóvel. Não requer instalação: abre `index.html` ou executa `node serve.mjs` e visita http://localhost:4173.

## Idiomas, temas e dados locais

A interface está disponível em português de Portugal e inglês. O idioma e o som são preferências globais. Cada tema guarda a sua própria playlist e histórico. Os dados ficam no `localStorage` do navegador e não são sincronizados entre dispositivos.

A migração de `halloween-movies-v1`, `halloween-history-v1`, `halloween-sound-v1` e `cinema-roulette-v2` cria `cinema-roulette-v3`. Os dados antigos não são apagados; ficam como cópias de recuperação. A migração é idempotente: depois de criar v3, não volta a importar os valores anteriores.

O esquema v3 guarda `version`, `activeTheme`, `language`, `soundEnabled` e, em `themes`, `playlist`, `history`, `viewed` e `avoidViewed` para cada tema. Cada filme tem um `id` estável, o título original, o ano quando aparece no título, `runtimeMinutes`, `genres`, `moods`, `overview`, `posterUrl`, `tmdbRating`, `tmdbId`, `imdbId` e `source`. Filmes introduzidos manualmente recebem um ID local baseado no título original normalizado; isso não faz correspondência automática com títulos traduzidos nem com o catálogo. O histórico associa o ID ao título e à contagem de sorteios. Marcar ou desmarcar um filme como visto só atualiza `viewed`; não altera o histórico.

Ao migrar para v3, os títulos e contagens antigos são mantidos. Os filmes históricos que já não estão na playlist continuam na Wall of Fame. A migração não tenta associar títulos antigos a registos externos.

O tema Natal começa com a seleção curada em `movies.js`: 13 comédias, animações e clássicos de diferentes épocas, escolhidos por associação festiva e variedade de estilos. Inclui *The Nightmare Before Christmas*, que também pode pertencer a uma sessão de Halloween. A seleção é um ponto de partida editável, não uma recomendação de adequação etária.

## Sons

A aplicação usa apenas os efeitos de rotação e de fim (`slot.wav` e `ding.mp3`) já presentes no projeto. Não inicia som automaticamente nem acrescenta música ambiente. O repositório não contém registos de origem ou licença dos dois ficheiros; confirma esses registos antes de redistribuir os efeitos fora do projeto existente.

## Catálogo online

O catálogo curado local mantém a roleta utilizável sem serviços externos: 27 sugestões de Halloween e 22 de Natal, com pesquisa por título/ano e coleções temáticas. As sinopses, géneros, durações e disposições desta lista são editoriais; não são dados TMDB. O catálogo local não tem cartazes, classificações TMDB nem IDs IMDb verificados, pelo que mostra uma alternativa ao cartaz e não inventa esses campos.

A aplicação tem um adaptador TMDB opcional. O projeto não tem credencial nem serviço configurado, por isso a pesquisa online e recomendações TMDB **não estão ativas**. O adaptador usa os endpoints TMDB de pesquisa, detalhes e recomendações; os detalhes só mostram um link IMDb quando o endpoint de IDs externos devolve um ID válido. Os cartazes vêm do CDN de imagens TMDB e as notas são sempre identificadas como TMDB.

Para ativar a integração:

1. Regista a aplicação e obtém o token de leitura TMDB. O worker em `tmdb-proxy/worker.mjs` aceita apenas pesquisa/detalhes/recomendações de filmes, filtra conteúdo adulto e não devolve a credencial ao browser.
2. Publica o worker à parte do GitHub Pages e guarda a credencial como segredo `TMDB_API_READ_ACCESS_TOKEN` no fornecedor; não a coloques no repositório nem no JavaScript da página. O worker usa Durable Objects SQLite para limitar cada IP a 90 pedidos por minuto e não guarda o IP em texto simples.
3. Obtém um dos logótipos aprovados na página oficial de atribuição TMDB e aloja-o por HTTPS.
4. Define, antes de `app.js`, `window.CINEMA_CATALOG_PROXY_URL` para a raiz `/3/` do worker e `window.CINEMA_TMDB_LOGO_URL` para o logótipo oficial alojado. Sem estas duas configurações a aplicação permanece no modo local.

A atribuição e a nota de não aprovação TMDB aparecem automaticamente quando o catálogo online está configurado. A conta/projeto TMDB e o worker não foram criados nem publicados nesta entrega porque não existe token TMDB ou conta de serviço fornecida. Confirma os termos aplicáveis à utilização do projeto antes de ativar o serviço.

Referências consultadas: [Getting Started](https://developer.themoviedb.org/docs/getting-started), [FAQ](https://developer.themoviedb.org/docs/faq), [pesquisa de filmes](https://developer.themoviedb.org/reference/search-movie), [detalhes de filme](https://developer.themoviedb.org/reference/movie-details), [recomendações](https://developer.themoviedb.org/reference/movie-recommendations), [regras de imagem](https://developer.themoviedb.org/docs/image-basics), [atribuição e logótipos](https://www.themoviedb.org/about/logos-attribution).

## Publicar no GitHub Pages

O site público está alojado em GitHub Pages. A publicação deve apontar para a raiz da branch `main`; a aplicação não usa uma fase de build. Antes de publicar, verifica o teste local com `node smoke-test.mjs`.

## Origem dos dados iniciais

Os 19 títulos de Halloween e o histórico inicial foram preservados da roleta de 2025. Os sufixos dos nomes dos ficheiros foram removidos dos títulos originais.
