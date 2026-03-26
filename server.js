#!/usr/bin/env node

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Orchestrator } from './src/orchestrator.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Global state para acompanhar progresso
let batchState = {
  isRunning: false,
  totalCreatives: 0,
  completedCreatives: 0,
  currentProject: '',
  distribution: {},
  creatives: [],
  startTime: null,
  errors: [],
};

// Inicializar orchestrator
const orchestrator = new Orchestrator();

// ============ ENDPOINTS ============

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Obter status do batch
app.get('/api/batch/status', (req, res) => {
  const elapsed = batchState.startTime
    ? Math.floor((Date.now() - batchState.startTime) / 1000)
    : 0;

  res.json({
    isRunning: batchState.isRunning,
    project: batchState.currentProject,
    progress: {
      completed: batchState.completedCreatives,
      total: batchState.totalCreatives,
      percentage: batchState.totalCreatives > 0
        ? Math.round((batchState.completedCreatives / batchState.totalCreatives) * 100)
        : 0,
    },
    distribution: batchState.distribution,
    elapsed,
    timestamp: new Date().toISOString(),
  });
});

// Obter criativos gerados
app.get('/api/batch/creatives', (req, res) => {
  res.json({
    count: batchState.creatives.length,
    creatives: batchState.creatives,
  });
});

// Obter lista de briefings disponíveis
app.get('/api/briefings', (req, res) => {
  try {
    const templatesDir = join(__dirname, 'templates');
    const files = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));

    const briefings = files.map(file => {
      const content = JSON.parse(
        fs.readFileSync(join(templatesDir, file), 'utf-8')
      );
      return {
        id: file.replace('.json', ''),
        name: content.projectName || file,
        file: file,
      };
    });

    res.json({ briefings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Iniciar geração de batch
app.post('/api/batch/generate', async (req, res) => {
  const { briefingFile = 'novo-campeche-briefing.json', count = 45 } = req.body;

  // Prevenir múltiplos batches simultaneamente
  if (batchState.isRunning) {
    return res.status(400).json({
      error: 'Batch já está em execução',
      status: batchState,
    });
  }

  try {
    // Carregar briefing
    const briefingPath = join(__dirname, 'templates', briefingFile);
    if (!fs.existsSync(briefingPath)) {
      return res.status(404).json({ error: 'Briefing não encontrado' });
    }

    const briefing = JSON.parse(fs.readFileSync(briefingPath, 'utf-8'));

    // Inicializar estado
    batchState = {
      isRunning: true,
      totalCreatives: count,
      completedCreatives: 0,
      currentProject: briefing.projectName,
      distribution: {
        static: Math.floor(count / 3),
        narrated: Math.floor(count / 3),
        avatar: count - (2 * Math.floor(count / 3)),
      },
      creatives: [],
      startTime: Date.now(),
      errors: [],
    };

    res.json({
      status: 'started',
      message: `Iniciando geração de ${count} criativos`,
      projectName: briefing.projectName,
    });

    // Rodar batch em background
    setImmediate(async () => {
      try {
        const result = await orchestrator.generateBatch(briefing, count);

        // Carregar resultado do arquivo
        if (result.reportPath && fs.existsSync(result.reportPath)) {
          const report = JSON.parse(fs.readFileSync(result.reportPath, 'utf-8'));
          batchState.creatives = report.creatives || [];
        }

        batchState.completedCreatives = count;
        batchState.isRunning = false;
      } catch (error) {
        console.error('Erro ao gerar batch:', error);
        batchState.errors.push(error.message);
        batchState.isRunning = false;
      }
    });

  } catch (error) {
    batchState.isRunning = false;
    res.status(500).json({
      error: error.message,
      status: batchState,
    });
  }
});

// Parar batch em execução
app.post('/api/batch/stop', (req, res) => {
  if (batchState.isRunning) {
    batchState.isRunning = false;
    res.json({ message: 'Batch parado' });
  } else {
    res.json({ message: 'Nenhum batch em execução' });
  }
});

// Limpar estado
app.post('/api/batch/reset', (req, res) => {
  batchState = {
    isRunning: false,
    totalCreatives: 0,
    completedCreatives: 0,
    currentProject: '',
    distribution: {},
    creatives: [],
    startTime: null,
    errors: [],
  };

  res.json({ message: 'Estado resetado', status: batchState });
});

// Obter últimos outputs
app.get('/api/outputs', (req, res) => {
  try {
    const outputDir = join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) {
      return res.json({ outputs: [] });
    }

    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('batch_') && f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, 5); // Últimos 5

    const outputs = files.map(file => {
      const stats = fs.statSync(join(outputDir, file));
      return {
        file,
        size: stats.size,
        date: stats.mtime,
      };
    });

    res.json({ outputs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 404 fallback para página inicial
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`\n✅ Servidor rodando em http://localhost:${PORT}\n`);
  console.log(`📊 Painel: http://localhost:${PORT}/`);
  console.log(`📡 API: http://localhost:${PORT}/api/health\n`);
});

export default app;
