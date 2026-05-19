import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API route for generating suggestions
app.post("/api/suggestions", async (req, res) => {
  try {
    const { currentPlaces } = req.body;
    
    const prompt = `You are an expert travel guide for Ho Chi Minh City (Saigon), Vietnam. 
    Based on the following existing places in the user's travel master planner, generate 10 more unique and highly recommended places to visit.
    
    Existing places: ${JSON.stringify(currentPlaces)}
    
    Include a mix of hidden gems, popular spots, and varied categories like: Food, Fashion, Coffee, Spa, Sightseeing, and Nightlife.
    Ensure districts are mainly D1, D3, D4, D5, D7, Binh Thanh, or Thu Duc.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              district: { type: Type.STRING },
              category: { type: Type.STRING },
              address: { type: Type.STRING },
            },
            required: ["name", "district", "category", "address"]
          }
        }
      }
    });

    const suggestions = JSON.parse(response.text || "[]");
    res.json(suggestions);
  } catch (error: any) {
    console.error("Error generating suggestions:", error);
    res.status(500).json({ error: error.message });
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
