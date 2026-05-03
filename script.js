// --- CONFIGURATION ---
const PIN_SECRET = "123456";
const SARANY_ISAM_BOLANA = 2000;
let myChart = null; // Hitahirizana ny graphe
let members = [];   // Hozakain'ny Firebase ny fenoina eto

// 1. MIANDRY NY FIREBASE HO VONONA
// Satria "type=module" ny any amin'ny HTML, miandry kely isika vao manomboka
const checkFirebase = setInterval(() => {
    if (window.db && window.fs) {
        clearInterval(checkFirebase);
        initFirebaseSync(); // Rehefa vonona ny Firebase vao manomboka ny sync
    }
}, 500);

// 2. SYNCHRONISATION EN TEMPS RÉEL (FIANDRIANA NY DATA)
function initFirebaseSync() {
    const { collection, onSnapshot, query, orderBy } = window.fs;
    
    // Alaina ny data rehetra ao amin'ny collection "members" ary alahatra araka ny anarana
    const q = query(collection(window.db, "members"), orderBy("name", "asc"));
    
    onSnapshot(q, (snapshot) => {
        members = [];
        snapshot.forEach((doc) => {
            members.push({ id: doc.id, ...doc.data() });
        });
        renderData(); // Havaozina ny dashboard isaky ny misy fiovana
    }, (error) => {
        console.error("Fahadisoana tamin'ny Firestore:", error);
    });
}

// 3. Fampisehoana ny data (Dashboard + Admin)
function renderData() {
    const publicTable = document.getElementById('publicTableBody');
    const adminTable = document.getElementById('adminTableBody');
    if (!publicTable || !adminTable) return;

    publicTable.innerHTML = '';
    adminTable.innerHTML = '';

    let totalCollected = 0;
    let fullPaidCount = 0;
    let monthlyTotals = new Array(12).fill(0);

    members.forEach(m => {
        const val = m.totalPaid || 0;
        totalCollected += val;
        if (val >= 24000) fullPaidCount++;

        const monthsPaidCount = Math.min(12, Math.floor(val / SARANY_ISAM_BOLANA));
        for(let i=0; i < monthsPaidCount; i++) monthlyTotals[i] += SARANY_ISAM_BOLANA;

        // --- Render Tabilao Public ---
        let monthCells = '';
        for (let i = 1; i <= 12; i++) {
            monthCells += `<td class="p-2 text-center border-b border-slate-50">
                <span class="inline-block w-2.5 h-2.5 rounded-full ${i <= monthsPaidCount ? 'bg-emerald-500 shadow-sm' : 'bg-slate-200'}"></span>
            </td>`;
        }

        publicTable.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4 font-bold text-slate-700 border-b border-slate-50">${m.name}</td>
                ${monthCells}
                <td class="p-4 text-right font-black text-indigo-600 border-b border-slate-50">${val.toLocaleString()} Ar</td>
            </tr>`;

        // --- Render Tabilao Admin ---
        adminTable.innerHTML += `
            <tr class="hover:bg-indigo-50/30 transition">
                <td class="p-4 font-bold text-slate-800 border-b border-slate-100">${m.name}</td>
                <td class="p-4 font-mono font-bold text-emerald-600 border-b border-slate-100">${val.toLocaleString()} Ar</td>
                <td class="p-4 flex justify-end gap-2 border-b border-slate-100">
                    <button onclick="updatePayment('${m.id}', ${SARANY_ISAM_BOLANA})" class="p-2 bg-emerald-500 text-white rounded-lg shadow-sm hover:scale-110 transition"><i data-lucide="plus-circle" class="w-4"></i></button>
                    <button onclick="updatePayment('${m.id}', -${SARANY_ISAM_BOLANA})" class="p-2 bg-amber-500 text-white rounded-lg shadow-sm hover:scale-110 transition"><i data-lucide="minus-circle" class="w-4"></i></button>
                    <button onclick="deleteMember('${m.id}')" class="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white transition"><i data-lucide="trash-2" class="w-4"></i></button>
                </td>
            </tr>`;
    });

    // Update Stats & Graphe
    updateDashboardStats(totalCollected, fullPaidCount);
    updateChart(monthlyTotals);

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// 4. ASA FIREBASE (CRUD)
async function saveMember() {
    const input = document.getElementById('adminName');
    const name = input.value.trim();
    if (!name) return;

    try {
        await window.fs.addDoc(window.fs.collection(window.db, "members"), {
            name: name,
            totalPaid: 0,
            createdAt: new Date()
        });
        input.value = '';
    } catch (e) { alert("Error: " + e); }
}

async function updatePayment(id, amt) {
    const member = members.find(m => m.id === id);
    const newVal = Math.max(0, (member.totalPaid || 0) + amt);
    
    try {
        const docRef = window.fs.doc(window.db, "members", id);
        await window.fs.updateDoc(docRef, { totalPaid: newVal });
    } catch (e) { console.error(e); }
}

async function deleteMember(id) {
    if (confirm("Hafafa tokoa ve ity mpikambana ity?")) {
        try {
            await window.fs.deleteDoc(window.fs.doc(window.db, "members", id));
        } catch (e) { console.error(e); }
    }
}

// 5. TOOLS (Charts, Stats, Tabs)
function updateDashboardStats(total, fullCount) {
    const totalExpected = members.length * 24000;
    const percent = totalExpected > 0 ? Math.round((total / totalExpected) * 100) : 0;
    
    document.getElementById('totalCollected').innerText = total.toLocaleString() + " Ar";
    document.getElementById('remainingAmount').innerText = (totalExpected - total).toLocaleString() + " Ar";
    document.getElementById('participationRate').innerText = percent + "%";
    
    document.getElementById('avgPayment').innerText = members.length > 0 ? Math.round(total / members.length).toLocaleString() + " Ar" : "0 Ar";
    document.getElementById('fullPaidCount').innerText = fullCount + " / " + members.length;
    document.getElementById('progressBar').style.width = percent + "%";
}

function updateChart(dataValues) {
    const canvas = document.getElementById('paymentChart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
            datasets: [{ 
                label: 'Vola miditra', 
                data: dataValues, 
                borderColor: '#4f46e5', 
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: true, 
                tension: 0.4 
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

window.switchTab = (id) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
};

window.checkAdminAccess = () => {
    if (prompt("Admin PIN:") === PIN_SECRET) window.switchTab('admin');
};
function toggleTheme() {
    const body = document.documentElement;
    const icon = document.getElementById('themeIcon');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        icon.setAttribute('data-lucide', 'sun');
    } else {
        body.setAttribute('data-theme', 'dark');
        icon.setAttribute('data-lucide', 'moon');
    }
    lucide.createIcons(); // Pour rafraîchir l'icône soleil/lune
}