# Configuração de autenticação — KANAWA SOFT FARMÁCIA PRO

## Endereços oficiais

- Site de produção: https://farmacia.kanawasoft.shop
- Supabase Project URL: https://nfelunbfnnrceofskofe.supabase.co
- Callback de autenticação: https://farmacia.kanawasoft.shop/

## Configurar no Supabase Dashboard

No projeto **KANAWASOFT-FARMACIA-PRO**, abrir **Authentication → URL Configuration** e definir:

**Site URL**
`https://farmacia.kanawasoft.shop`

**Redirect URLs** (adicionar cada uma):
- `https://farmacia.kanawasoft.shop/**`
- `http://localhost:*/**` (apenas para desenvolvimento local, se necessário)

Guardar as alterações. Confirmar também em **Authentication → Providers → Email** que o fornecedor Email está ativo e que a confirmação de endereço de e-mail permanece ativada.

## Modelos de links de autenticação

Os links de confirmação e recuperação devem regressar ao domínio oficial. Não desativar a validação de e-mail em produção.

## Segurança

- O frontend utiliza exclusivamente a chave publishable.
- Nunca colocar `service_role` ou `sb_secret` no browser, HTML, JavaScript público ou repositório.
- As tabelas de negócio devem ter RLS e isolamento por `pharmacy_id`.
- O primeiro Super Admin só pode ser promovido depois de a conta existir e o e-mail estar confirmado.

## Estado

O cliente Supabase foi configurado no ficheiro `frontend/supabase.js`. A configuração Site URL/Redirect URLs é uma definição de Authentication no Dashboard e deve ser guardada no painel; o acesso de repositório não altera essa definição.
