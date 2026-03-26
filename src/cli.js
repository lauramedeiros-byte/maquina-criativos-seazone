#!/usr/bin/env node

import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { Orchestrator } from './orchestrator.js';

const colors = {
  primary: chalk.hex('#1F4E78'),
  secondary: chalk.hex('#2E75B6'),
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
};

function printBanner() {
  console.clear();
  console.log('\n');
  console.log(colors.primary(`
  ╔════════════════════════════════════════════════════════════╗
  ║       🎬 MÁQUINA DE CRIATIVOS SEAZONE 🎬                   ║
  ║     Ferramenta de Geração de Criativos com IA              ║
  ╚════════════════════════════════════════════════════════════╝
  `));
}

function showMenu() {
  console.log(colors.secondary('\n📋 Menu Principal:\n'));
  console.log('  1. Gerar criativo único');
  console.log('  2. Gerar batch (45 criativos)');
  console.log('  3. Ver configuração');
  console.log('  4. Sair\n');
}

async function generateSingle(orchestrator) {
  console.log(colors.primary('\n📸 Gerando criativo único\n'));

  // Load briefing template
  const briefingPath = './templates/novo-campeche-briefing.json';
  if (!fs.existsSync(briefingPath)) {
    console.error(colors.error('❌ Briefing template não encontrado!'));
    return;
  }

  const briefing = JSON.parse(fs.readFileSync(briefingPath, 'utf-8'));

  console.log(`📦 Projeto: ${colors.secondary(briefing.projectName)}`);
  console.log(`📝 Script: ${briefing.script}\n`);

  // Select variant
  console.log(colors.primary('Selecione o tipo:'));
  console.log('  1. Imagem estática');
  console.log('  2. Vídeo narrado');
  console.log('  3. Vídeo com avatar\n');

  const variantMap = { '1': 'static', '2': 'narrated', '3': 'avatar' };
  const variant = variantMap['1'] || 'static';

  const result = await orchestrator.generateCreative(briefing, variant);

  console.log(colors.success('\n✅ Criativo gerado com sucesso!'));
  console.log(`   ID: ${colors.secondary(result.creativeId)}`);
  console.log(`   Tipo: ${result.type}`);
  console.log(`   Tempo: ${result.duration}`);

  if (result.images) {
    console.log(`   Imagens: ${result.images.join(', ')}`);
  }
  if (result.voiceover) {
    console.log(`   Voz: ${result.voiceover}`);
  }
}

async function generateBatch(orchestrator) {
  console.log(colors.primary('\n🚀 Gerando batch de 45 criativos\n'));

  // Load briefing template
  const briefingPath = './templates/novo-campeche-briefing.json';
  if (!fs.existsSync(briefingPath)) {
    console.error(colors.error('❌ Briefing template não encontrado!'));
    return;
  }

  const briefing = JSON.parse(fs.readFileSync(briefingPath, 'utf-8'));

  console.log(colors.warning('⏳ Isso pode levar alguns minutos...\n'));

  const result = await orchestrator.generateBatch(briefing, 45);

  console.log(colors.success('\n✅ Batch gerado com sucesso!'));
  console.log(`   Total: ${colors.secondary(result.totalCreatives)} criativos`);
  console.log(`   Relatório: ${colors.secondary(result.reportPath)}\n`);
}

function showConfig() {
  console.log(colors.primary('\n⚙️  Configuração Atual\n'));

  const configPath = './config.js';
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(
      fs.readFileSync('./package.json', 'utf-8')
    );
    console.log(`Nome: ${colors.secondary(config.name)}`);
    console.log(`Versão: ${colors.secondary(config.version)}`);
    console.log(`Descrição: ${config.description}\n`);
  }

  const envPath = './.env';
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const hasKeys = envContent.includes('_API_KEY=') &&
                    !envContent.includes('seu_api_key');
    console.log(`Status de API Keys: ${hasKeys ? colors.success('✅ Configuradas') : colors.warning('⚠️  Não configuradas')}`);
  } else {
    console.log(colors.warning('⚠️  .env não encontrado. Copie .env.example e configure suas API keys.\n'));
  }
}

async function main() {
  printBanner();

  const orchestrator = new Orchestrator();

  console.log(colors.success('✅ Sistema pronto!\n'));
  console.log(colors.secondary('Provedores configurados:'));
  console.log('  • Avatar: D-ID');
  console.log('  • Voice: ElevenLabs');
  console.log('  • Imagens: Flux');
  console.log('  • Edição: FFmpeg\n');

  showMenu();

  console.log(colors.primary('Escolha uma opção: '));
  console.log(colors.warning('(No modo atual: será gerado um exemplo de teste)\n'));

  // Auto-run batch generation as demonstration
  try {
    await generateBatch(orchestrator);
  } catch (error) {
    console.error(colors.error(`\n❌ Erro: ${error.message}`));
  }
}

main().catch(error => {
  console.error(colors.error(`\n❌ Erro fatal: ${error.message}`));
  process.exit(1);
});
