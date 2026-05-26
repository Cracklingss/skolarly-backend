import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_, file, cb) => {
    cb(
      null,
      Date.now() + path.extname(file.originalname)
    );
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max
  },
  fileFilter: (_, file, cb) => {
    const allowed = [
      ".pdf",
      ".docx",
      ".ppt",
      ".pptx"
    ];

    const ext = path.extname(file.originalname);

    if (!allowed.includes(ext)) {
      return cb(new Error("Only PDF, DOCX, PPTX, PPT allowed"));
    }

    cb(null, true);
  }
});