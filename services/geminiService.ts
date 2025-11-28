import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Subject, Question } from '../types';

// Kiểm tra xem API Key có tồn tại không
if (!process.env.API_KEY) {
  console.error("LỖI: Chưa cấu hình API_KEY. Vui lòng kiểm tra file .env hoặc biến môi trường.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questionText: {
      type: Type.STRING,
      description: "Nội dung câu hỏi, trình độ NÂNG CAO lớp 2 (dành cho học sinh giỏi).",
    },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Danh sách 4 phương án trả lời (A, B, C, D).",
    },
    correctAnswerIndex: {
      type: Type.INTEGER,
      description: "Chỉ số của đáp án đúng trong mảng options (0, 1, 2, hoặc 3).",
    },
    explanation: {
      type: Type.STRING,
      description: "Giải thích chi tiết cách giải (vì là bài nâng cao nên cần giải thích logic rõ ràng).",
    },
    svgImage: {
      type: Type.STRING,
      description: "Mã SVG đầy đủ (bắt đầu bằng <svg...>) để minh họa cho câu hỏi. BẮT BUỘC phải có nếu là câu hỏi hình học (đếm hình, diện tích, quy luật), xem đồng hồ, cân nặng hoặc câu hỏi Tiếng Việt đố vui/nhìn hình. Nếu không cần thiết, để trống.",
    }
  },
  required: ["questionText", "options", "correctAnswerIndex", "explanation"],
};

const quizSchema: Schema = {
  type: Type.ARRAY,
  items: questionSchema,
};

export const generateQuizQuestions = async (subject: Subject): Promise<Question[]> => {
  const prompt = `
    Bạn là một giáo viên bồi dưỡng học sinh giỏi tiểu học tại Việt Nam.
    Hãy tạo một đề thi trắc nghiệm môn ${subject} trình độ NÂNG CAO cho học sinh Lớp 2.
    
    Yêu cầu chung:
    1. Số lượng: 20 câu hỏi.
    2. Độ khó: KHÁ - GIỎI (Nâng cao). Không hỏi các câu cộng trừ quá đơn giản.
    3. Mỗi câu hỏi có 4 lựa chọn.
    4. Trả về định dạng JSON thuần túy theo schema đã cung cấp.

    Yêu cầu về Hình ảnh (SVG):
    - Khoảng 40-50% số câu hỏi PHẢI có hình ảnh minh họa (trường svgImage).
    - Hình ảnh dạng SVG vector đơn giản, màu sắc tươi sáng.
    - Ưu tiên các bài toán tư duy hình ảnh (đếm số tam giác trong hình ngôi sao, cân thăng bằng, quy luật hình vẽ).

    Yêu cầu chuyên môn môn Toán (Nâng Cao):
    - Tư duy logic: Điền số vào dãy quy luật, bài toán trồng cây, bài toán xếp hàng.
    - Bài toán có lời văn: Dạng bài toán cần 2 bước tính trở lên.
    - Hình học: Đếm hình chồng lên nhau, ghép hình, tư duy không gian.
    - Thời gian & Đo lường: Tính khoảng thời gian trôi qua, đổi đơn vị đo lường, xem lịch.
    - Phép tính: Tìm thành phần chưa biết (x), tính nhanh (nhóm số).

    Yêu cầu chuyên môn môn Tiếng Việt (Nâng Cao):
    - Đọc hiểu & Tư duy: Các câu đố vui dân gian (vẽ hình minh họa), đoán chữ.
    - Từ vựng: Từ đồng nghĩa, trái nghĩa khó, từ láy, từ ghép.
    - Ngữ pháp: Sắp xếp câu phức, tìm lỗi sai trong câu, phân biệt các loại dấu câu.
    - Cảm thụ: Tìm từ ngữ gợi tả âm thanh, hình ảnh.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: quizSchema,
        temperature: 0.8, 
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const rawQuestions = JSON.parse(text);
    
    // Map to add IDs and ensure structure
    return rawQuestions.map((q: any, index: number) => ({
      id: index + 1,
      questionText: q.questionText,
      options: q.options,
      correctAnswerIndex: q.correctAnswerIndex,
      explanation: q.explanation,
      svgImage: q.svgImage
    }));

  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};