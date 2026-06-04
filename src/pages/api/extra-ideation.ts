import type { APIRoute } from 'astro';
import { callVertexAI } from '../../lib/vertex';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { company, problem, hypothesis, metrics, ideas } = body;

    if (!company || !problem || !hypothesis || !metrics) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const systemPrompt = `You are a world-class startup product strategist. Your goal is to help founders generate additional ideas to validate their hypothesis.
Analyze the user's input:
Company Context: "${company}"
Problem: "${problem}"
Hypothesis: "${hypothesis}"
Success Metrics: "${metrics}"
User's existing ideas: "${ideas || "None provided"}"

Generate exactly 3 fresh, high-impact, and creative additional feature ideas that could solve the problem or validate/invalidate the hypothesis. These ideas should be realistic, actionable, and focus on fast validation.

CRITICAL: Return ONLY a valid JSON array of objects. Do not include any markdown formatting or introductory text. Just the raw JSON.
Each object must have exactly these fields:
- "name": string (short, descriptive name)
- "description": string (clear explanation of the feature, how it works, and how it helps test the hypothesis)
- "source": "AI"`;

    const userPrompt = "Generate 3 extra feature ideas for validation.";
    
    // Use gemini-3.1-flash-lite for ultra-low latency
    const responseText = await callVertexAI(userPrompt, systemPrompt, "gemini-3.1-flash-lite", true);
    
    // Parse to ensure it is valid JSON
    const parsed = JSON.parse(responseText.trim());

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Extra ideation failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};