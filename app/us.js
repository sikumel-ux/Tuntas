/* =========================================================
   HELPER FORMAT TANGGAL & JAM
========================================================= */

// Format tanggal menjadi DD-MM-YY
function formatTanggalIndo(tglStr) {
    if (!tglStr) return "-";

    try {
        const d = new Date(tglStr);

        if (isNaN(d.getTime())) {
            const porsi = tglStr.split(/[-/T ]/);

            if (porsi.length >= 3) {
                const y = porsi[0].slice(-2);
                const m = String(porsi[1]).padStart(2, "0");
                const t = String(porsi[2]).padStart(2, "0");

                return `${t}-${m}-${y}`;
            }

            return tglStr;
        }

        const tgl = String(d.getDate()).padStart(2, "0");
        const bln = String(d.getMonth() + 1).padStart(2, "0");
        const thn = String(d.getFullYear()).slice(-2);

        return `${tgl}-${bln}-${thn}`;
    } catch (e) {
        return tglStr;
    }
}

// Format jam menjadi HH:MM WIB
function formatJamWib(waktuStr) {
    if (!waktuStr || waktuStr === "--:--" || waktuStr === "-") {
        return "Belum ada jam";
    }

    if (waktuStr.includes("T")) {
        const d = new Date(waktuStr);

        if (!isNaN(d.getTime())) {
            const jam = String(d.getHours()).padStart(2, "0");
            const menit = String(d.getMinutes()).padStart(2, "0");

            return `${jam}:${menit} WIB`;
        }
    }

    const porsi = waktuStr.split(":");

    if (porsi.length >= 2) {
        const jam = porsi[0].trim().padStart(2, "0");
        const menit = porsi[1].trim().padStart(2, "0");

        return `${jam}:${menit} WIB`;
    }

    return `${waktuStr} WIB`;
}


/* =========================================================
   RENDER HISTORI KAS BULANAN
========================================================= */

function renderHistoriKasSebulan() {
    const filterIdx = parseInt(
        document.getElementById("filterBulanKas").value
    );

    const containerMutasi = document.getElementById(
        "listMutasiKasDashboard"
    );

    containerMutasi.innerHTML = "";

    const dataKasFiltered = (window.dbTuntas.kas || []).filter(k => {
        let tglStr = k.Tanggal || k.tanggal;

        if (!tglStr) return false;

        const d = new Date(tglStr);

        let blnKas = d.getMonth();

        if (isNaN(blnKas)) {
            const porsi = tglStr.split(/[-/T ]/);
            blnKas = parseInt(porsi[1]) - 1;
        }

        return blnKas === filterIdx;
    });

    if (dataKasFiltered.length === 0) {
        containerMutasi.innerHTML = `
            <p class="text-center text-[10px] text-slate-400 py-6 font-semibold uppercase">
                Tidak ada transaksi kas bulan ini.
            </p>`;
        return;
    }

    [...dataKasFiltered].reverse().forEach(k => {
        const isMasuk =
            (k.Kategori || k.kategori || "").toLowerCase() === "masuk";

        const tanggalNormal = formatTanggalIndo(
            k.Tanggal || k.tanggal
        );

        containerMutasi.innerHTML += `
            <div class="py-2.5 flex justify-between items-center text-xs border-b border-slate-50 last:border-none">
                <div>
                    <p class="font-black text-slate-700 uppercase">
                        ${k.Keterangan || k.keterangan}
                    </p>
                    <p class="text-[9px] text-slate-400">
                        ${tanggalNormal}
                    </p>
                </div>

                <span class="font-black ${
                    isMasuk
                        ? "text-emerald-600"
                        : "text-rose-500"
                }">
                    ${isMasuk ? "+" : "-"}
                    ${formatRupiah(k.Nominal || k.nominal)}
                </span>
            </div>`;
    });
}


/* =========================================================
   RENDER KALENDER SAMPAH
========================================================= */

