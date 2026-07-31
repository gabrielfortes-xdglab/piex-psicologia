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
  { id:"pl_ancora",       titulo:"1 · leitura do território" },
  { id:"pl_mudou",        titulo:"1 · o plano mudou" },
  { id:"ex_fatos",        titulo:"2 · o que aconteceu" },
  { id:"ex_funcionou",    titulo:"2 · o que funcionou" },
  { id:"ex_naofuncionou", titulo:"2 · o que não funcionou" },
  { id:"ex_imprevisto",   titulo:"2 · imprevisto" },
  { id:"ex_ajuste",       titulo:"2 · ajuste na hora" },
  { id:"av_veredito",     titulo:"3 · veredito" },
  { id:"av_evidencia",    titulo:"3 · evidência" },
  { id:"av_quem",         titulo:"3 · quem avaliou" },
  { id:"av_devolutiva",   titulo:"3 · devolutiva" },
  { id:"mo_aprimorar",    titulo:"4 · o que aprimorar" },
  { id:"mo_proximo",      titulo:"4 · plano da próxima" },
  { id:"mo_quem",         titulo:"4 · quem decidiu junto" },
  { id:"rf_incomodo",     titulo:"4.1 · incômodo" },
  { id:"rf_lugar",        titulo:"4.1 · de que lugar" },
  { id:"rf_pergunta",     titulo:"4.1 · pergunta p/ supervisão" },
  { id:"rf_compromisso",  titulo:"4.1 · compromisso" }
];

/* Campos obrigatórios de cada trilha: é sobre eles que a completude é
   calculada. Os opcionais ficam de fora de propósito.                   */
var OBRIGATORIOS = {
  aula:  ["au_resumo","au_pensar","au_conexao"],
  campo: ["pl_plano","pl_objetivo","pl_ancora",
          "ex_fatos","ex_funcionou","ex_naofuncionou","ex_imprevisto",
          "av_veredito","av_evidencia","av_quem","av_devolutiva",
          "mo_aprimorar","mo_proximo","mo_quem",
          "rf_incomodo","rf_lugar","rf_compromisso"]
};

