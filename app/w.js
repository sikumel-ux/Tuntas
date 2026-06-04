// ==========================================
// CONFIGURATION & GLOBAL STATE
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzt1GIvQ2tMRz0rnBEgIoqq75858xW_xsbOf1TCDwAoADVmfeV61vVOMPxCvDIz1JG8/exec";

let dbGlobal = {
    warga: [],
    kas: [],
    pembayaran: [],
    sampah: []
};

let sesiWarga = null;
const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

// ==========================================
// INITIALIZATION & LOGIN LOGIC
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    // Memeriksa status login tersimpan di lokal browser
    const savedSession = localStorage.getItem("sesiWargaTuntas");
    if (savedSession) {
        sesiWarga = JSON.parse(savedSession);
        initAplikasiWarga();
    } else {
        sembunyikanLoading();
    }
});

function tampilkanLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function sembunyikanLoading() {
    document.getElementById('loading').style.display = 'none';
}

function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function showAlert(title, msg, type = 'success') {
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = msg;
    const iconBox = document.getElementById('alertIcon');
    
    if (type === 'error') {
        iconBox.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-rose-50 text-rose-600";
        iconBox.innerHTML = '<span class="material-symbols-rounded">cancel</span>';
    } else {
        iconBox.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600";
        iconBox.innerHTML = '<span class="material-symbols-rounded">check_circle</span>';
    }
    openModal('customAlert');
}

function closeAlert() {
    closeModal('customAlert');
}

function togglePasswordLogin(inputId, eyeId) {
    const input = document.getElementById(inputId);
    const eyeIcon = document.getElementById(eyeId);
    if (input.type === "password") {
        input.type = "text";
        eyeIcon.className = "fa-solid fa-eye text-sm";
    } else {
        input.type = "password";
        eyeIcon.className = "fa-solid fa-eye-slash text-sm";
    }
}

function prosesLoginWarga() {
    const hpInput = document.getElementById('lHp').value.trim();
    const passInput = document.getElementById('lPass').value.trim();

    if (!hpInput || !passInput) {
        showAlert("Gagal", "Nomor Whatsapp dan Kata Sandi wajib diisi!", "error");
        return;
    }

    tampilkanLoading();

    // Fetch data awal dari sistem pusat Google Sheets
    fetch(SCRIPT_URL + "?action=readAll")
        .then(res => res.json())
        .then(response => {
            dbGlobal = response;
            
            // Validasi kredensial pengguna
            const userDitemukan = dbGlobal.warga.find(w => 
                String(w.Hp).replace(/\D/g, '') === hpInput.replace(/\D/g, '') && 
                String(w.Password) === passInput
            );

            if (userDitemukan) {
                sesiWarga = userDitemukan;
                localStorage.setItem("sesiWargaTuntas", JSON.stringify(sesiWarga));
                initAplikasiWarga();
            } else {
                sembunyikanLoading();
                showAlert("Akses Ditolak", "Nomor Whatsapp atau Kata Sandi Anda keliru.", "error");
            }
        })
        .catch(err => {
            console.error(err);
            sembunyikanLoading();
            showAlert("Masalah Jaringan", "Gagal menghubungi server database.", "error");
        });
}

function initAplikasiWarga() {
    document.getElementById('screen-login').classList.add('hidden');
    document.getElementById('screen-dashboard').classList.remove('hidden');

    // Render Data Header Profil Atas
    document.getElementById('topNamaWarga').innerText = sesiWarga.Nama;
    document.getElementById('topHpWarga').innerText = "+" + sesiWarga.Hp;
    
    const miniAvatar = document.getElementById('miniAvatar');
    if (sesiWarga.Foto) {
        miniAvatar.src = sesiWarga.Foto;
        miniAvatar.classList.remove('hidden');
    } else {
        miniAvatar.classList.add('hidden');
    }

    // Ambil/Segarkan data dashboard
    if (dbGlobal.kas.length === 0) {
        reloadData();
    } else {
        renderSemuaHalamanDanKomponen();
        sembunyikanLoading();
    }
}

function reloadData() {
    tampilkanLoading();
    fetch(SCRIPT_URL + "?action=readAll")
        .then(res => res.json())
        .then(response => {
            dbGlobal = response;
            
            // Perbarui sesi lokal kalau ada perubahan data dari admin
            const terupdate = dbGlobal.warga.find(w => w.Hp === sesiWarga.Hp);
            if (terupdate) {
                sesiWarga = terupdate;
                localStorage.setItem("sesiWargaTuntas", JSON.stringify(sesiWarga));
            }

            renderSemuaHalamanDanKomponen();
            sembunyikanLoading();
        })
        .catch(err => {
            console.error(err);
            sembunyikanLoading();
            showAlert("Gagal Sinkron", "Gagal memuat ulang data terbaru dari server.", "error");
        });
}

