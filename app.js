// DOMAIN DATA STORES & LOCAL STORAGE HELPERS
const STORAGE_KEYS = {
    USERS: 'uber_bolt_users',
    CONFIG: 'uber_bolt_config',
    SETTLEMENTS: 'uber_bolt_settlements',
    CURRENT_USER: 'uber_bolt_current_user'
};

// INITIAL DEFAULT CONFIGURATION
const DEFAULT_CONFIG = {
    tiers: [
        { min: 0, max: 69, percent: 0.60 },
        { min: 70, max: 109, percent: 0.62 },
        { min: 110, max: 149, percent: 0.64 },
        { min: 150, max: 175, percent: 0.66 },
        { min: 176, max: 199, percent: 0.68 },
        { min: 200, max: 229, percent: 0.70 },
        { min: 230, max: 250, percent: 0.72 },
        { min: 251, max: 99999, percent: 0.75 }
    ],
    fixedTaxFee: 29,
    taxPercent: 0.01
};

const DEFAULT_USERS = [
    { id: 'usr_1', username: 'kierowca', password: '123', name: 'Jan Kowalski', role: 'driver' },
    { id: 'usr_admin', username: 'admin', password: 'admin123', name: 'Administrator Rozliczeń', role: 'admin' }
];

let incomeChartInstance = null;
let appComparisonChartInstance = null;
let currentEditingId = null;

// LOCAL STORAGE FALLBACK HELPERS
function getStoredData(key, fallback) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        console.error("Storage read error", e);
        return fallback;
    }
}

function setStoredData(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error("Storage write error", e);
    }
}

function showToast(message) {
    const container = document.getElementById("toast-container");
    if (!container) return;
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatPLN(amount) {
    return amount.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' zł';
}

// INICJALIZACJA STRUKTURY DANYCH
async function initAppStorage() {
    if (!localStorage.getItem(STORAGE_KEYS.CONFIG)) {
        setStoredData(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
        setStoredData(STORAGE_KEYS.USERS, DEFAULT_USERS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTLEMENTS)) {
        setStoredData(STORAGE_KEYS.SETTLEMENTS, []);
    }

    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            // Sprawdzenie czy w Firebase istnieją wstępne konfigi
            const configDoc = await db.collection('settings').doc('config').get();
            if (!configDoc.exists) {
                await db.collection('settings').doc('config').set(DEFAULT_CONFIG);
            }
        } catch (err) {
            console.warn("Błąd inicjalizacji Firebase Firestore:", err);
        }
    }
}

// LOGOWANIE I SESJA
function getCurrentUser() {
    return getStoredData(STORAGE_KEYS.CURRENT_USER, null);
}

function setCurrentUser(user) {
    setStoredData(STORAGE_KEYS.CURRENT_USER, user);
}

function switchAuthMode(mode) {
    const tabLogin = document.getElementById("auth-tab-login");
    const tabRegister = document.getElementById("auth-tab-register");
    const boxLogin = document.getElementById("auth-box-login");
    const boxRegister = document.getElementById("auth-box-register");

    if (mode === 'login') {
        if (tabLogin) tabLogin.classList.add("active");
        if (tabRegister) tabRegister.classList.remove("active");
        if (boxLogin) boxLogin.style.display = "block";
        if (boxRegister) boxRegister.style.display = "none";
    } else {
        if (tabRegister) tabRegister.classList.add("active");
        if (tabLogin) tabLogin.classList.remove("active");
        if (boxRegister) boxRegister.style.display = "block";
        if (boxLogin) boxLogin.style.display = "none";
    }
}

async function handleLogin(e) {
    if (e) e.preventDefault();
    const userInp = document.getElementById("login-username").value.trim();
    const passInp = document.getElementById("login-password").value.trim();

    let users = [];
    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            const snap = await db.collection('users').get();
            snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        } catch (err) {
            console.warn("Błąd pobierania użytkowników z Firebase, próba z localStorage", err);
        }
    }
    
    if (users.length === 0) {
        users = getStoredData(STORAGE_KEYS.USERS, DEFAULT_USERS);
    }

    const found = users.find(u => u.username.toLowerCase() === userInp.toLowerCase() && u.password === passInp);

    if (!found) {
        showToast("❌ Nieprawidłowy login lub hasło!");
        return;
    }

    setCurrentUser(found);
    showToast(`Witaj, ${found.name}!`);
    renderAppLayout();
}

