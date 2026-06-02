// URL REST API Google Apps Script & SDK Firebase Integration Engine
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx9JsUb0saYvFnH8vpCn2JZu_AzdrXXXmQIcGfMW0dsTvPndFQC_CtKyLhMx_6Kjd_IEg/exec";

const firebaseConfig = {
    apiKey: "AIzaSyCzz0INhgBUARAxqLlMnCC8vyCciI9jpJk",
    authDomain: "tuntas-04.firebaseapp.com",
    databaseURL: "https://tuntas-04-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "tuntas-04",
    storageBucket: "tuntas-04.firebasestorage.app",
    messagingSenderId: "509433415219",
    appId: "1:509433415219:web:e485a0eab1a612fda64546"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const dbFirebase = firebase.database();

const daftarBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
let dbGlobal = { kas: [], pembayaran: [], anggota: [] };
let onConfirmSuccess = null;

function showLoading() { document.getElementById('loading').style.display = 'flex'; }
function hideLoading() { document.getElementById('loading').style.display = 'none'; }

// Sinkronisasi DOM & CSS Active Premium Modal
function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

function tuntasAlert(title, message, type = 'success') {
    const icon = document.getElementById('alertIcon');
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMsg').innerText = message;
    icon.className = "w-12 h-12 mx-auto rounded-full flex items-center justify-center " + (type === 'error' ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600");
    icon.innerHTML = '<span class="material-symbols-rounded">' + (type === 'error' ? 'gpp_maybe' : 'check_circle') + '</span>';
    openModal('customAlert');
}

function closeAlert() { closeModal('customAlert'); }

function tuntasConfirm(message, onYes) {
    document.getElementById('confirmMsg').innerText = message;
    onConfirmSuccess = onYes;
    openModal('customConfirm');
}

function closeConfirm() { closeModal('customConfirm'); onConfirmSuccess = null; }

document.getElementById('confirmBtnOk').onclick = function() {
    if (onConfirmSuccess) onConfirmSuccess();
    closeConfirm();
};

function formatRupiah(num) { return "Rp " + parseFloat(num || 0).toLocaleString('id-ID'); }

function init() {
    const now = new Date();
    document.getElementById('fMulai').value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('fSelesai').value = now.toISOString().split('T')[0];
    document.getElementById('iTgl').value = now.toISOString().split('T')[0];
    document.getElementById('kTgl').value = now.toISOString().split('T')[0];
    document.getElementById('sTgl').value = now.toISOString().split('T')[0];
    
    const grid = document.getElementById('gridBulan');
    const thr = document.getElementById('th-rekap');
    grid.innerHTML = ''; 
    thr.innerHTML = '<th class="sticky-col p-4 bg-white">Nama Warga</th>';
    
    daftarBulan.forEach(bln => {
        grid.innerHTML += '<label class="relative block"><input type="checkbox" name="blnCek" value="' + bln + '" class="hidden peer"><div class="cursor-pointer text-[9px] font-black py-3 text-center border rounded-xl bg-white text-slate-300 peer-checked:bg-emerald-900 peer-checked:text-white uppercase transition-all">' + bln.substring(0,3) + '</div></label>';
        thr.innerHTML += '<th class="text-center p-3 font-bold text-slate-400">' + bln.substring(0,3) + '</th>';
    });
    thr.innerHTML += '<th class="text-center p-3 font-bold text-slate-400">AKSI</th>';
    
    reloadData();
}

// PERBAIKAN MUTLAK: Menggunakan URLSearchParams agar Parameter Action tidak Hilang/Kosong
function reloadData() {
    showLoading();
    
    const urlObj = new URL(SCRIPT_URL);
    urlObj.searchParams.append("action", "readAllData");
    
    fetch(urlObj.toString())
        .then(function(res) { return res.json(); })
        .then(function(res) {
            hideLoading();
            if (res.status === "error") {
                tuntasAlert("Gagal Server", res.message, "error");
                return;
            }
            dbGlobal.kas = res.kas || [];
            dbGlobal.pembayaran = res.pembayaran || [];
            dbGlobal.anggota = res.anggota || [];
            
            const iNama = document.getElementById('iNama');
            const sNama = document.getElementById('sNama');
            iNama.innerHTML = sNama.innerHTML = '<option value="">PILIH WARGA</option>';
            
            dbGlobal.anggota.forEach(w => {
                const opt = '<option value="' + w.nama + '">' + w.nama.toUpperCase() + '</option>';
                iNama.insertAdjacentHTML('beforeend', opt);
                sNama.insertAdjacentHTML('beforeend', opt);
            });
            renderDataTabel();
        })
        .catch(function(err) { 
            hideLoading(); 
            console.error("Detail Error:", err);
            tuntasAlert("Error", "Gagal load data dari server.", "error"); 
        });
}

function renderDataTabel() {
    const tMulai = new Date(document.getElementById('fMulai').value);
    const tSelesai = new Date(document.getElementById('fSelesai').value);
    tSelesai.setHours(23,59,59,999);

    let s_selamanya = 0, f_masuk = 0, f_keluar = 0;
    const cont = document.getElementById('listRiwayat');
    cont.innerHTML = "";

    dbGlobal.kas.forEach(trx => {
        const nil = parseFloat(trx.jumlah || 0);
        const isMsk = trx.jenis.toLowerCase() === 'masuk';
        if(isMsk) s_selamanya += nil; else s_selamanya -= nil;

        const tTrx = new Date(trx.tanggal);
        if(tTrx >= tMulai && tTrx <= tSelesai) {
            if(isMsk) f_masuk += nil; else f_keluar += nil;
            cont.innerHTML += '<div class="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-2xl animate-fade-in">' +
                '<div><p class="text-xs font-black uppercase text-slate-700">' + trx.keterangan + '</p><p class="text-[9px] font-bold text-slate-400 mt-0.5">' + trx.tanggal + '</p></div>' +
                '<div class="text-right flex items-center gap-2"><p class="text-xs font-black ' + (isMsk ? 'text-emerald-600' : 'text-red-500') + '">' + (isMsk ? '+' : '-') + ' ' + formatRupiah(nil) + '</p>' +
                '<button onclick="hapusTrx(\'kas\', \'' + trx.id + '\')" class="text-slate-300 hover:text-red-500"><span class="material-symbols-rounded !text-sm">delete</span></button></div>' +
            '</div>';
        }
    });

    if(cont.innerHTML === "") {
        cont.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada data transaksi.</p>';
    }

    document.getElementById('saldoSelamanya').innerText = formatRupiah(s_selamanya);
    document.getElementById('totalSaldo').innerText = formatRupiah(f_masuk - f_keluar);
    document.getElementById('totalMasuk').innerText = formatRupiah(f_masuk);
    document.getElementById('totalKeluar').innerText = formatRupiah(f_keluar);

    const cWarga = document.getElementById('tBodyWarga'); cWarga.innerHTML = "";
    dbGlobal.anggota.forEach(w => {
        cWarga.innerHTML += '<div class="flex justify-between items-center p-4 bg-white border border-slate-100 rounded-2xl animate-fade-in">' +
            '<div><p class="text-xs font-black text-slate-800 uppercase">' + w.nama + '</p><p class="text-[9px] text-slate-400 font-bold mt-0.5"><i class="fa-brands fa-whatsapp"></i> ' + (w.hp || '-') + '</p></div>' +
            '<button onclick="hapusTrx(\'anggota\', \'' + w.id + '\')" class="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500"><span class="material-symbols-rounded !text-md">delete</span></button>' +
        '</div>';
    });
    
    if(dbGlobal.anggota.length === 0) {
        cWarga.innerHTML = '<p class="text-center text-[11px] text-slate-400 py-4 font-semibold">Belum ada data warga.</p>';
    }

    const tbRekap = document.getElementById('tb-rekap'); tbRekap.innerHTML = "";
    dbGlobal.anggota.forEach(w => {
        let tr = '<tr><td class="sticky-col p-3 border-b text-slate-700 uppercase font-black">' + w.nama + '</td>';
        daftarBulan.forEach(bln => {
            const lunas = dbGlobal.pembayaran.some(p => p.nama.toLowerCase() === w.nama.toLowerCase() && p.bulan === bln);
            tr += '<td class="text-center border-b p-2"><span class="inline-block w-5 h-5 rounded-md ' + (lunas ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-30
