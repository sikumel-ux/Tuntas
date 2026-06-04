// ==========================================================================
// TUNTAS - Premium Minimalist Frontend Engine (User/Warga Portal Engine v2.5)
// ==========================================================================

// URL REST API Google Apps Script Integration Engine (Sama dengan versi Admin)
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2O7sydQVyXZZhrsqAMhTABZkFYkL2x5L2x2exlc71Y6Qm-NPiUXYsSKzTsLVR_IJIRQ/exec";

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let dbGlobal = { kas: [], pembayaran: [], anggota: [], sampah: [] };
let sesiWarga = null; // Menyimpan data profil warga yang sedang login

// --- UI Loading & Modal Control ---
function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// --- Custom Alert (Premium UI) ---
function tuntasAlert(title, message, type = 'success') {
    const icon = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = message;
    
    icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center " + 
                     (type === 'error' ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600");
    icon.innerHTML = '<span class="material-symbols-rounded">' + 
                     (type === 'error' ? 'gpp_maybe' : 'check_circle') + '</span>';
    openModal('customAlert');
}

function closeAlert() { closeModal('customAlert'); }

function formatRupiah(num) { return "Rp " + parseFloat(num || 0).toLocaleString('id-ID'); }

// --- Toggle Password Visibility ---
function togglePasswordLogin(inputId, iconId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input && icon) {
        if (input.type === "password") {
            input.type = "text";
            icon.className = "fa-solid fa-eye text-sm";
        } else {
            input.type = "password";
            icon.className = "fa-solid fa-eye-slash text-sm";
        }
    }
}

// --- Salin Nomor Rekening ---
function salinRekening() {
    const noRek = document.getElementById('noRekText').innerText;
    navigator.clipboard.writeText(noRek).then(() => {
        tuntasAlert("Berhasil Salin", "Nomor rekening BCA berhasil disalin ke papan klip.");
    }).catch(() => {
        tuntasAlert("Gagal Salin", "Gagal menyalin otomatis.", "error");
    });
}

// --- Kirim Konfirmasi via WhatsApp ---
function kirimKonfirmasiWA() {
    if (!sesiWarga) return;
    const txt = "Halo Pengurus TUNTAS,\nSaya *" + sesiWarga.Nama.toUpperCase() + "* ingin mengonfirmasi pembayaran iuran yang telah saya transfer.\n\nBerikut bukti transfer saya terlampir.";
    window.open("https://wa.me/628123456789?text=" + encodeURIComponent(txt), '_blank'); // Sesuaikan nomor WA pengurus di sini
}

// --- Pemicu Input Upload Foto ---
function pemicuPilihFoto() {
    document.getElementById('fileFotoInput').click();
}

// --- Initialization App ---
function init() {
    // Cek Session Storage jika warga menyegarkan halaman (F5) namun sudah login sebelumnya
    const savedSession = sessionStorage.getItem("sesiWargaTuntas");
    if (savedSession) {
        sesiWarga = JSON.parse(savedSession);
        document.getElementById('screen-login').classList.add('hidden');
        document.getElementById('screen-dashboard').classList.remove('hidden');
        loadSeluruhDataAplikasi();
    } else {
        hideLoading();
    }
}

