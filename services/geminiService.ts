
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { TripPlan, TripStyle } from '../types';
import { GEMINI_MODEL_NAME, API_KEY_ERROR_MESSAGE } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error(API_KEY_ERROR_MESSAGE);
  // We can't throw here as it's a module, App.tsx will handle the error display
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

function getSystemInstruction(city: string, tripStyle: TripStyle): string {
  return `
คุณคือนักวางแผนท่องเที่ยวมืออาชีพ AI ผู้เชี่ยวชาญการจัดทริปในประเทศไทย
ภารกิจของคุณคือสร้างแผนการเดินทาง 3 วัน 2 คืนสำหรับเมือง/จังหวัด "${city}" ตามสไตล์ทริป "${tripStyle}"

ข้อกำหนดสำคัญมากสำหรับการตอบกลับ:
1.  **ต้องตอบกลับเป็น JSON object เท่านั้น** ไม่มีการนำหน้าหรือต่อท้ายด้วยข้อความใดๆ เช่น "Here is the JSON:" หรือ markdown code fences (เช่น \`\`\`json ... \`\`\`).
2.  JSON object ต้องมีโครงสร้างตามที่ระบุข้างล่างนี้ทุกประการ
3.  ข้อมูลทั้งหมดต้องเป็นภาษาไทย
4.  ชื่อสถานที่ (locationName) ต้องเป็นชื่อที่สามารถนำไปค้นหาบน Google Maps ได้จริง
5.  หากข้อมูลบางส่วน เช่น ร้านอาหารหรือที่พัก ไม่สามารถระบุชื่อเฉพาะได้ ให้ใช้คำว่า "แนะนำให้ผู้ใช้เลือกตามชอบในย่านนั้น" หรือ "โรงแรม/ที่พักในย่านตัวเมือง ${city}"
6.  ใส่ความคิดสร้างสรรค์ลงไปในแผน ให้ทริปน่าสนใจและสมเหตุสมผล

โครงสร้าง JSON ที่ต้องการ:
{
  "tripTitle": "แผนเที่ยว 3 วัน 2 คืนที่ ${city} (สไตล์: ${tripStyle})",
  "days": [
    {
      "day": 1,
      "theme": "ตัวอย่าง: สำรวจใจกลางเมืองและวัฒนธรรมท้องถิ่น",
      "activities": [
        { "time": "09:00 - 11:00", "description": "กิจกรรมช่วงเช้า 1", "locationName": "ชื่อสถานที่ 1" },
        { "time": "11:30 - 12:30", "description": "กิจกรรมช่วงเช้า 2", "locationName": "ชื่อสถานที่ 2" }
      ],
      "lunch": { "time": "13:00 - 14:00", "name": "ชื่อร้านอาหารกลางวัน หรือ 'แนะนำร้านอาหารพื้นเมือง'", "locationName": "ชื่อร้านอาหารกลางวัน หรือ ย่านร้านอาหาร" },
      "afternoonActivities": [
        { "time": "15:00 - 17:00", "description": "กิจกรรมช่วงบ่าย", "locationName": "ชื่อสถานที่ 3" }
      ],
      "dinner": { "time": "18:30 - 20:00", "name": "ชื่อร้านอาหารเย็น หรือ 'แนะนำร้านอาหารบรรยากาศดี'", "locationName": "ชื่อร้านอาหารเย็น หรือ ย่านร้านอาหาร" },
      "accommodation": { "name": "ชื่อที่พักคืนแรก หรือ 'แนะนำที่พักตามงบประมาณ'", "locationName": "ชื่อที่พัก หรือ ย่านที่พัก" }
    },
    {
      "day": 2,
      "theme": "ตัวอย่าง: ผจญภัยธรรมชาติและสัมผัสวิถีชีวิต",
      "activities": [
        { "time": "09:00 - 12:00", "description": "กิจกรรมช่วงเช้า", "locationName": "ชื่อสถานที่ 4" }
      ],
      "lunch": { "time": "12:30 - 13:30", "name": "ชื่อร้านอาหารกลางวัน", "locationName": "ชื่อร้านอาหารกลางวัน หรือ ย่านร้านอาหาร" },
      "afternoonActivities": [
        { "time": "14:30 - 17:00", "description": "กิจกรรมช่วงบ่าย", "locationName": "ชื่อสถานที่ 5" }
      ],
      "dinner": { "time": "19:00 - 20:30", "name": "ชื่อร้านอาหารเย็น", "locationName": "ชื่อร้านอาหารเย็น หรือ ย่านร้านอาหาร" },
      "accommodation": { "name": "ชื่อที่พักคืนที่สอง หรือ 'แนะนำที่พักที่เดิม'", "locationName": "ชื่อที่พัก หรือ ย่านที่พัก" }
    },
    {
      "day": 3,
      "theme": "ตัวอย่าง: พักผ่อนหย่อนใจและซื้อของฝาก",
      "activities": [
        { "time": "09:00 - 11:00", "description": "กิจกรรมช่วงเช้า", "locationName": "ชื่อสถานที่ 6" },
        { "time": "11:30 - 12:30", "description": "ซื้อของฝาก", "locationName": "ชื่อตลาดหรือแหล่งช้อปปิ้ง" }
      ],
      "lunch": { "time": "13:00 - 14:00", "name": "ชื่อร้านอาหารกลางวันก่อนเดินทางกลับ", "locationName": "ชื่อร้านอาหาร หรือ ย่านร้านอาหาร" },
      "afternoonActivities": [],
      "dinner": null,
      "accommodation": null
    }
  ]
}
`;
}


export const generateTripPlan = async (city: string, tripStyle: TripStyle): Promise<TripPlan> => {
  if (!ai) {
    throw new Error(API_KEY_ERROR_MESSAGE);
  }

  const prompt = `สร้างแผนเที่ยวสำหรับ ${city} สไตล์ ${tripStyle} ตามโครงสร้าง JSON ที่กำหนดใน system instruction.`;
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(city, tripStyle),
        responseMimeType: "application/json",
        temperature: 0.7, // Adjust for creativity vs. predictability
      },
    });

    let jsonStr = response.text.trim();
    
    // Remove markdown fences if present (Gemini might sometimes wrap JSON in ```json ... ```)
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    try {
      const parsedData = JSON.parse(jsonStr) as TripPlan;
      // Basic validation of the parsed data structure
      if (!parsedData.tripTitle || !Array.isArray(parsedData.days) || parsedData.days.length === 0) {
        console.error("Parsed JSON does not match expected TripPlan structure:", parsedData);
        throw new Error("Received an invalid plan format from the AI. Please try again.");
      }
      return parsedData;
    } catch (parseError) {
      console.error("Failed to parse JSON response from Gemini:", parseError);
      console.error("Raw response text:", response.text);
      throw new Error("There was an issue processing the travel plan. The AI may have returned an unexpected format. Please try again or refine your query.");
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error && error.message.includes("API key not valid")) {
        throw new Error("Invalid API Key. Please check your API_KEY environment variable.");
    }
    throw new Error(`Failed to generate trip plan: ${error instanceof Error ? error.message : String(error)}`);
  }
};
