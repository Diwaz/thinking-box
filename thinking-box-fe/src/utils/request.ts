import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios";

interface RequestOption {
    headers?: Record<string, string>;
    body?: unknown;
}

type Method = "GET" | "POST";

const handleRequest = async (method: Method, url: string, options?: RequestOption) => {
    try {
        // console.log("url here", url);
        const config: AxiosRequestConfig = {
            method,
            url,
            withCredentials: true,
            headers: {
                "Content-Type": "application/json",
                // ...(options?.headers || {}),
            },
            ...(method === "POST" && { data: options?.body }),
        };
        // console.log("config", config);
        const response: AxiosResponse = await axios(config);

        // console.log("response from axios", response);
        return response.data;
    } catch (error) {
        // console.error(" handleRequest error:", error);
        
        // Type guard to check if error is an AxiosError
        if (axios.isAxiosError(error)) {
            if (error.response?.data) {
                return error.response.data;
            }
            throw new Error(
                error?.response?.data?.error || 
                error?.response?.data?.message ||
                error.message ||
                "An error occurred while making the request"
            );
        }
        
        // Handle non-Axios errors
        throw new Error(
            error instanceof Error ? error.message : "An error occurred while making the request"
        );
    }
};

export default handleRequest;