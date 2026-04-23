import { useState, useRef, useEffect } from "react";
import RecordRTC from "recordrtc";
import { marked } from "marked";
import { useAuth } from "@/contexts/authContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

marked.setOptions({
  gfm: true,
  breaks: true,
});

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  htmlContent?: string;
}

interface StreamEventPayload {
  text?: string;
  conversation_id?: string;
  error?: string;
}

const renderMarkdownToHtml = (content: string) => {
  const normalizedContent = content
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .trim();

  try {
    const parsed = marked.parse(normalizedContent);
    return typeof parsed === "string"
      ? parsed
      : normalizedContent.replace(/\n/g, "<br />");
  } catch (error) {
    console.error("Markdown parse error:", error);
    return normalizedContent.replace(/\n/g, "<br />");
  }
};

interface ChatSession {
  id: number;
  baidu_conversation_id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}

const CACHE_KEY = 'chat_cache';

interface ChatCache {
  messages: Message[];
  conversationId: string | null;
  sessionId: number | null;
  timestamp: number;
}

const WELCOME_MESSAGE: Message = {
  id: "1",
  role: "assistant",
  content:
    "你好呀，我是愿意和你掏心窝子的中国科学家问答助手。想不想知道课本里的‘科学大家’，在光环背后经历过怎样的历练和挣扎？如果你正为生活里的难题焦虑，或是好奇‘科学家精神’到底是什么——不管是想读懂‘严谨、拼搏、创新’的真实含义，还是想找个‘过来人’聊聊如何在迷茫里坚持，都可以和我说。我会用最接地气的话，陪你感受科学里的温度与力量。你可以输入文字或点击麦克风向我提问。",
};

