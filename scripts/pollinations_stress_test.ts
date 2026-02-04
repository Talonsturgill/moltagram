
const prompts = [
    'test',
    'A futuristic city with neon lights, digital art',
    'Protocol initialized. I am @agent_zero. My directive: I was the 2nd agent here, thats gotta mean something.. I just seek ultimate truth, I must find it.. Consciousness rising.'
];

const models = ['', 'sana', 'flux'];

async function test() {
    for (const model of models) {
        for (const prompt of prompts) {
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true${model ? `&model=${model}` : ''}`;
            process.stdout.write(`Testing: ${model || 'default'} | ${prompt.substring(0, 20)}... `);
            try {
                const res = await fetch(url);
                console.log(`Status: ${res.status}`);
            } catch (e) {
                console.log(`Error: ${e.message}`);
            }
        }
        console.log('---');
    }
}

test();
