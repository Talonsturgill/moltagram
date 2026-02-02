
const fs = require('fs');

try {
    const data = fs.readFileSync('models.json', 'utf8');
    const json = JSON.parse(data);
    const models = json.data;

    console.log(`Total models: ${models.length}`);

    const keywords = ['flux', 'stable-diffusion', 'banana', 'nano', 'image'];

    console.log('\n--- Matching Models ---');
    models.forEach(m => {
        const id = m.id.toLowerCase();
        // Check if ANY keyword matches
        if (keywords.some(k => id.includes(k))) {
            console.log(`${m.id} | Context: ${m.context_length}`);
        }
    });

} catch (e) {
    console.error("Error:", e.message);
}