async function handleRegister(e) {
    if (e) e.preventDefault();
    const fullname = document.getElementById("reg-fullname").value.trim();
    const username = document.getElementById("reg-username").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    const passwordConfirm = document.getElementById("reg-password-confirm").value.trim();
    const role = 'driver';

    if (!fullname || !username || !password || !passwordConfirm) {
        showToast("⚠️ Wypełnij wszystkie pola!");
        return;
    }

    if (password !== passwordConfirm) {
        showToast("❌ Hasła nie są identyczne!");
        return;
    }

    if (password.length < 3) {
        showToast("⚠️ Hasło musi mieć co najmniej 3 znaki!");
        return;
    }

    // Sprawdzenie czy użytkownik już istnieje
    let users = [];
    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            const snap = await db.collection('users').get();
            snap.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        } catch (err) {
            console.warn("Błąd pobierania użytkowników z Firebase:", err);
        }
    }

    const localUsers = getStoredData(STORAGE_KEYS.USERS, DEFAULT_USERS);
    localUsers.forEach(u => {
        if (!users.some(existing => existing.username.toLowerCase() === u.username.toLowerCase())) {
            users.push(u);
        }
    });

    const userExists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
    if (userExists) {
        showToast("❌ Ta nazwa użytkownika jest już zajęta!");
        return;
    }

    const newUser = {
        id: 'usr_' + Date.now(),
        username: username,
        password: password,
        name: fullname,
        role: role
    };

    // Zapis lokalny
    const updatedLocalUsers = getStoredData(STORAGE_KEYS.USERS, DEFAULT_USERS);
    updatedLocalUsers.push(newUser);
    setStoredData(STORAGE_KEYS.USERS, updatedLocalUsers);

    // Zapis w Firebase Firestore
    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            await db.collection('users').doc(newUser.id).set(newUser);
        } catch (err) {
            console.warn("Błąd zapisu użytkownika w Firebase Firestore:", err);
        }
    }

    setCurrentUser(newUser);
    showToast(`🎉 Konto utworzone! Witaj, ${newUser.name}!`);
    renderAppLayout();
}

function handleLogout() {
    setCurrentUser(null);
    renderAppLayout();
    showToast("Wylogowano pomyślnie.");
}

// NAWIGACJA ZAKŁADEK
function switchTab(tabName) {
    document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

    const targetTab = document.getElementById(`tab-${tabName}`);
    const targetBtn = document.getElementById(`nav-btn-${tabName}`);

    if (targetTab) targetTab.classList.add("active");
    if (targetBtn) targetBtn.classList.add("active");

    if (tabName === 'history') {
        renderHistoryTable();
    } else if (tabName === 'charts') {
        renderCharts();
    } else if (tabName === 'admin') {
        renderAdminPanel();
    }
}

// WYLICZANIE TYGODNIA I ROKU
function updateWeekAndYear(str) {
    const displayElem = document.getElementById("week-year-display");
    if (!displayElem) return;
    if (!str || !str.trim()) {
        displayElem.value = "-";
        return;
    }

    const match = str.match(/(\d{1,2})[\.\/](\d{1,2})(?:[\.\/](\d{2,4}))?/);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        let year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
        if (year < 100) year += 2000;

        const d = new Date(Date.UTC(year, month, day));
        if (!isNaN(d.getTime())) {
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
            const weekYear = d.getUTCFullYear();

            displayElem.value = `Tydzień ${weekNo} / ${weekYear}`;
            return;
        }
    }
    displayElem.value = "-";
}

// KALKULATOR ZAROBKÓW
let currentCalculation = null;

