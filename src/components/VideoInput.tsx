import React, { useState } from 'react';
import { Search, Cookie } from 'lucide-react';

interface VideoInputProps {
  onSearch: (url: string, cookies: string) => void;
  loading: boolean;
}

export const VideoInput: React.FC<VideoInputProps> = ({ onSearch, loading }) => {
  const [url, setUrl] = useState('');
  const [cookies, setCookies] = useState('');
  const [showCookies, setShowCookies] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSearch(url, cookies);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="输入 YouTube 视频链接..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 font-medium transition-colors"
          >
            {loading ? '处理中...' : <><Search size={20} /> 开始分析</>}
          </button>
        </div>
        
        <div className="flex flex-col gap-2">
            <button
                type="button"
                onClick={() => setShowCookies(!showCookies)}
                className="text-sm text-gray-600 flex items-center gap-1 hover:text-blue-600 w-fit transition-colors"
            >
                <Cookie size={16} /> 
                {showCookies ? '隐藏自定义 Cookies' : '添加自定义 Cookies (Netscape 格式)'}
            </button>
            
            {showCookies && (
                <div className="space-y-1">
                    <p className="text-xs text-gray-500">
                        如果 YouTube 拦截了请求（例如年龄验证或机器人检查），请使用浏览器插件（如 'Get cookies.txt LOCALLY'）导出 Cookies 并粘贴到此处。
                    </p>
                    <textarea
                        value={cookies}
                        onChange={(e) => setCookies(e.target.value)}
                        placeholder="# Netscape HTTP Cookie File&#10;.youtube.com	TRUE	/	FALSE	1761678950	VISITOR_INFO1_LIVE	..."
                        className="w-full h-32 p-3 text-xs font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                    />
                </div>
            )}
        </div>
      </form>
    </div>
  );
};
