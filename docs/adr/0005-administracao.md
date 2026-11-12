# ADR 0005 — Área administrativa

- **Data:** 2026-11-12
- **Status:** aceita

## Contexto

O catálogo só existe se alguém o cadastra. A API da etapa 3 já recusa escrita de quem não é ADMIN; faltava a interface para o administrador usar essas rotas: gêneros, artistas, lançamentos com faixas, imagens e a cor da página do álbum.

## Decisão

1. **Rotas `/admin/*` em duas camadas de proteção.** `ProtectedRoute` (precisa estar logado) e `AdminRoute` (precisa ser ADMIN). As duas são conveniência de navegação. A proteção real é a API, que responde 401 ou 403 a qualquer escrita sem permissão, com ou sem a tela.
2. **Os formulários não repetem as regras da API.** O frontend só converte o que os campos guardam em texto no que a API entende (anos em número, duração `3:45` em milissegundos, vazio em `null`) e aponta o que a API não conseguiria interpretar. Regras de negócio (país com duas letras, data real, cor com contraste) ficam na API, cujos erros por campo aparecem embaixo do campo certo. Assim as regras têm uma fonte só.
3. **Capa e cor em um painel separado do formulário principal.** A API escolhe a cor ao receber a capa. Se a cor fizesse parte do formulário, salvar o texto do lançamento logo depois sobrescreveria a cor recém-extraída com o valor antigo. O painel mostra a cor aplicada em um exemplo (botão, nota e medidor) e o contraste calculado.
4. **Imagem só depois de salvar.** Capa e foto precisam do id do registro; por isso o envio fica disponível na tela de edição. Depois de criar um lançamento, a pessoa é levada à edição, com um aviso.
5. **Exclusão em dois passos, na própria tela**, no lugar do diálogo nativo do navegador. Quando a API recusa (artista com lançamentos, gênero em uso), a mensagem dela explica o motivo.
6. **Após qualquer alteração, todas as consultas do catálogo são refeitas.** O catálogo é pequeno e as telas se cruzam (a discografia do artista muda quando se edita um lançamento). Invalidar tudo é mais simples e seguro do que decidir caso a caso.
7. **Busca e página na URL** nas listas, para o botão "voltar" e os links funcionarem.

## Alternativas consideradas

- **Compartilhar esquemas de validação entre frontend e backend**: exigiria um pacote comum ou duplicação; os dois projetos são independentes. Descartado em favor da API como única fonte das regras.
- **Salvar a cor junto com o formulário do lançamento**: mais simples na tela, mas com o risco de sobrescrita descrito acima.
- **Tela de importação em massa**: fica para a v1.1, junto da integração com o MusicBrainz.

## Consequências

- Uma regra nova da API aparece na tela sem alteração no frontend, desde que seja um erro por campo.
- O usuário comum que digita `/admin` na barra de endereço vê "Área restrita", não uma tela quebrada.
- O primeiro administrador é criado fora da interface (`npm run seed:admin` ou SQL), para que não exista rota que promova contas.
