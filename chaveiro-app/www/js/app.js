
  // ---------- Estado ----------
  let isPremium = false;
  let currentTab = 'propria'; // 'propria' | 'contato'
  const FREE_LIMIT = 10;

  let keys = [
    { id: crypto.randomUUID(), apelido: 'Conta Principal', tipo: 'cpf', valor: '123.456.789-00', bank: { name: 'Banco Itaú', code: 341 }, isPropria: true },
    { id: crypto.randomUUID(), apelido: 'Nubank Pessoal', tipo: 'telefone', valor: '+55 21 91234-5678', bank: { name: 'Nu Pagamentos', code: 260 }, isPropria: true },
    { id: crypto.randomUUID(), apelido: 'Reserva de Emergência', tipo: 'email', valor: 'reserva@email.com', bank: null, isPropria: true },
    { id: crypto.randomUUID(), apelido: 'Chave Aleatória Corrente', tipo: 'aleatoria', valor: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', bank: { name: 'Banco do Brasil', code: 1 }, isPropria: true },
    { id: crypto.randomUUID(), apelido: 'Fornecedor Cimento', tipo: 'cnpj', valor: '12.345.678/0001-90', bank: { name: 'Banco Bradesco', code: 237 }, isPropria: false },
    { id: crypto.randomUUID(), apelido: 'João Chaveiro', tipo: 'telefone', valor: '+55 21 99876-5432', bank: null, isPropria: false },
    { id: crypto.randomUUID(), apelido: 'Maria Contadora', tipo: 'email', valor: 'maria.contadora@email.com', bank: { name: 'Banco Inter', code: 77 }, isPropria: false }
  ];

  const tipoLabel = { cpf: 'CPF', cnpj: 'CNPJ', email: 'E-mail', telefone: 'Telefone', aleatoria: 'Aleatória' };
  const tipoIcon = { cpf: 'badge', cnpj: 'apartment', email: 'mail', telefone: 'smartphone', aleatoria: 'shuffle' };
  const tipoBadgeClass = {
    cpf: 'bg-badge-cpf-bg text-badge-cpf-text',
    cnpj: 'bg-badge-cnpj-bg text-badge-cnpj-text',
    email: 'bg-badge-email-bg text-badge-email-text',
    telefone: 'bg-badge-telefone-bg text-badge-telefone-text',
    aleatoria: 'bg-badge-aleatoria-bg text-badge-aleatoria-text'
  };

  // ---------- Bancos (BrasilAPI) ----------
  let bankList = [];
  let bankListLoaded = false;
  let selectedBank = null; // { name, code }

  const monogramPalette = [
    { bg: '#e3edfd', text: '#1a4fa8' }, { bg: '#f0e6fa', text: '#6a2fb5' },
    { bg: '#e1f5e6', text: '#1c7a3a' }, { bg: '#fdeadd', text: '#b45a10' },
    { bg: '#fde3ec', text: '#a8195c' }, { bg: '#fff6d9', text: '#8a6d00' },
    { bg: '#dff3f2', text: '#0a6e69' }, { bg: '#e9eaea', text: '#54605e' }
  ];

  function monogramFor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const palette = monogramPalette[Math.abs(hash) % monogramPalette.length];
    const initials = name.replace(/^Banco\s+/i, '').trim().slice(0, 2).toUpperCase();
    return { initials, ...palette };
  }

  // Fonte primária: banks.json empacotado no APK (funciona 100% offline).
  // Atualização: best-effort em segundo plano quando há internet, nunca bloqueia a tela.
  async function loadBanks() {
    if (bankListLoaded) return;
    try {
      const res = await fetch('./data/banks.json');
      const data = await res.json();
      bankList = sortBanks(data);
      bankListLoaded = true;
      renderBankList();
    } catch (err) {
      document.getElementById('bank-loading').classList.add('hidden');
      document.getElementById('bank-error').classList.remove('hidden');
      return;
    }
    refreshBanksInBackground();
  }

  function sortBanks(data) {
    return data
      .filter(b => b.name && b.name.trim())
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async function refreshBanksInBackground() {
    if (!navigator.onLine) return;
    try {
      const res = await fetch('https://brasilapi.com.br/api/banks/v1');
      if (!res.ok) return;
      const data = await res.json();
      bankList = sortBanks(data);
      try {
        localStorage.setItem('banks_cache_v1', JSON.stringify(data));
      } catch (_) { /* storage cheia ou indisponível: ignora, sem quebrar o app */ }
      renderBankList();
    } catch (_) {
      // Sem internet ou API fora do ar: segue usando o banks.json empacotado. Sem erro pro usuário.
    }
  }

  function renderBankList() {
    const query = document.getElementById('bank-search-input').value.trim().toLowerCase();
    const container = document.getElementById('bank-list');
    document.getElementById('bank-loading').classList.add('hidden');
    document.getElementById('bank-error').classList.add('hidden');
    container.innerHTML = '';

    const filtered = bankList.filter(b => !query || b.name.toLowerCase().includes(query) || String(b.code).includes(query));

    filtered.slice(0, 150).forEach(b => {
      const m = monogramFor(b.name);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'w-full flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container-high transition-colors text-left';
      row.innerHTML = `
        <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-xs font-bold" style="background-color:${m.bg};color:${m.text}">${m.initials}</div>
        <div class="min-w-0 flex-1">
          <span class="font-body-lg text-on-surface truncate block">${b.name}</span>
        </div>
        ${b.code != null ? `<span class="font-body-md text-on-surface-variant text-sm shrink-0">${b.code}</span>` : ''}
      `;
      row.addEventListener('click', () => pickBank(b));
      container.appendChild(row);
    });
  }

  document.getElementById('bank-search-input').addEventListener('input', renderBankList);

  document.getElementById('btn-pick-bank').addEventListener('click', () => {
    showScreen('screen-bank');
    document.getElementById('bank-search-input').value = '';
    if (!bankListLoaded) {
      document.getElementById('bank-loading').classList.remove('hidden');
      document.getElementById('bank-error').classList.add('hidden');
      document.getElementById('bank-list').innerHTML = '';
      loadBanks();
    } else {
      renderBankList();
    }
  });

  document.getElementById('bank-none-option').addEventListener('click', () => pickBank(null));
  document.getElementById('btn-bank-back').addEventListener('click', () => showScreen('screen-new'));

  function pickBank(bank) {
    selectedBank = bank;
    const label = document.getElementById('bank-picked-label');
    const iconWrap = document.getElementById('bank-picked-icon');
    if (bank) {
      const m = monogramFor(bank.name);
      label.textContent = bank.name;
      label.classList.remove('text-on-surface-variant');
      label.classList.add('text-on-surface');
      iconWrap.innerHTML = '';
      iconWrap.style.backgroundColor = m.bg;
      iconWrap.style.color = m.text;
      iconWrap.textContent = m.initials;
    } else {
      label.textContent = 'Toque para selecionar';
      label.classList.add('text-on-surface-variant');
      label.classList.remove('text-on-surface');
      iconWrap.style.backgroundColor = '';
      iconWrap.style.color = '';
      iconWrap.innerHTML = '<span class="material-symbols-outlined text-[20px]">account_balance</span>';
    }
    showScreen('screen-new');
  }

  // ---------- Navegação ----------
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  // ---------- Biometria (capacitor-native-biometric) ----------
  // Fora do app nativo (ex.: preview no navegador) o plugin não existe: cai pro fallback do PIN sem quebrar nada.
  const Biometric = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.NativeBiometric;
  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  async function setupBiometricButton() {
    const btn = document.getElementById('btn-biometric');
    const hint = btn.nextElementSibling; // "Toque no sensor para entrar"
    if (!isNative || !Biometric) {
      // Sem hardware/plugin disponível (ex.: web): esconde a opção e força PIN.
      btn.classList.add('hidden');
      if (hint) hint.classList.add('hidden');
      return;
    }
    try {
      const result = await Biometric.isAvailable();
      if (!result.isAvailable) {
        btn.classList.add('hidden');
        if (hint) hint.classList.add('hidden');
      }
    } catch (_) {
      btn.classList.add('hidden');
      if (hint) hint.classList.add('hidden');
    }
  }
  setupBiometricButton();

  document.getElementById('btn-biometric').addEventListener('click', async () => {
    if (!isNative || !Biometric) { showScreen('screen-home'); renderList(); return; }
    try {
      await Biometric.verifyIdentity({
        reason: 'Acesse suas chaves PIX com segurança',
        title: 'Autenticação biométrica',
        subtitle: 'Chaveiro Rápido',
        description: 'Use sua digital ou reconhecimento facial para entrar'
      });
      // Sucesso: NativeBiometric.verifyIdentity resolve sem lançar erro.
      showScreen('screen-home');
      renderList();
    } catch (err) {
      // Usuário cancelou, falhou nas tentativas ou hardware bloqueado: mantém na tela de login e sugere o PIN.
      console.warn('Biometria não concluída:', err && err.message);
    }
  });

  document.getElementById('btn-pin').addEventListener('click', () => {
    // TODO: plugar aqui a verificação real do PIN cadastrado antes de liberar o acesso.
    showScreen('screen-home');
    renderList();
  });

  document.getElementById('btn-close-alert').addEventListener('click', () => {
    document.getElementById('backup-alert').classList.add('hidden');
  });

  // ---------- Abas ----------
  document.getElementById('tab-propria').addEventListener('click', () => setTab('propria'));
  document.getElementById('tab-contato').addEventListener('click', () => setTab('contato'));

  function setTab(tab) {
    currentTab = tab;
    document.getElementById('tab-propria').classList.toggle('active', tab === 'propria');
    document.getElementById('tab-contato').classList.toggle('active', tab === 'contato');
    const footerLink = document.getElementById('footer-liberar-agenda');
    footerLink.classList.toggle('hidden', !(tab === 'contato' && !isPremium));
    document.getElementById('search-input').value = '';
    renderList();
  }

  document.getElementById('link-liberar-agenda').addEventListener('click', (e) => {
    e.preventDefault();
    openPaywall('agenda');
  });

  // ---------- Busca ----------
  document.getElementById('search-input').addEventListener('input', renderList);

  // ---------- Renderização da lista ----------
  function renderList() {
    const list = document.getElementById('key-list');
    const empty = document.getElementById('empty-state');
    const query = document.getElementById('search-input').value.trim().toLowerCase();

    const filtered = keys.filter(k => k.isPropria === (currentTab === 'propria'))
      .filter(k => !query || k.apelido.toLowerCase().includes(query) || k.valor.toLowerCase().includes(query));

    list.innerHTML = '';
    empty.classList.toggle('hidden', filtered.length > 0);

    filtered.forEach(k => list.appendChild(buildKeyCard(k)));
  }

  function maskValue(valor) {
    const len = String(valor).replace(/\s/g, '').length;
    return '•'.repeat(Math.min(Math.max(len, 6), 10));
  }

  function buildKeyCard(k) {
    const card = document.createElement('div');
    card.className = 'elevation-1 rounded-[16px] p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-surface-container-high transition-colors active:scale-[0.98]';

    let iconHtml;
    if (k.bank) {
      const m = monogramFor(k.bank.name);
      iconHtml = `<div class="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm shrink-0 text-sm font-bold" style="background-color:${m.bg};color:${m.text}">${m.initials}</div>`;
    } else {
      iconHtml = `<div class="w-12 h-12 rounded-lg flex items-center justify-center shadow-sm shrink-0 ${tipoBadgeClass[k.tipo]}"><span class="material-symbols-outlined">${tipoIcon[k.tipo]}</span></div>`;
    }

    // Estado padrão: valor real mascarado. Quando tem banco, mostra o nome do banco até liberar.
    const hiddenText = k.bank ? k.bank.name : maskValue(k.valor);

    card.innerHTML = `
      <div class="flex items-center gap-4 min-w-0">
        ${iconHtml}
        <div class="min-w-0">
          <h3 class="font-label-lg text-on-surface mb-0.5 truncate">${k.apelido}</h3>
          <div class="flex items-center gap-1.5 text-on-surface-variant font-body-md">
            <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full ${tipoBadgeClass[k.tipo]}">${tipoLabel[k.tipo]}</span>
            <span class="truncate value-text">${hiddenText}</span>
          </div>
        </div>
      </div>
      <button aria-label="Liberar chave" class="p-2 text-on-surface-variant hover:bg-surface-variant/50 rounded-full transition-colors toggle-value shrink-0">
        <span class="material-symbols-outlined">visibility_off</span>
      </button>
    `;

    let revealed = false;
    card.querySelector('.toggle-value').addEventListener('click', (e) => {
      e.stopPropagation();
      revealed = !revealed;
      const icon = e.currentTarget.querySelector('.material-symbols-outlined');
      icon.textContent = revealed ? 'visibility' : 'visibility_off';
      e.currentTarget.setAttribute('aria-label', revealed ? 'Ocultar chave' : 'Liberar chave');
      card.querySelector('.value-text').textContent = revealed ? k.valor : hiddenText;
    });
    return card;
  }

  // ---------- Adicionar chave ----------
  function openNewKeyScreen() {
    if (!isPremium && currentTab === 'contato') {
      openPaywall('agenda');
      return;
    }
    const minhasCount = keys.filter(k => k.isPropria).length;
    if (!isPremium && minhasCount >= FREE_LIMIT) {
      openPaywall('limite');
      return;
    }
    document.getElementById('new-key-title').textContent = isPremium
      ? (currentTab === 'propria' ? 'Adicionar minha chave' : 'Adicionar contato')
      : 'Nova Chave';

    const toggleWrap = document.getElementById('toggle-propria-wrap');
    if (isPremium) {
      toggleWrap.classList.remove('hidden');
      setToggleState(currentTab === 'propria');
    } else {
      toggleWrap.classList.add('hidden');
    }
    pickBank(null);
    showScreen('screen-new');
  }

  function setToggleState(on) {
    const knob = document.getElementById('toggle-propria-knob');
    const track = document.getElementById('toggle-propria');
    if (on) {
      track.classList.add('bg-primary-container');
      knob.style.transform = 'translateX(20px)';
    } else {
      track.classList.remove('bg-primary-container');
      knob.style.transform = 'translateX(0)';
    }
  }

  document.getElementById('nav-add').addEventListener('click', (e) => { e.preventDefault(); openNewKeyScreen(); });
  document.getElementById('nav-security').addEventListener('click', (e) => { e.preventDefault(); showScreen('screen-security'); });
  document.getElementById('btn-security-back').addEventListener('click', () => { showScreen('screen-home'); renderList(); });
  document.getElementById('btn-settings').addEventListener('click', () => { showScreen('screen-settings'); });
  document.getElementById('btn-settings-back').addEventListener('click', () => { showScreen('screen-home'); renderList(); });

  document.getElementById('btn-back').addEventListener('click', () => { showScreen('screen-home'); renderList(); });

  document.getElementById('btn-save').addEventListener('click', () => {
    const apelido = document.getElementById('apelido').value.trim();
    const tipo = document.getElementById('tipo_chave').value;
    const valor = document.getElementById('valor_chave').value.trim();

    if (!apelido || !tipo || !valor) return;

    keys.push({
      id: crypto.randomUUID(),
      apelido,
      tipo,
      valor,
      bank: selectedBank,
      // Grátis: sempre isPropria = false (tudo vira Contato, sem escolha).
      // Premium: definido travado pela aba de origem.
      isPropria: isPremium ? (currentTab === 'propria') : true
    });

    document.getElementById('apelido').value = '';
    document.getElementById('tipo_chave').value = 'cpf';
    document.getElementById('valor_chave').value = '';
    pickBank(null);

    showScreen('screen-home');
    renderList();
  });

  // ---------- Paywall / Assinatura (Google Play Billing) ----------
  // ID do produto configurado no Play Console (Monetizar > Produtos > Assinaturas).
  // Sugestão: 1 produto "chaveiro_premium" com 2 planos base (mensal / anual).
  const SUBSCRIPTION_PRODUCT_ID = 'chaveiro_premium_mensal';

  function openPaywall(context) {
    if (context === 'limite') {
      document.getElementById('paywall-title').textContent = 'Limite de 10 chaves atingido';
      document.getElementById('paywall-subtitle').textContent = 'Assine para cadastrar chaves ilimitadas e organizar tudo automaticamente.';
    } else {
      document.getElementById('paywall-title').textContent = 'Desbloqueie a Agenda de Contatos';
      document.getElementById('paywall-subtitle').textContent = 'Guarde as chaves PIX de clientes e fornecedores separadas das suas, sem limite de cadastros.';
    }
    showScreen('screen-paywall');
  }

  document.getElementById('btn-paywall-back').addEventListener('click', () => { showScreen('screen-home'); renderList(); });
  document.getElementById('btn-paywall-dismiss').addEventListener('click', () => { showScreen('screen-home'); renderList(); });

  const Purchases = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Purchases;

  function unlockPremium() {
    isPremium = true;
    document.getElementById('footer-liberar-agenda').classList.add('hidden');
    openOrganizeScreen();
  }

  // Ao abrir o app, restaura o status de assinatura já comprado (ex.: reinstalou o app).
  // Atenção: isso é uma checagem client-side, suficiente pra maioria dos apps simples.
  // Pra evitar fraude/engenharia reversa em produção, valide o purchase token num backend
  // seu (Google Play Developer API) antes de liberar de fato o conteúdo premium.
  async function restorePremiumStatus() {
    if (!isNative || !Purchases) return;
    try {
      const available = await Purchases.isAvailable();
      if (!available || available.isAvailable === false) return;
      await Purchases.syncTransactions();
      const { transactions } = await Purchases.getCurrentTransactions();
      const hasActiveSub = transactions.some(t => t.productId === SUBSCRIPTION_PRODUCT_ID);
      if (hasActiveSub) {
        isPremium = true;
        document.getElementById('footer-liberar-agenda').classList.add('hidden');
      }
    } catch (err) {
      console.warn('Não foi possível verificar assinaturas existentes:', err && err.message);
    }
  }
  restorePremiumStatus();

  document.getElementById('btn-subscribe').addEventListener('click', async () => {
    // Fora do Capacitor nativo (preview web) o Google Play Billing não existe:
    // simula a liberação só pra permitir testar o fluxo de tela sem comprar de verdade.
    if (!isNative || !Purchases) {
      unlockPremium();
      return;
    }

    const btn = document.getElementById('btn-subscribe');
    btn.disabled = true;
    try {
      const { transaction } = await Purchases.purchaseProduct({ productId: SUBSCRIPTION_PRODUCT_ID });
      // Cobrança feita pelo Google Play (cartão do usuário). Confirma a entrega do benefício:
      await Purchases.finishTransaction({ transactionId: transaction.id });
      unlockPremium();
    } catch (err) {
      // Usuário cancelou o fluxo de pagamento, cartão recusado, ou erro de rede/Play Store.
      console.warn('Compra não concluída:', err && err.message);
      alert('Não foi possível concluir a assinatura. Tente novamente.');
    } finally {
      btn.disabled = false;
    }
  });

  // ---------- Organização Mágica ----------
  function openOrganizeScreen() {
    const list = document.getElementById('organize-list');
    list.innerHTML = '';
    keys.forEach(k => {
      const row = document.createElement('label');
      row.className = 'elevation-1 rounded-[16px] p-4 flex items-center gap-4 cursor-pointer';
      const iconHtml = k.bank
        ? (() => { const m = monogramFor(k.bank.name); return `<div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold" style="background-color:${m.bg};color:${m.text}">${m.initials}</div>`; })()
        : `<div class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tipoBadgeClass[k.tipo]}"><span class="material-symbols-outlined text-[20px]">${tipoIcon[k.tipo]}</span></div>`;
      row.innerHTML = `
        <input type="checkbox" data-id="${k.id}" class="organize-checkbox w-5 h-5 rounded border-outline text-primary focus:ring-primary" ${k.isPropria ? 'checked' : ''}>
        ${iconHtml}
        <div class="min-w-0">
          <h3 class="font-label-lg text-on-surface truncate">${k.apelido}</h3>
          <span class="font-body-md text-on-surface-variant text-sm truncate">${k.bank ? k.bank.name + ' · ' : ''}${tipoLabel[k.tipo]} · ${k.valor}</span>
        </div>
      `;
      list.appendChild(row);
    });
    showScreen('screen-organize');
  }

  document.getElementById('btn-confirm-organize').addEventListener('click', () => {
    document.querySelectorAll('.organize-checkbox').forEach(cb => {
      const key = keys.find(k => k.id === cb.dataset.id);
      if (key) key.isPropria = cb.checked;
    });
    setTab('propria');
    showScreen('screen-home');
    renderList();
  });
