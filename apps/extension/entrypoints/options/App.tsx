/**
 * Options 页面 - 设置入口
 */
import { useState } from 'react';
import { cn } from '@hamhome/ui';
import { Bot, Settings, Database } from 'lucide-react';
import { AIConfigTab } from '@/components/Settings/AIConfigTab';
import { GeneralSettingsTab } from '@/components/Settings/GeneralSettingsTab';
import { StorageManagementTab } from '@/components/Settings/StorageManagementTab';

type TabType = 'ai' | 'general' | 'storage';

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'ai', label: 'AI 配置', icon: <Bot className="h-4 w-4" /> },
  { id: 'general', label: '通用设置', icon: <Settings className="h-4 w-4" /> },
  { id: 'storage', label: '存储管理', icon: <Database className="h-4 w-4" /> },
];

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('ai');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto py-8 px-4">
        {/* 页面标题 */}
        <header className="flex items-center gap-3 mb-8">
          <span className="text-3xl">🐹</span>
          <div>
            <h1 className="text-2xl font-bold">HamHome 设置</h1>
            <p className="text-muted-foreground text-sm">
              配置你的智能书签助手
            </p>
          </div>
        </header>

        {/* 标签页导航 */}
        <nav className="flex gap-1 mb-6 border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors text-sm',
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* 标签页内容 */}
        <div className="pb-8">
          {activeTab === 'ai' && <AIConfigTab />}
          {activeTab === 'general' && <GeneralSettingsTab />}
          {activeTab === 'storage' && <StorageManagementTab />}
        </div>
      </div>
    </div>
  );
}