async function calculateSettlement() {
    let config = getStoredData(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            const doc = await db.collection('settings').doc('config').get();
            if (doc.exists) config = doc.data();
        } catch (e) {}
    }
    
    const kursyb = Number(document.getElementById("boltk").value) || 0;
    const kursyu = Number(document.getElementById("uberk").value) || 0;
    const allkursy = kursyb + kursyu;

    const zarobkib = Number(document.getElementById("boltz").value) || 0;
    const zarobkiu = Number(document.getElementById("uberz").value) || 0;
    const allzarobki = zarobkib + zarobkiu;

    const gotowkab = Number(document.getElementById("boltg").value) || 0;
    const gotowkau = Number(document.getElementById("uberg").value) || 0;
    const allgotowka = gotowkab + gotowkau;

    // Szukanie progu %
    let procent = 0.60;
    if (config.tiers && config.tiers.length > 0) {
        const matchedTier = config.tiers.find(t => allkursy >= t.min && allkursy <= t.max);
        if (matchedTier) {
            procent = matchedTier.percent;
        } else {
            if (allkursy > config.tiers[config.tiers.length - 1].max) {
                procent = config.tiers[config.tiers.length - 1].percent;
            } else {
                procent = config.tiers[0].percent;
            }
        }
    }

    const fixedFee = config.fixedTaxFee !== undefined ? config.fixedTaxFee : 29;
    const taxPct = config.taxPercent !== undefined ? config.taxPercent : 0.01;

    let utarg = allzarobki * procent;
    let podatki = (utarg * taxPct) + fixedFee;
    let naczysto = utarg - podatki;
    let doprzelewu = naczysto - allgotowka;

    const fuelElem = document.getElementById("fuel-amount");
    const paliwo = fuelElem ? (Number(fuelElem.value) || 0) : 0;

    const user = getCurrentUser();

    currentCalculation = {
        period: document.getElementById("period-text").value.trim() || "07.09-13.09",
        weekYear: document.getElementById("week-year-display").value || "Tydzień 37 / 2026",
        driverName: document.getElementById("driver-name").value.trim() || (user ? user.name : "Kierowca"),
        paliwo,
        uber: { zarobki: zarobkiu, gotowka: gotowkau, kursy: kursyu },
        bolt: { zarobki: zarobkib, gotowka: gotowkab, kursy: kursyb },
        total: { zarobki: allzarobki, gotowka: allgotowka, kursy: allkursy },
        procent,
        utarg,
        podatki,
        naczysto,
        doprzelewu,
        userId: user ? user.id : 'usr_1',
        createdAt: new Date().toISOString()
    };

    // Wyświetlanie wyników
    document.getElementById("res-naczysto").innerText = formatPLN(naczysto);
    document.getElementById("res-doprzelewu").innerText = formatPLN(doprzelewu);
    document.getElementById("res-allgotowka").innerText = formatPLN(allgotowka);
    document.getElementById("res-procent").innerText = Math.round(procent * 100) + '%';

    const transferCard = document.getElementById("transfer-card");
    if (doprzelewu < 0) {
        transferCard.classList.add("negative");
        transferCard.classList.remove("transfer");
    } else {
        transferCard.classList.add("transfer");
        transferCard.classList.remove("negative");
    }

    document.getElementById("results").style.display = "block";
}

// ZAPISANIE ROZLICZENIA DO HISTORII (LOCALSTORAGE / FIREBASE)
async function saveCurrentSettlement() {
    if (!currentCalculation) {
        await calculateSettlement();
    }
    
    // Zapis w Firebase Firestore jeśli aktywny
    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            if (currentEditingId) {
                await db.collection('settlements').doc(currentEditingId).set(currentCalculation, { merge: true });
                showToast("⚡ Zaktualizowano rozliczenie w chmurze Firebase!");
                currentEditingId = null;
                document.getElementById("btn-save-text").innerText = "💾 Zapisz w historii";
            } else {
                const docRef = await db.collection('settlements').add(currentCalculation);
                showToast("⚡ Zapisano rozliczenie w chmurze Firebase!");
            }
        } catch (e) {
            console.error("Błąd zapisu w Firebase:", e);
        }
    }

    // Zapis w localStorage jako kopia bezpieczeństwa
    const settlements = getStoredData(STORAGE_KEYS.SETTLEMENTS, []);
    if (currentEditingId) {
        const idx = settlements.findIndex(s => s.id === currentEditingId);
        if (idx !== -1) {
            settlements[idx] = { ...currentCalculation, id: currentEditingId };
        }
        currentEditingId = null;
        document.getElementById("btn-save-text").innerText = "💾 Zapisz w historii";
    } else {
        const newRecord = {
            ...currentCalculation,
            id: 'set_' + Date.now()
        };
        settlements.unshift(newRecord);
    }
    setStoredData(STORAGE_KEYS.SETTLEMENTS, settlements);

    if (!isFirebaseActive) {
        showToast("Rozliczenie zostało zapisane w historii!");
    }
}

