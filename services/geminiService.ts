
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { TripPlan, TripStyle } from '../types';
import { GEMINI_MODEL_NAME, API_KEY_ERROR_MESSAGE } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error(API_KEY_ERROR_MESSAGE);
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

function getSystemInstruction(city: string, tripStyle: TripStyle, tripDays: number): string {
  const tripNights = tripDays > 0 ? tripDays - 1 : 0;
  let accommodationInstruction = "ระบุชื่อที่พักสำหรับแต่ละคืน ยกเว้นคืนสุดท้าย (ถ้ามี).";
  if (tripNights === 0 && tripDays === 1) { // Day trip
    accommodationInstruction = "เนื่องจากเป็นทริปวันเดียว ไม่ต้องระบุที่พัก";
  } else if (tripNights === 1) { // 2 days 1 night
     accommodationInstruction = `ระบุชื่อที่พักสำหรับคืนที่ 1. คืนสุดท้าย (คืนที่ ${tripNights}) ไม่จำเป็นต้องมีที่พักหากกิจกรรมวันสุดท้ายคือการเดินทางกลับ`;
  } else if (tripNights > 1) {
     accommodationInstruction = `ระบุชื่อที่พักสำหรับแต่ละคืน (คืนที่ 1 ถึง ${tripNights}). คืนสุดท้าย (คืนที่ ${tripNights}) ไม่จำเป็นต้องมีที่พักหากกิจกรรมวันสุดท้ายคือการเดินทางกลับ`;
  }


  // Dynamically create a representative structure for the days array based on tripDays.
  // We'll show up to 2 example days, and then indicate if more.
  let daysExampleStructure = "";
  for (let i = 1; i <= Math.min(tripDays, 2); i++) {
    daysExampleStructure += `
    {
      "day": ${i},
      "theme": "ตัวอย่าง: ธีมสำหรับวันที่ ${i}",
      "activities": [
        { "time": "09:00 - 11:00", "description": "กิจกรรมช่วงเช้า 1 วันที่ ${i}", "locationName": "ชื่อสถานที่ 1 วันที่ ${i}" },
        { "time": "11:30 - 12:30", "description": "กิจกรรมช่วงเช้า 2 วันที่ ${i}", "locationName": "ชื่อสถานที่ 2 วันที่ ${i}" }
      ],
      "lunch": { "time": "13:00 - 14:00", "name": "ชื่อร้านอาหารกลางวันวันที่ ${i}", "locationName": "ย่านร้านอาหารกลางวันวันที่ ${i}" },
      "afternoonActivities": [
        { "time": "15:00 - 17:00", "description": "กิจกรรมช่วงบ่ายวันที่ ${i}", "locationName": "ชื่อสถานที่ 3 วันที่ ${i}" }
      ],
      "dinner": { "time": "18:30 - 20:00", "name": "ชื่อร้านอาหารเย็นวันที่ ${i}", "locationName": "ย่านร้านอาหารเย็นวันที่ ${i}" }`;
    if (tripNights > 0 && i <= tripNights) { // Add accommodation only if it's not the last day of stay
      daysExampleStructure += `,
      "accommodation": { "name": "ชื่อที่พักคืนที่ ${i}", "locationName": "ย่านที่พักคืนที่ ${i}" }`;
    } else {
        daysExampleStructure += `,
      "accommodation": null`; // No accommodation for the last day, or if it's a day trip
    }
    daysExampleStructure += `
    }${i < Math.min(tripDays, 2) || (tripDays > 2 && i === 2) ? "," : ""}`; // Add comma if not the last example day or if more days are coming
  }
  if (tripDays > 2) {
    daysExampleStructure += `
    // ... (ข้อมูลสำหรับวันที่ 3 ถึง ${tripDays} ตามโครงสร้างเดียวกัน) ...`;
  }
   if (tripDays === 0) { // Should not happen with current UI, but good to handle
    daysExampleStructure = `// ไม่มีการสร้างแผนสำหรับ 0 วัน`;
  }


  return `
คุณคือนักวางแผนท่องเที่ยวมืออาชีพ AI ผู้เชี่ยวชาญการจัดทริปในประเทศไทย
ภารกิจของคุณคือสร้างแผนการเดินทาง ${tripDays} วัน ${tripNights > 0 ? `${tripNights} คืน` : ''} สำหรับเมือง/จังหวัด "${city}" ตามสไตล์ทริป "${tripStyle}".

ข้อกำหนดสำคัญมากสำหรับการตอบกลับ:
1.  **ต้องตอบกลับเป็น JSON object เท่านั้น** ไม่มีการนำหน้าหรือต่อท้ายด้วยข้อความใดๆ เช่น "Here is the JSON:" หรือ markdown code fences (เช่น \`\`\`json ... \`\`\`).
2.  JSON object ต้องมีโครงสร้างตามที่ระบุข้างล่างนี้ทุกประการ
3.  ข้อมูลทั้งหมดต้องเป็นภาษาไทย
4.  ชื่อสถานที่ (locationName) ต้องเป็นชื่อที่สามารถนำไปค้นหาบน Google Maps ได้จริง และควรเฉพาะเจาะจง
5.  หากข้อมูลบางส่วน เช่น ร้านอาหารหรือที่พัก ไม่สามารถระบุชื่อเฉพาะได้ ให้ใช้คำว่า "แนะนำให้ผู้ใช้เลือกตามชอบในย่านนั้น" หรือ "โรงแรม/ที่พักในย่านตัวเมือง ${city}" หรือใกล้เคียงตามความเหมาะสม
6.  ใส่ความคิดสร้างสรรค์ลงไปในแผน ให้ทริปน่าสนใจและสมเหตุสมผลสำหรับระยะเวลา ${tripDays} วัน
7.  จำนวนวันใน Array "days" ต้องมี ${tripDays} วันพอดี
8.  ${accommodationInstruction}
9.  สำหรับวันสุดท้ายของทริป (วันที่ ${tripDays}), "accommodation" ควรเป็น null และ "dinner" อาจเป็น null หากกิจกรรมสุดท้ายคือการเดินทางกลับ

โครงสร้าง JSON ที่ต้องการ:
{
  "tripTitle": "แผนเที่ยว ${tripDays} วัน ${tripNights > 0 ? `${tripNights} คืน ` : ''}ที่ ${city} (สไตล์: ${tripStyle})",
  "days": [${daysExampleStructure}
  ]
}
`;
}


