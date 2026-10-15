# Archivum — Regras de Negócio

> **Fonte de verdade das regras de negócio.** As tabelas e colunas referenciadas aqui estão
> definidas em [`modelo-de-dados.md`](./modelo-de-dados.md).

- **Empréstimos simultâneos**: um aluno não pode ter **mais de 3 empréstimos ativos**
  simultâneos. Validado na aplicação (contagem de `emprestimo` com `status = 'ativo'` do
  aluno); **não** é constraint de banco.
- **Prazo**: cada empréstimo dura até **15 dias úteis**.
  `data_prevista_devolucao = data_retirada + 15 dias úteis` (pula sábados e domingos).
  **Feriados não são considerados** nesta versão.
- **Renovação**: o aluno precisa comparecer à biblioteca. A renovação incrementa
  `renovacoes` e avança `data_prevista_devolucao` em +15 dias úteis. O histórico detalhado
  de renovações **não** é armazenado nesta versão (decisão registrada).
- **Devolução**: preencher `data_devolucao`, `status = 'devolvido'`,
  `bibliotecario_devolucao_id`, e devolver o exemplar para `disponivel`.
- **Atraso** (derivado, não armazenado): `data_devolucao IS NULL AND
data_prevista_devolucao < hoje`, ou `data_devolucao > data_prevista_devolucao`.
- **Bloqueio por atraso** (derivado, não armazenado): o aluno fica bloqueado para novos
  empréstimos enquanto tiver empréstimo vencido e não devolvido, e — após devolver com
  atraso — pela mesma quantidade de dias de atraso, contados a partir da devolução
  (`data_devolucao + dias_de_atraso`).
- **Conta ativa**: `ativo = false` impede o login (bibliotecário) e novos empréstimos
  (aluno).
