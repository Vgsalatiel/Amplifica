# ADR 0007 — Avaliações

- **Data:** 2026-11-12
- **Status:** aceita (parte da API; as telas vêm na parte B)

## Contexto

Ver o catálogo é aberto; avaliar exige conta. A etapa 5 define como nota e resenha são guardadas, validadas, calculadas e moderadas.

## Decisão

1. **Uma avaliação por pessoa e por disco** (índice único em `userId` e `releaseId`). Avaliar de novo substitui a anterior, com `PUT .../reviews/me`, que é idempotente. A substituição é completa: enviar só a nota apaga o texto que havia.
2. **Nota inteira de 1 a 10**, validada na API e **de novo no banco** por uma regra `CHECK` na migration, a última barreira se algo gravar por fora da API.
3. **Resenha opcional**, até 3.000 caracteres, texto simples. Vazio ou só espaços vale como "sem texto". Nada de HTML ou formatação: o texto é exibido como texto.
4. **A média é calculada na hora** (`aggregate` no banco) e devolvida no disco como `rating: { average, count }`, arredondada para uma casa. Não há coluna gravada no disco: com poucos dados é mais simples e nunca desatualiza. A coluna passa a valer a pena quando houver ordenação por nota.
5. **A lista de resenhas mostra só as avaliações com texto**, da mais recente para a mais antiga. Notas sem texto contam na média e na contagem, mas não ocupam a lista. A página do perfil mostra todas as avaliações da pessoa.
6. **Quem apaga:** o autor, ou um administrador (moderação). A regra é uma política (`ReviewPolicy`), consultada pelo service depois de carregar a avaliação, porque depende de quem é o dono do registro. Não há denúncia nesta etapa.
7. **Disco ainda não lançado não recebe nota.** A data guardada decide; com só o ano conhecido vale o 1º de janeiro.
8. **O autor aparece só com o que é público** (nome de usuário, nome de exibição, foto), nunca o e-mail. Há um teste que procura o e-mail na resposta inteira.
9. **Limite de 20 gravações por minuto e por pessoa** (e não por endereço IP), para uso normal sobrar e automação ser barrada.
10. **Apagar um disco ou uma conta leva as avaliações junto** (`ON DELETE CASCADE`).

## O que um teste revelou

Duas gravações simultâneas da mesma pessoa davam 200 e 500: o `upsert` do Prisma, com o adaptador que usamos, não evita sozinho o conflito no índice único. O service agora tenta de novo uma vez quando o índice barra a segunda gravação, e a nova tentativa atualiza a avaliação já criada. Um teste contra o banco cobre o caso.

## Alternativas consideradas

- **Coluna `ratingAvg` e `ratingCount` no disco**, como no planejamento original: útil para ordenar por nota, desnecessária hoje.
- **Meio ponto na escala** (0,5 em 0,5): mais granularidade, mas a escala de 1 a 10 já tem dez níveis e combina com o medidor da interface.
- **Listar também as notas sem texto**: enche a lista de linhas sem conteúdo.

## Limites conhecidos

- Qualquer conta pode avaliar. Sem confirmação de e-mail (que exigiria um serviço de envio), contas falsas são possíveis. A mitigação é o limite de gravações e a remoção pelo administrador.
- Não há histórico de edições: a nova avaliação substitui a antiga. A API só informa se ela foi alterada mais de um minuto depois de criada.
- Avaliações são públicas, como o perfil.
