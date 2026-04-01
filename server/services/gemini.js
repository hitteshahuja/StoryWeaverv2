const { GoogleGenerativeAI } = require("@google/generative-ai");
const { urlToDataUrl } = require('./localStorage');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function suggestVisualStyles(imageUrl) {
    const modelName = process.env.MODEL_VISUAL_STYLES || 'gemini-3-pro-image-preview';
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `Look at this image. Suggest 6 unique children's book illustration styles (filters). 
    For each style, return:
    - name: A name like 'Ocean Dream' or 'Vintage Paper'.
    - description: A short blurb.
    - emoji: A single emoji.
    - cssFilter: A valid CSS filter string (e.g., "saturate(1.4) brightness(1.1) contrast(0.9) sepia(0.1)") that would achieve this visual look.
    
    Return ONLY a JSON array of these objects.`;

    // Convert URL to data URL if it's a local file
    const dataUrl = await urlToDataUrl(imageUrl);
    let base64Data;
    let mimeType = 'image/jpeg';

    if (dataUrl.startsWith('data:')) {
      const parts = dataUrl.split(',');
      base64Data = parts[1];
      const mimeMatch = dataUrl.match(/data:([^;]+)/);
      if (mimeMatch) mimeType = mimeMatch[1];
    } else {
      // External URL fallback
      const imgRes = await fetch(imageUrl);
      const buffer = await imgRes.arrayBuffer();
      base64Data = Buffer.from(buffer).toString('base64');
    }

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: base64Data,
                mimeType
            }
        }
    ]);
    const response = await result.response;
    return JSON.parse(response.text().match(/\[.*\]/s)[0]);
}

module.exports = { suggestVisualStyles };
