export const AuthSystem = {
  init(callback) {
    const btn = document.getElementById('google-login-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        window.currentUser = { uid: "ink_user_master", displayName: "수묵검객" };
        if (callback) callback(window.currentUser);
      });
    }
  }
};