function renderSemuaHalamanDanKomponen() {
    renderDashboardKasRT();
    renderDetailDataPribadi();
    renderInformasiProfilDanAkun();
}

// ==========================================
// NAVIGATION SYSTEM SPA
// ==========================================
function switchTab(tabId, tombol) {
    // Sembunyikan semua konten tab
    const semuaTab = document.querySelectorAll('.tab-content');
    semuaTab.forEach(t => t.classList.add('hidden'));

    // Tampilkan tab terpilih
    document.getElementById(tabId).classList.remove('hidden');

    // Atur efek aktif pada tombol navigasi bawah
    const semuaTombolNav = document.querySelectorAll('nav border-t grid button, nav button');
    semuaTombolNav.forEach(btn => {
        btn.classList.remove('text-emerald-900', 'active-tab-btn');
        btn.classList.add('text-slate-400');
    });

    if (tombol) {
        tombol.classList.remove('text-slate-400');
        tombol.classList.add('text-emerald-900', 'active-tab-btn');
    }
}

function logoutWarga() {
    localStorage.removeItem("sesiWargaTuntas");
    sesiWarga = null;
    document.getElementById('screen-dashboard').classList.add('hidden');
    document.getElementById('screen-login').classList.remove('hidden');
    document.getElementById('lHp').value = "";
    document.getElementById('lPass').value = "";
}

// ==========================================
// TAB 1: LOGIKA DASHBOARD KAS RT
// ==========================================
function renderDashboardKasRT() {
    let totalMasuk = 0;
    let totalKeluar = 0;

    const wadahListMutasi = document.getElementById('listMutasiKasDashboard');
    wadahListMutasi.innerHTML = "";

    // Urutkan mutasi kas dari yang paling baru
    const dataKasUrut = [...dbGlobal.kas].sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));

    if (dataKasUrut.length === 0) {
        wadahListMutasi.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada rekaman transaksi kas.</p>';
    }

    dataKasUrut.forEach(k => {
        const nominal = parseInt(k.Nominal) || 0;
        const tipe = k.Jenis ? k.Jenis.toLowerCase() : '';
        
        let simbol = "";
        let warnaNominal = "";
        let iconBg = "";
        let iconLogo = "";

        if (tipe === 'masuk' || tipe === 'pemasukan') {
            totalMasuk += nominal;
            simbol = "+";
            warnaNominal = "text-emerald-600";
            iconBg = "bg-emerald-50 text-emerald-600";
            iconLogo = "fa-arrow-turn-down";
        } else {
            totalKeluar += nominal;
            simbol = "-";
            warnaNominal = "text-rose-600";
            iconBg = "bg-rose-50 text-rose-600";
            iconLogo = "fa-arrow-turn-up";
        }

        const tglObj = new Date(k.Tanggal);
        const opsiTgl = { day: 'numeric', month: 'short' };
        const tglFormat = tglObj.toLocaleDateString('id-ID', opsiTgl);

        wadahListMutasi.innerHTML += `
            <div class="flex items-center justify-between py-3 border-b border-slate-50">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center text-xs">
                        <i class="fa-solid ${iconLogo}"></i>
                    </div>
                    <div>
                        <p class="text-xs font-black text-slate-700 capitalize tracking-tight">${k.Keterangan || 'Transaksi Kas'}</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-wide">${tglFormat}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs font-black ${warnaNominal}">${simbol} Rp ${nominal.toLocaleString('id-ID')}</p>
                </div>
            </div>
        `;
    });

    const sisaSaldo = totalMasuk - totalKeluar;
    document.getElementById('dashPemasukanKas').innerText = "Rp " + totalMasuk.toLocaleString('id-ID');
    document.getElementById('dash安定PengeluaranKas' ? 'dashPengeluaranKas' : 'dashPengeluaranKas').innerText = "Rp " + totalKeluar.toLocaleString('id-ID');
    document.getElementById('dashSisaSaldoKas').innerText = "Rp " + sisaSaldo.toLocaleString('id-ID');
}

