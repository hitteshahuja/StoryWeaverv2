require('dotenv').config();

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No GEMINI_API_KEY found in .env");
        process.exit(1);
    }
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        
        console.log("=== Available Gemini Models ===\n");
        data.models.forEach(m => {
            console.log(`Model: ${m.name}`);
            console.log(`Name: ${m.displayName}`);
            console.log(`Supported Methods: ${m.supportedGenerationMethods?.join(', ') || 'N/A'}`);
            console.log("-".repeat(30));
        });
    } catch (e) {
        console.error("Error listing models:", e);
    }
}

listModels();
