// ==========================================
// INDAH KOST
// SISTEM PELAPORAN KERUSAKAN FASILITAS KOS
// ==========================================

// GANTI NOMOR WHATSAPP DI BAWAH INI.
// Gunakan format 62, tanpa tanda +, spasi, atau strip.
const NOMOR_WHATSAPP_PEMILIK = "6281234567890";

const DB_KEY = "indahKostDB_v3";
const SESSION_KEY = "indahKostSession_v3";

const $ = selector => document.querySelector(selector);

let currentUser = null;
let activePage = "dashboard";
let toastTimer = null;
let selectedPhotoData = "";

// ==========================================
// DATABASE LOCAL STORAGE
// ==========================================

function getDB() {
    try {
        const saved = localStorage.getItem(DB_KEY);

        if (saved) {
            const db = JSON.parse(saved);

            if (!Array.isArray(db.users)) db.users = [];
            if (!Array.isArray(db.reports)) db.reports = [];

            if (!db.users.some(u => u.role === "pemilik")) {
                db.users.push({
                    id: 2,
                    name: "Ibu Indah",
                    username: "ibuindah",
                    password: "1357",
                    role: "pemilik",
                    room: "-"
                });
                saveDB(db);
            }

            if (!db.nextReportId) {
                db.nextReportId = Math.max(
                    0,
                    ...db.reports.map(r => Number(r.id) || 0)
                ) + 1;
            }

            return db;
        }
    } catch (error) {
        console.error("Database lokal bermasalah:", error);
    }

    const initial = {
        users: [
            {
                id: 1,
                name: "Andi Saputra",
                username: "andi",
                password: "1234",
                role: "anak",
                room: "Kamar 1A"
            },
            {
                id: 2,
                name: "Ibu Indah",
                username: "ibuindah",
                password: "1357",
                role: "pemilik",
                room: "-"
            }
        ],
        reports: [],
        nextReportId: 1
    };

    saveDB(initial);
    return initial;
}

function saveDB(db) {
    try {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        return true;
    } catch (error) {
        console.error("Gagal menyimpan database:", error);
        showToast("Penyimpanan penuh. Coba gunakan foto yang lebih kecil.");
        return false;
    }
}

// ==========================================
// SESSION LOGIN
// ==========================================

function getSession() {
    try {
        return JSON.parse(sessionStorage.getItem(SESSION_KEY));
    } catch {
        return null;
    }
}

function setSession(user) {
    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({ userId: user.id })
    );
}

function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
}

function getCurrentUser() {
    const session = getSession();

    if (!session) return null;

    return getDB().users.find(user => user.id === session.userId) || null;
}

// ==========================================
// FUNGSI UMUM
// ==========================================

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (isNaN(date.getTime())) return "-";

    return date.toLocaleString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function todayLabel() {
    return new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function showToast(message) {
    const el = $("#toast");

    if (!el) return;

    el.textContent = message;
    el.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        el.classList.remove("show");
    }, 2800);
}

function initials(name = "U") {
    return name.trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(word => word[0])
        .join("")
        .toUpperCase();
}

function roleLabel(role) {
    return role === "pemilik" ? "Pemilik Kos" : "Anak Kos";
}

function statusClass(status) {
    if (status === "Selesai") return "status-selesai";
    if (status === "Diproses") return "status-diproses";
    return "status-menunggu";
}

function statusBadge(status) {
    return `<span class="status ${statusClass(status)}">${escapeHTML(status)}</span>`;
}

function allReports() {
    return getDB().reports.slice().sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
}

function visibleReports() {
    const reports = allReports();

    if (currentUser.role === "pemilik") {
        return reports;
    }

    return reports.filter(report => report.userId === currentUser.id);
}

function findReport(id) {
    return getDB().reports.find(report => report.id === Number(id));
}

function countByStatus(reports, status) {
    return reports.filter(report => report.status === status).length;
}

// ==========================================
// LOGIN DAN REGISTER
// ==========================================

