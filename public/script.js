// ==================== STATE ====================

let appState = {
  isRunning: false,
  currentBatch: null,
  updateInterval: null,
};

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
  loadBriefings();
  checkServerHealth();
});

// ==================== SERVER HEALTH ====================

async function checkServerHealth() {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) throw new Error('Server not responding');
    showMessage('Servidor conectado ✓', 'success');
  } catch (error) {
    showMessage('Erro ao conectar com servidor', 'error');
  }
}

// ==================== BRIEFINGS ====================

async function loadBriefings() {
  try {
    const response = await fetch('/api/briefings');
    const data = await response.json();

    const select = document.getElementById('briefingSelect');
    // Manter a opção padrão
    if (data.briefings && data.briefings.length > 0) {
      // Briefings já carregados
    }
  } catch (error) {
    console.error('Erro ao carregar briefings:', error);
  }
}

// ==================== GENERATION ====================

async function startGeneration() {
  const briefingFile = document.getElementById('briefingSelect').value;
  const count = parseInt(document.getElementById('countInput').value);

  if (!briefingFile || count < 1) {
    showMessage('Preencha todos os campos corretamente', 'error');
    return;
  }

  try {
    appState.isRunning = true;
    updateUI();

    const response = await fetch('/api/batch/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefingFile, count }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erro ao iniciar geração');
    }

    showMessage(`✓ ${data.message}`, 'success');

    // Iniciar polling de status
    startStatusPolling();

  } catch (error) {
    appState.isRunning = false;
    updateUI();
    showMessage(`Erro: ${error.message}`, 'error');
  }
}

async function stopGeneration() {
  try {
    const response = await fetch('/api/batch/stop', { method: 'POST' });
    const data = await response.json();

    appState.isRunning = false;
    clearInterval(appState.updateInterval);
    updateUI();

    showMessage(data.message, 'info');
  } catch (error) {
    showMessage(`Erro ao parar: ${error.message}`, 'error');
  }
}

async function resetBatch() {
  try {
    const response = await fetch('/api/batch/reset', { method: 'POST' });
    const data = await response.json();

    appState.currentBatch = null;
    appState.isRunning = false;
    clearInterval(appState.updateInterval);

    // Limpar UI
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('creativesSection').style.display = 'none';
    document.getElementById('creativesGrid').innerHTML = '';

    updateUI();
    showMessage('Estado resetado', 'info');
  } catch (error) {
    showMessage(`Erro ao resetar: ${error.message}`, 'error');
  }
}

// ==================== STATUS POLLING ====================

function startStatusPolling() {
  // Atualizar a cada 2 segundos quando tiver botão manual
  appState.updateInterval = setInterval(async () => {
    try {
      const statusResponse = await fetch('/api/batch/status');
      const statusData = await statusResponse.json();

      updateProgressUI(statusData);

      // Se terminou, carregar criativos
      if (!statusData.isRunning && statusData.progress.completed > 0) {
        clearInterval(appState.updateInterval);
        loadCreatives();
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  }, 2000);
}

function updateProgressUI(status) {
  // Mostrar seção de progresso
  document.getElementById('progressSection').style.display = 'block';

  // Atualizar dados
  document.getElementById('projectName').textContent = status.project || 'Novo Campeche - SPOT II';
  document.getElementById('progressPercent').textContent = status.progress.percentage + '%';
  document.getElementById('progressCount').textContent = `${status.progress.completed}/${status.progress.total}`;
  document.getElementById('elapsedTime').textContent = `${status.elapsed}s`;

  // Progress bar
  const fill = document.getElementById('progressFill');
  fill.style.width = status.progress.percentage + '%';

  // Progress text
  const text = document.getElementById('progressText');
  if (status.isRunning) {
    text.textContent = `Gerando... ${status.progress.percentage}%`;
  } else if (status.progress.completed === status.progress.total) {
    text.textContent = '✓ Concluído!';
  }

  // Distribution
  if (status.distribution && status.distribution.static !== undefined) {
    document.getElementById('staticCount').textContent = status.distribution.static;
    document.getElementById('narratedCount').textContent = status.distribution.narrated;
    document.getElementById('avatarCount').textContent = status.distribution.avatar;
  }

  appState.currentBatch = status;
  updateUI();
}

// ==================== CREATIVES ====================

async function loadCreatives() {
  try {
    const response = await fetch('/api/batch/creatives');
    const data = await response.json();

    if (data.count > 0) {
      displayCreatives(data.creatives);
      document.getElementById('creativesSection').style.display = 'block';
      showMessage(`✓ ${data.count} criativos carregados`, 'success');
    }
  } catch (error) {
    console.error('Erro ao carregar criativos:', error);
  }
}

function displayCreatives(creatives) {
  const grid = document.getElementById('creativesGrid');
  grid.innerHTML = '';

  creatives.forEach((creative, index) => {
    const card = createCreativeCard(creative, index + 1);
    grid.appendChild(card);
  });
}

function createCreativeCard(creative, number) {
  const card = document.createElement('div');
  card.className = 'creative-card';

  const typeEmoji = {
    static: '📸',
    narrated: '🎙️',
    avatar: '👤',
  };

  const typeLabel = {
    static: 'Estático',
    narrated: 'Narrado',
    avatar: 'Avatar',
  };

  const emoji = typeEmoji[creative.type] || '🎬';
  const label = typeLabel[creative.type] || creative.type;

  card.innerHTML = `
    <div class="creative-badge">${emoji} ${label}</div>
    <div style="font-weight: 600; margin-bottom: 0.5rem;">#${number}</div>
    <div class="creative-id">${creative.creativeId}</div>
    <div style="font-size: 0.85rem; color: #718096; margin-top: 0.5rem;">
      ${creative.duration}
    </div>
    <div class="creative-status success">
      ✓ Completo
    </div>
  `;

  return card;
}

// ==================== UI UPDATES ====================

function updateUI() {
  const generateBtn = document.getElementById('generateBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusBadge = document.getElementById('statusBadge');

  generateBtn.disabled = appState.isRunning;
  stopBtn.disabled = !appState.isRunning;

  if (appState.isRunning) {
    statusBadge.innerHTML = '<span class="status-dot running"></span>Em andamento';
  } else {
    statusBadge.innerHTML = '<span class="status-dot idle"></span>Pronto';
  }
}

// ==================== MESSAGES ====================

function showMessage(text, type = 'info') {
  const container = document.getElementById('messageContainer');

  const messageEl = document.createElement('div');
  messageEl.className = `message ${type}`;
  messageEl.textContent = text;

  container.appendChild(messageEl);

  // Auto-remove após 5s
  setTimeout(() => {
    messageEl.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => messageEl.remove(), 300);
  }, 5000);
}

// ==================== EXPORTS ====================

// Funções exportadas para buttons onclick
window.startGeneration = startGeneration;
window.stopGeneration = stopGeneration;
window.resetBatch = resetBatch;
