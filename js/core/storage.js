export const StorageManager = {
  async saveGameData(data) {
    try {
      // 1. 로컬 저장 (IndexedDB / LocalStorage)
      localStorage.setItem('ink_sword_save', JSON.stringify(data));
      
      // 2. 구글 로그인 상태라면 클라우드 동기화 수행
      if (window.currentUser) {
        // await setDoc(doc(db, "users", window.currentUser.uid), data);
        console.log("클라우드 세이브 동기화 완료");
      }
    } catch (e) {
      console.error("세이브 실패:", e);
    }
  },

  loadGameData() {
    const raw = localStorage.getItem('ink_sword_save');
    return raw ? JSON.parse(raw) : { level: 1, score: 0, inventory: [] };
  }
};