function authMode(register = false) {
    $("#loginForm").hidden = register;
    $("#registerForm").hidden = !register;
    $("#loginSwitch").hidden = register;

    $("#authEyebrow").textContent = register
        ? "BUAT AKUN BARU"
        : "SELAMAT DATANG";

    $("#authTitle").textContent = register
        ? "Daftar akun anak kos"
        : "Masuk ke akun";

    $("#authSubtitle").textContent = register
        ? "Buat akun untuk mulai melaporkan kerusakan."
        : "Silakan login untuk melanjutkan ke sistem.";
}

function togglePassword(inputId, buttonId) {
    const input = $("#" + inputId);
    const button = $("#" + buttonId);

    input.type = input.type === "password" ? "text" : "password";

    button.textContent = input.type === "password"
        ? "Lihat"
        : "Sembunyikan";
}

function login(event) {
    event.preventDefault();

    const db = getDB();

    const role = $("#loginRole").value;
    const username = $("#loginUsername").value.trim().toLowerCase();
    const password = $("#loginPassword").value;

    const user = db.users.find(item =>
        item.username.toLowerCase() === username &&
        item.password === password &&
        item.role === role
    );

    if (!user) {
        $("#loginMessage").textContent =
            "Username, password, atau role tidak sesuai.";
        return;
    }

    currentUser = user;
    setSession(user);

    $("#loginMessage").textContent = "";
    $("#loginForm").reset();

    activePage = "dashboard";
    enterApp();
}

function register(event) {
    event.preventDefault();

    const db = getDB();

    const name = $("#registerName").value.trim();
    const room = $("#registerRoom").value.trim();
    const username = $("#registerUsername").value.trim().toLowerCase();
    const password = $("#registerPassword").value;

    if (!name || !room || !username || !password) {
        return;
    }

    if (username.includes(" ")) {
        $("#registerMessage").textContent =
            "Username tidak boleh mengandung spasi.";
        return;
    }

    if (password.length < 4) {
        $("#registerMessage").textContent =
            "Password minimal 4 karakter.";
        return;
    }

    const usernameExists = db.users.some(user =>
        user.username.toLowerCase() === username
    );

    if (usernameExists) {
        $("#registerMessage").textContent =
            "Username sudah digunakan. Silakan pilih username lain.";
        return;
    }

    const newUser = {
        id: Date.now(),
        name: name,
        username: username,
        password: password,
        role: "anak",
        room: room
    };

    db.users.push(newUser);

    if (!saveDB(db)) return;

    $("#registerForm").reset();
    $("#registerMessage").textContent = "";

    authMode(false);

    $("#loginRole").value = "anak";
    $("#loginUsername").value = username;

    showToast("Akun berhasil dibuat. Silakan login.");
}

// ==========================================
// MASUK KE APLIKASI DAN KELUAR
// ==========================================

function enterApp() {
    if (!currentUser) return;

    $("#authView").hidden = true;
    $("#appView").hidden = false;

    $("#sideName").textContent = currentUser.name;
    $("#sideRole").textContent = roleLabel(currentUser.role);

    $("#sideAvatar").textContent = initials(currentUser.name);
    $("#topAvatar").textContent = initials(currentUser.name);

    $("#todayDate").textContent = todayLabel();

    renderMenu();
    renderPage("dashboard");
}

function logout() {
    clearSession();

    currentUser = null;
    activePage = "dashboard";

    $("#appView").hidden = true;
    $("#authView").hidden = false;

    authMode(false);

    $("#loginForm").reset();
    $("#loginMessage").textContent = "";

    showToast("Anda berhasil keluar.");
}

// ==========================================
// NAVIGASI SESUAI HAK AKSES
// ==========================================

function navItems(role) {
    if (role === "anak") {
        return [
            ["dashboard", "⌂", "Dashboard"],
            ["buat", "＋", "Lapor Kerusakan"],
            ["semua", "▤", "Semua Laporan"],
            ["riwayat", "◷", "Riwayat Laporan"],
            ["hubungi", "☎", "Hubungi Pemilik Kos"]
        ];
    }

    return [
        ["dashboard", "⌂", "Dashboard"],
        ["semua", "▤", "Semua Laporan"],
        ["update", "↻", "Update Status"],
        ["riwayat", "◷", "Riwayat Laporan"]
    ];
}

