
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

export const removeWatermark = async (
  base64ImageWithMask: string,
  mimeType: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  // Extract pure base64
  const base64Data = base64ImageWithMask.split(',')[1];

  const prompt = `
    你是一个专业的图像修复专家。我提供了一张图片，图片中被红色涂抹的区域是用户想要去除的水印或杂物。
    请你移除这些红色标记区域以及底下的内容，并根据周围的背景、纹理和细节进行智能填充，确保修复后的效果自然且不留痕迹。
    请直接输出修复后的完整图片。
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    if (!response.candidates?.[0]?.content?.parts) {
      throw new Error('未收到有效的 AI 响应。');
    }

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    throw new Error('响应中未找到图片数据。');
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};
