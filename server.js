import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const staticDir = path.join(__dirname, 'shift-website');
const agendaFilePath = path.join(staticDir, 'data', 'agenda.json');

app.use(express.json({ limit: '5mb' }));

// Helper to read agenda
function getAgendaData() {
  try {
    if (fs.existsSync(agendaFilePath)) {
      const raw = fs.readFileSync(agendaFilePath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading agenda file:', err);
  }
  return [];
}

// Helper to save agenda
function saveAgendaData(data) {
  try {
    const dir = path.dirname(agendaFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(agendaFilePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing agenda file:', err);
    return false;
  }
}

// API Routes for Agenda Management
app.get('/api/agenda', (req, res) => {
  const data = getAgendaData();
  res.json({ success: true, data });
});

app.post('/api/agenda', (req, res) => {
  const { items, item } = req.body;
  let current = getAgendaData();

  if (Array.isArray(items)) {
    // Replace full list
    current = items;
  } else if (item && item.id) {
    // Upsert single item
    const idx = current.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      current[idx] = { ...current[idx], ...item };
    } else {
      current.push(item);
    }
    current.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  } else if (req.body && Array.isArray(req.body)) {
    current = req.body;
  } else {
    return res.status(400).json({ success: false, error: 'Invalid payload. Expected { items } or { item }.' });
  }

  const saved = saveAgendaData(current);
  if (!saved) {
    return res.status(500).json({ success: false, error: 'Failed to write agenda file.' });
  }
  res.json({ success: true, data: current });
});

app.delete('/api/agenda/:id', (req, res) => {
  const { id } = req.params;
  let current = getAgendaData();
  const initialLength = current.length;
  current = current.filter((i) => i.id !== id);

  if (current.length === initialLength) {
    return res.status(404).json({ success: false, error: 'Session not found.' });
  }

  const saved = saveAgendaData(current);
  if (!saved) {
    return res.status(500).json({ success: false, error: 'Failed to write agenda file.' });
  }
  res.json({ success: true, data: current });
});

// Serve static assets from shift-website directory
app.use(express.static(staticDir));

// Also support paths prefixed with /shift-website
app.use('/shift-website', express.static(staticDir));

// Fallback for all other routes
app.use((req, res) => {
  res.sendFile(path.join(staticDir, 'index.html'));
});

// Start standalone server when executed directly (local dev / AI Studio preview)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

export default app;