function renderMenu() {
    const items = navItems(currentUser.role);

    $("#sideNav").innerHTML = items.map(([id, icon, label]) => `
        <button class="nav-link ${activePage === id ? "active" : ""}"
                data-page="${id}">
            <span class="nav-icon">${icon}</span>
            ${label}
        </button>
    `).join("");

    $("#sideNav").querySelectorAll("[data-page]").forEach(button => {
        button.addEventListener("click", () => {
            renderPage(button.dataset.page);
            $("#sidebar").classList.remove("open");
        });
    });
}

function renderPage(page, data = {}) {
    if (!currentUser) return;

    const allowed = currentUser.role === "anak"
        ? ["dashboard", "buat", "semua", "riwayat", "hubungi"]
        : ["dashboard", "semua", "update", "riwayat"];

    if (!allowed.includes(page)) {
        page = "dashboard";
    }

    activePage = page;

    const titles = {
        dashboard: "Dashboard",
        buat: "Lapor Kerusakan",
        semua: "Semua Laporan",
        riwayat: "Riwayat Laporan",
        update: "Update Status",
        hubungi: "Hubungi Pemilik Kos"
    };

    $("#pageHeading").textContent = titles[page] || "Dashboard";

    renderMenu();

    if (page === "dashboard") renderDashboard();
    if (page === "buat") renderFormLaporan();
    if (page === "semua") renderSemuaLaporan();
    if (page === "riwayat") renderRiwayat();
    if (page === "update") renderUpdateStatus(data.reportId || "");
    if (page === "hubungi") renderHubungi();
}

// ==========================================
// KOMPONEN DASHBOARD
// ==========================================

function statsMarkup(reports) {
    return `
        <section class="stats-grid">
            <article class="stat-card">
                <div class="stat-top">
                    Menunggu ditangani
                    <span class="stat-icon">◷</span>
                </div>
                <div class="stat-number">
                    ${countByStatus(reports, "Menunggu")}
                </div>
                <small>Laporan menunggu penanganan</small>
            </article>

            <article class="stat-card">
                <div class="stat-top">
                    Sedang diproses
                    <span class="stat-icon">↻</span>
                </div>
                <div class="stat-number">
                    ${countByStatus(reports, "Diproses")}
                </div>
                <small>Laporan dalam perbaikan</small>
            </article>

            <article class="stat-card">
                <div class="stat-top">
                    Selesai diperbaiki
                    <span class="stat-icon">✓</span>
                </div>
                <div class="stat-number">
                    ${countByStatus(reports, "Selesai")}
                </div>
                <small>Laporan telah diselesaikan</small>
            </article>
        </section>
    `;
}

