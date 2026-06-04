import * as crypto from 'crypto';
import * as fs from 'fs';

async function getGCPToken(saKey: any) {
  const header = { alg: "RS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const payload = {
    iss: saKey.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: saKey.token_uri,
    exp,
    iat
  };

  const base64UrlEncode = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsignedToken = `${base64UrlEncode(header)}.${base64UrlEncode(payload)}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(unsignedToken);
  const signature = sign.sign(saKey.private_key, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const signedJwt = `${unsignedToken}.${signature}`;

  const response = await fetch(saKey.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to exchange JWT for Google access token: ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function callVertexAI(prompt: string, systemPrompt: string, modelName = "gemini-3.5-flash", jsonMode = false) {
  const saPath = "/app/data/vertex_key.json";
  if (!fs.existsSync(saPath)) {
    throw new Error(`Google Cloud Vertex Service Account key not found at ${saPath}`);
  }
  const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'));

  const token = await getGCPToken(sa);
  const url = `https://aiplatform.googleapis.com/v1/projects/${sa.project_id}/locations/global/publishers/google/models/${modelName}:generateContent`;

  const config: any = {
    temperature: 0.7
  };

  if (jsonMode) {
    config.responseMimeType = "application/json";
  }

  const r = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemPrompt}\n\nUser Request: ${prompt}` }
          ]
        }
      ],
      generationConfig: config
    })
  });

  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Vertex AI call failed: ${r.status} - ${text}`);
  }

  const data = await r.json();
  if (!data.candidates || data.candidates.length === 0) {
    throw new Error("Empty response from Vertex AI");
  }
  return data.candidates[0].content.parts[0].text;
}