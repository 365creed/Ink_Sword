import { GameState, INK_TYPES, SEALS_DATA, MEMORIES_DATA } from '../core/state.js';
import { StorageSystem } from '../core/storage.js';

// 간단한 해시 함수 (오프라인 비밀번호 검증용)
function simpleHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export const AuthSystem = {
  init() {
    // 마지막 로그인 계정 복원
    const lastUser = localStorage.getItem('INK_SWORD_V2_LAST_USER');
    if (lastUser) {
      GameState.currentUser = lastUser;
    }
    StorageSystem.selectSlot(0);
    this.bindUIEvents();
    this.refreshAllUI();
  },

  loginOrRegister(username, password) {
    const cleanId = username.trim();
    const cleanPw = password.trim();

    if (!cleanId || !cleanPw) {
      return { ok: false, msg: '호패 이름(ID)과 암호(PW)를 모두 입력하십시오.' };
    }

    const accounts = StorageSystem.getAccounts();
    const pwHash = simpleHash(cleanPw);

    if (accounts[cleanId]) {
      // 기존 계정 로그인 검증
      if (accounts[cleanId].pwHash !== pwHash) {
        return { ok: false, msg: '암호가 일치하지 않습니다.' };
      }
      GameState.currentUser = cleanId;
      localStorage.setItem('INK_SWORD_V2_LAST_USER', cleanId);
      StorageSystem.selectSlot(0);
      this.refreshAllUI();
      return { ok: true, msg: `[${cleanId}] 화공님, 다시 화폭으로 돌아오셨군요.` };
    } else {
      // 신규 계정 즉시 생성
      accounts[cleanId] = {
        pwHash,
        createdAt: new Date().toISOString()
      };
      StorageSystem.saveAccounts(accounts);
      GameState.currentUser = cleanId;
      localStorage.setItem('INK_SWORD_V2_LAST_USER', cleanId);
      StorageSystem.selectSlot(0);
      this.refreshAllUI();
      return { ok: true, msg: `[${cleanId}] 새 호패가 각인되었습니다.` };
    }
  },

  logout() {
    GameState.currentUser = null;
    localStorage.removeItem('INK_SWORD_V2_LAST_USER');
    StorageSystem.selectSlot(0);
    this.refreshAllUI();
  },

  refreshAllUI() {
    // 상단/타이틀 계정명 갱신
    const userDisplay = document.getElementById('current-user-display');
    if (userDisplay) {
      userDisplay.textContent = GameState.currentUser
        ? `${GameState.currentUser} (슬롯 ${GameState.activeSlot + 1})`
        : `나그네 (비로그인 - 슬롯 ${GameState.activeSlot + 1})`;
    }

    // HUD 명묵 한자 인장 및 덧칠 횟수 갱신
    const activeInk = GameState.getActiveInk();
    const hudBadge = document.getElementById('hud-ink-badge');
    if (hudBadge) {
      hudBadge.textContent = activeInk.sealChar;
      hudBadge.style.backgroundColor = activeInk.color;
    }
    const deathCountEl = document.getElementById('death-count');
    if (deathCountEl) {
      deathCountEl.textContent = GameState.saveData.deathCount;
    }

    this.renderSaveSlots();
    this.renderEquipModal();
  },

  renderSaveSlots() {
    const container = document.getElementById('save-slots-container');
    if (!container) return;

    const slots = StorageSystem.loadAllSlots();
    container.innerHTML = '';

    slots.forEach((slot, idx) => {
      const isSelected = idx === GameState.activeSlot;
      const card = document.createElement('div');
      card.className = `slot-card ${isSelected ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="card-title">
          <span>제 ${idx + 1} 두루마리</span>
          <span>${isSelected ? '【선택됨】' : ''}</span>
        </div>
        <div class="card-desc">
          <div>진행: 제 ${slot.chapter}장 - ${slot.stage}화폭</div>
          <div>덧칠(부활)의 업: ${slot.deathCount}회</div>
          <div>기억 잔편: ${slot.collectedMemories.length} / 4</div>
          <div style="font-size:10px; margin-top:4px;">기록일: ${slot.updatedAt}</div>
        </div>
        <div style="display:flex; gap:6px; margin-top:6px;">
          <button class="ink-btn-small btn-select-slot" data-idx="${idx}" style="flex:1;">불러오기</button>
          <button class="ink-btn-small btn-reset-slot" data-idx="${idx}">소각(초기화)</button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.btn-select-slot').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        StorageSystem.selectSlot(idx);
        this.refreshAllUI();
      });
    });

    container.querySelectorAll('.btn-reset-slot').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx, 10);
        if (confirm(`제 ${idx + 1} 두루마리의 기록을 정말 불태워 초기화하시겠습니까?`)) {
          StorageSystem.resetSlot(idx);
          this.refreshAllUI();
        }
      });
    });
  },

  renderEquipModal() {
    const inkContainer = document.getElementById('ink-list-container');
    const sealContainer = document.getElementById('seal-list-container');
    const memContainer = document.getElementById('memory-list-container');
    if (!inkContainer || !sealContainer || !memContainer) return;

    // 1. 명묵 렌더링
    inkContainer.innerHTML = '';
    Object.values(INK_TYPES).forEach((ink) => {
      const isEquipped = GameState.saveData.equippedInk === ink.id;
      const card = document.createElement('div');
      card.className = `item-card ${isEquipped ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="card-title">
          <span style="color:${ink.color}">■ ${ink.name}</span>
          <span>${isEquipped ? '【장착중】' : ''}</span>
        </div>
        <div class="card-desc">${ink.desc}</div>
        <div class="card-desc">공격 배율: x${ink.atkMul} / 기동 배율: x${ink.speedMul}</div>
        <button class="ink-btn-small btn-equip-ink" data-id="${ink.id}">
          ${isEquipped ? '장착됨' : '벼루에 갈기(장착)'}
        </button>
      `;
      inkContainer.appendChild(card);
    });

    inkContainer.querySelectorAll('.btn-equip-ink').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        GameState.saveData.equippedInk = id;
        StorageSystem.saveCurrentSlot();
        this.refreshAllUI();
      });
    });

    // 2. 낙관 렌더링 (최대 2개 장착 토글)
    sealContainer.innerHTML = '';
    Object.values(SEALS_DATA).forEach((seal) => {
      const isEquipped = GameState.hasSeal(seal.id);
      const card = document.createElement('div');
      card.className = `item-card ${isEquipped ? 'equipped' : ''}`;
      card.innerHTML = `
        <div class="card-title">
          <span>印 ${seal.name}</span>
          <span style="color:var(--seal-red)">${isEquipped ? '【각인됨】' : ''}</span>
        </div>
        <div class="card-desc">${seal.desc}</div>
        <button class="ink-btn-small btn-toggle-seal" data-id="${seal.id}">
          ${isEquipped ? '각인 해제' : '낙관 찍기'}
        </button>
      `;
      sealContainer.appendChild(card);
    });

    sealContainer.querySelectorAll('.btn-toggle-seal').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        const list = GameState.saveData.equippedSeals;
        const idx = list.indexOf(id);
        if (idx >= 0) {
          list.splice(idx, 1);
        } else {
          if (list.length >= 2) {
            list.shift(); // 최대 2개 유지 (가장 먼저 찍은 낙관 교체)
          }
          list.push(id);
        }
        StorageSystem.saveCurrentSlot();
        this.refreshAllUI();
      });
    });

    // 3. 기억 조각 렌더링
    memContainer.innerHTML = '';
    MEMORIES_DATA.forEach((mem) => {
      const unlocked = GameState.saveData.collectedMemories.includes(mem.id);
      const card = document.createElement('div');
      card.className = `item-card ${unlocked ? '' : 'locked'}`;
      card.innerHTML = `
        <div class="card-title">${unlocked ? mem.title : '??? (찢겨진 화폭 잔편)'}</div>
        <div class="card-desc">${unlocked ? mem.text : '스테이지 곳곳의 숨겨진 화폭을 찾아 기억을 복원하십시오.'}</div>
      `;
      memContainer.appendChild(card);
    });
  },

  bindUIEvents() {
    // 모달 열기/닫기
    const openModal = (id) => document.getElementById(id)?.classList.remove('hidden');
    const closeModal = (id) => document.getElementById(id)?.classList.add('hidden');

    document.getElementById('btn-account-modal')?.addEventListener('click', () => openModal('account-modal'));
    document.getElementById('btn-title-equip')?.addEventListener('click', () => openModal('equip-modal'));
    document.getElementById('btn-open-equip')?.addEventListener('click', () => openModal('equip-modal'));
    document.getElementById('btn-controls-info')?.addEventListener('click', () => openModal('controls-modal'));

    document.querySelectorAll('.btn-close-modal').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        closeModal(e.currentTarget.dataset.target);
      });
    });

    // 로그인/계정생성 버튼
    document.getElementById('btn-login')?.addEventListener('click', () => {
      const id = document.getElementById('auth-id').value;
      const pw = document.getElementById('auth-pw').value;
      const res = this.loginOrRegister(id, pw);
      const msgEl = document.getElementById('auth-msg');
      if (msgEl) msgEl.textContent = res.msg;
    });

    // 로그아웃 버튼
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      this.logout();
      const msgEl = document.getElementById('auth-msg');
      if (msgEl) msgEl.textContent = '하산(로그아웃)하여 나그네 상태로 전환되었습니다.';
    });

    // 인장 백업 코드 추출/복원
    document.getElementById('btn-export-code')?.addEventListener('click', () => {
      const code = StorageSystem.exportBackupCode();
      const area = document.getElementById('backup-code-area');
      if (area) {
        area.value = code;
        area.select();
        navigator.clipboard?.writeText(code);
      }
      alert('화첩 인장 코드가 생성 및 복사되었습니다.');
    });

    document.getElementById('btn-import-code')?.addEventListener('click', () => {
      const area = document.getElementById('backup-code-area');
      if (!area || !area.value.trim()) {
        alert('복원할 화첩 인장 코드를 텍스트 창에 붙여넣으십시오.');
        return;
      }
      const res = StorageSystem.importBackupCode(area.value);
      alert(res.message);
      this.refreshAllUI();
    });
  }
};