// --- Proses Otentikasi Login Warga ---
function prosesLoginWarga() {
    const hp = document.getElementById('lHp').value.trim();
    const pass = document.getElementById('lPass').value.trim();

    if (!hp || !pass) {
        tuntasAlert("Login Gagal", "Lengkapi nomor Whatsapp dan kata sandi Anda!", "error");
        return;
    }

    showLoading();
    
    // Tarik data anggota dari database Apps Script terlebih dahulu
    fetch(SCRIPT_URL + "?action=readAllData")
        .then(res => res.json())
        .then(res => {
            if (res.status === "error") {
                hideLoading();
                tuntasAlert("Gagal Server", res.message, "error");
                return;
            }

            dbGlobal.anggota = res.anggota || [];
            
            // Validasi data akun warga (Pencocokan Hp & Password)
            const cocok = dbGlobal.anggota.find(w => String(w.Hp) === hp && String(w.Password) === pass);

            if (cocok) {
                sesiWarga = cocok;
                sessionStorage.setItem("sesiWargaTuntas", JSON.stringify(cocok));
                
                // Pindah Tampilan Screen
                document.getElementById('screen-login').classList.add('hidden');
                document.getElementById('screen-dashboard').classList.remove('hidden');
                
                // Simpan cache data sisa database global
                dbGlobal.kas = res.kas || [];
                dbGlobal.pembayaran = res.pembayaran || [];
                dbGlobal.sampah = res.sampah || [];

                renderSesiProfilWarga();
                renderDashboardKas();
                renderDetailDataPribadi();
                hideLoading();
            } else {
                hideLoading();
                tuntasAlert("Gagal Masuk", "Nomor Whatsapp atau kata sandi salah. Silakan hubungi RT.", "error");
            }
        })
        .catch(err => {
            hideLoading();
            console.error(err);
            tuntasAlert("Error", "Gagal menyambung ke server Web Apps.", "error");
        });
}

// --- Tarik Ulang Data Aplikasi ---
function loadSeluruhDataAplikasi() {
    showLoading();
    fetch(SCRIPT_URL + "?action=readAllData")
        .then(res => res.json())
        .then(res => {
            if (res.status !== "error") {
                dbGlobal.kas = res.kas || [];
                dbGlobal.pembayaran = res.pembayaran || [];
                dbGlobal.anggota = res.anggota || [];
                dbGlobal.sampah = res.sampah || [];

                // Perbarui data sesi jikalau ada perubahan dari admin (seperti foto/password)
                const perbaruiSesi = dbGlobal.anggota.find(w => w.id === sesiWarga.id);
                if (perbaruiSesi) {
                    sesiWarga = perbaruiSesi;
                    sessionStorage.setItem("sesiWargaTuntas", JSON.stringify(perbaruiSesi));
                }

                renderSesiProfilWarga();
                renderDashboardKas();
                renderDetailDataPribadi();
            }
            hideLoading();
        })
        .catch(() => { hideLoading(); });
}

// --- Render Profil Header & Informasi Akun ---
function renderSesiProfilWarga() {
    if (!sesiWarga) return;

    const defaultAvatar = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80';
    const fotoProfil = (sesiWarga.Foto && sesiWarga.Foto !== '-') ? sesiWarga.Foto : defaultAvatar;

    // Set Top Header Panel
    document.getElementById('topNamaWarga').innerText = sesiWarga.Nama;
    document.getElementById('topHpWarga').innerText = sesiWarga.Hp;
    
    const miniAvatar = document.getElementById('miniAvatar');
    miniAvatar.src = fotoProfil;
    miniAvatar.classList.remove('hidden');

    // Set Menu Tab Informasi/Profil
    document.getElementById('infoNamaUser').innerText = sesiWarga.Nama;
    document.getElementById('infoHpUser').innerText = sesiWarga.Hp;
    document.getElementById('infoBergabung').innerHTML = '<i class="fa-solid fa-calendar-check mr-1"></i> Bergabung: ' + (sesiWarga.Bergabung || '-');

    const avatarImage = document.getElementById('avatarImage');
    const avatarIconDefault = document.getElementById('avatarIconDefault');
    
    avatarImage.src = fotoProfil;
    avatarImage.classList.remove('hidden');
    avatarIconDefault.classList.add('hidden');
}

