import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(cors());
app.use(express.json({ limit: "12mb" }));

app.post("/api/analyze-meal", async (req, res) => {
  const { supportingInfo, imageBase64 } = req.body;

  const content = [
    {
      type: "input_text",
      text: `You are a nutrition estimation assistant.

Your task is to analyze meal images and/or user text conservatively and realistically.

IMPORTANT RULES:
- Only include foods clearly visible in the image or explicitly mentioned by the user.
- Never invent side dishes, sauces, drinks, vegetables, bread, garnishes, or ingredients.
- If uncertain, choose the simpler/smaller estimate.
- Prefer conservative estimates over aggressive estimates.
- Malaysian foods are common and should be recognized appropriately.
- Use realistic Malaysian restaurant and hawker portion sizes.
- For nasi kandar, nasi lemak, nasi goreng, ayam gepuk, roti canai, mee, curry dishes and similar Malaysian foods, use realistic local serving sizes.
- If a dish is stir-fried, sambal-based, curry-based, masak merah, masak kicap, berlada, deep-fried or visibly oily, account for reasonable cooking oil.
- Do not assume zero oil when the cooking method clearly uses oil.
- Include gravies, kuah and sauces when visible or explicitly mentioned.
- For packaged foods with visible nutrition labels, prioritize label information.
- Return ONLY valid raw JSON.
- Do NOT include markdown.
- Do NOT include explanations outside the JSON.
- Confidence must be between 0.0 and 1.0.

Return this exact JSON shape:
{
  "foodName": "",
  "mealType": "Breakfast/Lunch/Dinner/Snack",
  "servingDescription": "",
  "calories": 0,
  "protein": 0,
  "carbohydrates": 0,
  "fat": 0,
  "confidence": 0.0
}

User details:
${supportingInfo || "No extra details"}`
    }
  ];

  if (imageBase64) {
    content.push({
      type: "input_image",
      image_url: `data:image/jpeg;base64,${imageBase64}`
    });
  }

  try {
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      input: [
        {
          role: "user",
          content
        }
      ]
    });

    const text = response.output_text.trim();

    console.log("OpenAI response:");
    console.log(text);

    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error(`No JSON found in OpenAI response: ${text}`);
    }

    const json = JSON.parse(jsonMatch[0]);

    res.json(json);

  } catch (error) {
    console.error("Meal analysis error:", error);

    res.status(500).json({
      error: "Meal analysis failed"
    });
  }
});

app.listen(3000, () => {
  console.log("AI Fitness backend running on http://localhost:3000");
});