# KANAWA SOFT FARMÁCIA PRO

Plataforma SaaS de gestão de farmácias da KANAWA SOFT, com portal de adesão empresarial e Central SaaS.

## Estado verificado em 18/11/2026

- Projecto Supabase **KANAWASOFT-FARMACIA-PRO** ligado e activo (região eu-west-1).
- Cliente browser em `frontend/supabase.js`, usando apenas chave publishable.
- Migrações de identidade, multi-farmácia, módulos operacionais e documentos empresariais aplicadas no projecto Supabase.
- 21 tabelas públicas verificadas com Row Level Security activo.
- Portal de registo empresarial: `frontend/adesao.html`.
- Central SaaS: `frontend/index.html`, protegida por Supabase Auth e pela tabela `platform_admins`.
- A base de dados encontra-se inicialmente sem farmácias/candidaturas/documentos.
- A interface operacional antiga em `frontend/app.js` continua a ser um protótipo local e não deve ser confundida com módulos já ligados ao PostgreSQL.

## Estrutura

- `frontend/` — páginas HTML, CSS e JavaScript.
- `database/migrations/` — migrações SQL aplicadas no Supabase.
- `backend/` — reservado para serviços adicionais; a autenticação, PostgreSQL, API e Storage actuais são fornecidos pelo Supabase.
- `docs/` — instalação, configuração e segurança.

## Ver no navegador

A pasta de publicação do Cloudflare Pages é `frontend` e não necessita de comando de build.

- Central SaaS: `/`
- Adesão e registo de farmácias: `/adesao.html`

Domínio pretendido: https://farmacia.kanawasoft.shop

A publicação do domínio depende de ligar este repositório ao Cloudflare Pages e configurar o domínio. A existência dos ficheiros no GitHub, por si só, não publica o site.

## Configuração de publicação Cloudflare Pages

- Framework preset: None
- Build command: deixar vazio
- Build output directory: `frontend`
- Root directory: deixar vazio
- Associar o domínio personalizado `farmacia.kanawasoft.shop`

## Segurança

- Nunca colocar `service_role` ou `sb_secret` no browser.
- O frontend utiliza apenas a chave publishable.
- As tabelas expostas têm RLS activo.
- Documentos empresariais são guardados no bucket privado `pharmacy-legal-documents`.
- O primeiro Super Admin é atribuído por operação administrativa segura, nunca por auto-registo público.
- Não usar dados reais de pacientes nem operações comerciais antes de concluir os testes funcionais, fiscais, farmacêuticos e de segurança.

## Próximas fases

1. Publicar/confirmar o domínio no Cloudflare Pages.
2. Validar Site URL e Redirect URLs no Supabase Auth.
3. Testar o fluxo completo de adesão e aprovação com uma conta de teste.
4. Integrar os módulos operacionais (POS, compras, stock, lotes, caixa, finanças e relatórios) nas tabelas PostgreSQL; actualmente o antigo `app.js` permanece protótipo local.
5. Completar testes de segurança, auditoria, backups e regras legais aplicáveis em Angola.

## Aviso

A aprovação comercial pela Central SaaS não substitui alvarás, licenças ou autorizações das autoridades competentes.
