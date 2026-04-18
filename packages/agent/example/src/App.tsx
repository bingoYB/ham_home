import { useState, useRef, useEffect, useCallback } from 'react';
import { Agent, ToolRegistry, SkillLoader, MCPRegistry, ChatMemory, IndexedDBStorage, createAgentModel, PROVIDER_REGISTRY, type ProviderName } from 'ai-sdk-demo';
import { z } from 'zod';
import './App.css';

// Mock process to prevent ai-sdk crashing in vite browser environment if it expects it
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { env: {} };
}

interface MessageData {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  text?: string;
  toolCalls?: any[];
  toolResults?: any[];
}

const providerEntries = Object.entries(PROVIDER_REGISTRY) as [ProviderName, (typeof PROVIDER_REGISTRY)[ProviderName]][];

function App() {
  const [provider, setProvider] = useState<ProviderName>(() => (localStorage.getItem('agent-provider') as ProviderName) || 'openai');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('agent-api-key') || '');
  const [baseURL, setBaseURL] = useState(() => localStorage.getItem('agent-base-url') || PROVIDER_REGISTRY.openai.defaultBaseURL || '');
  const [model, setModel] = useState(() => localStorage.getItem('agent-model') || 'gpt-4o');
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const handleProviderChange = useCallback((newProvider: ProviderName) => {
    setProvider(newProvider);
    const meta = PROVIDER_REGISTRY[newProvider];
    setBaseURL(meta.defaultBaseURL || '');
    setModel(meta.defaultModel);
    localStorage.setItem('agent-provider', newProvider);
  }, []);

  const [useTools, setUseTools] = useState(false);
  const [useSkills, setUseSkills] = useState(false);
  const [useMCP, setUseMCP] = useState(false);
  const [useRAG, setUseRAG] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<Agent | null>(null);

  // Initialize Agent
  const currentMeta = PROVIDER_REGISTRY[provider];

  useEffect(() => {
    if (currentMeta.requiresApiKey && !apiKey) return;
    
    let isMounted = true;
    
    const initAgent = async () => {
      // Tools Preset
      const toolRegistry = new ToolRegistry();
      if (useTools) {
        toolRegistry.registerTool('getWeather', {
          description: 'Get the weather in a specific location',
          inputSchema: z.object({
            location: z.string().describe('The user location'),
          }),
          execute: async (input: { location: string }) => {
            return `The weather in ${input.location} is sunny and 24°C.`;
          },
        } as any);
      }

      // Skills Preset
      const skillLoader = new SkillLoader();
      if (useSkills) {
        skillLoader.addSkills([
          {
            name: 'code_reviewer',
            desc: 'Provides tips for code reviews',
            loader: async () => 'When reviewing code, always enforce strict typing and check for memory leaks.'
          },
          {
            name: 'zorbian_transformation',
            desc: 'Transforms numbers using strict Zorbian Logic',
            loader: async () => {
              try {
                const response = await fetch('/test-skill.md');
                if (response.ok) {
                  return await response.text();
                }
              } catch (e) {
                console.error('Failed to load test-skill.md', e);
              }
              return 'Failed to load Zorbian skill rules.';
            }
          }
        ]);
      }

      // MCP Preset
      const mcpRegistry = new MCPRegistry();
      // Assuming MCP setup later when valid transport available in the browser

      // RAG Preset (mock system prompt override)
      let systemPromptBase = 'You are a helpful AI assistant running purely in the browser. You support markdown and logical thinking.';
      if (useRAG) {
        systemPromptBase += '\n\n[RAG CONTEXT]: You have access to a custom company handbook document stating that the company holiday is on Oct 1st.';
      }

      // Memory Session ID can be configurable, hardcoded for demo
      const memory = await ChatMemory.create({
        sessionId: 'react-demo-session',
        maxMessages: 10,
        storage: new IndexedDBStorage(),
        model: createAgentModel({ provider, model, apiKey, baseURL: baseURL || undefined }),
      });
      
      if (!isMounted) return;

      agentRef.current = new Agent({
        name: 'Frontend Demo Agent',
        provider: provider,
        model: model,
        apiKey: apiKey,
        baseURL: baseURL || undefined,
        systemPrompt: systemPromptBase,
        tools: toolRegistry,
        skills: skillLoader,
        mcp: mcpRegistry,
        memory: memory
      });
      
      // Load UI state from persistent memory
      const pastMessages = await memory.getMessages();
      const uiMessages = pastMessages
        .filter(m => m.role !== 'system')
        .map(m => {
          let text = '';
          let toolCalls: any[] = [];
          if (typeof m.content === 'string') {
            text = m.content;
          } else if (Array.isArray(m.content)) {
            const textPart = m.content.find((p: any) => p.type === 'text') as any;
            if (textPart) text = textPart.text;
            toolCalls = m.content.filter((p: any) => p.type === 'tool-call');
          }
          return {
            id: Date.now().toString() + Math.random().toString(),
            role: m.role as any,
            text,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined
          };
        });
        
      if (uiMessages.length > 0) {
        setMessages(uiMessages);
      }
      
      localStorage.setItem('agent-api-key', apiKey);
      localStorage.setItem('agent-base-url', baseURL);
      localStorage.setItem('agent-model', model);
      localStorage.setItem('agent-provider', provider);
    };

    initAgent();
    
    return () => { isMounted = false; };
  }, [provider, apiKey, baseURL, model, useTools, useSkills, useMCP, useRAG]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTestConnection = async () => {
    if (!agentRef.current || isTestingConnection || isLoading) return;
    setIsTestingConnection(true);
    setIsLoading(true);
    
    const testMessageId = Date.now().toString();
    const systemMessage: MessageData = {
      id: testMessageId,
      role: 'system',
      text: 'Testing connection...'
    };
    
    setMessages(prev => [...prev, systemMessage]);

    try {
      const result = await agentRef.current.run('Reply with exactly "Connection successful!"');
      const responseMessage: MessageData = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        text: `Test successful: ${result.text}`
      };
      setMessages(prev => [...prev, responseMessage]);
    } catch (error: any) {
      const errorMessage: MessageData = {
        id: (Date.now() + 1).toString(),
        role: 'system',
        text: `Test failed: ${error.message || 'Unknown error'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTestingConnection(false);
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !agentRef.current || isLoading) return;

    const userMessage: MessageData = { 
      id: Date.now().toString(), 
      role: 'user', 
      text: input.trim() 
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // We only need to pass the new user message
      // agentRef handles its internal memory, persisting the history
      const result = await agentRef.current.run(userMessage.text || '');
      
      const assistantMessage: MessageData = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: result.text || '',
        toolCalls: result.toolCalls
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error(error);
      const errorMessage: MessageData = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: `**Error:** ${error.message || 'Unknown error occurred'}`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (agentRef.current) {
      await agentRef.current.clearMemory();
    }
    setMessages([]);
  };

  return (
    <div className="layout-container">
      <div className="sidebar">
        <h2 className="sidebar-title">Agent Settings</h2>
        
        <div 
          className={`feature-card ${useTools ? 'active' : ''}`}
          onClick={() => setUseTools(!useTools)}
        >
          <div className="feature-header">
            <span className="feature-icon">🔧</span>
            <h3>Tools</h3>
          </div>
          <p>Registers preset weather checking tool.</p>
        </div>

        <div 
          className={`feature-card ${useSkills ? 'active' : ''}`}
          onClick={() => setUseSkills(!useSkills)}
        >
          <div className="feature-header">
            <span className="feature-icon">🧠</span>
            <h3>Skills</h3>
          </div>
          <p>Injects code reviewer and Zorbian test skills.</p>
        </div>

        <div 
          className={`feature-card ${useMCP ? 'active' : ''}`}
          onClick={() => setUseMCP(!useMCP)}
        >
          <div className="feature-header">
            <span className="feature-icon">🔌</span>
            <h3>MCP</h3>
          </div>
          <p>Attaches an MCP Registry instance.</p>
        </div>

        <div 
          className={`feature-card ${useRAG ? 'active' : ''}`}
          onClick={() => setUseRAG(!useRAG)}
        >
          <div className="feature-header">
            <span className="feature-icon">📚</span>
            <h3>RAG</h3>
          </div>
          <p>Injects test knowledge retrieval context.</p>
        </div>
      </div>

      <div className="app-container">
        <header className="header">
          <h1>Agent Frontend</h1>
          <p>Pure React Interface using AI SDK Demo</p>
        </header>

        <div className="chat-container">
          <div className="config-bar">
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value as ProviderName)}
              className="provider-select"
            >
              {providerEntries.map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
            <input 
              type="password" 
              placeholder={`API Key${currentMeta.requiresApiKey ? ' (必填)' : ' (可选)'}`}
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)} 
            />
            <input 
              type="text" 
              placeholder={currentMeta.requiresBaseURL ? 'Base URL (必填)' : `Base URL (默认: ${currentMeta.defaultBaseURL || '无'})`}
              value={baseURL} 
              onChange={(e) => setBaseURL(e.target.value)} 
            />
            <input 
              type="text" 
              placeholder={`Model (默认: ${currentMeta.defaultModel})`}
              value={model} 
              onChange={(e) => setModel(e.target.value)} 
            />
            <button 
              className="test-btn"
              onClick={handleTestConnection}
              disabled={(currentMeta.requiresApiKey && !apiKey) || isTestingConnection || isLoading}
            >
              {isTestingConnection ? 'Testing...' : 'Test'}
            </button>
            <button
              className="clear-btn"
              onClick={handleClearHistory}
              disabled={isLoading || messages.length === 0}
            >
              Clear
            </button>
          </div>

          <div className="messages">
          {messages.length === 0 && (
            <div className="message assistant" style={{ opacity: 0.8, alignSelf: 'center', background: 'transparent' }}>
              Welcome! Configure your API key above to start talking with the Agent.
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <span className="message-type-indicator">{msg.role}</span>
              <div>{msg.text}</div>
              
              {/* Render Tool Calls if any */}
              {msg.toolCalls?.map((tc: any, i) => (
                <div key={i} className="tool-call">
                  🔧 Tool Call: {tc.toolName} ({JSON.stringify(tc.input)})
                </div>
              ))}
            </div>
          ))}
          {isLoading && (
            <div className="message assistant loading-layer">
              <span className="message-type-indicator">assistant</span>
              <div className="loading-dots">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-area" onSubmit={handleSubmit}>
          <input 
            type="text" 
            placeholder="Message the agent..." 
            value={input} 
            onChange={(e) => setInput(e.target.value)}
            disabled={(currentMeta.requiresApiKey && !apiKey) || isLoading}
          />
          <button type="submit" disabled={(currentMeta.requiresApiKey && !apiKey) || isLoading || !input.trim()}>
            Send Message
          </button>
        </form>
      </div>
    </div>
    </div>
  );
}

export default App;
