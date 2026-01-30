import React from 'react';
import { VideoInfo } from '../types/video';
import { ThumbsUp, MessageCircle, Eye, User, Calendar, Download, Music, Copy, Check } from 'lucide-react';

interface VideoResultProps {
  data: VideoInfo;
}

export const VideoResult: React.FC<VideoResultProps> = ({ data }) => {
  const [copiedSection, setCopiedSection] = React.useState<string | null>(null);

  const handleCopy = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const CopyButton = ({ text, section, className = "" }: { text: string, section: string, className?: string }) => (
    <button
        onClick={() => handleCopy(text, section)}
        className={`absolute top-2 right-2 p-1.5 bg-white bg-opacity-90 rounded-md shadow-sm border border-gray-200 hover:bg-gray-50 text-gray-600 transition-all ${className}`}
        title="复制到剪贴板"
    >
        {copiedSection === section ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
    </button>
  );

  const formatDate = (dateStr: string) => {
      // YYYYMMDD
      if (dateStr?.length === 8) {
          return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6)}`;
      }
      return dateStr;
  };

  const formatDuration = (seconds: number) => {
      if (!seconds) return '';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden my-8 border border-gray-100">
      <div className="md:flex">
        <div className="md:w-1/3 bg-gray-100 relative group">
            <img 
                src={data.thumbnail} 
                alt={data.title} 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {data.duration > 0 && (
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded font-medium">
                    {formatDuration(data.duration)}
                </div>
            )}
            <CopyButton text={data.thumbnail} section="thumbnail" className="opacity-0 group-hover:opacity-100" />
        </div>
        <div className="p-6 md:w-2/3 space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 leading-tight">{data.title}</h2>
            
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1.5" title="Channel">
                    <User size={16} className="text-blue-500" /> 
                    <span className="font-medium">{data.channel}</span>
                </div>
                <div className="flex items-center gap-1.5" title="Upload Date">
                    <Calendar size={16} className="text-blue-500" /> 
                    <span>{formatDate(data.upload_date)}</span>
                </div>
                <div className="flex items-center gap-1.5" title="Views">
                    <Eye size={16} className="text-blue-500" /> 
                    <span>{data.view_count?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5" title="Likes">
                    <ThumbsUp size={16} className="text-blue-500" /> 
                    <span>{data.like_count?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5" title="Comments">
                    <MessageCircle size={16} className="text-blue-500" /> 
                    <span>{data.comment_count?.toLocaleString()}</span>
                </div>
            </div>

            {/* Download Section */}
            {(data.formats?.length > 0 || data.audio_url) && (
                <div className="flex flex-wrap gap-3 pt-2">
                    {data.formats?.map((fmt, index) => (
                        <a
                            key={index}
                            href={fmt.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-md transition-colors shadow-sm ${
                                fmt.hasAudio ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'
                            }`}
                            title={fmt.hasAudio ? "包含音频的视频" : "仅视频 (无音频)"}
                        >
                            <Download size={16} />
                            下载 {fmt.resolution}
                            {!fmt.hasAudio && <span className="text-xs opacity-75">(无音频)</span>}
                        </a>
                    ))}

                    {data.audio_url && (
                        <a
                            href={data.audio_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 transition-colors shadow-sm"
                        >
                            <Music size={16} />
                            仅下载音频
                        </a>
                    )}
                </div>
            )}

            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap border border-gray-200 custom-scrollbar relative group">
                <CopyButton text={data.description} section="description" className="opacity-0 group-hover:opacity-100" />
                {data.description}
            </div>
        </div>
      </div>

      {/* Subtitles Section */}
      <div className="p-6 border-t border-gray-100 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-800">
            字幕内容
        </h3>
        {data.subtitles ? (
            <div className="bg-white p-4 rounded-lg border border-gray-200 h-80 overflow-y-auto font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-700 shadow-inner custom-scrollbar relative group">
                <CopyButton text={data.subtitles} section="subtitles" className="opacity-0 group-hover:opacity-100 sticky top-2 right-2 float-right ml-4" />
                {data.subtitles}
            </div>
        ) : (
            <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-gray-500 italic">
                暂无字幕 (或无法获取自动生成的字幕)。
            </div>
        )}
      </div>
    </div>
  );
};