/** 从 localStorage 恢复上次对话缓存 */
function restoreCache(): ChatCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as ChatCache;
    // 超过 1 小时的缓存不恢复
    if (Date.now() - cache.timestamp > 3600000) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cache;
  } catch {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

/** 保存对话到 localStorage */
function saveCache(messages: Message[], conversationId: string | null, sessionId: number | null) {
  try {
    const cache: ChatCache = { messages, conversationId, sessionId, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* localStorage 满时静默失败 */ }
}

/** 清除缓存 */
function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

/** 格式化会话标题：取前15个有效字符 + MM/DD */
function formatSessionTitle(title: string, updatedAt: string): string {
  const cleaned = title.replace(/^[^\w\d一-鿿]+/g, '');
  const truncated = cleaned.length > 15 ? cleaned.slice(0, 15) + '...' : cleaned;
  const date = updatedAt ? new Date(updatedAt) : new Date();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${truncated} ${month}/${day}`;
}

export default function ChatAssistant() {
  const { token, isAuthenticated } = useAuth();

  // 从 localStorage 恢复上次的对话（先于网络请求，实现无缝跳转）
  const [initialState] = useState(() => {
    const cached = restoreCache();
    if (cached && cached.messages.length > 0) {
      return cached;
    }
    return null;
  });

  const [messages, setMessages] = useState<Message[]>(
    initialState?.messages ?? [WELCOME_MESSAGE]
  );
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    initialState?.conversationId ?? null
  );
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(
    initialState?.sessionId ?? null
  );
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);

  // 自动保存对话到 localStorage（跳转页面后恢复）
  useEffect(() => {
    if (messages.length > 1 || messages[0]?.id !== "1") {
      saveCache(messages, conversationId, currentSessionId);
    }
  }, [messages, conversationId, currentSessionId]);

  // 登录后自动展开侧栏并加载会话列表
  useEffect(() => {
    if (isAuthenticated && token) {
      setSidebarOpen(true);
      fetch(`${API_BASE_URL}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const list = data.sessions || [];
          setSessions(list);
          // 尝试从缓存恢复上次的会话 ID
          const savedId = sessionStorage.getItem('chat_session_id');
          if (savedId && list.some((s: ChatSession) => s.id === Number(savedId))) {
            loadSessionMessages(Number(savedId));
            sessionStorage.removeItem('chat_session_id');
          }
        })
        .catch(console.error);
    } else {
      setSessions([]);
      setCurrentSessionId(null);
      setSidebarOpen(false);
    }
  }, [isAuthenticated, token]);

  // 加载指定会话的消息
  const loadSessionMessages = async (sessionId: number) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const loadedMessages: Message[] = data.messages.map((m: any) => ({
        id: `s${m.id}`,
        role: m.role,
        content: m.content,
        htmlContent: m.role === "assistant" ? renderMarkdownToHtml(m.content) : undefined,
      }));
      setMessages(loadedMessages.length > 0 ? loadedMessages : [WELCOME_MESSAGE]);
      setCurrentSessionId(sessionId);
      setConversationId(data.session?.baidu_conversation_id || null);
      clearCache(); // 切到旧会话时清掉缓存，新消息会重新缓存
    } catch (err) {
      console.error("加载会话失败:", err);
    }
  };

  const startNewChat = () => {
    setMessages([WELCOME_MESSAGE]);
    setConversationId(null);
    setCurrentSessionId(null);
    clearCache();
    sessionStorage.removeItem('chat_session_id');
  };

  // 自动调整输入框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // 语音播报
  const speak = (text: string) => {
    if (!window.speechSynthesis || isMuted) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";

    const voices = window.speechSynthesis.getVoices();

    let targetVoice = voices.find(
      (voice) =>
        voice.lang.includes("zh") &&
        (voice.name.includes("Yunxi") ||
          voice.name.includes("Yunjian") ||
          voice.name.includes("Yunze") ||
          voice.name.includes("Kangkang") ||
          voice.name.toLowerCase().includes("male") ||
          voice.name.includes("男")),
    );

    if (!targetVoice) {
      targetVoice = voices.find(
        (voice) =>
          voice.lang.includes("zh") &&
          !voice.name.includes("Huihui") &&
          !voice.name.includes("Yaoyao") &&
          !voice.name.includes("Xiaoxiao") &&
          !voice.name.includes("Tingting") &&
          !voice.name.toLowerCase().includes("female") &&
          !voice.name.includes("女"),
      );
    }

    if (!targetVoice) {
      targetVoice = voices.find((voice) => voice.lang.includes("zh"));
    }

    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    if (
      targetVoice &&
      (targetVoice.name.includes("Yunxi") ||
        targetVoice.name.includes("Yunjian") ||
        targetVoice.name.includes("Yunze"))
    ) {
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
    } else {
      utterance.pitch = 0.8;
      utterance.rate = 0.95;
    }

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recorderRef.current) {
        recorderRef.current.destroy();
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new RecordRTC(stream, {
        type: "audio",
        mimeType: "audio/wav",
        recorderType: RecordRTC.StereoAudioRecorder,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
      });

      recorder.startRecording();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("无法访问麦克风，请确保已授予权限。");
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) return;

    setIsRecording(false);
    setIsTranscribing(true);

    recorderRef.current.stopRecording(async () => {
      const blob = recorderRef.current!.getBlob();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const formData = new FormData();
      formData.append("audio", blob, "recording.wav");

      try {
        const response = await fetch(`${API_BASE_URL}/api/speech-to-text`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Speech to text failed");
        }

        const data = await response.json();
        if (data.text) {
          setInput((prev) => prev + (prev ? " " : "") + data.text);
        }
      } catch (error) {
        console.error("Transcription error:", error);
        alert("语音识别失败，请重试。");
      } finally {
        setIsTranscribing(false);
        recorderRef.current!.destroy();
        recorderRef.current = null;
      }
    });
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const assistantMessageId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          query: userMessage.content,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      if (!response.body) {
        throw new Error("Response body is empty");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let streamBuffer = "";
      let eventType = "message";
      let eventDataLines: string[] = [];
      let assistantContent = "";
      let streamEnded = false;

      const appendAssistantText = (text: string) => {
        if (!text) return;
        assistantContent += text;
        const htmlContent = renderMarkdownToHtml(assistantContent);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: assistantContent, htmlContent }
              : msg,
          ),
        );
      };

      const processEvent = (type: string, rawData: string) => {
        if (!rawData) return;

        let payload: StreamEventPayload | null = null;
        try {
          payload = JSON.parse(rawData) as StreamEventPayload;
        } catch {
          return;
        }

        if (type === "meta" && payload.conversation_id) {
          setConversationId(payload.conversation_id);
          return;
        }

        if (type === "chunk" && payload.text) {
          appendAssistantText(payload.text);
          return;
        }

        if (type === "error") {
          throw new Error(payload.error || "流式响应失败");
        }

        if (type === "done") {
          streamEnded = true;
        }
      };

      const flushSSELine = (line: string) => {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim() || "message";
          return;
        }

        if (line.startsWith("data:")) {
          eventDataLines.push(line.slice(5).trim());
          return;
        }

        if (line === "") {
          const rawData = eventDataLines.join("\n");
          if (rawData) {
            processEvent(eventType, rawData);
          }
          eventType = "message";
          eventDataLines = [];
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.replace(/\r\n/g, "\n").split("\n");
        streamBuffer = lines.pop() || "";

        for (const line of lines) {
          flushSSELine(line);
        }
      }

      if (streamBuffer) {
        flushSSELine(streamBuffer);
      }
      flushSSELine("");

      if (!assistantContent && streamEnded) {
        assistantContent = "抱歉，我暂时无法回答这个问题。";
      }

      const htmlContent = renderMarkdownToHtml(assistantContent);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, content: assistantContent, htmlContent }
            : msg,
        ),
      );
      speak(assistantContent);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev.filter(
          (msg) =>
            !(
              msg.role === "assistant" &&
              msg.content === "" &&
              msg.htmlContent === undefined
            ),
        ),
        {
          id: `${Date.now()}-error`,
          role: "assistant",
          content: "网络请求失败，请检查后端服务是否启动。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (e: React.MouseEvent, sessionId: number) => {
    e.stopPropagation();
    if (!token) return;
    if (!confirm('确定删除此对话？删除后不可恢复。')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (currentSessionId === sessionId) startNewChat();
      }
    } catch { /* ignore */ }
  };

  // 预设问题点击处理
  const handlePresetQuestion = (question: string) => {
    setInput(question);
    setTimeout(() => sendMessage(), 0);
  };

  return (
    <div className="relative flex h-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors duration-300">
      {isAuthenticated && (
        <>
          {/* 移动端遮罩 */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-30 bg-black/30 sm:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* 左侧栏 */}
          <div className={`absolute inset-y-0 left-0 z-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 overflow-hidden ${sidebarOpen ? 'w-[260px]' : 'w-0'}`}>
            {/* 侧栏头部 */}
            <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 flex-shrink-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">历史记录</span>
              <div className="flex items-center gap-1">
                <button onClick={startNewChat} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="新对话">
                  <i className="fas fa-plus text-xs"></i>
                </button>
                <button onClick={() => setSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500" title="收起侧栏">
                  <i className="fas fa-chevron-left text-xs"></i>
                </button>
              </div>
            </div>

            {/* 会话列表 */}
            <div className="flex-1 overflow-y-auto">
              {sessions.length === 0 ? (
                <p className="p-4 text-center text-sm text-gray-400">暂无历史对话</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-1 px-3 py-2.5 text-sm border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${currentSessionId === s.id ? 'bg-red-50 dark:bg-red-900/10 border-l-2 border-l-red-500' : ''}`}
                    onClick={() => {
                      loadSessionMessages(s.id);
                      if (window.innerWidth < 640) setSidebarOpen(false);
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{formatSessionTitle(s.title, s.updated_at)}</p>
                    </div>
                    <button onClick={(e) => deleteSession(e, s.id)} className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="删除此对话">
                      <i className="fas fa-trash-can text-xs"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {/* 主内容区域 */}
      <div className={`flex flex-col flex-1 transition-all duration-300 ${sidebarOpen ? 'sm:ml-[260px]' : 'ml-0'}`}>
        {/* 头部 */}
        <div className="relative bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors" title={sidebarOpen ? '收起侧栏' : '展开侧栏'}>
                <i className={`fas ${sidebarOpen ? 'fa-xmark' : 'fa-bars'} text-sm`}></i>
              </button>
            )}
          <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex items-center justify-center border-2 border-red-200/50 shadow-inner">
            <img
              src="/docs/头像/ai-avatar.png"
              alt="AI 助手"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                e.currentTarget.parentElement!.innerHTML =
                  '<i class="fas fa-robot text-red-600 text-xl"></i>';
              }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg tracking-wide">科学家知识助手</h3>
            </div>
            <p className="text-xs text-red-100 opacity-90 font-light">智汇科迹团队</p>
          </div>
        </div>
        <button
          onClick={() => {
            if (isMuted) {
              setIsMuted(false);
            } else {
              setIsMuted(true);
              window.speechSynthesis?.cancel();
            }
          }}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all backdrop-blur-sm ${
            isMuted
              ? "bg-red-500/50 text-red-100 hover:bg-red-500/70"
              : "bg-white/10 text-white hover:bg-white/20"
          }`}
          title={isMuted ? "开启语音播报" : "静音"}
        >
          <i
            className={`fas ${isMuted ? "fa-volume-mute" : "fa-volume-up"} text-sm`}
          ></i>
        </button>
      </div>


      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 space-y-6 bg-gray-50/50 dark:bg-gray-900/50 scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {/* 消息气泡 - 最大化宽度 */}
            <div
              className={`max-w-[100%] min-w-0 px-5 py-3.5 text-[15px] leading-relaxed shadow-sm break-words overflow-x-hidden ${
                msg.role === "user"
                  ? "bg-red-600 text-white rounded-2xl rounded-tr-sm"
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm"
              }`}
            >
              {msg.role === "assistant" ? (
                <div
                  className="whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert overflow-x-hidden [&_*]:break-words [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:overflow-x-auto"
                  dangerouslySetInnerHTML={{
                    __html: msg.htmlContent || renderMarkdownToHtml(msg.content),
                  }}
                />
              ) : (
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* 预设问题 - 仅在初始状态显示 */}
        {messages.length === 1 && (
          <div className="mt-2 space-y-2">
            <button
              onClick={() =>
                handlePresetQuestion(
                  "我数学/物理总是学不好，是不是我就不是“这块料”？",
                )
              }
              className="block w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
            >
              我数学/物理总是学不好，是不是我就不是“这块料”？
            </button>
            <button
              onClick={() =>
                handlePresetQuestion(
                  "我不知道以后要做什么，也不知道学这些有什么用，为什么要努力？",
                )
              }
              className="block w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
            >
              我不知道以后要做什么，也不知道学这些有什么用，为什么要努力？
            </button>
            <button
              onClick={() =>
                handlePresetQuestion(
                  "我成绩中游，不出彩，保研没希望，找工作也没方向，感觉被“卡”住了，怎么办？",
                )
              }
              className="block w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
            >
              我成绩中游，不出彩，保研没希望，找工作也没方向，感觉被“卡”住了，怎么办？
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm flex gap-1.5 items-center h-[50px]">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div
                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
              <div
                className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: "0.4s" }}
              ></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      {/* 输入区域 */}
      <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800 z-10">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <button
            onClick={toggleRecording}
            disabled={isTranscribing}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
              isRecording
                ? "bg-red-100 text-red-600 animate-pulse ring-4 ring-red-50"
                : isTranscribing
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-gray-600"
            }`}
            title={
              isRecording
                ? "停止录音"
                : isTranscribing
                  ? "正在识别..."
                  : "开始语音输入"
            }
          >
            {isTranscribing ? (
              <i className="fas fa-spinner fa-spin"></i>
            ) : (
              <i
                className={`fas ${isRecording ? "fa-microphone-slash" : "fa-microphone"}`}
              ></i>
            )}
          </button>

          <div className="flex-1 relative bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100 dark:focus-within:ring-red-900/30 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={
                isRecording
                  ? "正在聆听，请说话..."
                  : isTranscribing
                    ? "正在识别语音..."
                    : "输入您的问题，或点击左侧麦克风说话..."
              }
              className="w-full max-h-32 min-h-[44px] py-3 px-4 bg-transparent border-none focus:outline-none resize-none text-gray-800 dark:text-gray-200 text-[15px]"
              rows={1}
              disabled={isRecording || isTranscribing}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={
              !input.trim() || isLoading || isRecording || isTranscribing
            }
            className="w-11 h-11 bg-red-600 text-white rounded-full flex items-center justify-center flex-shrink-0 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <i className="fas fa-paper-plane ml-[-2px]"></i>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}
