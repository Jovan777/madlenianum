const fs = require("node:fs/promises");

const signatures = {
  "image/jpeg": (buffer) => buffer.length >= 3
    && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  "image/png": (buffer) => buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  "image/gif": (buffer) => ["GIF87a", "GIF89a"].includes(buffer.subarray(0, 6).toString("ascii")),
  "image/webp": (buffer) => buffer.length >= 12
    && buffer.subarray(0, 4).toString("ascii") === "RIFF"
    && buffer.subarray(8, 12).toString("ascii") === "WEBP",
  "application/pdf": (buffer) => buffer.subarray(0, 5).toString("ascii") === "%PDF-",
};

const validateUploadedFileContent = async (file) => {
  const validate = signatures[file.mimetype];
  if (!validate) {
    const error = new Error("Unsupported uploaded file type.");
    error.statusCode = 400;
    throw error;
  }

  const handle = await fs.open(file.path, "r");
  try {
    const buffer = Buffer.alloc(16);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (!validate(buffer.subarray(0, bytesRead))) {
      const error = new Error("Uploaded file content does not match its declared type.");
      error.statusCode = 400;
      error.code = "invalid_file_signature";
      throw error;
    }
  } finally {
    await handle.close();
  }
};

module.exports = { validateUploadedFileContent };
