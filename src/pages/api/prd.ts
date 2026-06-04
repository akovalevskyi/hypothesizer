import type { APIRoute } from 'astro';
import { callVertexAI } from '../../lib/vertex';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { company, problem, hypothesis, metrics, selectedIdea } = body;

    if (!company || !problem || !hypothesis || !metrics || !selectedIdea) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const systemPrompt = `You are a Senior Product Manager.
Your goal is to generate a short, crisp, highly concise and actionable Product Requirements Document (PRD) formatted specifically as an actionable AI Agent Coding Prompt (a prompt that can be copy-pasted into Cursor or Claude Code to build a 100% working prototype of this feature).

CRITICAL FOR DEMO: Keep the output extremely short, brief, and punchy (MAXIMUM 350 words total) so that it compiles and returns in under 5 seconds! This is for a live hackathon demonstration.

Include only these brief sections:
1. OVERVIEW & GOAL (1 brief paragraph describing the company context, problem, hypothesis, metrics, and core feature)
2. TECHNICAL ARCHITECTURE (Minimal list of pages and API endpoints)
3. DETAILED SCOPE (3-4 bullet points of features to build)
4. AGENT GUIDELINES (Short guidelines telling the Cursor Agent how to implement, optimize, and test it)

Context:
Company Context: "${company}"
Problem: "${problem}"
Hypothesis: "${hypothesis}"
Metrics: "${metrics}"
Selected Feature: "${selectedIdea.name}" - "${selectedIdea.description}"
PM Score: \${selectedIdea.pmEvaluation?.score || 80}/100, ICE Score: \${selectedIdea.pmEvaluation?.iceScore || 500}/1000
Tech Score: \${selectedIdea.techEvaluation?.score || 80}/100
Market Score: \${selectedIdea.marketEvaluation?.score || 80}/100
XAI Explanation: "\${selectedIdea.overallExplanation || ""}"
Key Risks: \${JSON.stringify(selectedIdea.overallRisks || [])}

Return ONLY the markdown PRD text. Do not include any HTML wrappers, introductory notes, or chatter. Start directly with the PRD markdown contents.`;

    const userPrompt = `Generate a detailed Prompt-PRD for implementing the feature: "\${selectedIdea.name}"`;
    
    // Call gemini-3.1-flash-lite for blazingly fast requirements generation
    const responseText = await callVertexAI(userPrompt, systemPrompt, "gemini-3.1-flash-lite", false);

    return new Response(JSON.stringify({ prd: responseText }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (error: any) {
    console.error("PRD generation failed:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};