function reportTable(reports, owner = false) {
    if (!reports.length) {
        return `
            <div class="empty-state">
                <div class="empty-icon">▤</div>
                Belum ada laporan yang tersimpan.
            </div>
        `;
    }

    return `
        <div class="table-wrap">
            <table class="report-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        ${owner ? "<th>PELAPOR</th>" : ""}
                        <th>FASILITAS</th>
                        <th>LOKASI</th>
                        <th>TANGGAL</th>
                        <th>PRIORITAS</th>
                        <th>STATUS</th>
                        <th>AKSI</th>
                    </tr>
                </thead>

                <tbody>
                    ${reports.map(report => `
                        <tr>
                            <td>#${report.id}</td>

                            ${owner
                                ? `<td>${escapeHTML(report.reporterName)}</td>`
                                : ""
                            }

                            <td class="report-title">
                                ${escapeHTML(report.facility)}
                            </td>

                            <td>${escapeHTML(report.location)}</td>
                            <td>${formatDate(report.createdAt)}</td>

                            <td>
                                <span class="priority ${escapeHTML(report.priority)}">
                                    ${escapeHTML(report.priority)}
                                </span>
                            </td>

                            <td>${statusBadge(report.status)}</td>

                            <td>
                                <div class="inline-actions">
                                    <button class="small-btn"
                                            data-detail="${report.id}">
                                        Detail
                                    </button>

                                    ${owner ? `
                                        <button class="small-btn"
                                                data-update="${report.id}">
                                            Update
                                        </button>
                                    ` : ""}
                                </div>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function bindReportActions() {
    document.querySelectorAll("[data-detail]").forEach(button => {
        button.addEventListener("click", () => {
            renderDetail(Number(button.dataset.detail));
        });
    });

    document.querySelectorAll("[data-update]").forEach(button => {
        button.addEventListener("click", () => {
            renderPage("update", {
                reportId: Number(button.dataset.update)
            });
        });
    });
}

// ==========================================
// DASHBOARD
// ==========================================

function renderDashboard() {
    const reports = visibleReports();
    const owner = currentUser.role === "pemilik";

    const latest = reports.slice(0, 5);

    $("#pageContent").innerHTML = `
        <section class="welcome-banner">
            <p>${owner ? "PANEL PENGELOLA KOS" : "AREA ANAK KOS"}</p>

            <h2>
                ${owner ? "Selamat datang, " : "Halo, "}
                ${escapeHTML(currentUser.name)}!
            </h2>

            <small>
                ${owner
                    ? "Pantau laporan masuk dan kelola proses perbaikan fasilitas kos."
                    : "Sampaikan kerusakan fasilitas dan pantau perkembangan laporannya."
                }
            </small>
        </section>

        ${statsMarkup(reports)}

        ${!owner ? `
            <section class="contact-shortcut">
                <div>
                    <b>Butuh bantuan atau mengalami kendala?</b>
                    <p>Hubungi pemilik kos untuk menyampaikan pertanyaan atau kendala.</p>
                </div>
                <button id="dashboardContact">Hubungi Pemilik</button>
            </section>
        ` : ""}

        <section class="panel">
            <div class="panel-head">
                <div>
                    <h3>${owner ? "Laporan Terbaru" : "Laporan Terbaru Saya"}</h3>
                    <p>
                        ${owner
                            ? "Daftar laporan terbaru dari seluruh anak kos."
                            : "Daftar laporan yang baru kamu kirim."
                        }
                    </p>
                </div>

                <button class="text-link" id="dashboardMore">
                    ${owner ? "Lihat semua →" : "Lihat laporan →"}
                </button>
            </div>

            ${reportTable(latest, owner)}
        </section>
    `;

    bindReportActions();

    $("#dashboardMore").addEventListener("click", () => {
        renderPage(owner ? "semua" : "semua");
    });

    if (!owner) {
        $("#dashboardContact").addEventListener("click", () => {
            renderPage("hubungi");
        });
    }
}

// ==========================================
// FORM LAPOR KERUSAKAN
// ==========================================

function renderFormLaporan() {
    selectedPhotoData = "";

    $("#pageContent").innerHTML = `
        <section class="welcome-banner">
            <p>FORM PELAPORAN</p>
            <h2>Laporkan Kerusakan Fasilitas</h2>
            <small>
                Isi informasi kerusakan dengan benar dan sertakan foto sebagai bukti.
            </small>
        </section>

        <section class="panel" style="margin-top:20px">
            <div class="panel-head">
                <div>
                    <h3>Informasi Laporan</h3>
                    <p>Pastikan data yang dimasukkan sudah sesuai.</p>
                </div>
            </div>

            <form id="reportForm">
                <div class="field-grid">

                    <div class="field">
                        <label for="facility">Nama fasilitas *</label>
                        <input id="facility" required
                            placeholder="Contoh: Kran air, lampu kamar">
                    </div>

                    <div class="field">
                        <label for="location">Lokasi / nomor kamar *</label>
                        <input id="location" required
                            value="${escapeHTML(currentUser.room || "")}"
                            placeholder="Contoh: Kamar 2B">
                    </div>

                    <div class="field">
                        <label for="priority">Tingkat urgensi *</label>
                        <select id="priority" required>
                            <option value="">Pilih prioritas</option>
                            <option>Rendah</option>
                            <option>Sedang</option>
                            <option>Tinggi</option>
                        </select>
                    </div>

                    <div class="field">
                        <label for="photo">Foto bukti kerusakan *</label>
                        <input id="photo" class="file-input"
                            type="file" accept="image/*" required>

                        <p class="hint">
                            Format JPG, PNG, atau WEBP. Maksimal 1,5 MB.
                        </p>

                        <img id="imagePreview"
                            class="image-preview"
                            alt="Preview foto bukti">
                    </div>

                    <div class="field full">
                        <label for="description">Deskripsi kerusakan *</label>
                        <textarea id="description" required
                            placeholder="Jelaskan kondisi kerusakan dan kapan mulai terjadi..."></textarea>
                    </div>
                </div>

                <div class="form-actions">
                    <button class="btn btn-primary" type="submit">
                        Kirim Laporan →
                    </button>

                    <button class="btn btn-light" type="reset" id="resetReport">
                        Reset
                    </button>
                </div>
            </form>
        </section>
    `;

    $("#photo").addEventListener("change", handlePhoto);
    $("#reportForm").addEventListener("submit", submitReport);

    $("#resetReport").addEventListener("click", () => {
        selectedPhotoData = "";
        $("#imagePreview").style.display = "none";
    });
}

// ==========================================
// FOTO LAPORAN
// ==========================================

function handlePhoto(event) {
    const file = event.target.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showToast("File harus berupa gambar.");
        event.target.value = "";
        return;
    }

    if (file.size > 1.5 * 1024 * 1024) {
        showToast("Ukuran foto maksimal 1,5 MB.");
        event.target.value = "";
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        const image = new Image();

        image.onload = () => {
            const canvas = document.createElement("canvas");

            const maxSize = 900;
            let width = image.width;
            let height = image.height;

            if (width > height && width > maxSize) {
                height = Math.round(height * maxSize / width);
                width = maxSize;
            } else if (height > maxSize) {
                width = Math.round(width * maxSize / height);
                height = maxSize;
            }

            canvas.width = width;
            canvas.height = height;

            const context = canvas.getContext("2d");
            context.drawImage(image, 0, 0, width, height);

            selectedPhotoData = canvas.toDataURL("image/jpeg", 0.65);

            $("#imagePreview").src = selectedPhotoData;
            $("#imagePreview").style.display = "block";
        };

        image.onerror = () => {
            showToast("Foto tidak dapat dibaca. Coba foto lain.");
        };

        image.src = reader.result;
    };

    reader.readAsDataURL(file);
}