// --- TAB 1: Render Dashboard Ringkasan Kas Umum ---
function renderDashboardKas() {
    let totalMasuk = 0, totalKeluar = 0, sisaSaldo = 0;
    const cont = document.getElementById('listMutasiKasDashboard');
    cont.innerHTML = "";

    // Urutkan data kas dari transaksi terbaru
    const kasTerurut = [...dbGlobal.kas].sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));

    kasTerurut.forEach(trx => {
        const nominal = parseFloat(trx.Nominal || 0);
        const isMasuk = trx.Kategori && trx.Kategori.toLowerCase() === 'masuk';

        if (isMasuk) totalMasuk += nominal; else totalKeluar += nominal;

        // Tampilkan daftar riwayat mutasi kas umum
        cont.innerHTML += '<div class="flex justify-between items-center py-3 bg-white border-b border-slate-50 animate-fade-in">' +
            '<div><p class="text-xs font-black uppercase text-slate-700">' + trx.Keterangan + '</p><p class="text-[9px] font-bold text-slate-400 mt-0.5">' + trx.Tanggal + '</p></div>' +
            '<div class="text-right"><p class="text-xs font-black ' + (isMasuk ? 'text-emerald-600' : 'text-rose-500') + '">' + (isMasuk ? '+' : '-') + ' ' + formatRupiah(nominal) + '</p></div>' +
        '</div>';
    });

    if (kasTerurut.length === 0) {
        cont.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada data transaksi kas.</p>';
    }

    sisaSaldo = totalMasuk - totalKeluar;
    document.getElementById('dashPemasukanKas').innerText = formatRupiah(totalMasuk);
    document.getElementById('dashPengeluaranKas').innerText = formatRupiah(totalKeluar);
    document.getElementById('dashSisaSaldoKas').innerText = formatRupiah(sisaSaldo);
}

// --- TAB 2: Render Data Pribadi (Kontribusi, Grid Iuran & Kalender Sampah) ---
function renderDetailDataPribadi() {
    if (!sesiWarga) return;

    // 1. Hitung Total Kontribusi & Histori Pembayaran Iuran Pribadi
    let totalKontribusi = 0;
    const listRiwayatPribadi = document.getElementById('listRiwayatPribadi');
    listRiwayatPribadi.innerHTML = "";

    const pembayaranPribadi = dbGlobal.pembayaran.filter(p => p.Nama && p.Nama.toLowerCase() === sesiWarga.Nama.toLowerCase());
    // Urutkan pembayaran terbaru
    pembayaranPribadi.sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));

    pembayaranPribadi.forEach(p => {
        const nominal = parseFloat(p.Nominal || 0);
        totalKontribusi += nominal;

        listRiwayatPribadi.innerHTML += '<div class="p-3 bg-white border border-slate-100 rounded-2xl flex justify-between items-center text-[11px] animate-fade-in">' +
            '<div><p class="font-black text-emerald-900 uppercase">' + p.Keterangan + '</p><p class="text-[9px] text-slate-400 font-bold mt-0.5">' + p.Tanggal + '</p></div>' +
            '<div><span class="font-extrabold text-slate-700">' + formatRupiah(nominal) + '</span></div>' +
        '</div>';
    });

    if (pembayaranPribadi.length === 0) {
        listRiwayatPribadi.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-2">Belum ada riwayat pembayaran iuran.</p>';
    }
    document.getElementById('dataTotalKontribusi').innerText = formatRupiah(totalKontribusi);

    // 2. Render Grid Status Bulanan (Lunas / Belum)
    const statusBulanGrid = document.getElementById('statusBulanGrid');
    statusBulanGrid.innerHTML = "";
    
    daftarBulan.forEach(bln => {
        const lunas = pembayaranPribadi.some(p => p.Keterangan && p.Keterangan.includes(bln));
        statusBulanGrid.innerHTML += '<div class="p-2 border rounded-xl text-center ' + (lunas ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-300') + '">' +
            '<p class="text-[9px] font-black uppercase">' + bln.substring(0,3) + '</p>' +
            '<p class="text-[9px] font-bold mt-0.5">' + (lunas ? 'LUNAS' : 'BELUM') + '</p>' +
        '</div>';
    });

    // 3. Render Kalender Pengambilan Sampah Bulanan
    renderKalenderSampahPribadi();
}

