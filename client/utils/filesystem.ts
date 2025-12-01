import fsp, { readFile, mkdir, stat, readdir, constants } from "node:fs/promises";
import { extname } from 'node:path';

export async function readAndParseJson<T>(filePath: string): Promise<T> {
    try {
        const fileContent = await readFile(filePath, 'utf-8');
        return JSON.parse(fileContent) as T;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON syntax in file '${filePath}': ${error.message}`);
        }

        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(`File not found: '${filePath}'`);
        }

        throw error;
    }
}


/**
 * Ensures that a directory exists. Creates it if missing.
 * 
 * @param dirPath - The path to ensure.
 * @returns The path to the directory.
 * @throws Error if a file exists at the path where the directory should be.
 */
export async function ensureDirectory(dirPath: string): Promise<string> {
    try {
        // 'recursive: true' prevents error if dir exists, and creates parents
        await mkdir(dirPath, { recursive: true });
        return dirPath;
    } catch (error: any) {
        // Edge case: specifically handle if a FILE exists at this path
        if (error.code === 'EEXIST') {
            const stats = await stat(dirPath);
            if (stats.isFile()) {
                throw new Error(`Cannot create directory '${dirPath}' because a file exists with that name.`);
            }
        }
        // Re-throw other errors (permission issues, etc.)
        throw error;
    }
}


export async function getWavCount(dirPath: string): Promise<number> {
    const entries = await readdir(dirPath, { withFileTypes: true });

    return entries.filter((entry) =>
        entry.isFile() && extname(entry.name).toLowerCase() === '.wav'
    ).length;
}


export async function checkFileExists(file: string): Promise<boolean> {
    try {
        await fsp.access(file, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}