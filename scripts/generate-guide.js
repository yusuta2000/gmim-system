const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, AlignmentType, HeadingLevel, WidthType,
  BorderStyle, ShadingType, PageBreak
} = require("docx");
const fs = require("fs");

// Education palette
const P = {
  primary: "2A3518",
  body: "384228",
  secondary: "6B8040",
  accent: "D4A030",
  surface: "F8FAF4",
};

function heading1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: P.primary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function heading2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: P.primary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function heading3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, color: P.secondary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function bodyText(text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text, size: 24, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function boldBodyText(label, text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 80 },
    children: [
      new TextRun({ text: label, bold: true, size: 24, color: P.primary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text, size: 24, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
    ],
  });
}

function bulletPoint(text, level = 0) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 60 },
    indent: { left: 480 + (level * 360), hanging: 240 },
    children: [
      new TextRun({ text: "\u2022 ", size: 24, color: P.accent, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text, size: 24, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
    ],
  });
}

function numberedItem(num, text) {
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 60 },
    indent: { left: 480, hanging: 360 },
    children: [
      new TextRun({ text: `${num}. `, bold: true, size: 24, color: P.accent, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text, size: 24, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
    ],
  });
}

function infoBox(title, content) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({
      children: [new TableCell({
        width: { size: 100, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: P.surface },
        margins: { top: 120, bottom: 120, left: 200, right: 200 },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: P.secondary },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: P.secondary },
          left: { style: BorderStyle.SINGLE, size: 6, color: P.accent },
          right: { style: BorderStyle.SINGLE, size: 1, color: P.secondary },
        },
        children: [
          new Paragraph({
            spacing: { after: 80 },
            children: [new TextRun({ text: title, bold: true, size: 24, color: P.primary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
          }),
          new Paragraph({
            spacing: { line: 312 },
            children: [new TextRun({ text: content, size: 22, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
          }),
        ],
      })],
    })],
  });
}

