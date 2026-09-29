# Halloween Roulette

Roleta de filmes de Halloween em português, responsiva e sem dependências de instalação. Usa os 19 filmes da coleção pessoal da roleta de 2025. A lista é editável (2 a 60 títulos, um por linha); títulos repetidos contam apenas uma vez. Cada filme tem a mesma probabilidade. A animação respeita a preferência de movimento reduzido.

Inclui os sons originais e um Hall of Fame, iniciado com o histórico de 2025. A lista, o histórico e a preferência de som ficam guardados no navegador; não são sincronizados entre dispositivos. Limpar o histórico não apaga os ficheiros da aplicação antiga. A versão web sorteia os títulos; não abre o VLC nem publica os ficheiros de vídeo.

## Abrir

Abre `index.html` no navegador. Para uma pré-visualização via HTTP, executa `node serve.mjs` e visita http://localhost:4173.

## Publicar gratuitamente no GitHub Pages

1. Cria um repositório público e envia `index.html`, `style.css`, `app.js`, `movies.js`, `slot.wav`, `ding.mp3`, `favicon.svg` e `.nojekyll` para a raiz da branch `main`.
2. No GitHub, abre **Settings → Pages**, escolhe **Deploy from a branch**, seleciona **main / (root)** e guarda.
3. O GitHub mostrará o endereço público quando a publicação terminar.

Documentação: https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

Funciona também em alojamentos estáticos como Cloudflare Pages. As fontes Google são opcionais: há fontes de sistema como alternativa. O jogo não necessita de conta, API, base de dados ou subscrição.

Os títulos e contagens iniciais foram importados da coleção pessoal e de `historico.json` da aplicação de 2025; os sufixos dos nomes dos ficheiros foram removidos.
