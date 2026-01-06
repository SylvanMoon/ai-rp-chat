import OpenAI from "openai";
import { NVIDIA_API_KEY } from '$env/static/private';

export const client = new OpenAI({
    baseURL: "https://integrate.api.nvidia.com/v1",
    apiKey: NVIDIA_API_KEY
});