// ==========================================
// SIMPAN LAPORAN
// ==========================================

function submitReport(event) {
    event.preventDefault();

    if (!selectedPhotoData) {
        showToast("Silakan unggah foto bukti kerusakan.");
        return;
    }

    const db = getDB();

    const now = new Date().toISOString();

    const report = {
        id: db.nextReportId++,
        userId: currentUser.id,
        reporterName: currentUser.name,

        facility: $("#facility").value.trim(),
        location: $("#location").value.trim(),
        description: $("#description").value.trim(),
        priority: $("#priority").value,

        photo: selectedPhotoData,

        status: "Menunggu",
        createdAt: now,

        history: [
            {
                status: "Menunggu",
                note: "Laporan berhasil dikirim dan menunggu penanganan.",
                date: now,
                by: currentUser.name
            }
        ]
    };

    db.reports.push(report);

    if (!saveDB(db)) return;

    selectedPhotoData = "";

    showToast("Laporan berhasil dikirim.");

    renderPage("semua");
}

// ==========================================
// SEMUA LAPORAN
// ==========================================

function renderSemuaLaporan() {
    const owner = currentUser.role === "pemilik";
    const reports = visibleReports();

    $("#pageContent").innerHTML = `
        <section class="panel">
            <div class="panel-head">
                <div>
                    <h3>${owner ? "Semua Laporan Masuk" : "Semua Laporan Saya"}</h3>
                    <p>
                        ${owner
                            ? "Pemilik kos dapat melihat laporan dari seluruh anak kos."
                            : "Daftar seluruh laporan kerusakan yang pernah kamu kirim."
                        }
                    </p>
                </div>
            </div>

            <div class="toolbar">
                <input id="searchReports"
                    placeholder="Cari ID, fasilitas, lokasi${owner ? ", pelapor" : ""}...">

                <select id="filterStatus">
                    <option value="">Semua status</option>
                    <option>Menunggu</option>
                    <option>Diproses</option>
                    <option>Selesai</option>
                </select>

                <select id="filterPriority">
                    <option value="">Semua prioritas</option>
                    <option>Rendah</option>
                    <option>Sedang</option>
                    <option>Tinggi</option>
                </select>
            </div>

            <div id="allReportsTable">
                ${reportTable(reports, owner)}
            </div>
        </section>
    `;

    bindReportActions();

    const filter = () => {
        const query = $("#searchReports").value.toLowerCase();
        const status = $("#filterStatus").value;
        const priority = $("#filterPriority").value;

        const filtered = reports.filter(report => {
            const matchesText =
                String(report.id).includes(query) ||
                report.facility.toLowerCase().includes(query) ||
                report.location.toLowerCase().includes(query) ||
                (owner && report.reporterName.toLowerCase().includes(query));

            const matchesStatus = !status || report.status === status;
            const matchesPriority = !priority || report.priority === priority;

            return matchesText && matchesStatus && matchesPriority;
        });

        $("#allReportsTable").innerHTML = reportTable(filtered, owner);

        bindReportActions();
    };

    $("#searchReports").addEventListener("input", filter);
    $("#filterStatus").addEventListener("change", filter);
    $("#filterPriority").addEventListener("change", filter);
}

