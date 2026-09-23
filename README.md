# Payroll Distribution Control Center — Prototype

Prototype sistem distribusi dan pemantauan slip gaji untuk PT Berkat Tanjung Buli
(Site Wayafli, 252 karyawan).

**Seluruh data pada prototype ini adalah data contoh.** Tidak ada nama, email,
atau angka karyawan sungguhan. Tidak ada email yang dikirim. Pengamanan yang
ditampilkan adalah gambaran rancangan, belum berjalan sungguhan.

---

## Menjalankan

**Paling cepat** — klik ganda `index.html`. Tidak ada build step, tidak ada
dependency, tidak butuh internet. Berguna kalau koneksi di lokasi presentasi
tidak bisa diandalkan.

**Lewat server lokal** (kalau mau persis sama dengan kondisi GitHub Pages):

```bash
python3 -m http.server 8080
# buka http://localhost:8080
```

## Memuat ke GitHub Pages

1. Buat repository baru, misalnya `payroll-control-center`
2. Unggah seluruh isi folder ini ke akar repository
3. Buka **Settings → Pages**
4. Source: **Deploy from a branch** · Branch: **main** · Folder: **/ (root)**
5. Simpan. Dalam satu dua menit alamatnya aktif di
   `https://<username>.github.io/payroll-control-center/`

Routing memakai hash (`#/dashboard`) sehingga tidak perlu konfigurasi
rewrite apa pun di sisi server.

> Repository sebaiknya **private** kalau tautannya dikirim ke calon klien,
> atau tetap public tapi jangan cantumkan nama klien di deskripsi repository.

---

## Struktur berkas

```
index.html              Kerangka halaman dan layar masuk
assets/css/app.css      Seluruh gaya, satu berkas, tanpa framework
assets/js/data.js       Dummy database 252 karyawan (seed tetap)
assets/js/ui.js         Komponen pakai ulang: tabel, modal, panel, toast
assets/js/pages.js      Sebelas halaman
assets/js/app.js        Router, sidebar, kendali peran
```

Modular dan siap dikembangkan: saat naik ke produksi, `data.js` diganti
panggilan API, sisanya sebagian besar bisa dipertahankan.

---

## Sebelas halaman

| Halaman | Menjawab masalah |
|---|---|
| Ruang kendali | Manajemen butuh satu layar untuk melihat seluruh siklus |
| Pelacakan pengiriman | HR butuh tahu siapa sudah terima, siapa belum |
| Pusat kirim ulang | Kegagalan harus ditangani, bukan sekadar dicatat |
| Daftar pengecualian | Karyawan tanpa email jangan dihitung sebagai kegagalan |
| Batch distribusi | Setiap siklus harus punya bentuk yang bisa diulang |
| Impor & pencocokan | Mencegah slip sampai ke orang yang salah |
| Validasi | Pengaman terakhir sebelum ratusan dokumen terkirim |
| Direktori karyawan | Riwayat per orang, tanpa data gaji |
| Jejak audit | Yang akan diminta auditor |
| Kesehatan sistem | Isi nyata dari layanan bulanan |
| Pengaturan | Konfigurasi, peran, dan kebijakan penyimpanan |

---

## Skenario demo 6 menit

Pintasan keyboard: tekan **1–9** untuk lompat antar halaman.

**0:00 · Masuk** — Pilih peran **HR Admin**, klik Lanjutkan dengan Google.
Sebutkan: sistem tidak menyimpan password sendiri, akses ikut mati saat
karyawan keluar dari perusahaan.

**0:30 · Ruang kendali** — Tunjuk papan 252 kotak. Satu kotak satu karyawan.
Arahkan kursor ke kotak merah, klik, panel karyawan terbuka. Ini inti pesannya:
tidak ada orang yang hilang di dalam angka rata-rata.

**1:30 · Validasi** (tekan `7`) — Tunjukkan empat kesalahan penghambat dan
tombol distribusi yang terkunci. Kalimat kuncinya: *"Sistem sengaja tidak
menyediakan cara melewati langkah ini."*

**2:30 · Batch** (tekan `5`) — Pada batch lembur, klik **Selesaikan kesalahan
(demo)**, lalu **Mulai distribusi**. Modal konfirmasi muncul, centang pernyataan
pemeriksaan acak, jalankan. Kotak berubah hijau satu per satu di depan mata.
Ini momen paling mengesankan dari keseluruhan demo.

**3:30 · Pusat kirim ulang** (tekan `3`) — Tunjukkan bahwa kegagalan
dikelompokkan menurut penyebab. Klik **Perbaiki dulu** pada salah satu baris:
sistem menolak mengirim ulang sesuatu yang pasti gagal lagi. Lalu **Kirim ulang
semua yang bisa**.

**4:30 · Jejak audit** (tekan `9`) — Semua yang baru saja dilakukan sudah
tercatat lengkap dengan pelakunya. Sebutkan: tidak bisa dihapus, termasuk oleh
Super Admin.

**5:15 · Kesehatan sistem** (tekan `10`, atau klik sidebar) — Ini yang
menjelaskan biaya bulanan. Tunjuk laporan layanan bulanan beserta
rekomendasinya.

**5:45 · Penutup** — Keluar, masuk lagi sebagai **Viewer**. Tombol-tombol
tindakan hilang. Perlihatkan bahwa peran bukan sekadar label.

### Satu hal yang sebaiknya Anda sebutkan sendiri

Masuk sebagai **Super Admin** dan tunjukkan bahwa peran itu **tidak bisa**
menekan tombol kirim maupun membuka password karyawan. Jelaskan kenapa:
Super Admin dipegang konsultan eksternal, dan keputusan mengirim data gaji
harus selalu tercatat atas nama orang internal perusahaan. Ini pembatasan yang
Anda pasang pada diri sendiri, dan biasanya justru itu yang paling meyakinkan
manajemen.

---

## Yang sengaja tidak ada

Tidak ada nominal gaji, nomor rekening, NIK, NPWP, nomor BPJS, atau password
di layar mana pun. Bukan karena belum sempat dibuat, tetapi karena sistem
distribusi memang tidak membutuhkannya. Ini keputusan rancangan, dan sebaiknya
disampaikan seperti itu saat presentasi.
