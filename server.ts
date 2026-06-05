import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API route for generating suggestions
app.post("/api/suggestions", async (req, res) => {
  dotenv.config({ override: true });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'GEMINI_API_KEY is not set. Add it to your .env file.' });
  }
  try {
    const { currentPlaces, destination } = req.body;
    const dest = destination || "Ho Chi Minh City (Saigon), Vietnam";

    const prompt = `You are an expert travel guide for ${dest}.
Based on the following existing places in the user's travel master planner, generate exactly 10 more unique and highly recommended places to visit in ${dest}.

Existing places: ${JSON.stringify(currentPlaces)}

Include a mix of hidden gems, popular spots, and varied categories like: Food, Fashion, Coffee, Spa, Sightseeing, and Nightlife.
Each district/area must be a real, popular neighbourhood in ${dest}.

Return ONLY a valid JSON array with no markdown or extra text. Each item must have these exact keys:
- "name": place name (string)
- "district": neighbourhood or area name (string)
- "category": one of Food, Fashion, Coffee, Spa, Sightseeing, Nightlife (string)
- "address": full street address (string)`;

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
    });

    const raw = response.text?.trim() || "[]";
    const match = raw.match(/\[[\s\S]*\]/);
    const suggestions = JSON.parse(match ? match[0] : "[]");
    res.json(Array.isArray(suggestions) ? suggestions : []);
  } catch (error: any) {
    const msg = error?.message || 'Unknown error';
    console.error("Gemini error:", msg);
    const friendly = msg.includes('API_KEY') || msg.includes('401') || msg.includes('403')
      ? 'Invalid or missing Gemini API key.'
      : msg.includes('quota') || msg.includes('429')
      ? 'Gemini quota exceeded. Try again later.'
      : msg.includes('404') || msg.includes('no longer available')
      ? 'Gemini model not found. Contact support.'
      : `Generation failed: ${msg}`;
    res.status(500).json({ error: friendly });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} — Gemini model: gemini-2.5-flash`);
  });
}

startServer();
