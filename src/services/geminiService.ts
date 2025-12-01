import { GoogleGenAI } from "@google/genai";
import { Employee, Payslip } from '../types';

let genAI: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize Gemini Client", error);
}

export const generatePayslipRemark = async (
  employee: Employee,
  payslip: Payslip
): Promise<string> => {
  if (!genAI) return "Excellent work this month. Keep it up!";

  try {
    const prompt = `
      You are an HR Manager writing a short, professional, and encouraging remark for an employee's payslip.
      
      Employee Details:
      - Name: ${employee.name}
      - Role: ${employee.role}
      - Department: ${employee.department}
      - Attendance: ${payslip.attendancePercentage.toFixed(1)}%
      - Net Salary: ₹${payslip.netSalary.toLocaleString('en-IN')}
      
      Context:
      - If attendance is > 95%, praise their consistency.
      - If attendance is low, gently encourage better work-life balance or health.
      - Mention their specific role or department value briefly.
      - Keep it under 25 words.
      - Do not use markdown. Just plain text.
    `;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Thank you for your hard work this month.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Thank you for your contribution this month.";
  }
};
