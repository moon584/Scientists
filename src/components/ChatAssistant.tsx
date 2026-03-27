import { useState, useRef, useEffect } from "react";
import RecordRTC from "recordrtc";
import { marked } from "marked"; // 新增导入

// 如果配置了代理，这里可以使用相对路径，或者根据环境判断
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  htmlContent?: string;
}

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "您好！我是科学家知识助手。您可以输入文字或点击麦克风向我提问。",
    },
  ]);
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);

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
    window.speechSynthesis.cancel(); // 停止当前播报

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";

    // 尝试寻找中文男声
    const voices = window.speechSynthesis.getVoices();

    // 优先寻找明确的男声标识，特别是 Edge 的高质量男声
    let targetVoice = voices.find(
      (voice) =>
        voice.lang.includes("zh") &&
        (voice.name.includes("Yunxi") || // Edge 常见高质量男声 (云希)
          voice.name.includes("Yunjian") || // Edge 常见高质量男声 (云健)
          voice.name.includes("Yunze") || // Edge 常见高质量男声 (云泽)
          voice.name.includes("Kangkang") || // Windows 常见男声
          voice.name.toLowerCase().includes("male") ||
          voice.name.includes("男")),
    );

    // 如果没找到明确的男声，则寻找任何不是常见女声的中文声音
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

    // 如果还是没找到，就随便选一个中文声音
    if (!targetVoice) {
      targetVoice = voices.find((voice) => voice.lang.includes("zh"));
    }

    if (targetVoice) {
      utterance.voice = targetVoice;
    }

    // 针对 Edge 的高质量男声，不需要过度降调，否则会失真
    if (
      targetVoice &&
      (targetVoice.name.includes("Yunxi") ||
        targetVoice.name.includes("Yunjian") ||
        targetVoice.name.includes("Yunze"))
    ) {
      utterance.pitch = 1.0; // 保持原声
      utterance.rate = 1.0; // 保持正常语速
    } else {
      // 如果是普通声音，稍微降低音调让其更像男声
      utterance.pitch = 0.8;
      utterance.rate = 0.95;
    }

    window.speechSynthesis.speak(utterance);
  };

  // 确保声音列表加载完成
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    // 组件卸载时清理录音资源
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
        desiredSampRate: 16000, // 百度要求 16000 或 8000
        numberOfAudioChannels: 1, // 百度要求单声道
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

      // 停止麦克风流
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // 发送到后端进行语音识别
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
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMessage.content,
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      // 在 sendMessage 中
      const markdownText = data.answer || "抱歉，我暂时无法回答这个问题。";
      let htmlContent = "";

      try {
        // 将 Markdown 转换为 HTML
        htmlContent = await marked.parse(markdownText);
      } catch (error) {
        console.error("Markdown parse error:", error);
        htmlContent = markdownText; // 转换失败则使用纯文本
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: markdownText, // 纯文本用于语音播报
        htmlContent: htmlContent, // 新增字段用于渲染
      };

      setMessages((prev) => [...prev, assistantMessage]);
      speak(markdownText); // 语音播报仍使用纯文本
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "assistant",
          content: "网络请求失败，请检查后端服务是否启动。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 transition-colors duration-300">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
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
            <h3 className="font-semibold text-lg tracking-wide">
              科学家知识助手
            </h3>
            <p className="text-xs text-red-100 opacity-90 font-light">
              基于百度 AppBuilder 驱动
            </p>
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
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50 dark:bg-gray-900/50 scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {/* 头像 */}
            <div className="flex-shrink-0 mt-0.5">
              {msg.role === "assistant" ? (
                <div className="w-9 h-9 rounded-full bg-white overflow-hidden flex items-center justify-center border border-gray-200 shadow-sm">
                  <img
                    src="/docs/头像/ai-avatar.png"
                    alt="AI"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                      e.currentTarget.parentElement!.innerHTML =
                        '<i class="fas fa-robot text-red-600 text-sm"></i>';
                    }}
                  />
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white shadow-sm">
                  <i className="fas fa-user text-sm"></i>
                </div>
              )}
            </div>

            {/* 消息气泡 */}
            <div
              className={`max-w-[75%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                msg.role === "user"
                  ? "bg-red-600 text-white rounded-2xl rounded-tr-sm"
                  : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm"
              }`}
            >
              {msg.role === "assistant" && msg.htmlContent ? (
                <div
                  className="whitespace-pre-wrap prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: msg.htmlContent }}
                />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-4 flex-row">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-9 h-9 rounded-full bg-white overflow-hidden flex items-center justify-center border border-gray-200 shadow-sm">
                <img
                  src="/docs/头像/ai-avatar.png"
                  alt="AI"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                    e.currentTarget.parentElement!.innerHTML =
                      '<i class="fas fa-robot text-red-600 text-sm"></i>';
                  }}
                />
              </div>
            </div>
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
  );
}
