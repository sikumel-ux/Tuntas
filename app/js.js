/**
 * TUNTAS FRONTEND ENGINE - CLIENT SIDE (script.js)
 */

// URL Gas andalan dikunci mati sesuai request
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycb9JsUb0saYvFnH8vpCn2JZu_AzdrXXXmQIcGfMW0dsTvPndFQC_CtKyLhMx_6Kjd_IEg/exec";

// Variabel Global penampung data database
window.dataTuntas = {
    anggota: [],
    kas: [],
    pembayaran: [],
    sampah: []
};

/**
 * A. FUNGSI MUAT UTAMA: AMBIL DATA DARI DB GOOGLE SHEETS
 */
async function muatDatabaseTuntas() {
    console.log("Menghubungi database Google Sheets...");
    try {
        // Ambil data menggunakan gabungan string manual agar bebas dari salah ketik backtick
        const respon = await fetch(SCRIPT_URL + "?action=readAllData");
        
        if (!respon.ok) throw new Error("Respon jaringan internet tidak stabil.");
        
        const json = await respon.json();

        if (json.status === "success") {
            console.log("Koneksi Sukses! Data berhasil dimuat.", json.data);
            window.dataTuntas = json.data;
            
            // Eksekusi fungsi render UI kamu di bawah ini jika ada (misal renderDashboard())
        } else {
            console.error("Eror Server GAS:", json.message);
            tuntasAlert("Eror Database", "Gagal menghubungi database Google Sheets.", "error");
        }
    } catch (eror) {
        console.error("Gagal Fetching:", eror);
        tuntasAlert("Koneksi Gagal", "Gagal menghubungi database Google Sheets. Periksa koneksi internet Anda.", "error");
    }
}

/**
 * B. FUNGSI UPLOAD FOTO PROFIL WARGA (Bebas Limit Size MB - Kompresi Otomatis Canvas)
 */
async function uploadFotoProfilWarga(noHpWarga, fileGambar) {
    if (!fileGambar) {
        tuntasAlert("Peringatan", "Silakan pilih file foto terlebih dahulu!", "warning");
        return;
    }

    tuntasAlert("Memproses", "Sedang mengompresi dan mengunggah foto...", "info");

    try {
        // Kompresi di sisi browser agar file megabyte besar menciut jadi ratusan KB murni JPEG
        const base64Data = await kompresiGambarKeBase64(fileGambar, 800, 0.8);

        const queryParams = new URLSearchParams({
            action: "updateProfilWarga",
            hp: noHpWarga,
            filename: "FOTO_" + noHpWarga + "_" + Date.now() + ".jpg",
            mimetype: "image/jpeg"
        });

        // Kirim request POST dengan body string base64 murni
        const respon = await fetch(SCRIPT_URL + "?" + queryParams.toString(), {
            method: "POST",
            mode: "cors",
            body: base64Data
        });

        const hasil = await respon.json();

        if (hasil.status === "success") {
            tuntasAlert("Sukses", "Foto profil berhasil diperbarui!", "success");
            
            // Perbarui session local warga yang login jika ada
            let sessionWarga = JSON.parse(localStorage.getItem("wargaLogin"));
            if (sessionWarga) {
                sessionWarga.Foto = hasil.newFotoUrl;
                sessionWarga.foto = hasil.newFotoUrl;
                localStorage.setItem("wargaLogin", JSON.stringify(sessionWarga));
            }
            
            muatDatabaseTuntas(); // Ambil ulang data segar dari Sheets
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
 * C. FUNGSI UPDATE PASSWORD KATA SANDI WARGA
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

        const respon = await fetch(SCRIPT_URL + "?" + queryParams.toString(), {
            method: "POST",
            mode: "cors"
        });

        const hasil = await respon.json();

        if (hasil.status === "success") {
            tuntasAlert("Sukses", "Password berhasil diubah!", "success");
            muatDatabaseTuntas(); // Sinkronisasi ulang database
        } else {
            throw new Error(hasil.message);
        }
    } catch (error) {
        console.error("Gagal Update Password:", error);
        tuntasAlert("Gagal", "Gagal memperbarui password: " + error.message, "error");
    }
}

/**
 * HELPER INTERNAL UTILITY
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

                const dataUrl = canvas.toDataURL("image/jpeg", quality);
                resolve(dataUrl);
            };
            img.onloadend = () => {};
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
}

function tuntasAlert(judul, pesan, tipe) {
    if (typeof Swal !== "undefined") {
        Swal.fire(judul, pesan, tipe);
    } else {
        alert("[" + judul + "] \n" + pesan);
    }
}

// Triger jalankan penarikan database otomatis saat web dimuat
document.addEventListener("DOMContentLoaded", muatDatabaseTuntas);
