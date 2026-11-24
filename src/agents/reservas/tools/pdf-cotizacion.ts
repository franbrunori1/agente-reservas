// Recrea la plantilla real de Canva ("Costa Candelaria") entera, con
// pdf-lib — no se reutiliza ningún PDF de ejemplo (esos tienen datos de
// clientes reales, no van en el repo). Coordenadas, fuentes y colores
// sacados a mano de un PDF exportado real (ver docs-privados/, local, no
// versionado). Precio: hoy se recibe ya calculado (tarifa/noches/subtotal
// por renglón) — la lógica del tarifario todavía no está automatizada.

import { readFileSync } from "fs";
import { join } from "path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const ASSETS = join(import.meta.dirname, "..", "..", "..", "..", "assets");

const PAGE_W = 810;
const PAGE_H = 1440;

const BG = rgb(0.3922, 0.4353, 0.4431);
const WHITE = rgb(1, 1, 1);
const GRAY = rgb(0.851, 0.851, 0.851);
const BLACK = rgb(0, 0, 0);
const LOGO_COLOR = BG; // el logo se dibuja en el mismo tono oscuro, sobre la foto clara

const ROW_HEIGHT = 45.8; // separación medida entre renglones reales de la plantilla
const FIRST_ROW_TOP = 703.46; // top (desde arriba) del primer renglón
const HEADER_DIVIDER_TOP = 688.5; // línea debajo de los encabezados de columna
const TOTAL_GAP = 78.56; // separación entre el último renglón y "Total" (medida en el caso real de 1 renglón)
const SENIA_GAP = 40.88; // separación entre "Total" y "Seña 50%"
const ACCENT_LINE_GAP = 26; // línea decorativa corta, entre Total y Seña

export interface FilaCotizacion {
  label: string; // ej. "C2 (8 personas)" o "Adicional 2 pers."
  tarifaPorNoche: number;
  noches: number;
  descuento: string; // "-" si no hay
  subtotal: number;
}

export interface CotizacionData {
  nombre: string;
  fecha: string; // DD/MM/AAAA
  checkIn: string; // DD/MM/AA
  checkOut: string; // DD/MM/AA
  personas: number;
  filas: FilaCotizacion[];
  total: number;
  senia: number;
}

function money(n: number): string {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

// pdfplumber (usado para medir la plantilla original) reporta 'top' como
// distancia desde arriba de la página, con una bounding box cuya altura es
// exactamente el tamaño de fuente — la línea de base real está más abajo,
// a una fracción del tamaño (aproximación de descendente, suficiente para
// que no se note el corrimiento).
function baselineY(topFromPageTop: number, size: number): number {
  return PAGE_H - (topFromPageTop + size - 0.22 * size);
}

interface Word {
  text: string;
  x: number;
}

function drawWords(page: PDFPage, words: Word[], top: number, size: number, font: PDFFont, color = WHITE): void {
  const y = baselineY(top, size);
  for (const w of words) page.drawText(w.text, { x: w.x, y, size, font, color });
}

const RIGHT_MARGIN = 793.5;

// Los montos no tienen ancho fijo (a diferencia de los ejemplos de
// referencia, con importes de pocas cifras) — alinear a la derecha evita
// que un número grande se salga de la página.
function drawRightAligned(page: PDFPage, text: string, top: number, size: number, font: PDFFont, color: ReturnType<typeof rgb>, rightEdge = RIGHT_MARGIN): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightEdge - width, y: baselineY(top, size), size, font, color });
}

async function loadFonts(doc: PDFDocument) {
  doc.registerFontkit(fontkit);
  const read = (name: string) => readFileSync(join(ASSETS, "fonts", name));
  return {
    regular: await doc.embedFont(read("Montserrat-Regular.ttf")),
    bold: await doc.embedFont(read("Montserrat-Bold.ttf")),
    logo: await doc.embedFont(read("LibreBaskerville-Regular.ttf")),
    subtitle: await doc.embedFont(read("PublicSans-Bold.ttf")),
  };
}

function drawDivider(page: PDFPage, top: number, x0 = 16.7, x1 = 793.5): void {
  const y = PAGE_H - top - 0.75;
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness: 1.5, color: BLACK });
}

