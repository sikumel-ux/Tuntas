// ==========================================================================
// CONFIG: URL WEB APP APPS SCRIPT ASLI KAMU SUDAH TERPASANG 100%
// ==========================================================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwI8UM92CtLbTAE5F8UVjnm3qT-8ITco_-bPIQIjBfokGojFhYkRfl0YP9zCpVaRfTIpg/exec"; 

// Fungsi Pengendali Loading Screen (Putih - Hijau)
function showLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'flex';
}

function hideLoading() {
    const loader = document.getElementById('loading');
    if (loader) loader.style.display = 'none';
}

// Fungsi Pindah Tab Menu Bawah (Mencegah Layar Numpuk)
function bukaTab(targetId) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    
    const targetTab = document.getElementById('tab-' + targetId);
    const targetBtn = document.getElementById('nav-' + targetId);
    
    if (targetTab) targetTab.style.display = 'block';
    if (targetBtn) targetBtn.classList.add('active');
}

// ==========================================================================
// ENGINE UTAMA: HIT DATA REAL-TIME GOOGLE SHEETS
// ==========================================================================
async function loadDataDariSheets() {
    showLoading();
    try {
        const response = await fetch(`${SCRIPT_URL}?action=readData`);
        if (!response.ok) throw new Error("Gagal mengambil data dari Google Sheets");
        
        const data = await response.json();
        
        // Suntik data angka & saldo asli dari Google Sheets ke HTML
        document.getElementById('vTotalKas').innerText = data.totalKas || "Rp 0";
        document.getElementById('vTotalWarga').innerText = (data.totalWarga || "0") + " Warga";
        
        // Render daftar histori transaksi asli dari Sheets
        const listKas = document.getElementById('listKas');
        if (listKas) {
            if (data.alurKas && data.alurKas.length > 0) {
                listKas.innerHTML = data.alurKas.map(item => `
                    <div class="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs border border-slate-100">
                        <div>
                            <p class="font-bold text-slate-800 uppercase">${item.nama}</p>
                            <p class="text-[10px] text-slate-400 mt-0.5">${item.tanggal}</p>
                        </div>
                        <p class="${item.jenis === 'Masuk' ? 'text-emerald-600' : 'text-red-500'} font-bold text-sm">${item.nominal}</p>
                    </div>
                `).join('');
            } else {
                listKas.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">Belum ada data transaksi.</p>`;
            }
        }

        // Render dropdown pilihan nama warga asli dari Sheets untuk form pembayaran
        const iNama = document.getElementById('iNama');
        if (iNama) {
            if (data.daftarWarga && data.daftarWarga.length > 0) {
                iNama.innerHTML = data.daftarWarga.map(warga => `
                    <option value="${warga}">${warga.toUpperCase()}</option>
                `).join('');
            } else {
                iNama.innerHTML = `<option value="">-- Tidak ada data warga --</option>`;
            }
        }
        
    } catch (error) {
        console.error(error);
        alert("Gagal memuat data. Pastikan Apps Script kamu sudah di-Deploy sebagai 'Anyone' (Semua Orang).");
    } finally {
        hideLoading(); // Matikan loading screen putih, buka dashboard
    }
}

// Fungsi Simpan Form Transaksi Iuran Ke Google Sheets
async function simpanIuran() {
    const tgl = document.getElementById('iTgl').value;
    const nama = document.getElementById('iNama').value;
    const nominal = document.getElementById('iNom').value;

    if (!tgl || !nama || !nominal) {
        alert("Harap isi semua baris form pembayaran!");
        return;
    }

    showLoading();
    try {
        const response = await fetch(SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "insertIuran", tanggal: tgl, nama: nama, nominal: nominal })
        });
        
        alert("Pembayaran berhasil disimpan ke Google Sheets!");
        
        // Reset input nominal setelah sukses menyimpan
        document.getElementById('iNom').value = "";
        
        // Segarkan data dashboard otomatis
        loadDataDariSheets();
    } catch (error) {
        alert("Gagal menyimpan data ke Sheets. Periksa koneksi internet atau konfigurasi Apps Script.");
        hideLoading();
    }
}

// Fungsi Keluar Aplikasi
function logoutAdmin() {
    window.location.href = "login.html";
}

// Trigger inisialisasi otomatis saat halaman pertama kali terbuka
window.addEventListener('DOMContentLoaded', () => {
    // Set default tanggal form iuran ke hari ini
    const tglInput = document.getElementById('iTgl');
    if(tglInput) tglInput.value = new Date().toISOString().split('T')[0];
    
    // Jalankan penarikan data langsung
    loadDataDariSheets();
});
