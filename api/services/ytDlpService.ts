import { create } from 'yt-dlp-exec';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const TEMP_DIR = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'temp');
fs.ensureDirSync(TEMP_DIR);

// Use user-installed yt-dlp if available
const USER_YT_DLP_PATH = path.join(process.env.HOME || '', 'Library/Python/3.12/bin/yt-dlp');
const SYSTEM_YT_DLP_PATH = '/Library/Frameworks/Python.framework/Versions/3.12/bin/yt-dlp';

let ytDlpBinary = 'yt-dlp';
if (process.env.VERCEL) {
    // Vercel deployment: use downloaded binary in bin/yt-dlp
    // We download it to project root 'bin' folder in vercel-build script
    const localBin = path.join(process.cwd(), 'bin', 'yt-dlp');
    console.log('Vercel environment detected. Checking for binary at:', localBin);
    if (fs.existsSync(localBin)) {
        console.log('Binary found at:', localBin);
        ytDlpBinary = localBin;
    } else {
        console.error('Binary NOT found at:', localBin);
        // List files in bin to see what's there
        try {
            const binDir = path.join(process.cwd(), 'bin');
            if (fs.existsSync(binDir)) {
                console.log('Contents of bin:', fs.readdirSync(binDir));
            } else {
                console.log('bin directory does not exist at:', binDir);
            }
            console.log('Current working directory:', process.cwd());
            console.log('Root directory contents:', fs.readdirSync(process.cwd()));
        } catch (e) {
            console.error('Error listing directories:', e);
        }
    }
} else if (fs.existsSync(USER_YT_DLP_PATH)) {
  ytDlpBinary = USER_YT_DLP_PATH;
} else if (fs.existsSync(SYSTEM_YT_DLP_PATH)) {
  ytDlpBinary = SYSTEM_YT_DLP_PATH;
}

const ytDlp = create(ytDlpBinary);

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

