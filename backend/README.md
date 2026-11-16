# Backend

API Node.js/Express prevista para autenticação, autorização, regras de negócio e integração PostgreSQL.

Responsabilidades:
- autenticação e MFA;
- autorização por perfil/permissão;
- isolamento por tenant/farmácia;
- operações de POS, stock, lotes, compras e clientes;
- auditoria e validação de entradas;
- endpoints documentados.

Nunca guardar segredos no Git. Usar variáveis de ambiente e validar todas as permissões no servidor.
