# KANAWA SOFT FARMÁCIA PRO

Sistema de Gestão de Farmácia com arquitectura SaaS, desenvolvido pela KANAWA SOFT.

> Estado do repositório: estrutura inicial. Os módulos funcionais, a API e a base de dados ainda devem ser integrados e testados antes de qualquer utilização real.

## Estrutura

- `frontend/` — aplicação web (HTML, CSS, JavaScript).
- `backend/` — API e serviços do servidor.
- `database/` — migrações, esquema e dados de demonstração.
- `saas/` — gestão central, tenants, planos e subscrições.
- `docs/` — arquitectura, instalação, operação e segurança.

## Módulos previstos

1. Painel / indicadores
2. Ponto de venda (POS)
3. Medicamentos e produtos
4. Stock e inventário
5. Lotes e validade (FEFO)
6. Compras e fornecedores
7. Clientes
8. Receitas e dispensa
9. Caixa e turnos
10. Finanças
11. Funcionários e utilizadores
12. Perfis e permissões
13. Relatórios
14. Configurações
15. Auditoria
16. Administração SaaS

## Tecnologias previstas

- Frontend: HTML, CSS e JavaScript.
- Backend: Node.js e Express.
- Base de dados: PostgreSQL.
- Autenticação: sessões/tokens com hash seguro de palavras-passe; MFA configurável.
- SaaS: isolamento de dados por farmácia/tenant e controlo de planos.

As versões e dependências concretas serão fixadas nos ficheiros de configuração do projecto.

## Regras essenciais

- Não permitir venda de lotes expirados.
- Aplicar FEFO (primeiro a expirar, primeiro a sair) quando adequado.
- Bloquear stock negativo, salvo regra explícita e autorizada.
- Registar operações sensíveis em auditoria.
- Validar permissões no servidor, não apenas na interface.
- Isolar os dados de cada farmácia no backend e na base de dados.
- Não guardar segredos, tokens ou palavras-passe no repositório.

## Desenvolvimento

Consulte os README de cada pasta e a documentação em `docs/`.

## Aviso

Este repositório não deve ser considerado pronto para produção enquanto não forem concluídos testes funcionais, de segurança, recuperação de backups, isolamento multi-tenant e validação dos requisitos legais/fiscais e farmacêuticos aplicáveis em cada país.
