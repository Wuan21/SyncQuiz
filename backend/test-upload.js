require('dotenv').config();
const jwt = require('jsonwebtoken');
const http = require('http');

const token = jwt.sign({id:'test_user', email:'test@test.com'}, process.env.JWT_ACCESS_SECRET, {expiresIn:'1h'});
const body = JSON.stringify({fileName:'test.jpg',contentType:'image/jpeg',folder:'questions'});

console.log('Testing Upload Presign endpoint...');
console.log('');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/upload/presign',
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
      } else if (result.uploadUrl) {
        console.log('✅ Success!');
        console.log('  - Backend:', result.backend);
        console.log('  - Upload URL:', result.uploadUrl.slice(0, 80) + '...');
        console.log('  - Public URL:', result.publicUrl.slice(0, 80) + '...');
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
