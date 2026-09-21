export const StorageManager = {
  KEY: 'ink_sword_save_data_v2',

  save(data) {
    try {
      const payload = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(this.KEY, JSON.stringify(payload));
      
      // 구글 로그인 상태 연동 지점
      if (window.currentUser && window.saveToCloud) {
        window.saveToCloud(window.currentUser.uid, payload);
      }
    } catch (e) {
      console.error("데이터 저장 실패:", e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("데이터 불러오기 실패:", e);
    }
    // 기본 초기 세이브 데이터
    return {
      stage: 1,
      score: 0,
      upgrades: {},
      settings: { sound: true }
    };
  }
};
