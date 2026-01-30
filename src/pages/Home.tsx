import React, { useState } from 'react';
import axios from 'axios';
import { VideoInput } from '../components/VideoInput';
import { VideoResult } from '../components/VideoResult';
import { VideoInfo } from '../types/video';
import { AlertTriangle, Youtube } from 'lucide-react';

const Home: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VideoInfo | null>(null);

  const handleSearch = async (url: string, cookies: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Use local API endpoint
      const response = await axios.post('/api/video/extract', { url, cookies });
      setData(response.data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.code === 'VERIFICATION_REQUIRED') {
          setError("YouTube 需要真人验证。这通常发生在自动化请求被拦截时。既然您已手动验证通过，请确保复制已通过验证的浏览器会话中的最新 Cookies 并粘贴到下方。");
      } else {
          setError(err.response?.data?.error || '提取视频信息失败，请检查链接并重试。');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans text-gray-900">
      <div className="text-center mb-10 space-y-2">
        <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full text-red-600">
                <Youtube size={48} />
            </div>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block xl:inline">YouTube</span>{' '}
          <span className="block text-blue-600 xl:inline">数据提取器</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          一键提取任何 YouTube 视频的元数据、统计信息和纯净字幕。
        </p>
      </div>

      <VideoInput onSearch={handleSearch} loading={loading} />

      {error && (
        <div className="max-w-2xl mx-auto mt-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3 text-red-700 animate-fade-in">
            <AlertTriangle className="shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
        </div>
      )}

      {data && <VideoResult data={data} />}
    </div>
  );
};

export default Home;