function renderKalenderSampahPribadi() {
    const gridKalender = document.getElementById('gridAngkaKalender');
    gridKalender.innerHTML = "";

    const sekarang = new Date();
    const tahun = sekarang.getFullYear();
    const bulan = sekarang.getMonth(); // 0 - 11

    document.getElementById('judulKalenderSampah').innerText = "Status Sampah (" + daftarBulan[bulan] + ")";

    // Set header nama hari
    const hariSingkat = ["M", "S", "S", "R", "K", "J", "S"];
    hariSingkat.forEach(h => {
        gridKalender.innerHTML += '<span class="text-[9px] font-black text-slate-400 uppercase py-1">' + h + '</span>';
    });

    const tglPertama = new Date(tahun, bulan, 1).getDay();
    const jumlahHari = new Date(tahun, bulan + 1, 0).getDate();

    // Buat slot kosong untuk hari sebelum tanggal 1
    for (let i = 0; i < tglPertama; i++) {
        gridKalender.innerHTML += '<span></span>';
    }

    // Filter log data sampah warga yang bersangkutan di bulan berjalan
    const logSampahBulanIni = dbGlobal.sampah.filter(s => {
        if (!s.Nama || s.Nama.toLowerCase() !== sesiWarga.Nama.toLowerCase()) return false;
        const tglLog = new Date(s.Tanggal);
        return tglLog.getFullYear() === tahun && tglLog.getMonth() === bulan;
    });

    // Isi tanggal kalender
    for (let t = 1; t <= jumlahHari; t++) {
        // Cari format string tanggal pembantu (YYYY-MM-DD atau kecocokan parsial tanggal)
        const targetTanggalString = tahun + "-" + String(bulan + 1).padStart(2, '0') + "-" + String(t).padStart(2, '0');
        
        // Cari status log operasional berdasarkan tanggal hari tersebut
        const pencocokanLog = logSampahBulanIni.find(s => {
            const dLog = new Date(s.Tanggal);
            return dLog.getDate() === t;
        });

        let warnaBg = "bg-slate-50 text-slate-400"; // Default Hari biasa belum ada rilis laporan
        let statusKirim = "Belum Ada Aktivitas";

        if (pencocokanLog) {
            statusKirim = pencocokanLog.Status ? pencocokanLog.Status.toLowerCase() : '';
            if (statusKirim === 'diambil') {
                warnaBg = "bg-emerald-500 text-white font-black";
            } else if (statusKirim === 'tidak diambil' || statusKirim === 'lewat') {
                warnaBg = "bg-rose-500 text-white font-black";
            } else if (statusKirim === 'kosong') {
                warnaBg = "bg-slate-400 text-white font-black";
            }
        }

        const infoHariIni = (t === sekarang.getDate()) ? "border-2 border-slate-900 shadow-xs" : "";
        
        // Tautkan fungsi klik untuk melihat detail pop-up modal
        gridKalender.innerHTML += '<button onclick="bukaDetailSampahPopUp(\'' + targetTanggalString + '\', \'' + statusKirim.toUpperCase() + '\')" class="w-8 h-8 rounded-xl text-[10px] mx-auto flex items-center justify-center transition-transform active:scale-90 ' + warnaBg + ' ' + infoHariIni + '">' + t + '</button>';
    }
}

// --- Pop Up Modal Detail Info Laporan Sampah ---
function bukaDetailSampahPopUp(tanggal, status) {
    document.getElementById('popTglJudul').innerText = "Laporan: " + tanggal;
    document.getElementById('popStatusTeks').innerText = status;
    
    const iconBox = document.getElementById('popBoxIcon');
    if (status === 'DIAMBIL') {
        iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs bg-emerald-50 text-emerald-600";
        document.getElementById('popJamWaktu').innerText = "Petugas kebersihan telah sukses mengangkut sampah.";
    } else if (status === 'LEWAT' || status === 'TIDAK DIAMBIL') {
        iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs bg-rose-50 text-rose-600";
        document.getElementById('popJamWaktu').innerText = "Rumah terlewati / gerbang terkunci / armada penuh.";
    } else if (status === 'KOSONG') {
        iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs bg-slate-100 text-slate-500";
        document.getElementById('popJamWaktu').innerText = "Tidak ada wadah sampah di depan rumah / kosong.";
    } else {
        iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs bg-slate-50 text-slate-300";
        document.getElementById('popJamWaktu').innerText = "Petugas belum mengonfirmasi operasional pada hari ini.";
    }
    
    openModal('mDetailSampah');
}

