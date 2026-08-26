import { useState } from "react";
import { toast } from "sonner";

interface UseCrudOptions {
    baseUrl: string;
    onSuccess?: () => void;
}

export function useCrud<T extends { id?: number }>(options: UseCrudOptions) {
    const { baseUrl, onSuccess } = options;
    const [loading, setLoading] = useState(false);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("authToken");
        return token ? { "Authorization": `Bearer ${token}` } : {};
    };

    const create = async (data: Omit<T, "id">) => {
        setLoading(true);
        try {
            const response = await fetch(`${baseUrl}/`, {
                method: "POST",
                headers: { 
                    "Content-Type": "application/json",
                    ...getAuthHeaders()
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                let errorMessage = `HTTP ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData?.detail || errorMessage;
                } catch {
                    // If JSON parsing fails, use status code
                }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            toast.success("Created successfully!");
            onSuccess?.();
            return result;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to create";
            toast.error(message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const update = async (id: number, data: Partial<T>) => {
        setLoading(true);
        try {
            const response = await fetch(`${baseUrl}/${id}`, {
                method: "PUT",
                headers: { 
                    "Content-Type": "application/json",
                    ...getAuthHeaders()
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            toast.success("Updated successfully!");
            onSuccess?.();
            return result;
        } catch (err) {
            toast.error(`Error: ${err instanceof Error ? err.message : "Failed to update"}`);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const delete_ = async (id: number) => {
        setLoading(true);
        try {
            const response = await fetch(`${baseUrl}/${id}`, {
                method: "DELETE",
                headers: getAuthHeaders(),
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            toast.success("Deleted successfully!");
            onSuccess?.();
        } catch (err) {
            toast.error(`Error: ${err instanceof Error ? err.message : "Failed to delete"}`);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { create, update, delete: delete_, loading };
}