function spacer(h = 120) {
  return new Paragraph({ spacing: { before: h, after: 0 }, children: [] });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 24, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
    },
  },
  sections: [
    // Cover section
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
        },
      },
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [new TableRow({
            height: { value: 16838, rule: "exact" },
            children: [new TableCell({
              width: { size: 100, type: WidthType.PERCENTAGE },
              verticalAlign: "center",
              margins: { top: 2400, bottom: 2400, left: 1800, right: 1800 },
              borders: {
                top: { style: BorderStyle.NONE },
                bottom: { style: BorderStyle.NONE },
                left: { style: BorderStyle.NONE },
                right: { style: BorderStyle.NONE },
              },
              shading: { type: ShadingType.CLEAR, fill: P.surface },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 200 },
                  children: [new TextRun({ text: "GMIM Aras\u0307. Go\u0308r. Go\u0308rev Yo\u0308netim Sistemi", bold: true, size: 44, color: P.primary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 120 },
                  children: [new TextRun({ text: "KULLANIM KILAVUZU", bold: true, size: 36, color: P.accent, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
                }),
                spacer(600),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 80 },
                  children: [new TextRun({ text: "\u0130TU\u0308 Denizcilik Fak\u00fcltesi", size: 28, color: P.secondary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 80 },
                  children: [new TextRun({ text: "Gemi Makineleri \u0130s\u0307letme Mu\u0308hendislig\u0306i B\u00f6l\u00fcm\u00fc", size: 26, color: P.secondary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
                }),
                spacer(400),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 60 },
                  children: [new TextRun({ text: "Haziran 2026", size: 24, color: P.secondary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "my-project-ashy-theta.vercel.app", size: 22, color: P.accent, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
                }),
              ],
            })],
          })],
        }),
      ],
    },
    // Body section
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 },
          margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
        },
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "GMIM Aras\u0307. Go\u0308r. Yo\u0308netim Sistemi - Kullan\u0131m K\u0131lavuzu  |  Sayfa ", size: 18, color: P.secondary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary, font: { ascii: "Calibri" } }),
            ],
          })],
        }),
      },
      children: [
        // 1. SISTEM HAKKINDA
        heading1("1. Sistem Hakk\u0131nda"),
        bodyText("GMIM Aras\u0307. Go\u0308r. Go\u0308rev Yo\u0308netim Sistemi, \u0130TU\u0308 Denizcilik Fak\u00fcltesi Gemi Makineleri \u0130s\u0307letme Mu\u0308hendislig\u0306i b\u00f6l\u00fcm\u00fcndeki aras\u0307\u0131rma go\u0308revlilerinin is\u0307 yo\u0308ku\u0308nu adil ve s\u0131ral\u0131 bir s\u0307ekilde dag\u0306\u0131tmak, takip etmek ve yo\u0308netmek ic\u0307in gelis\u0307tirilmis\u0307 bir c\u0307evrimic\u0307i platformdur. Daha \u00f6nce Excel \u00fczerinden yu\u0308ru\u0308t\u00fclen puan takibi ve go\u0308rev dag\u0306\u0131t\u0131m\u0131 is\u0307lemleri art\u0131k bu sistem uzerinden dig\u0306ital olarak ger\u0307c\u0307ekles\u0307tirilmektedir."),
        spacer(80),
        boldBodyText("Sistem Adresi: ", "my-project-ashy-theta.vercel.app"),
        boldBodyText("Teknoloji: ", "Next.js 16 + PostgreSQL (Neon) + Vercel"),
        boldBodyText("Eris\u0307im: ", "Her aras\u0307. go\u0308r. kendi e-posta ve s\u0131fresiyle sisteme g\u0131ris\u0307 yapabilir. Internet bag\u0306lant\u0131s\u0131 olan her yerden eris\u0307ilebilir."),
        spacer(120),

        // 2. GIRIS YAPMA
        heading1("2. Sisteme G\u0131ris\u0307"),
        bodyText("Sisteme g\u0131ris\u0307 yapmak ic\u0307in sag\u0306 \u00fcst\u0307teki \"G\u0131ris\u0307\" butonuna t\u0131klay\u0131n. Kendi \u0130TU\u0308 e-posta adresinizi ve s\u0131frenizi girerek g\u0131ris\u0307 yapabilirsiniz."),
        spacer(80),
        heading2("2.1 G\u0131ris\u0307 Bilgileri"),
        bodyText("Giris bilgileri guvenli bir kanal uzerinden yetkili yonetici tarafindan saglanir; parola Git veya kullanim kilavuzunda yer almaz."),
        bulletPoint("Ilk giristen sonra sifrenizi portal uzerinden degistirin."),
        spacer(80),
        infoBox("Guvenlik Notu", "Parolanizi ilk giristen sonra degistirin ve hicbir dokumana, mesaja veya paylasilan dosyaya yazmayin."),
        spacer(120),

        // 3. ROLLER
        heading1("3. Roller ve Yetk\u0131ler"),
        bodyText("Sistemde iki farkl\u0131 rol vard\u0131r. Tems\u0131lci (admin) rol\u00fc daha genis\u0307 yetkilere s\u0131hiptirken, aras\u0307. go\u0308r. rol\u00fc k\u0131s\u0131tl\u0131 yetk\u0131lerle s\u0131stem\u0131 kullan\u0131r."),
        spacer(80),

        heading2("3.1 Tems\u0131lci (Admin) Yetk\u0131leri"),
        bulletPoint("Tum aras\u0307. go\u0308rlerin puan tablosunu go\u0308rebil\u0131r"),
        bulletPoint("D\u00f6nem yo\u0308net\u0131m\u0131 (puan s\u0131f\u0131rlama / tas\u0307\u0131ma) yapab\u0131l\u0131r"),
        bulletPoint("G\u00f6rev atayab\u0131l\u0131r (atad\u0131g\u0306\u0131 görev otomat\u0131k onaylan\u0131r)"),
        bulletPoint("G\u00f6rev s\u0131lebil\u0131r (onayl\u0131 görev s\u0131l\u0131n\u0131rsa puan d\u00fcş\u00fcr\u00fcl\u00fcr)"),
        bulletPoint("Bekleyen görev onaylar\u0131n\u0131 onaylayab\u0131l\u0131r / reddedeb\u0131l\u0131r"),
        bulletPoint("Tum görevler\u0131 k\u0131s\u0131 bazl\u0131 f\u0131ltreleyeb\u0131l\u0131r"),
        bulletPoint("Aras\u0307. go\u0308r. durumunu akt\u0131f / pas\u0131f yapab\u0131l\u0131r (yurt d\u0131s\u0307\u0131ndak\u0131ler ic\u0307\u0131n)"),
        bulletPoint("D\u0131\u0131m\u0131 görevler\u0131 dog\u0306rudan d\u00fczenleyeb\u0131l\u0131r"),
        bulletPoint("Bekleyen d\u0131\u0131m\u0131 görev deg\u0306is\u0307iklik talepler\u0131n\u0131 onaylayab\u0131l\u0131r / reddedeb\u0131l\u0131r"),
        bulletPoint("S\u0131nav go\u0308zetmen\u0131 otomat\u0131k atayab\u0131l\u0131r"),
        spacer(80),

        heading2("3.2 Aras\u0307. Go\u0308r. Yetk\u0131leri"),
        bulletPoint("Kend\u0131 puan\u0131n\u0131 ve s\u0131ralamas\u0131n\u0131 go\u0308rebil\u0131r"),
        bulletPoint("Kend\u0131 \u0131ş gec\u0307m\u0131s\u0307\u0131n\u0131 go\u0308reb\u0131l\u0131r"),
        bulletPoint("G\u00f6rev b\u0131ld\u0131r\u0131m\u0131 yapab\u0131l\u0131r (tems\u0131lci onay\u0131 beklen\u0131r)"),
        bulletPoint("Kend\u0131 d\u0131\u0131m\u0131 görevler\u0131n\u0131 d\u00fczenleme taleb\u0131nde bulunab\u0131l\u0131r (tems\u0131lci onay\u0131 beklen\u0131r)"),
        bulletPoint("B\u0131ld\u0131r\u0131mler\u0131 ve du\u0308zenleme talepler\u0131n\u0131 takip edeb\u0131l\u0131r"),
        spacer(120),

        // 4. PUAN TABLOSU
        heading1("4. Puan Tablosu (Dashboard)"),
        bodyText("Puan Tablosu, s\u0131stem\u0131n ana sayfas\u0131d\u0131r. Burada aras\u0307. go\u0308rlerin toplam puanlar\u0131 s\u0131ral\u0131 b\u0131r s\u0307ek\u0131lde go\u0308ster\u0131l\u0131r. En az puanl\u0131 aras\u0307. go\u0308r. en \u00fcst\u0307te yer al\u0131r ve \"\u00d6NCEL\u0130KL\u0130\" \u0131bare s\u0131yle \u0130s\u0307aretlen\u0131r. Bu, yen\u0131 görevler\u0131n k\u0131me ver\u0131lmes\u0131 gerekt\u0131g\u0131n\u0131 go\u0308ster\u0131r."),
        spacer(80),
        heading2("4.1 Puan S\u0131stem\u0131n\u0131n Mant\u0131g\u0306\u0131"),
        bodyText("Puan s\u0131stem\u0131 \"en az puan alan \u00f6nce\" mant\u0131g\u0131yla c\u0307al\u0131s\u0307\u0131r. Yen\u0131 b\u0131r görev geld\u0131g\u0306\u0131nda, puan\u0131 en d\u00fcş\u00fck olan aras\u0307. go\u0308re \u00f6ncel\u0131kl\u0131 olarak ver\u0131l\u0131r. Bu sayede is\u0307 yo\u0308ku\u0308 dengel\u0131 b\u0131r s\u0307ek\u0131lde dag\u0306\u0131t\u0131lm\u0131s\u0307 olur. Her görev\u0131n puan de\u0306er\u0131, görev\u0131n t\u00fcr\u00fcne ve s\u00fcres\u0131ne go\u0308re deg\u0306\u0131s\u0307\u0131r ve \"Puan Barem\u0131\" sekmes\u0131nde tan\u0131mlanm\u0131s\u0307t\u0131r."),
        spacer(80),
        heading2("4.2 D\u00f6nem Yo\u0308net\u0131m\u0131"),
        bodyText("D\u00f6nem Yo\u0308net\u0131m\u0131 butonu yaln\u0131zca tems\u0131lc\u0131 taraf\u0131ndan go\u0308r\u00fcn\u00fcr. Her y\u0131l bas\u0307\u0131nda veya d\u00f6nem deg\u0306\u0131s\u0307\u0131kl\u0131g\u0131nda puanlar\u0131 yo\u0308netmek ic\u0307\u0131n kulan\u0131l\u0131r. \u0130k\u0131 sec\u0307enek vard\u0131r:"),
        spacer(80),
        numberedItem(1, "Puanlar\u0131 Tas\u0307\u0131: Mevcut puanlar\u0131 oldu\u0308gu g\u0131b\u0131 yen\u0131 d\u00f6neme aktar\u0131r. B\u0131r\u0131k\u0131ml\u0131 s\u0131stem\u0131n devam etmes\u0131n\u0131 sag\u0306lar. Kim\u0131n 321 puan\u0131 varsa yen\u0131 d\u00f6nemde de 321 \u0131le bas\u0307lar."),
        numberedItem(2, "S\u0131f\u0131rla: Herkes\u0131n puan\u0131n\u0131 0 yapar. Yen\u0131 d\u00f6nem tem\u0131z b\u0131r sayfa ac\u0307\u0131l\u0131r, herkes es\u0131t start al\u0131r."),
        spacer(80),
        infoBox("\u00d6ner\u0131", "Genelde aras\u0307. go\u0308r s\u0131stemler\u0131nde y\u0131lbas\u0307\u0131nda s\u0131f\u0131rlama yap\u0131l\u0131r. Bu sayede ad\u0131l b\u0131r dag\u0306\u0131l\u0131m sag\u0306lan\u0131r. Anc\u0131k b\u0131r\u0131k\u0131ml\u0131 s\u0131stem\u0131 terc\u0307\u0131h ed\u0131yorsan\u0131z \"Tas\u0307\u0131\" sec\u0307eneg\u0306\u0131n\u0131 kulanab\u0131l\u0131rs\u0131n\u0131z."),
        spacer(120),

        // 5. GOREVLER
        heading1("5. G\u00f6revler"),
        heading2("5.1 G\u00f6rev Bild\u0131r\u0131m\u0131 (Aras\u0307. Go\u0308r.)"),
        bodyText("Aras\u0307. go\u0308rler yapt\u0131klar\u0131 \u0131s\u0307ler\u0131 s\u0131steme b\u0131ld\u0131rerek puan kazanab\u0131l\u0131r. G\u00f6rev sekmes\u0131ndek\u0131 formu doldurun:"),
        numberedItem(1, "G\u00f6rev a\u00e7\u0131klamas\u0131 yaz\u0131n (orne\u0307in: \"MÜDEK toplant\u0131s\u0131na kat\u0131ld\u0131m\")"),
        numberedItem(2, "\u0130stersen\u0131z AI s\u0131n\u0131fland\u0131rma butonuna (y\u0131ld\u0131z \u0131konu) t\u0131klayarak otomat\u0131k kategor\u0131 es\u0307les\u0307t\u0131rme yapab\u0131l\u0131rs\u0131n\u0131z"),
        numberedItem(3, "Kategor\u0131 ve puan sec\u0307\u0131n (AI otomat\u0131k \u00f6ner\u0131r, istersen\u0131z deg\u0306\u0131s\u0307t\u0131reb\u0131l\u0131rs\u0131n\u0131z)"),
        numberedItem(4, "Tar\u0131h ve saat g\u0131r\u0131n"),
        numberedItem(5, "\"G\u00f6rev\u0131 Go\u0308nder (Onaya)\" butonuna t\u0131klay\u0131n"),
        spacer(80),
        infoBox("\u00d6neml\u0131", "G\u00f6rev\u0131n\u0131z tems\u0131lci onay\u0131na go\u0308nder\u0131l\u0131r. Onaylanmad\u0131kca puan eklenmez. Onayland\u0131ktan sonra puan\u0131n\u0131z otomat\u0131k g\u00fcncellen\u0131r."),
        spacer(80),

        heading2("5.2 G\u00f6rev Atama (Tems\u0131lc\u0131)"),
        bodyText("Tems\u0131lc\u0131, herhang\u0131 b\u0131r aras\u0307. go\u0308re dog\u0306rudan görev atayab\u0131l\u0131r. Atanan görev otomat\u0131k olarak onaylan\u0131r ve puan an\u0131nda eklen\u0131r. Ayn\u0131 form kulan\u0131l\u0131r fakat \"G\u00f6rev\u0131 Ata\" butonu go\u0308r\u00fcn\u00fcr."),
        spacer(80),

        heading2("5.3 G\u00f6rev S\u0131lme (Tems\u0131lc\u0131)"),
        bodyText("Tems\u0131lc\u0131, yanl\u0131s\u0307 g\u0131r\u0131lm\u0131s\u0307 veya \u0131ptal ed\u0131lmes\u0131 gereken görevler\u0131 s\u0131lebil\u0131r. Her görev\u0131n sag\u0306\u0131ndak\u0131 c\u0307o\u0308p kutusu \u0131konuna t\u0131klayarak s\u0131lme \u0131s\u0307lem\u0131 yap\u0131l\u0131r. E\u0308ger s\u0131l\u0131nen görev onayl\u0131 b\u0131r görevse, \u0131lg\u0131l\u0131 k\u0131s\u0131n\u0131n puan\u0131 otomat\u0131k olarak d\u00fcş\u00fcr\u00fcl\u00fcr ve k\u0131s\u0131 b\u0131ld\u0131r\u0131m al\u0131r."),
        spacer(80),

        heading2("5.4 \u0130s\u0307 Gec\u0307m\u0131s\u0307\u0131 ve F\u0131ltreleme"),
        bodyText("Aras\u0307. go\u0308rler yaln\u0131zca kendi \u0131ş gec\u0307m\u0131s\u0307ler\u0131n\u0131 go\u0308reb\u0131l\u0131r. Tems\u0131lc\u0131 ise tum görevler\u0131 toplu go\u0308reb\u0131l\u0131r ve \u0131st\u0131rsa k\u0131s\u0131 bazl\u0131 f\u0131ltreleyerek tek tek her aras\u0307. go\u0308r\u00fcn g\u00f6rev gec\u0307m\u0131s\u0307\u0131n\u0131 \u0131nceleyeb\u0131l\u0131r. F\u0131ltreleme \u0131c\u0307\u0131n görev l\u0131stes\u0131n\u0131n \u00fcst\u00fcndek\u0131 ac\u0131l\u0131r menuden k\u0131s\u0131 sec\u0307\u0131l\u0131r."),
        spacer(120),

        // 6. ONAYLAR
        heading1("6. Onay S\u00fcrec\u0307\u0131"),
        bodyText("Aras\u0307. go\u0308rler taraf\u0131ndan g\u00f6nder\u0131len görev b\u0131ld\u0131r\u0131mler\u0131 \"Onaylar\" sekmes\u0131nde go\u0308r\u00fcn\u00fcr. Yaln\u0131zca tems\u0131lc\u0131 eris\u0307eb\u0131l\u0131r. Tems\u0131lc\u0131 her b\u0131ld\u0131r\u0131m\u0131 \u0131nceleyerek onaylayab\u0131l\u0131r veya reddedeb\u0131l\u0131r."),
        spacer(80),
        bulletPoint("Onaylanan g\u00f6rev: Puan otomat\u0131k eklen\u0131r, aras\u0307. go\u0308r b\u0131ld\u0131r\u0131m al\u0131r"),
        bulletPoint("Redded\u0131len g\u00f6rev: Puan eklenmez, aras\u0307. go\u0308r b\u0131ld\u0131r\u0131m al\u0131r"),
        bulletPoint("Bekleyen g\u00f6rev say\u0131s\u0131 \u00fcst\u0307 menuden takip ed\u0131l\u0131r (sarı bildirim)"),
        spacer(120),

        // 7. SINAVLAR
        heading1("7. S\u0131navlar ve Go\u0308zetmen Atama"),
        bodyText("S\u0131navlar sekmes\u0131nde s\u0131navlar tan\u0131mlanab\u0131l\u0131r ve go\u0308zetmen atamas\u0131 yap\u0131lab\u0131l\u0131r. S\u0131nav eklerken ders kodu, ders ad\u0131, o\u0308g\u0306ret\u0131m u\u0308yes\u0131, tar\u0131h, g\u00fcn, saat ve gerekl\u0131 go\u0308zetmen say\u0131s\u0131 g\u0131r\u0131l\u0131r."),
        spacer(80),
        heading2("7.1 Otomat\u0131k Go\u0308zetmen Atama"),
        bodyText("\"Otomat\u0131k Ata\" butonuna t\u0131klay\u0131ld\u0131g\u0306\u0131nda s\u0131stem en az puanl\u0131 aras\u0307. go\u0308rlerden bas\u0307layarak go\u0308zetmen atamas\u0131 yapar. Atama yap\u0131l\u0131rken haftal\u0131k program c\u0307ak\u0131s\u0307ma kontrolu yap\u0131l\u0131r; e\u0308ger b\u0131r aras\u0307. go\u0308run s\u0131nav saat\u0131ne denk gelen d\u0131\u0130m\u0131 görev\u0131 varsa, o k\u0131s\u0131 atlan\u0131r ve b\u0131r sonrak\u0131 en az puanl\u0131 k\u0131s\u0131ya gec\u0307\u0131l\u0131r."),
        spacer(120),

        // 8. PERSONEL
        heading1("8. Personel Yo\u0308net\u0131m\u0131"),
        heading2("8.1 Akt\u0131f / Pas\u0131f Durumu"),
        bodyText("Yurt d\u0131s\u0307\u0131nda olan veya gec\u0307\u0131c\u0131 olarak görev yapamayan aras\u0307. go\u0308rler \"Pas\u0131f Yap\" butonu \u0131le pas\u0131fe al\u0131nab\u0131l\u0131r. Pas\u0131f durumdak\u0131 k\u0131s\u0131ler puan s\u0131ralamas\u0131nda ayr\u0131 b\u0131r b\u00f6lumde go\u0308ster\u0131l\u0131r ve görev dag\u0306\u0131t\u0131m\u0131nda go\u0308z o\u0308nu\u0308ne al\u0131nmaz. Donus\u0307ler\u0131nde \"Akt\u0131f Yap\" butonu \u0131le yen\u0131den akt\u0131f ed\u0131leb\u0131l\u0131rler. Bu \u0131s\u0307lem yaln\u0131zca tems\u0131lc\u0131 taraf\u0131ndan yap\u0131lab\u0131l\u0131r."),
        spacer(80),

        heading2("8.2 D\u0131\u0130m\u0131 G\u00f6revler"),
        bodyText("Her aras\u0307. go\u0308run d\u0131\u0130m\u0131 (s\u00fcrekl\u0131) görevler\u0131 Personel sekmes\u0131nde l\u0131stelen\u0131r. D\u00fczenleme yapab\u0131l\u0131r:"),
        bulletPoint("Tems\u0131lc\u0131: Dog\u0306rudan d\u00fczenleyeb\u0131l\u0131r, deg\u0306\u0131s\u0307ikl\u0131k an\u0131nda gec\u0307erl\u0131 olur"),
        bulletPoint("Aras\u0307. go\u0308r: D\u00fczenleme taleb\u0131nde bulunab\u0131l\u0131r, deg\u0306\u0131s\u0307ikl\u0131k tems\u0131lc\u0131 onay\u0131na g\u00f6nder\u0131l\u0131r"),
        bulletPoint("\"D\u00fczenle\" butonuna t\u0131klayarak yen\u0131 görev ekleyeb\u0131l\u0131r veya mevcut görev\u0131 s\u0131lebilirsiniz"),
        bulletPoint("Onay bekleyen deg\u0306\u0131s\u0307ikl\u0131kler k\u0131s\u0131n\u0131n kendi ekran\u0131nda \"Onay bekliyor\" \u0131baresiyle go\u0308ster\u0131l\u0131r"),
        spacer(120),

        // 9. BILDIRIMLER
        heading1("9. B\u0131ld\u0131r\u0131mler"),
        bodyText("Sistemde ger\u0307ekles\u0307en her o\u0306neml\u0131 olayda (\u00f6rneg\u0306\u0131n: g\u00f6rev atama, onay, reddetme, s\u0131lme, d\u0131\u0130m\u0131 görev deg\u0306\u0131s\u0307ikl\u0131g\u0306\u0131) \u0131lg\u0131l\u0131 k\u0131s\u0131lere otomat\u0131k b\u0131ld\u0131r\u0131m g\u00f6nder\u0131l\u0131r. B\u0131ld\u0131r\u0131mlar \u00fcst\u0307 menudek\u0131 c\u0307an \u0131konundan eris\u0307\u0131l\u0131r. Okunmam\u0131s\u0307 b\u0131ld\u0131r\u0131m say\u0131s\u0131 k\u0131rm\u0131z\u0131 \u0131\u015faretle go\u0308ster\u0131l\u0131r."),
        spacer(120),

        // 10. AI SINIFLANDIRMA
        heading1("10. AI Destekl\u0131 G\u00f6rev S\u0131n\u0131fland\u0131rma"),
        bodyText("G\u00f6rev ekleme formunda y\u0131ld\u0131z \u0131konuna t\u0131klayarak AI destekl\u0131 otomat\u0131k kategor\u0131 es\u0307les\u0307t\u0131rme yapab\u0131l\u0131rs\u0131n\u0131z. AI, yazd\u0131g\u0306\u0131n\u0131z g\u00f6rev a\u00e7\u0131klamas\u0131n\u0131 puan barem\u0131ndek\u0131 kategor\u0131lerle es\u0307les\u0307t\u0131r\u0131r ve en uygun kategor\u0131y\u0131 ve puan\u0131 \u00f6ner\u0131r. \u00d6ner\u0131len de\u0306erler\u0131 kabul edeb\u0131l\u0131r veya kendl\u0131n\u0131z sec\u0307eb\u0131l\u0131rs\u0131n\u0131z."),
        spacer(120),

        // 11. SISTEM SUREKLILIGI
        heading1("11. S\u0131stem S\u00fcrekl\u0131l\u0131g\u0306\u0131 ve Guvenl\u0131r\u0131l\u0131g\u0306\u0131"),
        bodyText("S\u0131stem tamamen ucrets\u0307\u0131z ve sures\u0131z b\u0131r s\u0307ek\u0131lde c\u0307al\u0131s\u0307maya devam edecekt\u0131r. A\u015fag\u0306\u0131dak\u0131 b\u0131les\u0307enler\u0131n sures\u0131z ucrets\u0307\u0131z oldug\u0306u teyit ed\u0131lm\u0131s\u0307t\u0131r:"),
        spacer(80),
        bulletPoint("Vercel (Hosting): Hobby plan ucrets\u0307\u0131z, 100GB/ay bant gen\u0131s\u0307l\u0131g\u0131 - 10 k\u0131s\u0131 \u0131c\u0307\u0131n fazlas\u0131yla yeterl\u0131"),
        bulletPoint("Neon (Ver\u0131taban\u0131): Free plan sures\u0307\u0131z, 0.5GB depolama - mevcut ver\u0131ler c\u0307ok az yer kapl\u0131yor"),
        bulletPoint("GitHub (Kod deposu): Public repo ucrets\u0307\u0131z, sures\u0307\u0131z"),
        spacer(80),
        infoBox("D\u0131kkat", "Neon free planda ver\u0131taban\u0131 7 g\u00fcn h\u0131c\u0307 sorgu gelmezse \"uyku moduna\" gece\u0307\u0131r. \u0130lk \u0131stekte 2-3 san\u0131ye \u0131c\u0131nde tekrar uyan\u0131r. G\u00fcnl\u00fck en az b\u0131r k\u0131s\u0131 g\u0131r\u0131s\u0307 yaparsa h\u0131c\u0307b\u0131r sorun yasanmaz. S\u0131stem y\u0131llarca sorunsuz kulan\u0131lab\u0131l\u0131r."),
        spacer(80),
        boldBodyText("Kod Yedeg\u0306i: ", "Tum kod github.com/yusuta2000/gmim-system adres\u0131nde saklanmaktad\u0131r. Herhang\u0131 b\u0131r sorun durumunda kod yen\u0131den deploy ed\u0131lebilir."),
        spacer(120),

        // 12. SIK SORULAN SORULAR
        heading1("12. S\u0131k Sorulan Sorular"),
        spacer(60),

        heading3("S: S\u0131frem\u0131 unuttum, ne yapmal\u0131y\u0131m?"),
        bodyText("Tems\u0131lc\u0131ye bas\u0307vurunuz. Tems\u0131lc\u0131 s\u0131fren\u0131z\u0131 s\u0131f\u0131rlayab\u0131l\u0131r."),
        spacer(60),

        heading3("S: G\u00f6rev b\u0131ld\u0131r\u0131m\u0131m neden henu\u0308z onaylanmad\u0131?"),
        bodyText("Tems\u0131lc\u0131n\u0131n onay\u0131n\u0131 bek\u0131yor olabilir. \"Onaylar\" sekmes\u0131nde bekleyen görevler go\u0308r\u00fcn\u00fcr. Onayland\u0131g\u0306\u0131nda b\u0131ld\u0131r\u0131m alacaks\u0131n\u0131z."),
        spacer(60),

        heading3("S: Yanl\u0131s\u0307l\u0131kla yanl\u0131s\u0307 g\u00f6rev g\u0131rd\u0131m, ne yapab\u0131l\u0131r\u0131m?"),
        bodyText("Tems\u0131lc\u0131ye b\u0131ld\u0131r\u0131n\u0131z. Tems\u0131lc\u0131 g\u00f6rev\u0131 s\u0131lebilir ve puan\u0131 d\u00fczeltebilir."),
        spacer(60),

        heading3("S: Yurt d\u0131s\u0307\u0131na c\u0307\u0131kacag\u0306\u0131m, puan\u0131m etk\u0131len\u0131r m\u0131?"),
        bodyText("Tems\u0131lc\u0131 s\u0131z\u0131 \"pas\u0131f\" yaparak puan s\u0131ralamas\u0131ndan c\u0307\u0131kartab\u0131l\u0131r. Bu durumda görev dag\u0306\u0131t\u0131m\u0131na dah\u0131l edilmezs\u0131n\u0131z. Do\u0308nu\u0308s\u0307te \"akt\u0131f\" yap\u0131larak yen\u0131den dah\u0131l ed\u0131lebilirsiniz. Puan\u0131n\u0131z s\u0131f\u0131rlanmaz, sadece gec\u0307\u0131c\u0131 olarak d\u0131s\u0307lan\u0131rs\u0131n\u0131z."),
        spacer(60),

        heading3("S: S\u0131stem uzun su\u0308re h\u0131c\u0307 kulan\u0131lmad\u0131ysa ne olur?"),
        bodyText("7 g\u00fcnden fazla g\u0131r\u0131s\u0307 yap\u0131lmazsa ver\u0131taban\u0131 uyku moduna gece\u0307\u0131r. \u0130lk g\u0131r\u0131s\u0307te 2-3 san\u0131ye gec\u0131kme olabilir, sonras\u0131nda normal h\u0131zda c\u0307al\u0131s\u0307\u0131r. H\u0131c\u0307b\u0131r ver\u0131 kayb\u0131 olmaz."),
        spacer(60),

        heading3("S: D\u0131\u0130m\u0131 görev deg\u0306\u0131s\u0307ikl\u0131g\u0131 \u0131c\u0307\u0131n ne yapmal\u0131y\u0131m?"),
        bodyText("Personel sekmes\u0131nde kend\u0131 kart\u0131n\u0131zda \"D\u00fczenle\" butonuna t\u0131klay\u0131n. Yen\u0131 görev ekleyeb\u0131l\u0131r veya mevcut görev\u0131 s\u0131lebilirsiniz. Deg\u0306\u0131s\u0307ikl\u0131g\u0131n\u0131z tems\u0131lc\u0131 onay\u0131na g\u00f6nder\u0131l\u0131r. Onaylanana kadar \"Onay bekliyor\" olarak go\u0308r\u00fcn\u00fcr."),
        spacer(200),

        // Footer
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          borders: { top: { style: BorderStyle.SINGLE, size: 1, color: P.secondary } },
          children: [new TextRun({ text: "Bu k\u0131lavuz GMIM Aras\u0307. Go\u0308r. Go\u0308rev Yo\u0308net\u0131m S\u0131stem\u0131 \u0131c\u0307\u0131n haz\u0131rlanm\u0131s\u0307t\u0131r.", size: 20, color: P.secondary, italics: true, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
        }),
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync("/home/z/my-project/download/GMIM_Aras_Gor_Kullanim_Kilavuzu.docx", buf);
  console.log("Document created successfully!");
});
