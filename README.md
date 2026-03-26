# 🎬 Máquina de Criativos Seazone

Ferramenta Node.js completa para gerar criativos com IA. Cria vídeos profissionais com avatar, voice over, imagens e edição de vídeo - tudo automatizado e modular.

## ✨ Recursos

- **Avatar Sincronizado**: D-ID, HeyGen, Synthesia
- **Voice Over**: ElevenLabs, Google Cloud, Azure
- **Geração de Imagens**: Flux, DALL-E, Midjourney
- **Edição de Vídeo**: FFmpeg, HandBrake
- **Upload para Google Drive**: Automático
- **CLI Visual**: Interface bonita com cores Seazone
- **Modular**: Trocar ferramentas editando .env

## 🚀 Quick Start

### 1. Instalação

```bash
cd maquina-criativos-seazone
npm install
```

### 2. Configuração

```bash
cp .env.example .env
# Edite .env com suas API keys
```

### 3. Execute

```bash
npm start
```

## 📋 Variáveis de Ambiente

```env
# APIs
DID_API_KEY=sua_chave_aqui
ELEVENLABS_API_KEY=sua_chave_aqui
FLUX_API_KEY=sua_chave_aqui

# Configuração
VERBOSE=false
OUTPUT_DIR=./output
```

## 🔧 Providers Disponíveis

**Avatar:** `did`, `heygen`, `synthesia`
**Voice:** `elevenlabs`, `google`, `azure`
**Imagens:** `flux`, `dall-e`, `midjourney`
**Editor:** `ffmpeg`, `handbrake`

## 📁 Estrutura

```
src/
  ├── cli.js                 # Interface CLI
  ├── orchestrator.js        # Lógica principal
  └── services/
      ├── avatar-service.js
      ├── voiceover-service.js
      ├── image-gen-service.js
      └── video-editor.js

templates/
  └── novo-campeche-briefing.json

config.js                     # Configuração modular
```

## 📊 Pipeline

1. Gerar Imagens → 2. Voice Over → 3. Avatar → 4. Edição → 5. Upload

## 🎨 Cores Seazone

- Primary: #1F4E78 (Azul escuro)
- Secondary: #2E75B6 (Azul médio)
- Accent: #FFFFFF (Branco)

## 📦 Dependências

- chalk - Colorir output
- dotenv - Variáveis de ambiente
- axios - Requisições HTTP
- ora - Spinners

## 🚨 Troubleshooting

### FFmpeg não encontrado
```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg
```

### API não conecta
Verifique suas chaves em .env e a conexão de internet.

## 💡 Uso Programático

```javascript
import { Orchestrator } from './src/orchestrator.js';

const orchestrator = new Orchestrator();
const result = await orchestrator.generateCreative(briefing);
```

## 📝 Licença

MIT

---

**Criado com ❤️ para Seazone**
