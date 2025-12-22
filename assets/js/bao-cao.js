(() => {
  // ===== Helpers =====
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const money = (n) => (Number(n || 0)).toLocaleString("vi-VN") + "đ";

  // Parse "dd/mm/yyyy hh:mm" (đúng format nowStr() của bạn)
  function parseVNDateTime(str) {
    if (!str || typeof str !== "string") return null;
    const s = str.trim();
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (!m) return null;
    const dd = Number(m[1]), mm = Number(m[2]), yyyy = Number(m[3]);
    const hh = Number(m[4] || 0), mi = Number(m[5] || 0);
    const d = new Date(yyyy, mm - 1, dd, hh, mi, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  }
  function endOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  }

  function getRange() {
    const f = $("#fromDate")?.value;
    const t = $("#toDate")?.value;

    const from = f ? startOfDay(new Date(f)) : null;
    const to = t ? endOfDay(new Date(t)) : null;

    if (from && to && from > to) return { from: to, to: from };
    return { from, to };
  }

  function inRange(dateObj, range) {
    if (!dateObj) return false;
    if (range.from && dateObj < range.from) return false;
    if (range.to && dateObj > range.to) return false;
    return true;
  }

  function rangeHint(range) {
    if (!range.from && !range.to) return "Tất cả thời gian";
    const fmt = (d) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
    const a = range.from ? fmt(range.from) : "...";
    const b = range.to ? fmt(range.to) : "...";
    return `Từ ${a} đến ${b}`;
  }

  // ===== Access DB =====
  const dbKey = "TNGO_DB_V1";

  function getDBSafe() {
    const raw = localStorage.getItem(dbKey);
    if (!raw) return { stations: [], bikes: [], customers: [], trips: [], invoices: [] };
    try {
      const db = JSON.parse(raw);
      return {
        stations: db.stations || [],
        bikes: db.bikes || [],
        customers: db.customers || [],
        trips: db.trips || [],
        invoices: db.invoices || [],
      };
    } catch {
      return { stations: [], bikes: [], customers: [], trips: [], invoices: [] };
    }
  }

  function exportCSV(filename, rows) {
    if (!rows || !rows.length) {
      alert("Không có dữ liệu để xuất!");
      return;
    }
    const headers = Object.keys(rows[0]);
    const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const csv = [headers.join(",")]
      .concat(rows.map((r) => headers.map((h) => esc(r[h])).join(",")))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ===== Report Data (with range) =====
  function filterInvoices(db, range) {
    return db.invoices.filter((i) => inRange(parseVNDateTime(i.time), range));
  }

  function filterTrips(db, range) {
    return db.trips.filter((t) => {
      const d = parseVNDateTime(t.endTime) || parseVNDateTime(t.startTime);
      return inRange(d, range);
    });
  }

  function activeCustomersInRange(db, range) {
    const inv = filterInvoices(db, range);
    const tri = filterTrips(db, range);

    const set = new Set();
    inv.forEach((x) => set.add(x.customerId));
    tri.forEach((x) => set.add(x.customerId));

    return db.customers.filter((c) => set.has(c.id));
  }

  // ===== UI: Tabs + Table =====
  const TAB_META = {
    stations: {
      title: "Báo cáo trạm xe",
      columns: [
        { key: "id", label: "Mã trạm" },
        { key: "name", label: "Tên" },
        { key: "address", label: "Địa chỉ" },
        { key: "capacity", label: "Sức chứa" },
      ],
      getRows: (db) => db.stations,
      exportName: "bao-cao-tram-xe.csv",
    },
    bikes: {
      title: "Báo cáo xe đạp",
      columns: [
        { key: "id", label: "Mã xe" },
        { key: "status", label: "Trạng thái" },
        { key: "stationId", label: "Trạm" },
      ],
      getRows: (db) => db.bikes,
      exportName: "bao-cao-xe-dap.csv",
    },
    customers: {
      title: "Báo cáo khách hàng",
      columns: [
        { key: "id", label: "Mã KH" },
        { key: "name", label: "Họ tên" },
        { key: "gender", label: "Giới tính" },
        { key: "phone", label: "SĐT" },
        { key: "wallet", label: "Số dư", format: (v) => money(v) },
      ],
      getRows: (db, range) => activeCustomersInRange(db, range),
      exportName: "bao-cao-khach-hang.csv",
    },
    invoices: {
      title: "Báo cáo hoá đơn",
      columns: [
        { key: "id", label: "Mã HĐ" },
        { key: "customerId", label: "Mã KH" },
        { key: "type", label: "Loại" },
        { key: "amount", label: "Số tiền", format: (v) => money(v) },
        { key: "time", label: "Thời gian", format: (v) => v || "-" },
        { key: "status", label: "Trạng thái" },
        { key: "ref", label: "Tham chiếu", format: (v) => v || "-" },
      ],
      getRows: (db, range) => filterInvoices(db, range),
      exportName: "bao-cao-hoa-don.csv",
    },
    trips: {
      title: "Báo cáo chuyến đi",
      columns: [
        { key: "id", label: "Mã chuyến" },
        { key: "customerId", label: "Mã KH" },
        { key: "bikeId", label: "Mã xe" },
        { key: "startStationId", label: "Trạm bắt đầu" },
        { key: "startTime", label: "Bắt đầu", format: (v) => v || "-" },
        { key: "endTime", label: "Kết thúc", format: (v) => v || "-" },
        { key: "fee", label: "Cước", format: (v) => (v ? money(v) : "-") },
        { key: "status", label: "Trạng thái" },
      ],
      getRows: (db, range) => filterTrips(db, range),
      exportName: "bao-cao-chuyen-di.csv",
    },
  };

  let currentTab = "stations";
  let currentRows = [];

  function buildThead(cols) {
    const thead = $("#reportThead");
    if (!thead) return;
    thead.innerHTML = `<tr>${cols.map((c) => `<th>${c.label}</th>`).join("")}</tr>`;
  }

  function buildTbody(cols, rows, q) {
    const tbody = $("#reportTbody");
    if (!tbody) return;

    const keyword = (q || "").trim().toLowerCase();

    const filtered = !keyword
      ? rows
      : rows.filter((r) => cols.some((c) => String(r[c.key] ?? "").toLowerCase().includes(keyword)));

    tbody.innerHTML = filtered
      .map((r) => {
        return `<tr>${cols
          .map((c) => {
            const raw = r[c.key];
            const val = c.format ? c.format(raw, r) : raw ?? "";
            return `<td>${val}</td>`;
          })
          .join("")}</tr>`;
      })
      .join("");

    currentRows = filtered;
  }

  // ✅ safe: không crash nếu thiếu element
  function updateKPIs(db, range) {
    const k1 = $("#kpiStations");
    const k2 = $("#kpiBikes");
    const k3 = $("#kpiRevenue");
    const hint = $("#kpiRangeHint");

    if (k1) k1.textContent = db.stations.length;
    if (k2) k2.textContent = db.bikes.length;

    const inv = filterInvoices(db, range);
    const sum = inv.reduce((a, x) => a + Number(x.amount || 0), 0);
    if (k3) k3.textContent = money(sum);
    if (hint) hint.textContent = rangeHint(range);

    // các ô đếm tab (nếu bạn còn giữ thì update, nếu xoá thì bỏ qua)
    const c1 = $("#tabCountStations");
    const c2 = $("#tabCountBikes");
    const c3 = $("#tabCountInvoices");
    const c4 = $("#tabCountTrips");
    const c5 = $("#tabCountCustomers");

    if (c1) c1.textContent = db.stations.length;
    if (c2) c2.textContent = db.bikes.length;
    if (c3) c3.textContent = inv.length;
    if (c4) c4.textContent = filterTrips(db, range).length;
    if (c5) c5.textContent = activeCustomersInRange(db, range).length;
  }

  function setActiveTabUI(tab) {
    $$(".report-tab").forEach((el) => {
      const is = el.dataset.tab === tab;
      el.style.border = is ? "1px solid #3b82f6" : "1px solid #e2e8f0";
      el.style.boxShadow = is ? "0 0 0 3px rgba(59,130,246,.15)" : "none";
    });
  }

  function renderReport(tab) {
    const db = getDBSafe();
    const range = getRange();
    const meta = TAB_META[tab] || TAB_META.stations;

    currentTab = tab;
    setActiveTabUI(tab);

    const titleEl = $("#reportTitle");
    const subEl = $("#reportSub");
    if (titleEl) titleEl.textContent = meta.title;
    if (subEl) subEl.textContent = `Dữ liệu: LocalStorage (TNGO_DB_V1) • ${rangeHint(range)}`;

    const rows = meta.getRows(db, range);

    buildThead(meta.columns);
    buildTbody(meta.columns, rows, $("#reportSearch")?.value || "");

    updateKPIs(db, range);
  }

  // ===== Events =====
  function setPresetDays(days) {
    const today = new Date();
    const to = today;
    const from = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

    $("#toDate").value = to.toISOString().slice(0, 10);
    $("#fromDate").value = from.toISOString().slice(0, 10);
  }

  function setAllTime() {
    $("#fromDate").value = "";
    $("#toDate").value = "";
  }

  function bind() {
    // default preset: 30 ngày
    if (!$("#fromDate")?.value && !$("#toDate")?.value) setPresetDays(30);

    $$(".report-tab").forEach((el) => {
      el.addEventListener("click", () => renderReport(el.dataset.tab));
    });

    $("#btnPreset7")?.addEventListener("click", () => {
      setPresetDays(7);
      renderReport(currentTab);
    });
    $("#btnPreset30")?.addEventListener("click", () => {
      setPresetDays(30);
      renderReport(currentTab);
    });
    $("#btnPresetAll")?.addEventListener("click", () => {
      setAllTime();
      renderReport(currentTab);
    });

    $("#btnApplyFilter")?.addEventListener("click", () => renderReport(currentTab));
    $("#btnRefreshReport")?.addEventListener("click", () => renderReport(currentTab));

    $("#reportSearch")?.addEventListener("input", () => renderReport(currentTab));

    $("#btnExportCurrent")?.addEventListener("click", () => {
      const meta = TAB_META[currentTab];
      exportCSV(meta.exportName, currentRows);
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    bind();
    renderReport("stations");
  });
})();
