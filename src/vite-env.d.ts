/// <reference types="vite/client" />

interface Window {
  difyChatbotConfig: {
    token: string;
    baseUrl: string;
    inputs?: Record<string, any>;
    systemVariables?: Record<string, any>;
    userVariables?: Record<string, any>;
  };
}
