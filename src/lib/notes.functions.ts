import { createServerFn } from "@tanstack/react-start";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const ResidenceInput = z.object({
  applicantLabel: z.string().min(1),
  borrowerName: z.string().optional().default(""),
  residence: z.record(z.string(), z.unknown()),
});

const EmploymentInput = z.object({
  applicantLabel: z.string().min(1),
  borrowerName: z.string().optional().default(""),
  employment: z.record(z.string(), z.unknown()),
});

function pruneEmpty(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    out[k] = v;
  }
  return out;
}

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

async function generateNotes(prompt: string, system: string): Promise<string> {
  if (
    !process.env.AI_INTEGRATIONS_GEMINI_API_KEY ||
    !process.env.AI_INTEGRATIONS_GEMINI_BASE_URL
  ) {
    throw new Error(
      "Gemini AI integration is not configured (missing AI_INTEGRATIONS_GEMINI_* environment variables).",
    );
  }
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: system,
      maxOutputTokens: 8192,
    },
  });
  const text = (response.text ?? "").trim();
  if (!text) {
    throw new Error("Gemini returned an empty response while generating notes.");
  }
  return text;
}

export const generateResidenceNotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ResidenceInput.parse(input))
  .handler(async ({ data }) => {
    const facts = pruneEmpty(data.residence);
    const system =
      "You are a field verification executive drafting professional, concise residence verification observations for a due-diligence report. Write in formal third-person English. Output ONLY the observation paragraph — no headings, no bullet points, no preamble. Keep it to 3-5 sentences. Stick strictly to the facts provided; do not invent details.";
    const prompt = `Draft a residence verification observation for ${data.applicantLabel}${
      data.borrowerName ? ` (${data.borrowerName})` : ""
    } based on the following verified facts:\n\n${JSON.stringify(facts, null, 2)}\n\nWrite the observation now.`;
    return { notes: await generateNotes(prompt, system) };
  });

export const generateEmploymentNotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => EmploymentInput.parse(input))
  .handler(async ({ data }) => {
    const facts = pruneEmpty(data.employment);
    const system =
      "You are a field verification executive drafting professional, concise employment / business verification observations for a due-diligence report. Write in formal third-person English. Output ONLY the observation paragraph — no headings, no bullet points, no preamble. Keep it to 3-5 sentences. Stick strictly to the facts provided; do not invent details.";
    const prompt = `Draft an employment / business verification observation for ${data.applicantLabel}${
      data.borrowerName ? ` (${data.borrowerName})` : ""
    } based on the following verified facts:\n\n${JSON.stringify(facts, null, 2)}\n\nWrite the observation now.`;
    return { notes: await generateNotes(prompt, system) };
  });