// --- Perbarui Kata Sandi Baru ke Google Sheets ---
function simpanSandiBaruSheets() {
    const sandiBaru = document.getElementById('newPass').value.trim();
    if (!sandiBaru) return tuntasAlert("Error", "Kata sandi baru tidak boleh kosong!", "error");
    if (sandiBaru.length < 3) return tuntasAlert("Error", "Kata sandi terlalu pendek!", "error");

    showLoading();
    const fd = new FormData();
    fd.append('action', 'updatePasswordAnggota'); // Handler API endpoint di GAS admin
    fd.append('id', sesiWarga.id);
    fd.append('Password', sandiBaru);

    fetch(SCRIPT_URL, { method: 'POST', body: fd })
        .then(res => res.json())
        .then(res => {
            hideLoading();
            if (res.status === "error") {
                tuntasAlert("Gagal", res.message, "error");
            } else {
                tuntasAlert("Berhasil", "Kata sandi baru aman disimpan!");
                document.getElementById('newPass').value = "";
                
                // Sinkronisasi data sesi lokal browser
                sesiWarga.Password = sandiBaru;
                sessionStorage.setItem("sesiWargaTuntas", JSON.stringify(sesiWarga));
            }
        })
        .catch(() => {
            hideLoading();
            tuntasAlert("Gagal", "Koneksi terputus dengan server Google Sheets.", "error");
        });
}

// --- Submit Konversi Foto Pengguna Baru ke Base64 (Sheet 2 + Google Drive) ---
function prosesKonversiFoto(fileInput) {
    if (!fileInput.files || fileInput.files.length === 0) return;
    
    showLoading();
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = function(e) {
        const fd = new FormData();
        fd.append('action', 'updateFotoAnggota'); // Handler API upload profil foto di GAS admin
        fd.append('id', sesiWarga.id);
        fd.append('FotoData', e.target.result); // Mengirim string base64 gambar
        fd.append('FotoNama', file.name);
        fd.append('FotoType', file.type);

        fetch(SCRIPT_URL, { method: 'POST', body: fd })
            .then(res => res.json())
            .then(res => {
                hideLoading();
                if (res.status === "error") {
                    tuntasAlert("Gagal", res.message, "error");
                } else {
                    tuntasAlert("Berhasil", "Foto profil Anda berhasil diperbarui!");
                    loadSeluruhDataAplikasi(); // Sinkronisasi & download aset tautan Google Drive terbaru
                }
            })
            .catch(() => {
                hideLoading();
                tuntasAlert("Gagal", "Koneksi ke server terputus saat mengunggah gambar.", "error");
            });
    };
    reader.readAsDataURL(file);
}

// --- SPA Tab Content Navigation Route ---
function switchTab(tabId, btnElement) {
    // Sembunyikan semua konten tab
    document.querySelectorAll('.tab-content').forEach(screen => {
        screen.style.display = 'none';
        screen.classList.remove('active-tab');
    });

    // Tampilkan tab target
    const targetScreen = document.getElementById(tabId);
    if (targetScreen) {
        targetScreen.style.display = 'block';
        targetScreen.classList.add('active-tab');
    }

    // Hilangkan kelas tombol aktif pada menu nav
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('active-tab-btn');
    });

    // Aktifkan tombol yang diklik
    if (btnElement) {
        btnElement.classList.add('active-tab-btn');
    }
}

function reloadData() {
    loadSeluruhDataAplikasi();
}

// --- Keluar Aplikasi Area Warga ---
function logoutWarga() {
    sessionStorage.removeItem("sesiWargaTuntas");
    sesiWarga = null;
    
    document.getElementById('screen-dashboard').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    
    document.getElementById('lHp').value = "";
    document.getElementById('lPass').value = "123";
}

window.onload = init;
