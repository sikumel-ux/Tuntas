/**
 * TUNTAS FRONTEND ENGINE - CLIENT SIDE (script.js)
 */

// URL Gas paten dan aktif milikmu
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw2O7sydQVyXZZhrsqAMhTABZkFYkL2x5L2x2exlc71Y6Qm-NPiUXYsSKzTsLVR_IJIRQ/exec";

// Simulasi Identitas Warga Aktif (Nanti disesuaikan dengan mekanisme Login/LocalStorage milikmu)
window.wargaAktif = {
    hp: "081234567890", // Ganti dengan HP dummy warga untuk tes awal
    nama: "Haidar Abicandra"
};

// Wadah Penampung Data Global
window.dataTuntas = {
    anggota: [],
    kas: [],
    pembayaran: [],
    sampah: []
};

/**
 * 1. AMBIL DATA DARI GOOGLE SHEETS
 */
async function muatDatabaseTuntas() {
    console.log("Menghubungi database TUNTAS...");
    try {
        const respon = await fetch(SCRIPT_URL + "?action=readAllData");
        if (!respon.ok) throw new Error("Koneksi jaringan bermasalah.");
        
        const json = await respon.json();
        if (json.status === "success") {
            window.dataTuntas = json.data;
            console.log("Data Berhasil Disinkronkan:", window.dataTuntas);
            
            // Jalankan Render UI
            renderProfilWarga();
            renderRingkasanKas();
            renderHistoriKasWarga();
            renderStatusIuranWarga();
        } else {
            throw new Error(json.message);
        }
    } catch (error) {
        console.error("Gagal Memuat Data:", error);
        tuntasAlert("Koneksi Gagal", "Gagal menyinkronkan data dengan Google Sheets.", "error");
    }
}

/**
 * 2. RENDER PROFIL & DATA WARGA
 */
function renderProfilWarga() {
    const dataWarga = window.dataTuntas.anggota.find(w => w.HP.toString().trim() === window.wargaAktif.hp) || 
                      { Nama: window.wargaAktif.nama, HP: window.wargaAktif.hp, Foto: "" };
    
    document.getElementById("namaWarga").innerText = dataWarga.Nama;
    document.getElementById("hpWarga").innerText = dataWarga.HP;
    if (dataWarga.Foto && dataWarga.Foto.trim() !== "") {
        document.getElementById("avatarWarga").src = dataWarga.Foto;
    }

    // Ambil status sampah warga
    const dataSampah = window.dataTuntas.sampah.find(s => s.HP.toString().trim() === window.wargaAktif.hp);
    document.getElementById("statusSampahWarga").innerText = dataSampah ? dataSampah.Status : "Aktif";
}

/**
 * 3. RENDER RINGKASAN & HISTORI KAS UTAMA
 */
function renderRingkasanKas() {
    let totalMasuk = 0;
    let totalKeluar = 0;

    window.dataTuntas.kas.forEach(item => {
        const nominal = parseFloat(item.Nominal) || 0;
        if (item.Kategori.toLowerCase().trim() === "pemasukan") {
            totalMasuk += nominal;
        } else if (item.Kategori.toLowerCase().trim() === "pengeluaran") {
            totalKeluar += nominal;
        }
    });

    const saldoAkhir = totalMasuk - totalKeluar;

    document.getElementById("saldoKasTotal").innerText = formatRupiah(saldoAkhir);
    document.getElementById("kasMasukTotal").innerText = formatRupiah(totalMasuk);
    document.getElementById("kasKeluarTotal").innerText = formatRupiah(totalKeluar);
}

