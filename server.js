const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.post('/api/query', async (req, res) => {
  try {
    const { prompt, schema } = req.body;

    if (!prompt || !schema) {
      return res.status(400).json({ error: 'Missing prompt or schema' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const fullPrompt = `You are an Oracle Transportation Management (OTM) SQL expert.

USER REQUIREMENT: ${prompt}

RELEVANT OTM SCHEMA:
${schema}

INSTRUCTIONS:
1. Identify correct tables from the schema above
2. Use proper JOIN conditions via _GID foreign keys (e.g. SHIPMENT.SERVPROV_GID = SERVPROV.SERVPROV_GID)
3. Use DISTINCT to avoid duplicates
4. Use Oracle SQL syntax (SYSDATE for current date, TRUNC() for date comparisons)
5. Add meaningful column aliases
6. Return ONLY the SQL query — no explanation, no markdown, no backticks`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: fullPrompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const sql = data.content?.[0]?.text || '-- Could not generate SQL';
    res.json({ sql });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));