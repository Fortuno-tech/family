// CONFIGURATION GLOBALE
const SARANY_ISAM_BOLANA = 2000;
const PIN_SECRET = "1712"; 
let members = [];
let myChart = null;

// INITIALISATION AU CHARGEMENT
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    initFirebaseListener();
});

// ÉCOUTEUR FIREBASE (Temps Réel)
function initFirebaseListener() {
    const q = window.fs.query(window.fs.collection(window.db, "members"), window.fs.orderBy("name"));
    window.fs.onSnapshot(q, (snapshot) => {
        members = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderData();
        updateChart();
    });
}

// CHANGEMENT D'ONGLET
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
}

// VÉRIFICATION ADMIN
function checkAdminAccess() {
    Swal.fire({
        title: 'Fidirana Admin',
        input: 'password',
        showCancelButton: true,
        confirmButtonText: 'Hampiditra',
        confirmButtonColor: '#4338ca'
    }).then((result) => {
        if (result.isConfirmed && result.value === PIN_SECRET) {
            switchTab('admin');
            renderAdminData();
        } else if (result.isConfirmed) {
            Swal.fire('Diso', 'Tsy mety ny teny miafina', 'error');
        }
    });
}

// RENDU DES DONNÉES
function renderData() {
    const tableBody = document.getElementById('publicTableBody');
    if (!tableBody) return;

    let totalGlobal = 0;
    let html = "";

    members.forEach(m => {
        const paid = m.totalPaid || 0;
        totalGlobal += paid;
        const monthsCount = Math.floor(paid / SARANY_ISAM_BOLANA);
        
        let dots = "";
        for(let i=1; i<=12; i++) {
            const color = i <= monthsCount ? '#10b981' : '#e2e8f0';
            dots += `<td class="p-1 text-center"><div style="width:8px;height:8px;border-radius:50%;background:${color};margin:auto;"></div></td>`;
        }

        html += `<tr><td class="p-3 font-bold">${m.name}</td>${dots}<td class="p-3 text-right font-bold text-indigo-600">${paid.toLocaleString()} Ar</td></tr>`;
    });

    tableBody.innerHTML = html;
    updateStats(totalGlobal);
}

// MISE À JOUR DES STATS
function updateStats(total) {
    const goal = members.length * (SARANY_ISAM_BOLANA * 12);
    document.getElementById('totalCollected').innerText = total.toLocaleString() + " Ar";
    document.getElementById('remainingAmount').innerText = (goal - total).toLocaleString() + " Ar";
    const percent = goal > 0 ? Math.round((total / goal) * 100) : 0;
    document.getElementById('participationRate').innerText = percent + "%";
}

// GRAPHIQUE
function updateChart() {
    const ctx = document.getElementById('paymentChart').getContext('2d');
    if(myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: members.map(m => m.name),
            datasets: [{
                label: 'Ar naloa',
                data: members.map(m => m.totalPaid),
                borderColor: '#4338ca',
                backgroundColor: 'rgba(67, 56, 202, 0.1)',
                fill: true,
                tension: 0 // Plus fluide pour Oppo
            }]
        },
        options: { responsive: true, plugins: { legend: { display: false } } }
    });
}

// FONCTIONS THEME
function toggleTheme() {
    const body = document.documentElement;
    const isDark = body.getAttribute('data-theme') === 'dark';
    body.setAttribute('data-theme', isDark ? 'light' : 'dark');
    document.getElementById('themeIcon').setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    lucide.createIcons();
}