export async function generateCotizacionPdf(data: CotizacionData): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const fonts = await loadFonts(doc);
  const page = doc.addPage([PAGE_W, PAGE_H]);

  // Fondo oscuro de toda la página.
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: BG });

  // Foto de cabecera (ya recortada a la ventana visible, ver assets/images).
  const photoBytes = readFileSync(join(ASSETS, "images", "header-foto.jpg"));
  const photo = await doc.embedJpg(photoBytes);
  const photoHeight = (photo.height * PAGE_W) / photo.width;
  const photoBottomY = PAGE_H - 393; // borde inferior del área de foto
  page.drawImage(photo, { x: 0, y: photoBottomY, width: PAGE_W, height: photoHeight });

  // Franja negra divisoria entre la foto y el panel oscuro.
  page.drawRectangle({ x: 0, y: photoBottomY - 4.3, width: PAGE_W, height: 4.3, color: BLACK });

  // Logo "COSTA CANDELARIA" — letra por letra, mismo tracking que el original.
  const costaLetters: Word[] = [
    { text: "C", x: 306.9 }, { text: "O", x: 348.1 }, { text: "S", x: 395.5 },
    { text: "T", x: 429.7 }, { text: "A", x: 470.9 },
  ];
  const candelariaLetters: Word[] = [
    { text: "C", x: 213.3 }, { text: "A", x: 254.5 }, { text: "N", x: 294.3 }, { text: "D", x: 339.8 },
    { text: "E", x: 384.5 }, { text: "L", x: 422.3 }, { text: "A", x: 460.1 }, { text: "R", x: 499.9 },
    { text: "I", x: 540.4 }, { text: "A", x: 564.5 },
  ];
  drawWords(page, costaLetters, 66.5, 44.08, fonts.logo, LOGO_COLOR);
  drawWords(page, candelariaLetters, 122.0, 44.08, fonts.logo, LOGO_COLOR);

  drawWords(
    page,
    [
      { text: "Casas", x: 225.1 }, { text: "de", x: 283.1 }, { text: "campo", x: 309.4 },
      { text: "junto", x: 371.3 }, { text: "al", x: 422.6 }, { text: "Río", x: 444.8 },
      { text: "San", x: 478.6 }, { text: "Guillermo", x: 517.0 },
    ],
    184.0,
    14.82,
    fonts.subtitle,
    LOGO_COLOR,
  );

  // Nombre / Fecha.
  drawWords(page, [{ text: "Nombre:", x: 16.6 }], 431.17, 20.2, fonts.regular, GRAY);
  drawWords(page, [{ text: data.nombre, x: 120.1 }], 431.17, 20.2, fonts.regular, GRAY);
  drawWords(page, [{ text: "Fecha:", x: 606.3 }], 431.17, 20.2, fonts.regular, GRAY);
  drawWords(page, [{ text: data.fecha, x: 686.0 }], 431.17, 20.2, fonts.regular, GRAY);

  drawDivider(page, 545.3);

  drawWords(
    page,
    [{ text: "Datos", x: 16.7 }, { text: "de", x: 89.1 }, { text: "la", x: 123.9 }, { text: "Reserva", x: 150.1 }],
    519.0,
    21.11,
    fonts.bold,
    WHITE,
  );

  // Check in / Check out / Personas.
  drawWords(
    page,
    [
      { text: "Check", x: 16.6 }, { text: "in:", x: 90.7 }, { text: data.checkIn, x: 121.8 },
      { text: "Check", x: 233.0 }, { text: "out:", x: 307.1 }, { text: data.checkOut, x: 354.6 },
      { text: "Personas:", x: 633.1 }, { text: String(data.personas), x: 743.0 },
    ],
    562.91,
    21.11,
    fonts.regular,
    WHITE,
  );

  drawDivider(page, 597.6);

  // Encabezados de columna.
  drawWords(
    page,
    [
      { text: "Alojamiento", x: 16.6 },
      { text: "Tarifa", x: 229.1 }, { text: "por", x: 290.2 }, { text: "noche", x: 330.0 },
      { text: "Noches", x: 455.9 },
      { text: "Desc.", x: 581.1 },
      { text: "Subtotal", x: 707.3 },
    ],
    663.25,
    20.2,
    fonts.regular,
    GRAY,
  );

  drawDivider(page, HEADER_DIVIDER_TOP);

  // Renglones — cabañas y/o adicionales, misma estructura de columnas. El
  // label ("Cabaña 2 (8 personas)", "Adicional 2 pers.") puede ser más
  // largo que el código corto de los ejemplos originales ("C2 (8
  // personas)") — se achica el tamaño de fuente lo necesario para que no
  // choque con la columna de Tarifa, en vez de recortar el texto.
  const ROW_SIZE = 22.11;
  const LABEL_MAX_WIDTH = 229.1 - 16.6 - 10;
  data.filas.forEach((fila, i) => {
    const top = FIRST_ROW_TOP + i * ROW_HEIGHT;
    const y = baselineY(top, ROW_SIZE);

    let labelSize = ROW_SIZE;
    while (labelSize > 12 && fonts.regular.widthOfTextAtSize(fila.label, labelSize) > LABEL_MAX_WIDTH) {
      labelSize -= 0.5;
    }
    page.drawText(fila.label, { x: 16.6, y, size: labelSize, font: fonts.regular, color: WHITE });

    drawWords(
      page,
      [
        { text: money(fila.tarifaPorNoche), x: 229.1 },
        { text: String(fila.noches), x: 455.9 },
        { text: fila.descuento, x: 581.1 },
      ],
      top,
      ROW_SIZE,
      fonts.regular,
      WHITE,
    );
    drawRightAligned(page, money(fila.subtotal), top, ROW_SIZE, fonts.regular, WHITE);
    drawDivider(page, HEADER_DIVIDER_TOP + ROW_HEIGHT * (i + 1));
  });

  const lastRowTop = FIRST_ROW_TOP + (data.filas.length - 1) * ROW_HEIGHT;
  const totalTop = lastRowTop + TOTAL_GAP;
  const seniaTop = totalTop + SENIA_GAP;

  drawWords(page, [{ text: "Total", x: 516.8 }], totalTop, 22.11, fonts.bold, WHITE);
  drawRightAligned(page, money(data.total), totalTop, 22.11, fonts.bold, WHITE);

  // Línea decorativa corta entre Total y Seña (cosmética, igual que el original).
  const accentY = PAGE_H - (totalTop + ACCENT_LINE_GAP);
  page.drawLine({ start: { x: 517.6, y: accentY }, end: { x: 791.8, y: accentY }, thickness: 1.5, color: BLACK });

  drawWords(page, [{ text: "Seña", x: 516.8 }, { text: "50%", x: 576.2 }], seniaTop, 22.11, fonts.regular, WHITE);
  drawRightAligned(page, money(data.senia), seniaTop, 22.11, fonts.regular, WHITE);

  // Bases y condiciones — bloque fijo, siempre en la misma posición
  // (confirmado: no se mueve aunque cambie la cantidad de renglones).
  drawWords(
    page,
    [{ text: "Bases", x: 29.8 }, { text: "y", x: 110.4 }, { text: "condiciones", x: 131.9 }],
    1090.3,
    22.39,
    fonts.bold,
    WHITE,
  );

  const parrafo: { words: Word[]; bold: boolean }[] = [
    { words: [{ text: "El", x: 29.8 }, { text: "horario", x: 55.9 }, { text: "de", x: 136.6 }], bold: false },
    { words: [{ text: "check-in", x: 169.5 }, { text: "es", x: 270.0 }, { text: "a", x: 300.9 }, { text: "partir", x: 320.6 }, { text: "de", x: 387.7 }, { text: "las", x: 421.9 }, { text: "14:00", x: 458.9 }, { text: "pm", x: 521.5 }], bold: true },
    { words: [{ text: "y", x: 563.6 }, { text: "el", x: 581.3 }], bold: false },
    { words: [{ text: "check-out", x: 606.1 }, { text: "hasta", x: 722.6 }], bold: true },
  ];
  drawWords(page, parrafo[0].words, 1134.1, 19.95, fonts.regular, GRAY);
  drawWords(page, parrafo[1].words, 1134.1, 19.95, fonts.bold, GRAY);
  drawWords(page, parrafo[2].words, 1134.1, 19.95, fonts.regular, GRAY);
  drawWords(page, parrafo[3].words, 1134.1, 19.95, fonts.bold, GRAY);

  drawWords(page, [{ text: "las", x: 29.8 }, { text: "10:00", x: 71.7 }, { text: "am", x: 139.1 }], 1170.1, 19.95, fonts.bold, GRAY);
  drawWords(
    page,
    [
      { text: ".", x: 173.1 }, { text: "Para", x: 189.1 }, { text: "confirmar", x: 247.9 },
      { text: "la", x: 361.0 }, { text: "reserva", x: 390.3 }, { text: "se", x: 476.8 },
      { text: "deberá", x: 510.8 }, { text: "abonar", x: 595.3 }, { text: "una", x: 680.1 },
    ],
    1170.1,
    19.95,
    fonts.regular,
    GRAY,
  );
  drawWords(page, [{ text: "seña", x: 731.3 }], 1170.1, 19.95, fonts.bold, GRAY);

  drawWords(
    page,
    [{ text: "equivalente", x: 29.8 }, { text: "al", x: 173.2 }, { text: "50%", x: 207.7 }, { text: "del", x: 267.2 }, { text: "valor", x: 316.2 }, { text: "total", x: 385.3 }],
    1206.1,
    19.95,
    fonts.bold,
    GRAY,
  );
  drawWords(
    page,
    [
      { text: "de", x: 450.9 }, { text: "la", x: 492.3 }, { text: "estadía,", x: 525.2 },
      { text: "exclusivamente", x: 619.7 },
    ],
    1206.1,
    19.95,
    fonts.regular,
    GRAY,
  );

  drawWords(
    page,
    [{ text: "mediante", x: 29.8 }, { text: "transferencia", x: 144.6 }, { text: "bancaria.", x: 295.5 }],
    1242.1,
    19.95,
    fonts.regular,
    GRAY,
  );
  drawWords(
    page,
    [{ text: "El", x: 404.8 }, { text: "50%", x: 439.7 }, { text: "restante", x: 498.5 }, { text: "podrá", x: 604.0 }, { text: "abonarse", x: 682.2 }],
    1242.1,
    19.95,
    fonts.bold,
    GRAY,
  );

  drawWords(
    page,
    [{ text: "hasta", x: 29.8 }, { text: "el", x: 108.4 }, { text: "momento", x: 146.8 }, { text: "del", x: 271.4 }, { text: "check-out", x: 324.0 }],
    1278.1,
    19.95,
    fonts.bold,
    GRAY,
  );
  drawWords(
    page,
    [
      { text: ",", x: 433.5 }, { text: "pudiendo", x: 456.8 }, { text: "realizarse", x: 575.7 },
      { text: "el", x: 692.3 }, { text: "pago", x: 729.1 },
    ],
    1278.1,
    19.95,
    fonts.regular,
    GRAY,
  );

  drawWords(
    page,
    [{ text: "mediante", x: 29.8 }, { text: "transferencia", x: 138.8 }, { text: "bancaria.", x: 283.9 }],
    1314.1,
    19.95,
    fonts.regular,
    GRAY,
  );
  drawWords(
    page,
    [{ text: "La", x: 386.9 }, { text: "reserva", x: 421.0 }, { text: "quedará", x: 509.7 }, { text: "confirmada", x: 608.3 }, { text: "una", x: 741.2 }],
    1314.1,
    19.95,
    fonts.bold,
    GRAY,
  );

  drawWords(
    page,
    [{ text: "vez", x: 29.8 }, { text: "acreditada", x: 72.6 }, { text: "la", x: 194.7 }, { text: "seña", x: 220.1 }, { text: "correspondiente.", x: 277.1 }],
    1350.1,
    19.95,
    fonts.bold,
    GRAY,
  );
  drawWords(
    page,
    [
      { text: "Early", x: 467.3 }, { text: "check-in", x: 524.3 }, { text: "/", x: 619.5 },
      { text: "late", x: 632.5 }, { text: "check-out", x: 677.2 },
    ],
    1350.1,
    19.95,
    fonts.regular,
    GRAY,
  );

  drawWords(
    page,
    [{ text: "sujeto", x: 29.8 }, { text: "a", x: 98.9 }, { text: "disponibilidad.", x: 116.6 }],
    1386.1,
    19.95,
    fonts.regular,
    GRAY,
  );

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
