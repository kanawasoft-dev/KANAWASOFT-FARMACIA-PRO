# Estado técnico — KANAWA SOFT FARMÁCIA PRO

## Alterações efectuadas
- Login distingue a Central SaaS (platform_admins) e a área de uma farmácia (pharmacy_members).
- O painel operacional deixou de usar localStorage como fonte de dados e passou a consultar o Supabase por pharmacy_id.
- Foram ligados os módulos de produtos, fornecedores, clientes, lotes, movimentos de stock, compras (consulta), vendas (consulta), receitas, caixa, finanças, funcionários, utilizadores/membros, relatórios, configurações e auditoria.
- O painel mostra apenas dados da farmácia associada à sessão; o isolamento final é aplicado pelas políticas RLS no PostgreSQL.
- Foram acrescentados índices de apoio às chaves estrangeiras.
- Foi criado workflow de deploy Cloudflare Pages pelo GitHub Actions.

## Limitações que continuam abertas
- O workflow de deploy só inicia depois de configurar o segredo GitHub CLOUDFLARE_API_TOKEN com um token Cloudflare que tenha permissão Pages Write.
- O deploy inicial ainda precisa de ser confirmado; o projecto Pages não tinha deployment na auditoria.
- O POS ainda não grava cabeçalho + linhas + baixa de stock numa única transacção. O módulo de vendas está em consulta para evitar vendas incompletas.
- Compras ainda não gravam cabeçalho + itens + entrada de stock numa transacção; o módulo está em consulta.
- Convites e criação de utilizadores Auth precisam de uma Edge Function/fluxo administrativo seguro; o módulo actual consulta membros existentes.
- Fecho de caixa, movimentos de caixa e reconciliação precisam de completar o fluxo.
- A protecção Supabase contra palavras-passe comprometidas continua desactivada; activar em Auth > Settings > Password Security.
- Ainda é necessário testar adesão completa, upload e revisão de documentos, login de proprietário, login de operador e permissões por papel.

## Segurança
- Não colocar service_role ou sb_secret no navegador nem no GitHub.
- O cliente público usa apenas a publishable key.
- O domínio raiz kanawasoft.shop não deve ser alterado por este projecto.
- O domínio de publicação deste sistema é apenas farmacia.kanawasoft.shop.