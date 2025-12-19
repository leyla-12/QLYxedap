/* =========================================================
   TNGO Bike - FE Demo (LocalStorage)
   - CRUD: Trạm, Xe, Khách hàng
   - Nạp tiền -> tạo hoá đơn
   - Tạo chuyến / Kết thúc chuyến -> trừ ví + tạo hoá đơn trả cước
   - Báo cáo: KPI + bảng tổng hợp
   ========================================================= */

(() => {
  const KEY = "TNGO_DB_V1";

  // ---------- Utils ----------
  const nowISO = () => new Date().toISOString();
  const toVN = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("vi-VN");
    } catch { return iso; }
  };
  const uid = (prefix) => `${prefix}${Math.floor(100000 + Math.random() * 900000)}`;
  const money = (n) => (Number(n) || 0).toLocaleString("vi-VN") + "đ";
  const num = (v) => {
    if (typeof v === "number") return v;
    if (!v) return 0;
    // allow "50.000" "50,000" "50000"
    return Number(String(v).replace(/[^\d]/g, "")) || 0;
  };

  const readDB = () => {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const writeDB = (db) => localStorage.setItem(KEY, JSON.stringify(db));

  const seedDB = () => ({
    stations: [
      { id: "TR01", name: "Cầu Giấy", address: "123 Trần Duy Hưng", capacity: 30, status: "hoạt động" },
      { id: "TR02", name: "Dịch Vọng", address: "56 Xuân Thủy", capacity: 25, status: "hoạt động" },
      { id: "TR03", name: "Trần Duy Hưng", address: "89 Trần Duy Hưng", capacity: 20, status: "bảo trì" },
    ],
    bikes: [
      { id: "XE001", stationId: "TR01", type: "xe thường", status: "đang đậu" },
      { id: "XE014", stationId: "TR02", type: "xe thường", status: "đang thuê" },
      { id: "XE078", stationId: "TR03", type: "xe điện", status: "bảo trì" },
    ],
    customers: [
      { id: "KH001", name: "Nguyễn An", gender: "Nữ", phone: "0987xxxxxx", wallet: 120000, createdAt: nowISO() },
      { id: "KH014", name: "Trần Minh", gender: "Nam", phone: "0909xxxxxx", wallet: 35000, createdAt: nowISO() },
    ],
    trips: [
      // one running trip sample
      { id: "CD1001", customerId: "KH001", bikeId: "XE014", startStationId: "TR02", endStationId: null, startAt: nowISO(), endAt: null, fee: null, status: "đang chạy" },
      { id: "CD0998", customerId: "KH014", bikeId: "XE001", startStationId: "TR01", endStationId: "TR03", startAt: "2025-12-18T02:12:00.000Z", endAt: "2025-12-18T02:45:00.000Z", fee: 12000, status: "hoàn tất" },
    ],
    invoices: [
      { id: "HD2001", customerId: "KH014", type: "nạp tiền", amount: 50000, tripId: null, status: "thành công", createdAt: nowISO(), note: "" },
      { id: "HD2002", customerId: "KH014", type: "trả cước", amount: -12000, tripId: "CD0998", status: "thành công", createdAt: nowISO(), note: "" },
    ],
    meta: { lastUpdated: nowISO() }
  });

  const getDB = () => {
    let db = readDB();
    if (!db) {
      db = seedDB();
      writeDB(db);
    }
    return db;
  };

  const saveDB = (db) => {
    db.meta = db.meta || {};
    db.meta.lastUpdated = nowISO();
    writeDB(db);
  };

  const findById = (arr, id) => arr.find(x => x.id === id);

  // ---------- Business rules ----------
  const calcFee = (startISO, endISO) => {
    // Demo pricing:
    // base 5,000 + 1,000 / 10 phút, tối thiểu 5,000
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();
    const mins = Math.max(1, Math.ceil((end - start) / 60000));
    const blocks = Math.ceil(mins / 10);
    return Math.max(5000, 5000 + blocks * 1000);
  };

  const bikeBadge = (st) => {
    if (st === "đang đậu") return `<span class="badge b-ok">${st}</span>`;
    if (st === "đang thuê") return `<span class="badge b-warn">${st}</span>`;
    if (st === "bảo trì") return `<span class="badge b-bad">${st}</span>`;
    return `<span class="badge">${st}</span>`;
  };

  const tripBadge = (st) => {
    if (st === "đang chạy") return `<span class="badge b-run">${st}</span>`;
    if (st === "hoàn tất") return `<span class="badge b-done">${st}</span>`;
    return `<span class="badge">${st}</span>`;
  };

  const invoiceBadge = (st) => {
    if (st === "thành công") return `<span class="badge b-ok">${st}</span>`;
    if (st === "lỗi") return `<span class="badge b-bad">${st}</span>`;
    return `<span class="badge">${st}</span>`;
  };

  // ---------- Render helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  // ---------- Stations ----------
  function renderStations() {
    const tbody = $("#stationTbody");
    if (!tbody) return;

    const db = getDB();
    tbody.innerHTML = db.stations.map(s => {
      const bikeCount = db.bikes.filter(b => b.stationId === s.id && b.status === "đang đậu").length;
      return `
        <tr>
          <td>${s.id}</td>
          <td>${s.name}</td>
          <td>${s.address}</td>
          <td>${s.capacity}</td>
          <td>${bikeCount}</td>
          <td>${s.status}</td>
          <td class="actions">
            <button class="btn ghost" data-act="editStation" data-id="${s.id}"><i class="fa-solid fa-pen"></i> Sửa</button>
            <button class="btn ghost" data-act="delStation" data-id="${s.id}"><i class="fa-solid fa-trash"></i> Xóa</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function addStationFromForm() {
    const id = ($("#st_id")?.value || "").trim() || uid("TR");
    const name = ($("#st_name")?.value || "").trim();
    const address = ($("#st_address")?.value || "").trim();
    const capacity = num($("#st_capacity")?.value);
    const status = ($("#st_status")?.value || "hoạt động").trim();

    if (!name) return alert("Vui lòng nhập Tên trạm.");
    const db = getDB();
    if (findById(db.stations, id)) return alert("Mã trạm đã tồn tại.");

    db.stations.push({ id, name, address, capacity: capacity || 0, status });
    saveDB(db);
    renderStations();
    alert("Đã thêm trạm.");
  }

  function editStation(id) {
    const db = getDB();
    const s = findById(db.stations, id);
    if (!s) return;

    const name = prompt("Tên trạm:", s.name);
    if (name === null) return;
    const address = prompt("Địa chỉ:", s.address ?? "");
    if (address === null) return;
    const capacity = prompt("Sức chứa:", String(s.capacity ?? 0));
    if (capacity === null) return;
    const status = prompt("Trạng thái (hoạt động/bảo trì/ngừng):", s.status ?? "hoạt động");
    if (status === null) return;

    s.name = name.trim();
    s.address = address.trim();
    s.capacity = num(capacity);
    s.status = status.trim();

    saveDB(db);
    renderStations();
    alert("Đã cập nhật trạm.");
  }

  function delStation(id) {
    const db = getDB();
    // Nếu trạm đang có xe đậu -> chặn xóa (demo rule)
    const hasBike = db.bikes.some(b => b.stationId === id && b.status === "đang đậu");
    if (hasBike) return alert("Không thể xóa trạm đang có xe đậu. Hãy điều chuyển xe trước.");

    if (!confirm(`Xóa trạm ${id}?`)) return;
    db.stations = db.stations.filter(s => s.id !== id);
    // xe gắn trạm này thì đưa về null
    db.bikes.forEach(b => { if (b.stationId === id) b.stationId = null; });
    saveDB(db);
    renderStations();
    alert("Đã xóa trạm.");
  }

  // ---------- Bikes ----------
  function renderBikes() {
    const tbody = $("#bikeTbody");
    if (!tbody) return;

    const db = getDB();
    tbody.innerHTML = db.bikes.map(b => {
      const st = findById(db.stations, b.stationId);
      return `
        <tr>
          <td>${b.id}</td>
          <td>${bikeBadge(b.status)}</td>
          <td>${b.type}</td>
          <td>${st ? `${st.id} - ${st.name}` : "-"}</td>
          <td class="actions">
            <button class="btn ghost" data-act="editBike" data-id="${b.id}"><i class="fa-solid fa-pen"></i> Cập nhật</button>
            <button class="btn ghost" data-act="delBike" data-id="${b.id}"><i class="fa-solid fa-trash"></i> Xóa</button>
          </td>
        </tr>
      `;
    }).join("");
  }

  function addBikeFromForm() {
    const id = ($("#bk_id")?.value || "").trim() || uid("XE");
    const type = ($("#bk_type")?.value || "xe thường").trim();
    const status = ($("#bk_status")?.value || "đang đậu").trim();
    const stationId = ($("#bk_station")?.value || "").trim() || null;

    const db = getDB();
    if (findById(db.bikes, id)) return alert("Mã xe đã tồn tại.");

    // rule: nếu "đang thuê" thì stationId = null
    const fixedStation = status === "đang thuê" ? null : stationId;

    db.bikes.push({ id, type, status, stationId: fixedStation });
    saveDB(db);
    renderBikes();
    alert("Đã thêm xe.");
  }

  function editBike(id) {
    const db = getDB();
    const b = findById(db.bikes, id);
    if (!b) return;

    // nếu xe đang thuê -> không cho set trạm (demo)
    const type = prompt("Loại xe:", b.type ?? "xe thường");
    if (type === null) return;

    const status = prompt("Trạng thái (đang đậu/đang thuê/bảo trì):", b.status ?? "đang đậu");
    if (status === null) return;

    let stationId = b.stationId;
    if (String(status).trim() !== "đang thuê") {
      const nextStation = prompt("Mã trạm (VD TR01) hoặc để trống:", stationId ?? "");
      if (nextStation === null) return;
      stationId = nextStation.trim() || null;
      if (stationId && !findById(db.stations, stationId)) return alert("Trạm không tồn tại.");
    } else {
      stationId = null;
    }

    b.type = type.trim();
    b.status = String(status).trim();
    b.stationId = stationId;

    saveDB(db);
    renderBikes();
    alert("Đã cập nhật xe.");
  }

  function delBike(id) {
    const db = getDB();
    const b = findById(db.bikes, id);
    if (!b) return;

    if (b.status === "đang thuê") return alert("Không thể xóa xe đang thuê.");
    if (!confirm(`Xóa xe ${id}?`)) return;

    db.bikes = db.bikes.filter(x => x.id !== id);
    saveDB(db);
    renderBikes();
    alert("Đã xóa xe.");
  }

  // ---------- Customers + Wallet topup ----------
  function renderCustomers() {
    const tbody = $("#customerTbody");
    if (!tbody) return;

    const db = getDB();
    tbody.innerHTML = db.customers.map(c => `
      <tr>
        <td>${c.id}</td>
        <td>${c.name}</td>
        <td>${c.gender}</td>
        <td>${c.phone}</td>
        <td><b style="color:#16a34a">${money(c.wallet)}</b></td>
        <td class="actions">
          <button class="btn ghost" data-act="editCustomer" data-id="${c.id}"><i class="fa-solid fa-pen"></i> Sửa</button>
          <button class="btn ghost" data-act="topupQuick" data-id="${c.id}"><i class="fa-solid fa-wallet"></i> Nạp</button>
          <button class="btn ghost" data-act="delCustomer" data-id="${c.id}"><i class="fa-solid fa-trash"></i> Xóa</button>
        </td>
      </tr>
    `).join("");
  }

  function addCustomerFromForm() {
    const id = ($("#kh_id")?.value || "").trim() || uid("KH");
    const name = ($("#kh_name")?.value || "").trim();
    const gender = ($("#kh_gender")?.value || "Khác").trim();
    const phone = ($("#kh_phone")?.value || "").trim();
    const wallet = num($("#kh_wallet")?.value);

    if (!name) return alert("Vui lòng nhập Họ tên.");
    const db = getDB();
    if (findById(db.customers, id)) return alert("Mã KH đã tồn tại.");

    db.customers.push({ id, name, gender, phone, wallet: wallet || 0, createdAt: nowISO() });
    saveDB(db);
    renderCustomers();
    alert("Đã thêm khách hàng.");
  }

  function editCustomer(id) {
    const db = getDB();
    const c = findById(db.customers, id);
    if (!c) return;

    const name = prompt("Họ tên:", c.name);
    if (name === null) return;
    const gender = prompt("Giới tính:", c.gender);
    if (gender === null) return;
    const phone = prompt("SĐT:", c.phone ?? "");
    if (phone === null) return;

    c.name = name.trim();
    c.gender = gender.trim();
    c.phone = phone.trim();

    saveDB(db);
    renderCustomers();
    alert("Đã cập nhật khách hàng.");
  }

  function delCustomer(id) {
    const db = getDB();
    // chặn xóa nếu có chuyến đang chạy
    const running = db.trips.some(t => t.customerId === id && t.status === "đang chạy");
    if (running) return alert("Không thể xóa khách hàng đang có chuyến chạy.");

    if (!confirm(`Xóa khách hàng ${id}?`)) return;
    db.customers = db.customers.filter(c => c.id !== id);
    saveDB(db);
    renderCustomers();
    alert("Đã xóa khách hàng.");
  }

  function topup(customerId, amount, status = "thành công") {
    const db = getDB();
    const c = findById(db.customers, customerId);
    if (!c) return alert("Không tìm thấy khách hàng.");

    const amt = num(amount);
    if (amt <= 0) return alert("Số tiền nạp không hợp lệ.");

    const inv = {
      id: uid("HD"),
      customerId,
      type: "nạp tiền",
      amount: amt,
      tripId: null,
      status: status.trim(),
      createdAt: nowISO(),
      note: ""
    };

    db.invoices.unshift(inv);

    if (inv.status === "thành công") {
      c.wallet = (Number(c.wallet) || 0) + amt;
    }

    saveDB(db);
    renderCustomers();
    renderInvoices();
    renderReports();
    alert(`Đã tạo hóa đơn ${inv.id}.`);
  }

  // ---------- Trips ----------
  function renderTrips() {
    const tbody = $("#tripTbody");
    if (!tbody) return;

    const db = getDB();
    tbody.innerHTML = db.trips.map(t => {
      const c = findById(db.customers, t.customerId);
      const b = findById(db.bikes, t.bikeId);
      const stStart = findById(db.stations, t.startStationId);
      const stEnd = t.endStationId ? findById(db.stations, t.endStationId) : null;

      return `
        <tr>
          <td>${t.id}</td>
          <td>${c ? c.id : t.customerId}</td>
          <td>${b ? b.id : t.bikeId}</td>
          <td>${stStart ? stStart.id : t.startStationId}</td>
          <td>${toVN(t.startAt)}</td>
          <td>${stEnd ? stEnd.id : "-"}</td>
          <td>${t.endAt ? toVN(t.endAt) : "-"}</td>
          <td>${t.fee != null ? money(t.fee) : "-"}</td>
          <td>${tripBadge(t.status)}</td>
          <td class="actions">
            ${
              t.status === "đang chạy"
                ? `<button class="btn ghost" data-act="endTrip" data-id="${t.id}">
                     <i class="fa-solid fa-flag-checkered"></i> Kết thúc
                   </button>`
                : `<button class="btn ghost" data-act="viewTrip" data-id="${t.id}">
                     <i class="fa-solid fa-eye"></i> Xem
                   </button>`
            }
          </td>
        </tr>
      `;
    }).join("");
  }

  function createTripFromForm() {
    const customerId = ($("#trip_customer")?.value || "").trim();
    const bikeId = ($("#trip_bike")?.value || "").trim();
    const startStationId = ($("#trip_startStation")?.value || "").trim();

    if (!customerId || !bikeId || !startStationId) {
      return alert("Vui lòng nhập Mã KH, Mã xe, Trạm thuê.");
    }

    const db = getDB();
    const c = findById(db.customers, customerId);
    if (!c) return alert("Khách hàng không tồn tại.");

    const b = findById(db.bikes, bikeId);
    if (!b) return alert("Xe không tồn tại.");
    if (b.status !== "đang đậu") return alert("Xe không sẵn sàng để thuê (phải là 'đang đậu').");

    const st = findById(db.stations, startStationId);
    if (!st) return alert("Trạm thuê không tồn tại.");

    const runningByCustomer = db.trips.some(t => t.customerId === customerId && t.status === "đang chạy");
    if (runningByCustomer) return alert("Khách hàng đang có chuyến chạy.");

    // update bike to renting
    b.status = "đang thuê";
    b.stationId = null;

    const trip = {
      id: uid("CD"),
      customerId,
      bikeId,
      startStationId,
      endStationId: null,
      startAt: nowISO(),
      endAt: null,
      fee: null,
      status: "đang chạy"
    };

    db.trips.unshift(trip);
    saveDB(db);
    renderTrips();
    renderBikes();
    renderReports();
    alert(`Đã tạo chuyến ${trip.id}.`);
  }

  function endTrip(tripId) {
    const db = getDB();
    const t = findById(db.trips, tripId);
    if (!t || t.status !== "đang chạy") return;

    const endStationId = prompt("Nhập trạm trả (VD TR01):", "TR01");
    if (endStationId === null) return;
    const stEnd = findById(db.stations, endStationId.trim());
    if (!stEnd) return alert("Trạm trả không tồn tại.");

    const c = findById(db.customers, t.customerId);
    const b = findById(db.bikes, t.bikeId);
    if (!c || !b) return alert("Dữ liệu chuyến bị lỗi (thiếu KH hoặc xe).");

    t.endStationId = stEnd.id;
    t.endAt = nowISO();
    t.fee = calcFee(t.startAt, t.endAt);
    t.status = "hoàn tất";

    // update bike back to station
    b.status = "đang đậu";
    b.stationId = stEnd.id;

    // create invoice for fare
    const inv = {
      id: uid("HD"),
      customerId: c.id,
      type: "trả cước",
      amount: -Math.abs(t.fee),
      tripId: t.id,
      status: "thành công",
      createdAt: nowISO(),
      note: ""
    };

    // deduct wallet (demo: allow negative or block)
    if ((c.wallet || 0) + inv.amount < 0) {
      // if not enough money => mark invoice error & do not deduct
      inv.status = "lỗi";
      inv.note = "Số dư ví không đủ để trừ cước.";
    } else {
      c.wallet = (c.wallet || 0) + inv.amount; // inv.amount is negative
    }

    db.invoices.unshift(inv);
    saveDB(db);

    renderTrips();
    renderBikes();
    renderCustomers();
    renderInvoices();
    renderReports();

    alert(`Đã kết thúc chuyến ${t.id}. Hoá đơn: ${inv.id} (${inv.status}).`);
  }

  // ---------- Invoices ----------
  function renderInvoices() {
    const tbody = $("#invoiceTbody");
    if (!tbody) return;

    const db = getDB();
    tbody.innerHTML = db.invoices.map(i => `
      <tr>
        <td>${i.id}</td>
        <td>${i.customerId}</td>
        <td>${i.type}</td>
        <td><b>${i.amount >= 0 ? "+" : ""}${money(i.amount)}</b></td>
        <td>${toVN(i.createdAt)}</td>
        <td>${i.tripId ?? "-"}</td>
        <td>${invoiceBadge(i.status)}</td>
        <td class="actions">
          <button class="btn ghost" data-act="viewInvoice" data-id="${i.id}">
            <i class="fa-solid fa-eye"></i> Xem
          </button>
        </td>
      </tr>
    `).join("");
  }

  function viewInvoice(id) {
    const db = getDB();
    const i = findById(db.invoices, id);
    if (!i) return;
    alert(
      [
        `Mã HĐ: ${i.id}`,
        `Mã KH: ${i.customerId}`,
        `Loại: ${i.type}`,
        `Số tiền: ${i.amount >= 0 ? "+" : ""}${money(i.amount)}`,
        `Thời gian: ${toVN(i.createdAt)}`,
        `Chuyến: ${i.tripId ?? "-"}`,
        `Trạng thái: ${i.status}`,
        `Ghi chú: ${i.note || "-"}`
      ].join("\n")
    );
  }

  // ---------- Reports ----------
  function renderReports() {
    // KPIs (nếu trang có)
    const db = getDB();

    // dashboard cards optional ids:
    // kpiStations, kpiBikes, kpiTripsToday, kpiRevenueToday
    const totalStations = db.stations.length;
    const totalBikes = db.bikes.length;

    // revenue today (sum invoices today successful)
    const today = new Date();
    const y = today.getFullYear(), m = today.getMonth(), d = today.getDate();
    const isToday = (iso) => {
      const t = new Date(iso);
      return t.getFullYear() === y && t.getMonth() === m && t.getDate() === d;
    };
    const revenueToday = db.invoices
      .filter(i => i.status === "thành công" && isToday(i.createdAt))
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const tripsToday = db.trips.filter(t => isToday(t.startAt)).length;

    setText("kpiStations", String(totalStations));
    setText("kpiBikes", String(totalBikes));
    setText("kpiTripsToday", String(tripsToday));
    setText("kpiRevenueToday", money(revenueToday));

    // report tables (optional ids)
    // reportStationsTbody, reportBikeStatusTbody, reportTopCustomersTbody
    const stationRows = db.stations.map(s => {
      const parked = db.bikes.filter(b => b.stationId === s.id && b.status === "đang đậu").length;
      const suggestion = parked < 3 ? "+ điều xe về trạm" : (parked > (s.capacity * 0.8) ? "- điều xe sang trạm khác" : "ổn định");
      return `<tr><td>${s.id}</td><td>${s.name}</td><td>${s.capacity}</td><td>${parked}</td><td>${suggestion}</td></tr>`;
    }).join("");
    setHTML("reportStationsTbody", stationRows);

    const byStatus = ["đang đậu", "đang thuê", "bảo trì"].map(st => {
      const count = db.bikes.filter(b => b.status === st).length;
      const ratio = totalBikes ? ((count / totalBikes) * 100).toFixed(1) + "%" : "0%";
      return `<tr><td>${st}</td><td>${count}</td><td>${ratio}</td></tr>`;
    }).join("");
    setHTML("reportBikeStatusTbody", byStatus);

    // top customers by fee paid
    const feeByCustomer = {};
    db.invoices
      .filter(i => i.type === "trả cước" && i.status === "thành công")
      .forEach(i => {
        feeByCustomer[i.customerId] = (feeByCustomer[i.customerId] || 0) + Math.abs(Number(i.amount) || 0);
      });

    const top = Object.entries(feeByCustomer)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topRows = top.map(([cid, totalFee]) => {
      const c = findById(db.customers, cid);
      return `<tr><td>${cid}</td><td>${c ? c.name : "-"}</td><td>${money(totalFee)}</td><td>${money(c?.wallet || 0)}</td></tr>`;
    }).join("");

    setHTML("reportTopCustomersTbody", topRows || `<tr><td colspan="4">Chưa có dữ liệu</td></tr>`);
  }

  // ---------- Global click handler ----------
  function bindActions() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-act]");
      if (!btn) return;

      const act = btn.getAttribute("data-act");
      const id = btn.getAttribute("data-id");

      if (act === "editStation") return editStation(id);
      if (act === "delStation") return delStation(id);

      if (act === "editBike") return editBike(id);
      if (act === "delBike") return delBike(id);

      if (act === "editCustomer") return editCustomer(id);
      if (act === "delCustomer") return delCustomer(id);

      if (act === "topupQuick") {
        // fill form if exists
        const cidInput = $("#topup_customer");
        if (cidInput) cidInput.value = id;
        // focus amount
        $("#topup_amount")?.focus();
        return;
      }

      if (act === "endTrip") return endTrip(id);
      if (act === "viewTrip") return alert("Chuyến đã hoàn tất. Bạn có thể xem hoá đơn trả cước trong trang Hoá đơn.");

      if (act === "viewInvoice") return viewInvoice(id);
    });

    // Buttons (if exist)
    $("#btnAddStation")?.addEventListener("click", addStationFromForm);
    $("#btnAddBike")?.addEventListener("click", addBikeFromForm);
    $("#btnAddCustomer")?.addEventListener("click", addCustomerFromForm);
    $("#btnCreateTrip")?.addEventListener("click", createTripFromForm);

    $("#btnTopup")?.addEventListener("click", () => {
      const cid = ($("#topup_customer")?.value || "").trim();
      const amt = $("#topup_amount")?.value;
      const st = ($("#topup_status")?.value || "thành công").trim();
      topup(cid, amt, st);
    });

    $("#btnResetDemo")?.addEventListener("click", () => {
      if (!confirm("Reset dữ liệu demo về mặc định?")) return;
      localStorage.removeItem(KEY);
      getDB();
      boot();
      alert("Đã reset.");
    });
  }

  // ---------- Boot ----------
  function boot() {
    // ensure db exists
    getDB();

    // render per page (auto if tbody exists)
    renderStations();
    renderBikes();
    renderCustomers();
    renderTrips();
    renderInvoices();
    renderReports();
  }

  bindActions();
  boot();

  // expose for debug (optional)
  window.TNGO = {
    getDB, saveDB, renderStations, renderBikes, renderCustomers, renderTrips, renderInvoices, renderReports,
    topup, endTrip
  };
})();
