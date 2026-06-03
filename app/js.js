/**
 * TUNTAS FRONTEND ENGINE - CLIENT SIDE (script.js)
 * Terhubung langsung ke Web App API Google Apps Script.
 * URL Gas dikunci murni sesuai request.
 */

// URL Gas Paten, jangan diubah lagi, Bro!
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9F6sG4TZNJRI1BNiYGAAYb_38dG6ewbmDIoR-brYonJlA9ivCqhKCln1UxT16-NNN/exec";

// Variabel Global untuk menampung bundle data dari database
window.dataTuntas = {
    anggota: [],
    kas: [],
    pembayaran: [],
    sampah: []
};

/**
 * 1. AMBIL DATA DARI GOOGLE SHEETS (Dijalankan otomatis saat halaman dimuat)
 */
async function muatDatabaseTuntas() {
    console.log("Menghubungi database Google Sheets...");
    try {
        // Wajib melempar ?action=readAllData agar direspons oleh doGet() backend
        const respon = await fetch(`${SCRIPT_URL}?action=readAllData`);
        
        if (!respon.ok) throw new Error("Respon jaringan internet tidak stabil.");
        
        const json = await respon.json();

        if (json.status === "success") {
            console.log("Koneksi Sukses! Data berhasil dimuat.", json.data);
            
            // Simpan ke variabel global
            window.dataTuntas = json.data;
            
            // Hubungkan ke fungsi render UI kamu di sini jika ada, contoh:
            // renderDataKas();
            // renderStatusIuran();
            
        } else {
            console.error("Eror Internal Server GAS:", json.message);
            tuntasAlert("Eror Database", "Gagal menghubungi database Google Sheets.", "error");
        }
    } catch (eror) {
        console.error("Gagal Fetching:", eror);
        tuntasAlert("Koneksi Gagal", "Gagal menghubungi database Google Sheets. Periksa koneksi internet Anda.", "error");
    }
}

/**
 * 2. FITUR UPLOAD FOTO PROFIL (Bebas Limit Size MB - Kompresi Otomatis)
 * @param {string} noHpWarga - Nomor HP warga sebagai kunci primer row sheet
 * @param {File} fileGambar - File gambar asli dari <input type="file">
 */
async function uploadFotoProfilWarga(noHpWarga, fileGambar) {
    if (!fileGambar) {
        tuntasAlert("Peringatan", "Silakan pilih file foto terlebih dahulu!", "warning");
        return;
    }

    tuntasAlert("Memproses", "Sedang mengompresi dan mengunggah foto...", "info");

    try {
        // Gunakan FileReader + Canvas untuk kompresi di sisi client (Aman dari Limit MB)
        const base64Data = await kompresiGambarKeBase64(fileGambar, 800, 0.8);

        // Siapkan parameter data POST
        const queryParams = new URLSearchParams({
            action: "updateProfilWarga",
            hp: noHpWarga,
            filename: `FOTO_${noHpWarga}_${Date.now()}.jpg`,
            mimetype: "image/jpeg"
        });

        // Tembak backend menggunakan POST dengan body string base64 mentah
        const respon = await fetch(`${SCRIPT_URL}?${queryParams.toString()}`, {
            method: "POST",
            mode: "cors",
            body: base64Data
        });

        const hasil = await respon.json();

        if (hasil.status === "success") {
            tuntasAlert("Sukses", "Foto profil berhasil diperbarui!", "success");
            console.log("URL Foto Baru:", hasil.newFotoUrl);
            
            // Update data di local storage session jika warga sedang login
            let sessionWarga = JSON.parse(localStorage.getItem("wargaLogin"));
            if (sessionWarga) {
                sessionWarga.Foto = hasil.newFotoUrl;
                sessionWarga.foto = hasil.newFotoUrl;
                localStorage.setItem("wargaLogin", JSON.stringify(sessionWarga));
            }
            
            // Refresh data lokal dari database agar UI sinkron
            muatDatabaseTuntas();
            return hasil.newFotoUrl;
        } else {
            throw new Error(hasil.message);
        }

    } catch (error) {
        console.error("Gagal Upload Foto:", error);
        tuntasAlert("Upload Gagal", "Gagal menyimpan foto: " + error.message, "error");
    }
}

/**
 * 3. FITUR UPDATE PASSWORD WARGA
 * @param {string} noHpWarga - Nomor HP warga
 * @param {string} passwordBaru - Password baru yang diinput warga
 */
async function updatePasswordWarga(noHpWarga, passwordBaru) {
    if (!passwordBaru || passwordBaru.trim() === "") {
        tuntasAlert("Peringatan", "Password baru tidak boleh kosong!", "warning");
        return;
    }

    tuntasAlert("Memproses", "Menyimpan password baru...", "info");

    try {
        const queryParams = new URLSearchParams({
            action: "updateProfilWarga",
            hp: noHpWarga,
            passwordBaru: passwordBaru.trim()
        });

        const respon = await fetch(`${SCRIPT_URL}?${queryParams.toString()}`, {
            method: "POST",
            mode: "cors"
        });

        const hasil = await respon.json();

        if (hasil.status === "success") {
            tuntasAlert("Sukses", "Password berhasil diubah!", "success");
            
            // Jalankan ulang penarikan data agar database lokal ter-update
            muatDatabaseTuntas();
        } else {
            throw new Error(hasil.message);
        }
    } catch (error) {
        console.error("Gagal Update Password:", error);
        tuntasAlert("Gagal", "Gagal memperbarui password: " + error.message, "error");
    }
}

/**
 * ======================== UTILITY / HELPER FUNCTIONS ========================
 */

/**
 * Helper: Mengompresi file gambar berekstensi besar menjadi Base64 resolusi bersahabat
 */
function kompresiGambarKeBase64(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, width, height);

                // Ekstrak hasil kompresi murni format JPEG
                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

/**
 * Helper: Alert fallback kustom UI ala Figma jika library SweetAlert belum termuat
 */
function tuntasAlert(judul, pesan, tipe) {
    // Jika di project kamu ada SweetAlert (Swal), dia akan otomatis pakai Swal
    if (typeof Swal !== "undefined") {
        Swal.fire(judul, pesan, tipe);
    } else {
        // Fallback alert bawaan browser yang rapi
        alert(`[${judul}] \n${pesan}`);
    }
}

// Jalankan penarikan data otomatis sesaat setelah file HTML selesai dimuat browser
document.addEventListener("DOMContentLoaded", muatDatabaseTuntas);