export const extractVideoInfo = async (url: string, cookies?: string): Promise<VideoInfo> => {
  const cookieFile = cookies ? path.join(TEMP_DIR, `${uuidv4()}.txt`) : undefined;

  try {
    if (cookieFile && cookies) {
      // If cookies string looks like Netscape format (contains tab or starts with #), save as is.
      // Otherwise, assume it's a raw header string (key=value; key=value) and try to convert/wrap it.
      // However, yt-dlp expects Netscape format file for --cookies.
      // If user provides header-style string, it won't work directly with --cookies.
      // For now, we'll save what the user provided, but we might need to instruct user to use Netscape format.
      // The user provided example is header-style (key=value; ...).
      // yt-dlp usually requires Netscape format (7 columns tab separated).
      // BUT, let's try to see if we can convert simple header string to Netscape if possible, or just warn.
      // Actually, let's just write it. If it fails, it fails.
      // Wait, user provided: "PREF=...; ..." - this is HTTP Cookie header format.
      // yt-dlp --cookies option expects a file in Netscape format.
      // We should probably try to convert or support both if possible, but standard is Netscape.
      // Let's assume user provides Netscape format as requested in UI.
      // If the user pastes "key=value; key=value", we can try to format it or just save it.
      // Given the prompt, let's just write it.
      let cookieContent = cookies;
      // Sanitize: If user pasted content without the Netscape header, add it if it looks like columns
      if (!cookieContent.includes('# Netscape HTTP Cookie File') && cookieContent.includes('\t')) {
          cookieContent = '# Netscape HTTP Cookie File\n' + cookieContent;
      }
      await fs.writeFile(cookieFile, cookieContent);
    }

    const flags: any = {
      dumpJson: true,
      noWarnings: true,
      skipDownload: true,
      forceIpv4: true, // Force IPv4 to avoid common IPv6 blocks
      // userAgent: ... // Do not hardcode User-Agent when using cookies, as it causes session mismatch
    };

    if (cookieFile) {
      flags.cookies = cookieFile;
    }

    // 1. Get Metadata
    // Note: If using HTTP header style cookies, we might need to pass them via --add-header "Cookie:..."
    // instead of --cookies file.
    let currentFlags = { ...flags };
    
    // Check if cookies content is likely HTTP header format (contains '=' and ';' but no tabs/newlines like Netscape)
    // Netscape format usually has 7 columns separated by tabs.
    // HTTP Header format: "KEY=VALUE; KEY2=VALUE2"
    let useHeaderCookie = false;
    const isNetscape = cookies && (cookies.includes('# Netscape') || cookies.includes('\t'));
    
    if (cookies && !isNetscape && cookies.includes('=')) {
        useHeaderCookie = true;
        // Remove cookies file flag if we are using header method
        delete currentFlags.cookies;
        
        // Ensure header cookie string is clean (no whitespace around keys/values if possible, but keep semicolons)
        // Actually, sometimes passing full header string "Cookie: key=val; ..." works best
        // But let's just use what user provided.
        // Clean up newlines which might break command line arguments
        const cleanCookies = cookies.replace(/[\r\n]+/g, '').trim();
        currentFlags.addHeader = `Cookie:${cleanCookies}`;
        
        // Also cleanup the unused cookie file
        if (cookieFile) {
            await fs.unlink(cookieFile).catch(() => {});
        }
    }

    // Attempt to extract metadata
    let output;
    try {
        output = await ytDlp(url, currentFlags);
    } catch (e: any) {
        // Fallback: If header cookie failed (e.g. "Requested format is not available"), try without cookies for metadata
        // Sometimes passing cookies causes issues if they are invalid or cause restricted access mode
        if (useHeaderCookie) {
            console.warn("Metadata extraction with cookies failed, retrying without cookies...", e.message);
            delete currentFlags.addHeader;
            output = await ytDlp(url, currentFlags);
        } else {
            throw e;
        }
    }

    // Filter formats for 720p and 1080p mp4
    // Note: yt-dlp separates video and audio streams for high quality formats (DASH).
    // The 'url' property in formats list usually points to video-only stream for 1080p+.
    // To get audio, we need to find a pre-merged format (usually 720p or lower has it, or "best") 
    // OR we provide the video-only stream and accept it has no audio.
    // However, user requested audio.
    // yt-dlp's standard 'url' in dump-json for high-res formats IS just the video stream.
    // To get a downloadable link with BOTH, we usually need to proxy the download through our server (streaming it)
    // where we merge them on the fly using ffmpeg, OR we find a format that has acodec !== 'none'.
    // Typically, 720p (format 22) has audio. 1080p usually doesn't have a single pre-merged file on YouTube servers.
    // But let's check:
    
    const formats: { resolution: string; url: string; ext: string; hasAudio: boolean }[] = [];
    if (output.formats) {
        output.formats.forEach((fmt: any) => {
            // We want mp4.
            if (fmt.ext === 'mp4') {
                const hasAudio = fmt.acodec !== 'none';
                const hasVideo = fmt.vcodec !== 'none';
                
                if (hasVideo) {
                    let resolution = '';
                    if (fmt.format_note === '720p' || fmt.height === 720) resolution = '720p';
                    if (fmt.format_note === '1080p' || fmt.height === 1080) resolution = '1080p';

                    if (resolution) {
                        formats.push({ 
                            resolution, 
                            url: fmt.url, 
                            ext: 'mp4',
                            hasAudio
                        });
                    }
                }
            }
        });
    }

    // Also try to find a standalone audio track (m4a/aac)
    let audioUrl = '';
    if (output.formats) {
        const audioFormat = output.formats.find((f: any) => f.acodec !== 'none' && f.vcodec === 'none' && f.ext === 'm4a');
        if (audioFormat) {
            audioUrl = audioFormat.url;
        }
    }

    // 2. Get Subtitles
    // We try to download subtitles to a temp file
    const subId = uuidv4();
    // Using simple output template to avoid confusion
    const subPathTemplate = path.join(TEMP_DIR, `${subId}.%(ext)s`);
    
    try {
      const subFlags: any = {
        noWarnings: true,
        skipDownload: true,
        writeAutoSub: true,
        writeSub: true,
        subLang: 'en,zh-Hans,zh-Hant', // Prioritize English and Chinese
        output: subPathTemplate,
      };

      if (useHeaderCookie) {
          subFlags.addHeader = `Cookie:${cookies}`;
      } else {
          subFlags.cookies = cookieFile;
      }

      await ytDlp(url, subFlags);
    } catch (e) {
      console.warn("Subtitle download failed or no subtitles found", e);
    }

    // Find the generated subtitle file (vtt)
    const files = await fs.readdir(TEMP_DIR);
    // Prioritize manual subs over auto-generated ones if both exist, but usually we just take what we get.
    // Auto-subs usually have .en.vtt or .zh-Hans.vtt
    // Let's grab the first VTT file that matches our ID.
    const subFile = files.find(f => f.startsWith(subId) && f.endsWith('.vtt'));
    
    let subtitleText = '';
    if (subFile) {
      const content = await fs.readFile(path.join(TEMP_DIR, subFile), 'utf-8');
      subtitleText = cleanVtt(content);
      // Cleanup sub file
      await fs.unlink(path.join(TEMP_DIR, subFile)).catch(() => {});
    } else {
        // Retry logic: sometimes writeAutoSub=True fails but writeSub=True works or vice versa if combined.
        // But above we used both.
        // If failed, maybe try listing subs to see what's available? 
        // For now, if empty, it's empty.
    }

    return {
      title: output.title,
      thumbnail: output.thumbnail,
      description: output.description,
      upload_date: output.upload_date,
      view_count: output.view_count,
      like_count: output.like_count,
      comment_count: output.comment_count,
      duration: output.duration,
      channel: output.channel,
      subtitles: subtitleText,
      audio_url: audioUrl,
      formats: formats.reduce((acc, current) => {
        // Deduplicate formats by resolution. Prefer ones with audio if available.
        const existingIndex = acc.findIndex(item => item.resolution === current.resolution);
        if (existingIndex === -1) {
          return acc.concat([current]);
        } else {
          // If existing has no audio but current has audio, replace it
          if (!acc[existingIndex].hasAudio && current.hasAudio) {
              acc[existingIndex] = current;
          }
          return acc;
        }
      }, [] as typeof formats),
    };

  } catch (error: any) {
    console.error("yt-dlp error:", error);
    // Check for common verification errors in stderr
    const errorMsg = error.stderr || error.message || '';
    if (errorMsg.includes("Sign in to confirm") || errorMsg.includes("bot") || errorMsg.includes("429") || errorMsg.includes("403") || errorMsg.includes("Requested format is not available")) {
       throw new Error("HUMAN_VERIFICATION_REQUIRED");
    }

    if (errorMsg.includes("env: 'python3': No such file") || errorMsg.includes("python3: not found")) {
       throw new Error("SERVER_CONFIGURATION_ERROR: yt-dlp binary is missing Python dependency or is not the standalone executable.");
    }
    
    // Better error message for Vercel/Serverless timeout or general failure
    if (error.code === 1 || error.exitCode === 1) {
        throw new Error(errorMsg || "Failed to extract video info. This might be due to YouTube's restrictions on data center IPs (Vercel).");
    }

    throw error;
  } finally {
    if (cookieFile) {
      await fs.unlink(cookieFile).catch(() => {});
    }
    // Cleanup any stray files with this subId just in case
    // (Implemented above for the specific found file, but good to be safe)
  }
};

function cleanVtt(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  
  // VTT format:
  // WEBVTT
  //
  // 00:00:00.000 --> 00:00:02.000
  // Hello world
  
  let lastCleanText = '';

  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed === 'WEBVTT') return;
    if (trimmed.includes('-->')) return;
    // Skip style blocks usually at the top
    if (trimmed.startsWith('Style:')) return;
    if (trimmed.startsWith('::cue')) return; 
    // Skip numeric IDs
    if (/^[0-9]+$/.test(trimmed)) return;

    // Remove HTML tags like <c>...</c> or <b>...</b>
    const cleanText = trimmed.replace(/<[^>]*>/g, '').trim();

    // Skip empty lines after cleaning
    if (!cleanText) return;

    // Basic deduping based on CLEANED text
    if (cleanText !== lastCleanText) {
        result.push(cleanText);
        lastCleanText = cleanText;
    }
  });

  return result.join('\n');
}
