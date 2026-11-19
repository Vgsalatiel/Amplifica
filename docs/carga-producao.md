# Carga de dados em produção

O script `backend/scripts/carga-producao.sh` grava no banco de **produção** as bandas (`catalog:seed`), as capas, as fotos do manifesto (`images:seed`) e, se pedido, a playlist de clipes. Pode ser repetido: nada é duplicado, e o que o admin editou só é sobrescrito nas bandas que você mandar atualizar.

## 1. Arquivo de credenciais (fora do repositório)

Crie um arquivo **só seu**, por exemplo `~/amplifica-prod.env`, com permissão 600:

```bash
touch ~/amplifica-prod.env && chmod 600 ~/amplifica-prod.env
```

Conteúdo (os valores saem do painel do Neon e do Render; **não cole senhas em conversas**):

```
DATABASE_URL="postgresql://…"            # a mesma que o Render usa (com pooler)
DATABASE_URL_UNPOOLED="postgresql://…"   # conexão direta, só para as migrations
JWT_ACCESS_SECRET="…"                    # qualquer texto com 32+ caracteres serve na carga
STORAGE_S3_ENDPOINT="…"                  # as 5 variáveis STORAGE_* do Render, para capas e fotos
STORAGE_S3_BUCKET="…"
STORAGE_S3_ACCESS_KEY_ID="…"
STORAGE_S3_SECRET_ACCESS_KEY="…"
STORAGE_PUBLIC_URL="…"
```

Sem as cinco `STORAGE_*`, o script ainda grava as bandas, mas **pula capas e fotos** e avisa.

Quando terminar: `rm ~/amplifica-prod.env`.

## 2. Primeiro, simule

```bash
cd backend
./scripts/carga-producao.sh --env-file ~/amplifica-prod.env --dry-run
```

Mostra o host do banco, a lista de bandas e as etapas, sem tocar em nada.

## 3. O que falta hoje em produção

Pelo que a API de produção respondia em 19/11/2026, as 85 bandas novas, Scatolove, Aurora Rules, Becold e Antipoética já estão lá. Faltam as **11 bandas lidas do YouTube Music** (Forfun e Day Limns ainda nem existem) e as **4 fotos**:

```bash
cd backend
./scripts/carga-producao.sh --env-file ~/amplifica-prod.env \
  --only forfun,day-limns,nx-zero,ponto-nulo-no-ceu,attanos,cronica-ativa,point-of-no-return,de-carne-e-flor,marabo,project46,us-4 \
  --update nx-zero,ponto-nulo-no-ceu,attanos,cronica-ativa,point-of-no-return,de-carne-e-flor,marabo,project46,us-4
```

Antes, faça o `git push` e espere o deploy do Render: a migration do crédito das fotos (`artist_image_credit`) entra sozinha nele, e a etapa das fotos precisa dela.

O script roda as migrations (pule com `--skip-migrate`), as bandas, as capas e, no fim, as fotos do manifesto, que **só funcionam no seu computador** porque a pasta `frontend/img/bandasimgaens` não vai para o git.

## Outras opções

| Opção | Para quê |
|---|---|
| `--since REF` | só os arquivos de bandas alterados desde um commit |
| `--only a,b` | só estas bandas (nome do arquivo, sem `.json`) |
| `--update a,b` ou `all` | bandas que já existem e devem ser atualizadas pelo arquivo |
| `--skip-covers`, `--skip-images`, `--skip-migrate` | pula a etapa |
| `--images-only` | só grava as fotos do manifesto (sem bandas nem migrations) |
| `--clips` | também grava a playlist de clipes |
| `--confirm-host HOST` | confirma sem perguntar (sem terminal) |

## Segurança embutida

- Pede que você **digite o host do banco** antes de gravar.
- **Recusa** se o banco do arquivo for o mesmo do `backend/.env` (desenvolvimento).
- Recusa arquivo de credenciais legível por outras contas.
- Ignora variáveis do seu shell: só vale o que está no arquivo.
- Nunca imprime senhas, só o host; o registro completo vai para `/tmp/carga-producao-<data>.log`.
- Tenta cada banda até 3 vezes (o MusicBrainz e o Cover Art Archive às vezes falham por rede) e, no fim, diz quais falharam e o comando para repetir só elas.

## Depois da carga

Abra a página de uma banda com foto (Forfun, NX Zero) e confira a linha "Foto: autor, licença, via Wikimedia Commons".

## Só as fotos

Para publicar as fotos novas do manifesto (`band-images.json`) sem repetir a carga das bandas:

```bash
./scripts/carga-producao.sh --env-file ~/amplifica-prod.env --images-only --dry-run
./scripts/carga-producao.sh --env-file ~/amplifica-prod.env --images-only
```

Isso exige as cinco `STORAGE_*` no arquivo e a pasta `frontend/img/bandasimgaens/` (com a subpasta `livres/`) neste computador. O que já tem foto em produção é mantido; a foto nova só entra em quem ainda não tem.
