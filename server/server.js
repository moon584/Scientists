import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 读取上一级目录的 .env 文件
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();

// 配置 CORS，允许前端 3000 端口访问
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 配置 multer 用于处理音频文件上传
const upload = multer({ dest: 'uploads/' });

const PORT = process.env.PORT || 3001;

// 百度 AppBuilder API 接口
const BAIDU_API_URL = 'https://qianfan.baidubce.com/v2/app/conversation/runs';

// 获取百度语音识别 Access Token
async function getBaiduAccessToken() {
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${process.env.BAIDU_ASR_CLIENT_ID}&client_secret=${process.env.BAIDU_ASR_CLIENT_SECRET}`;
  try {
    const response = await axios.post(url);
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Baidu Access Token:', error);
    throw error;
  }
}

// 语音转文字接口
app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded' });
  }

  try {
    const accessToken = await getBaiduAccessToken();
    const audioData = fs.readFileSync(req.file.path);
    const base64Audio = audioData.toString('base64');
    const fileSize = fs.statSync(req.file.path).size;

    // 百度短语音识别 API
    const asrUrl = 'https://vop.baidu.com/server_api';
    
    const requestBody = {
      format: 'wav', // 前端录音格式
      rate: 16000,   // 采样率
      channel: 1,    // 单声道
      cuid: 'scientists-web-client', // 用户唯一标识
      token: accessToken,
      speech: base64Audio,
      len: fileSize
    };

    const response = await axios.post(asrUrl, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // 清理临时文件
    fs.unlinkSync(req.file.path);

    if (response.data.err_no === 0) {
      res.json({ text: response.data.result[0] });
    } else {
      throw new Error(`Baidu ASR Error: ${response.data.err_msg}`);
    }
  } catch (error) {
    console.error('Speech to text error:', error);
    // 确保发生错误时也清理临时文件
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { query, conversation_id } = req.body;
    
    const requestBody = {
      app_id: process.env.BAIDU_APP_ID,
      query: query,
      stream: false
    };

    if (conversation_id) {
      requestBody.conversation_id = conversation_id;
    }

    const response = await fetch(BAIDU_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': process.env.BAIDU_API_KEY.startsWith('Bearer ') ? process.env.BAIDU_API_KEY : `Bearer ${process.env.BAIDU_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Baidu API Error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error calling Baidu API:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});