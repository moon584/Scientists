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
const LOG_DIR = path.resolve(__dirname, 'logs');
const CHAT_LOG_FILE = path.join(LOG_DIR, 'chat.log');

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function logChat(stage, payload) {
  const line = `[${new Date().toISOString()}][chat][${stage}] ${JSON.stringify(payload)}`;
  console.log(line);
  fs.appendFileSync(CHAT_LOG_FILE, `${line}\n`, 'utf8');
}

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
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let resolvedConversationId = conversation_id || null;
    let assistantReply = '';

    logChat('request', {
      requestId,
      conversation_id: resolvedConversationId,
      query
    });
    
    const requestBody = {
      app_id: process.env.BAIDU_APP_ID,
      query: query,
      stream: true
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
    
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const writeEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    if (!response.body) {
      throw new Error('Baidu API stream body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastAnswer = '';

    req.on('close', () => {
      reader.cancel().catch(() => {});
    });

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;

        const payload = line.slice(5).trim();
        if (!payload) continue;
        if (payload === '[DONE]') {
          logChat('response', {
            requestId,
            conversation_id: resolvedConversationId,
            query,
            answer: assistantReply
          });
          writeEvent('done', { done: true });
          res.end();
          return;
        }

        let data;
        try {
          data = JSON.parse(payload);
        } catch {
          continue;
        }

        if (data.conversation_id) {
          resolvedConversationId = data.conversation_id;
          writeEvent('meta', { conversation_id: data.conversation_id });
        }

        if (typeof data.answer === 'string' && data.answer.length > 0) {
          const delta = data.answer.startsWith(lastAnswer)
            ? data.answer.slice(lastAnswer.length)
            : data.answer;
          if (delta) {
            assistantReply += delta;
            writeEvent('chunk', { text: delta });
          }
          lastAnswer = data.answer;
          continue;
        }

        if (typeof data.content === 'string' && data.content.length > 0) {
          assistantReply += data.content;
          writeEvent('chunk', { text: data.content });
        }
      }
    }

    if (buffer.trim().startsWith('data:')) {
      const payload = buffer.trim().slice(5).trim();
      if (payload && payload !== '[DONE]') {
        try {
          const data = JSON.parse(payload);
          if (data.conversation_id) {
            resolvedConversationId = data.conversation_id;
            writeEvent('meta', { conversation_id: data.conversation_id });
          }
          if (typeof data.answer === 'string' && data.answer.length > 0) {
            const delta = data.answer.startsWith(lastAnswer)
              ? data.answer.slice(lastAnswer.length)
              : data.answer;
            if (delta) {
              assistantReply += delta;
              writeEvent('chunk', { text: delta });
            }
          } else if (typeof data.content === 'string' && data.content.length > 0) {
            assistantReply += data.content;
            writeEvent('chunk', { text: data.content });
          }
        } catch {
          // Ignore malformed tail payload
        }
      }
    }

    logChat('response', {
      requestId,
      conversation_id: resolvedConversationId,
      query,
      answer: assistantReply
    });
    writeEvent('done', { done: true });
    res.end();
  } catch (error) {
    console.error('Error calling Baidu API:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
