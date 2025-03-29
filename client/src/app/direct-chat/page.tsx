"use client";

import { useState, useRef, useEffect } from 'react';
import { getUser } from '@/lib/api';
import { sendMessage } from '@/lib/ai-api';
import { Button } from '@/components/ui/button';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OllamaStatus {
  isRunning: boolean;
  error: string | null;
  host: string;
  model: string;
}

interface FixResults {
  success: boolean;
  message: string;
}

export default function DirectChatPage() {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>({ 
    isRunning: false, 
    error: null, 
    host: 'unknown',
    model: 'unknown'
  });
  const [fixResults, setFixResults] = useState<FixResults | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch user information on mount
  useEffect(() => {
    async function loadUser() {
      try {
        const userData = await getUser();
        setUser(userData);
      } catch (error) {
        console.error('Error loading user:', error);
      }
    }
    
    loadUser();
  }, []);

  // Check Ollama status on mount
  useEffect(() => {
    checkOllamaStatus();
  }, []);

  // Scroll to bottom of chat on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Function to check Ollama status
  async function checkOllamaStatus() {
    try {
      const response = await fetch('http://localhost:5002/test-ollama');
      const data = await response.json();
      
      setOllamaStatus({
        isRunning: data.success,
        error: data.error || null,
        host: data.host || 'unknown',
        model: data.model || 'unknown'
      });
    } catch (error: any) {
      setOllamaStatus({
        isRunning: false,
        error: error.message,
        host: 'unknown',
        model: 'unknown'
      });
    }
  }

  // Function to try fixing Ollama issues
  async function tryFixOllamaIssues() {
    try {
      // Clear any stored service status data
      localStorage.removeItem('serviceStatus');
      localStorage.removeItem('ollama-status');
      localStorage.removeItem('tensorflow-status');
      
      // Re-check status
      await checkOllamaStatus();
      
      setFixResults({
        success: true,
        message: 'Client-side status data cleared. Status has been refreshed.'
      });
    } catch (error: any) {
      setFixResults({
        success: false,
        message: `Error: ${error.message}`
      });
    }
  }

  // Function to handle sending a message
  async function handleSendMessage() {
    if (!inputValue.trim() || isLoading) return;
    
    // Add user message to the chat
    const userMessage: Message = {
      role: 'user',
      content: inputValue
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // Add a temporary loading message
    const loadingMessage: Message = {
      role: 'assistant',
      content: '...'
    };
    setMessages(prev => [...prev, loadingMessage]);
    
    try {
      // Call the sendMessage function with direct options
      const response = await sendMessage(
        userMessage.content, 
        user?.id || 'direct-user',
        undefined, 
        { 
          debug: true, 
          forceOllama: true,
          preventFallback: true
        }
      );
      
      // Remove the loading message and add the real response
      setMessages(prev => {
        const withoutLoading = prev.slice(0, prev.length - 1);
        return [
          ...withoutLoading,
          {
            role: 'assistant',
            content: response
          }
        ];
      });
    } catch (error: any) {
      // Remove the loading message and add the error message
      setMessages(prev => {
        const withoutLoading = prev.slice(0, prev.length - 1);
        return [
          ...withoutLoading,
          {
            role: 'assistant',
            content: `Error: ${error.message}`
          }
        ];
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Direct Chat - No Fallbacks</h1>
      <p className="mb-6 text-slate-600">
        This page communicates directly with Ollama and doesn't use fallback mechanisms.
        If Ollama is running, you'll get real responses. If not, you'll see errors.
      </p>
      
      {/* Ollama Status Panel */}
      <div className="bg-slate-100 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-2">Ollama Status</h2>
        <div className="flex items-center mb-1">
          <div className={`w-3 h-3 rounded-full mr-2 ${ollamaStatus.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span>{ollamaStatus.isRunning ? 'Available' : 'Unavailable'}</span>
        </div>
        {ollamaStatus.error && (
          <p className="text-red-500 text-sm">Error: {ollamaStatus.error}</p>
        )}
        <p className="text-sm mt-1">Host: {ollamaStatus.host}</p>
        <p className="text-sm">Model: {ollamaStatus.model}</p>
        
        <div className="mt-4 flex space-x-2">
          <Button variant="outline" size="sm" onClick={checkOllamaStatus}>
            Check Status
          </Button>
          <Button variant="outline" size="sm" onClick={tryFixOllamaIssues}>
            Reset Client Settings
          </Button>
        </div>
        
        {fixResults && (
          <div className={`mt-2 p-2 text-sm rounded ${fixResults.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {fixResults.message}
          </div>
        )}
      </div>
      
      {/* Chat Area */}
      <div className="border rounded-lg h-[60vh] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div 
              key={index}
              className={`p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-100 ml-12' 
                  : 'bg-gray-100 mr-12'
              }`}
            >
              <p className="text-sm font-semibold mb-1">
                {message.role === 'user' ? 'You' : 'AI Assistant'}
              </p>
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t">
          <div className="flex">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type your message..."
              className="flex-1 border rounded-l-lg p-2"
              disabled={isLoading}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={isLoading || !inputValue.trim()}
              className="rounded-l-none"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-slate-500">
        <p>
          This chat interface communicates directly with Ollama on port 5002 with no fallbacks.
          Your messages are not stored permanently.
        </p>
      </div>
    </div>
  );
} 