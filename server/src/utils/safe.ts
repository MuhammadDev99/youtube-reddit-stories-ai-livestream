type SafeResult<T> = | { success: true; data: T; error: undefined } | { success: false; data: undefined; error: Error }

export async function safe<T>(promise: Promise<T>): Promise<SafeResult<T>> {
    try {
        const data = await promise;
        return { success: true, data, error: undefined }
    } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        return { success: false, data: undefined, error }
    }
}