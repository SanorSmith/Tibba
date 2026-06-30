import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function uploadTemplate() {
  try {
    const templatePath = path.join(__dirname, '..', 'openehr', 'templates', 'template_triage_v1.opt');

    console.log('📂 Reading template from:', templatePath);
    const template = fs.readFileSync(templatePath, 'utf-8');

    // Check environment variables
    console.log('\n🔍 Checking environment variables:');
    console.log('EHRBASE_URL:', process.env.EHRBASE_URL || '❌ NOT SET');
    console.log('EHRBASE_USER:', process.env.EHRBASE_USER ? '✅ SET' : '❌ NOT SET');
    console.log('EHRBASE_PASSWORD:', process.env.EHRBASE_PASSWORD ? '✅ SET' : '❌ NOT SET');
    console.log('EHRBASE_API_KEY:', process.env.EHRBASE_API_KEY ? '✅ SET' : '❌ NOT SET');

    if (!process.env.EHRBASE_URL || !process.env.EHRBASE_USER || !process.env.EHRBASE_PASSWORD || !process.env.EHRBASE_API_KEY) {
      console.error('\n❌ Missing required environment variables. Please check your .env file.');
      process.exit(1);
    }

    // Build the correct URL - EHRBASE_URL may already include the /ehrbase base path
    const baseUrl = process.env.EHRBASE_URL.endsWith('/ehrbase')
      ? process.env.EHRBASE_URL
      : `${process.env.EHRBASE_URL}/ehrbase`;
    const url = `${baseUrl}/rest/openehr/v1/definition/template/adl1.4`;
    const auth = Buffer.from(`${process.env.EHRBASE_USER}:${process.env.EHRBASE_PASSWORD}`).toString('base64');

    console.log('\n📤 Uploading to:', url);
    console.log('📋 Template: template_triage_v1');

    const response = await axios.post(url, template, {
      headers: {
        'Content-Type': 'application/xml',
        'X-API-Key': process.env.EHRBASE_API_KEY,
        'Authorization': `Basic ${auth}`
      }
    });

    console.log('✅ Template uploaded successfully!');
    console.log('Response:', response.data);
  } catch (error) {
    console.error('\n❌ Error uploading template:');
    if (axios.isAxiosError(error)) {
      console.error('Status:', error.response?.status);
      console.error('Response:', error.response?.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

uploadTemplate();
