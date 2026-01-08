'use client';

import { Button, UI_VERSION } from '@hamhome/ui';
import { TYPES_VERSION } from '@hamhome/types';
import { UTILS_VERSION, normalizeUrl, formatRelativeTime } from '@hamhome/utils';

export default function HomePage() {
  // 验证模块引用
  console.log('[Web] 引用 @hamhome/ui 成功, 版本:', UI_VERSION);
  console.log('[Web] 引用 @hamhome/types 成功, 版本:', TYPES_VERSION);
  console.log('[Web] 引用 @hamhome/utils 成功, 版本:', UTILS_VERSION);

  // 测试工具函数
  const testUrl = normalizeUrl('https://example.com/page?utm_source=test');
  const testTime = formatRelativeTime(Date.now() - 3600000);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold">🐹 HamHome Web</h1>
        <p className="text-muted-foreground text-lg">
          智能书签管理工具 - Web 管理端
        </p>
        
        <div className="p-6 bg-secondary rounded-lg space-y-4 max-w-md text-left">
          <h2 className="font-semibold text-lg">模块引用验证</h2>
          <ul className="space-y-2 text-sm">
            <li>✅ @hamhome/ui: v{UI_VERSION}</li>
            <li>✅ @hamhome/types: v{TYPES_VERSION}</li>
            <li>✅ @hamhome/utils: v{UTILS_VERSION}</li>
          </ul>
          
          <h2 className="font-semibold text-lg mt-4">工具函数测试</h2>
          <ul className="space-y-2 text-sm">
            <li>normalizeUrl: {testUrl}</li>
            <li>formatRelativeTime: {testTime}</li>
          </ul>
        </div>

        <div className="flex gap-4 justify-center">
          <Button onClick={() => console.log('[Web] Button clicked!')}>
            测试按钮
          </Button>
          <Button variant="outline" onClick={() => alert('HamHome Web 运行正常!')}>
            验证运行
          </Button>
        </div>
      </div>
    </main>
  );
}

