// Test script to verify Google Gemini API key
// Usage: node test-google-api.js YOUR_API_KEY

const apiKey = process.argv[2];

if (!apiKey) {
  console.error('❌ Please provide an API key as argument');
  console.log('Usage: node test-google-api.js YOUR_API_KEY');
  process.exit(1);
}

async function testGoogleGeminiAPI() {
  console.log('🔍 Testing Google Gemini API key...\n');

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: 'Say "Hello, the API key works!" in one sentence.'
            }]
          }]
        })
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log('✅ API Key is VALID and working!\n');
      console.log('📝 Test response:', data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data, null, 2));
      console.log('\n✨ You can use this API key in Vercel!');
      return true;
    } else {
      console.error('❌ API Key test FAILED');
      console.error('Status:', response.status);
      console.error('Error:', JSON.stringify(data, null, 2));

      if (response.status === 400) {
        console.log('\n💡 Tip: The API key format might be incorrect');
      } else if (response.status === 403) {
        console.log('\n💡 Tip: API key might be restricted or disabled');
      } else if (response.status === 429) {
        console.log('\n💡 Tip: Rate limit exceeded - but the key is valid!');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return false;
  }
}

testGoogleGeminiAPI();