// ==========================================
// RIWAYAT LAPORAN
// ==========================================

function renderRiwayat() {
    const reports = visibleReports();
    const owner = currentUser.role === "pemilik";

    $("#pageContent").innerHTML = `
        <section class="panel">
            <div class="panel-head">
                <div>
                    <h3>${owner ? "Riwayat Perubahan Status" : "Riwayat Laporan Saya"}</h3>
                    <p>
                        ${owner
                            ? "Rekam perkembangan dan perubahan status laporan."
                            : "Lihat perkembangan laporan yang pernah kamu kirim."
                        }
                    </p>
                </div>
            </div>

            ${reports.length ? reports.map(report => `
                <div class="history-card">
                    <div class="history-card-head">
                        <div>
                            <b>#${report.id} — ${escapeHTML(report.facility)}</b>
                            <p>${escapeHTML(report.location)} · ${formatDate(report.createdAt)}</p>
                        </div>
                        ${statusBadge(report.status)}
                    </div>

                    <div class="timeline">
                        ${(report.history || []).map(item => `
                            <div class="timeline-item">
                                <b>${escapeHTML(item.status)}</b>
                                <small>
                                    ${formatDate(item.date)} ·
                                    ${escapeHTML(item.by || "Sistem")}
                                </small>
                                <p>${escapeHTML(item.note || "-")}</p>
                            </div>
                        `).join("")}
                    </div>

                    <button class="small-btn"
                        data-detail="${report.id}">
                        Lihat Detail Laporan
                    </button>
                </div>
            `).join("") : `
                <div class="empty-state">
                    <div class="empty-icon">◷</div>
                    Belum ada riwayat laporan.
                </div>
            `}
        </section>
    `;

    bindReportActions();
}

// ==========================================
// DETAIL LAPORAN
// ==========================================

