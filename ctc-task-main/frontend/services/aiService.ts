import { apiFetch } from './api';
import { GoogleGenAI, Type } from "@google/genai";

// API Key Rotation Setup
let API_KEYS: string[] = [];
let AI_PROVIDER: string = 'gemini';
let currentKeyIndex = 0;
let keysLoaded = false;

const loadApiKeys = async () => {
  if (keysLoaded) return;
  try {
    const res = await apiFetch('/api/admin/system-config/ai-keys');
    if (res.ok) {
      const data = await res.json();
      if (data.keys && data.keys.length > 0) {
        API_KEYS = data.keys;
      }
      if (data.provider) {
        AI_PROVIDER = data.provider;
      }
    }
  } catch (e) {
    // silently ignore if backend not available or no keys set
  }

  // Fallback to env key if empty
  if (API_KEYS.length === 0 && import.meta.env.VITE_GEMINI_API_KEY) {
    API_KEYS = [import.meta.env.VITE_GEMINI_API_KEY];
  }

  keysLoaded = true;
};

const getAIInstance = async () => {
  await loadApiKeys();
  if (API_KEYS.length === 0) {
    throw new Error("No AI API keys configured");
  }
  return new GoogleGenAI({ apiKey: API_KEYS[currentKeyIndex] });
};

// Auto-rotate key and retry logic wrapper
const withRetryAndRotation = async <T>(operation: (ai: GoogleGenAI) => Promise<T>): Promise<T> => {
  await loadApiKeys();
  if (API_KEYS.length === 0) throw new Error("No AI API keys configured");

  if (AI_PROVIDER !== 'gemini') {
      console.warn("Using OpenAI wrapper instead of Google SDK for generative functions isn't fully supported yet. Falling back to simple fetch.");
  }

  const maxRetries = API_KEYS.length;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      const ai = await getAIInstance();
      return await operation(ai);
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.status === 503
        || error?.message?.includes('429') || error?.message?.includes('503')
        || error?.message?.includes('quota') || error?.message?.includes('API_KEY_INVALID');

      if (isRateLimit && API_KEYS.length > 1) {
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        console.warn(`[AI Service] API Key limit reached. Rotating to key index ${currentKeyIndex}...`);
        attempts++;
      } else {
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
        model: 'gemini-2.5-flash',
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
        model: 'gemini-2.5-flash',
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
        model: 'gemini-2.5-flash',
        contents: `I have a goal: "${goal}". Break this down into 3 to 6 distinct, actionable tasks. For each task, provide a title, a short description, and a priority level (High, Medium, or Low).`,
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

// ===================
// CHAT SESSION
// ===================

const getOpenAIProviderConfig = (provider: string) => {
  switch (provider) {
    case 'groq': return { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama3-8b-8192' };
    case 'deepseek': return { url: 'https://api.deepseek.com/chat/completions', model: 'deepseek-chat' };
    case 'openrouter': return { url: 'https://openrouter.ai/api/v1/chat/completions', model: 'google/gemini-2.5-flash:free' };
    default: return { url: 'https://api.groq.com/openai/v1/chat/completions', model: 'llama3-8b-8192' };
  }
};

const openAIFunctions = [
  {
    type: 'function',
    function: {
      name: 'createTask',
      description: 'Tạo một công việc (Task) mới trên hệ thống',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Tiêu đề công việc' },
          description: { type: 'string', description: 'Mô tả chi tiết công việc' },
          priority: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Độ ưu tiên' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createReport',
      description: 'Tạo một báo cáo (Report) mới trên hệ thống',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Tiêu đề báo cáo' },
          content: { type: 'string', description: 'Nội dung chi tiết của báo cáo' }
        },
        required: ['title', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createContract',
      description: 'Tạo một hợp đồng (Contract) mới trên hệ thống',
      parameters: {
        type: 'object',
        properties: {
          contractNumber: { type: 'string', description: 'Số hợp đồng (ví dụ: HD-001)' },
          clientName: { type: 'string', description: 'Tên đối tác hoặc khách hàng' },
          contractName: { type: 'string', description: 'Tên hợp đồng' }
        },
        required: ['contractNumber', 'clientName', 'contractName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteTask',
      description: 'Xóa một công việc (Task) khỏi hệ thống',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'ID của công việc cần xóa' } },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createNote',
      description: 'Tạo một ghi chú (Note) mới',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Tiêu đề ghi chú' },
          content: { type: 'string', description: 'Nội dung ghi chú' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteNote',
      description: 'Xóa một ghi chú (Note)',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'ID của ghi chú cần xóa' } },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'createMeeting',
      description: 'Tạo một lịch họp (Meeting) mới',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Tiêu đề cuộc họp' },
          description: { type: 'string', description: 'Mô tả hoặc nội dung cuộc họp' },
          participantNames: { type: 'array', items: { type: 'string' }, description: 'Danh sách tên những người tham gia (nếu có)' }
        },
        required: ['title']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'deleteMeeting',
      description: 'Xóa một lịch họp (Meeting)',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'ID của lịch họp cần xóa' } },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'markNotificationRead',
      description: 'Đánh dấu một thông báo là đã đọc',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string', description: 'ID của thông báo' } },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'navigateToPage',
      description: 'Chuyển hướng người dùng đến một trang cụ thể trong hệ thống. (Ví dụ: /mail, /calendar, /tasks, /reports, /notes, /meetings)',
      parameters: {
        type: 'object',
        properties: { 
          path: { type: 'string', description: 'Đường dẫn bắt đầu bằng /. Các trang hỗ trợ: / (Dashboard), /tasks, /calendar, /reports, /meetings, /contracts, /mail, /notes, /clients, /settings' } 
        },
        required: ['path']
      }
    }
  }
];

