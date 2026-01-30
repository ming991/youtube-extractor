import { Router } from 'express';
import { extractVideoInfo } from '../services/ytDlpService';

const router = Router();

router.post('/extract', async (req, res) => {
  const { url, cookies } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const data = await extractVideoInfo(url, cookies);
    res.json(data);
  } catch (error: any) {
    console.error("Extraction error:", error);
    if (error.message === 'HUMAN_VERIFICATION_REQUIRED') {
      return res.status(403).json({ 
        error: 'Verification required. Please provide fresh cookies.', 
        code: 'VERIFICATION_REQUIRED' 
      });
    }
    res.status(500).json({ error: error.message || 'Failed to extract video info' });
  }
});

export default router;
