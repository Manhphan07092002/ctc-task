
import { GoogleGenAI, Type } from "@google/genai";

// Helper to strip markdown code blocks if present
const parseJSON = (text: string) => {
  try {
    // Remove ```json and ``` if present
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON", e);
    return null;
  }
};

export const generateSubtasksFromTitle = async (taskTitle: string): Promise<string[]> => {
  if (!taskTitle) return [];
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
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
  } catch (error) {
    console.error("AI Generation Error:", error);
    return [];
  }
};

export const generateTaskDetails = async (taskTitle: string): Promise<{ description: string; subtasks: string[] } | null> => {
  if (!taskTitle) return null;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
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

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
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
  } catch (error) {
    console.error("AI Goal Breakdown Error:", error);
    return [];
  }
};

export const createChatSession = () => {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: "You are CTCBot, a helpful, energetic productivity assistant for the CTC Task app. Your answers should be concise, encouraging, and formatted with Markdown. You help users organize their day and answer general questions.",
    }
  });
};
