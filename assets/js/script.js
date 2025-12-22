(() => {
  // tránh load 2 lần (phòng khi include trùng)
  if (window.__TNGO_SCRIPT_LOADED__) return;
  window.__TNGO_SCRIPT_LOADED__ = true;

  // =================== AUTH + ROLE (FE) ===================
  const SESSION_KEY = "TNGO_SESSION";

  // ĐĂNG NHẬP BẰNG SĐT (phone)
  // QUANTRIVIEN: toàn quyền
  // NHANVIENTRAM: không được xoá
  const DEMO_USERS = [
    { phone: "0900000001", password: "Admin@123", role: "QUANTRIVIEN",   name: "Admin",  avatar: "./assets/img/admin.png" },
    { phone: "0900000002", password: "Nvtr@123",  role: "NHANVIENTRAM", name: "NV Trạm", avatar: "./assets/img/staff.png" },
  ];

  function normalizePhone(input) {
    let s = String(input || "").trim();
    s = s.replace(/\s+/g, "");
    s = s.replace(/^\+?84/, "0");
    s = s.replace(/\D/g, "");
    return s;
  }

  function getSession() {
    const s = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!s) return null;
    try { return JSON.parse(s); } catch { return null; }
  }

  function setSession(sess, remember) {
    const str = JSON.stringify(sess);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    if (remember) localStorage.setItem(SESSION_KEY, str);
    else sessionStorage.setItem(SESSION_KEY, str);
  }

  // dùng cho trang đăng nhập
  function handleLogin(phoneInput, password, remember = true) {
    const phone = normalizePhone(phoneInput);
    const p = String(password || "").trim();

    if (!phone) return { ok: false, msg: "Vui lòng nhập số điện thoại." };
    if (!p) return { ok: false, msg: "Vui lòng nhập mật khẩu." };

    const found = DEMO_USERS.find(x => normalizePhone(x.phone) === phone && x.password === p);
    if (!found) return { ok: false, msg: "Sai số điện thoại hoặc mật khẩu." };

    const sess = {
      phone: normalizePhone(found.phone),
      role: found.role,
      name: found.name,
      avatar: found.avatar,
      loginAt: Date.now()
    };
    setSession(sess, remember);
    return { ok: true, msg: "Đăng nhập thành công! Đang chuyển trang..." };
  }

  function requireAuth() {
    const sess = getSession();
    const file = (location.pathname.split("/").pop() || "").toLowerCase();
    const onLoginPage = file === "dang-nhap.html" || file === "login.html" || file === "";

    if (!sess && !onLoginPage) {
      location.href = "./dang-nhap.html";
      return null;
    }
    if (sess && onLoginPage) {
      location.href = "./index.html";
      return sess;
    }
    return sess;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    location.href = "./dang-nhap.html";
  }

  function canDelete(role) { return role === "QUANTRIVIEN"; }

  function guardDelete(role) {
    if (!canDelete(role)) {
      alert("Nhân viên trạm không có quyền XÓA.");
      return false;
    }
    return true;
  }

  function roleLabel(role) {
    return role === "QUANTRIVIEN" ? "Quản trị viên" : "Nhân viên trạm";
  }

  function renderTopbar() {
    const sess = getSession();
    if (!sess) return;

    const nameEl = document.getElementById("topbarName");
    const roleEl = document.getElementById("topbarRole");
    const avaEl  = document.getElementById("topbarAvatar");
    const outBtn = document.getElementById("btnLogout");

    if (nameEl) nameEl.textContent = sess.name || sess.phone || "";
    if (roleEl) roleEl.textContent = roleLabel(sess.role);
    if (avaEl)  avaEl.src = sess.avatar || "./assets/img/admin.png";
    if (outBtn) outBtn.addEventListener("click", logout);
  }

  function lockDeleteButtonsIfNeeded() {
    const sess = getSession();
    if (!sess) return;
    if (canDelete(sess.role)) return;

    const selectors = [
      "[data-del-station]",
      "[data-del-bike]",
      "[data-del-customer]",
      "[data-del-trip]",
      "[data-del-invoice]",
      "[data-action='delete']"
    ].join(",");

    document.querySelectorAll(selectors).forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = "0.5";
      btn.style.pointerEvents = "none";
      btn.title = "Nhân viên trạm không có quyền xóa";
    });
  }

  // chạy auth sớm
  (function bootAuth(){
    const sess = requireAuth();
    if (!sess) return;
    renderTopbar();
    window.addEventListener("DOMContentLoaded", lockDeleteButtonsIfNeeded);
  })();

  // =================== Helpers ===================
  const $ = (id) => document.getElementById(id);
  const money = (n) => (Number(n || 0)).toLocaleString("vi-VN") + "đ";
  const nowStr = () => {
    const d = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  function toUpperTrim(s){ return String(s || "").trim().toUpperCase(); }
  function trim(s){ return String(s || "").trim(); }

  function escapeHtml(str) {
    return (str ?? "").toString()
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function exportCSV(filename, rows){
    if(!rows || !rows.length){ alert("Không có dữ liệu để xuất!"); return; }
    const headers = Object.keys(rows[0]);
    const esc = (v) => `"${String(v ?? "").replaceAll('"','""')}"`;
    const csv = [headers.join(",")].concat(
      rows.map(r => headers.map(h => esc(r[h])).join(","))
    ).join("\n");

    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  // Drawer helper
  function setupDrawer({ overlayId, drawerId, closeId, cancelId }) {
    const overlay = $(overlayId);
    const drawer = $(drawerId);
    const btnClose = $(closeId);
    const btnCancel = cancelId ? $(cancelId) : null;

    function open() {
      if (!overlay || !drawer) return;
      overlay.hidden = false;
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
    }

    function close() {
      if (!overlay || !drawer) return;
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
      overlay.hidden = true;
    }

    if (overlay) overlay.addEventListener("click", close);
    if (btnClose) btnClose.addEventListener("click", close);
    if (btnCancel) btnCancel.addEventListener("click", close);

    return { open, close, overlay, drawer };
  }

  // =================== DB (localStorage) ===================
  const dbKey = "TNGO_DB_V1";
  const seed = {
    stations: [
      { id:"TR01", name:"Cầu Giấy",      address:"Cầu Giấy" },
      { id:"TR02", name:"Dịch Vọng",     address:"Dịch Vọng" },
      { id:"TR03", name:"Trần Duy Hưng", address:"Trần Duy Hưng" },
    ],
    bikes: [
      { id:"XE001", status:"đang đậu",  stationId:"TR01" },
      { id:"XE014", status:"đang thuê", stationId:"TR02" },
      { id:"XE078", status:"bảo trì",   stationId:"TR03" },
    ],
    customers: [
      { id:"KH001", name:"Nguyễn An", gender:"Nữ",  phone:"0987xxxxxx", wallet:120000 },
      { id:"KH014", name:"Trần Minh", gender:"Nam", phone:"0909xxxxxx", wallet:35000 },
    ],
    trips: [
      { id:"CD1001", customerId:"KH014", bikeId:"XE014", startStationId:"TR02", startTime:"19/12/2025 14:05", endTime:"",                fee:0,     status:"đang chạy" },
      { id:"CD1002", customerId:"KH001", bikeId:"XE001", startStationId:"TR01", startTime:"18/12/2025 09:12", endTime:"18/12/2025 09:45", fee:12000, status:"hoàn tất" },
    ],
    invoices: [
      { id:"HD2001", customerId:"KH014", type:"nạp tiền", amount: 50000, time:"19/12/2025 10:20", status:"thành công", ref:""      },
      { id:"HD2002", customerId:"KH001", type:"trả cước", amount:-12000, time:"18/12/2025 09:45", status:"thành công", ref:"CD1002"},
    ]
  };

  function getDB(){
    const raw = localStorage.getItem(dbKey);
    if(!raw){
      localStorage.setItem(dbKey, JSON.stringify(seed));
      return structuredClone(seed);
    }
    try { return JSON.parse(raw); }
    catch {
      localStorage.setItem(dbKey, JSON.stringify(seed));
      return structuredClone(seed);
    }
  }
  function saveDB(db){ localStorage.setItem(dbKey, JSON.stringify(db)); }

  function nextId(prefix, list){
    let max = 0;
    for(const x of list){
      const m = String(x.id || "").match(/\d+/);
      if(m) max = Math.max(max, parseInt(m[0], 10));
    }
    // prefix có thể là TR/XE/KH/CD/HD
    return prefix + String(max + 1).padStart(3, "0");
  }

  // =================== Page: Stations ===================
  function initStations(){
    const tbody = $("stationTbody");
    if(!tbody) return;

    const drawer = setupDrawer({
      overlayId: "stationOverlay",
      drawerId: "stationDrawer",
      closeId: "stationDrawerClose",
      cancelId: "btnCancelStation",
    });

    let mode = "add"; // add/edit
    let editingId = "";

    function openAdd(){
      mode = "add"; editingId = "";
      if ($("stationDrawerTitle")) $("stationDrawerTitle").textContent = "Thêm trạm";
      if ($("stationDrawerSub")) $("stationDrawerSub").textContent = "Nhập thông tin trạm và bấm Lưu";
      if ($("stationId")) { $("stationId").disabled = false; $("stationId").value = ""; }
      if ($("stationName")) $("stationName").value = "";
      if ($("stationAddress")) $("stationAddress").value = "";
      drawer.open();
      $("stationName")?.focus();
    }

    function openEdit(id){
      const db = getDB();
      const s = db.stations.find(x=>x.id===id);
      if(!s) return;

      mode = "edit"; editingId = id;
      if ($("stationDrawerTitle")) $("stationDrawerTitle").textContent = `Sửa trạm: ${id}`;
      if ($("stationDrawerSub")) $("stationDrawerSub").textContent = "Cập nhật thông tin và bấm Lưu";
      if ($("stationId")) { $("stationId").value = s.id; $("stationId").disabled = true; }
      if ($("stationName")) $("stationName").value = s.name;
      if ($("stationAddress")) $("stationAddress").value = s.address;
      drawer.open();
      $("stationName")?.focus();
    }

    function save(){
      const db = getDB();
      let id = toUpperTrim($("stationId")?.value);
      const name = trim($("stationName")?.value);
      const address = trim($("stationAddress")?.value);

      if(!name || !address) return alert("Nhập đủ Tên trạm và Địa chỉ!");

      if(mode === "add"){
        if(!id) id = nextId("TR", db.stations);
        if(db.stations.some(s=>s.id===id)) return alert("Mã trạm đã tồn tại!");
        db.stations.push({ id, name, address });
      } else {
        const idx = db.stations.findIndex(s=>s.id===editingId);
        if(idx < 0) return alert("Không tìm thấy trạm để cập nhật!");
        db.stations[idx] = { ...db.stations[idx], name, address };
      }

      saveDB(db);
      render();
      // refresh các trang khác nếu đang mở
      renderBikesTable?.();
      drawer.close();
    }

    function del(id){
      const sess = getSession();
      if (!guardDelete(sess?.role)) return;
      if(!confirm("Xoá trạm " + id + " ?")) return;

      const db = getDB();
      db.stations = db.stations.filter(s=>s.id!==id);

      // Option: nếu có xe đang gắn trạm bị xóa => giữ stationId cũ (demo), hoặc set rỗng
      db.bikes = db.bikes.map(b => (b.stationId === id ? { ...b, stationId: "" } : b));

      saveDB(db);
      render();
    }

    function availableCount(db, stationId){
      return db.bikes.filter(b => b.stationId === stationId && b.status === "đang đậu").length;
    }

    function render(){
      const db = getDB();
      const q = (trim($("stationSearch")?.value)).toLowerCase();

      let list = db.stations;
      if(q){
        list = list.filter(s =>
          s.id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.address.toLowerCase().includes(q)
        );
      }

      tbody.innerHTML = list.map(s => `
        <tr>
          <td><b>${escapeHtml(s.id)}</b></td>
          <td>${escapeHtml(s.name)}</td>
          <td>${escapeHtml(s.address)}</td>
          <td style="text-align:center;font-weight:900">${availableCount(db, s.id)}</td>
          <td>
            <div class="row-actions">
              <button class="btn mini" data-edit-station="${escapeHtml(s.id)}"><i class="fa-solid fa-pen"></i>Sửa</button>
              <button class="btn mini danger" data-del-station="${escapeHtml(s.id)}"><i class="fa-solid fa-trash"></i>Xoá</button>
            </div>
          </td>
        </tr>
      `).join("") || `
        <tr><td colspan="5" style="padding:18px;color:#64748b;text-align:center">Không có dữ liệu</td></tr>
      `;

      lockDeleteButtonsIfNeeded();
    }

    // events
    $("btnOpenAddStation")?.addEventListener("click", openAdd);
    $("btnSaveStation")?.addEventListener("click", save);
    $("stationSearch")?.addEventListener("input", render);
    $("exportStations")?.addEventListener("click", () => exportCSV("tram-xe.csv", getDB().stations));

    tbody.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit-station]")?.dataset.editStation;
      const delId = e.target.closest("[data-del-station]")?.dataset.delStation;
      if(edit) openEdit(edit);
      if(delId) del(delId);
    });

    render();
  }

  // =================== Page: Bikes ===================
  let renderBikesTable = null;
  function initBikes(){
    const tbody = $("bikeTbody");
    if(!tbody) return;

    const drawer = setupDrawer({
      overlayId: "bikeOverlay",
      drawerId: "bikeDrawer",
      closeId: "bikeDrawerClose",
      cancelId: "btnCancelBike",
    });

    let mode = "add";
    let editingId = "";

    function fillStationsSelects(){
      const db = getDB();
      const filterSel = $("bikeStationFilter");
      const formSel = $("bikeStation");

      if(filterSel && filterSel.dataset.filled !== "1"){
        filterSel.innerHTML = `<option value="">Lọc theo trạm</option>` +
          db.stations.map(s=>`<option value="${s.id}">${s.id} - ${escapeHtml(s.name)}</option>`).join("");
        filterSel.dataset.filled = "1";
      }

      if(formSel){
        formSel.innerHTML = db.stations.map(s=>`<option value="${s.id}">${s.id} - ${escapeHtml(s.name)}</option>`).join("");
      }
    }

    function openAdd(){
      mode = "add"; editingId = "";
      $("bikeDrawerTitle") && ($("bikeDrawerTitle").textContent = "Thêm xe");
      $("bikeDrawerSub") && ($("bikeDrawerSub").textContent = "Nhập thông tin xe và bấm Lưu");
      if ($("bikeId")) { $("bikeId").disabled = false; $("bikeId").value = ""; }
      $("bikeStatus") && ($("bikeStatus").value = "đang đậu");
      fillStationsSelects();
      drawer.open();
      $("bikeId")?.focus();
    }

    function openEdit(id){
      const db = getDB();
      const b = db.bikes.find(x=>x.id===id);
      if(!b) return;

      mode = "edit"; editingId = id;
      $("bikeDrawerTitle") && ($("bikeDrawerTitle").textContent = `Sửa xe: ${id}`);
      $("bikeDrawerSub") && ($("bikeDrawerSub").textContent = "Cập nhật thông tin và bấm Lưu");
      if ($("bikeId")) { $("bikeId").value = b.id; $("bikeId").disabled = true; }
      $("bikeStatus") && ($("bikeStatus").value = b.status);
      fillStationsSelects();
      $("bikeStation") && ($("bikeStation").value = b.stationId || "");
      drawer.open();
      $("bikeStatus")?.focus();
    }

    function save(){
      const db = getDB();
      let id = toUpperTrim($("bikeId")?.value);
      const status = $("bikeStatus")?.value || "đang đậu";
      const stationId = $("bikeStation")?.value || "";

      if(mode === "add"){
        if(!id) id = nextId("XE", db.bikes);
        if(db.bikes.some(b=>b.id===id)) return alert("Mã xe đã tồn tại!");
        if(!stationId) return alert("Vui lòng chọn trạm quản lý!");
        db.bikes.push({ id, status, stationId });
      } else {
        const idx = db.bikes.findIndex(b=>b.id===editingId);
        if(idx < 0) return alert("Không tìm thấy xe để cập nhật!");
        db.bikes[idx] = { ...db.bikes[idx], status, stationId };
      }

      saveDB(db);
      render();
      drawer.close();
      // update trạm xe khả dụng nếu đang ở trang trạm
      // (trang khác sẽ tự render lại khi load)
    }

    function del(id){
      const sess = getSession();
      if (!guardDelete(sess?.role)) return;
      if(!confirm("Xoá xe " + id + " ?")) return;

      const db = getDB();
      db.bikes = db.bikes.filter(b=>b.id!==id);
      saveDB(db);
      render();
      lockDeleteButtonsIfNeeded();
    }

    function stationName(db, id){
      return db.stations.find(s=>s.id===id)?.name || id || "-";
    }

    function render(){
      const db = getDB();
      fillStationsSelects();

      const q = trim($("bikeSearch")?.value).toLowerCase();
      const status = $("bikeStatusFilter")?.value || "";
      const station = $("bikeStationFilter")?.value || "";

      let list = db.bikes;
      if(q) list = list.filter(b => b.id.toLowerCase().includes(q));
      if(status) list = list.filter(b => b.status === status);
      if(station) list = list.filter(b => b.stationId === station);

      tbody.innerHTML = list.map(b => {
        const badgeClass = b.status==="đang đậu" ? "ok" : (b.status==="đang thuê" ? "warn" : "bad");
        return `
          <tr>
            <td><b>${escapeHtml(b.id)}</b></td>
            <td><span class="badge ${badgeClass}">${escapeHtml(b.status)}</span></td>
            <td>${escapeHtml(b.stationId)} - ${escapeHtml(stationName(db, b.stationId))}</td>
            <td>
              <div class="row-actions">
                <button class="btn mini" data-edit-bike="${escapeHtml(b.id)}"><i class="fa-solid fa-pen"></i>Sửa</button>
                <button class="btn mini danger" data-del-bike="${escapeHtml(b.id)}"><i class="fa-solid fa-trash"></i>Xoá</button>
              </div>
            </td>
          </tr>
        `;
      }).join("") || `
        <tr><td colspan="4" style="padding:18px;color:#64748b;text-align:center">Không có dữ liệu</td></tr>
      `;

      lockDeleteButtonsIfNeeded();
    }

    // expose render for station page refresh if needed
    renderBikesTable = render;

    // events
    $("btnOpenAddBike")?.addEventListener("click", openAdd);
    $("btnSaveBike")?.addEventListener("click", save);
    $("bikeSearch")?.addEventListener("input", render);
    $("bikeStatusFilter")?.addEventListener("change", render);
    $("bikeStationFilter")?.addEventListener("change", render);
    $("exportBikes")?.addEventListener("click", () => exportCSV("xe-dap.csv", getDB().bikes));

    tbody.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit-bike]")?.dataset.editBike;
      const delId = e.target.closest("[data-del-bike]")?.dataset.delBike;
      if(edit) openEdit(edit);
      if(delId) del(delId);
    });

    render();
  }

  // =================== Page: Customers ===================
  function initCustomers(){
    const tbody = $("customerTbody");
    if(!tbody) return;

    const drawer = setupDrawer({
      overlayId: "customerOverlay",
      drawerId: "customerDrawer",
      closeId: "customerDrawerClose",
      cancelId: "btnCancelCustomer",
    });

    let mode = "add";
    let editingId = "";

    function openAdd(){
      mode = "add"; editingId = "";
      $("customerDrawerTitle") && ($("customerDrawerTitle").textContent = "Thêm khách hàng");
      $("customerDrawerSub") && ($("customerDrawerSub").textContent = "Nhập thông tin và bấm Lưu");
      if ($("customerId")) { $("customerId").disabled = false; $("customerId").value = ""; }
      $("customerName") && ($("customerName").value = "");
      $("customerGender") && ($("customerGender").value = "Nữ");
      $("customerPhone") && ($("customerPhone").value = "");
      $("customerWallet") && ($("customerWallet").value = 0);

      // topup: chỉ cho khi đang sửa/đã có id
      $("topupAmount") && ($("topupAmount").value = "");
      $("topupStatus") && ($("topupStatus").value = "thành công");
      $("btnTopup") && ($("btnTopup").disabled = true);

      drawer.open();
      $("customerName")?.focus();
    }

    function openEdit(id){
      const db = getDB();
      const c = db.customers.find(x=>x.id===id);
      if(!c) return;

      mode = "edit"; editingId = id;
      $("customerDrawerTitle") && ($("customerDrawerTitle").textContent = `Sửa khách hàng: ${id}`);
      $("customerDrawerSub") && ($("customerDrawerSub").textContent = "Cập nhật thông tin / nạp tiền và bấm Lưu");
      if ($("customerId")) { $("customerId").value = c.id; $("customerId").disabled = true; }
      $("customerName") && ($("customerName").value = c.name);
      $("customerGender") && ($("customerGender").value = c.gender);
      $("customerPhone") && ($("customerPhone").value = c.phone);
      $("customerWallet") && ($("customerWallet").value = Number(c.wallet||0));

      $("topupAmount") && ($("topupAmount").value = "");
      $("topupStatus") && ($("topupStatus").value = "thành công");
      $("btnTopup") && ($("btnTopup").disabled = false);

      drawer.open();
      $("customerName")?.focus();
    }

    function validatePhoneVN(p){
      const s = String(p||"").trim();
      if(!s) return true; // allow demo
      // mềm thôi: 9-11 số
      const only = s.replace(/\D/g,"");
      return only.length >= 9 && only.length <= 11;
    }

    function save(){
      const db = getDB();
      let id = toUpperTrim($("customerId")?.value);
      const name = trim($("customerName")?.value);
      const gender = $("customerGender")?.value || "Nữ";
      const phone = trim($("customerPhone")?.value);
      const wallet = Number($("customerWallet")?.value || 0);

      if(!name) return alert("Họ tên không được để trống!");
      if(!validatePhoneVN(phone)) return alert("SĐT không hợp lệ (demo: 9-11 số).");
      if(wallet < 0) return alert("Số dư ví không được âm!");

      if(mode === "add"){
        if(!id) id = nextId("KH", db.customers);
        if(db.customers.some(c=>c.id===id)) return alert("Mã KH đã tồn tại!");
        db.customers.push({ id, name, gender, phone, wallet });
        // sau khi thêm xong: chuyển sang edit để có thể nạp tiền nếu muốn
      } else {
        const idx = db.customers.findIndex(c=>c.id===editingId);
        if(idx < 0) return alert("Không tìm thấy khách hàng để cập nhật!");
        db.customers[idx] = { ...db.customers[idx], name, gender, phone, wallet };
      }

      saveDB(db);
      render();
      drawer.close();
    }

    function topup(){
      if(!editingId) return alert("Hãy lưu khách hàng trước khi nạp tiền.");
      const db = getDB();
      const idx = db.customers.findIndex(c=>c.id===editingId);
      if(idx < 0) return alert("Không tìm thấy khách hàng.");

      const amount = Number($("topupAmount")?.value || 0);
      const status = $("topupStatus")?.value || "thành công";
      if(amount <= 0) return alert("Số tiền nạp phải > 0");

      const invId = nextId("HD", db.invoices);
      const time = nowStr();

      if(status === "thành công"){
        db.customers[idx].wallet = Number(db.customers[idx].wallet || 0) + amount;
      }

      db.invoices.push({
        id: invId,
        customerId: editingId,
        type: "nạp tiền",
        amount: amount,
        time,
        status,
        ref: ""
      });

      saveDB(db);
      render();
      alert(status === "thành công" ? "Nạp tiền thành công!" : "Nạp tiền thất bại (đã lưu hoá đơn).");
    }

    function del(id){
      const sess = getSession();
      if (!guardDelete(sess?.role)) return;
      if(!confirm("Xoá khách hàng " + id + " ?")) return;

      const db = getDB();
      db.customers = db.customers.filter(c=>c.id!==id);
      saveDB(db);
      render();
      lockDeleteButtonsIfNeeded();
    }

    function render(){
      const db = getDB();
      const q = trim($("customerSearch")?.value).toLowerCase();
      const gender = $("customerGenderFilter")?.value || "";

      let list = db.customers;
      if(q){
        list = list.filter(c =>
          c.id.toLowerCase().includes(q) ||
          (c.phone||"").toLowerCase().includes(q) ||
          (c.name||"").toLowerCase().includes(q)
        );
      }
      if(gender) list = list.filter(c => c.gender === gender);

      tbody.innerHTML = list.map(c => `
        <tr>
          <td><b>${escapeHtml(c.id)}</b></td>
          <td>${escapeHtml(c.name)}</td>
          <td>${escapeHtml(c.gender)}</td>
          <td>${escapeHtml(c.phone)}</td>
          <td style="font-weight:900;color:#16a34a">${money(c.wallet)}</td>
          <td>
            <div class="row-actions">
              <button class="btn mini" data-edit-customer="${escapeHtml(c.id)}"><i class="fa-solid fa-pen"></i>Sửa</button>
              <button class="btn mini danger" data-del-customer="${escapeHtml(c.id)}"><i class="fa-solid fa-trash"></i>Xoá</button>
            </div>
          </td>
        </tr>
      `).join("") || `
        <tr><td colspan="6" style="padding:18px;color:#64748b;text-align:center">Không có dữ liệu</td></tr>
      `;

      lockDeleteButtonsIfNeeded();
    }

    // events
    $("btnOpenAddCustomer")?.addEventListener("click", openAdd);
    $("btnSaveCustomer")?.addEventListener("click", save);
    $("btnTopup")?.addEventListener("click", topup);

    $("customerSearch")?.addEventListener("input", render);
    $("customerGenderFilter")?.addEventListener("change", render);
    $("exportCustomers")?.addEventListener("click", () => exportCSV("khach-hang.csv", getDB().customers));

    tbody.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit-customer]")?.dataset.editCustomer;
      const delId = e.target.closest("[data-del-customer]")?.dataset.delCustomer;
      if(edit) openEdit(edit);
      if(delId) del(delId);
    });

    render();
  }

  // =================== Page: Trips ===================
  function initTrips(){
    const tbody = $("tripTbody");
    if(!tbody) return;

    const drawer = setupDrawer({
      overlayId: "tripOverlay",
      drawerId: "tripDrawer",
      closeId: "tripDrawerClose",
      cancelId: "btnCancelTrip",
    });

    let mode = "add";
    let editingId = "";

    function openAdd(){
      mode = "add"; editingId = "";
      $("tripDrawerTitle") && ($("tripDrawerTitle").textContent = "Thêm chuyến");
      $("tripDrawerSub") && ($("tripDrawerSub").textContent = "Nhập thông tin và bấm Lưu");
      if ($("tripId")) { $("tripId").disabled = false; $("tripId").value = ""; }
      $("tripCustomerId") && ($("tripCustomerId").value = "");
      $("tripBikeId") && ($("tripBikeId").value = "");
      $("tripStationId") && ($("tripStationId").value = "");
      if ($("tripStartTime")) $("tripStartTime").value = ""; // để trống -> auto now
      drawer.open();
      $("tripCustomerId")?.focus();
    }

    function openEdit(id){
      const db = getDB();
      const t = db.trips.find(x=>x.id===id);
      if(!t) return;

      mode = "edit"; editingId = id;
      $("tripDrawerTitle") && ($("tripDrawerTitle").textContent = `Sửa chuyến: ${id}`);
      $("tripDrawerSub") && ($("tripDrawerSub").textContent = "Cập nhật thông tin và bấm Lưu");
      if ($("tripId")) { $("tripId").value = t.id; $("tripId").disabled = true; }
      $("tripCustomerId") && ($("tripCustomerId").value = t.customerId);
      $("tripBikeId") && ($("tripBikeId").value = t.bikeId);
      $("tripStationId") && ($("tripStationId").value = t.startStationId);

      // tripStartTime là datetime-local; dữ liệu lưu dạng dd/mm/yyyy hh:mm => không convert lại (demo)
      // nên khi edit, để trống; user có thể sửa lại
      if ($("tripStartTime")) $("tripStartTime").value = "";

      drawer.open();
      $("tripCustomerId")?.focus();
    }

    function save(){
      const db = getDB();
      let id = toUpperTrim($("tripId")?.value);
      const customerId = toUpperTrim($("tripCustomerId")?.value);
      const bikeId = toUpperTrim($("tripBikeId")?.value);
      const stationId = toUpperTrim($("tripStationId")?.value);

      if(!customerId || !bikeId || !stationId) return alert("Nhập đủ Mã KH, Mã xe, Trạm bắt đầu!");

      const cus = db.customers.find(c=>c.id===customerId);
      if(!cus) return alert("Mã KH không tồn tại!");
      const bike = db.bikes.find(b=>b.id===bikeId);
      if(!bike) return alert("Mã xe không tồn tại!");

      // start time
      let startTimeText = "";
      const startLocal = $("tripStartTime")?.value; // YYYY-MM-DDTHH:mm
      if(startLocal){
        const d = new Date(startLocal);
        const pad = (x)=> String(x).padStart(2,"0");
        startTimeText = `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } else {
        startTimeText = nowStr();
      }

      if(mode === "add"){
        if(!id) id = nextId("CD", db.trips);
        if(db.trips.some(t=>t.id===id)) return alert("Mã chuyến đã tồn tại!");

        db.trips.push({
          id,
          customerId,
          bikeId,
          startStationId: stationId,
          startTime: startTimeText,
          endTime: "",
          fee: 0,
          status: "đang chạy"
        });

        // update bike
        bike.status = "đang thuê";
        bike.stationId = stationId;

      } else {
        const idx = db.trips.findIndex(t=>t.id===editingId);
        if(idx < 0) return alert("Không tìm thấy chuyến để cập nhật!");

        // chỉ cho sửa chuyến chưa hoàn tất
        if(db.trips[idx].status !== "đang chạy"){
          return alert("Chỉ chỉnh sửa chuyến đang chạy (demo).");
        }

        db.trips[idx] = {
          ...db.trips[idx],
          customerId,
          bikeId,
          startStationId: stationId,
          startTime: startTimeText || db.trips[idx].startTime
        };
      }

      saveDB(db);
      render();
      drawer.close();
    }

    function finishTrip(id){
      const db = getDB();
      const t = db.trips.find(x=>x.id===id);
      if(!t) return;

      if(t.status !== "đang chạy") return;

      // fee demo: 12000 cố định
      const fee = 12000;
      const endTime = nowStr();

      t.endTime = endTime;
      t.fee = fee;
      t.status = "hoàn tất";

      // invoice trả cước
      const invId = nextId("HD", db.invoices);
      const cus = db.customers.find(c=>c.id===t.customerId);
      let invStatus = "thành công";

      if(cus){
        if(Number(cus.wallet||0) >= fee){
          cus.wallet = Number(cus.wallet||0) - fee;
        } else {
          invStatus = "thất bại";
        }
      } else {
        invStatus = "thất bại";
      }

      db.invoices.push({
        id: invId,
        customerId: t.customerId,
        type: "trả cước",
        amount: -fee,
        time: endTime,
        status: invStatus,
        ref: t.id
      });

      // trả xe về trạm bắt đầu (demo)
      const bike = db.bikes.find(b=>b.id===t.bikeId);
      if(bike){
        bike.status = "đang đậu";
        bike.stationId = t.startStationId;
      }

      saveDB(db);
      render();
      alert(invStatus === "thành công" ? "Đã kết thúc chuyến và trừ ví." : "Kết thúc chuyến nhưng trừ ví thất bại (đã lưu hoá đơn).");
    }

    function del(id){
      const sess = getSession();
      if (!guardDelete(sess?.role)) return;
      if(!confirm("Xoá chuyến đi " + id + " ?")) return;

      const db = getDB();
      db.trips = db.trips.filter(t=>t.id!==id);
      saveDB(db);
      render();
      lockDeleteButtonsIfNeeded();
    }

    function cusName(db, id){
      return db.customers.find(c=>c.id===id)?.name || id;
    }

    function render(){
      const db = getDB();
      const q = trim($("tripSearch")?.value).toLowerCase();
      const status = $("tripStatusFilter")?.value || "";

      let list = db.trips;
      if(q){
        list = list.filter(t =>
          t.id.toLowerCase().includes(q) ||
          (t.customerId||"").toLowerCase().includes(q) ||
          (t.bikeId||"").toLowerCase().includes(q)
        );
      }
      if(status) list = list.filter(t => t.status === status);

      tbody.innerHTML = list.map(t => {
        const badgeClass = t.status==="đang chạy" ? "warn" : "ok";
        return `
          <tr>
            <td><b>${escapeHtml(t.id)}</b></td>
            <td>${escapeHtml(t.customerId)} - ${escapeHtml(cusName(db, t.customerId))}</td>
            <td>${escapeHtml(t.bikeId)}</td>
            <td>${escapeHtml(t.startStationId)}</td>
            <td>${escapeHtml(t.startTime)}</td>
            <td>${escapeHtml(t.endTime || "-")}</td>
            <td>${t.fee ? money(t.fee) : "-"}</td>
            <td><span class="badge ${badgeClass}">${escapeHtml(t.status)}</span></td>
            <td>
              <div class="row-actions">
                ${
                  t.status==="đang chạy"
                    ? `<button class="btn mini" data-end-trip="${escapeHtml(t.id)}"><i class="fa-solid fa-flag-checkered"></i>Kết thúc</button>`
                    : `<button class="btn mini" data-edit-trip="${escapeHtml(t.id)}"><i class="fa-solid fa-pen"></i>Sửa</button>`
                }
                <button class="btn mini danger" data-del-trip="${escapeHtml(t.id)}"><i class="fa-solid fa-trash"></i>Xoá</button>
              </div>
            </td>
          </tr>
        `;
      }).join("") || `
        <tr><td colspan="9" style="padding:18px;color:#64748b;text-align:center">Không có dữ liệu</td></tr>
      `;

      lockDeleteButtonsIfNeeded();
    }

    // events
    $("btnOpenAddTrip")?.addEventListener("click", openAdd);
    $("btnSaveTrip")?.addEventListener("click", save);

    // finish inside drawer (nếu đang edit chuyến đang chạy)
    $("btnFinishTrip")?.addEventListener("click", () => {
      if(!editingId) return alert("Hãy mở một chuyến đang chạy để kết thúc.");
      finishTrip(editingId);
      drawer.close();
    });

    $("tripSearch")?.addEventListener("input", render);
    $("tripStatusFilter")?.addEventListener("change", render);
    $("exportTrips")?.addEventListener("click", () => exportCSV("chuyen-di.csv", getDB().trips));

    tbody.addEventListener("click", (e) => {
      const endId = e.target.closest("[data-end-trip]")?.dataset.endTrip;
      const edit = e.target.closest("[data-edit-trip]")?.dataset.editTrip;
      const delId = e.target.closest("[data-del-trip]")?.dataset.delTrip;

      if(endId) finishTrip(endId);
      if(edit) openEdit(edit);
      if(delId) del(delId);
    });

    render();
  }

  // =================== Page: Invoices ===================
  function initInvoices(){
    const tbody = $("invoiceTbody");
    if(!tbody) return;

    const drawer = setupDrawer({
      overlayId: "invoiceOverlay",
      drawerId: "invoiceDrawer",
      closeId: "invoiceDrawerClose",
      cancelId: "btnCancelInvoice",
    });

    let mode = "add";
    let editingId = "";

    function openAdd(){
      mode = "add"; editingId = "";
      $("invoiceDrawerTitle") && ($("invoiceDrawerTitle").textContent = "Thêm hoá đơn");
      $("invoiceDrawerSub") && ($("invoiceDrawerSub").textContent = "Nhập thông tin hoá đơn và bấm Lưu");
      if ($("invoiceId")) { $("invoiceId").disabled = false; $("invoiceId").value = ""; }
      $("invoiceCustomerId") && ($("invoiceCustomerId").value = "");
      $("invoiceType") && ($("invoiceType").value = "nạp tiền");
      $("invoiceAmount") && ($("invoiceAmount").value = "");
      $("invoiceStatus") && ($("invoiceStatus").value = "thành công");
      drawer.open();
      $("invoiceCustomerId")?.focus();
    }

    function openEdit(id){
      const db = getDB();
      const inv = db.invoices.find(x=>x.id===id);
      if(!inv) return;

      mode = "edit"; editingId = id;
      $("invoiceDrawerTitle") && ($("invoiceDrawerTitle").textContent = `Sửa hoá đơn: ${id}`);
      $("invoiceDrawerSub") && ($("invoiceDrawerSub").textContent = "Cập nhật thông tin và bấm Lưu");
      if ($("invoiceId")) { $("invoiceId").value = inv.id; $("invoiceId").disabled = true; }
      $("invoiceCustomerId") && ($("invoiceCustomerId").value = inv.customerId);
      $("invoiceType") && ($("invoiceType").value = inv.type);
      $("invoiceAmount") && ($("invoiceAmount").value = inv.amount);
      $("invoiceStatus") && ($("invoiceStatus").value = inv.status);
      drawer.open();
      $("invoiceCustomerId")?.focus();
    }

    function save(){
      const db = getDB();
      let id = toUpperTrim($("invoiceId")?.value);
      const customerId = toUpperTrim($("invoiceCustomerId")?.value);
      const type = $("invoiceType")?.value || "nạp tiền";
      const amount = Number($("invoiceAmount")?.value || 0);
      const status = $("invoiceStatus")?.value || "thành công";

      if(!customerId) return alert("Nhập mã KH!");
      if(!db.customers.some(c=>c.id===customerId)) return alert("Mã KH không tồn tại!");
      if(!amount) return alert("Nhập số tiền!");

      if(mode === "add"){
        if(!id) id = nextId("HD", db.invoices);
        if(db.invoices.some(i=>i.id===id)) return alert("Mã HĐ đã tồn tại!");
        db.invoices.push({ id, customerId, type, amount, time: nowStr(), status, ref: "" });

        // Nếu là nạp tiền thành công thì cộng ví
        if(type === "nạp tiền" && status === "thành công"){
          const c = db.customers.find(x=>x.id===customerId);
          c.wallet = Number(c.wallet||0) + Math.abs(amount);
        }
      } else {
        const idx = db.invoices.findIndex(i=>i.id===editingId);
        if(idx < 0) return alert("Không tìm thấy hoá đơn!");

        db.invoices[idx] = {
          ...db.invoices[idx],
          customerId,
          type,
          amount,
          status
        };
      }

      saveDB(db);
      render();
      drawer.close();
    }

    function del(id){
      const sess = getSession();
      if (!guardDelete(sess?.role)) return;
      if(!confirm("Xoá hoá đơn " + id + " ?")) return;

      const db = getDB();
      db.invoices = db.invoices.filter(i=>i.id!==id);
      saveDB(db);
      render();
      lockDeleteButtonsIfNeeded();
    }

    function render(){
      const db = getDB();
      const q = trim($("invoiceSearch")?.value).toLowerCase();
      const type = $("invoiceTypeFilter")?.value || "";

      let list = db.invoices;
      if(q){
        list = list.filter(i =>
          i.id.toLowerCase().includes(q) ||
          i.customerId.toLowerCase().includes(q)
        );
      }
      if(type) list = list.filter(i => i.type === type);

      tbody.innerHTML = list.map(i => `
        <tr>
          <td><b>${escapeHtml(i.id)}</b></td>
          <td>${escapeHtml(i.customerId)}</td>
          <td>${escapeHtml(i.type)}</td>
          <td style="font-weight:900; ${Number(i.amount)>=0 ? "color:#16a34a" : "color:#991b1b"}">${money(i.amount)}</td>
          <td>${escapeHtml(i.time)}</td>
          <td><span class="badge ok">${escapeHtml(i.status)}</span></td>
          <td>${escapeHtml(i.ref || "-")}</td>
          <td>
            <div class="row-actions">
              <button class="btn mini" data-edit-invoice="${escapeHtml(i.id)}"><i class="fa-solid fa-pen"></i>Sửa</button>
              <button class="btn mini danger" data-del-invoice="${escapeHtml(i.id)}"><i class="fa-solid fa-trash"></i>Xoá</button>
            </div>
          </td>
        </tr>
      `).join("") || `
        <tr><td colspan="8" style="padding:18px;color:#64748b;text-align:center">Không có dữ liệu</td></tr>
      `;

      lockDeleteButtonsIfNeeded();
    }

    // events
    $("btnOpenAddInvoice")?.addEventListener("click", openAdd);
    $("btnSaveInvoice")?.addEventListener("click", save);

    $("invoiceSearch")?.addEventListener("input", render);
    $("invoiceTypeFilter")?.addEventListener("change", render);
    $("exportInvoices")?.addEventListener("click", () => exportCSV("hoa-don.csv", getDB().invoices));

    tbody.addEventListener("click", (e) => {
      const edit = e.target.closest("[data-edit-invoice]")?.dataset.editInvoice;
      const delId = e.target.closest("[data-del-invoice]")?.dataset.delInvoice;
      if(edit) openEdit(edit);
      if(delId) del(delId);
    });

    render();
  }

  // =================== boot ===================
  function boot(){
    // seed db once
    getDB();

    // init per page if elements exist
    initStations();
    initBikes();
    initCustomers();
    initTrips();
    initInvoices();

    lockDeleteButtonsIfNeeded();
  }

  window.addEventListener("DOMContentLoaded", boot);

  // expose cho login page
  window.handleLogin = handleLogin;
  window.logout = logout;
})();
