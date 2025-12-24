import express from 'express';
import type { Request, Response } from 'express';
import { parseFoodLogServer } from './parseFoodLogServer';

const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/parseFoodLog', async (req: Request, res: Response) => {
  try {
    const { text, currentDateTime, timezone, countryIso2 } = (req.body || {}) as {
      text?: string;
      currentDateTime?: string;
      timezone?: string;
      countryIso2?: string;
    };

    if (typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({ error: 'Missing text' });
      return;
    }

    const result = await parseFoodLogServer({
      text,
      currentDateTime,
      timezone,
      countryIso2,
    });
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'Internal error' });
  }
});

const port = Number(process.env.API_PORT || process.env.PORT || 4000);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] listening on :${port}`);
});