export const generateTripPlan = async (city: string, tripStyle: TripStyle, tripDays: number): Promise<TripPlan> => {
  if (!ai) {
    throw new Error(API_KEY_ERROR_MESSAGE);
  }
  if (tripDays <= 0) {
    throw new Error("Number of trip days must be positive.");
  }

  const prompt = `สร้างแผนเที่ยวสำหรับ ${city} สไตล์ ${tripStyle} เป็นเวลา ${tripDays} วัน. กรุณาใช้โครงสร้าง JSON ที่กำหนดใน system instruction.`;
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: getSystemInstruction(city, tripStyle, tripDays),
        responseMimeType: "application/json",
        temperature: 0.75, 
      },
    });

    let jsonStr = response.text.trim();
    
    const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[1]) {
      jsonStr = match[1].trim();
    }

    try {
      const parsedData = JSON.parse(jsonStr) as TripPlan;
      if (!parsedData.tripTitle || !Array.isArray(parsedData.days) || parsedData.days.length !== tripDays) {
        console.error("Parsed JSON does not match expected TripPlan structure or day count:", parsedData);
        throw new Error(`Received an invalid plan format or incorrect number of days from the AI. Expected ${tripDays} days. Please try again.`);
      }
      // Ensure each day has a day number
      for(const day of parsedData.days) {
        if (typeof day.day !== 'number') {
            console.error("Parsed JSON has missing day number in a day plan:", parsedData);
            throw new Error("Received an invalid plan format from the AI (missing day number). Please try again.");
        }
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
