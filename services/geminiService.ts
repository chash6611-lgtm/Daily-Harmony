
import { GoogleGenAI } from "@google/genai";

export async function getDailyFortune(birthDate: string, birthTime: string, targetDate: string, externalApiKey?: string) {
  const apiKey = externalApiKey || process.env.API_KEY;
  
  if (!apiKey || apiKey === "") {
    return "ERROR: API 키가 설정되지 않았습니다. 프로필 설정에서 API 키를 입력해주세요.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `당신은 유능한 명리학자이자 운세 상담가입니다. 
사용자의 생년월일(${birthDate})과 태어난 시간(${birthTime || '모름'}), 그리고 오늘의 날짜(${targetDate})를 바탕으로 한국어로 친절하고 희망적인 오늘의 운세를 작성해주세요. 
운세는 [총운], [금전운], [연애운], [건강운] 4가지 섹션으로 나누고, 각 섹션은 1-2문장으로 간략하게 작성하세요. 
마지막에는 오늘의 행운의 색과 행운의 숫자를 추천해주세요.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.8,
        topK: 64,
        topP: 0.95,
      }
    });

    if (response && response.text) {
      return response.text;
    } else {
      return "ERROR: AI가 응답을 생성했지만 내용을 읽을 수 없습니다.";
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const msg = error.message || "";
    
    if (msg.includes("429") || msg.includes("quota")) {
      return "ERROR: AI 서비스 사용량이 초과되었습니다. 무료 티어의 제한으로 인해 잠시 후 다시 시도하거나, 개인 API 키를 등록해주세요.";
    }
    if (msg.includes("API key not valid") || msg.includes("403") || msg.includes("400")) {
      return "ERROR: 등록된 API 키가 유효하지 않거나 권한이 없습니다. API 키를 다시 확인해주세요.";
    }
    return `ERROR: 운세를 가져오는 중 오류가 발생했습니다: ${msg || "연결 오류"}`;
  }
}
