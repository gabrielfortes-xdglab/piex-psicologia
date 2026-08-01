/**
 * Diário de Campo PIEX — recebimento dos registros e montagem do painel.
 *
 * Duas coisas moram aqui:
 *   doPost(e)          recebe o envio do site e grava uma linha em "respostas"
 *   configurarPlanilha() cria as abas, os cabeçalhos, as fórmulas e as cores
 *
 * Instalação e implantação: ver INSTALACAO.md no repositório.
 */

/* ============================ parâmetros ============================ */

var TOTAL_SEMANAS = 15;

/* Quantos caracteres um campo precisa ter para não contar como raso.
   Não é nota: é só o corte que pinta a célula de amarelo no painel.     */
var MIN_CARACTERES = 60;

/* Colunas de conteúdo, na ordem em que aparecem na planilha.
   Os ids têm de ser os mesmos do index.html. Mexer aqui depois que a
   turma já enviou desalinha as colunas antigas.                         */
var CAMPOS = [
  // trilha "dia de aula"
  { id:"au_resumo",       titulo:"Aula · resumo" },
  { id:"au_pensar",       titulo:"Aula · o que fez pensar" },
  { id:"au_conexao",      titulo:"Aula · conexão anterior" },
  { id:"au_novidade",     titulo:"Aula · ocorreu algo novo" },
  // trilha "dia de campo"
  { id:"pl_plano",        titulo:"1 · plano da ida" },
  { id:"pl_objetivo",     titulo:"1 · objetivo observável" },
  { id:"pl_mudou",        titulo:"1 · o plano mudou" },
  { id:"ex_fatos",        titulo:"2 · o que aconteceu" },
  { id:"ex_funcionou",    titulo:"2 · o que funcionou" },
  { id:"ex_naofuncionou", titulo:"2 · o que não funcionou" },
  { id:"ex_imprevisto",   titulo:"2 · imprevisto" },
  { id:"ex_ajuste",       titulo:"2 · ajuste na hora" },
  /* min próprio: o veredito é escolha de uma opção curta ("Atingido"),
     e nunca alcançaria o corte de caracteres dos campos de texto.        */
  { id:"av_veredito",     titulo:"3 · veredito", min:1 },
  { id:"av_evidencia",    titulo:"3 · evidência" },
  { id:"av_quem",         titulo:"3 · avaliação dos participantes" },
  { id:"mo_aprimorar",    titulo:"4 · o que aprimorar" },
  { id:"rf_incomodo",     titulo:"4 · reflexividade" }
];

/* Campos obrigatórios de cada trilha: é sobre eles que a completude é
   calculada. Os opcionais ficam de fora de propósito.                   */
var OBRIGATORIOS = {
  aula:  ["au_resumo","au_pensar","au_conexao"],
  campo: ["pl_plano","pl_objetivo",
          "ex_fatos","ex_funcionou","ex_naofuncionou","ex_imprevisto",
          "av_veredito","av_evidencia","av_quem",
          "mo_aprimorar","rf_incomodo"]
};

var META = ["chave","protocolo","recebido_em","matricula","nome","sobrenome",
            "grupo","colegas","semana","tipo","data_do_dia",
            "status","preenchidos","de","caracteres"];