function renderDetail(id) {
    const report = findReport(id);

    if (!report) {
        showToast("Laporan tidak ditemukan.");
        return;
    }

    if (
        currentUser.role === "anak" &&
        report.userId !== currentUser.id
    ) {
        showToast("Kamu tidak memiliki akses ke laporan ini.");
        return;
    }

    const owner = currentUser.role === "pemilik";

    $("#pageHeading").textContent = "Detail Laporan";

    $("#pageContent").innerHTML = `
        <div class="panel">
            <div class="panel-head">
                <div>
                    <h3>Detail Laporan #${report.id}</h3>
                    <p>Informasi lengkap kerusakan fasilitas kos.</p>
                </div>

                <button class="btn btn-light" id="backFromDetail">
                    ← Kembali
                </button>
            </div>

            <div class="detail-layout">
                <div>
                    <div class="detail-list">
                        <div class="detail-item">
                            <small>Nama Pelapor</small>
                            <b>${escapeHTML(report.reporterName)}</b>
                        </div>

                        <div class="detail-item">
                            <small>Fasilitas</small>
                            <b>${escapeHTML(report.facility)}</b>
                        </div>

                        <div class="detail-item">
                            <small>Lokasi / Kamar</small>
                            <b>${escapeHTML(report.location)}</b>
                        </div>

                        <div class="detail-item">
                            <small>Tanggal Laporan</small>
                            <b>${formatDate(report.createdAt)}</b>
                        </div>

                        <div class="detail-item">
                            <small>Tingkat Urgensi</small>
                            <b class="priority ${escapeHTML(report.priority)}">
                                ${escapeHTML(report.priority)}
                            </b>
                        </div>

                        <div class="detail-item">
                            <small>Status Perbaikan</small>
                            <b>${statusBadge(report.status)}</b>
                        </div>
                    </div>

                    <div style="margin-top:22px">
                        <small class="eyebrow">DESKRIPSI KERUSAKAN</small>
                        <p class="detail-description">
                            ${escapeHTML(report.description)}
                        </p>
                    </div>
                </div>

                <div>
                    ${report.photo ? `
                        <img class="detail-photo"
                            src="${report.photo}"
                            alt="Foto bukti kerusakan">
                    ` : `
                        <div class="empty-state">Tidak ada foto.</div>
                    `}
                </div>
            </div>

            ${owner ? `
                <div class="form-actions">
                    <button class="btn btn-primary" id="detailUpdate">
                        Update Status →
                    </button>
                </div>
            ` : ""}

            <div style="margin-top:25px">
                <div class="panel-head">
                    <div>
                        <h3>Timeline Proses Perbaikan</h3>
                        <p>Catatan setiap perubahan status laporan.</p>
                    </div>
                </div>

                <div class="timeline">
                    ${(report.history || []).map(item => `
                        <div class="timeline-item">
                            <b>${escapeHTML(item.status)}</b>
                            <small>
                                ${formatDate(item.date)} ·
                                ${escapeHTML(item.by || "Sistem")}
                            </small>
                            <p>${escapeHTML(item.note || "-")}</p>
                        </div>
                    `).join("")}
                </div>
            </div>
        </div>
    `;

    $("#backFromDetail").addEventListener("click", () => {
        renderPage(owner ? "semua" : "semua");
    });

    if (owner) {
        $("#detailUpdate").addEventListener("click", () => {
            renderPage("update", { reportId: report.id });
        });
    }
}

// ==========================================
// UPDATE STATUS OLEH PEMILIK KOS
// ==========================================

function renderUpdateStatus(selectedId = "") {
    const reports = allReports();

    if (!reports.length) {
        $("#pageContent").innerHTML = `
            <section class="panel">
                <div class="empty-state">
                    <div class="empty-icon">↻</div>
                    Belum ada laporan yang dapat diperbarui.
                </div>
            </section>
        `;
        return;
    }

    const chosen = findReport(selectedId) || reports[0];

    $("#pageContent").innerHTML = `
        <section class="welcome-banner">
            <p>PENGELOLAAN LAPORAN</p>
            <h2>Update Status Perbaikan</h2>
            <small>
                Pilih laporan, tentukan status terbaru, lalu simpan catatan penanganan.
            </small>
        </section>

        <section class="panel" style="margin-top:20px">
            <div class="panel-head">
                <div>
                    <h3>Form Update Status</h3>
                    <p>Setiap perubahan akan tercatat pada timeline laporan.</p>
                </div>
            </div>

            <form id="updateForm">
                <label for="updateReportId">Pilih ID laporan *</label>

                <select id="updateReportId" required>
                    ${reports.map(report => `
                        <option value="${report.id}"
                            ${report.id === chosen.id ? "selected" : ""}>
                            #${report.id} — ${escapeHTML(report.facility)}
                            (${escapeHTML(report.reporterName)})
                        </option>
                    `).join("")}
                </select>

                <div id="updateCurrent" class="hint" style="margin-top:10px">
                    Status saat ini: ${statusBadge(chosen.status)}
                </div>

                <label for="newStatus">Status baru *</label>

                <select id="newStatus" required>
                    <option value="Menunggu"
                        ${chosen.status === "Menunggu" ? "selected" : ""}>
                        Menunggu
                    </option>

                    <option value="Diproses"
                        ${chosen.status === "Diproses" ? "selected" : ""}>
                        Diproses
                    </option>

                    <option value="Selesai"
                        ${chosen.status === "Selesai" ? "selected" : ""}>
                        Selesai
                    </option>
                </select>

                <label for="updateNote">Catatan pemilik kos *</label>

                <textarea id="updateNote" required
                    placeholder="Contoh: Teknisi sudah dihubungi dan perbaikan dijadwalkan..."></textarea>

                <label for="updateDate">Tanggal update *</label>

                <input id="updateDate" type="datetime-local"
                    required value="${new Date().toISOString().slice(0,16)}">

                <div class="form-actions">
                    <button class="btn btn-primary" type="submit">
                        Simpan Perubahan →
                    </button>

                    <button class="btn btn-light" type="button" id="viewSelected">
                        Lihat Detail
                    </button>
                </div>
            </form>
        </section>
    `;

    $("#updateReportId").addEventListener("change", () => {
        renderUpdateStatus(Number($("#updateReportId").value));
    });

    $("#viewSelected").addEventListener("click", () => {
        renderDetail(Number($("#updateReportId").value));
    });

    $("#updateForm").addEventListener("submit", saveStatusUpdate);
}

