import * as fs from 'fs';


const dir = "../frontend/web/AI Screenshot 14_12_2025, 10_07_41.png";

const imageBuffer = fs.readFileSync(dir);
const base64Image = imageBuffer.toString('base64');

const requestBody = {
  contents: [
    { type: 'text', text: 'explain the image' },
    { type: 'image', data: base64Image, mime_type: 'image/png' }
  ],
  system_message: 'You are a helpful assistant.'
};

fetch('http://localhost:8000/api/llm/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(requestBody)
})
  .then(res => res.json())
  .then(data => console.log('Response:', JSON.stringify(data, null, 2)))
  .catch(err => console.error('Error:', err));
