const fetch = require('node-fetch');

async function test() {
    const res = await fetch('https://rdyxzhuctlyzhyamqyml.supabase.co/functions/v1/suggest-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'party' })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Body:', text);
}

test();