function saveStatusUpdate(event) {
    event.preventDefault();

    const db = getDB();

    const id = Number($("#updateReportId").value);

    const report = db.reports.find(item => item.id === id);

    if (!report) {
        showToast("Laporan tidak ditemukan.");
        return;
    }

    const status = $("#newStatus").value;
    const note = $("#updateNote").value.trim();
    const date = $("#updateDate").value;

    if (!note || !date) {
        showToast("Lengkapi catatan dan tanggal update.");
        return;
    }

    report.status = status;

    report.history = report.history || [];

    report.history.push({
        status: status,
        note: note,
        date: new Date(date).toISOString(),
        by: currentUser.name
    });

    if (!saveDB(db)) return;

    showToast("Status laporan berhasil diperbarui.");

    renderPage("semua");
}

// ==========================================
// HUBUNGI PEMILIK KOS MELALUI WHATSAPP
// ==========================================

function renderHubungi() {
    const pesan =
        "Halo Ibu, saya penghuni INDAH KOST. Saya ingin menyampaikan kendala terkait fasilitas kos.";

    const nomor = NOMOR_WHATSAPP_PEMILIK.replace(/\D/g, "");

    const linkWhatsApp =
        `https://wa.me/${nomor}?text=${encodeURIComponent(pesan)}`;

    $("#pageContent").innerHTML = `
        <section class="welcome-banner">
            <p>BANTUAN DAN KONTAK</p>
            <h2>Hubungi Pemilik Kos</h2>
            <small>
                Sampaikan kendala atau pertanyaan terkait fasilitas kos.
            </small>
        </section>

        <section class="contact-card">
            <div class="contact-icon">☎</div>

            <h2>Butuh Bantuan?</h2>

            <p>
                Jika mengalami kendala, ingin menyampaikan informasi,
                atau menanyakan perkembangan perbaikan fasilitas,
                silakan hubungi pemilik kos melalui WhatsApp.
            </p>

            <a class="whatsapp-btn"
                href="${linkWhatsApp}"
                target="_blank"
                rel="noopener noreferrer">
                <span>☏</span>
                Hubungi via WhatsApp
            </a>

            <small class="contact-note">
                Pastikan kamu menyampaikan nama dan nomor kamar
                saat menghubungi pemilik kos.
            </small>
        </section>
    `;
}

// ==========================================
// EVENT LISTENER
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // Login dan register
    $("#loginForm").addEventListener("submit", login);
    $("#registerForm").addEventListener("submit", register);

    $("#showRegister").addEventListener("click", () => {
        authMode(true);
    });

    $("#showLogin").addEventListener("click", () => {
        authMode(false);
    });

    // Lihat dan sembunyikan password
    $("#toggleLoginPassword").addEventListener("click", () => {
        togglePassword("loginPassword", "toggleLoginPassword");
    });

    $("#toggleRegisterPassword").addEventListener("click", () => {
        togglePassword("registerPassword", "toggleRegisterPassword");
    });

    // Logout
    $("#logoutBtn").addEventListener("click", logout);

    // Menu mobile
    $("#menuToggle").addEventListener("click", () => {
        $("#sidebar").classList.toggle("open");
    });

    // Siapkan database
    getDB();

    // Periksa session login
    const session = getSession();

    if (session) {
        currentUser = getCurrentUser();

        if (currentUser) {
            enterApp();
            return;
        }
    }

    // Jika tidak ada session, tampilkan halaman login
    clearSession();

    $("#authView").hidden = false;
    $("#appView").hidden = true;
});