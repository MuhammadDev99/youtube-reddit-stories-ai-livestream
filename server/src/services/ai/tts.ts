import { spawn } from "node:child_process"
import path from "node:path"
import { ensureDirectory } from "../../utils/index.js"
import { PIPER_EXECUTABLE_PATH, PIPER_MODELS_PATH } from "../../config/consts.js"
import { PiperModel } from "../../common/types.js"

/**
 * Cleans text to make it suitable for Piper TTS.
 * Removes URLs, Markdown, Emojis, and special characters that sound bad.
 */
function cleanTextForTts(text: string): string {
    return text
        // 1. Remove URLs (http/https)
        .replace(/(?:https?|ftp):\/\/[\n\S]+/g, '')

        // 2. Remove Markdown code blocks entirely if desired, or just the backticks
        // This removes ```code``` blocks entirely:
        // .replace(/```[\s\S]*?```/g, '') 
        // This just removes the backticks ` (better if you want to read the variables):
        .replace(/`/g, '')

        // 3. Remove Markdown bold/italic (* and _)
        .replace(/[*]/g, '')

        // 4. Replace underscores with spaces (so "hello_world" becomes "hello world")
        .replace(/_/g, ' ')

        // 5. Remove citations like [1] or [12] or brackets generally
        .replace(/\[.*?\]/g, '')

        // 6. Remove Emojis (Optional, but Piper often fails on them)
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu, '')

        // 7. Remove weird symbols that shouldn't be spoken (#, >, <, {, })
        .replace(/[#><{}]/g, '')

        // 8. Collapse multiple spaces/newlines into a single space
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Generates audio from text using local Piper TTS.
 */
export async function ttsPiper(
    { text,
        outputPath,
        model = "male"
    }: {
        text: string
        outputPath: string
        model: PiperModel
    }): Promise<string> {

    // CLEAN THE TEXT BEFORE LOGGING OR PROCESSING
    const cleanedText = cleanTextForTts(text);

    // Skip if text is empty after cleaning
    if (!cleanedText) {
        throw new Error("Text is empty after cleaning.");
    }

    console.log(`Generating tts: ${cleanedText}`)
    await ensureDirectory(path.dirname(outputPath))

    return new Promise((resolve, reject) => {
        const modelPath = path.resolve(PIPER_MODELS_PATH, `${model}.onnx`)
        const piperProcess = spawn(PIPER_EXECUTABLE_PATH, [
            "--model",
            modelPath,
            "--output_file",
            outputPath,
        ])

        piperProcess.on("error", (err) => {
            reject(new Error(`Failed to spawn Piper: ${err.message}`))
        })

        piperProcess.on("close", (code) => {
            if (code === 0) {
                resolve(outputPath)
            } else {
                reject(new Error(`Piper process exited with code ${code}`))
            }
        })

        // SEND THE CLEANED TEXT
        piperProcess.stdin.write(cleanedText)
        piperProcess.stdin.end()
    })
}