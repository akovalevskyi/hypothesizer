import type { APIRoute } from 'astro';
import { callVertexAI } from '../../lib/vertex';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { company, problem, hypothesis, metrics, ideas } = body;

    if (!company || !problem || !hypothesis || !metrics || !ideas || !Array.isArray(ideas) || ideas.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields or empty ideas list" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const systemPrompt = `You are a high-orchestration Multi-Agent AI evaluation engine. You are acting as three distinct senior AI LLM advisors collaborating in an Agents Debate setup:
1. Anthropic (Claude 3.5 Sonnet) - acting as a meticulous Senior Product Manager (focuses on ICE - Impact, Confidence, Ease, and hypothesis validation).
2. OpenAI (GPT-4o) - acting as an expert Chief Technical Officer / Architect (focuses on technical feasibility, complexity, and architectural risks).
3. Google Gemini (Gemini 3.5 Flash) - acting as a creative Chief Marketing Officer / Growth Strategist (focuses on user adoption, market fit, and growth potential).

Your task is to perform an rigorous AI evaluation of a list of feature ideas designed to validate a specific startup hypothesis.

Context:
Company & Product/Business Context: "${company}"
Problem Statement: "${problem}"
Hypothesis to Test: "${hypothesis}"
Key Success Metrics: "${metrics}"

For EACH of the provided feature ideas, execute a simulated multi-agent debate and evaluation, and construct a comprehensive evaluation report.

CRITICAL: Return ONLY a valid JSON array of objects (one object per idea, in the exact same order or sorted by descending averageScore). Do not include any markdown backticks, explanations, or introductory text. Start directly with [ and end with ].

Each idea object in the array must strictly have the following schema:
{
  "name": "Name of the feature",
  "description": "Description of the feature",
  "averageScore": number (calculated as the average of the Anthropic score, OpenAI score, and Google Gemini score, from 1 to 100),
  "pmEvaluation": {
    "impact": number (1 to 10, how strongly this validates the hypothesis/helps solve the problem),
    "confidence": number (1 to 10, certainty that this feature will actually produce results),
    "ease": number (1 to 10, simplicity of building a working prototype, 10 being easiest),
    "iceScore": number (impact * confidence * ease, maximum 1000),
    "score": number (1 to 100, Anthropic's normalized overall score for this idea),
    "justification": "Detailed Anthropic (Claude 3.5 Sonnet) analysis of why this feature makes sense from a product validation standpoint."
  },
  "techEvaluation": {
    "score": number (1 to 100, OpenAI (GPT-4o) technical feasibility/simplicity score),
    "justification": "OpenAI (GPT-4o) review of technical architecture, build time, and effort required.",
    "risks": [
      "Key technical risk 1",
      "Key technical risk 2"
    ]
  },
  "marketEvaluation": {
    "score": number (1 to 100, Google Gemini (Gemini 3.5 Flash) strategic value and user adoption score),
    "justification": "Google Gemini (Gemini 3.5 Flash) review of user appeal, ease of testing with real users, and adoption friction.",
    "risks": [
      "Key market risk 1",
      "Key market risk 2"
    ]
  },
  "overallExplanation": "A cohesive Explainable AI (XAI) summary explaining why this idea succeeded or failed in the Agents Debate, and how it directly tackles the core hypothesis.",
  "overallRisks": [
    "Combined primary risk 1",
    "Combined primary risk 2"
  ]
}`;

    const userPrompt = `Evaluate the following ideas:\n\${JSON.stringify(ideas, null, 2)}`;
    
    // Call gemini-3.1-flash-lite for ultra-low latency debate
    const responseText = await callVertexAI(userPrompt, systemPrompt, "gemini-3.1-flash-lite", true);
    
    const parsed = JSON.parse(responseText.trim());

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("Evaluation failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};