// ==========================================
// TAB 2: LOGIKA DATA LAPORAN (IURAN & SAMPAH)
// ==========================================
function renderDetailDataPribadi() {
    // 1. Hitung Total Kontribusi Pembayaran Anda
    let totalKontribusi = 0;
    const rwtWadah = document.getElementById('listRiwayatPribadi');
    rwtWadah.innerHTML = "";

    const filterBayarSaya = dbGlobal.pembayaran.filter(p => 
        p.Nama && p.Nama.toLowerCase() === sesiWarga.Nama.toLowerCase()
    ).sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));

    if (filterBayarSaya.length === 0) {
        rwtWadah.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-3">Belum ada riwayat pembayaran.</p>';
    }

    filterBayarSaya.forEach(p => {
        const nominal = parseInt(p.Nominal) || 0;
        totalKontribusi += nominal;

        const tglB = new Date(p.Tanggal);
        const tglFormat = tglB.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

        rwtWadah.innerHTML += `
            <div class="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                    <p class="text-xs font-black text-slate-700 uppercase tracking-tight">${p.Jenis || 'Iuran Bulanan'}</p>
                    <p class="text-[9px] font-semibold text-slate-400">Bulan: ${p.Bulan || '-'} | ${tglFormat}</p>
                </div>
                <p class="text-xs font-black text-emerald-700">Rp ${nominal.toLocaleString('id-ID')}</p>
            </div>
        `;
    });

    document.getElementById('dataTotalKontribusi').innerText = "Rp " + totalKontribusi.toLocaleString('id-ID');

    // 2. Render Grid Status Bulan Berjalan (12 Bulan)
    const wadahGridBulan = document.getElementById('statusBulanGrid');
    wadahGridBulan.innerHTML = "";
    
    daftarBulan.forEach(bln => {
        const isLunas = filterBayarSaya.some(p => p.Bulan && p.Bulan.toLowerCase() === bln.toLowerCase());
        const bgStatus = isLunas ? "bg-emerald-600 text-white font-black" : "bg-slate-100 text-slate-400 font-semibold";
        const ikonStatus = isLunas ? '<i class="fa-solid fa-circle-check text-[9px] text-emerald-200"></i>' : '<i class="fa-solid fa-circle-minus text-[9px] text-slate-300"></i>';

        wadahGridBulan.innerHTML += `
            <div class="p-2 rounded-xl text-center flex flex-col justify-between items-center gap-1 ${bgStatus}">
                <span class="text-[8px] uppercase tracking-tighter leading-none">${bln.substring(0, 3)}</span>
                ${ikonStatus}
            </div>
        `;
    });

    // 3. Panggil Engine Render Kalender Operasional Sampah
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

    // Filter log data sampah warga di bulan berjalan
    const logSampahBulanIni = dbGlobal.sampah.filter(s => {
        if (!s.Nama || s.Nama.toLowerCase() !== sesiWarga.Nama.toLowerCase()) return false;
        if (!s.Tanggal) return false;
        
        // Mengatasi format ISO String (2026-05-30T00:00:00.000Z) agar dibaca sesuai zona waktu lokal
        const tglLog = new Date(s.Tanggal);
        return tglLog.getFullYear() === tahun && tglLog.getMonth() === bulan;
    });

    // Isi tanggal kalender
    for (let t = 1; t <= jumlahHari; t++) {
        // Cari pencocokan log berdasarkan tanggal hari (1 - 31)
        const pencocokanLog = logSampahBulanIni.find(s => {
            const dLog = new Date(s.Tanggal);
            return dLog.getDate() === t;
        });

        let warnaBg = "bg-slate-100 text-slate-400"; // Default jika belum ada data laporan
        let statusKirim = "Belum Ada Aktivitas";
        let jamAmbil = "-";
        let tanggalTeks = tahun + "-" + String(bulan + 1).padStart(2, '0') + "-" + String(t).padStart(2, '0');

        if (pencocokanLog) {
            statusKirim = pencocokanLog.Status ? pencocokanLog.Status.toLowerCase() : '';
            
            // Mengambil jam dari field Tanggal/Waktu jika ada (Format ISO mengandung jam menit, misal 07:30)
            if (pencocokanLog.Tanggal && pencocokanLog.Tanggal.includes("T")) {
                const opsiJam = { hour: '2-digit', minute: '2-digit', hour12: false };
                jamAmbil = new Date(pencocokanLog.Tanggal).toLocaleTimeString('id-ID', opsiJam) + " WIB";
            } else if (pencocokanLog.Jam) {
                jamAmbil = pencocokanLog.Jam; // Cadangan jika admin input kolom jam terpisah
            } else {
                jamAmbil = "Waktu reguler (Pagi/Siang)";
            }

            // Set warna blok penuh (bukan cuma outline/lingkaran) sesuai status
            if (statusKirim === 'diambil') {
                warnaBg = "bg-emerald-600 text-white font-black shadow-xs"; // Hijau solid diambil
            } else if (statusKirim === 'tidak diambil' || statusKirim === 'lewat') {
                warnaBg = "bg-rose-500 text-white font-black shadow-xs"; // Merah solid
            } else if (statusKirim === 'kosong') {
                warnaBg = "bg-slate-400 text-white font-black shadow-xs"; // Abu-abu solid
            }
        }

        // Penanda khusus jika hari ini (border tipis gelap di luar blok warna)
        const infoHariIni = (t === sekarang.getDate() && bulan === sekarang.getMonth()) ? "ring-2 ring-slate-900 ring-offset-1" : "";
        
        // Render element sebagai blok kotak rounded-xl penuh warna
        gridKalender.innerHTML += '<button onclick="bukaDetailSampahPopUp(\'' + tanggalTeks + '\', \'' + statusKirim.toUpperCase() + '\', \'' + jamAmbil + '\')" class="w-9 h-9 rounded-xl text-[11px] mx-auto flex items-center justify-center transition-transform active:scale-90 ' + warnaBg + ' ' + infoHariIni + '">' + t + '</button>';
    }
}

