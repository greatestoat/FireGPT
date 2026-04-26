import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AIML_API_KEY, // your AI/ML key
  baseURL: "https://api.aimlapi.com/v1", // example (change to real AIML base url)
});

export default openai;