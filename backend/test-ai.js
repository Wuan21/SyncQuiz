require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({id:'test_user', email:'test@test.com'}, process.env.JWT_ACCESS_SECRET, {expiresIn:'1h'});
const body = JSON.stringify({topic:'Python',count:3,difficulty:'easy',language:'Vietnamese'});

console.log('Testing AI endpoint...');
console.log('API Key:', process.env.GEMINI_API_KEY?.slice(0,20)+'...');
console.log('Model:', process.env.GEMINI_MODEL);
console.log('');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/ai/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.error || result.message) {
        console.log('❌ Error:', result.message || result.error);
      } else if (result.questions) {
        console.log('✅ Success!');
        console.log('  - Generated:', result.questions.length, 'questions');
        console.log('  - Model used:', result.model);
        console.log('  - Topic:', result.topic);
      } else {
        console.log('⚠️  Unexpected response:', result);
      }
    } catch (e) {
      console.log('❌ Parse error:', e.message);
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.log('❌ Request error:', e.message);
});

req.write(body);
req.end();

setTimeout(() => {
  console.log('');
  process.exit(0);
}, 5000);
