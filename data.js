/* ==========================================================================
   DUMMY DATABASE — PROTOTYPE
   --------------------------------------------------------------------------
   Seluruh nama, email, dan angka di file ini dihasilkan secara acak dengan
   seed tetap. TIDAK ADA data karyawan sungguhan.

   Struktur divisi dan jabatan mengikuti pola operasional site agar demo
   terasa relevan, tetapi isinya sepenuhnya fiktif.

   Catatan desain: nominal gaji, rekening, NIK, NPWP, dan password TIDAK
   disimpan maupun ditampilkan di mana pun. Sistem ini hanya perlu tahu
   siapa harus menerima dokumen apa, dan apakah sudah sampai.
   ========================================================================== */

var DB = (function () {
  'use strict';

  /* Generator acak deterministik — hasil selalu sama tiap kali dibuka,
     supaya demo bisa diulang dengan angka yang persis sama. */
  var seed = 20261020;
  function rnd() {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function between(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function pad(n, w) { return String(n).padStart(w || 4, '0'); }

  /* ---------------------------------------------------------------- nama -- */
  var FIRST = [
    'Adi', 'Bagus', 'Candra', 'Dedi', 'Eko', 'Fajar', 'Gilang', 'Hendra', 'Imam',
    'Joko', 'Kurnia', 'Lukman', 'Marwan', 'Nanang', 'Oscar', 'Prasetyo', 'Rahmat',
    'Sandi', 'Taufik', 'Usman', 'Verry', 'Wahyu', 'Yusuf', 'Zainal', 'Arif',
    'Bayu', 'Chandra', 'Denny', 'Erwin', 'Firman', 'Galih', 'Hasan', 'Ilham',
    'Jefri', 'Krisna', 'Leo', 'Miftah', 'Novan', 'Oki', 'Putra', 'Reza', 'Salim',
    'Tino', 'Umar', 'Vito', 'Widodo', 'Yanto', 'Zulkifli', 'Andre', 'Bima',
    'Cahyo', 'Darma', 'Elang', 'Feri', 'Gunawan', 'Hafiz', 'Irwan', 'Jamal',
    'Kadir', 'Lutfi', 'Maulana', 'Nurdin', 'Omar', 'Pandu', 'Ridho', 'Surya',
    'Teguh', 'Ucok', 'Viktor', 'Wawan', 'Yoga', 'Zaki', 'Anton', 'Basri',
    'Deni', 'Edwin', 'Fandi', 'Gerald', 'Haris', 'Ivan', 'Julian', 'Kevin'
  ];
  var LAST = [
    'Saputra', 'Wijaya', 'Nugroho', 'Hidayat', 'Ramadhan', 'Setiawan', 'Kurniawan',
    'Firmansyah', 'Maulida', 'Pratama', 'Wibowo', 'Santoso', 'Lestari', 'Halim',
    'Mahendra', 'Sanjaya', 'Purnama', 'Hakim', 'Riyadi', 'Gunadi', 'Susanto',
    'Utama', 'Permana', 'Sudirman', 'Anggara', 'Yulianto', 'Prabowo', 'Raharjo',
    'Sitompul', 'Manurung', 'Simatupang', 'Pangaribuan', 'Nainggolan', 'Sihombing',
    'Tampubolon', 'Marpaung', 'Latupono', 'Wattimena', 'Leimena', 'Sahetapy',
    'Rumbiak', 'Womsiwor', 'Kambu', 'Wanma', 'Rumkorem', 'Sorondanya',
    'Mandagi', 'Rondonuwu', 'Tumbelaka', 'Wenas', 'Pangemanan', 'Lengkong',
    'Assagaf', 'Bahasoan', 'Tuasikal', 'Pelupessy', 'Hehanussa', 'Silooy'
  ];

  /* ------------------------------------------------------------ struktur -- */
  var DIVISIONS = [
    { key: 'KONSTRUKSI', name: 'Konstruksi', head: 'Site Manager Konstruksi' },
    { key: 'WHL', name: 'Workshop & Heavy Equipment', head: 'Workshop Superintendent' },
    { key: 'GAGM', name: 'General Affairs & Camp', head: 'GA Supervisor' },
    { key: 'PLTD', name: 'PLTD & Kelistrikan', head: 'Power Plant Supervisor' },
    { key: 'PORT', name: 'Port & Jetty', head: 'Port Supervisor' },
    { key: 'WHSE', name: 'Warehouse & Logistik', head: 'Warehouse Supervisor' },
    { key: 'FIN', name: 'Finance & Administrasi', head: 'Finance Manager' },
    { key: 'HRIT', name: 'HR & IT', head: 'HR Manager' }
  ];

  var ROLES_BY_DIV = {
    KONSTRUKSI: ['Helper Konstruksi', 'Tukang Kayu', 'Tukang Cat', 'Welder', 'Mandor Konstruksi', 'Operator Excavator', 'Helper Mekanik'],
    WHL: ['Helper Mekanik', 'Mekanik Alat Berat', 'Operator Excavator', 'Operator Dozer', 'Operator Bomag', 'Driver DT', 'Driver Bus', 'Tyre Man', 'Welder'],
    GAGM: ['Helper GA', 'Cleaning Service', 'Helper Kitchen', 'Cook', 'Security', 'Driver LV', 'Laundry Attendant'],
    PLTD: ['Teknisi PLTD', 'Operator Genset', 'Helper Kelistrikan', 'Electrician'],
    PORT: ['Helper Jetty', 'Operator Crane', 'Tally Clerk', 'Mooring Man'],
    WHSE: ['Helper Warehouse', 'Admin Gudang', 'Checker', 'Forklift Operator'],
    FIN: ['Staff Finance', 'Admin Finance', 'Purchasing Staff', 'Cost Controller'],
    HRIT: ['Admin HR', 'Payroll Officer', 'Safety Officer', 'IT Support', 'Recruitment Staff']
  };

  /* Jumlah karyawan per divisi — total 252, sesuai master payroll klien */
  var HEADCOUNT = {
    KONSTRUKSI: 58, WHL: 62, GAGM: 41, PLTD: 16,
    PORT: 19, WHSE: 26, FIN: 14, HRIT: 16
  };

  var DOMAIN = 'btb-mining.co.id';

  /* -------------------------------------------------------- data karyawan -- */
  var employees = [];
  var used = {};
  var n = 0;

  DIVISIONS.forEach(function (div) {
    var count = HEADCOUNT[div.key];
    for (var i = 0; i < count; i++) {
      n++;
      var name, guard = 0;
      do {
        name = pick(FIRST) + ' ' + pick(LAST);
        guard++;
      } while (used[name] && guard < 40);
      used[name] = true;

      var slug = name.toLowerCase().replace(/ /g, '.');
      employees.push({
        code: 'BTB-' + pad(n),
        name: name,
        division: div.key,
        divisionName: div.name,
        position: pick(ROLES_BY_DIV[div.key]),
        email: slug + '@' + DOMAIN,
        emailType: 'corporate',
        joined: (2019 + between(0, 6)) + '-' + pad(between(1, 12), 2) + '-' + pad(between(1, 28), 2),
        status: 'active'
      });
    }
  });

  /* Lima karyawan tanpa email — masuk Exception List, bukan dihitung gagal.
     Ini kondisi nyata di site: pekerja baru yang akunnya belum dibuat. */
  var noEmail = [17, 74, 128, 190, 231];
  noEmail.forEach(function (idx) {
    employees[idx].email = null;
    employees[idx].emailType = 'none';
    employees[idx].exceptionReason = 'Akun email belum dibuat';
  });

  /* Tiga karyawan pakai email pribadi — ditandai supaya HR tahu mana yang
     perlu dipantau lebih ketat. */
  [8, 96, 203].forEach(function (idx) {
    var f = employees[idx].name.toLowerCase().replace(/ /g, '');
    employees[idx].email = f + '@gmail.com';
    employees[idx].emailType = 'personal';
  });

  /* -------------------------------------------- demografi & komponen -- */
  /* Sebaran jenis kelamin mengikuti pola site tambang: mayoritas laki-laki,
     karyawan perempuan terkonsentrasi di Finance, HR, dan GA. */
  var FEMALE_HEAVY = { FIN: 0.55, HRIT: 0.5, GAGM: 0.3, WHSE: 0.15 };

  employees.forEach(function (e, i) {
    var pFemale = FEMALE_HEAVY[e.division] || 0.04;
    e.gender = rnd() < pFemale ? 'P' : 'L';

    /* Usia — puncaknya di 27–36 dengan ekor pekerja senior, mengikuti
       pola tenaga kerja site yang didominasi usia produktif awal. */
    var age = rnd() < .13
      ? between(45, 56)
      : Math.round(21 + (rnd() + rnd()) / 2 * 22);
    e.age = age;
    var by = 2026 - age;
    e.birth = by + '-' + pad(between(1, 12), 2) + '-' + pad(between(1, 28), 2);

    /* Status PTKP menentukan kategori TER */
    e.ptkp = age < 26 ? pick(['TK/0', 'TK/0', 'TK/1'])
      : age < 34 ? pick(['TK/0', 'K/0', 'K/1', 'K/1'])
        : pick(['K/1', 'K/2', 'K/2', 'K/3']);

    /* Komponen gaji — angka fiktif, disusun agar sebarannya masuk akal
       untuk pekerja lapangan di site. */
    var tier = { FIN: 1.35, HRIT: 1.3, PLTD: 1.2, PORT: 1.1, WHL: 1.08, WHSE: 1.02, KONSTRUKSI: 1, GAGM: .98 }[e.division] || 1;
    var senior = /Mandor|Superintendent|Manager|Officer|Admin|Staff|Cost|Electrician|Mekanik Alat Berat/.test(e.position) ? 1.25 : 1;

    e.pay = {
      pokok: Math.round(3550000 * tier * senior / 1000) * 1000,
      tunjKehadiran: rnd() < .72 ? 400000 : 0,
      tunjSkill: rnd() < .35 ? Math.round(between(2, 12) * 125000) : 0
    };
  });

  /* ------------------------------------------------- tarif potongan -- */
  /* PENTING — seluruh angka di bawah ini adalah KONFIGURASI, bukan
     ketetapan. HR wajib memverifikasi dan menggantinya dengan tarif resmi
     yang berlaku sebelum sistem dipakai. Tarif berubah dari waktu ke waktu;
     karena itu tempatnya di pengaturan, bukan di dalam kode. */
  var rates = {
    verified: false,
    verifiedNote: 'Tarif contoh — wajib diverifikasi HR terhadap peraturan yang berlaku',

    /* BPJS Ketenagakerjaan */
    jhtEmployee: 2.0, jhtEmployer: 3.7,
    jpEmployee: 1.0, jpEmployer: 2.0, jpWageCap: 10547400,
    jkk: 1.27, jkkNote: 'Tingkat risiko tinggi — pertambangan & konstruksi',
    jkm: 0.30,

    /* BPJS Kesehatan */
    kesEmployee: 1.0, kesEmployer: 4.0, kesWageCap: 12000000,

    /* Dasar perhitungan iuran BPJS.
       'umk'  — upah minimum tetap untuk semua karyawan
       'pokok' — gaji pokok masing-masing
       'pokok_tunjangan' — gaji pokok ditambah tunjangan kehadiran
       Slip yang berlaku di perusahaan ini memakai 'umk'. */
    bpjsBase: 'umk',
    umkWage: 3512866,

    /* Lembur — pembagi jam kerja sebulan dan pengali upah lembur */
    overtimeDivisor: 173,
    overtimeMultiplier: 1.75,

    /* Ambang selisih untuk pemeriksaan silang terhadap angka Excel */
    crossCheckTolerance: 1.0
  };

  /* Tabel TER bulanan. Struktur mengikuti skema tarif efektif rata-rata:
     bruto bulanan dikalikan satu tarif sesuai kategori PTKP.
     Kategori A: TK/0, TK/1, K/0 · B: TK/2, TK/3, K/1, K/2 · C: K/3

     ⚠ Tabel ini SENGAJA disederhanakan dan harus diganti dengan tabel resmi
     lengkap sebelum dipakai. Ambang bebas pajak di lapisan pertama sudah
     disesuaikan per kategori, lapisan berikutnya adalah perkiraan. */
  var terTable = {
    A: [[5400000, 0], [5650000, .0025], [5950000, .005], [6300000, .0075],
        [6750000, .01], [7500000, .0125], [8550000, .015], [9650000, .0175],
        [10050000, .02], [10350000, .0225], [10700000, .025], [11050000, .03],
        [11600000, .035], [12500000, .04], [13750000, .05], [15100000, .06],
        [16950000, .07], [19750000, .08], [24150000, .09], [Infinity, .10]],
    B: [[6200000, 0], [6500000, .0025], [6850000, .005], [7300000, .0075],
        [7800000, .01], [8650000, .0125], [9750000, .015], [10850000, .0175],
        [11600000, .02], [12100000, .0225], [12600000, .025], [13600000, .03],
        [14550000, .035], [15550000, .04], [16950000, .05], [18450000, .06],
        [20350000, .07], [24150000, .08], [26450000, .09], [Infinity, .10]],
    C: [[6600000, 0], [6950000, .0025], [7350000, .005], [7800000, .0075],
        [8850000, .01], [9800000, .0125], [10950000, .015], [11200000, .0175],
        [12050000, .02], [12950000, .0225], [14150000, .025], [15550000, .03],
        [16950000, .035], [18350000, .04], [20000000, .05], [22000000, .06],
        [24000000, .07], [26000000, .08], [28000000, .09], [Infinity, .10]]
  };

  function terCategory(ptkp) {
    if (ptkp === 'K/3') return 'C';
    if (['TK/2', 'TK/3', 'K/1', 'K/2'].indexOf(ptkp) > -1) return 'B';
    return 'A';
  }
  function terRate(ptkp, bruto) {
    var tbl = terTable[terCategory(ptkp)];
    for (var i = 0; i < tbl.length; i++) {
      if (bruto <= tbl[i][0]) return tbl[i][1];
    }
    return tbl[tbl.length - 1][1];
  }

  /* Mesin perhitungan. Mengembalikan rincian lengkap supaya setiap angka
     di layar bisa ditelusuri asalnya. */
  function calcPayroll(emp, overtimeHours, r) {
    r = r || rates;
    var p = emp.pay;
    var hourly = p.pokok / r.overtimeDivisor;
    var lembur = Math.round((overtimeHours || 0) * hourly * r.overtimeMultiplier);

    var bruto = p.pokok + p.tunjKehadiran + p.tunjSkill + lembur;
    var upahDasar = r.bpjsBase === 'umk' ? r.umkWage
      : r.bpjsBase === 'pokok' ? p.pokok
        : p.pokok + p.tunjKehadiran;

    var jht = Math.round(upahDasar * r.jhtEmployee / 100);
    var jp = Math.round(Math.min(upahDasar, r.jpWageCap) * r.jpEmployee / 100);
    var kes = Math.round(Math.min(upahDasar, r.kesWageCap) * r.kesEmployee / 100);

    var rate = terRate(emp.ptkp, bruto);
    var pph = Math.round(bruto * rate);

    var potongan = jht + jp + kes + pph;

    /* Sisi perusahaan — tidak memotong gaji, tetapi perlu diketahui
       manajemen karena ini biaya nyata per karyawan. */
    var employer = {
      jht: Math.round(upahDasar * r.jhtEmployer / 100),
      jp: Math.round(Math.min(upahDasar, r.jpWageCap) * r.jpEmployer / 100),
      jkk: Math.round(upahDasar * r.jkk / 100),
      jkm: Math.round(upahDasar * r.jkm / 100),
      kes: Math.round(Math.min(upahDasar, r.kesWageCap) * r.kesEmployer / 100)
    };
    employer.total = employer.jht + employer.jp + employer.jkk + employer.jkm + employer.kes;

    return {
      pokok: p.pokok, tunjKehadiran: p.tunjKehadiran, tunjSkill: p.tunjSkill,
      lembur: lembur, lemburJam: overtimeHours || 0, hourly: Math.round(hourly),
      bruto: bruto, upahDasar: upahDasar,
      jht: jht, jp: jp, kes: kes, pph: pph,
      terCategory: terCategory(emp.ptkp), terRate: rate,
      potongan: potongan, netto: bruto - potongan,
      employer: employer, cost: bruto + employer.total
    };
  }

  var otByCode = {};

  var byCode = {};
  employees.forEach(function (e) { byCode[e.code] = e; });

  /* ------------------------------------------------------------- periode -- */
  /* Siklus payroll klien berjalan tanggal 21 sampai 20, bukan kalender bulan. */
  var periods = [
    { code: 'JUL-2026', label: 'Juli 2026', range: '21 Jun – 20 Jul 2026' },
    { code: 'AGU-2026', label: 'Agustus 2026', range: '21 Jul – 20 Agu 2026' },
    { code: 'SEP-2026', label: 'September 2026', range: '21 Agu – 20 Sep 2026' },
    { code: 'OKT-2026', label: 'Oktober 2026', range: '21 Sep – 20 Okt 2026' }
  ];

  /* --------------------------------------------------------- hasil kirim -- */
  /* Sebaran status batch September, angka dikunci supaya demo konsisten:
       252 karyawan
     −   5 tanpa email  → exception
     = 247 diproses
       234 terkirim langsung
     +   6 berhasil setelah retry
     = 240 berhasil  ·  2 pending  ·  5 gagal  ·  success rate 97,2% */

  var FAILURES = [
    { code: 'INVALID_EMAIL', label: 'Alamat email tidak valid', detail: 'Domain penerima tidak dapat diselesaikan (NXDOMAIN)' },
    { code: 'MAILBOX_FULL', label: 'Kotak masuk penuh', detail: 'Server penerima menolak: kuota mailbox terlampaui' },
    { code: 'REJECTED', label: 'Email ditolak server', detail: 'Penerima menolak pesan dengan lampiran terenkripsi' },
    { code: 'PAYSLIP_MISSING', label: 'Berkas slip tidak ditemukan', detail: 'Tidak ada berkas yang cocok dengan ID karyawan di arsip batch' },
    { code: 'MISMATCH', label: 'Slip tidak cocok dengan karyawan', detail: 'ID di dalam berkas berbeda dengan ID pada nama berkas' },
    { code: 'SYSTEM_ERROR', label: 'Kesalahan sistem', detail: 'Waktu tunggu koneksi ke layanan pengiriman habis' }
  ];
  var failByCode = {};
  FAILURES.forEach(function (f) { failByCode[f.code] = f; });

  function buildDeliveries(batchId, period, docType, plan) {
    var rows = [];
    var pool = employees.slice();

    /* Urutan pengiriman diacak supaya tidak semua kegagalan menumpuk di
       satu divisi — itu akan terlihat palsu saat demo. */
    var order = pool.map(function (e, i) { return { e: e, k: rnd(), i: i }; })
      .sort(function (a, b) { return a.k - b.k; });

    var slots = [];
    var s;
    for (s = 0; s < plan.failed; s++) slots.push('FAILED');
    for (s = 0; s < plan.retrySuccess; s++) slots.push('RETRY_SUCCESS');
    for (s = 0; s < plan.pending; s++) slots.push('PENDING');

    var slotAt = 0;
    var clock = 8 * 60 + 12; /* distribusi dimulai 08:12 */

    order.forEach(function (o, idx) {
      var emp = o.e;

      if (!emp.email) {
        rows.push({
          batchId: batchId, code: emp.code, docType: docType,
          email: null, payslipStatus: 'READY', emailStatus: 'NO_ADDRESS',
          status: 'EXCEPTION', sentAt: null, retryCount: 0,
          lastAttempt: null, errorCode: null, messageId: null
        });
        return;
      }

      var status = 'SENT';
      /* Sebar slot khusus merata sepanjang antrian */
      if (slotAt < slots.length && idx % Math.floor(pool.length / (slots.length + 1)) === 3) {
        status = slots[slotAt++];
      }

      clock += between(1, 4);
      var hh = Math.floor(clock / 60), mm = clock % 60;
      var stamp = pad(hh, 2) + ':' + pad(mm, 2);

      var row = {
        batchId: batchId, code: emp.code, docType: docType,
        email: emp.email,
        payslipStatus: 'READY',
        emailStatus: 'ACCEPTED',
        status: status,
        sentDate: plan.date,
        sentAt: stamp,
        retryCount: 0,
        lastAttempt: plan.date + ' ' + stamp,
        errorCode: null,
        messageId: '<' + batchId.toLowerCase() + '.' + emp.code.toLowerCase() + '@' + DOMAIN + '>'
      };

      if (status === 'FAILED') {
        var f = FAILURES[slotAt % FAILURES.length];
        row.errorCode = f.code;
        row.emailStatus = f.code === 'PAYSLIP_MISSING' || f.code === 'MISMATCH' ? 'NOT_SENT' : 'BOUNCED';
        row.payslipStatus = f.code === 'PAYSLIP_MISSING' ? 'MISSING' : 'READY';
        row.retryCount = between(1, 3);
        row.sentAt = null;
        row.messageId = null;
      } else if (status === 'RETRY_SUCCESS') {
        row.retryCount = 1;
        row.emailStatus = 'ACCEPTED';
        row.previousError = 'MAILBOX_FULL';
      } else if (status === 'PENDING') {
        row.emailStatus = 'QUEUED';
        row.sentAt = null;
        row.messageId = null;
      }

      rows.push(row);
    });

    /* Dibangun dalam urutan acak supaya yang gagal bukan karyawan itu-itu saja,
       lalu diurutkan ulang menurut ID agar papan dan tabel tampil wajar dan
       kegagalannya tersebar — bukan menumpuk di pojok. */
    rows.sort(function (a, b) { return a.code < b.code ? -1 : 1; });
    return rows;
  }

  /* ------------------------------------------------------------- batches -- */
  var batches = [
    {
      id: 'PAY-JUL-2026', period: 'JUL-2026', docType: 'PAYSLIP',
      label: 'Slip gaji Juli 2026', status: 'COMPLETED',
      date: '2026-07-24', start: '08:10', end: '08:31', durationMin: 21,
      createdBy: 'Rahayu Pertiwi', approvedBy: 'Dimas Anggoro',
      total: 252, processed: 246, sent: 241, failed: 3, pending: 0, exception: 6
    },
    {
      id: 'PAY-AGU-2026', period: 'AGU-2026', docType: 'PAYSLIP',
      label: 'Slip gaji Agustus 2026', status: 'COMPLETED',
      date: '2026-08-25', start: '08:05', end: '08:29', durationMin: 24,
      createdBy: 'Rahayu Pertiwi', approvedBy: 'Dimas Anggoro',
      total: 252, processed: 247, sent: 244, failed: 2, pending: 1, exception: 5
    },
    {
      id: 'OT-AGU-2026', period: 'AGU-2026', docType: 'OVERTIME',
      label: 'Slip lembur Agustus 2026', status: 'COMPLETED',
      date: '2026-08-26', start: '10:02', end: '10:19', durationMin: 17,
      createdBy: 'Sinta Maharani', approvedBy: 'Dimas Anggoro',
      total: 213, processed: 209, sent: 206, failed: 3, pending: 0, exception: 4
    },
    {
      id: 'PAY-SEP-2026', period: 'SEP-2026', docType: 'PAYSLIP',
      label: 'Slip gaji September 2026', status: 'COMPLETED',
      date: '2026-09-22', start: '08:12', end: '08:36', durationMin: 24,
      createdBy: 'Rahayu Pertiwi', approvedBy: 'Dimas Anggoro',
      total: 252, processed: 247, sent: 240, failed: 5, pending: 2, exception: 5
    },
    {
      id: 'OT-SEP-2026', period: 'SEP-2026', docType: 'OVERTIME',
      label: 'Slip lembur September 2026', status: 'VALIDATED',
      date: null, start: null, end: null, durationMin: null,
      createdBy: 'Sinta Maharani', approvedBy: null,
      total: 252, processed: 0, sent: 0, failed: 0, pending: 0, exception: 5
    },
    {
      /* Batch gajian tanggal 20 — inilah yang dijalankan saat demo.
         Statusnya sudah lolos validasi, tinggal disetujui dan dikirim. */
      id: 'PAY-OKT-2026', period: 'OKT-2026', docType: 'PAYSLIP',
      label: 'Slip gaji Oktober 2026', status: 'VALIDATED',
      date: null, start: null, end: null, durationMin: null,
      createdBy: 'Rahayu Pertiwi', approvedBy: null,
      total: 252, processed: 0, sent: 0, failed: 0, pending: 0, exception: 5,
      validationClear: true,
      note: 'Payroll tanggal 20 sudah selesai dihitung. Batch siap disetujui dan dikirim.'
    }
  ];

  var deliveries = buildDeliveries('PAY-SEP-2026', 'SEP-2026', 'PAYSLIP', {
    date: '2026-09-22', failed: 5, retrySuccess: 6, pending: 2
  });

  /* Riwayat ringkas batch lama — untuk halaman detail karyawan */
  var history = {};
  employees.forEach(function (e) { history[e.code] = []; });
  ['PAY-JUL-2026', 'PAY-AGU-2026', 'OT-AGU-2026'].forEach(function (bid) {
    var b = batches.filter(function (x) { return x.id === bid; })[0];
    employees.forEach(function (e, i) {
      if (!e.email) return;
      if (b.docType === 'OVERTIME' && i % 6 === 0) return; /* tidak semua lembur */
      var st = 'SENT';
      if ((i + bid.length) % 83 === 0) st = 'FAILED';
      history[e.code].push({
        batchId: bid, label: b.label, date: b.date,
        time: b.start, status: st, docType: b.docType
      });
    });
  });

  /* --------------------------------------------------------------- lembur -- */
  /* Rekap jam lembur per karyawan untuk periode September.
     Ambang batas bisa dikonfigurasi — di prototype disetel 80 jam. */
  var OT_CAP = 80;
  var overtime = [];
  employees.forEach(function (e, i) {
    if (i % 6 === 0) return;
    var base = { KONSTRUKSI: 46, WHL: 62, GAGM: 38, PLTD: 34, PORT: 44, WHSE: 40, FIN: 12, HRIT: 15 }[e.division];
    var hours = Math.max(0, base + between(-18, 42));
    overtime.push({
      code: e.code, name: e.name, division: e.division,
      divisionName: e.divisionName, position: e.position,
      hours: hours, entries: Math.max(1, Math.round(hours / 3.4)),
      overCap: hours > OT_CAP
    });
  });
  overtime.sort(function (a, b) { return b.hours - a.hours; });
  overtime.forEach(function (o) { otByCode[o.code] = o.hours; });

  /* ---------------------------------------- snapshot gaji per periode -- */
  /* Angka Excel tetap menjadi acuan resmi. Hasil hitung sistem dipakai
     sebagai pembanding: kalau keduanya berselisih di atas ambang, barisnya
     ditandai supaya HR memeriksa rumus di berkas payroll. Beberapa selisih
     sengaja ditanam di data contoh agar fitur ini terlihat saat demo. */
  var DRIFT = { 22: 1.0341, 87: 0.9612, 141: 1.0288, 199: 0.9455 };

  var payroll = employees.map(function (e, i) {
    var calc = calcPayroll(e, otByCode[e.code] || 0);
    var drift = DRIFT[i] || 1;
    var excelNetto = Math.round(calc.netto * drift);
    var gap = calc.netto ? Math.abs(excelNetto - calc.netto) / calc.netto * 100 : 0;
    return {
      code: e.code,
      calc: calc,
      excelNetto: excelNetto,
      gapPct: gap,
      flagged: gap > rates.crossCheckTolerance
    };
  });
  var payByCode = {};
  payroll.forEach(function (p) { payByCode[p.code] = p; });

  function payrollTotals(rows) {
    var t = { bruto: 0, netto: 0, pph: 0, bpjsEmployee: 0, bpjsEmployer: 0, cost: 0, lembur: 0, count: 0 };
    rows.forEach(function (p) {
      t.bruto += p.calc.bruto;
      t.netto += p.calc.netto;
      t.pph += p.calc.pph;
      t.bpjsEmployee += p.calc.jht + p.calc.jp + p.calc.kes;
      t.bpjsEmployer += p.calc.employer.total;
      t.cost += p.calc.cost;
      t.lembur += p.calc.lembur;
      t.count++;
    });
    return t;
  }

  /* Nilai payroll per periode untuk filter bulan di ruang kendali.
     Periode lama diberi variasi ringan agar grafik tidak datar. */
  var baseTotals = payrollTotals(payroll);
  var periodTotals = {};
  [['JUL-2026', .94, 241], ['AGU-2026', .97, 244], ['SEP-2026', 1, 240], ['OKT-2026', 1.03, 0]]
    .forEach(function (row) {
      periodTotals[row[0]] = {
        bruto: Math.round(baseTotals.bruto * row[1]),
        netto: Math.round(baseTotals.netto * row[1]),
        pph: Math.round(baseTotals.pph * row[1]),
        bpjsEmployee: Math.round(baseTotals.bpjsEmployee * row[1]),
        bpjsEmployer: Math.round(baseTotals.bpjsEmployer * row[1]),
        lembur: Math.round(baseTotals.lembur * row[1]),
        delivered: row[2],
        count: 252
      };
    });

  /* Detail baris lembur — dibangkitkan saat dibutuhkan di halaman detail */
  var OT_TASKS = [
    'Service 500 jam unit DT 07', 'Ganti ban posisi 9 dan 10 DT 03',
    'Pemantauan area workshop', 'Perbaikan hose parking brake CM 04',
    'Pengisian BBM area jetty dan quarry', 'Penurunan barang ekspedisi',
    'Stok opname gudang utama', 'Patroli gudang shift malam',
    'Perbaikan kelistrikan genset 2', 'Pemasangan rak gudang baru',
    'Adjust brake dan pedal gas TR 09', 'Pembersihan area camp',
    'Mooring kapal tongkang', 'Pengelasan kerangka kontainer'
  ];
  function otDetail(code) {
    var rec = overtime.filter(function (o) { return o.code === code; })[0];
    if (!rec) return [];
    var rows = [], left = rec.hours, d = 21;
    var localSeed = 0;
    for (var i = 0; i < code.length; i++) localSeed += code.charCodeAt(i);
    while (left > 0 && rows.length < 26) {
      localSeed = (localSeed * 75 + 74) % 65537;
      var h = Math.min(left, 1 + (localSeed % 9));
      var codeType = h >= 8 ? 3 : (h >= 4 ? 2 : 1);
      rows.push({
        date: (d <= 30 ? '2026-08-' + pad(d, 2) : '2026-09-' + pad(d - 30, 2)),
        code: codeType,
        hours: h,
        task: OT_TASKS[(localSeed + rows.length) % OT_TASKS.length]
      });
      left -= h;
      d += 1 + (localSeed % 2);
      if (d > 50) break;
    }
    return rows;
  }

  /* ----------------------------------------------------------- validasi -- */
  var validationRules = [
    { code: 'EMP_ID', label: 'ID karyawan tersedia', severity: 'BLOCKING', checked: 252, failed: 0 },
    { code: 'EMAIL_PRESENT', label: 'Alamat email tersedia', severity: 'WARNING', checked: 252, failed: 5 },
    { code: 'EMAIL_FORMAT', label: 'Format email valid', severity: 'BLOCKING', checked: 247, failed: 0 },
    { code: 'DOC_PRESENT', label: 'Berkas slip tersedia', severity: 'BLOCKING', checked: 252, failed: 2 },
    { code: 'DOC_MATCH', label: 'Slip cocok dengan karyawan', severity: 'BLOCKING', checked: 250, failed: 1 },
    { code: 'DUP_EMP', label: 'Tidak ada ID karyawan ganda', severity: 'BLOCKING', checked: 252, failed: 0 },
    { code: 'DUP_EMAIL', label: 'Tidak ada alamat email ganda', severity: 'BLOCKING', checked: 247, failed: 0 },
    { code: 'ENCRYPTED', label: 'Slip sudah terenkripsi', severity: 'BLOCKING', checked: 250, failed: 0 },
    { code: 'PERIOD', label: 'Periode pada berkas sesuai batch', severity: 'BLOCKING', checked: 250, failed: 1 }
  ];

  var validationIssues = [
    { rule: 'DOC_PRESENT', severity: 'BLOCKING', code: employees[45].code, name: employees[45].name, message: 'Tidak ada berkas slip lembur untuk ID ini di arsip batch', resolved: false },
    { rule: 'DOC_PRESENT', severity: 'BLOCKING', code: employees[168].code, name: employees[168].name, message: 'Tidak ada berkas slip lembur untuk ID ini di arsip batch', resolved: false },
    { rule: 'DOC_MATCH', severity: 'BLOCKING', code: employees[212].code, name: employees[212].name, message: 'ID di dalam berkas tertulis BTB-0214, tidak sama dengan nama berkas', resolved: false },
    { rule: 'PERIOD', severity: 'BLOCKING', code: employees[77].code, name: employees[77].name, message: 'Periode pada berkas tertulis Agustus 2026, batch ini September 2026', resolved: false },
    { rule: 'EMAIL_PRESENT', severity: 'WARNING', code: employees[17].code, name: employees[17].name, message: 'Belum punya alamat email — akan masuk daftar pengecualian', resolved: false },
    { rule: 'EMAIL_PRESENT', severity: 'WARNING', code: employees[74].code, name: employees[74].name, message: 'Belum punya alamat email — akan masuk daftar pengecualian', resolved: false }
  ];

  /* ------------------------------------------------------------ matching -- */
  var matching = {
    filesFound: 250,
    matched: 247,
    unmatched: 3,
    duplicates: 0,
    rows: [
      { file: 'Slip_Lembur_BTB-0214_202609.pdf', match: null, reason: 'ID di nama berkas tidak ada di master karyawan', suggestion: employees[212].code + ' · ' + employees[212].name },
      { file: 'Slip_Lembur_202609_rev2.pdf', match: null, reason: 'Nama berkas tidak memuat ID karyawan', suggestion: null },
      { file: 'Slip_Lembur_BTB-0078_202608.pdf', match: employees[77].code, reason: 'Periode pada berkas tidak sesuai batch', suggestion: null }
    ]
  };

  /* ---------------------------------------------------------- audit trail -- */
  var auditActions = [
    ['Masuk ke sistem', 'Berhasil'], ['Batch dibuat', 'Berhasil'],
    ['Berkas slip diunggah', 'Berhasil'], ['Validasi dijalankan', 'Berhasil'],
    ['Distribusi disetujui', 'Berhasil'], ['Distribusi dimulai', 'Berhasil'],
    ['Distribusi selesai', 'Berhasil'], ['Kirim ulang dijalankan', 'Berhasil'],
    ['Pengiriman gagal', 'Gagal'], ['Password slip dibuka', 'Berhasil'],
    ['Pengaturan diubah', 'Berhasil'], ['Laporan diunduh', 'Berhasil'],
    ['Cadangan data dibuat', 'Berhasil'], ['Daftar pengecualian diperbarui', 'Berhasil']
  ];

  var audit = [
    { ts: '2026-09-22 08:01', actor: 'Rahayu Pertiwi', role: 'HR Admin', action: 'Batch dibuat', object: 'PAY-SEP-2026', result: 'Berhasil', desc: 'Batch slip gaji September 2026 dibuat untuk 252 karyawan' },
    { ts: '2026-09-22 08:03', actor: 'Rahayu Pertiwi', role: 'HR Admin', action: 'Berkas slip diunggah', object: 'PAY-SEP-2026', result: 'Berhasil', desc: '250 berkas diterima, 250 berhasil dicocokkan ke ID karyawan' },
    { ts: '2026-09-22 08:05', actor: 'Sistem', role: 'Sistem', action: 'Validasi dijalankan', object: 'PAY-SEP-2026', result: 'Berhasil', desc: '252 data diperiksa · 247 siap · 5 masuk daftar pengecualian · 0 kesalahan penghambat' },
    { ts: '2026-09-22 08:09', actor: 'Rahayu Pertiwi', role: 'HR Admin', action: 'Pemeriksaan acak', object: 'PAY-SEP-2026', result: 'Berhasil', desc: '5 slip dibuka acak dan dicocokkan manual dengan data karyawan' },
    { ts: '2026-09-22 08:11', actor: 'Dimas Anggoro', role: 'HR Admin', action: 'Distribusi disetujui', object: 'PAY-SEP-2026', result: 'Berhasil', desc: 'Persetujuan diberikan oleh pemeriksa kedua, bukan penyiap batch' },
    { ts: '2026-09-22 08:12', actor: 'Sistem', role: 'Sistem', action: 'Distribusi dimulai', object: 'PAY-SEP-2026', result: 'Berhasil', desc: '247 email masuk antrian, laju kirim 25 per menit' },
    { ts: '2026-09-22 08:36', actor: 'Sistem', role: 'Sistem', action: 'Distribusi selesai', object: 'PAY-SEP-2026', result: 'Berhasil', desc: '234 terkirim · 2 menunggu · 11 gagal pada percobaan pertama' },
    { ts: '2026-09-22 09:04', actor: 'Sistem', role: 'Sistem', action: 'Pengiriman gagal', object: 'PAY-SEP-2026', result: 'Gagal', desc: '11 pesan ditolak server penerima, dicatat dari laporan pantulan' },
    { ts: '2026-09-22 09:20', actor: 'Rahayu Pertiwi', role: 'HR Admin', action: 'Kirim ulang dijalankan', object: 'PAY-SEP-2026', result: 'Berhasil', desc: '6 dari 11 pengiriman gagal berhasil dikirim ulang' },
    { ts: '2026-09-22 09:22', actor: 'Rahayu Pertiwi', role: 'HR Admin', action: 'Password slip dibuka', object: employees[33].code, result: 'Berhasil', desc: 'Karyawan melapor tidak bisa membuka slip, password dibacakan ulang' },
    { ts: '2026-09-22 14:10', actor: 'Rahayu Pertiwi', role: 'HR Admin', action: 'Daftar pengecualian diperbarui', object: 'PAY-SEP-2026', result: 'Berhasil', desc: '5 slip dicetak dan diserahkan langsung, serah terima tercatat' },
    { ts: '2026-09-22 17:00', actor: 'Sistem', role: 'Sistem', action: 'Cadangan data dibuat', object: 'Harian', result: 'Berhasil', desc: 'Basis data dan arsip berkas tersalin, ukuran 1,4 GB' },
    { ts: '2026-09-23 07:45', actor: 'Sinta Maharani', role: 'HR Admin', action: 'Batch dibuat', object: 'OT-SEP-2026', result: 'Berhasil', desc: 'Batch slip lembur September 2026 dibuat dari lembar kerja lembur' },
    { ts: '2026-09-23 07:52', actor: 'Sistem', role: 'Sistem', action: 'Validasi dijalankan', object: 'OT-SEP-2026', result: 'Gagal', desc: '252 data diperiksa · 246 siap · 4 kesalahan penghambat · 2 peringatan' },
    { ts: '2026-09-23 08:15', actor: 'Ahmad Fauzan', role: 'Super Admin', action: 'Pengaturan diubah', object: 'Ambang lembur', result: 'Berhasil', desc: 'Ambang peringatan jam lembur diubah dari 90 menjadi 80 jam per periode' }
  ];

  /* Isi audit ke belakang supaya halaman terasa berisi */
  (function backfill() {
    var actors = [
      ['Rahayu Pertiwi', 'HR Admin'], ['Sinta Maharani', 'HR Admin'],
      ['Dimas Anggoro', 'HR Admin'], ['Ahmad Fauzan', 'Super Admin'], ['Sistem', 'Sistem']
    ];
    var objs = ['PAY-AGU-2026', 'OT-AGU-2026', 'PAY-JUL-2026', 'Harian', 'Pengaturan email'];
    for (var d = 21; d >= 1; d--) {
      var reps = between(1, 3);
      for (var r = 0; r < reps; r++) {
        var a = pick(actors);
        var act = pick(auditActions);
        audit.push({
          ts: '2026-09-' + pad(d, 2) + ' ' + pad(between(7, 18), 2) + ':' + pad(between(0, 59), 2),
          actor: a[0], role: a[1], action: act[0], object: pick(objs), result: act[1],
          desc: 'Dicatat otomatis oleh sistem sebagai bagian dari jejak audit'
        });
      }
    }
    audit.sort(function (x, y) { return x.ts < y.ts ? 1 : -1; });
  })();

  /* ---------------------------------------------------- kesehatan sistem -- */
  var health = {
    availability: 99.94,
    lastCycle: '22 September 2026',
    emailsProcessed: 247,
    failedTransactions: 5,
    resolvedIssues: 6,
    openTickets: 1,
    lastBackup: '22 Sep 2026, 17:00',
    backupSize: '1,4 GB',
    restoreTested: '14 Sep 2026',
    lastMaintenance: '12 Sep 2026',
    nextMaintenance: '12 Okt 2026',
    diskUsed: 38,
    queueDepth: 0,
    tickets: [
      { id: 'SUP-0042', date: '22 Sep 2026', title: 'Karyawan tidak bisa membuka slip di ponsel', status: 'Selesai', sla: '2 jam', note: 'Aplikasi pembaca PDF bawaan tidak mendukung enkripsi. Dipandu memakai pembaca lain.' },
      { id: 'SUP-0041', date: '22 Sep 2026', title: 'Lima pengiriman gagal, kotak masuk penuh', status: 'Selesai', sla: '1 jam', note: 'Dikirim ulang setelah penerima mengosongkan kotak masuk.' },
      { id: 'SUP-0040', date: '18 Sep 2026', title: 'Permintaan tambah kolom divisi di laporan', status: 'Terjadwal', sla: 'Perubahan kecil', note: 'Masuk kuota perubahan kecil bulan ini, dikerjakan sebelum siklus Oktober.' },
      { id: 'SUP-0039', date: '11 Sep 2026', title: 'Sinkronisasi lembar lembur berhenti', status: 'Selesai', sla: '3 jam', note: 'Token akses kedaluwarsa, diperbarui dan ditambahkan pemantauan.' }
    ],
    monthly: {
      period: 'September 2026',
      cycles: 1,
      docsDelivered: 240,
      issuesFound: 11,
      issuesResolved: 6,
      retries: 11,
      changes: ['Ambang peringatan jam lembur diturunkan ke 80 jam', 'Templat email diperbarui dengan nomor kontak HR'],
      recommendations: [
        'Lima karyawan masih belum punya alamat email. Pembuatan akun akan menaikkan tingkat keberhasilan ke 100 persen.',
        'Tiga karyawan memakai email pribadi. Slip gaji yang terkirim ke sana tidak bisa ditarik kembali jika mereka keluar.',
        'Dua kegagalan bulan ini disebabkan kotak masuk penuh. Kuota mailbox site sebaiknya ditinjau oleh IT.'
      ]
    }
  };

  /* ---------------------------------------------------------- pengaturan -- */
  var settings = {
    sender: 'payroll@' + DOMAIN,
    senderName: 'Payroll PT Berkat Tanjung Buli',
    provider: 'Google Workspace (Gmail API)',
    connection: 'Terhubung',
    throttle: 25,
    scheduleDay: 25,
    scheduleTime: '09:00',
    retryMax: 3,
    retryDelay: 15,
    passwordLength: 10,
    passwordRotation: 'Tahunan atau atas permintaan',
    retentionDocs: 3,
    retentionAudit: 24,
    otCap: OT_CAP,
    autoDistribute: false,
    requireApproval: true,
    makerChecker: true,
    notifyOnFailure: true,
    sheetUrl: 'Lembar Lembur Site — 5 tab divisi'
  };

  var users = [
    { name: 'Ahmad Fauzan', email: 'ahmad.fauzan@' + DOMAIN, role: 'Super Admin', lastSeen: '23 Sep 2026, 08:15', note: 'Konsultan sistem · konfigurasi dan pemantauan' },
    { name: 'Rahayu Pertiwi', email: 'rahayu.pertiwi@' + DOMAIN, role: 'HR Admin', lastSeen: '23 Sep 2026, 07:40', note: 'Penyiap batch slip gaji' },
    { name: 'Sinta Maharani', email: 'sinta.maharani@' + DOMAIN, role: 'HR Admin', lastSeen: '23 Sep 2026, 07:45', note: 'Penyiap batch lembur' },
    { name: 'Dimas Anggoro', email: 'dimas.anggoro@' + DOMAIN, role: 'HR Admin', lastSeen: '22 Sep 2026, 08:11', note: 'Pemberi persetujuan distribusi' }
  ];

  /* ------------------------------------------------------------- ringkasan */
  function summarise(rows) {
    var s = { total: rows.length, sent: 0, retrySuccess: 0, pending: 0, failed: 0, exception: 0, queued: 0 };
    rows.forEach(function (r) {
      if (r.status === 'SENT') s.sent++;
      else if (r.status === 'RETRY_SUCCESS') s.retrySuccess++;
      else if (r.status === 'PENDING') s.pending++;
      else if (r.status === 'FAILED') s.failed++;
      else if (r.status === 'EXCEPTION') s.exception++;
      else s.queued++;
    });
    s.processed = s.total - s.exception;
    s.delivered = s.sent + s.retrySuccess;
    s.rate = s.processed ? (s.delivered / s.processed) * 100 : 0;
    return s;
  }

  function byDivision(rows) {
    var map = {};
    DIVISIONS.forEach(function (d) {
      map[d.key] = { key: d.key, name: d.name, total: 0, delivered: 0, failed: 0, pending: 0, exception: 0 };
    });
    rows.forEach(function (r) {
      var e = byCode[r.code];
      if (!e) return;
      var m = map[e.division];
      m.total++;
      if (r.status === 'SENT' || r.status === 'RETRY_SUCCESS') m.delivered++;
      else if (r.status === 'FAILED') m.failed++;
      else if (r.status === 'PENDING') m.pending++;
      else if (r.status === 'EXCEPTION') m.exception++;
    });
    return DIVISIONS.map(function (d) { return map[d.key]; });
  }

  /* ------------------------------------------------ entri payroll --- */
  /* Kolom mengikuti persis tabel yang dipakai HR di berkas Excel, dengan
     urutan tampilan mengikuti tata letak slip. Sengaja tidak disederhanakan
     supaya HR tidak perlu mengubah kebiasaan input. */
  var entryColumns = [
    { key: 'pokok', label: 'Gaji Pokok', group: 'in', w: 118 },
    { key: 'lembur', label: 'Lembur', group: 'in', w: 110 },
    { key: 'tunjKehadiran', label: 'Tunj. Kehadiran', group: 'in', w: 118 },
    { key: 'tunjSkill', label: 'Tunj. Skill', group: 'in', w: 106 },
    { key: 'rapelAbsen', label: 'Rapel Absen', group: 'in', w: 106 },
    { key: 'rapelLembur', label: 'Rapel Lembur', group: 'in', w: 110 },
    { key: 'rapelTunj', label: 'Rapel Tunj. Kehadiran', group: 'in', w: 128 },
    { key: 'kompensasi', label: 'Kompensasi', group: 'in', w: 106 },
    { key: 'jht', label: 'JHT', group: 'out', w: 100 },
    { key: 'bpjsKes', label: 'BPJS Kesehatan', group: 'out', w: 116 },
    { key: 'absen', label: 'Absen + IP', group: 'out', w: 100 },
    { key: 'pph', label: 'PPH 21', group: 'out', w: 100 }
  ];

  function blankValues() {
    var v = {};
    entryColumns.forEach(function (c) { v[c.key] = 0; });
    return v;
  }

  function entryTotals(row) {
    var bruto = 0, potongan = 0;
    entryColumns.forEach(function (c) {
      var n = Number(row.values[c.key]) || 0;
      if (c.group === 'in') bruto += n; else potongan += n;
    });
    return { bruto: bruto, potongan: potongan, thp: bruto - potongan };
  }

  /* Satu lembar entri per periode. Periode lama sudah terkunci; periode
     berjalan masih bisa diubah HR. */
  var entrySheets = {};

  function buildSheet(periodCode, factor, locked) {
    var rows = employees.map(function (e, i) {
      var pay = payByCode[e.code];
      var c = pay.calc;
      var v = blankValues();
      v.pokok = Math.round(c.pokok * factor / 1000) * 1000;
      v.lembur = Math.round(c.lembur * factor / 100) * 100;
      v.tunjKehadiran = c.tunjKehadiran;
      v.tunjSkill = c.tunjSkill;
      v.jht = c.jht;
      v.bpjsKes = c.kes;
      v.pph = c.pph;
      /* Sebagian kecil punya rapel atau potongan absen — kondisi nyata */
      if (i % 31 === 4) v.rapelLembur = Math.round(c.lembur * .18 / 100) * 100;
      if (i % 43 === 7) v.rapelAbsen = 120000;
      if (i % 37 === 11) v.absen = Math.round(c.pokok * .04 / 100) * 100;
      if (i % 59 === 19) v.kompensasi = 500000;
      return { code: e.code, name: e.name, position: e.position, values: v };
    });
    entrySheets[periodCode] = {
      period: periodCode,
      locked: !!locked,
      lockedBy: locked ? 'Rahayu Pertiwi' : null,
      lockedAt: locked ? '2026-09-22 07:58' : null,
      generated: !!locked,
      generatedAt: locked ? '2026-09-22 08:03' : null,
      sampleChecked: !!locked,
      handedOff: !!locked,
      rows: rows
    };
  }

  buildSheet('JUL-2026', .94, true);
  buildSheet('AGU-2026', .97, true);
  buildSheet('SEP-2026', 1, true);
  buildSheet('OKT-2026', 1.03, false);

  /* Empat baris di periode berjalan sengaja dibuat bermasalah supaya
     pemeriksaan sebelum generate ada isinya saat demo. */
  function DB_entryBruto(row) { return entryTotals(row).bruto; }

  (function seedIssues() {
    var sh = entrySheets['OKT-2026'];
    sh.rows[12].values.pokok = 0;
    sh.rows[64].values.absen = DB_entryBruto(sh.rows[64]) + 850000;
    sh.rows[138].values.jht = 0;
    sh.rows[201].values.lembur = 48000000;
  })();

  function sheetIssues(sheet) {
    var out = [];
    sheet.rows.forEach(function (row) {
      var t = entryTotals(row);
      var e = byCode[row.code];
      if (!row.values.pokok) {
        out.push({ code: row.code, name: row.name, severity: 'BLOCKING',
          message: 'Gaji pokok kosong — slip tidak bisa dicetak tanpa nilai ini' });
      }
      if (t.thp < 0) {
        out.push({ code: row.code, name: row.name, severity: 'BLOCKING',
          message: 'Take home pay minus ' + Math.abs(t.thp).toLocaleString('id-ID') + ' — potongan melebihi penghasilan' });
      }
      if (row.values.pokok && !row.values.jht) {
        out.push({ code: row.code, name: row.name, severity: 'WARNING',
          message: 'Potongan JHT kosong padahal ada gaji pokok' });
      }
      if (row.values.lembur > row.values.pokok * 4 && row.values.pokok) {
        out.push({ code: row.code, name: row.name, severity: 'WARNING',
          message: 'Lembur ' + Math.round(row.values.lembur / row.values.pokok) +
            '× gaji pokok — periksa apakah ada salah ketik' });
      }
      if (e && !e.email) {
        out.push({ code: row.code, name: row.name, severity: 'INFO',
          message: 'Tidak punya email — slip dicetak dan diserahkan langsung' });
      }
    });
    return out;
  }

  function sheetTotals(sheet) {
    var t = { bruto: 0, potongan: 0, thp: 0, rows: sheet.rows.length };
    sheet.rows.forEach(function (r) {
      var x = entryTotals(r);
      t.bruto += x.bruto; t.potongan += x.potongan; t.thp += x.thp;
    });
    return t;
  }

  /* ------------------------------------------- pengelolaan periode --- */
  var MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

  /* Siklus payroll berjalan tanggal 21 sampai 20, jadi periode "November"
     mencakup 21 Oktober sampai 20 November. */
  function periodMeta(year, monthIdx) {
    var prev = monthIdx === 0 ? 11 : monthIdx - 1;
    var prevYear = monthIdx === 0 ? year - 1 : year;
    return {
      code: MON3[monthIdx] + '-' + year,
      label: MONTHS[monthIdx] + ' ' + year,
      range: '21 ' + MONTHS[prev].slice(0, 3) + ' ' + (prevYear !== year ? prevYear + ' ' : '') +
        '– 20 ' + MONTHS[monthIdx].slice(0, 3) + ' ' + year,
      year: year, monthIdx: monthIdx
    };
  }

  /* Periode berikutnya sesudah yang terakhir ada di daftar */
  function nextPeriod() {
    var last = periods[periods.length - 1];
    var i = MON3.indexOf(last.code.split('-')[0]);
    var y = Number(last.code.split('-')[1]);
    return i === 11 ? periodMeta(y + 1, 0) : periodMeta(y, i + 1);
  }

  /* Variabel yang berubah tiap bulan dikosongkan; komponen tetap dibawa.
     Inilah perilaku yang diharapkan HR saat membuka bulan baru. */
  var VARIABLE_KEYS = ['lembur', 'rapelAbsen', 'rapelLembur', 'rapelTunj', 'kompensasi', 'absen'];

  function createPeriod(meta, sourceCode, mode) {
    var src = sourceCode ? entrySheets[sourceCode] : null;
    var srcByCode = {};
    if (src) src.rows.forEach(function (r) { srcByCode[r.code] = r; });

    var rows = employees.filter(function (e) { return e.status === 'active'; }).map(function (e) {
      var v = blankValues();
      var prev = srcByCode[e.code];

      if (mode === 'full' && prev) {
        entryColumns.forEach(function (c) { v[c.key] = prev.values[c.key]; });
      } else if (mode === 'fixed' && prev) {
        entryColumns.forEach(function (c) {
          v[c.key] = VARIABLE_KEYS.indexOf(c.key) > -1 ? 0 : prev.values[c.key];
        });
      } else if (mode === 'fixed' && !prev) {
        /* Karyawan baru yang belum pernah ada di periode sebelumnya */
        v.pokok = e.pay.pokok;
        v.tunjKehadiran = e.pay.tunjKehadiran;
        v.tunjSkill = e.pay.tunjSkill;
      }

      return {
        code: e.code, name: e.name, position: e.position,
        values: v,
        isNew: !prev,
        note: !prev ? 'Karyawan baru — belum ada di periode sebelumnya' : ''
      };
    });

    periods.push({ code: meta.code, label: meta.label, range: meta.range });
    entrySheets[meta.code] = {
      period: meta.code,
      locked: false, lockedBy: null, lockedAt: null,
      generated: false, generatedAt: null,
      sampleChecked: false, handedOff: false,
      createdFrom: sourceCode || null,
      createdMode: mode,
      rows: rows
    };
    periodTotals[meta.code] = {
      bruto: 0, netto: 0, pph: 0, bpjsEmployee: 0, bpjsEmployer: 0,
      lembur: 0, delivered: 0, count: rows.length
    };
    return entrySheets[meta.code];
  }

  /* Total periode disegarkan dari lembar entri supaya angka di ruang
     kendali selalu mengikuti apa yang sedang diisi HR. */
  function refreshPeriodTotals(code) {
    var sh = entrySheets[code];
    if (!sh) return;
    var t = { bruto: 0, netto: 0, pph: 0, bpjsEmployee: 0, bpjsEmployer: 0, lembur: 0 };
    sh.rows.forEach(function (r) {
      var x = entryTotals(r);
      t.bruto += x.bruto;
      t.netto += x.thp;
      t.pph += Number(r.values.pph) || 0;
      t.bpjsEmployee += (Number(r.values.jht) || 0) + (Number(r.values.bpjsKes) || 0);
      t.lembur += Number(r.values.lembur) || 0;
    });
    var prev = periodTotals[code] || {};
    periodTotals[code] = {
      bruto: t.bruto, netto: t.netto, pph: t.pph,
      bpjsEmployee: t.bpjsEmployee,
      bpjsEmployer: prev.bpjsEmployer || Math.round(t.bpjsEmployee * 2.8),
      lembur: t.lembur,
      delivered: prev.delivered || 0,
      count: sh.rows.length
    };
  }

  /* -------------------------------------------------------- demografi -- */
  function demographics(list) {
    list = list || employees;
    var g = { L: 0, P: 0 };
    var bands = [
      { label: '19–24', min: 19, max: 24, n: 0 },
      { label: '25–30', min: 25, max: 30, n: 0 },
      { label: '31–36', min: 31, max: 36, n: 0 },
      { label: '37–45', min: 37, max: 45, n: 0 },
      { label: '46+', min: 46, max: 200, n: 0 }
    ];
    var sum = 0;
    list.forEach(function (e) {
      g[e.gender]++;
      sum += e.age;
      for (var i = 0; i < bands.length; i++) {
        if (e.age >= bands[i].min && e.age <= bands[i].max) { bands[i].n++; break; }
      }
    });
    return {
      total: list.length,
      male: g.L, female: g.P,
      malePct: list.length ? g.L / list.length * 100 : 0,
      femalePct: list.length ? g.P / list.length * 100 : 0,
      avgAge: list.length ? sum / list.length : 0,
      bands: bands
    };
  }

  function addEmployee(rec) {
    var n = employees.length + 1;
    var div = DIVISIONS.filter(function (d) { return d.key === rec.division; })[0] || DIVISIONS[0];
    var e = {
      code: 'BTB-' + pad(n),
      name: rec.name,
      division: div.key,
      divisionName: div.name,
      position: rec.position,
      email: rec.email || null,
      emailType: rec.email ? (/@btb-mining/.test(rec.email) ? 'corporate' : 'personal') : 'none',
      gender: rec.gender,
      age: rec.age,
      birth: rec.birth,
      ptkp: rec.ptkp,
      joined: rec.joined,
      status: 'active',
      pay: { pokok: rec.pokok, tunjKehadiran: rec.tunjKehadiran, tunjSkill: rec.tunjSkill }
    };
    if (!e.email) e.exceptionReason = 'Akun email belum dibuat';
    employees.push(e);
    byCode[e.code] = e;
    var calc = calcPayroll(e, 0);
    var p = { code: e.code, calc: calc, excelNetto: calc.netto, gapPct: 0, flagged: false };
    payroll.push(p);
    payByCode[e.code] = p;
    return e;
  }

  return {
    company: 'PT Berkat Tanjung Buli',
    site: 'Site Wayafli, Halmahera Timur',
    domain: DOMAIN,
    divisions: DIVISIONS,
    rolesByDiv: ROLES_BY_DIV,
    employees: employees,
    byCode: byCode,
    periods: periods,
    batches: batches,
    deliveries: deliveries,
    history: history,
    overtime: overtime,
    otByCode: otByCode,
    otDetail: otDetail,
    otCap: OT_CAP,
    failures: FAILURES,
    failByCode: failByCode,
    validationRules: validationRules,
    validationIssues: validationIssues,
    matching: matching,
    audit: audit,
    health: health,
    settings: settings,
    users: users,
    summarise: summarise,
    byDivision: byDivision,

    rates: rates,
    terTable: terTable,
    terCategory: terCategory,
    calcPayroll: calcPayroll,
    payroll: payroll,
    payByCode: payByCode,
    payrollTotals: payrollTotals,
    periodTotals: periodTotals,
    demographics: demographics,
    addEmployee: addEmployee,

    entryColumns: entryColumns,
    blankValues: blankValues,
    variableKeys: VARIABLE_KEYS,
    periodMeta: periodMeta,
    nextPeriod: nextPeriod,
    createPeriod: createPeriod,
    refreshPeriodTotals: refreshPeriodTotals,
    entrySheets: entrySheets,
    entryTotals: entryTotals,
    sheetIssues: sheetIssues,
    sheetTotals: sheetTotals,

    signer: { name: 'Evanora Radja', title: 'Finance PT. BTB', place: 'Wayafli' }
  };
})();