var META = ["chave","protocolo","recebido_em","matricula","nome","sobrenome",
            "curso","grupo","colegas","territorio","semana","tipo","data_do_dia",
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
      if (obrig.indexOf(CAMPOS[i].id) >= 0 && v.length >= MIN_CARACTERES) preenchidos++;
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
      String(d.curso || "").trim(),
      String(d.grupo || "").trim(),
      String(d.colegas || "").trim(),
      String(d.territorio || "").trim(),
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

function configurarPlanilha() {
  var ss = SpreadsheetApp.getActive();
  criaConfig(ss);
  criaTurma(ss);
  criaRespostas(ss);
  criaPainel(ss);
  criaLeitura(ss);
  ss.setActiveSheet(ss.getSheetByName("painel"));
  SpreadsheetApp.getUi().alert(
    "Pronto.\n\nAgora: cole a lista da turma na aba \"turma\" e confira a data de início na aba \"config\"."
  );
}

function aba(ss, nome) {
  var sh = ss.getSheetByName(nome);
  if (!sh) sh = ss.insertSheet(nome);
  return sh;
}

function criaConfig(ss) {
  var sh = aba(ss, "config");
  if (sh.getLastRow() > 0) return;            // já configurada, não sobrescreve
  sh.getRange("A1:B5").setValues([
    ["parâmetro", "valor"],
    ["Primeira segunda-feira (semana 1)", "2026-08-03"],
    ["Total de semanas", TOTAL_SEMANAS],
    ["Mínimo de caracteres por campo", MIN_CARACTERES],
    ["Semana de hoje (calculada)", ""]
  ]);
  /* Atenção: fórmulas gravadas pelo Apps Script usam SEMPRE vírgula como
     separador, mesmo que a planilha esteja em português e mostre ponto e
     vírgula depois. Trocar por ";' aqui quebra a gravação.                */
  sh.getRange("B5").setFormula(
    '=IF(B2="","",MIN(B3,MAX(1,ROUNDDOWN((TODAY()-B2)/7)+1)))'
  );
  sh.getRange("A1:B1").setFontWeight("bold");
  sh.getRange("B2").setNumberFormat("yyyy-mm-dd");
  sh.setColumnWidth(1, 260);
  sh.getRange("A7").setValue(
    'A data acima é a única coisa que você precisa ajustar a cada semestre.'
  ).setFontColor("#777");
}

function criaTurma(ss) {
  var sh = aba(ss, "turma");
  if (sh.getLastRow() > 0) return;
  sh.getRange("A1:D1").setValues([["matricula", "nome", "sobrenome", "grupo"]])
    .setFontWeight("bold");
  sh.setFrozenRows(1);
  sh.getRange("F1").setValue(
    "Cole aqui a lista da turma. A matrícula é a chave: escreva só números e letras, sem ponto."
  ).setFontColor("#777");
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
  sh.hideColumns(1);                          // a coluna "chave" é de uso interno
}

function criaPainel(ss) {
  var sh = aba(ss, "painel");
  sh.clear();
  sh.clearConditionalFormatRules();

  var nCols = 2 + TOTAL_SEMANAS + 2;          // matrícula, nome, semanas, atraso, último envio

  sh.getRange("A1").setValue("Painel de acompanhamento").setFontWeight("bold").setFontSize(13);
  sh.getRange("A2").setFormula('="Semana de hoje: "&config!B5&"   ·   ✓ completo   !  raso   vermelho: não entregou"');
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
  sh.getRange("A5").setFormula('=IFERROR(FILTER(turma!A2:A,turma!A2:A<>""),"")');
  sh.getRange("B5").setFormula(
    '=ARRAYFORMULA(IF(A5:A="","",TRIM(IFERROR(VLOOKUP(A5:A,turma!A:C,2,FALSE),"")&" "&IFERROR(VLOOKUP(A5:A,turma!A:C,3,FALSE),""))))'
  );

  /* Uma escrita só: 200 chamadas de setFormula estouram o tempo limite.    */
  var linhas = 200;
  var pAtraso = 3 + TOTAL_SEMANAS;
  var bloco = [];
  for (var r = 5; r < 5 + linhas; r++) {
    var linha = [];
    for (var c = 0; c < TOTAL_SEMANAS; c++) {
      var col = 3 + c;
      linha.push(
        '=IF($A' + r + '="","",IFERROR(IF(LOOKUP(2,1/(respostas!$A$2:$A=$A' + r + '&"|"&' +
        colLetra(col) + '$4),respostas!$N$2:$N)="completo","✓","!"),""))'
      );
    }
    /* atraso = semanas já vencidas menos as que têm alguma coisa gravada */
    linha.push(
      '=IF($A' + r + '="","",MIN(' + TOTAL_SEMANAS + ',MAX(0,config!$B$5))' +
      '-COUNTIF(OFFSET($C' + r + ',0,0,1,MIN(' + TOTAL_SEMANAS + ',MAX(1,config!$B$5))),"✓")' +
      '-COUNTIF(OFFSET($C' + r + ',0,0,1,MIN(' + TOTAL_SEMANAS + ',MAX(1,config!$B$5))),"!"))'
    );
    linha.push(
      '=IF($A' + r + '="","",IFERROR(TEXT(LOOKUP(2,1/(respostas!$D$2:$D=$A' + r + '),respostas!$C$2:$C),"dd/mm hh:mm"),"—"))'
    );
    bloco.push(linha);
  }
  sh.getRange(5, 3, linhas, TOTAL_SEMANAS + 2).setFormulas(bloco);

  var grade = sh.getRange(5, 3, linhas, TOTAL_SEMANAS);
  var regras = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("✓").setBackground("#d9ead3").setFontColor("#38761d")
      .setRanges([grade]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo("!").setBackground("#fff2cc").setFontColor("#bf9000")
      .setRanges([grade]).build(),
    /* vermelho só até a semana de hoje: semana futura em branco não é falta */
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($A5<>"",C5="",C$4<=config!$B$5)')
      .setBackground("#f4cccc").setRanges([grade]).build()
  ];
  sh.setConditionalFormatRules(regras);

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

  sh.getRange("A6").setFormula(
    '=IF(OR($B$3="",$B$4=""),"escolha matrícula e semana acima",' +
    'IFERROR(VLOOKUP($B$3,turma!A:C,2,FALSE)&" "&VLOOKUP($B$3,turma!A:C,3,FALSE)&' +
    '"   ·   "&LOOKUP(2,1/(respostas!$A$2:$A=$B$3&"|"&$B$4),respostas!$L$2:$L)&' +
    '"   ·   enviado "&TEXT(LOOKUP(2,1/(respostas!$A$2:$A=$B$3&"|"&$B$4),respostas!$C$2:$C),"dd/mm/yyyy hh:mm")&' +
    '"   ·   protocolo "&LOOKUP(2,1/(respostas!$A$2:$A=$B$3&"|"&$B$4),respostas!$B$2:$B),' +
    '"sem registro enviado para essa semana"))'
  );
  sh.getRange("A6").setFontWeight("bold");

  /* Uma pergunta por linha, com a resposta ao lado. Só aparecem as
     perguntas da trilha que a estudante escolheu naquela semana.          */
  var rotulos = [], formulas = [];
  for (var i = 0; i < CAMPOS.length; i++) {
    var colResposta = colLetra(META.length + 1 + i);
    rotulos.push([CAMPOS[i].titulo]);
    formulas.push([
      '=IF(OR($B$3="",$B$4=""),"",IFERROR(LOOKUP(2,1/(respostas!$A$2:$A=$B$3&"|"&$B$4),respostas!$' +
      colResposta + '$2:$' + colResposta + '),""))'
    ]);
  }
  sh.getRange(8, 1, CAMPOS.length, 1).setValues(rotulos);
  sh.getRange(8, 2, CAMPOS.length, 1).setFormulas(formulas);

  sh.getRange("A8:A" + (7 + CAMPOS.length)).setFontWeight("bold").setVerticalAlignment("top");
  sh.getRange("B8:B" + (7 + CAMPOS.length)).setWrap(true).setVerticalAlignment("top");
  sh.setColumnWidth(1, 210);
  sh.setColumnWidth(2, 700);
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
