// utils/api.ts

// FIXED: No parameter properties. We declare fields explicitly.
export class ApiError extends Error {
    status: number;
    data?: any;

    constructor(status: number, message: string, data?: any) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}

const BASE_URL = 'http://localhost:4000/story';

class Api {
    // 'private' keyword is fine here because it just gets erased at runtime
    private async request<T>(
        endpoint: string,
        method: string,
        body?: unknown,
        customHeaders: HeadersInit = {}
    ): Promise<T> {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders,
        };

        const config: RequestInit = {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        };

        const response = await fetch(`${BASE_URL}/${endpoint}`, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new ApiError(response.status, response.statusText, errorData);
        }

        // Return empty object for 204 (No Content)
        if (response.status === 204) return {} as T;

        return response.json();
    }

    // GET
    get<TResponse>(endpoint: string, headers?: HeadersInit) {
        return this.request<TResponse>(endpoint, 'GET', undefined, headers);
    }

    // POST
    post<TResponse, TBody>(endpoint: string, body: TBody, headers?: HeadersInit) {
        return this.request<TResponse>(endpoint, 'POST', body, headers);
    }

    // PUT
    put<TResponse, TBody>(endpoint: string, body: TBody, headers?: HeadersInit) {
        return this.request<TResponse>(endpoint, 'PUT', body, headers);
    }

    // PATCH
    patch<TResponse, TBody>(endpoint: string, body: TBody, headers?: HeadersInit) {
        return this.request<TResponse>(endpoint, 'PATCH', body, headers);
    }

    // DELETE
    delete<TResponse = void>(endpoint: string, headers?: HeadersInit) {
        return this.request<TResponse>(endpoint, 'DELETE', undefined, headers);
    }
}

export const api = new Api();