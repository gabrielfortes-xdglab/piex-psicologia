# Instalação — planilha e envio

Uma vez por semestre. Leva uns 15 minutos.

## 1. Criar a planilha

1. Crie uma planilha nova no Google Drive da conta institucional. Nome sugerido:
   `PIEX — Diário de Campo 2026.2`.
2. Menu **Extensões → Apps Script**.
3. Apague o conteúdo do arquivo que abrir e cole tudo o que está em
   [`apps-script/Codigo.gs`](apps-script/Codigo.gs).
4. Salve (ícone de disquete).

## 2. Montar as abas

1. Ainda no editor de script, escolha a função `configurarPlanilha` na lista do topo
   e clique em **Executar**.
2. Na primeira vez o Google pede autorização. Ele mostra um aviso de "app não
   verificado": é o seu próprio script, então clique em **Avançado → Ir para
   (nome do projeto)**.
3. Volte para a planilha. Vão existir cinco abas:

| Aba | Para que serve |
|---|---|
| `config` | A data de início do semestre. É o único ajuste recorrente. |
| `turma` | A lista de estudantes. Você preenche. |
| `respostas` | Base bruta, uma linha por envio. Não precisa olhar. |
| `painel` | A grade de acompanhamento. É aqui que você trabalha. |
| `leitura` | Escolhe matrícula e semana, mostra o registro inteiro. |

## 3. Preencher a turma e a data

- Em `config!B2`, ponha a **segunda-feira da semana 1**.
- Em `turma`, cole as colunas `matricula`, `nome`, `sobrenome`, `grupo`.
  A matrícula tem que ser só números e letras, sem ponto e sem espaço.

## 4. Publicar o endpoint

1. No editor de script: **Implantar → Nova implantação**.
2. Tipo: **App da Web**.
3. Executar como: **Eu**.
4. Quem pode acessar: **Qualquer pessoa**.
5. Copie a URL gerada, que termina em `/exec`.

O passo 4 costuma assustar, então vale entender o que ele significa: "qualquer
pessoa" pode **escrever** na planilha por esse endereço, e ninguém pode **ler**
nada por ele. Quem tiver a URL consegue, no máximo, inserir uma linha de registro.
Ver os diários exige acesso à planilha, que continua restrita a você.

## 5. Ligar o app ao endpoint

Em [`index.html`](index.html), no bloco `<script id="cfg">`:

```js
envio: {
  endpoint: "https://script.google.com/macros/s/AKfy.../exec",
  ativo:    true
},
```

Enquanto `endpoint` estiver vazio, o app esconde o botão de envio e volta a
funcionar só com PDF. É o modo seguro para testar.

Faça o commit e o push; o GitHub Pages republica em cerca de um minuto.

## 6. Testar antes de abrir para a turma

1. Ponha a sua própria matrícula fictícia na aba `turma` (ex.: `00000000`).
2. Abra o site, preencha uma semana e envie.
3. Confira: apareceu uma linha em `respostas`, a célula correspondente ficou
   verde no `painel`, e o texto aparece na aba `leitura`.
4. Envie a mesma semana de novo com o texto alterado. Deve entrar uma segunda
   linha em `respostas`, e o `painel` e a `leitura` devem mostrar a versão nova.

## Como ler o painel

- **✓ verde**: enviado com todos os campos obrigatórios acima de 60 caracteres.
- **! amarelo**: enviado, mas com campo obrigatório em branco ou muito curto.
- **vermelho**: semana já vencida sem envio nenhum.
- **em branco**: semana que ainda não chegou.
- **em atraso**: quantas semanas vencidas essa pessoa não entregou.

O corte de 60 caracteres está em `MIN_CARACTERES`, no topo do `Codigo.gs`. Ele
mede tamanho, não qualidade: separa quem entregou de quem não entregou, e o
julgamento do conteúdo continua sendo leitura sua, agora por exceção.

## Quando mudar as perguntas

Se você alterar, acrescentar ou remover um campo em `index.html`, altere também
a lista `CAMPOS` no `Codigo.gs` e rode `configurarPlanilha` de novo. Os ids têm de
ser idênticos nos dois arquivos, senão a resposta cai na coluna errada.

Não renomeie um id depois que a turma já enviou: os envios antigos ficam órfãos.