// POBIERANIE ROZLICZEŃ (Z FIREBASE LUB LOCALSTORAGE)
async function fetchSettlements() {
    let settlements = [];
    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            const snap = await db.collection('settlements').orderBy('createdAt', 'desc').get();
            snap.forEach(doc => {
                settlements.push({ id: doc.id, ...doc.data() });
            });
            if (settlements.length > 0) return settlements;
        } catch (e) {
            console.warn("Błąd odczytu z Firebase, odczytywanie z localStorage", e);
        }
    }
    return getStoredData(STORAGE_KEYS.SETTLEMENTS, []);
}

// WIDOK HISTORII ROZLICZEŃ
async function renderHistoryTable() {
    const container = document.getElementById("history-table-body");
    if (!container) return;

    const user = getCurrentUser();
    let settlements = await fetchSettlements();

    if (user && user.role !== 'admin') {
        settlements = settlements.filter(s => s.userId === user.id);
    }

    if (settlements.length === 0) {
        container.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#9ca3af; padding: 30px;">Brak zapisanych rozliczeń tygodniowych.</td></tr>`;
        return;
    }

    container.innerHTML = settlements.map(s => `
        <tr>
            <td>
                <strong>${s.period}</strong><br>
                <span style="font-size:0.8rem; color:#9ca3af;">${s.weekYear}</span>
            </td>
            <td>${s.driverName}</td>
            <td><span class="badge-tag">${Math.round(s.procent * 100)}%</span> (${s.total.kursy} kursów)</td>
            <td style="color:#34d399; font-weight:bold;">${formatPLN(s.naczysto)}</td>
            <td style="${s.doprzelewu < 0 ? 'color:#f87171;' : 'color:#38bdf8;'} font-weight:bold;">${formatPLN(s.doprzelewu)}</td>
            <td>${formatPLN(s.total.gotowka)}${s.paliwo ? `<br><span style="font-size:0.78rem; color:#9ca3af;">⛽ Paliwo: ${formatPLN(s.paliwo)}</span>` : ''}</td>
            <td>
                <button class="btn-icon" title="Edytuj" onclick="editSettlement('${s.id}')">✏️</button>
                <button class="btn-icon" title="Pobierz PDF" onclick="generatePDFFromId('${s.id}')">📄</button>
                <button class="btn-icon delete" title="Usuń" onclick="deleteSettlement('${s.id}')">🗑️</button>
            </td>
        </tr>
    `).join("");
}

async function editSettlement(id) {
    const settlements = await fetchSettlements();
    const found = settlements.find(s => s.id === id);
    if (!found) return;

    document.getElementById("period-text").value = found.period;
    updateWeekAndYear(found.period);
    document.getElementById("driver-name").value = found.driverName;
    const fuelInp = document.getElementById("fuel-amount");
    if (fuelInp) fuelInp.value = (found.paliwo && found.paliwo > 0) ? found.paliwo : "";

    document.getElementById("uberz").value = found.uber.zarobki;
    document.getElementById("uberg").value = found.uber.gotowka;
    document.getElementById("uberk").value = found.uber.kursy;

    document.getElementById("boltz").value = found.bolt.zarobki;
    document.getElementById("boltg").value = found.bolt.gotowka;
    document.getElementById("boltk").value = found.bolt.kursy;

    currentEditingId = id;
    document.getElementById("btn-save-text").innerText = "🔄 Zaktualizuj rozliczenie";

    switchTab('calc');
    await calculateSettlement();
    showToast("Wczytano rozliczenie do edycji!");
}

