# Cinema Roulette

Roleta de cinema estática para noites de Halloween e Natal. A roda continua a ser a atividade principal; a playlist e a Wall of Fame aparecem ao lado no computador e depois da roleta no telemóvel. Não requer instalação: abre `index.html` ou executa `node serve.mjs` e visita http://localhost:4173.

## Idiomas, temas e dados locais

A interface está disponível em português de Portugal e inglês. O idioma e o som são preferências globais. Cada tema guarda a sua própria playlist e histórico. Os dados ficam no `localStorage` do navegador e não são sincronizados entre dispositivos.

A migração de `halloween-movies-v1`, `halloween-history-v1` e `halloween-sound-v1` cria a chave `cinema-roulette-v2`. A chave guarda `version`, `activeTheme`, `language`, `soundEnabled` e, em `themes`, os campos `movies` e `history` de cada tema. Os dados antigos não são apagados; ficam como cópia de recuperação. A migração é idempotente: após a nova chave existir, os valores antigos não são importados uma segunda vez.

O tema Natal começa com a seleção curada em `movies.js`: 13 comédias, animações e clássicos de diferentes épocas, escolhidos por associação festiva e variedade de estilos. Inclui *The Nightmare Before Christmas*, que também pode pertencer a uma sessão de Halloween. A seleção é um ponto de partida editável, não uma recomendação de adequação etária.

## Sons

A aplicação usa apenas os efeitos de rotação e de fim (`slot.wav` e `ding.mp3`) já presentes no projeto. Não inicia som automaticamente nem acrescenta música ambiente. O repositório não contém registos de origem ou licença dos dois ficheiros; confirma esses registos antes de redistribuir os efeitos fora do projeto existente.

## Catálogo online

O catálogo curado local mantém a roleta utilizável sem serviços externos. A pesquisa online TMDB ainda não está ativa. O TMDB exige uma credencial e atribuição; não guardar uma chave no JavaScript publicado. Para ativar a integração, será necessário configurar um endpoint HTTPS intermédio, com a credencial TMDB apenas no segredo do serviço. A configuração e a atribuição do TMDB serão documentadas quando o endpoint existir.

## Publicar no GitHub Pages

O site público está alojado em GitHub Pages. A publicação deve apontar para a raiz da branch `main`; a aplicação não usa uma fase de build. Antes de publicar, verifica o teste local com `node smoke-test.mjs`.

## Origem dos dados iniciais

Os 19 títulos de Halloween e o histórico inicial foram preservados da roleta de 2025. Os sufixos dos nomes dos ficheiros foram removidos dos títulos originais.
