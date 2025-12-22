(() => {
  // tránh load 2 lần (phòng khi bạn include trùng)
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

  // Chuẩn hoá SĐT: chỉ giữ số (bỏ khoảng trắng, dấu chấm, +84...)
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

  function canDelete(role) {
    return role === "QUANTRIVIEN";
  }

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
  const $ = (sel, root = document) => {
    if (!sel) return null;
    if (sel.startsWith("#") || sel.startsWith(".") || sel.includes("[") || sel.includes(" ")) {
      return root.querySelector(sel);
    }
    return root.getElementById(sel);
  };
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const money = (n) => (Number(n || 0)).toLocaleString("vi-VN") + "đ";
  const nowStr = () => {
    const d = new Date();
    const pad = (x) => String(x).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // ✅ NEW: cuộn tới form + highlight + focus
  function scrollToAndFocusByFieldIds(fieldIds) {
    let el = null;
    for (const id of fieldIds) {
      const x = document.getElementById(id);
      if (x) { el = x; break; }
    }
    if (!el) return;

    const container =
      el.closest("form") ||
      el.closest(".right") ||
      el.closest(".panel") ||
      el.closest(".card") ||
      el.parentElement;

    (container || el).scrollIntoView({ behavior: "smooth", block: "start" });

    const box = container || el;
    const old = box.style.boxShadow;
    box.style.boxShadow = "0 0 0 3px rgba(229,9,20,0.35), 0 12px 30px rgba(0,0,0,0.20)";
    setTimeout(() => { box.style.boxShadow = old; }, 1200);

    setTimeout(() => {
      el.focus();
      try { el.select?.(); } catch {}
    }, 250);
  }

  // ✅ NEW: tắt/ẩn mô phỏng “phiếu nạp tiền vào ví” trên trang khách hàng (nếu có)
  function disableWalletTopupMockUI() {
    // Nếu bạn có vùng mô phỏng, đặt id/class theo các tên dưới là sẽ tự ẩn
    const maybeBlocks = [
      "#topupMock",
      "#walletTopup",
      "#napTienVi",
      ".topup-mock",
      ".wallet-topup",
      ".nap-tien-vi",
      "[data-topup-mock]"
    ];
    maybeBlocks.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = "none";
      });
    });

    // Nếu có nút bấm mô phỏng nạp tiền thì vô hiệu hoá
    const maybeBtns = [
      "#btnTopup",
      "#btnNapTien",
      "[data-topup]",
      "[data-action='topup']"
    ];
    maybeBtns.forEach(sel => {
      document.querySelectorAll(sel).forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.pointerEvents = "none";
        btn.title = "Chức năng mô phỏng nạp tiền đã tắt";
      });
    });
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
    return prefix + String(max + 1).padStart(3, "0");
  }

  function exportCSV(filename, rows){
    if(!rows.length){ alert("Không có dữ liệu để xuất!"); return; }
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

  function setActiveMenu(){
    const path = location.pathname.split("/").pop() || "index.html";
    $$(".menu-item").forEach(a => a.classList.toggle("active", a.getAttribute("href") === path));
  }

  // =================== Render: Stations (NO capacity) ===================
  function renderStations(){
    const tbody = $("stationTbody");
    if(!tbody) return;

    const db = getDB();
    const q = ($("stationSearch")?.value || "").trim().toLowerCase();

    let list = db.stations;
    if(q){
      list = list.filter(s =>
        s.id.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q)
      );
    }

    const availableCount = (stationId) =>
      db.bikes.filter(b => b.stationId === stationId && b.status === "đang đậu").length;

    tbody.innerHTML = list.map(s => `
      <tr>
        <td>${s.id}</td>
        <td>${s.name}</td>
        <td>${s.address}</td>
        <td style="font-weight:800">${availableCount(s.id)}</td>
        <td>
          <button class="btn ghost" data-edit-station="${s.id}"><i class="fa-solid fa-pen"></i>Sửa</button>
          <button class="btn danger" data-del-station="${s.id}"><i class="fa-solid fa-trash"></i>Xoá</button>
        </td>
      </tr>
    `).join("");

    lockDeleteButtonsIfNeeded();
  }

  // =================== Render: Bikes ===================
  function renderBikes(){
    const tbody = $("bikeTbody");
    if(!tbody) return;

    const db = getDB();
    const q = ($("bikeSearch")?.value || "").trim().toLowerCase();
    const status = $("bikeStatusFilter")?.value || "";
    const station = $("bikeStationFilter")?.value || "";

    const stationName = (id) => db.stations.find(s=>s.id===id)?.name || id;

    let list = db.bikes;
    if(q) list = list.filter(b => b.id.toLowerCase().includes(q));
    if(status) list = list.filter(b => b.status === status);
    if(station) list = list.filter(b => b.stationId === station);

    tbody.innerHTML = list.map(b => {
      const badgeClass = b.status==="đang đậu" ? "ok" : (b.status==="đang thuê" ? "warn" : "bad");
      return `
        <tr>
          <td>${b.id}</td>
          <td><span class="badge ${badgeClass}">${b.status}</span></td>
          <td>${b.stationId} - ${stationName(b.stationId)}</td>
          <td>
            <button class="btn ghost" data-edit-bike="${b.id}"><i class="fa-solid fa-pen"></i>Cập nhật</button>
            <button class="btn danger" data-del-bike="${b.id}"><i class="fa-solid fa-trash"></i>Xoá</button>
          </td>
        </tr>
      `;
    }).join("");

    const sel = $("bikeStationFilter");
    if(sel && sel.dataset.filled !== "1"){
      sel.innerHTML = `<option value="">Lọc theo trạm</option>` +
        db.stations.map(s=>`<option value="${s.id}">${s.id} - ${s.name}</option>`).join("");
      sel.dataset.filled = "1";
    }
    const sel2 = $("bikeStation");
    if(sel2 && sel2.dataset.filled !== "1"){
      sel2.innerHTML = db.stations.map(s=>`<option value="${s.id}">${s.id} - ${s.name}</option>`).join("");
      sel2.dataset.filled = "1";
    }
  }

  // =================== Render: Customers ===================
  function renderCustomers(){
    const tbody = $("customerTbody");
    if(!tbody) return;

    const db = getDB();
    const q = ($("customerSearch")?.value || "").trim().toLowerCase();
    const gender = $("customerGenderFilter")?.value || "";

    let list = db.customers;
    if(q){
      list = list.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
      );
    }
    if(gender) list = list.filter(c => c.gender === gender);

    tbody.innerHTML = list.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.gender}</td>
        <td>${c.phone}</td>
        <td style="font-weight:900;color:#16a34a">${money(c.wallet)}</td>
        <td>
          <button class="btn ghost" data-edit-customer="${c.id}"><i class="fa-solid fa-pen"></i>Sửa</button>
          <button class="btn danger" data-del-customer="${c.id}"><i class="fa-solid fa-trash"></i>Xoá</button>
        </td>
      </tr>
    `).join("");
  }

  // =================== Render: Trips ===================
  function renderTrips(){
    const tbody = $("tripTbody");
    if(!tbody) return;

    const db = getDB();
    const q = ($("tripSearch")?.value || "").trim().toLowerCase();
    const status = $("tripStatusFilter")?.value || "";

    const cusName = (id)=> db.customers.find(c=>c.id===id)?.name || id;

    let list = db.trips;
    if(q) list = list.filter(t =>
      t.id.toLowerCase().includes(q) ||
      t.customerId.toLowerCase().includes(q) ||
      t.bikeId.toLowerCase().includes(q)
    );
    if(status) list = list.filter(t => t.status === status);

    tbody.innerHTML = list.map(t => {
      const badgeClass = t.status==="đang chạy" ? "warn" : "ok";
      return `
        <tr>
          <td>${t.id}</td>
          <td>${t.customerId} - ${cusName(t.customerId)}</td>
          <td>${t.bikeId}</td>
          <td>${t.startStationId}</td>
          <td>${t.startTime}</td>
          <td>${t.endTime || "-"}</td>
          <td>${t.fee ? money(t.fee) : "-"}</td>
          <td><span class="badge ${badgeClass}">${t.status}</span></td>
          <td>
            ${t.status==="đang chạy"
              ? `<button class="btn primary" data-end-trip="${t.id}"><i class="fa-solid fa-flag-checkered"></i>Kết thúc</button>`
              : `<button class="btn ghost" data-edit-trip="${t.id}"><i class="fa-solid fa-pen"></i>Sửa</button>`
            }
            <button class="btn danger" data-del-trip="${t.id}"><i class="fa-solid fa-trash"></i>Xoá</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  // =================== Render: Invoices ===================
  function renderInvoices(){
    const tbody = $("invoiceTbody");
    if(!tbody) return;

    const db = getDB();
    const q = ($("invoiceSearch")?.value || "").trim().toLowerCase();
    const type = $("invoiceTypeFilter")?.value || "";

    let list = db.invoices;
    if(q) list = list.filter(i =>
      i.id.toLowerCase().includes(q) ||
      i.customerId.toLowerCase().includes(q)
    );
    if(type) list = list.filter(i => i.type === type);

    tbody.innerHTML = list.map(i => `
      <tr>
        <td>${i.id}</td>
        <td>${i.customerId}</td>
        <td>${i.type}</td>
        <td style="font-weight:900; ${i.amount>=0 ? "color:#16a34a" : "color:#991b1b"}">${money(i.amount)}</td>
        <td>${i.time}</td>
        <td><span class="badge ok">${i.status}</span></td>
        <td>${i.ref || "-"}</td>
        <td>
          <button class="btn ghost" data-edit-invoice="${i.id}"><i class="fa-solid fa-pen"></i>Sửa</button>
          <button class="btn danger" data-del-invoice="${i.id}"><i class="fa-solid fa-trash"></i>Xoá</button>
        </td>
      </tr>
    `).join("");
  }

  // =================== Reports (giữ nguyên) ===================
  function renderReports(){
    const k1 = $("kpiStations"), k2 = $("kpiBikes"), k3 = $("kpiRevenue");
    if(!k1 && !$("reportStationTbody") && !$("reportBikeTbody")) return;

    const db = getDB();
    if(k1) k1.textContent = db.stations.length;
    if(k2) k2.textContent = db.bikes.length;

    if(k3){
      const sum = db.invoices.reduce((a,x)=>a+Number(x.amount||0),0);
      k3.textContent = money(sum);
    }

    const stT = $("reportStationTbody");
    if(stT){
      stT.innerHTML = db.stations.map(s=>`
        <tr><td>${s.id}</td><td>${s.name}</td><td>${s.address}</td></tr>
      `).join("");
    }

    const bkT = $("reportBikeTbody");
    if(bkT){
      bkT.innerHTML = db.bikes.map(b=>`
        <tr><td>${b.id}</td><td>${b.status}</td><td>${b.stationId}</td></tr>
      `).join("");
    }

    const cusT = $("reportCustomerTbody");
    if(cusT){
      cusT.innerHTML = db.customers.map(c=>`
        <tr><td>${c.id}</td><td>${c.name}</td><td>${c.gender}</td><td>${c.phone}</td><td>${money(c.wallet)}</td></tr>
      `).join("");
    }

    const invT = $("reportInvoiceTbody");
    if(invT){
      invT.innerHTML = db.invoices.map(i=>`
        <tr><td>${i.id}</td><td>${i.customerId}</td><td>${i.type}</td><td>${money(i.amount)}</td><td>${i.time}</td><td>${i.status}</td></tr>
      `).join("");
    }
  }

  // =================== Actions ===================
  function bindActions(){
    $("stationSearch")?.addEventListener("input", renderStations);

    $("bikeSearch")?.addEventListener("input", renderBikes);
    $("bikeStatusFilter")?.addEventListener("change", renderBikes);
    $("bikeStationFilter")?.addEventListener("change", renderBikes);

    $("customerSearch")?.addEventListener("input", renderCustomers);
    $("customerGenderFilter")?.addEventListener("change", renderCustomers);

    $("tripSearch")?.addEventListener("input", renderTrips);
    $("tripStatusFilter")?.addEventListener("change", renderTrips);

    $("invoiceSearch")?.addEventListener("input", renderInvoices);
    $("invoiceTypeFilter")?.addEventListener("change", renderInvoices);

    $("exportStations")?.addEventListener("click", ()=> exportCSV("tram-xe.csv", getDB().stations));
    $("exportBikes")?.addEventListener("click", ()=> exportCSV("xe-dap.csv", getDB().bikes));
    $("exportCustomers")?.addEventListener("click", ()=> exportCSV("khach-hang.csv", getDB().customers));
    $("exportTrips")?.addEventListener("click", ()=> exportCSV("chuyen-di.csv", getDB().trips));
    $("exportInvoices")?.addEventListener("click", ()=> exportCSV("hoa-don.csv", getDB().invoices));

    // ===== Add/Save Station (NO capacity) =====
    $("btnAddStation")?.addEventListener("click", ()=>{
      const db = getDB();
      const id = ($("stationId")?.value.trim() || nextId("TR", db.stations));
      const name = $("stationName")?.value.trim();
      const address = $("stationAddress")?.value.trim();

      if(!name || !address) return alert("Nhập đủ thông tin trạm!");
      if(db.stations.some(s=>s.id===id)) return alert("Mã trạm đã tồn tại!");

      db.stations.push({id, name, address});
      saveDB(db);

      renderStations(); renderBikes(); renderReports();
      lockDeleteButtonsIfNeeded();
      alert("Đã thêm trạm!");
    });

    // ✅ ONE listener cho tất cả trang: Edit/Delete + cuộn đến form
    document.addEventListener("click", (e) => {
      const db = getDB();
      const sess = getSession();

      // ===== Stations =====
      const es = e.target.closest("[data-edit-station]")?.dataset.editStation;
      const ds = e.target.closest("[data-del-station]")?.dataset.delStation;

      if (es) {
        const s = db.stations.find(x => x.id === es);
        if (!s) return;

        if ($("stationId")) $("stationId").value = s.id;
        if ($("stationName")) $("stationName").value = s.name;
        if ($("stationAddress")) $("stationAddress").value = s.address;

        scrollToAndFocusByFieldIds(["stationName", "stationId", "stationAddress"]);
        return;
      }

      if (ds) {
        if (!guardDelete(sess?.role)) return;
        if (!confirm("Xoá trạm " + ds + " ?")) return;
        db.stations = db.stations.filter(x => x.id !== ds);
        saveDB(db);
        renderStations(); renderBikes(); renderReports();
        lockDeleteButtonsIfNeeded();
        return;
      }

      // ===== Bikes =====
      const eb = e.target.closest("[data-edit-bike]")?.dataset.editBike;
      const dbk = e.target.closest("[data-del-bike]")?.dataset.delBike;

      if (eb) {
        const b = db.bikes.find(x => x.id === eb);
        if (!b) return;

        if ($("bikeId")) $("bikeId").value = b.id;
        if ($("bikeStatus")) $("bikeStatus").value = b.status;
        if ($("bikeStation")) $("bikeStation").value = b.stationId;

        scrollToAndFocusByFieldIds(["bikeId", "bikeStatus", "bikeStation"]);
        return;
      }

      if (dbk) {
        if (!guardDelete(sess?.role)) return;
        if (!confirm("Xoá xe " + dbk + " ?")) return;
        db.bikes = db.bikes.filter(x => x.id !== dbk);
        saveDB(db);
        renderBikes(); renderStations(); renderReports();
        lockDeleteButtonsIfNeeded();
        return;
      }

      // ===== Customers =====
      const ec = e.target.closest("[data-edit-customer]")?.dataset.editCustomer;
      const dc = e.target.closest("[data-del-customer]")?.dataset.delCustomer;

      if (ec) {
        const c = db.customers.find(x => x.id === ec);
        if (!c) return;

        if ($("customerId")) $("customerId").value = c.id;
        if ($("customerName")) $("customerName").value = c.name;
        if ($("customerGender")) $("customerGender").value = c.gender;
        if ($("customerPhone")) $("customerPhone").value = c.phone;
        if ($("customerWallet")) $("customerWallet").value = c.wallet;

        scrollToAndFocusByFieldIds(["customerName", "customerId", "customerPhone"]);
        return;
      }

      if (dc) {
        if (!guardDelete(sess?.role)) return;
        if (!confirm("Xoá khách hàng " + dc + " ?")) return;
        db.customers = db.customers.filter(x => x.id !== dc);
        saveDB(db);
        renderCustomers(); renderReports();
        lockDeleteButtonsIfNeeded();
        return;
      }

      // ===== Trips =====
      const et = e.target.closest("[data-edit-trip]")?.dataset.editTrip;
      const dt = e.target.closest("[data-del-trip]")?.dataset.delTrip;

      if (et) {
        const t = db.trips.find(x => x.id === et);
        if (!t) return;

        if ($("tripId")) $("tripId").value = t.id;
        if ($("tripCustomerId")) $("tripCustomerId").value = t.customerId;
        if ($("tripBikeId")) $("tripBikeId").value = t.bikeId;
        if ($("tripStartStationId")) $("tripStartStationId").value = t.startStationId;
        if ($("tripStartTime")) $("tripStartTime").value = t.startTime;
        if ($("tripEndTime")) $("tripEndTime").value = t.endTime || "";
        if ($("tripFee")) $("tripFee").value = t.fee || 0;
        if ($("tripStatus")) $("tripStatus").value = t.status;

        scrollToAndFocusByFieldIds(["tripId", "tripCustomerId", "tripBikeId"]);
        return;
      }

      if (dt) {
        if (!guardDelete(sess?.role)) return;
        if (!confirm("Xoá chuyến đi " + dt + " ?")) return;
        db.trips = db.trips.filter(x => x.id !== dt);
        saveDB(db);
        renderTrips(); renderReports();
        lockDeleteButtonsIfNeeded();
        return;
      }

      // ===== Invoices =====
      const ei = e.target.closest("[data-edit-invoice]")?.dataset.editInvoice;
      const di = e.target.closest("[data-del-invoice]")?.dataset.delInvoice;

      if (ei) {
        const i = db.invoices.find(x => x.id === ei);
        if (!i) return;

        if ($("invoiceId")) $("invoiceId").value = i.id;
        if ($("invoiceCustomerId")) $("invoiceCustomerId").value = i.customerId;
        if ($("invoiceType")) $("invoiceType").value = i.type;
        if ($("invoiceAmount")) $("invoiceAmount").value = i.amount;
        if ($("invoiceTime")) $("invoiceTime").value = i.time;
        if ($("invoiceStatus")) $("invoiceStatus").value = i.status;
        if ($("invoiceRef")) $("invoiceRef").value = i.ref || "";

        scrollToAndFocusByFieldIds(["invoiceId", "invoiceCustomerId", "invoiceAmount"]);
        return;
      }

      if (di) {
        if (!guardDelete(sess?.role)) return;
        if (!confirm("Xoá hoá đơn " + di + " ?")) return;
        db.invoices = db.invoices.filter(x => x.id !== di);
        saveDB(db);
        renderInvoices(); renderReports();
        lockDeleteButtonsIfNeeded();
        return;
      }
    });
  }

  function boot(){
    setActiveMenu();
    getDB();

    renderStations();
    renderBikes();
    renderCustomers();
    renderTrips();
    renderInvoices();
    renderReports();

    bindActions();
    lockDeleteButtonsIfNeeded();

    // ✅ tắt/ẩn mô phỏng nạp ví ở trang khách hàng (nếu có)
    disableWalletTopupMockUI();
  }

  window.addEventListener("DOMContentLoaded", boot);

  // expose cho login page
  window.handleLogin = handleLogin;
  window.logout = logout;
})();