async function deleteSettlement(id) {
    if (!confirm("Czy na pewno chcesz usunąć to rozliczenie z historii?")) return;
    
    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            await db.collection('settlements').doc(id).delete();
        } catch (e) {}
    }

    let settlements = getStoredData(STORAGE_KEYS.SETTLEMENTS, []);
    settlements = settlements.filter(s => s.id !== id);
    setStoredData(STORAGE_KEYS.SETTLEMENTS, settlements);

    renderHistoryTable();
    showToast("Rozliczenie zostało usunięte.");
}

// RYSOWANIE WYKRESÓW (CHART.JS)
async function renderCharts() {
    const user = getCurrentUser();
    let settlements = await fetchSettlements();

    if (user && user.role !== 'admin') {
        settlements = settlements.filter(s => s.userId === user.id);
    }

    settlements = [...settlements].reverse();

    const totalEarnings = settlements.reduce((acc, s) => acc + s.naczysto, 0);
    const totalTrips = settlements.reduce((acc, s) => acc + s.total.kursy, 0);
    const avgEarnings = settlements.length > 0 ? (totalEarnings / settlements.length) : 0;

    document.getElementById("stat-total-naczysto").innerText = formatPLN(totalEarnings);
    document.getElementById("stat-total-trips").innerText = totalTrips + " kursów";
    document.getElementById("stat-avg-weekly").innerText = formatPLN(avgEarnings);

    const labels = settlements.map(s => s.period);
    const naczystoData = settlements.map(s => s.naczysto);
    const uberData = settlements.map(s => s.uber.zarobki);
    const boltData = settlements.map(s => s.bolt.zarobki);

    const ctx1 = document.getElementById("incomeChart");
    if (ctx1) {
        if (incomeChartInstance) incomeChartInstance.destroy();
        incomeChartInstance = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['Brak danych'],
                datasets: [{
                    label: 'Zarobki Na czysto (zł)',
                    data: naczystoData.length > 0 ? naczystoData : [0],
                    backgroundColor: 'rgba(52, 211, 153, 0.7)',
                    borderColor: '#34d399',
                    borderWidth: 2,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#f3f4f6', font: { family: 'Plus Jakarta Sans', weight: 'bold' } } }
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }

    const ctx2 = document.getElementById("appComparisonChart");
    if (ctx2) {
        if (appComparisonChartInstance) appComparisonChartInstance.destroy();
        appComparisonChartInstance = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: labels.length > 0 ? labels : ['Brak danych'],
                datasets: [
                    {
                        label: 'Uber (zł)',
                        data: uberData.length > 0 ? uberData : [0],
                        backgroundColor: 'rgba(56, 189, 248, 0.7)',
                        borderColor: '#38bdf8',
                        borderWidth: 2,
                        borderRadius: 8
                    },
                    {
                        label: 'Bolt (zł)',
                        data: boltData.length > 0 ? boltData : [0],
                        backgroundColor: 'rgba(52, 211, 153, 0.7)',
                        borderColor: '#34d399',
                        borderWidth: 2,
                        borderRadius: 8
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#f3f4f6', font: { family: 'Plus Jakarta Sans', weight: 'bold' } } }
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    y: { ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255,255,255,0.05)' } }
                }
            }
        });
    }
}

