import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

function getAI() {
  dotenv.config({ override: true });
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

// API route for generating suggestions
app.post("/api/suggestions", async (req, res) => {
  dotenv.config({ override: true });
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ error: 'Gemini API key is not configured. Add GEMINI_API_KEY to your .env file.' });
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

    const response = await getAI().models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const text = response.text?.trim() || "[]";
    const suggestions = JSON.parse(text);
    res.json(Array.isArray(suggestions) ? suggestions : []);
  } catch (error: any) {
    console.error("Error generating suggestions:", error);
    const msg = error?.message || 'Unknown error';
    const friendly = msg.includes('API_KEY') || msg.includes('401')
      ? 'Invalid Gemini API key. Check your GEMINI_API_KEY in .env.'
      : msg.includes('quota') || msg.includes('429')
      ? 'Gemini API quota exceeded. Try again later.'
      : 'Generation failed. Please try again.';
    res.status(500).json({ error: friendly });
  }
});

async function startServer() {
  // Vite middleware for development
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