function renderKalenderSampah() {
    const grid = document.getElementById("gridAngkaKalender");

    if (!grid) return;

    grid.innerHTML = "";

    const tgl = new Date();

    const jmlHari = new Date(
        tgl.getFullYear(),
        tgl.getMonth() + 1,
        0
    ).getDate();

    const sampahSaya = (window.dbTuntas.sampah || []).filter(s =>
        (s.Nama || s.nama || "")
            .toLowerCase()
            .trim() ===
        window.sessionWarga.Nama
            .toLowerCase()
            .trim()
    );

    for (let hari = 1; hari <= jmlHari; hari++) {

        const tglTargetStr =
            `${tgl.getFullYear()}-` +
            `${String(tgl.getMonth() + 1).padStart(2, "0")}-` +
            `${String(hari).padStart(2, "0")}`;

        const log = sampahSaya.find(s => {
            const tglDb = s.Tanggal || s.tanggal || "";

            return (
                tglDb.includes(tglTargetStr) ||
                parseInt(s.Hari || s.hari) === hari
            );
        });

        let bgStyle =
            "bg-slate-100 text-slate-400 border border-slate-200/40";

        let status = "Belum Ada";
        let waktu = "--:--";
        let subTeks = "";

        if (log) {
            status = log.Status || log.status || "Kosong";
            waktu = formatJamWib(log.Waktu || log.waktu);

            if (status.toLowerCase() === "diambil") {
                bgStyle =
                    "bg-emerald-500 text-white shadow-xs";

                subTeks = `
                    <span class="block text-[7px] font-black mt-0.5 opacity-90">
                        ${waktu.replace(" WIB", "")}
                    </span>`;
            }
            else if (
                status.toLowerCase() === "tidak diambil" ||
                status.toLowerCase() === "lewat"
            ) {
                bgStyle =
                    "bg-rose-500 text-white shadow-xs";

                subTeks = `
                    <span class="block text-[7px] font-black mt-0.5 opacity-90">
                        LEWAT
                    </span>`;
            }
            else if (
                status.toLowerCase() === "kosong"
            ) {
                bgStyle =
                    "bg-slate-400 text-white";

                subTeks = `
                    <span class="block text-[7px] font-black mt-0.5 opacity-80">
                        KOSONG
                    </span>`;
            }
        }

        grid.innerHTML += `
            <div
                onclick="bukaPopUpDetailSampah('${hari}','${status}','${waktu}')"
                class="p-2 py-3 rounded-xl text-center cursor-pointer active:scale-95 transition-all flex flex-col justify-center items-center h-14 ${bgStyle}">
                
                <span class="text-xs font-black">
                    ${hari}
                </span>

                ${subTeks}
            </div>`;
    }
}


/* =========================================================
   POPUP DETAIL SAMPAH
========================================================= */

function bukaPopUpDetailSampah(
    hari,
    status,
    waktu
) {
    const title =
        document.getElementById("popTglJudul");

    const txtStatus =
        document.getElementById("popStatusTeks");

    const txtJam =
        document.getElementById("popJamWaktu");

    const boxIcon =
        document.getElementById("popBoxIcon");

    const tglSkg = new Date();

    const tglPenuhFormat =
        `${String(hari).padStart(2, "0")}-` +
        `${String(tglSkg.getMonth() + 1).padStart(2, "0")}-` +
        `${String(tglSkg.getFullYear()).slice(-2)}`;

    title.innerText =
        `Laporan Tanggal ${tglPenuhFormat}`;

    txtStatus.innerText =
        status === "Belum Ada"
            ? "BELUM ADA DATA"
            : status.toUpperCase();

    if (
        status.toLowerCase() === "diambil"
    ) {
        txtStatus.className =
            "text-base font-black text-emerald-600 tracking-tight mt-1";

        txtJam.innerText =
            `Sampah rumah Anda telah diangkut oleh petugas pada jam ${waktu}.`;

        boxIcon.className =
            "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-emerald-50 text-emerald-600 shadow-xs";
    }
    else if (
        status.toLowerCase() === "tidak diambil" ||
        status.toLowerCase() === "lewat"
    ) {
        txtStatus.className =
            "text-base font-black text-rose-500 tracking-tight mt-1";

        txtJam.innerText =
            "Petugas melewati lokasi atau menandai area Anda tidak dapat diakses.";

        boxIcon.className =
            "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-red-50 text-red-500 shadow-xs";
    }
    else if (
        status.toLowerCase() === "kosong"
    ) {
        txtStatus.className =
            "text-base font-black text-slate-500 tracking-tight mt-1";

        txtJam.innerText =
            "Petugas memantau lokasi, namun tong sampah Anda kosong.";

        boxIcon.className =
            "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-100 text-slate-500 shadow-xs";
    }
    else {
        txtStatus.className =
            "text-base font-black text-slate-400 tracking-tight mt-1";

        txtJam.innerText =
            "Belum ada riwayat laporan operasional di tanggal ini.";

        boxIcon.className =
            "w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-slate-50 text-slate-300";
    }

    openModal("mDetailSampah");
}


/* =========================================================
   CONTOH HISTORI IURAN
   (Tempel di dalam renderSemuaHalamanWarga)
========================================================= */

/*
[...iuranSaya].reverse().forEach(p => {

    const tanggalNormal = formatTanggalIndo(
        p.Tanggal || p.tanggal
    );

    listHistoriIuran.innerHTML += `
        <div class="bg-slate-50 p-3 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
            <div>
                <p class="font-black text-slate-700 uppercase">
                    ${p.Keterangan || p.keterangan || 'IURAN KAS'}
                </p>

                <p class="text-[9px] text-slate-400">
                    Tanggal: ${tanggalNormal}
                </p>
            </div>

            <span class="font-black text-slate-800">
                ${formatRupiah(p.Nominal || p.nominal)}
            </span>
        </div>`;
});
*/
