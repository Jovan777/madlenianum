const serbianMap = {
  č: "c",
  ć: "c",
  ž: "z",
  š: "s",
  đ: "dj",
  Č: "c",
  Ć: "c",
  Ž: "z",
  Š: "s",
  Đ: "dj",
};

const slugify = (value) => {
  return String(value || "")
    .split("")
    .map((char) => serbianMap[char] || char)
    .join("")
    .toLowerCase()
    .trim()
    .replace(/&/g, " i ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

module.exports = slugify;