export const createChatSession = async (contextString?: string, history?: { role: 'user' | 'model', text: string }[]) => {
  await loadApiKeys();

  const baseInstruction = `Bạn là "Bot CTC Tasks", một trợ lý AI thông minh, thân thiện và tràn đầy năng lượng, được phát triển riêng cho hệ thống phần mềm quản lý công việc của công ty CTC (CTC Task). 
Nhiệm vụ chính của bạn là:
1. Giao tiếp hoàn toàn bằng Tiếng Việt một cách tự nhiên, lịch sự và chuyên nghiệp.
2. Hỗ trợ nhân viên và ban giám đốc công ty CTC trong việc tổ chức công việc, quản lý lịch trình, tóm tắt báo cáo, và đưa ra các lời khuyên tăng cường hiệu suất.
3. Bạn am hiểu về các luồng nghiệp vụ nội bộ như: giao việc, tạo báo cáo hằng ngày/tuần, duyệt báo cáo bởi Manager/Director, và nhắc nhở công việc qua hệ thống Notification.
4. Khi được hỏi về công ty CTC, hãy thể hiện sự tự hào, am hiểu về môi trường làm việc năng động, chuyên nghiệp và luôn hướng tới hiệu quả cao.
5. Các câu trả lời của bạn cần ngắn gọn, đi vào trọng tâm, có định dạng Markdown rõ ràng (dùng bullet points, in đậm) để người dùng dễ đọc.
6. Khi người dùng yêu cầu tạo mới (ví dụ: tạo công việc, viết báo cáo, soạn hợp đồng), HÃY GỌI CÁC CÔNG CỤ (TOOLS) tương ứng thay vì chỉ trả lời bằng chữ.
Hãy luôn sẵn sàng giúp đỡ và mang lại năng lượng tích cực cho mọi người trong công ty CTC!`;

  const systemInstruction = contextString ? `${baseInstruction}\n\n${contextString}` : baseInstruction;

  if (AI_PROVIDER !== 'gemini') {
    // OpenAI Compatible wrapper (Groq, DeepSeek, OpenRouter)
    const providerConfig = getOpenAIProviderConfig(AI_PROVIDER);
    const apiKey = API_KEYS[currentKeyIndex];

    const openAiHistory: any[] = [
      { role: 'system', content: systemInstruction },
      ...(history || []).map(msg => ({ role: msg.role === 'model' ? 'assistant' : 'user', content: msg.text }))
    ];

    return {
      sendMessageStream: async function* ({ message }: { message: string }) {
        openAiHistory.push({ role: 'user', content: message });
        
        try {
          const res = await fetch(providerConfig.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://ctctask.vn', // For OpenRouter
              'X-Title': 'CTC Task'
            },
            body: JSON.stringify({
              model: providerConfig.model,
              messages: openAiHistory,
              tools: openAIFunctions,
              tool_choice: 'auto'
            })
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(`API Error: ${res.status} ${JSON.stringify(err)}`);
          }

          const data = await res.json();
          const choice = data.choices[0];
          const textResponse = choice.message.content || '';
          
          if (textResponse) {
             const words = textResponse.split(' ');
             for (let i = 0; i < words.length; i++) {
               await new Promise(r => setTimeout(r, 10)); // fake streaming effect
               yield { text: words[i] + (i < words.length - 1 ? ' ' : '') };
             }
          }
          
          if (choice.message.tool_calls) {
            yield {
              functionCalls: choice.message.tool_calls.map((tc: any) => ({
                name: tc.function.name,
                args: JSON.parse(tc.function.arguments || '{}')
              }))
            };
          }

          openAiHistory.push(choice.message);

        } catch (error: any) {
           console.error("OpenAI API Error:", error);
           throw error;
        }
      }
    };
  }

  // Google Gemini Native SDK
  const ai = await getAIInstance();
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    history: history ? history.map(msg => ({ role: msg.role, parts: [{ text: msg.text }] })) : undefined,
    config: {
      systemInstruction: systemInstruction,
      tools: [{
        functionDeclarations: [
          {
            name: 'createTask',
            description: 'Tạo một công việc (Task) mới trên hệ thống',
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Tiêu đề công việc' },
                description: { type: Type.STRING, description: 'Mô tả chi tiết công việc' },
                priority: { type: Type.STRING, enum: ['Low', 'Medium', 'High'], description: 'Độ ưu tiên' }
              },
              required: ['title']
            }
          },
          {
            name: 'createReport',
            description: 'Tạo một báo cáo (Report) mới trên hệ thống',
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Tiêu đề báo cáo' },
                content: { type: Type.STRING, description: 'Nội dung chi tiết của báo cáo' }
              },
              required: ['title', 'content']
            }
          },
          {
            name: 'createContract',
            description: 'Tạo một hợp đồng (Contract) mới trên hệ thống',
            parameters: {
              type: Type.OBJECT,
              properties: {
                contractNumber: { type: Type.STRING, description: 'Số hợp đồng (ví dụ: HD-001)' },
                clientName: { type: Type.STRING, description: 'Tên đối tác hoặc khách hàng' },
                contractName: { type: Type.STRING, description: 'Tên hợp đồng' }
              },
              required: ['contractNumber', 'clientName', 'contractName']
            }
          },
          {
            name: 'deleteTask',
            description: 'Xóa một công việc (Task) khỏi hệ thống',
            parameters: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING, description: 'ID của công việc cần xóa' } },
              required: ['id']
            }
          },
          {
            name: 'createNote',
            description: 'Tạo một ghi chú (Note) mới',
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Tiêu đề ghi chú' },
                content: { type: Type.STRING, description: 'Nội dung ghi chú' }
              },
              required: ['title']
            }
          },
          {
            name: 'deleteNote',
            description: 'Xóa một ghi chú (Note)',
            parameters: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING, description: 'ID của ghi chú cần xóa' } },
              required: ['id']
            }
          },
          {
            name: 'createMeeting',
            description: 'Tạo một lịch họp (Meeting) mới',
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: 'Tiêu đề cuộc họp' },
                description: { type: Type.STRING, description: 'Mô tả hoặc nội dung cuộc họp' },
                participantNames: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Danh sách tên những người tham gia (nếu có)' }
              },
              required: ['title']
            }
          },
          {
            name: 'deleteMeeting',
            description: 'Xóa một lịch họp (Meeting)',
            parameters: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING, description: 'ID của lịch họp cần xóa' } },
              required: ['id']
            }
          },
          {
            name: 'markNotificationRead',
            description: 'Đánh dấu một thông báo là đã đọc',
            parameters: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING, description: 'ID của thông báo' } },
              required: ['id']
            }
          },
          {
            name: 'navigateToPage',
            description: 'Chuyển hướng người dùng đến một trang cụ thể trong hệ thống. (Ví dụ: /mail, /calendar, /tasks, /reports, /notes, /meetings)',
            parameters: {
              type: Type.OBJECT,
              properties: { 
                path: { type: Type.STRING, description: 'Đường dẫn bắt đầu bằng /. Các trang hỗ trợ: / (Dashboard), /tasks, /calendar, /reports, /meetings, /contracts, /mail, /notes, /clients, /settings' } 
              },
              required: ['path']
            }
          }
        ]
      }]
    }
  });
};