function renderHistoriKasWarga() {
    const container = document.getElementById("listKasAnggota");
    container.innerHTML = "";

    // Ambil 5 transaksi teratas/terbaru
    const cetakKas = window.dataTuntas.kas.slice(-5).reverse();

    if (cetakKas.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 text-center py-4">Belum ada catatan transaksi.</p>`;
        return;
    }

    cetakKas.forEach(item => {
        const isMasuk = item.Kategori.toLowerCase().trim() === "pemasukan";
        const div = document.createElement("div");
        div.className = "flex justify-between items-center p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/40 text-xs";
        div.innerHTML = `
            <div>
                <p class="font-bold text-slate-200">${item.Keterangan}</p>
                <p class="text-[10px] text-slate-500">${item.Tanggal}</p>
            </div>
            <span class="font-bold ${isMasuk ? 'text-emerald-400' : 'text-rose-400'}">
                ${isMasuk ? '+' : '-'} ${formatRupiah(item.Nominal)}
            </span>
        `;
        container.appendChild(div);
    });
}

/**
 * 4. RENDER BLOK TABEL IURAN BULANAN WARGA
 */
function renderStatusIuranWarga() {
    const container = document.getElementById("gridIuranAnggota");
    container.innerHTML = "";

    const dataIuran = window.dataTuntas.pembayaran.find(p => p.HP.toString().trim() === window.wargaAktif.hp);
    const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    let lunasCount = 0;

    daftarBulan.forEach(bulan => {
        const status = dataIuran && dataIuran[bulan] ? dataIuran[bulan].toString().toUpperCase().trim() : "BELUM BAYAR";
        const isLunas = status === "LUNAS";
        if (isLunas) lunasCount++;

        const div = document.createElement("div");
        div.className = `p-2 rounded-xl border font-semibold ${isLunas ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800/50 text-slate-500 border-slate-700/50'}`;
        div.innerHTML = `
            <p class="text-[10px] uppercase opacity-70">${bulan.substring(0, 3)}</p>
            <p class="text-[9px] mt-0.5">${status}</p>
        `;
        container.appendChild(div);
    });

    document.getElementById("totalIuranWarga").innerText = `${lunasCount} Bulan`;
}

/**
 * 5. UPLOAD FOTO PROFIL (ANTI RESOLUSI LIMIT VIA CANVAS COMPRESSION)
 */
async function handleGantiFoto(input) {
    const file = input.files[0];
    if (!file) return;

    Swal.fire({
        title: "Unggah Foto Profil",
        text: "Sedang memproses dan mengompresi gambar...",
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // Kompresi di client side, paksa maksimal lebar 800px untuk menghemat bandwidth
        const base64Data = await kompresiCanvasKeBase64(file, 800, 0.75);

        const queryParams = new URLSearchParams({
            action: "updateProfilWarga",
            hp: window.wargaAktif.hp,
            filename: `FOTO_${window.wargaAktif.hp}.jpg`,
            mimetype: "image/jpeg"
        });

        const respon = await fetch(`${SCRIPT_URL}?${queryParams.toString()}`, {
            method: "POST",
            mode: "cors",
            body: base64Data
        });

        const hasil = await respon.json();
        if (hasil.status === "success") {
            document.getElementById("avatarWarga").src = hasil.newFotoUrl;
            Swal.fire("Berhasil", "Foto profil kamu sukses diperbarui!", "success");
            muatDatabaseTuntas();
        } else {
            throw new Error(hasil.message);
        }
    } catch (err) {
        console.error(err);
        Swal.fire("Gagal", "Gagal mengunggah foto: " + err.message, "error");
    }
}

/**
 * UTILITY / HELPER ENGINE
 */
function kompresiCanvasKeBase64(file, maxWidth, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let w = img.width;
                let h = img.height;
                if (w > maxWidth) { h = Math.round((h * maxWidth) / w); w = maxWidth; }
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL("image/jpeg", quality));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function formatRupiah(angka) {
    return "Rp " + parseFloat(angka).toLocaleString("id-ID");
}

function tuntasAlert(judul, pesan, tipe) {
    if (typeof Swal !== "undefined") { Swal.fire(judul, pesan, tipe); } else { alert(`[${judul}] \n${pesan}`); }
}

document.addEventListener("DOMContentLoaded", muatDatabaseTuntas);