// PANEL ADMINISTATORA
async function renderAdminPanel() {
    let config = getStoredData(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    let users = getStoredData(STORAGE_KEYS.USERS, DEFAULT_USERS);

    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            const configDoc = await db.collection('settings').doc('config').get();
            if (configDoc.exists) config = configDoc.data();

            const usersSnap = await db.collection('users').get();
            const fbUsers = [];
            usersSnap.forEach(doc => fbUsers.push({ id: doc.id, ...doc.data() }));
            if (fbUsers.length > 0) users = fbUsers;
        } catch (e) {}
    }

    document.getElementById("admin-fixed-fee").value = config.fixedTaxFee !== undefined ? config.fixedTaxFee : 29;
    document.getElementById("admin-tax-pct").value = (config.taxPercent !== undefined ? config.taxPercent * 100 : 1);

    const tiersBody = document.getElementById("admin-tiers-body");
    if (tiersBody) {
        tiersBody.innerHTML = config.tiers.map((t, idx) => `
            <tr>
                <td>${t.min} - ${t.max >= 9999 ? '∞' : t.max} kursów</td>
                <td><strong style="color:#34d399;">${Math.round(t.percent * 100)}%</strong></td>
                <td>
                    <button class="btn-icon delete" onclick="deleteAdminTier(${idx})">🗑️</button>
                </td>
            </tr>
        `).join("");
    }

    const usersBody = document.getElementById("admin-users-body");
    if (usersBody) {
        usersBody.innerHTML = users.map(u => `
            <tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.username}</td>
                <td><span class="badge-tag" style="${u.role === 'admin' ? 'background:rgba(168, 85, 247, 0.2); color:#a855f7;' : ''}">${u.role.toUpperCase()}</span></td>
                <td>
                    ${u.role !== 'admin' ? `<button class="btn-icon delete" onclick="deleteAdminUser('${u.id}')">🗑️</button>` : '-'}
                </td>
            </tr>
        `).join("");
    }
}

async function saveAdminTaxSettings(e) {
    if (e) e.preventDefault();
    const config = getStoredData(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    config.fixedTaxFee = Number(document.getElementById("admin-fixed-fee").value) || 0;
    config.taxPercent = (Number(document.getElementById("admin-tax-pct").value) || 0) / 100;
    
    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            await db.collection('settings').doc('config').set(config, { merge: true });
        } catch (err) {}
    }

    setStoredData(STORAGE_KEYS.CONFIG, config);
    showToast("Zapisano nowe ustaweinia opłat i podatków!");
}

async function addAdminTier(e) {
    if (e) e.preventDefault();
    const min = Number(document.getElementById("tier-min").value);
    const max = Number(document.getElementById("tier-max").value);
    const pct = Number(document.getElementById("tier-pct").value) / 100;

    if (isNaN(min) || isNaN(max) || isNaN(pct)) return;

    const config = getStoredData(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    config.tiers.push({ min, max, percent: pct });
    config.tiers.sort((a, b) => a.min - b.min);

    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            await db.collection('settings').doc('config').set(config, { merge: true });
        } catch (err) {}
    }

    setStoredData(STORAGE_KEYS.CONFIG, config);
    renderAdminPanel();
    showToast("Dodano nowy próg prowizyjny!");
}

async function deleteAdminTier(idx) {
    const config = getStoredData(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    config.tiers.splice(idx, 1);

    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            await db.collection('settings').doc('config').set(config, { merge: true });
        } catch (err) {}
    }

    setStoredData(STORAGE_KEYS.CONFIG, config);
    renderAdminPanel();
    showToast("Usunięto próg prowizyjny.");
}

async function addAdminUser(e) {
    if (e) e.preventDefault();
    const name = document.getElementById("new-user-name").value.trim();
    const username = document.getElementById("new-user-username").value.trim();
    const pass = document.getElementById("new-user-pass").value.trim();
    const role = document.getElementById("new-user-role").value;

    if (!name || !username || !pass) return;

    const newUser = { name, username, password: pass, role };

    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            await db.collection('users').add(newUser);
        } catch (err) {}
    }

    const users = getStoredData(STORAGE_KEYS.USERS, DEFAULT_USERS);
    users.push({ id: 'usr_' + Date.now(), ...newUser });
    setStoredData(STORAGE_KEYS.USERS, users);

    renderAdminPanel();
    showToast(`Dodano nowego kierowcę: ${name}`);

    document.getElementById("new-user-name").value = "";
    document.getElementById("new-user-username").value = "";
    document.getElementById("new-user-pass").value = "";
}

