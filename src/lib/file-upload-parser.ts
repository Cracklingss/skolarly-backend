import fs from "fs";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import pptxParser from "pptx-parser";

async function extractText(file: any): Promise<string> {
  const ext = file.originalname.split(".").pop()?.toLowerCase();

  // PDF
  if (ext === "pdf") {
    const dataBuffer = fs.readFileSync(file.path);

    const parser = new PDFParse({
      data: dataBuffer,
    });

    const result = await parser.getText();

    return result.text;
  }

  // DOCX
  if (ext === "docx") {
    const result = await mammoth.extractRawText({
      path: file.path,
    });

    return result.value;
  }

  // PPTX
  if (ext === "pptx") {
    const slides = await pptxParser.parse(file.path);

    let text = "";

    slides.forEach((slide: any) => {
      slide.texts.forEach((item: any) => {
        text += item.text + "\n";
      });
    });

    return text;
  }

  throw new Error("Unsupported file type");
}

export default extractText;
