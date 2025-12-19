(function () {
  const KEY = "TNGO_SESSION";

  function getSession() {
    const s = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  }

  const sess = getSession();
  const current = location.pathname.split("/").pop();
  const isLoginPage = current === "dang-nhap.html";

  // Chưa đăng nhập → đá về trang đăng nhập
  if (!sess && !isLoginPage) {
    location.replace("./dang-nhap.html");
    return;
  }

  // Đã đăng nhập → không cho quay lại login
  if (sess && isLoginPage) {
    location.replace("./index.html");
  }
})();
