import { GoogleGenAI, Type } from "@google/genai";

// API Key Rotation Setup
let API_KEYS: string[] = [];
let currentKeyIndex = 0;
let keysLoaded = false;

const loadApiKeys = async () => {
  if (keysLoaded) return;
  try {
    const res = await fetch('/api/admin/system-config/ai-keys');
    if (res.ok) {
      const data = await res.json();
      if (data.keys && data.keys.length > 0) {
        API_KEYS = data.keys;
      }
    }
  } catch (e) {
    console.error("Failed to load AI keys from backend", e);
  }
  
  // Fallback to env key if empty
  if (API_KEYS.length === 0 && import.meta.env.VITE_GEMINI_API_KEY) {
    API_KEYS = [import.meta.env.VITE_GEMINI_API_KEY];
  }
  
  keysLoaded = true;
};

const getAIInstance = async () => {
  await loadApiKeys();
  if (API_KEYS.length === 0) throw new Error("No Gemini API keys configured");
  return new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
};

// Auto-rotate key and retry logic wrapper
const withRetryAndRotation = async <T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> => {
  await loadApiKeys();
  if (API_KEYS.length === 0) throw new Error("No Gemini API keys configured");
  
  const maxRetries = API_KEYS.length;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const ai = await getAIInstance();
      return await operation(ai);
    } catch (error: any) {
      // Check if error is related to rate limits or invalid key
      const isRateLimit = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota') || error?.message?.includes('API_KEY_INVALID');
      
      if (isRateLimit && API_KEYS.length > 1) {
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        console.warn(`[AI Service] API Key limit reached or invalid. Rotating to key index ${currentKeyIndex}...`);
        attempts++;
      } else {
        // Not a rate limit error, throw it
        throw error;
      }
    }
  }
  throw new Error("All AI API keys exhausted or rate limited.");
};


// Helper to strip markdown code blocks if present
const parseJSON = (text: string) => {
  try {
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON", e);
    return null;
  }
};

export const generateSubtasksFromTitle = async (taskTitle: string): Promise<string[]> => {
  if (!taskTitle) return [];
  
  try {
    return await withRetryAndRotation(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate a list of 3 to 5 concise, actionable subtasks (checklist items) for a task titled: "${taskTitle}". Return ONLY the list of strings in a JSON array.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const text = response.text;
      if (text) {
        const data = parseJSON(text);
        return Array.isArray(data) ? data : [];
      }
      return [];
    });
  } catch (error) {
    console.error("AI Generation Error:", error);
    return [];
  }
};

export const generateTaskDetails = async (taskTitle: string): Promise<{ description: string; subtasks: string[] } | null> => {
  if (!taskTitle) return null;

  try {
    return await withRetryAndRotation(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `For a task titled "${taskTitle}", generate a concise 1-sentence description and a list of 3-5 actionable subtasks.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              subtasks: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["description", "subtasks"]
          }
        }
      });

      const text = response.text;
      if (text) {
         return parseJSON(text);
      }
      return null;
    });
  } catch (error) {
    console.error("AI Details Generation Error:", error);
    return null;
  }
};

export interface SuggestedTask {
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
}

export const generateTasksFromGoal = async (goal: string): Promise<SuggestedTask[]> => {
  if (!goal) return [];

  try {
    return await withRetryAndRotation(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `I have a goal: "${goal}". Break this down into 3 to 6 distinct, actionable tasks. 
        For each task, provide a title, a short description, and a priority level (High, Medium, or Low).`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] }
              },
              required: ['title', 'description', 'priority']
            }
          }
        }
      });

      const text = response.text;
      if (text) {
        return parseJSON(text) || [];
      }
      return [];
    });
  } catch (error) {
    console.error("AI Goal Breakdown Error:", error);
    return [];
  }
};

export const createChatSession = async () => {
  const ai = await getAIInstance(); // Note: persistent chat session instances don't auto-rotate mid-stream
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "You are CTCBot, a helpful, energetic productivity assistant for the CTC Task app. Your answers should be concise, encouraging, and formatted with Markdown. You help users organize their day and answer general questions.",
    }
  });
};
