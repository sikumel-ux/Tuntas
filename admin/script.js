/**
 * Fungsi untuk menyimpan data iuran ke Google Sheets dan otomatis trigger kirim pesan WhatsApp
 */
async function simpanIuran() {
    const tgl = document.getElementById('iTgl').value;
    const nama = document.getElementById('iNama').value;
    const nom = document.getElementById('iNom').value;
    const blns = Array.from(document.querySelectorAll('input[name="blnCek"]:checked')).map(c => c.value);
    
    // Validasi input data admin panel
    if(!tgl || !nama || !nom || blns.length === 0) {
        return tuntasAlert("Lengkapi Data", "Silakan tentukan warga, nominal, dan bulan iurannya!", "error");
    }

    showLoading(); // Munculkan spinner loading bawaan admin panel kamu
    let errorCount = 0;
    let lastKodeUnik = "";
    
    // Looping jika admin memilih lebih dari satu bulan iuran sekaligus
    for (let bln of blns) {
        // Generate kode acak 6 digit di belakang T- sesuai format kuitansi
        let angkaAcak = Math.floor(100000 + Math.random() * 900000); 
        let kodeUnik = "T-" + angkaAcak;
        lastKodeUnik = kodeUnik;

        // Mengirimkan data iuran ke Google Apps Script Web App (GAS) bawaan sistem admin kamu
        let sukses = await kirimKeSheets({
            action: "simpanPembayaran", 
            kode: kodeUnik, 
            nama: nama, 
            tanggal: tgl, 
            keterangan: bln, 
            nominal: nom
        });
        if(!sukses) errorCount++;
    }

    // Evaluasi hasil penyimpanan database Google Sheets
    if(errorCount === 0) {
        // Reset form pembayaran di admin panel setelah sukses
        document.getElementById('iNom').value = "";
        document.querySelectorAll('input[name="blnCek"]').forEach(c => c.checked = false);
        
        tuntasAlert("Sukses", `Seluruh pembayaran iuran ${nama} berhasil dicatat.`);
        
        // Kirim link kuitansi otomatis ke WhatsApp warga setelah delay 1.2 detik agar alert sempat terbaca
        setTimeout(() => {
            bukaWhatsAppOtomatis(nama, lastKodeUnik);
        }, 1200);

        await loadDataDariSheets(); // Sinkronisasi ulang tabel internal admin panel
    } else {
        tuntasAlert("Eror Sebagian", "Ada beberapa iuran bulan gagal tersimpan ke Sheets.", "error");
    }
}

/**
 * ENGINE GENERATOR PESAN WHATSAPP OTOMATIS
 * Mengambil nomor HP dari array database warga global, memformat teks, dan membuka WhatsApp API
 */
function bukaWhatsAppOtomatis(namaWarga, kodeReferensi) {
    // Mencari info nomor telepon dari data warga global (dbGlobal.anggota) di script.js kamu
    const dataWarga = (dbGlobal.anggota || []).find(w => (w.Nama || w.nama || '').toString().trim().toUpperCase() === namaWarga.toUpperCase());
    let nomorHp = dataWarga ? (dataWarga.Hp || dataWarga.hp || '') : '';

    // Bersihkan string nomor HP dari spasi atau karakter non-angka
    nomorHp = nomorHp.toString().replace(/[^0-9]/g, '');
    
    // Normalisasi awalan nomor HP agar kompatibel dengan WhatsApp API link (wajib 62)
    if (nomorHp.startsWith('0')) {
        nomorHp = '62' + nomorHp.slice(1);
    }

    // ⚠️ SILAKAN GANTI domain.com DI BAWAH INI DENGAN ALAMAT LINK HOSTING ASLI WEB KAMU ⚠️
    const urlKuitansiWeb = `https://domain.com/kuitansi.html?id=${kodeReferensi}`;

    // Susun format template pesan teks WhatsApp persis 100% seperti pesananmu
    const templateTeks = 
`Halo, pak/bu *${namaWarga.trim().toUpperCase()}*..\n` +
`Pembayaran Anda telah kami terima dengan no referensi *${kodeReferensi}*.\n\n` +
`---------------------------\n` +
`Cek e-Kuitansi Anda di:\n` +
`${urlKuitansiWeb}\n` +
`---------------------------\n\n` +
`Terimakasih atas partisipasinya.\n\n` +
`Pengurus TUNTAS,\n\n` +
`*APRIL*`;

    // Amankan string teks agar valid dibaca sebagai browser URL parameter
    const pesanTerencode = encodeURIComponent(templateTeks);

    // Deteksi Device Admin: Jika di HP buka deep-link Aplikasi, jika di laptop/PC buka WA Web
    let linkArahwa = `https://web.whatsapp.com/send?phone=${nomorHp}&text=${pesanTerencode}`;
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
        linkArahwa = `https://api.whatsapp.com/send?phone=${nomorHp}&text=${pesanTerencode}`;
    }

    // Buka tab atau aplikasi WhatsApp tujuan otomatis
    window.open(linkArahwa, '_blank');
}