// --- Pop Up Modal Detail Info Laporan Sampah (Menampilkan Jam Pengambilan) ---
function bukaDetailSampahPopUp(tanggal, status, jam) {
    // Format tampilan tanggal agar lebih enak dibaca manusia (Contoh: 30 Mei 2026)
    const komponen = tanggal.split('-');
    const tglObj = new Date(komponen[0], komponen[1] - 1, komponen[2]);
    const opsiTgl = { day: 'numeric', month: 'long', year: 'numeric' };
    const tanggalCantik = tglObj.toLocaleDateString('id-ID', opsiTgl);

    document.getElementById('popTglJudul').innerText = "Laporan: " + tanggalCantik;
    document.getElementById('popStatusTeks').innerText = status;
    
    const iconBox = document.getElementById('popBoxIcon');
    const teksWaktu = document.getElementById('popJamWaktu');

    if (status === 'DIAMBIL') {
        iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs bg-emerald-50 text-emerald-600";
        teksWaktu.innerHTML = 'Petugas kebersihan sukses mengangkut sampah.<br><span class="font-black text-slate-700 text-xs mt-1 block"><i class="fa-solid fa-clock mr-1"></i> Jam: ' + jam + '</span>';
    } else if (status === 'LEWAT' || status === 'TIDAK DIAMBIL') {
        iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs bg-rose-50 text-rose-600";
        teksWaktu.innerHTML = 'Rumah terlewati / gerbang terkunci / armada penuh.<br><span class="text-slate-400 text-[10px] mt-1 block">Dicek pada: ' + jam + '</span>';
    } else if (status === 'KOSONG') {
        iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs bg-slate-100 text-slate-500";
        teksWaktu.innerHTML = 'Tidak ada wadah sampah di depan rumah / kosong.<br><span class="text-slate-400 text-[10px] mt-1 block">Dicek pada: ' + jam + '</span>';
    } else {
        iconBox.className = "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center shadow-xs bg-slate-50 text-slate-300";
        teksWaktu.innerText = "Petugas belum mengonfirmasi operasional pada tanggal ini.";
    }
    
    openModal('mDetailSampah');
}

// ==========================================
// TAB 3: PROFIL, FOTO, KEAMANAN & SOSIAL MEDIA
// ==========================================
function renderInformasiProfilDanAkun() {
    document.getElementById('infoNamaUser').innerText = sesiWarga.Nama;
    document.getElementById('infoHpUser').innerText = "No. WA: +" + sesiWarga.Hp;
    
    if (sesiWarga.Gabung) {
        document.getElementById('infoBergabung').innerHTML = '<i class="fa-solid fa-calendar-check mr-1"></i> Warga Sejak: ' + sesiWarga.Gabung;
    }

    const imgProfil = document.getElementById('avatarImage');
    const iconDef = document.getElementById('avatarIconDefault');

    if (sesiWarga.Foto) {
        imgProfil.src = sesiWarga.Foto;
        imgProfil.classList.remove('hidden');
        iconDef.classList.add('hidden');
    } else {
        imgProfil.classList.add('hidden');
        iconDef.classList.remove('hidden');
    }
}

