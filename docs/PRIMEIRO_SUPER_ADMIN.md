# Primeiro Super Administrador SaaS

E-mail designado: `dpedrosolucoes.oficial@gmail.com`

## Estado
A conta ainda não foi encontrada em `auth.users` no momento da preparação. O privilégio de Super Administrador **não** é concedido por este documento nem por auto-registo.

## Preparar autenticação
1. No projeto Supabase `KANAWASOFT-FARMACIA-PRO`, abrir **Authentication → Providers → Email**.
2. Confirmar que o provider Email está ativo.
3. Manter a confirmação de e-mail ativa para novos registos.
4. Configurar os URLs de Site URL e Redirect URLs apenas depois de definir o domínio oficial da aplicação Farmácia.
5. Registar o utilizador com o e-mail indicado e confirmar a mensagem recebida.

## Promover após confirmação
Depois de o utilizador existir em Authentication → Users e apresentar e-mail confirmado, executar no SQL Editor do projeto a consulta abaixo. Confirmar que devolve exatamente uma linha.

```sql
insert into public.platform_admins (user_id)
select id
from auth.users
where lower(email) = lower('dpedrosolucoes.oficial@gmail.com')
  and email_confirmed_at is not null
on conflict (user_id) do nothing
returning user_id, created_at;
```

Se não devolver uma linha, não considerar a promoção concluída: verificar se a conta foi criada e se o e-mail está confirmado. Não inserir UUID manualmente nem atribuir privilégios através de `user_metadata`.

## Segurança
- Nunca colocar `service_role` ou secret key no frontend.
- Não permitir que utilizadores comuns escrevam em `platform_admins`.
- A tabela `platform_admins` tem RLS; a leitura está limitada ao próprio administrador.
- A promoção inicial deve ser feita por operador com acesso administrativo ao SQL Editor.
