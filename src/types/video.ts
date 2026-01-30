export interface VideoInfo {
  title: string;
  thumbnail: string;
  description: string;
  upload_date: string;
  view_count: number;
  like_count: number;
  comment_count: number;
  duration: number;
  channel: string;
  subtitles: string;
  audio_url?: string;
  formats: {
    resolution: string;
    url: string;
    ext: string;
    hasAudio?: boolean;
  }[];
}