/* ============================ recebimento ============================ */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ ok:false, erro:"O servidor está ocupado. Tente de novo em alguns segundos." });
  }
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok:false, erro:"Envio vazio." });
    }
    var d = JSON.parse(e.postData.contents);

    var matricula = normMatricula(d.matricula);
    var semana    = parseInt(d.semana, 10);
    var tipo      = String(d.tipo || "");

    if (!matricula)                                return json({ ok:false, erro:"Matrícula em branco." });
    if (!(semana >= 1 && semana <= TOTAL_SEMANAS)) return json({ ok:false, erro:"Semana inválida." });
    if (tipo !== "aula" && tipo !== "campo")       return json({ ok:false, erro:"Tipo de dia inválido." });

    var respostas = d.respostas || {};
    var obrig = OBRIGATORIOS[tipo];
    var preenchidos = 0, caracteres = 0;
    for (var i = 0; i < CAMPOS.length; i++) {
      var v = String(respostas[CAMPOS[i].id] || "").trim();
      caracteres += v.length;
      var corte = CAMPOS[i].min || MIN_CARACTERES;
      if (obrig.indexOf(CAMPOS[i].id) >= 0 && v.length >= corte) preenchidos++;
    }
    var status = preenchidos === obrig.length ? "completo"
               : (preenchidos === 0 ? "vazio" : "raso");

    var agora = new Date();
    var protocolo = fazProtocolo(matricula, semana, agora);

    var linha = [
      matricula + "|" + semana,
      protocolo,
      agora,
      matricula,
      String(d.nome || "").trim(),
      String(d.sobrenome || "").trim(),
      String(d.grupo || "").trim(),
      String(d.colegas || "").trim(),
      semana,
      tipo,
      String(d.dataDia || ""),
      status,
      preenchidos,
      obrig.length,
      caracteres
    ];
    for (var j = 0; j < CAMPOS.length; j++) {
      linha.push(String(respostas[CAMPOS[j].id] || "").trim());
    }

    abaRespostas().appendRow(linha);
    return json({ ok:true, protocolo:protocolo, status:status });

  } catch (err) {
    return json({ ok:false, erro:"Erro ao gravar: " + err });
  } finally {
    lock.releaseLock();
  }
}

