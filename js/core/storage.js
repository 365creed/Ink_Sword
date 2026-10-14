import { GameState, createDefaultSaveData } from './state.js';

const STORAGE_PREFIX = 'INK_SWORD_V2_';
const ACCOUNTS_KEY = `${STORAGE_PREFIX}ACCOUNTS`;

export const StorageSystem = {
  // 현재 유저의 스토리지 키 반환
  _getUserSaveKey(username) {
    const id = username || GameState.currentUser || 'guest';
    return `${STORAGE_PREFIX}SAVE_${id}`;
  },

  // 특정 유저의 전체 슬롯(3개) 배열 불러오기
  loadAllSlots(username = null) {
    const key = this._getUserSaveKey(username);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        const initialSlots = [
          createDefaultSaveData(0),
          createDefaultSaveData(1),
          createDefaultSaveData(2)
        ];
        localStorage.setItem(key, JSON.stringify(initialSlots));
        return initialSlots;
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length === 3
        ? parsed
        : [createDefaultSaveData(0), createDefaultSaveData(1), createDefaultSaveData(2)];
    } catch (e) {
      console.error('세이브 로드 실패:', e);
      return [createDefaultSaveData(0), createDefaultSaveData(1), createDefaultSaveData(2)];
    }
  },

  // 현재 활성 슬롯 저장
  saveCurrentSlot() {
    const slots = this.loadAllSlots();
    GameState.saveData.updatedAt = new Date().toLocaleString('ko-KR');
    slots[GameState.activeSlot] = { ...GameState.saveData };
    localStorage.setItem(this._getUserSaveKey(), JSON.stringify(slots));
  },

  // 특정 슬롯 선택 및 로드
  selectSlot(slotIndex) {
    const slots = this.loadAllSlots();
    GameState.activeSlot = slotIndex;
    GameState.saveData = slots[slotIndex] || createDefaultSaveData(slotIndex);
    GameState.playerStats.karma = GameState.saveData.karma || 0;
    return GameState.saveData;
  },

  // 특정 슬롯 초기화(삭제)
  resetSlot(slotIndex) {
    const slots = this.loadAllSlots();
    slots[slotIndex] = createDefaultSaveData(slotIndex);
    localStorage.setItem(this._getUserSaveKey(), JSON.stringify(slots));
    if (GameState.activeSlot === slotIndex) {
      GameState.saveData = slots[slotIndex];
    }
  },

  // 화첩 인장 코드(백업 문자열) 추출 (한글 깨짐 방지 인코딩)
  exportBackupCode() {
    this.saveCurrentSlot();
    const payload = {
      user: GameState.currentUser || 'guest',
      activeSlot: GameState.activeSlot,
      slots: this.loadAllSlots(),
      sig: 'MUK_GEOM_SEAL_V2'
    };
    const jsonStr = JSON.stringify(payload);
    const encoded = btoa(encodeURIComponent(jsonStr));
    return `【墨劍印章】${encoded}【終】`;
  },

  // 화첩 인장 코드(백업 문자열) 복원
  importBackupCode(codeStr) {
    try {
      const cleaned = codeStr
        .replace('【墨劍印章】', '')
        .replace('【終】', '')
        .trim();
      const jsonStr = decodeURIComponent(atob(cleaned));
      const payload = JSON.parse(jsonStr);

      if (!payload || payload.sig !== 'MUK_GEOM_SEAL_V2' || !Array.isArray(payload.slots)) {
        return { success: false, message: '유효하지 않은 화첩 인장 코드입니다.' };
      }

      localStorage.setItem(this._getUserSaveKey(), JSON.stringify(payload.slots));
      this.selectSlot(payload.activeSlot || 0);
      return {
        success: true,
        message: '화첩 인장 코드로부터 모든 기억과 장구를 완벽히 복원했습니다!'
      };
    } catch (e) {
      return { success: false, message: '인장 코드가 손상되었거나 형식이 맞지 않습니다.' };
    }
  },

  // 로컬 계정 목록 조회
  getAccounts() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}');
    } catch {
      return {};
    }
  },

  saveAccounts(accountsObj) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accountsObj));
  }
};
