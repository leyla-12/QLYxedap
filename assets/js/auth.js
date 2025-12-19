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
// ====== LOGOUT + AUTO ADD BUTTON TO SIDEBAR ======
window.TNGO_logout = function () {
  localStorage.removeItem("TNGO_SESSION");
  sessionStorage.removeItem("TNGO_SESSION");
  location.href = "./dang-nhap.html";
};

(function mountLogoutButton() {
  // Chỉ làm trên trang quản trị (có sidebar), không làm trên trang đăng nhập
  const current = location.pathname.split("/").pop();
  if (current === "dang-nhap.html") return;

  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;

  // Tránh chèn trùng nếu trang đã có
  if (sidebar.querySelector(".sidebar-logout")) return;

  // Đảm bảo sidebar có position relative để đặt nút dưới cùng
  const cs = getComputedStyle(sidebar);
  if (cs.position === "static") sidebar.style.position = "relative";

  const wrap = document.createElement("div");
  wrap.className = "sidebar-logout";
  wrap.innerHTML = `
    <button class="logout-btn" type="button" onclick="TNGO_logout()">
      <i class="fa-solid fa-right-from-bracket"></i>
      Đăng xuất
    </button>
  `;
  sidebar.appendChild(wrap);
})();