/* Um GET no endpoint serve só para conferir que a implantação está viva. */
function doGet() {
  return json({ ok:true, servico:"Diário PIEX", campos:CAMPOS.length });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* Mesma regra do index.html: sem pontuação, sem acento, maiúsculas.
   É o que impede "2023.1234" e "20231234" de virarem duas pessoas.      */
function normMatricula(v) {
  return String(v || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

function fazProtocolo(matricula, semana, quando) {
  var t = Utilities.formatDate(quando, fuso(), "yyMMddHHmm");
  var sufixo = matricula.slice(-4) || "0000";
  return "PIEX-S" + pad2(semana) + "-" + t + "-" + sufixo;
}
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function fuso() { return SpreadsheetApp.getActive().getSpreadsheetTimeZone() || "America/Maceio"; }

function abaRespostas() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName("respostas");
  if (!sh) throw new Error('A aba "respostas" não existe. Rode configurarPlanilha() primeiro.');
  return sh;
}

/* ========================= montagem da planilha ========================= */

/* Separador de argumentos das fórmulas.
   Planilha em inglês usa vírgula; em português, ponto e vírgula. O Apps
   Script grava a fórmula como texto, sem traduzir, então escrever vírgula
   numa planilha em pt-BR produz #ERROR! em toda célula. Descobrimos qual é
   o separador testando uma fórmula de sonda, em vez de adivinhar pela
   localidade. Nos modelos abaixo, o til ~ marca onde entra o separador.   */
var SEP = ",";
function fx(t) { return t.replace(/~/g, SEP); }

function descobreSeparador(ss) {
  var sh = ss.insertSheet("__sonda__");
  try {
    sh.getRange("A1").setFormula("=SUM(1,2)");
    SpreadsheetApp.flush();
    SEP = (sh.getRange("A1").getValue() === 3) ? "," : ";";
  } catch (e) {
    SEP = ";";
  } finally {
    ss.deleteSheet(sh);
  }
  return SEP;
}

function configurarPlanilha() {
  var ss = SpreadsheetApp.getActive();
  descobreSeparador(ss);

  /* Cada etapa é isolada: um tropeço numa aba não pode impedir a montagem
     das seguintes, que foi exatamente o que aconteceu na primeira versão.
     O que falhar aparece nomeado no aviso e no registro de execução.     */
  var etapas = [
    ["config",    criaConfig],
    ["turma",     criaTurma],
    ["respostas", criaRespostas],
    ["painel",    criaPainel],
    ["leitura",   criaLeitura]
  ];
  var falhas = [];
  for (var i = 0; i < etapas.length; i++) {
    try {
      etapas[i][1](ss);
    } catch (e) {
      falhas.push(etapas[i][0]);
      Logger.log("Falhou em '" + etapas[i][0] + "': " + e + "\n" + (e.stack || ""));
    }
  }

  var alvo = ss.getSheetByName("painel");
  if (alvo) ss.setActiveSheet(alvo);

  /* toast em vez de alert: não bloqueia a execução quando a função é
     rodada do editor, com a aba da planilha em segundo plano.            */
  ss.toast(
    falhas.length
      ? "Falhou em: " + falhas.join(", ") + ". Veja o registro de execução."
      : "Abas montadas (separador \"" + SEP + "\"). Agora: cole a turma na aba \"turma\" e confira a data em \"config\".",
    "Diário PIEX", 15
  );
}

function aba(ss, nome) {
  var sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  return sh;
}

function criaConfig(ss) {
  var sh = aba(ss, "config");
  /* Os valores só entram na primeira vez, para não apagar o que você
     ajustou. A fórmula é reescrita sempre, para que rodar de novo
     conserte uma planilha montada com o separador errado.               */
  if (sh.getLastRow() === 0) {
    sh.getRange("A1:B4").setValues([
      ["parâmetro", "valor"],
      ["Primeira segunda-feira (semana 1)", "2026-08-03"],
      ["Total de semanas", TOTAL_SEMANAS],
      ["Mínimo de caracteres por campo", MIN_CARACTERES]
    ]);
    sh.getRange("A7").setValue(
      'A data acima é a única coisa que você precisa ajustar a cada semestre.'
    ).setFontColor("#777");
  }
  sh.getRange("A5").setValue("Semana de hoje (calculada)");
  sh.getRange("B5").setFormula(
    fx('=IF(B2=""~""~MIN(B3~MAX(1~ROUNDDOWN((TODAY()-B2)/7)+1)))')
  );
  sh.getRange("A1:B1").setFontWeight("bold");
  sh.getRange("B2").setNumberFormat("yyyy-mm-dd");
  sh.setColumnWidth(1, 260);
}

function criaTurma(ss) {
  var sh = aba(ss, "turma");
  if (sh.getLastRow() === 0) {
    sh.getRange("A1:D1").setValues([["matricula", "nome", "sobrenome", "grupo"]])
      .setFontWeight("bold");
    sh.setFrozenRows(1);
    sh.getRange("F1").setValue(
      "Cole aqui a lista da turma. A matrícula é a chave: escreva só números e letras, sem ponto."
    ).setFontColor("#777");
  }
  /* Sempre, mesmo com a aba já preenchida: sem isso o Sheets lê 00123456
     como número e engole os zeros à esquerda, e a matrícula deixa de
     bater com a que chega do site.                                       */
  sh.getRange("A:A").setNumberFormat("@");
}

function criaRespostas(ss) {
  var sh = aba(ss, "respostas");
  var cab = META.slice();
  for (var i = 0; i < CAMPOS.length; i++) cab.push(CAMPOS[i].titulo);
  if (sh.getLastRow() === 0) {
    sh.appendRow(cab);
  } else {
    sh.getRange(1, 1, 1, cab.length).setValues([cab]);
  }
  sh.getRange(1, 1, 1, cab.length).setFontWeight("bold").setWrap(false);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(4);
  sh.getRange("C:C").setNumberFormat("dd/mm/yyyy hh:mm");
  /* Chave e matrícula em formato texto, pelo mesmo motivo da aba turma:
     zero à esquerda não pode se perder na gravação.                      */
  sh.getRange(colMeta("chave") + ":" + colMeta("chave")).setNumberFormat("@");
  sh.getRange(colMeta("matricula") + ":" + colMeta("matricula")).setNumberFormat("@");
  sh.hideColumns(1);                          // a coluna "chave" é de uso interno
}

function criaPainel(ss) {
  var sh = aba(ss, "painel");
  sh.clear();
  sh.clearConditionalFormatRules();

  var nCols = 2 + TOTAL_SEMANAS + 2;          // matrícula, nome, semanas, atraso, último envio

  sh.getRange("A1").setValue("Painel de acompanhamento").setFontWeight("bold").setFontSize(13);
  sh.getRange("A2").setFormula('="Semana de hoje: "&config!B5&"   ·   ✓ completo   !  raso   vermelho: não entregou"');
  /* (essa fórmula não tem argumentos, então não depende do separador) */
  sh.getRange("A2").setFontColor("#777");

  var cab = ["matricula", "estudante"];
  for (var s = 1; s <= TOTAL_SEMANAS; s++) cab.push(s);
  cab.push("em atraso", "último envio");
  sh.getRange(4, 1, 1, nCols).setValues([cab]).setFontWeight("bold")
    .setHorizontalAlignment("center");
  sh.getRange("A4:B4").setHorizontalAlignment("left");
  sh.setFrozenRows(4);
  sh.setFrozenColumns(2);

  /* A grade puxa da aba turma e cruza com respostas. LOOKUP(2,1/(...)) pega
     sempre a ÚLTIMA linha que bate, que é o reenvio mais recente.          */
  sh.getRange("A5").setFormula(fx('=IFERROR(FILTER(turma!A2:A~turma!A2:A<>"")~"")'));
  sh.getRange("B5").setFormula(fx(
    '=ARRAYFORMULA(IF(A5:A=""~""~TRIM(IFERROR(VLOOKUP(A5:A~turma!A:C~2~FALSE)~"")&" "&IFERROR(VLOOKUP(A5:A~turma!A:C~3~FALSE)~""))))'
  ));

  /* Uma escrita só: 200 chamadas de setFormula estouram o tempo limite.    */
  var linhas = 200;
  var pAtraso = 3 + TOTAL_SEMANAS;
  var cChave = colMeta("chave"), cStatus = colMeta("status"),
      cMat = colMeta("matricula"), cRecebido = colMeta("recebido_em");
  var bloco = [];
  for (var r = 5; r < 5 + linhas; r++) {
    var linha = [];
    for (var c = 0; c < TOTAL_SEMANAS; c++) {
      var col = 3 + c;
      linha.push(fx(
        '=IF($A' + r + '=""~""~IFERROR(IF(LOOKUP(2~1/(respostas!$' + cChave + '$2:$' + cChave + '=$A' + r + '&"|"&' +
        colLetra(col) + '$4)~respostas!$' + cStatus + '$2:$' + cStatus + ')="completo"~"✓"~"!")~""))'
      ));
    }
    /* atraso = semanas já vencidas menos as que têm alguma coisa gravada */
    linha.push(fx(
      '=IF($A' + r + '=""~""~MIN(' + TOTAL_SEMANAS + '~MAX(0~config!$B$5))' +
      '-COUNTIF(OFFSET($C' + r + '~0~0~1~MIN(' + TOTAL_SEMANAS + '~MAX(1~config!$B$5)))~"✓")' +
      '-COUNTIF(OFFSET($C' + r + '~0~0~1~MIN(' + TOTAL_SEMANAS + '~MAX(1~config!$B$5)))~"!"))'
    ));
    linha.push(fx(
      '=IF($A' + r + '=""~""~IFERROR(TEXT(LOOKUP(2~1/(respostas!$' + cMat + '$2:$' + cMat + '=$A' + r +
      ')~respostas!$' + cRecebido + '$2:$' + cRecebido + ')~"dd/mm hh:mm")~"—"))'
    ));
    bloco.push(linha);
  }
  sh.getRange(5, 3, linhas, TOTAL_SEMANAS + 2).setFormulas(bloco);

  var grade = sh.getRange(5, 3, linhas, TOTAL_SEMANAS);
  function regras(sep) {
    return [
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("✓").setBackground("#d9ead3").setFontColor("#38761d")
        .setRanges([grade]).build(),
      SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo("!").setBackground("#fff2cc").setFontColor("#bf9000")
        .setRanges([grade]).build(),
      /* vermelho só até a semana de hoje: semana futura em branco não é falta */
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND($A5<>""' + sep + 'C5=""' + sep + 'C$4<=config!$B$5)')
        .setBackground("#f4cccc").setRanges([grade]).build()
    ];
  }
  /* A regra de formatação passa por outro caminho da API que o das células,
     e nem sempre aceita o mesmo separador. Se recusar, tentamos o outro; se
     recusar os dois, seguimos sem o vermelho, que é só cosmético. Isso não
     pode derrubar a montagem das abas seguintes.                          */
  try {
    sh.setConditionalFormatRules(regras(SEP));
  } catch (e1) {
    try {
      sh.setConditionalFormatRules(regras(SEP === "," ? ";" : ","));
    } catch (e2) {
      sh.setConditionalFormatRules(regras(SEP).slice(0, 2));
      Logger.log("Sem a regra de 'não entregou': " + e2);
    }
  }

  grade.setHorizontalAlignment("center").setFontSize(11);
  sh.setColumnWidth(1, 100);
  sh.setColumnWidth(2, 200);
  for (var k = 0; k < TOTAL_SEMANAS; k++) sh.setColumnWidth(3 + k, 34);
}

function criaLeitura(ss) {
  var sh = aba(ss, "leitura");
  sh.clear();

  sh.getRange("A1").setValue("Ler um registro").setFontWeight("bold").setFontSize(13);
  sh.getRange("A3").setValue("matrícula").setFontWeight("bold");
  sh.getRange("A4").setValue("semana").setFontWeight("bold");

  var vMat = SpreadsheetApp.newDataValidation()
    .requireValueInRange(ss.getSheetByName("turma").getRange("A2:A"), true).build();
  sh.getRange("B3").setDataValidation(vMat);
  sh.getRange("B4").setDataValidation(
    SpreadsheetApp.newDataValidation().requireNumberBetween(1, TOTAL_SEMANAS).build()
  );
  sh.getRange("B3:B4").setBackground("#fff2cc");

  var K  = '$' + colMeta("chave") + '$2:$' + colMeta("chave");
  var busca = 'LOOKUP(2~1/(respostas!' + K + '=$B$3&"|"&$B$4)~respostas!';
  sh.getRange("A6").setFormula(fx(
    '=IF(OR($B$3=""~$B$4="")~"escolha matrícula e semana acima"~' +
    'IFERROR(VLOOKUP($B$3~turma!A:C~2~FALSE)&" "&VLOOKUP($B$3~turma!A:C~3~FALSE)&' +
    '"   ·   "&' + busca + '$' + colMeta("tipo") + '$2:$' + colMeta("tipo") + ')&' +
    '"   ·   enviado "&TEXT(' + busca + '$' + colMeta("recebido_em") + '$2:$' + colMeta("recebido_em") + ')~"dd/mm/yyyy hh:mm")&' +
    '"   ·   protocolo "&' + busca + '$' + colMeta("protocolo") + '$2:$' + colMeta("protocolo") + ')~' +
    '"sem registro enviado para essa semana"))'
  ));
  sh.getRange("A6").setFontWeight("bold");

  /* Uma pergunta por linha, com a resposta ao lado. Só aparecem as
     perguntas da trilha que a estudante escolheu naquela semana.          */
  var rotulos = [], formulas = [];
  for (var i = 0; i < CAMPOS.length; i++) {
    var colResposta = colLetra(META.length + 1 + i);
    rotulos.push([CAMPOS[i].titulo]);
    formulas.push([fx(
      '=IF(OR($B$3=""~$B$4="")~""~IFERROR(' + busca + '$' +
      colResposta + '$2:$' + colResposta + ')~""))'
    )]);
  }
  sh.getRange(8, 1, CAMPOS.length, 1).setValues(rotulos);
  sh.getRange(8, 2, CAMPOS.length, 1).setFormulas(formulas);

  sh.getRange("A8:A" + (7 + CAMPOS.length)).setFontWeight("bold").setVerticalAlignment("top");
  sh.getRange("B8:B" + (7 + CAMPOS.length)).setWrap(true).setVerticalAlignment("top");
  sh.setColumnWidth(1, 210);
  sh.setColumnWidth(2, 700);
}

/* Letra da coluna de um campo de META, calculada em vez de escrita à mão.
   Assim, tirar ou acrescentar uma coluna não desalinha as fórmulas.       */
function colMeta(nome) {
  var i = META.indexOf(nome);
  if (i < 0) throw new Error("Coluna desconhecida em META: " + nome);
  return colLetra(i + 1);
}

function colLetra(n) {
  var s = "";
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

/* Menu próprio, para não precisar abrir o editor de script toda vez. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Diário PIEX")
    .addItem("Montar/atualizar abas", "configurarPlanilha")
    .addToUi();
}
