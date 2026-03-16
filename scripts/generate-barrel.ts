/// <reference types="node" />

import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const getExportNames = (fileContent: string, regex: RegExp) => {
  const exportNames: string[] = [];
  let match;

  while ((match = regex.exec(fileContent)) !== null) {
    if (!exportNames.includes(match[1])) {
      exportNames.push(match[1]);
    }
  }

  return exportNames;
};

const generateBarrel = async () => {
  const relativeTargetDir = process.argv[2];

  if (!relativeTargetDir) {
    console.error("[GenerateBarrel] Missing target directory argument.");

    process.exitCode = 1;

    return;
  }

  const targetDir = resolve(__dirname, "..", relativeTargetDir);
  const indexFile = resolve(targetDir, "index.ts");

  try {
    const files = await readdir(targetDir);
    const tsFiles = files.filter(
      (file) => file.endsWith(".ts") && file !== "index.ts",
    );

    let content = "";

    for (const file of tsFiles) {
      const baseName = file.replace(/\.ts$/, "");
      const filePath = resolve(targetDir, file);
      const fileContent = await readFile(filePath, "utf-8");

      const valueExports = [
        ...getExportNames(fileContent, /export\s+const\s+([a-zA-Z0-9_]+)/g),
        ...getExportNames(fileContent, /export\s+function\s+([a-zA-Z0-9_]+)/g),
        ...getExportNames(fileContent, /export\s+class\s+([a-zA-Z0-9_]+)/g),
      ].sort();

      const typeExports = [
        ...getExportNames(fileContent, /export\s+type\s+([a-zA-Z0-9_]+)/g),
        ...getExportNames(fileContent, /export\s+interface\s+([a-zA-Z0-9_]+)/g),
      ]
        .filter((exportName) => {
          return !valueExports.includes(exportName);
        })
        .sort();

      if (valueExports.length > 0) {
        content += `export { ${valueExports.join(", ")} } from "./${baseName}";\n`;
      }

      if (typeExports.length > 0) {
        content += `export type { ${typeExports.join(", ")} } from "./${baseName}";\n`;
      }
    }

    await writeFile(indexFile, content, "utf-8");

    console.log(
      `[GenerateBarrel] Updated ${relativeTargetDir}/index.ts with exports from ${tsFiles.length} files.`,
    );
  } catch (error) {
    console.error(
      `[GenerateBarrel] ${error instanceof Error ? error.message : "unknown error"}`,
    );

    process.exitCode = 1;
  }
};

generateBarrel();
