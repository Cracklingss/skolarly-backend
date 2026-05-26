import fs from "fs";
import path from "path";
import libre from "libreoffice-convert";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import JSZip from "jszip";
import { parseStringPromise } from "xml2js";

process.env.SOFFICE_PATH = "C:/Program Files/LibreOffice/program/soffice.exe";

async function extractText(file: string): Promise<string> {
  const ext = file.split(".").pop()?.toLowerCase();

  // PDF
  if (ext === "pdf") {
    const dataBuffer = fs.readFileSync(file);

    const parser = new PDFParse({
      data: dataBuffer,
    });

    const result = await parser.getText();

    return result.text;
  }

  // DOCX
  if (ext === "docx") {
    const result = await mammoth.extractRawText({
      path: file,
    });

    return result.value;
  }

  // PPTX
  if (ext === "pptx") {
    const data = fs.readFileSync(file);

    const zip = await JSZip.loadAsync(data);

    let finalText = "";

    const slideFiles = Object.keys(zip.files).filter(
      (fileName) =>
        fileName.startsWith("ppt/slides/slide") && fileName.endsWith(".xml"),
    );

    for (const slidePath of slideFiles) {
      const slideXml = await zip.files[slidePath].async("text");

      const parsed = await parseStringPromise(slideXml);

      const texts: string[] = [];

      extractTextNodes(parsed, texts);

      finalText += texts.join(" ") + "\n";
    }

    return finalText;
  }

  // PPT (legacy PowerPoint)
  if (ext === "ppt") {
    const fileBuffer = fs.readFileSync(file);

    const convertedBuffer: Buffer = await new Promise((resolve, reject) => {
      libre.convert(fileBuffer, ".pptx", undefined, (err, done) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(done);
      });
    });

    const tempPptx = path.join(process.cwd(), `temp-${Date.now()}.pptx`);

    fs.writeFileSync(tempPptx, convertedBuffer);

    const text = await extractText(tempPptx);

    fs.unlinkSync(tempPptx);

    return text;
  }

  throw new Error("Unsupported file type");
}

function extractTextNodes(obj: any, texts: string[]) {
  if (!obj || typeof obj !== "object") {
    return;
  }

  for (const key in obj) {
    const value = obj[key];

    // PPTX text nodes
    if (key === "a:t") {
      if (Array.isArray(value)) {
        texts.push(...value);
      }
    } else if (typeof value === "object") {
      extractTextNodes(value, texts);
    }
  }
}

export default extractText;
