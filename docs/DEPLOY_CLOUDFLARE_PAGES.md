# Publicar KANAWA SOFT FARMÁCIA PRO no Cloudflare Pages

## Configuração do projecto

No Cloudflare Dashboard, abrir Workers & Pages → Create → Pages → Connect to Git e seleccionar:

- Repositório: `kanawasoft-dev/KANAWASOFT-FARMACIA-PRO`
- Branch de produção: `main`
- Framework preset: None
- Build command: vazio
- Build output directory: `frontend`
- Root directory: vazio

Guardar e iniciar a primeira publicação.

## Domínio personalizado

No projecto Pages, abrir Custom domains e adicionar:

`farmacia.kanawasoft.shop`

Seguir a instrução DNS apresentada pelo próprio Cloudflare. Não criar registos DNS por adivinhação. A publicação só fica concluída depois de o Cloudflare indicar domínio activo e HTTPS válido.

## Rotas

- `https://farmacia.kanawasoft.shop/` — Central SaaS (Super Administrador).
- `https://farmacia.kanawasoft.shop/adesao.html` — Registo e candidatura de farmácia.

## Supabase Auth

No projecto Supabase KANAWASOFT-FARMACIA-PRO, em Authentication → URL Configuration:

- Site URL: `https://farmacia.kanawasoft.shop`
- Redirect URL: `https://farmacia.kanawasoft.shop/**`

Manter confirmação de e-mail activa. A conta de Super Administrador já existente deve ser utilizada na Central SaaS; novas contas criadas no portal de adesão não recebem automaticamente privilégios SaaS.

## Verificação após publicação

1. Abrir a rota principal e confirmar que apresenta o login da Central SaaS.
2. Abrir `/adesao.html` e criar uma conta de teste.
3. Confirmar o e-mail, iniciar sessão e submeter dados de uma farmácia de teste.
4. Verificar a candidatura na Central SaaS.
5. Testar o acesso privado a documentos com utilizadores de farmácias diferentes.

Não inserir documentos pessoais reais durante os testes iniciais.
