# Diário de Campo — PIEX

Portal do diário de campo semanal da disciplina PIEX (Curso de Extensão Curricularizada).

**No ar:** https://gabrielfortes-xdglab.github.io/piex-psicologia/

Arquivo único, sem build. A estudante preenche no navegador e envia; o registro cai
numa planilha do Google, e um painel mostra quem está em dia.

## Duas trilhas por semana

Ao abrir a semana, a estudante diz se foi **dia de campo** ou **dia de aula**, e isso
define o formulário.

**Dia de campo**, cinco blocos:

1. Planejamento — o que foi planejado e o objetivo em verbo observável
2. Execução / acompanhamento — o que aconteceu, o que funcionou, o que não funcionou
3. Avaliação — o objetivo do dia foi atingido, com evidência
4. Modificações para a próxima semana
4.1 Reflexividade — implicação de quem escreve

O campo é **Psicologia Educacional**, e os exemplos de apoio são de escola.

**Dia de aula**, quatro perguntas: resumo, o que a aula fez pensar, conexão com algo
anterior, e se ocorreu algo inédito.

## Entrega

O botão **Enviar registro** é a entrega, e devolve um número de protocolo. O PDF
continua disponível, mas como cópia da estudante.

A chave que liga tudo é a **matrícula**, normalizada nos dois lados (sem ponto, sem
espaço, sem acento). Reenvio é permitido: a planilha guarda o histórico e o painel
mostra sempre a última versão.

Enquanto o endpoint não estiver configurado, o botão de envio some e o app volta a
funcionar só com PDF.

## Arquivos

| Arquivo | O que é |
|---|---|
| `index.html` | O app inteiro, incluindo o jsPDF embutido |
| `apps-script/Codigo.gs` | Recebe os envios e monta as abas da planilha |
| `INSTALACAO.md` | Passo a passo da planilha e do endpoint |

## Para editar as perguntas

Tudo o que é configurável está em `index.html`, no bloco `<script id="cfg">`:
disciplina, data de início, total de semanas, endpoint, tipos de dia e os blocos.
Não é preciso mexer no CSS nem no restante do JavaScript.

Mexeu nos campos, mexa também na lista `CAMPOS` do `Codigo.gs`. Os ids têm de bater.