async function deleteAdminUser(id) {
    if (!confirm("Czy na pewno chcesz usunąć to konto kierowcy?")) return;
    
    if (typeof isFirebaseActive !== 'undefined' && isFirebaseActive && db) {
        try {
            await db.collection('users').doc(id).delete();
        } catch (e) {}
    }

    let users = getStoredData(STORAGE_KEYS.USERS, DEFAULT_USERS);
    users = users.filter(u => u.id !== id);
    setStoredData(STORAGE_KEYS.USERS, users);

    renderAdminPanel();
    showToast("Konto użytkownika zostało usunięte.");
}

// GENEROWANIE PDF
async function generatePDFFromId(id) {
    const settlements = await fetchSettlements();
    const found = settlements.find(s => s.id === id);
    if (!found) return;

    currentCalculation = found;
    generatePDF();
}

function generatePDF() {
    if (!currentCalculation) {
        calculateSettlement();
    }
    const data = currentCalculation;
    const todayStr = new Date().toLocaleDateString('pl-PL');

    document.getElementById("pdf-gen-date").innerText = todayStr;
    document.getElementById("pdf-driver-val").innerText = data.driverName;
    document.getElementById("pdf-period-val").innerText = data.period;
    document.getElementById("pdf-weekyear-val").innerText = data.weekYear;

    document.getElementById("pdf-uberk").innerText = data.uber.kursy;
    document.getElementById("pdf-uberg").innerText = formatPLN(data.uber.gotowka);
    document.getElementById("pdf-uberz").innerText = formatPLN(data.uber.zarobki);

    document.getElementById("pdf-boltk").innerText = data.bolt.kursy;
    document.getElementById("pdf-boltg").innerText = formatPLN(data.bolt.gotowka);
    document.getElementById("pdf-boltz").innerText = formatPLN(data.bolt.zarobki);

    document.getElementById("pdf-allkursy").innerText = data.total.kursy;
    document.getElementById("pdf-allgotowka-tab").innerText = formatPLN(data.total.gotowka);
    document.getElementById("pdf-allzarobki").innerText = formatPLN(data.total.zarobki);

    document.getElementById("pdf-procent-val").innerText = Math.round(data.procent * 100) + '%';
    document.getElementById("pdf-utarg-val").innerText = formatPLN(data.utarg);
    document.getElementById("pdf-podatki-val").innerText = '-' + formatPLN(data.podatki);
    if (document.getElementById("pdf-paliwo-val")) {
        document.getElementById("pdf-paliwo-val").innerText = formatPLN(data.paliwo || 0);
    }

    document.getElementById("pdf-naczysto").innerText = formatPLN(data.naczysto);
    document.getElementById("pdf-doprzelewu").innerText = formatPLN(data.doprzelewu);
    document.getElementById("pdf-allgotowka").innerText = formatPLN(data.total.gotowka);
    document.getElementById("pdf-procent").innerText = Math.round(data.procent * 100) + '%';

    const element = document.getElementById("pdf-content");
    const opt = {
        margin:       [10, 10, 10, 10],
        filename:     `Rozliczenie_${data.driverName.replace(/\s+/g, '_')}_${data.period.replace(/\s+/g, '')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    if (typeof html2pdf !== 'undefined') {
        html2pdf().set(opt).from(element).save();
    } else {
        window.print();
    }
}

// WIDOK I STAN APPLIKACJI (LAYOUT RENDER)
function renderAppLayout() {
    const user = getCurrentUser();
    const loginScreen = document.getElementById("screen-login");
    const mainApp = document.getElementById("screen-main");
    const navAdminBtn = document.getElementById("nav-btn-admin");

    if (!user) {
        loginScreen.style.display = "flex";
        mainApp.style.display = "none";
        return;
    }

    loginScreen.style.display = "none";
    mainApp.style.display = "block";

    document.getElementById("nav-user-name").innerText = user.name;
    document.getElementById("nav-user-avatar").innerText = user.name.charAt(0).toUpperCase();

    if (user.role === 'admin') {
        navAdminBtn.style.display = "flex";
    } else {
        navAdminBtn.style.display = "none";
    }

    switchTab('calc');
    updateWeekAndYear(document.getElementById("period-text").value);
}

// INICJALIZACJA STRONY
window.addEventListener('DOMContentLoaded', async () => {
    await initAppStorage();
    renderAppLayout();
});
