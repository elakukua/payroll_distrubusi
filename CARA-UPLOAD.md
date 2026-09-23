# Cara memuat ke GitHub Pages

## Kenapa tadi tampilannya polos

CSS dan JavaScript berada di folder `assets/`, dan folder itu tidak ikut
terunggah ke repository. GitHub menampilkan HTML-nya saja, tanpa gaya apa pun.

Sekarang `index.html` sudah berisi seluruh CSS dan JavaScript di dalamnya.
**Cukup unggah satu berkas itu saja.**

---

## Langkah tercepat (2 menit)

1. Buka repository Anda di GitHub
2. Klik **Add file → Upload files**
3. Seret **`index.html`** saja ke jendela unggah
4. Kalau sudah ada `index.html` lama, GitHub akan menimpanya — itu yang kita mau
5. Klik **Commit changes**
6. Buka **Settings → Pages**, pastikan Source = **Deploy from a branch**,
   Branch = **main**, Folder = **/ (root)**
7. Tunggu satu sampai dua menit, lalu buka alamatnya

## Kalau masih terlihat polos setelah diunggah

Hampir selalu karena cache browser. Lakukan **hard refresh**:

- Windows / Linux — `Ctrl + Shift + R`
- Mac — `Cmd + Shift + R`

Kalau masih juga, buka alamatnya di jendela penyamaran (incognito).

## Memeriksa berkasnya benar-benar masuk

Di halaman repository, klik `index.html`. Ukurannya harus sekitar **216 KB**.
Kalau yang tampil hanya sekitar 5 KB, berarti yang terunggah masih berkas lama.

---

## Catatan untuk pengembangan lanjutan

Kode sumber terpisah ada di `assets/` (`app.css`, `data.js`, `ui.js`,
`pages.js`, `app.js`) dan kerangka HTML-nya di `src/index.src.html`.
Itulah yang diedit saat sistem dikembangkan.

`index.html` adalah hasil gabungan dan **tidak untuk diedit langsung**.
Setelah mengubah apa pun di `assets/` atau `src/`, bangun ulang dengan:

```bash
python3 build.py
```

Skrip itu menyalin CSS dan JavaScript ke dalam `index.html` dan menolak
berjalan kalau ada isi yang bisa merusak berkas gabungan.

Untuk presentasi, cukup pakai `index.html` apa adanya.
