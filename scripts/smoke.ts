import { extractFoodLogSmart } from '../server/extractFoodLogSmart';

const main = async () => {
  const isoDatetime = new Date().toISOString();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const countryIso2 = process.env.COUNTRY_ISO2 || 'US';

  const scenariosBasic = [
    {
      id: 'needs_clarification_units_missing',
      userText: 'For breakfast: 200 g greek yogurt 0% and 1 banana',
    },
    {
      id: 'fully_specified_grams',
      userText: 'For breakfast: 200 g greek yogurt 0% and 120 g banana',
    },
    {
      id: 'barcode_packaged',
      userText: 'I ate 1 protein bar. Barcode 8000500310427.',
    },
  ] as const;

  const scenariosAll = [
    ...scenariosBasic,
    {
      id: 'llm_fallback_free_text',
      userText: 'I had pasta with pesto',
    },
  ] as const;

  const mode = (process.env.SMOKE_MODE || 'basic').toLowerCase();
  const scenarios = mode === 'all' ? scenariosAll : scenariosBasic;

  console.error(`[smoke] starting extraction (OLLAMA_HOST=${process.env.OLLAMA_HOST || ''})`);

  const results = [];
  let hadError = false;
  for (const s of scenarios) {
    console.error(`[smoke] scenario=${s.id}`);
    try {
      const { extraction, usedFastPath } = await extractFoodLogSmart({
        isoDatetime,
        timezone,
        countryIso2,
        userText: s.userText,
      });
      results.push({ scenario: s.id, input: s.userText, used_fast_path: usedFastPath, output: extraction });
    } catch (err: any) {
      hadError = true;
      results.push({
        scenario: s.id,
        input: s.userText,
        error: err?.message || String(err),
      });
    }
  }

  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  if (hadError) process.exitCode = 1;
};

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