function pemicuPilihFoto() {
    document.getElementById('fileFotoInput').click();
}

function prosesKonversiFoto(input) {
    if (input.files && input.files[0]) {
        tampilkanLoading();
        const berkas = input.files[0];
        
        // Validasi ukuran file gambar (Maksimal 1 MB agar awet di database)
        if (berkas.size > 1024 * 1024) {
            sembunyikanLoading();
            showAlert("Ukuran Terlalu Besar", "Maksimal resolusi foto adalah 1 Megabyte.", "error");
            return;
        }

        const pembaca = new FileReader();
        pembaca.onload = function (e) {
            const hasilBase64 = e.target.result;

            // POST perubahan foto profil ke Google Sheets
            const dataKirim = {
                action: "updateFoto",
                hp: sesiWarga.Hp,
                foto: hasilBase64
            };

            fetch(SCRIPT_URL, {
                method: "POST",
                body: JSON.stringify(dataKirim)
            })
            .then(res => res.json())
            .then(res => {
                if (res.status === 'success') {
                    sesiWarga.Foto = hasilBase64;
                    localStorage.setItem("sesiWargaTuntas", JSON.stringify(sesiWarga));
                    
                    // Segarkan komponen gambar
                    document.getElementById('avatarImage').src = hasilBase64;
                    document.getElementById('avatarImage').classList.remove('hidden');
                    document.getElementById('avatarIconDefault').classList.add('hidden');
                    
                    // Segarkan avatar mini di pojok kanan atas
                    const mini = document.getElementById('miniAvatar');
                    mini.src = hasilBase64;
                    mini.classList.remove('hidden');

                    sembunyikanLoading();
                    showAlert("Sukses", "Foto profil Anda berhasil diperbarui.");
                } else {
                    sembunyikanLoading();
                    showAlert("Gagal", "Gagal menyimpan foto profil ke sistem.", "error");
                }
            })
            .catch(err => {
                console.error(err);
                sembunyikanLoading();
                showAlert("Error", "Gagal mengunggah foto karena gangguan koneksi.", "error");
            });
        };
        pembaca.readAsDataURL(berkas);
    }
}

function simpanSandiBaruSheets() {
    const sandiBaru = document.getElementById('newPass').value.trim();
    if (!sandiBaru) {
        showAlert("Peringatan", "Kolom kata sandi baru tidak boleh dikosongkan.", "error");
        return;
    }

    tampilkanLoading();
    const dataKirim = {
        action: "updatePassword",
        hp: sesiWarga.Hp,
        password: sandiBaru
    };

    fetch(SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify(dataKirim)
    })
    .then(res => res.json())
    .then(res => {
        sembunyikanLoading();
        if (res.status === 'success') {
            sesiWarga.Password = sandiBaru;
            localStorage.setItem("sesiWargaTuntas", JSON.stringify(sesiWarga));
            document.getElementById('newPass').value = "";
            showAlert("Sukses", "Kata sandi Anda telah berhasil diperbarui.");
        } else {
            showAlert("Gagal", "Gagal mengubah kata sandi pada database cloud.", "error");
        }
    })
    .catch(err => {
        console.error(err);
        sembunyikanLoading();
        showAlert("Error", "Sandi gagal diperbarui karena masalah transmisi internet.", "error");
    });
}

function salinRekening() {
    const teksNoRek = document.getElementById('noRekText').innerText;
    navigator.clipboard.writeText(teksNoRek)
        .then(() => {
            showAlert("Berhasil Disalin", "Nomor rekening " + teksNoRek + " disalin ke papan klip.");
        })
        .catch(() => {
            showAlert("Gagal", "Browser Anda tidak mendukung fitur salin otomatis.", "error");
        });
}

function kirimKonfirmasiWA() {
    const txtPesan = encodeURIComponent(
        `Halo Admin TUNTAS,\nSaya ingin mengonfirmasi pembayaran iuran bulanan atas nama:\n` +
        `• *Nama Warga*: ${sesiWarga.Nama}\n` +
        `• *No. Hp*: ${sesiWarga.Hp}\n\n` +
        `Berikut ini saya lampirkan bukti transfer terlampir. Mohon segera diverifikasi ya. Terima kasih!`
    );
    // Diarahkan langsung ke nomor admin pengelolaan iuran pusat
    window.open("https://wa.me/6285157335133?text=" + txtPesan, "_blank");
}
