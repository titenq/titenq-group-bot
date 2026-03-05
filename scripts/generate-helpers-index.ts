import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const helpersDir = resolve(__dirname, "../src/helpers");
const originalIndexFile = resolve(helpersDir, "index.ts");

const generateHelpersIndex = async () => {
  try {
    const files = await readdir(helpersDir);
    const tsFiles = files.filter(
      (file) => file.endsWith(".ts") && file !== "index.ts",
    );

    let content = "// Auto-generated file. Do not edit manually.\n";

    for (const file of tsFiles) {
      const baseName = file.replace(/\.ts$/, "");
      const filePath = resolve(helpersDir, file);

      const fileContent = await readFile(filePath, "utf-8");

      const exportsList: string[] = [];
      const constRegex = /export\s+const\s+([a-zA-Z0-9_]+)/g;
      let match;

      while ((match = constRegex.exec(fileContent)) !== null) {
        exportsList.push(match[1]);
      }

      const functionRegex = /export\s+function\s+([a-zA-Z0-9_]+)/g;

      while ((match = functionRegex.exec(fileContent)) !== null) {
        if (!exportsList.includes(match[1])) {
          exportsList.push(match[1]);
        }
      }

      if (exportsList.length > 0) {
        exportsList.sort();

        content += `export { ${exportsList.join(", ")} } from "./${baseName}";\n`;
      }
    }

    await writeFile(originalIndexFile, content, "utf-8");

    console.log(
      `✅ src/helpers/index.ts updated with exports from ${tsFiles.length} files!`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : "unknown error");
  }
};

generateHelpersIndex();
