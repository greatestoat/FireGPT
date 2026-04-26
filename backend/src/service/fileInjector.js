// import fs   from "fs/promises";
// import path  from "path";

// /**
//  * injectGeneratedFiles
//  *
//  * Writes an array of { path, content } file objects into `projectFolder`,
//  * creating any intermediate directories automatically.
//  *
//  * @param {string} projectFolder  - Absolute path to the project root on disk
//  * @param {Array<{path: string, content: string}>} files
//  */
// export async function injectGeneratedFiles(projectFolder, files) {
//   for (const file of files) {
//     // Normalise separators and strip any leading slash / "./"
//     const relativePath = file.path.replace(/\\/g, '/').replace(/^\.?\//, '');
//     const fullPath     = path.join(projectFolder, relativePath);
//     const dir          = path.dirname(fullPath);

//     // Create all parent directories (mirrors mkdir -p)
//     await fs.mkdir(dir, { recursive: true });

//     // Write (overwrite) the file
//     await fs.writeFile(fullPath, file.content ?? '', 'utf8');
//   }
// }
import fs   from "fs/promises";
import path  from "path";

/**
 * injectGeneratedFiles
 *
 * Writes an array of { path, content } file objects into `projectFolder`,
 * creating any intermediate directories automatically.
 *
 * @param {string} projectFolder  - Absolute path to the project root on disk
 * @param {Array<{path: string, content: string}>} files
 */
export async function injectGeneratedFiles(projectFolder, files) {
  console.log(`[fileInjector] Writing ${files.length} file(s) to: ${projectFolder}`);

  for (const file of files) {
    // Normalise separators and strip any leading slash / "./"
    const relativePath = file.path
      .replace(/\\/g, '/')   // backslashes → forward slashes
      .replace(/^\.?\//, ''); // strip leading ./ or /

    const fullPath = path.join(projectFolder, relativePath);
    const dir      = path.dirname(fullPath);

    // Create all parent directories (mirrors mkdir -p)
    await fs.mkdir(dir, { recursive: true });

    // Write (overwrite) the file
    await fs.writeFile(fullPath, file.content ?? '', 'utf8');

    console.log(`[fileInjector] ✓ wrote ${relativePath} (${(file.content ?? '').length} bytes)`);
  }

  console.log(`[fileInjector] All files written.`);
}