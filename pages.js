/* ==========================================================================
   HALAMAN
   Setiap halaman mengembalikan HTML lalu memasang event-nya sendiri.
   ========================================================================== */

var PAGES = (function () {
  'use strict';

  var esc = UI.esc, icon = UI.icon, num = UI.num, q = UI.q, qa = UI.qa;

  function batchById(id) {
    return DB.batches.filter(function (b) { return b.id === id; })[0];
  }
  function currentBatch() { return batchById('PAY-SEP-2026'); }
  function pendingBatch() { return batchById('OT-SEP-2026'); }

  function can(action) { return App.permits(action); }

  /* Satu baris tarif yang bisa diubah HR */
  function rateField(label, value, unit, readOnly, note) {
    var isMoney = unit === 'Rp';
    return '<div class="rate-item"><label>' + esc(label) + '</label>' +
      '<div class="rate-input">' +
      (isMoney ? '<span class="rate-unit">Rp</span>' : '') +
      '<input type="number" value="' + value + '" step="' + (isMoney ? 100000 : 0.01) + '"' +
      (readOnly ? ' disabled' : '') + '>' +
      (isMoney ? '' : '<span class="rate-unit">' + esc(unit) + '</span>') +
      '</div>' +
      (note ? '<em>' + esc(note) + '</em>' : '') + '</div>';
  }

  function lockedBtn(label, ico) {
    return '<button class="btn btn-sm" disabled title="Peran Anda tidak punya akses ke tindakan ini">' +
      (ico ? icon(ico, 13) : '') + esc(label) + '</button>';
  }

  /* Periode yang sedang dilihat di ruang kendali. Disimpan di luar fungsi
     supaya pilihan filter bertahan saat halaman digambar ulang. */
  var dashPeriod = 'SEP-2026';

  /* Untuk periode selain September, status per karyawan tidak disimpan
     satu per satu di data contoh. Baris disusun ulang dari angka ringkasan
     batch supaya papan tetap bisa ditampilkan untuk bulan mana pun. */
  function rowsForPeriod(code) {
    if (code === 'SEP-2026') return DB.deliveries;
    var b = DB.batches.filter(function (x) { return x.period === code && x.docType === 'PAYSLIP'; })[0];
    if (!b) return [];
    var noMail = {};
    DB.employees.forEach(function (e) { if (!e.email) noMail[e.code] = true; });
    var failLeft = b.failed, pendLeft = b.pending, i = 0;
    return DB.employees.map(function (e) {
      i++;
      if (noMail[e.code]) return { code: e.code, status: 'EXCEPTION' };
      if (b.status !== 'COMPLETED') return { code: e.code, status: 'QUEUED' };
      if (failLeft > 0 && i % 37 === 11) { failLeft--; return { code: e.code, status: 'FAILED' }; }
      if (pendLeft > 0 && i % 53 === 29) { pendLeft--; return { code: e.code, status: 'PENDING' }; }
      return { code: e.code, status: 'SENT' };
    });
  }

  /* =======================================================================
     1 · RUANG KENDALI
     ======================================================================= */
  function dashboard() {
    var period = DB.periods.filter(function (p) { return p.code === dashPeriod; })[0] || DB.periods[2];
    var b = DB.batches.filter(function (x) { return x.period === dashPeriod && x.docType === 'PAYSLIP'; })[0];
    var rows = rowsForPeriod(dashPeriod);
    var s = DB.summarise(rows);
    var divs = DB.byDivision(rows);
    var money = DB.periodTotals[dashPeriod];
    var notRun = b && b.status !== 'COMPLETED';

    var failedRows = rows.filter(function (r) { return r.status === 'FAILED'; });

    var html = '';

    /* Pemilih periode */
    html += '<div class="period-bar">' +
      '<div class="period-pick"><label for="periodSel">Periode payroll</label>' +
      '<select id="periodSel">' +
      DB.periods.map(function (p) {
        return '<option value="' + p.code + '"' + (p.code === dashPeriod ? ' selected' : '') + '>' +
          esc(p.label) + ' · ' + esc(p.range) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="period-meta">' +
      (notRun
        ? '<span class="badge b-info"><i class="dot"></i>BELUM DIJALANKAN</span>'
        : '<span class="badge b-sent"><i class="dot"></i>SIKLUS SELESAI</span>') +
      (b ? '<span class="chip">' + esc(b.id) + '</span>' : '') +
      '</div></div>';

    /* Nilai payroll */
    html += '<div class="grid g-4" style="margin-bottom:16px">' +
      UI.kpi('Nilai payroll periode ini', UI.rupiahShort(money.bruto),
        'Bruto ' + UI.rupiah(money.bruto), 'main') +
      UI.kpi('Dibayarkan ke karyawan', UI.rupiahShort(money.netto),
        'Setelah potongan', 'good') +
      UI.kpi('PPh 21 dipotong', UI.rupiahShort(money.pph),
        'Disetor perusahaan', '') +
      UI.kpi('BPJS dipotong karyawan', UI.rupiahShort(money.bpjsEmployee),
        'Perusahaan menanggung <b>' + UI.rupiahShort(money.bpjsEmployer) + '</b>', '') +
      '</div>';

    if (!can('salaryDetail')) {
      html += '<div style="margin-bottom:16px">' + UI.notice('n-info',
        'Anda melihat angka gabungan saja',
        'Peran Viewer hanya menampilkan total tingkat perusahaan. Rincian gaji per karyawan tidak dapat dibuka dari peran ini.') + '</div>';
    }

    /* Distribusi */
    html += '<div class="grid g-4" style="margin-bottom:16px">' +
      UI.kpi('Karyawan aktif', num(DB.employees.length), 'Di 8 divisi site', '') +
      UI.kpi('Slip diproses', num(s.processed), '<b>' + s.exception + '</b> masuk pengecualian', '') +
      UI.kpi('Berhasil terkirim', num(s.delivered),
        s.retrySuccess ? '<b>' + s.retrySuccess + '</b> setelah kirim ulang' : 'Tanpa kirim ulang', 'good') +
      UI.kpi('Perlu ditangani', num(s.failed + s.pending),
        '<b>' + s.failed + '</b> gagal · <b>' + s.pending + '</b> menunggu',
        (s.failed ? 'bad' : (s.pending ? 'warn' : 'good'))) +
      '</div>';

    /* Papan sel */
    html += '<div class="card" style="margin-bottom:16px">' +
      '<div class="card-head">' +
      '<div><h3>Papan distribusi · ' + esc(period.label) + '</h3>' +
      '<p>Satu kotak mewakili satu karyawan. Arahkan kursor untuk melihat nama dan statusnya.</p></div>' +
      '<div class="spacer"></div>' +
      '<div style="text-align:right"><div style="font-size:24px;font-weight:600;letter-spacing:-.028em;line-height:1.1">' +
      (notRun ? '—' : UI.pct(s.rate) + '%') + '</div>' +
      '<div style="font-size:11.5px;color:var(--muted)">tingkat keberhasilan</div></div>' +
      '</div>' +
      (notRun
        ? '<div class="empty" style="padding:38px 24px">' + icon('clock', 30) +
          '<b>Batch ' + esc(period.label) + ' belum dijalankan</b>' +
          '<p>Payroll tanggal 20 sudah selesai dihitung dan batch sudah lolos validasi. ' +
          'Distribusi menunggu persetujuan.</p>' +
          '<div style="margin-top:14px"><a class="btn btn-sm btn-primary" href="#/batches">Buka batch distribusi</a></div></div>'
        : UI.board(rows)) +
      '</div>';

    html += '<div class="grid g-3-1" style="margin-bottom:16px">';

    html += '<div class="stack">';
    html += '<div class="card"><div class="card-head"><div><h3>Sebaran per divisi</h3>' +
      '<p>Divisi lapangan paling sering bermasalah karena akun email baru dibuat menyusul.</p></div></div>' +
      '<div class="card-body"><div class="divbar">' +
      divs.map(function (d) {
        var ds = { total: d.total, sent: d.delivered, retrySuccess: 0, pending: d.pending, failed: d.failed };
        return '<div class="divbar-row"><span title="' + esc(d.name) + '">' + esc(d.name) + '</span>' +
          UI.segbar(ds) + '<span>' + d.delivered + '/' + d.total + '</span></div>';
      }).join('') + '</div></div></div>';

    html += '<div class="card"><div class="card-head"><div><h3>Aktivitas terakhir</h3></div>' +
      '<div class="spacer"></div><a class="btn btn-sm" href="#/audit">Buka jejak audit</a></div>' +
      '<div class="activity">' +
      DB.audit.slice(0, 7).map(function (a) {
        return '<div class="act-row"><div class="act-time">' + esc(a.ts.split(' ')[1]) + '</div>' +
          '<div class="act-body"><b>' + esc(a.action) + '</b> · ' + esc(a.object) +
          '<span>' + esc(a.actor) + ' — ' + esc(a.desc) + '</span></div></div>';
      }).join('') + '</div></div>';
    html += '</div>';

    html += '<div class="stack">';

    html += '<div class="card"><div class="card-head"><h3>Siklus payroll</h3></div><div class="card-body">' +
      '<div class="defs" style="grid-template-columns:1fr">' +
      '<div class="def"><span>Periode</span><b>' + esc(period.range) + '</b></div>' +
      '<div class="def"><span>Distribusi</span><b>' +
      (b && b.date ? UI.dateID(b.date) + ', ' + esc(b.start) : 'Belum dijalankan') + '</b></div>' +
      '<div class="def"><span>Lama proses</span><b>' + (b && b.durationMin ? b.durationMin + ' menit' : '—') + '</b></div>' +
      '<div class="def"><span>Jadwal rutin</span><b>Tanggal ' + DB.settings.scheduleDay + ' pukul ' + esc(DB.settings.scheduleTime) + ' WIT</b></div>' +
      '</div><div style="margin-top:16px">' +
      UI.notice('n-info', 'Distribusi otomatis dimatikan',
        'Penjadwal hanya menyiapkan dan memvalidasi batch. Pengiriman tetap menunggu persetujuan manusia.') +
      '</div></div></div>';

    if (failedRows.length) {
      html += '<div class="card"><div class="card-head"><div><h3>Perlu tindakan</h3>' +
        '<p>' + failedRows.length + ' pengiriman belum berhasil</p></div></div>' +
        '<div class="activity">' +
        failedRows.slice(0, 5).map(function (r) {
          var e = DB.byCode[r.code];
          var f = DB.failByCode[r.errorCode] || { label: 'Ditolak server penerima' };
          return '<div class="act-row" style="grid-template-columns:1fr auto;align-items:center">' +
            '<div class="act-body"><b>' + esc(e.name) + '</b><span>' + esc(f.label) + '</span></div>' +
            UI.badge('FAILED') + '</div>';
        }).join('') +
        '</div><div class="card-body" style="border-top:1px solid var(--line)">' +
        '<a class="btn btn-sm btn-primary" href="#/failed">Buka pusat kirim ulang</a></div></div>';
    }

    html += '<div class="card"><div class="card-head"><h3>Kendali keamanan aktif</h3></div>' +
      '<div class="checklist">' +
      [['Masuk lewat akun Google perusahaan', 'Akses dicabut otomatis saat karyawan keluar'],
       ['Slip terkunci password per karyawan', 'Password tidak pernah ditampilkan di layar mana pun'],
       ['Persetujuan dua orang', 'Penyiap batch tidak boleh menyetujui batchnya sendiri'],
       ['Jejak audit tidak bisa dihapus', 'Seluruh tindakan tercatat dengan pelaku dan waktunya'],
       ['Rincian gaji dibatasi peran', 'Peran Viewer hanya melihat angka gabungan']]
        .map(function (r) {
          return '<div class="check-row"><span class="tick tick-ok">' + icon('check', 11) + '</span>' +
            '<div><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div><span></span></div>';
        }).join('') + '</div></div>';

    html += '</div></div>';

    return {
      html: html,
      mount: function () {
        wireBoard();
        var sel = q('#periodSel');
        if (sel) sel.addEventListener('change', function () {
          dashPeriod = this.value;
          App.rerender();
        });
      }
    };
  }

  function wireBoard() {
    qa('.board i').forEach(function (cell) {
      cell.addEventListener('click', function () {
        var e = DB.byCode[this.dataset.code];
        if (e) employeeDrawer(e.code);
      });
    });
  }

  /* =======================================================================
     2 · DIREKTORI KARYAWAN
     ======================================================================= */
  function demoPanel(list) {
    var d = DB.demographics(list);
    var maxBand = Math.max.apply(null, d.bands.map(function (b) { return b.n; })) || 1;

    return '<div class="grid g-1-1" style="margin-bottom:16px">' +

      '<div class="card"><div class="card-head"><div><h3>Jenis kelamin</h3>' +
      '<p>Dari ' + num(d.total) + ' karyawan aktif</p></div></div><div class="card-body">' +
      '<div class="split-bar">' +
      '<span class="sp-m" style="width:' + d.malePct + '%">' + UI.pct(d.malePct) + '%</span>' +
      '<span class="sp-f" style="width:' + d.femalePct + '%">' + (d.femalePct > 9 ? UI.pct(d.femalePct) + '%' : '') + '</span>' +
      '</div>' +
      '<div class="split-key">' +
      '<span><b class="k-m"></b>Laki-laki <strong>' + num(d.male) + '</strong></span>' +
      '<span><b class="k-f"></b>Perempuan <strong>' + num(d.female) + '</strong></span>' +
      '</div>' +
      '<div style="margin-top:16px">' + UI.notice('n-info', 'Terkonsentrasi di divisi kantor',
        'Karyawan perempuan sebagian besar berada di Finance, HR, dan General Affairs. ' +
        'Divisi lapangan hampir seluruhnya laki-laki — pola yang umum di site pertambangan.') + '</div>' +
      '</div></div>' +

      '<div class="card"><div class="card-head"><div><h3>Sebaran usia</h3>' +
      '<p>Rata-rata ' + UI.pct(d.avgAge) + ' tahun</p></div></div><div class="card-body">' +
      '<div class="age-bars">' +
      d.bands.map(function (b) {
        var w = b.n / maxBand * 100;
        var p = d.total ? b.n / d.total * 100 : 0;
        return '<div class="age-row"><span>' + esc(b.label) + '</span>' +
          '<div class="age-track"><div class="age-fill" style="width:' + w + '%"></div></div>' +
          '<span>' + b.n + ' <em>' + UI.pct(p, 0) + '%</em></span></div>';
      }).join('') +
      '</div>' +
      '<div style="margin-top:16px;font-size:12.5px;color:var(--muted)">' +
      'Usia dipakai untuk perencanaan tenaga kerja dan tidak memengaruhi perhitungan gaji. ' +
      'Yang memengaruhi potongan pajak adalah status PTKP, bukan usia.</div>' +
      '</div></div>' +

      '</div>';
  }

  function employees() {
    var byCodeDelivery = {};
    DB.deliveries.forEach(function (d) { byCodeDelivery[d.code] = d; });

    var t = UI.dataTable({
      rows: DB.employees,
      pageSize: 15,
      searchPlaceholder: 'Cari nama, ID, atau jabatan…',
      searchOn: function (e) { return e.code + ' ' + e.name + ' ' + e.position + ' ' + e.divisionName + ' ' + (e.email || ''); },
      filters: [
        { key: 'div', label: 'Semua divisi', options: DB.divisions.map(function (d) { return { value: d.key, label: d.name }; }) },
        { key: 'sex', label: 'Semua jenis kelamin', options: [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }] },
        { key: 'age', label: 'Semua usia', options: [
          { value: '19-24', label: '19–24 tahun' }, { value: '25-30', label: '25–30 tahun' },
          { value: '31-36', label: '31–36 tahun' }, { value: '37-45', label: '37–45 tahun' },
          { value: '46-99', label: '46 tahun ke atas' }
        ] }
      ],
      filterOn: function (e, k, v) {
        if (k === 'div') return e.division === v;
        if (k === 'sex') return e.gender === v;
        if (k === 'age') { var p = v.split('-'); return e.age >= +p[0] && e.age <= +p[1]; }
        return true;
      },
      defaultSort: 'code',
      actions: can('settings') || can('distribute')
        ? '<button class="btn btn-sm btn-primary" data-add>' + icon('people', 13) + 'Tambah karyawan</button>'
        : '',
      columns: [
        { key: 'code', label: 'ID', cls: 'col-code', value: function (e) { return e.code; }, render: function (e) { return esc(e.code); } },
        { key: 'name', label: 'Nama', cls: 'col-name', value: function (e) { return e.name; }, render: function (e) { return esc(e.name); } },
        { key: 'sex', label: 'L/P', value: function (e) { return e.gender; },
          render: function (e) { return '<span class="sex-tag s-' + e.gender + '">' + e.gender + '</span>'; } },
        { key: 'age', label: 'Usia', cls: 'col-num', value: function (e) { return e.age; }, render: function (e) { return e.age; } },
        { key: 'div', label: 'Divisi', value: function (e) { return e.divisionName; }, render: function (e) { return esc(e.divisionName); } },
        { key: 'pos', label: 'Jabatan', value: function (e) { return e.position; },
          render: function (e) { return '<span style="color:var(--muted)">' + esc(e.position) + '</span>'; } },
        { key: 'ptkp', label: 'PTKP', value: function (e) { return e.ptkp; },
          render: function (e) { return '<span class="chip">' + esc(e.ptkp) + '</span>'; } },
        { key: 'email', label: 'Email', cls: 'col-email', value: function (e) { return e.email || 'zzz'; },
          render: function (e) {
            if (!e.email) return '<span class="chip">belum ada</span>';
            return esc(e.email) + (e.emailType === 'personal' ? ' <span class="chip">pribadi</span>' : '');
          } },
        { key: 'last', label: 'Slip terakhir', value: function (e) { var d = byCodeDelivery[e.code]; return d ? d.status : 'ZZ'; },
          render: function (e) {
            var d = byCodeDelivery[e.code];
            return d ? UI.badge(d.status) : '<span class="chip">—</span>';
          } },
        { key: 'act', label: '', cls: 'col-actions', render: function (e) {
          return '<button class="btn btn-sm" data-open="' + e.code + '">Lihat</button>';
        } }
      ],
      onRowClick: function (e) { employeeDrawer(e.code); },
      onRender: function (root) {
        qa('[data-open]', root).forEach(function (b) {
          b.addEventListener('click', function () { employeeDrawer(this.dataset.open); });
        });
        var add = q('[data-add]', root);
        if (add) add.addEventListener('click', addEmployeeForm);
      }
    });

    var noMail = DB.employees.filter(function (e) { return !e.email; }).length;
    var personal = DB.employees.filter(function (e) { return e.emailType === 'personal'; }).length;
    var d = DB.demographics();

    var host = UI.el('<div></div>');
    host.innerHTML =
      '<p class="view-intro">Master karyawan yang dipakai sistem untuk mencocokkan slip dengan penerimanya. ' +
      'Komponen gaji tersimpan di sini tetapi hanya bisa dibuka oleh peran yang berhak — ' +
      'layar pemantauan distribusi tidak pernah menampilkannya.</p>' +
      '<div class="grid g-4" style="margin-bottom:16px">' +
      UI.kpi('Total karyawan', num(DB.employees.length), 'ID permanen BTB-0001 ke atas', 'main') +
      UI.kpi('Usia rata-rata', UI.pct(d.avgAge) + ' th', 'Terbanyak di rentang 31–36', '') +
      UI.kpi('Belum punya email', num(noMail), 'Ditangani lewat daftar pengecualian', noMail ? 'warn' : 'good') +
      UI.kpi('Pakai email pribadi', num(personal), 'Perlu dipantau lebih ketat', personal ? 'warn' : 'good') +
      '</div>' +
      demoPanel();
    host.appendChild(t.root);

    return { node: host };
  }

  /* --------------------------------------------- formulir karyawan --- */
  function addEmployeeForm() {
    var divOpts = DB.divisions.map(function (d) {
      return '<option value="' + d.key + '">' + esc(d.name) + '</option>';
    }).join('');

    var body =
      '<div class="form-grid">' +
      '<div class="field" style="grid-column:1/-1"><label>Nama lengkap</label>' +
      '<input type="text" id="fName" placeholder="Nama sesuai dokumen kepegawaian"></div>' +

      '<div class="field"><label>Divisi</label><select id="fDiv">' + divOpts + '</select></div>' +
      '<div class="field"><label>Jabatan</label><select id="fPos"></select></div>' +

      '<div class="field"><label>Jenis kelamin</label><select id="fSex">' +
      '<option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>' +
      '<div class="field"><label>Tanggal lahir</label><input type="date" id="fBirth" value="1996-01-15"></div>' +

      '<div class="field"><label>Status PTKP</label><select id="fPtkp">' +
      ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'].map(function (p) {
        return '<option' + (p === 'K/1' ? ' selected' : '') + '>' + p + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label>Tanggal bergabung</label><input type="date" id="fJoin" value="2026-10-01"></div>' +

      '<div class="field" style="grid-column:1/-1"><label>Alamat email perusahaan</label>' +
      '<input type="text" id="fMail" placeholder="nama.belakang@' + esc(DB.domain) + '"></div>' +
      '</div>' +

      '<h4 class="form-sep">Komponen gaji</h4>' +
      '<div class="form-grid">' +
      '<div class="field"><label>Gaji pokok per bulan</label><input type="number" id="fPokok" value="3550000" step="50000"></div>' +
      '<div class="field"><label>Tunjangan kehadiran</label><input type="number" id="fHadir" value="400000" step="50000"></div>' +
      '<div class="field"><label>Tunjangan skill</label><input type="number" id="fSkill" value="0" step="50000"></div>' +
      '<div class="field"><label>Perkiraan jam lembur per periode</label><input type="number" id="fJam" value="0" step="1"></div>' +
      '</div>' +

      '<h4 class="form-sep">Perhitungan otomatis</h4>' +
      '<div id="calcOut"></div>';

    var m = UI.modal({
      title: 'Tambah karyawan',
      sub: 'Perhitungan potongan diperbarui otomatis saat Anda mengetik',
      wide: true,
      body: body,
      confirm: 'Simpan karyawan',
      onConfirm: function (close) {
        var name = q('#fName', m.root).value.trim();
        if (!name) { UI.toast('Nama belum diisi', 'Isi nama lengkap karyawan terlebih dahulu.', 'bad'); return; }
        var birth = q('#fBirth', m.root).value;
        var e = DB.addEmployee({
          name: name,
          division: q('#fDiv', m.root).value,
          position: q('#fPos', m.root).value,
          gender: q('#fSex', m.root).value,
          birth: birth,
          age: 2026 - Number(birth.split('-')[0]),
          ptkp: q('#fPtkp', m.root).value,
          joined: q('#fJoin', m.root).value,
          email: q('#fMail', m.root).value.trim() || null,
          pokok: Number(q('#fPokok', m.root).value) || 0,
          tunjKehadiran: Number(q('#fHadir', m.root).value) || 0,
          tunjSkill: Number(q('#fSkill', m.root).value) || 0
        });
        DB.audit.unshift({
          ts: '2026-09-23 10:05', actor: App.user.name, role: App.user.role,
          action: 'Karyawan ditambahkan', object: e.code, result: 'Berhasil',
          desc: 'Data karyawan baru dibuat beserta komponen gaji dan status PTKP'
        });
        close();
        UI.toast('Karyawan ditambahkan', e.name + ' terdaftar dengan ID ' + e.code + '.', 'ok');
        App.rerender();
      }
    });

    function fillPositions() {
      var key = q('#fDiv', m.root).value;
      q('#fPos', m.root).innerHTML = (DB.rolesByDiv[key] || []).map(function (p) {
        return '<option>' + esc(p) + '</option>';
      }).join('');
    }

    function recalc() {
      var fake = {
        ptkp: q('#fPtkp', m.root).value,
        pay: {
          pokok: Number(q('#fPokok', m.root).value) || 0,
          tunjKehadiran: Number(q('#fHadir', m.root).value) || 0,
          tunjSkill: Number(q('#fSkill', m.root).value) || 0
        }
      };
      var jam = Number(q('#fJam', m.root).value) || 0;
      q('#calcOut', m.root).innerHTML = calcBreakdown(DB.calcPayroll(fake, jam));
    }

    fillPositions();
    recalc();
    q('#fDiv', m.root).addEventListener('change', fillPositions);
    ['fPokok', 'fHadir', 'fSkill', 'fJam', 'fPtkp'].forEach(function (id) {
      q('#' + id, m.root).addEventListener('input', recalc);
      q('#' + id, m.root).addEventListener('change', recalc);
    });
  }

  /* Rincian perhitungan — dipakai di formulir dan di panel karyawan */
  function calcBreakdown(c) {
    var r = DB.rates;
    function row(label, val, note, cls) {
      return '<div class="calc-row ' + (cls || '') + '"><span>' + esc(label) +
        (note ? ' <em>' + esc(note) + '</em>' : '') + '</span><b>' + UI.rupiah(val) + '</b></div>';
    }

    return '<div class="calc">' +
      '<div class="calc-col">' +
      '<div class="calc-head">Penghasilan</div>' +
      row('Gaji pokok', c.pokok) +
      row('Tunjangan kehadiran', c.tunjKehadiran) +
      row('Tunjangan skill', c.tunjSkill) +
      row('Lembur', c.lembur, c.lemburJam + ' jam × ' + UI.rupiah(c.hourly) + ' × ' + r.overtimeMultiplier) +
      row('Bruto', c.bruto, '', 'calc-total') +
      '</div>' +

      '<div class="calc-col">' +
      '<div class="calc-head">Potongan karyawan</div>' +
      row('JHT', c.jht, r.jhtEmployee + '%') +
      row('Jaminan Pensiun', c.jp, r.jpEmployee + '% · batas upah') +
      row('BPJS Kesehatan', c.kes, r.kesEmployee + '%') +
      row('PPh 21', c.pph, 'TER ' + c.terCategory + ' · ' + (c.terRate * 100).toFixed(2) + '%') +
      row('Total potongan', c.potongan, '', 'calc-total') +
      '</div>' +

      '<div class="calc-col calc-net">' +
      '<div class="calc-head">Diterima karyawan</div>' +
      '<div class="calc-big">' + UI.rupiah(c.netto) + '</div>' +
      '<div class="calc-note">Ditanggung perusahaan di luar gaji: <b>' + UI.rupiah(c.employer.total) + '</b><br>' +
      'JHT ' + r.jhtEmployer + '% · JP ' + r.jpEmployer + '% · JKK ' + r.jkk + '% · JKM ' + r.jkm + '% · Kesehatan ' + r.kesEmployer + '%</div>' +
      '<div class="calc-note" style="margin-top:8px">Total biaya perusahaan per karyawan: <b>' + UI.rupiah(c.cost) + '</b></div>' +
      '</div>' +
      '</div>' +

      '<div style="margin-top:14px">' +
      UI.notice('n-warn', 'Angka ini estimasi, bukan penetapan',
        'Perhitungan memakai tarif yang disetel di halaman pengaturan dan wajib diverifikasi HR ' +
        'terhadap peraturan yang berlaku. Nilai resmi tetap berasal dari berkas payroll perusahaan; ' +
        'sistem memakai hasil hitungnya sebagai pembanding, bukan pengganti.') +
      '</div>';
  }

  /* --------------------------------------------------- panel karyawan -- */
  function employeeDrawer(code) {
    var e = DB.byCode[code];
    if (!e) return;
    var d = DB.deliveries.filter(function (x) { return x.code === code; })[0];
    var hist = (DB.history[code] || []).slice().reverse();
    var ot = DB.overtime.filter(function (o) { return o.code === code; })[0];

    var body = '';

    body += '<div class="defs" style="margin-bottom:18px">' +
      '<div class="def"><span>ID karyawan</span><b style="font-family:var(--mono)">' + esc(e.code) + '</b></div>' +
      '<div class="def"><span>Divisi</span><b>' + esc(e.divisionName) + '</b></div>' +
      '<div class="def"><span>Jabatan</span><b>' + esc(e.position) + '</b></div>' +
      '<div class="def"><span>Jenis kelamin</span><b>' + (e.gender === 'L' ? 'Laki-laki' : 'Perempuan') + '</b></div>' +
      '<div class="def"><span>Usia</span><b>' + e.age + ' tahun</b></div>' +
      '<div class="def"><span>Status PTKP</span><b>' + esc(e.ptkp) + ' · TER ' + DB.terCategory(e.ptkp) + '</b></div>' +
      '<div class="def"><span>Bergabung</span><b>' + UI.dateID(e.joined) + '</b></div>' +
      '<div class="def" style="grid-column:1/-1"><span>Alamat email</span><b>' +
      (e.email ? esc(e.email) : '<span style="color:var(--ochre)">Belum terdaftar</span>') +
      (e.emailType === 'personal' ? ' <span class="chip">pribadi</span>' : '') + '</b></div>' +
      '</div>';

    /* Komponen gaji — hanya untuk peran yang berhak */
    var pay = DB.payByCode[e.code];
    if (pay) {
      body += '<h4 style="font-size:12.5px;margin-bottom:9px">Komponen gaji periode berjalan</h4>';
      if (can('salaryDetail')) {
        body += '<div class="card" style="margin-bottom:18px"><div class="card-body">' +
          calcBreakdown(pay.calc);
        if (pay.flagged) {
          body += '<div style="margin-top:14px">' + UI.notice('n-bad',
            'Selisih ' + UI.pct(pay.gapPct, 2) + '% terhadap angka Excel',
            'Berkas payroll mencatat <b>' + UI.rupiah(pay.excelNetto) + '</b>, sistem menghitung <b>' +
            UI.rupiah(pay.calc.netto) + '</b>. Periksa rumus pada baris karyawan ini di berkas payroll. ' +
            'Yang dikirim ke karyawan tetap angka dari berkas payroll.') + '</div>';
        }
        body += '</div></div>';
      } else {
        body += '<div class="card" style="margin-bottom:18px"><div class="empty" style="padding:28px 20px">' +
          icon('lock', 26) + '<b>Rincian gaji tidak dapat dibuka</b>' +
          '<p>Peran Viewer hanya melihat angka gabungan tingkat perusahaan. ' +
          'Pembatasan ini berlaku di seluruh sistem, bukan hanya di layar ini.</p></div></div>';
      }
    }

    if (!e.email) {
      body += UI.notice('n-warn', 'Karyawan ini masuk daftar pengecualian',
        'Tidak ada alamat email terdaftar, jadi slipnya tidak dikirim otomatis. ' +
        'Slip dicetak dan diserahkan langsung, lalu serah terimanya dicatat di sistem.') +
        '<div style="height:18px"></div>';
    }

    body += '<h4 style="font-size:12.5px;margin-bottom:9px">Slip gaji September 2026</h4>';
    if (d) {
      var isExc = d.status === 'EXCEPTION';
      /* Karyawan pengecualian tidak pernah masuk antrian, jadi jangan
         melaporkan percobaan kirim yang memang tidak pernah terjadi. */
      var attempts = isExc ? 'Tidak dikirim' : (d.status === 'FAILED' ? d.retryCount : d.retryCount + 1) + '×';
      var when = isExc
        ? 'Diserahkan langsung oleh HR'
        : (d.sentAt ? 'Dikirim ' + UI.dateID(d.sentDate) + ' pukul ' + esc(d.sentAt) : 'Belum terkirim');

      body += '<div class="card" style="margin-bottom:18px"><div class="card-body">' +
        '<div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">' + UI.badge(d.status) +
        '<span style="font-size:12px;color:var(--muted)">' + when + '</span></div>' +
        '<div class="defs">' +
        '<div class="def"><span>Status berkas</span><b>' + UI.badge(d.payslipStatus) + '</b></div>' +
        '<div class="def"><span>Status email</span><b>' + UI.badge(d.emailStatus) + '</b></div>' +
        '<div class="def"><span>Percobaan kirim</span><b>' + attempts + '</b></div>' +
        '</div>' +
        (d.errorCode ? '<div style="margin-top:12px">' + UI.notice('n-bad',
          (DB.failByCode[d.errorCode] || {}).label || d.errorCode,
          '<span style="font-size:12px">' + esc((DB.failByCode[d.errorCode] || {}).detail || '') + '</span>') + '</div>' : '') +
        '</div></div>';
    }

    if (ot) {
      var pctCap = Math.min(100, ot.hours / DB.otCap * 100);
      body += '<h4 style="font-size:12.5px;margin-bottom:9px">Lembur periode September</h4>' +
        '<div class="card" style="margin-bottom:18px"><div class="card-body">' +
        '<div class="metric-row" style="margin-bottom:12px">' +
        '<div class="metric"><span>Total jam</span><b>' + ot.hours + '</b></div>' +
        '<div class="metric"><span>Jumlah catatan</span><b>' + ot.entries + '</b></div>' +
        '<div class="metric"><span>Ambang peringatan</span><b>' + DB.otCap + '</b></div>' +
        '</div>' +
        '<div class="ot-track" style="height:20px"><div class="ot-fill' + (ot.overCap ? ' over' : '') +
        '" style="width:' + pctCap + '%"></div><span class="ot-label" style="line-height:20px">' + ot.hours + ' jam</span></div>' +
        (ot.overCap ? '<div style="margin-top:12px">' + UI.notice('n-warn', 'Melewati ambang peringatan',
          'Jam lembur karyawan ini sudah di atas ' + DB.otCap + ' jam untuk periode berjalan. ' +
          'Ambangnya dapat disetel HR di halaman pengaturan.') + '</div>' : '') +
        '<details style="margin-top:12px"><summary style="cursor:pointer;font-size:12.5px;color:var(--petrol-600)">Lihat rincian harian</summary>' +
        '<div class="table-scroll" style="margin-top:10px"><table class="data">' +
        '<thead><tr><th>Tanggal</th><th>Kode</th><th class="col-num">Jam</th><th>Uraian pekerjaan</th></tr></thead><tbody>' +
        DB.otDetail(code).map(function (r) {
          return '<tr><td>' + UI.dateID(r.date) + '</td><td>' + r.code + '</td>' +
            '<td class="col-num">' + r.hours + '</td><td style="color:var(--muted)">' + esc(r.task) + '</td></tr>';
        }).join('') +
        '</tbody></table></div></details>' +
        '</div></div>';
    }

    body += '<h4 style="font-size:12.5px;margin-bottom:9px">Riwayat pengiriman</h4><div class="tl">' +
      hist.map(function (h, i) {
        var cls = h.status === 'SENT' ? 'ok' : 'bad';
        return '<div class="tl-row"><div class="tl-mark"><i class="' + cls + '"></i>' +
          (i < hist.length - 1 ? '<s></s>' : '') + '</div>' +
          '<div class="tl-body"><b>' + esc(h.label) + '</b>' +
          '<span>' + UI.dateID(h.date) + ' pukul ' + esc(h.time) + ' — ' +
          (h.status === 'SENT' ? 'terkirim' : 'gagal, ditangani manual') + '</span></div></div>';
      }).join('') + '</div>';

    body += '<div class="btn-row" style="margin-top:20px">' +
      '<button class="btn btn-sm" data-mail>' + icon('inbox', 13) + 'Lihat contoh email</button>' +
      (can('revealPassword')
        ? '<button class="btn btn-sm" data-pass>' + icon('lock', 13) + 'Buka password slip</button>'
        : lockedBtn('Buka password slip', 'lock')) +
      '</div>';

    UI.drawer({
      title: e.name,
      sub: e.code + ' · ' + e.divisionName,
      body: body,
      onReady: function (root) {
        var m = q('[data-mail]', root);
        if (m) m.addEventListener('click', function () { emailPreview(e); });
        var p = q('[data-pass]', root);
        if (p) p.addEventListener('click', function () { revealPassword(e); });
      }
    });
  }

  function revealPassword(e) {
    UI.modal({
      title: 'Buka password slip',
      sub: e.name + ' · ' + e.code,
      body: UI.notice('n-warn', 'Tindakan ini dicatat di jejak audit',
        'Nama Anda, waktu, dan karyawan yang bersangkutan akan tercatat permanen. ' +
        'Gunakan hanya saat karyawan benar-benar melaporkan tidak bisa membuka slipnya.') +
        '<div style="margin-top:14px;font-size:12.5px;color:var(--muted)">' +
        'Di sistem produksi, password diambil dari brankas terenkripsi dan ditampilkan sekali. ' +
        'Pada prototype ini tidak ada password sungguhan yang dibuat maupun disimpan.</div>',
      confirm: 'Catat dan tampilkan',
      onConfirm: function (close) {
        close();
        UI.toast('Dicatat di jejak audit', 'Prototype tidak menampilkan password sungguhan.', 'info');
      }
    });
  }

  function emailPreview(e) {
    var name = e ? e.name : '[Nama Karyawan]';
    var code = e ? e.code : 'BTB-0001';
    UI.modal({
      title: 'Pratinjau email',
      sub: 'Contoh pesan yang diterima karyawan — tidak ada email sungguhan yang dikirim',
      wide: true,
      body:
        '<div class="mail">' +
        '<div class="mail-head">' +
        '<div><span>Dari</span><b>' + esc(DB.settings.senderName) + ' &lt;' + esc(DB.settings.sender) + '&gt;</b></div>' +
        '<div><span>Kepada</span><b>' + esc(e && e.email ? e.email : 'karyawan@' + DB.domain) + '</b></div>' +
        '<div><span>Perihal</span><b>Slip Gaji — September 2026</b></div>' +
        '</div>' +
        '<div class="mail-body">' +
        '<p>Yth. ' + esc(name) + ',</p>' +
        '<p>Slip gaji Anda untuk periode September 2026 terlampir pada email ini.</p>' +
        '<p>Demi menjaga kerahasiaan, berkas dilindungi password. Gunakan password yang telah diberikan HR saat penyerahan pertama. ' +
        'Jika Anda belum menerimanya atau lupa, hubungi HR melalui nomor di bawah.</p>' +
        '<p>Email ini dikirim otomatis. Mohon tidak membalas ke alamat ini.</p>' +
        '<p style="margin-bottom:0">Hormat kami,<br>Tim HR — ' + esc(DB.company) + '<br>' +
        '<span style="color:var(--muted);font-size:12px">Telepon HR site: 0813-XXXX-XXXX</span></p>' +
        '</div>' +
        '<div class="mail-attach">' + icon('lock', 18) +
        '<div><b>Slip_Gaji_' + esc(code) + '_202609.pdf</b><span>PDF terenkripsi · 84 KB</span></div></div>' +
        '</div>' +
        '<div style="margin-top:14px">' +
        UI.notice('n-info', 'Prototype tidak mengirim email',
          'Templat ini hanya pratinjau. Tidak ada koneksi ke server email mana pun dalam prototype ini.') +
        '</div>',
      cancel: 'Tutup'
    });
  }

  /* =======================================================================
     14 · PEMBUATAN SLIP
     ======================================================================= */

  /* Replika tata letak slip yang berlaku di perusahaan. Dibuat sebagai HTML
     agar bisa dicetak atau disimpan sebagai PDF lewat dialog cetak browser,
     tanpa memerlukan pustaka tambahan. */
  function slipHTML(row, periodCode) {
    var e = DB.byCode[row.code] || {};
    var period = DB.periods.filter(function (p) { return p.code === periodCode; })[0] || {};
    var t = DB.entryTotals(row);
    var sg = DB.signer;

    function line(label, key, strong) {
      var v = Number(row.values[key]) || 0;
      return '<div class="slip-line' + (strong ? ' strong' : '') + '">' +
        '<span>' + esc(label) + '</span><i>:</i><em>Rp</em>' +
        '<b>' + (v ? v.toLocaleString('id-ID', { minimumFractionDigits: 2 }) : '-') + '</b></div>';
    }
    function total(label, v) {
      return '<div class="slip-line strong"><span>' + esc(label) + '</span><i>:</i><em>Rp</em>' +
        '<b>' + v.toLocaleString('id-ID', { minimumFractionDigits: 2 }) + '</b></div>';
    }

    return '<div class="slip">' +
      '<div class="slip-head"><h4>' + esc(DB.company.toUpperCase()) + '</h4>' +
      '<p>Periode ' + esc((period.range || '').toUpperCase()) + '</p></div>' +

      '<div class="slip-id">' +
      '<div><span>NAMA</span><b>' + esc(row.name.toUpperCase()) + '</b></div>' +
      '<div><span>JABATAN</span><b>' + esc(row.position.toUpperCase()) + '</b></div>' +
      '<div><span>ID KARYAWAN</span><b>' + esc(row.code) + '</b></div>' +
      '</div>' +

      '<div class="slip-band">Penghasilan</div>' +
      line('Gaji Pokok', 'pokok') +
      line('Lembur', 'lembur') +
      line('Tunjangan Kehadiran', 'tunjKehadiran') +
      line('Tunjangan Skill', 'tunjSkill') +
      line('Rapel Absen', 'rapelAbsen') +
      line('Rapel Lembur', 'rapelLembur') +
      line('Rapel Tunjangan Kehadiran', 'rapelTunj') +
      line('Kompensasi', 'kompensasi') +
      total('Total', t.bruto) +

      '<div class="slip-band">Potongan</div>' +
      line('JHT', 'jht') +
      line('BPJS Kesehatan', 'bpjsKes') +
      line('Absen', 'absen') +
      line('PPH 21', 'pph') +
      total('Total', t.potongan) +

      '<div class="slip-thp"><span>Take Home Pay</span>' +
      '<b>' + t.thp.toLocaleString('id-ID', { minimumFractionDigits: 2 }) + '</b></div>' +

      '<div class="slip-sign">' +
      '<p>' + esc(sg.place) + ', ' + esc(signDate(periodCode)) + '</p>' +
      '<div class="slip-rule"></div>' +
      '<b>' + esc(sg.name.toUpperCase()) + '</b>' +
      '<span>' + esc(sg.title.toUpperCase()) + '</span>' +
      '</div>' +
      '</div>';
  }

  function signDate(periodCode) {
    return { 'JUL-2026': '24 Juli 2026', 'AGU-2026': '24 Agustus 2026',
      'SEP-2026': '22 September 2026', 'OKT-2026': '22 Oktober 2026' }[periodCode] || '';
  }

  function generate() {
    if (!can('salaryDetail')) {
      return {
        html: '<div class="card"><div class="empty">' + icon('lock', 34) +
          '<b>Halaman ini tidak tersedia untuk peran Anda</b>' +
          '<p>Pembuatan slip hanya dapat dijalankan oleh HR Admin.</p></div></div>'
      };
    }

    var sh = DB.entrySheets[entryPeriod];
    var period = DB.periods.filter(function (p) { return p.code === entryPeriod; })[0];
    var totals = DB.sheetTotals(sh);
    var issues = DB.sheetIssues(sh);
    var blocking = issues.filter(function (i) { return i.severity === 'BLOCKING'; });
    var noMail = DB.employees.filter(function (e) { return !e.email; }).length;

    var html = '<p class="view-intro">Slip dibuat dari data yang sudah dikunci di halaman input, ' +
      'lalu diperiksa di sini sebelum diserahkan ke batch distribusi. ' +
      'Satu langkah pemeriksaan ini yang memisahkan sistem ini dari sekadar mengirim lampiran massal.</p>';

    html += '<div class="period-bar">' +
      '<div class="period-pick"><label for="genPeriod">Periode payroll</label>' +
      '<select id="genPeriod">' +
      DB.periods.map(function (p) {
        return '<option value="' + p.code + '"' + (p.code === entryPeriod ? ' selected' : '') + '>' +
          esc(p.label) + ' · ' + esc(p.range) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="period-meta">' +
      (sh.generated
        ? '<span class="badge b-sent"><i class="dot"></i>SLIP SUDAH DIBUAT</span>'
        : sh.locked
          ? '<span class="badge b-info"><i class="dot"></i>SIAP DIBUAT</span>'
          : '<span class="badge b-pending"><i class="dot"></i>DATA BELUM DIKUNCI</span>') +
      '</div></div>';

    /* Prasyarat */
    html += '<div class="grid g-1-1" style="margin-bottom:16px">';

    html += '<div class="card"><div class="card-head"><div><h3>Prasyarat</h3>' +
      '<p>Semua harus hijau sebelum slip bisa dibuat</p></div></div><div class="checklist">' +
      preReq('Data payroll terisi', sh.rows.length + ' baris, total ' + UI.rupiah(totals.thp), true) +
      preReq('Tidak ada baris bermasalah',
        blocking.length ? blocking.length + ' baris masih menghalangi' : 'Seluruh baris lolos pemeriksaan',
        blocking.length === 0) +
      preReq('Periode sudah dikunci',
        sh.locked ? 'Dikunci ' + esc(sh.lockedAt || '') + ' oleh ' + esc(sh.lockedBy || '') : 'Kunci dulu di halaman input',
        sh.locked) +
      preReq('Tarif potongan diverifikasi',
        DB.rates.verified ? 'Sudah ditandai HR' : 'Masih memakai tarif contoh',
        DB.rates.verified, true) +
      '</div></div>';

    html += '<div class="card"><div class="card-head"><div><h3>Yang akan dihasilkan</h3></div></div>' +
      '<div class="card-body">' +
      '<div class="metric-row" style="margin-bottom:16px">' +
      '<div class="metric"><span>Berkas slip</span><b>' + sh.rows.length + '</b></div>' +
      '<div class="metric"><span>Dikirim via email</span><b>' + (sh.rows.length - noMail) + '</b></div>' +
      '<div class="metric"><span>Dicetak manual</span><b>' + noMail + '</b></div>' +
      '</div>' +
      '<div class="defs">' +
      '<div class="def"><span>Pola nama berkas</span><b style="font-family:var(--mono);font-size:11.5px">Slip_Gaji_&lt;ID&gt;_' +
      esc(entryPeriod.replace('-', '')) + '.pdf</b></div>' +
      '<div class="def"><span>Proteksi</span><b>Password acak per karyawan</b></div>' +
      '<div class="def"><span>Penanda tangan</span><b>' + esc(DB.signer.name) + ' · ' + esc(DB.signer.title) + '</b></div>' +
      '</div>' +
      '<div class="btn-row" style="margin-top:18px">' +
      '<button class="btn btn-sm btn-primary" id="genRun"' +
      (sh.locked && !blocking.length ? '' : ' disabled title="Prasyarat belum terpenuhi"') + '>' +
      icon('play', 13) + (sh.generated ? 'Buat ulang seluruh slip' : 'Buat slip untuk ' + sh.rows.length + ' karyawan') + '</button>' +
      (sh.locked ? '' : '<a class="btn btn-sm" href="#/entry">Kembali ke input</a>') +
      '</div></div></div>';

    html += '</div>';

    /* Hasil */
    if (sh.generated) {
      html += '<div class="card"><div class="card-head">' +
        '<div><h3>Hasil pembuatan slip</h3><p>Dibuat ' + esc(sh.generatedAt || '') + ' · seluruh berkas terkunci password</p></div>' +
        '<div class="spacer"></div>' +
        '<button class="btn btn-sm" id="genSample">' + icon('search', 13) + 'Pemeriksaan acak</button>' +
        '<button class="btn btn-sm" id="genPrintAll">' + icon('print', 13) + 'Cetak semua</button>' +
        '<button class="btn btn-sm btn-primary" id="genHandoff">' + icon('send', 13) + 'Serahkan ke distribusi</button>' +
        '</div>';

      html += '<div class="filters"><div class="search-field">' + icon('search', 14) +
        '<input type="search" id="genSearch" placeholder="Cari nama atau ID untuk membuka slipnya…"></div>' +
        '<span style="font-size:12px;color:var(--muted);margin-left:auto">Klik kartu mana pun untuk melihat isi slipnya</span>' +
        '</div>';

      html += '<div class="card-body"><div class="gen-grid" id="genGrid">' +
        sh.rows.map(function (r) {
          var e = DB.byCode[r.code] || {};
          var t = DB.entryTotals(r);
          return '<button class="gen-card" data-slip="' + r.code + '" data-find="' +
            esc((r.code + ' ' + r.name).toLowerCase()) + '">' +
            '<span class="gen-code">' + esc(r.code) + '</span>' +
            '<span class="gen-name">' + esc(r.name) + '</span>' +
            '<span class="gen-thp">' + UI.rupiah(t.thp) + '</span>' +
            '<span class="gen-mark ' + (e.email ? 'ok' : 'warn') + '">' +
            (e.email ? icon('lock', 11) + ' email' : icon('print', 11) + ' cetak') + '</span>' +
            '</button>';
        }).join('') +
        '</div></div></div>';
    } else {
      html += '<div class="card"><div class="empty">' + icon('file', 34) +
        '<b>Belum ada slip untuk periode ini</b>' +
        '<p>Setelah data dikunci dan prasyarat terpenuhi, slip untuk seluruh karyawan akan dibuat di sini ' +
        'lengkap dengan tata letak resmi dan proteksi password.</p></div></div>';
    }

    return { html: html, mount: mountGenerate };
  }

  function preReq(title, note, ok, soft) {
    var cls = ok ? 'tick-ok' : (soft ? 'tick-warn' : 'tick-bad');
    var ico = ok ? 'check' : (soft ? 'bang' : 'x');
    return '<div class="check-row"><span class="tick ' + cls + '">' + icon(ico, 11) + '</span>' +
      '<div><b>' + esc(title) + '</b><span>' + note + '</span></div>' +
      '<span class="chip">' + (ok ? 'siap' : (soft ? 'peringatan' : 'belum')) + '</span></div>';
  }

  function mountGenerate() {
    var sh = DB.entrySheets[entryPeriod];

    var sel = q('#genPeriod');
    if (sel) sel.addEventListener('change', function () { entryPeriod = this.value; App.rerender(); });

    var run = q('#genRun');
    if (run) run.addEventListener('click', function () { runGenerate(sh); });

    qa('[data-slip]').forEach(function (c) {
      c.addEventListener('click', function () { slipPreview(this.dataset.slip); });
    });

    var gs = q('#genSearch');
    if (gs) gs.addEventListener('input', function () {
      var v = this.value.toLowerCase();
      qa('.gen-card').forEach(function (c) {
        c.style.display = !v || c.dataset.find.indexOf(v) > -1 ? '' : 'none';
      });
    });

    var smp = q('#genSample');
    if (smp) smp.addEventListener('click', function () { sampleCheck(sh); });

    var pr = q('#genPrintAll');
    if (pr) pr.addEventListener('click', function () { printAll(sh); });

    var ho = q('#genHandoff');
    if (ho) ho.addEventListener('click', function () { handoff(sh); });
  }

  function runGenerate(sh) {
    var total = sh.rows.length;
    var m = UI.modal({
      title: 'Membuat slip',
      sub: entryPeriod + ' · ' + total + ' karyawan',
      wide: true,
      body: '<div class="run-stat">' +
        '<div><span>Slip dibuat</span><b id="gDone">0</b></div>' +
        '<div><span>Dikunci password</span><b id="gLock">0</b></div>' +
        '<div><span>Sisa</span><b id="gLeft">' + total + '</b></div>' +
        '</div>' +
        '<div class="segbar" style="height:11px"><span class="seg-sent" id="gBar" style="width:0"></span></div>' +
        '<div class="run-log" id="gLog"></div>',
      cancel: 'Tutup'
    });

    var i = 0;
    var log = q('#gLog', m.root);
    var timer = setInterval(function () {
      var burst = 6;
      while (burst-- > 0 && i < total) {
        var r = sh.rows[i];
        if (i % 9 === 0) {
          log.insertAdjacentHTML('afterbegin',
            '<div><b>Slip_Gaji_' + esc(r.code) + '_' + esc(entryPeriod.replace('-', '')) +
            '.pdf</b> — dibuat dan dikunci</div>');
        }
        i++;
      }
      var a = q('#gDone', m.root), b = q('#gLock', m.root), c = q('#gLeft', m.root), bar = q('#gBar', m.root);
      if (a) a.textContent = num(i);
      if (b) b.textContent = num(i);
      if (c) c.textContent = num(total - i);
      if (bar) bar.style.width = (i / total * 100) + '%';

      if (i >= total) {
        clearInterval(timer);
        sh.generated = true;
        sh.generatedAt = '2026-09-23 10:41';
        DB.audit.unshift({
          ts: '2026-09-23 10:41', actor: App.user.name, role: App.user.role,
          action: 'Slip gaji dibuat', object: entryPeriod, result: 'Berhasil',
          desc: total + ' slip dibuat dari data terkunci dan dilindungi password per karyawan'
        });
        var foot = q('.modal-foot', m.root);
        if (foot) {
          foot.innerHTML = '<button class="btn" data-x>Tutup</button>' +
            '<button class="btn btn-primary" data-x2>Mulai pemeriksaan acak</button>';
          q('[data-x]', foot).addEventListener('click', function () { m.close(); App.rerender(); });
          q('[data-x2]', foot).addEventListener('click', function () {
            m.close(); App.rerender(); setTimeout(function () { sampleCheck(sh); }, 120);
          });
        }
        UI.toast('Slip selesai dibuat', total + ' berkas siap diperiksa.', 'ok');
      }
    }, 70);
  }

  function slipPreview(code) {
    var sh = DB.entrySheets[entryPeriod];
    var row = sh.rows.filter(function (r) { return r.code === code; })[0];
    if (!row) return;
    var e = DB.byCode[code] || {};

    UI.modal({
      title: 'Slip gaji · ' + row.name,
      sub: 'Slip_Gaji_' + code + '_' + entryPeriod.replace('-', '') + '.pdf · terkunci password',
      wide: true,
      body: '<div class="slip-frame">' + slipHTML(row, entryPeriod) + '</div>' +
        '<div style="margin-top:14px">' +
        UI.notice(e.email ? 'n-info' : 'n-warn',
          e.email ? 'Akan dikirim ke ' + e.email : 'Tidak punya alamat email',
          e.email
            ? 'Berkas dilampirkan dalam keadaan terkunci. Password dikirim terpisah dan tidak pernah muncul di layar ini.'
            : 'Slip ini masuk daftar pengecualian — dicetak dan diserahkan langsung, lalu serah terimanya dicatat.') +
        '</div>',
      cancel: 'Tutup',
      confirm: 'Cetak slip ini',
      onConfirm: function () { printSlips([row]); }
    });
  }

  function sampleCheck(sh) {
    var picks = [];
    for (var i = 0; i < 5; i++) picks.push(sh.rows[(i * 47 + 13) % sh.rows.length]);

    UI.modal({
      title: 'Pemeriksaan acak',
      sub: 'Lima slip dipilih acak oleh sistem — buka dan cocokkan isinya',
      wide: true,
      body: '<div class="slip-strip">' +
        picks.map(function (r) { return '<div class="slip-mini">' + slipHTML(r, entryPeriod) + '</div>'; }).join('') +
        '</div>' +
        '<div style="margin-top:14px">' +
        UI.notice('n-warn', 'Ini satu-satunya kendali terhadap kesalahan isi',
          'Validasi otomatis memeriksa struktur data, bukan isi dokumen. Pastikan nama, jabatan, ' +
          'dan angka pada tiap slip cocok dengan data karyawan yang bersangkutan sebelum melanjutkan.') +
        '</div>',
      cancel: 'Batal',
      confirm: 'Sudah saya periksa, semua cocok',
      onConfirm: function (close) {
        DB.audit.unshift({
          ts: '2026-09-23 10:46', actor: App.user.name, role: App.user.role,
          action: 'Pemeriksaan acak', object: entryPeriod, result: 'Berhasil',
          desc: '5 slip dibuka acak dan dicocokkan manual: ' + picks.map(function (r) { return r.code; }).join(', ')
        });
        close();
        UI.toast('Pemeriksaan tercatat', 'Slip siap diserahkan ke batch distribusi.', 'ok');
      }
    });
  }

  function printSlips(rows) {
    var host = q('#printArea');
    host.innerHTML = rows.map(function (r) {
      return '<div class="slip-page">' + slipHTML(r, entryPeriod) + '</div>';
    }).join('');
    document.body.classList.add('printing');
    setTimeout(function () {
      window.print();
      document.body.classList.remove('printing');
    }, 80);
  }

  function printAll(sh) {
    UI.modal({
      title: 'Cetak ' + sh.rows.length + ' slip',
      body: '<p style="font-size:13px">Seluruh slip akan disusun satu halaman per karyawan lalu dibuka di dialog cetak browser. ' +
        'Dari sana Anda bisa mencetak langsung atau memilih <b>Simpan sebagai PDF</b>.</p>' +
        UI.notice('n-info', 'Untuk keperluan arsip dan karyawan tanpa email',
          'Distribusi lewat email tetap memakai berkas terkunci yang dibuat sistem. ' +
          'Cetakan ini dipakai untuk arsip Finance dan untuk karyawan yang slipnya diserahkan langsung.'),
      confirm: 'Buka dialog cetak',
      onConfirm: function (close) { close(); printSlips(sh.rows); }
    });
  }

  function handoff(sh) {
    var b = DB.batches.filter(function (x) {
      return x.period === entryPeriod && x.docType === 'PAYSLIP';
    })[0];
    if (!b) {
      UI.toast('Batch belum ada', 'Buat batch distribusi untuk periode ini terlebih dahulu.', 'bad');
      return;
    }
    if (b.status === 'COMPLETED') {
      UI.toast('Sudah didistribusikan', 'Batch periode ini sudah selesai dijalankan.', 'info');
      return;
    }

    UI.modal({
      title: 'Serahkan ke batch distribusi',
      sub: b.id + ' · ' + sh.rows.length + ' slip',
      body: '<p style="font-size:13px">Slip yang sudah dibuat akan dilampirkan ke batch distribusi. ' +
        'Pengiriman tetap menunggu persetujuan terpisah — halaman ini tidak mengirim apa pun.</p>' +
        '<div class="defs" style="margin-top:14px">' +
        '<div class="def"><span>Batch tujuan</span><b>' + esc(b.id) + '</b></div>' +
        '<div class="def"><span>Dikirim via email</span><b>' + (sh.rows.length - b.exception) + '</b></div>' +
        '<div class="def"><span>Masuk pengecualian</span><b>' + b.exception + '</b></div>' +
        '</div>',
      confirm: 'Serahkan',
      onConfirm: function (close) {
        b.validationClear = true;
        b.note = sh.rows.length + ' slip sudah dibuat dan lolos pemeriksaan acak. Menunggu persetujuan distribusi.';
        DB.audit.unshift({
          ts: '2026-09-23 10:52', actor: App.user.name, role: App.user.role,
          action: 'Slip diserahkan ke distribusi', object: b.id, result: 'Berhasil',
          desc: sh.rows.length + ' slip dilampirkan ke batch, menunggu persetujuan pengiriman'
        });
        close();
        UI.toast('Diserahkan ke ' + b.id, 'Buka batch distribusi untuk menyetujui pengiriman.', 'ok');
        App.go('#/batches');
      }
    });
  }

  /* =======================================================================
     13 · INPUT PAYROLL
     ======================================================================= */
  var entryPeriod = 'OKT-2026';
  var entryPage = 1;
  var entrySearch = '';
  var ENTRY_SIZE = 12;

  function entry() {
    if (!can('salaryDetail')) {
      return {
        html: '<div class="card"><div class="empty">' + icon('lock', 34) +
          '<b>Halaman ini tidak tersedia untuk peran Anda</b>' +
          '<p>Input payroll hanya dapat dibuka oleh HR Admin.</p>' +
          '<div style="margin-top:14px"><a class="btn btn-sm" href="#/dashboard">Kembali ke ruang kendali</a></div>' +
          '</div></div>'
      };
    }

    var sh = DB.entrySheets[entryPeriod];
    var period = DB.periods.filter(function (p) { return p.code === entryPeriod; })[0];
    var totals = DB.sheetTotals(sh);
    var issues = DB.sheetIssues(sh);
    var blocking = issues.filter(function (i) { return i.severity === 'BLOCKING'; });
    var warnings = issues.filter(function (i) { return i.severity === 'WARNING'; });
    var issueByCode = {};
    issues.forEach(function (i) {
      if (i.severity !== 'INFO') issueByCode[i.code] = i.severity;
    });

    var rows = sh.rows;
    if (entrySearch) {
      var qq = entrySearch.toLowerCase();
      rows = rows.filter(function (r) {
        return (r.code + ' ' + r.name + ' ' + r.position).toLowerCase().indexOf(qq) > -1;
      });
    }
    var pages = Math.max(1, Math.ceil(rows.length / ENTRY_SIZE));
    if (entryPage > pages) entryPage = pages;
    var slice = rows.slice((entryPage - 1) * ENTRY_SIZE, entryPage * ENTRY_SIZE);

    var html = '<p class="view-intro">Tabel ini menggantikan lembar kerja payroll di Excel. ' +
      'Kolomnya sengaja dibuat sama persis dengan yang sudah dipakai HR, ' +
      'termasuk urutannya, supaya tidak perlu belajar cara input baru. ' +
      'Total penghasilan, total potongan, dan take home pay dihitung ulang setiap kali Anda mengetik.</p>';

    /* Pemilih periode */
    html += '<div class="period-bar">' +
      '<div class="period-pick"><label for="entPeriod">Periode payroll</label>' +
      '<select id="entPeriod">' +
      DB.periods.map(function (p) {
        return '<option value="' + p.code + '"' + (p.code === entryPeriod ? ' selected' : '') + '>' +
          esc(p.label) + ' · ' + esc(p.range) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="period-meta">' +
      (sh.locked
        ? '<span class="badge b-neutral"><i class="dot"></i>TERKUNCI</span>'
        : '<span class="badge b-info"><i class="dot"></i>SEDANG DIISI</span>') +
      (sh.locked
        ? '<span class="chip">dikunci ' + esc(sh.lockedAt || '') + ' oleh ' + esc(sh.lockedBy || '') + '</span>'
        : '') +
      '</div></div>';

    html += '<div class="grid g-4" style="margin-bottom:16px">' +
      UI.kpi('Total penghasilan', UI.rupiahShort(totals.bruto), num(totals.rows) + ' karyawan', 'main') +
      UI.kpi('Total potongan', UI.rupiahShort(totals.potongan), 'JHT, BPJS, absen, PPh 21', '') +
      UI.kpi('Total take home pay', UI.rupiahShort(totals.thp), 'Yang dibayarkan ke rekening', 'good') +
      UI.kpi('Baris bermasalah', num(blocking.length + warnings.length),
        '<b>' + blocking.length + '</b> penghambat · <b>' + warnings.length + '</b> peringatan',
        blocking.length ? 'bad' : (warnings.length ? 'warn' : 'good')) +
      '</div>';

    if (blocking.length) {
      html += '<div style="margin-bottom:16px">' + UI.notice('n-bad',
        blocking.length + ' baris menghalangi pembuatan slip',
        blocking.map(function (i) {
          return '<div style="margin-top:4px"><b style="display:inline">' + esc(i.code) + ' ' + esc(i.name) +
            '</b> — ' + esc(i.message) + '</div>';
        }).join('')) + '</div>';
    }
    if (warnings.length) {
      html += '<div style="margin-bottom:16px">' + UI.notice('n-warn',
        warnings.length + ' baris perlu diperiksa, tetapi tidak menghalangi',
        warnings.map(function (i) {
          return '<div style="margin-top:4px"><b style="display:inline">' + esc(i.code) + ' ' + esc(i.name) +
            '</b> — ' + esc(i.message) + '</div>';
        }).join('')) + '</div>';
    }

    /* Tabel entri */
    html += '<div class="card"><div class="filters">' +
      '<div class="search-field">' + icon('search', 14) +
      '<input type="search" id="entSearch" placeholder="Cari nama, ID, atau jabatan…" value="' + esc(entrySearch) + '"></div>' +
      '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">' +
      (sh.locked
        ? '<button class="btn btn-sm" id="entUnlock">' + icon('lock', 13) + 'Buka kunci periode</button>'
        : '<button class="btn btn-sm" id="entImport">' + icon('download', 13) + 'Impor dari Excel</button>' +
          '<button class="btn btn-sm" id="entAuto">' + icon('refresh', 13) + 'Hitung potongan otomatis</button>' +
          '<button class="btn btn-sm btn-primary" id="entLock">' + icon('shield', 13) + 'Kunci periode</button>') +
      '</div></div>';

    html += '<div class="table-scroll entry-scroll"><table class="data entry-table"><thead>' +
      '<tr class="entry-group"><th class="sticky-1"></th><th class="sticky-2"></th>' +
      '<th colspan="8" class="grp-in">Penghasilan</th>' +
      '<th colspan="4" class="grp-out">Potongan</th>' +
      '<th colspan="3" class="grp-sum">Hasil</th></tr>' +
      '<tr><th class="sticky-1">ID</th><th class="sticky-2">Nama &amp; jabatan</th>' +
      DB.entryColumns.map(function (c) {
        return '<th class="col-num ' + (c.group === 'in' ? 'c-in' : 'c-out') + '" style="min-width:' + c.w + 'px">' +
          esc(c.label) + '</th>';
      }).join('') +
      '<th class="col-num c-sum">Total penghasilan</th>' +
      '<th class="col-num c-sum">Total potongan</th>' +
      '<th class="col-num c-sum">Take home pay</th></tr></thead><tbody>';

    slice.forEach(function (r) {
      var t = DB.entryTotals(r);
      var flag = issueByCode[r.code];
      html += '<tr' + (flag ? ' class="row-' + flag.toLowerCase() + '"' : '') + ' data-code="' + r.code + '">' +
        '<td class="sticky-1 col-code">' + esc(r.code) + '</td>' +
        '<td class="sticky-2"><b style="font-weight:500">' + esc(r.name) + '</b>' +
        '<div style="font-size:10.5px;color:var(--muted)">' + esc(r.position) + '</div></td>' +
        DB.entryColumns.map(function (c) {
          return '<td class="cell-num"><input type="number" step="1000" data-code="' + r.code +
            '" data-key="' + c.key + '" value="' + (r.values[c.key] || 0) + '"' +
            (sh.locked ? ' disabled' : '') + '></td>';
        }).join('') +
        '<td class="col-num sum-in" data-sum="bruto">' + UI.rupiah(t.bruto) + '</td>' +
        '<td class="col-num sum-out" data-sum="potongan">' + UI.rupiah(t.potongan) + '</td>' +
        '<td class="col-num sum-thp" data-sum="thp">' + UI.rupiah(t.thp) + '</td>' +
        '</tr>';
    });

    html += '</tbody><tfoot><tr>' +
      '<td class="sticky-1"></td><td class="sticky-2"><b>Total seluruh karyawan</b></td>' +
      DB.entryColumns.map(function (c) {
        var sum = 0;
        sh.rows.forEach(function (r) { sum += Number(r.values[c.key]) || 0; });
        return '<td class="col-num">' + UI.rupiahShort(sum) + '</td>';
      }).join('') +
      '<td class="col-num sum-in">' + UI.rupiahShort(totals.bruto) + '</td>' +
      '<td class="col-num sum-out">' + UI.rupiahShort(totals.potongan) + '</td>' +
      '<td class="col-num sum-thp">' + UI.rupiahShort(totals.thp) + '</td>' +
      '</tr></tfoot></table></div>';

    /* Paginasi */
    var from = rows.length ? (entryPage - 1) * ENTRY_SIZE + 1 : 0;
    var to = Math.min(entryPage * ENTRY_SIZE, rows.length);
    var pager = '';
    if (pages > 1) {
      pager += '<button data-epage="' + (entryPage - 1) + '"' + (entryPage === 1 ? ' disabled' : '') + '>‹</button>';
      var st = Math.max(1, Math.min(entryPage - 2, pages - 4));
      var en = Math.min(pages, st + 4);
      for (var p = st; p <= en; p++) {
        pager += '<button data-epage="' + p + '"' + (p === entryPage ? ' aria-current="true"' : '') + '>' + p + '</button>';
      }
      pager += '<button data-epage="' + (entryPage + 1) + '"' + (entryPage === pages ? ' disabled' : '') + '>›</button>';
    }
    html += '<div class="table-foot"><span>Menampilkan ' + num(from) + '–' + num(to) + ' dari ' + num(rows.length) + ' karyawan</span>' +
      '<div class="pager">' + pager + '</div></div></div>';

    /* Langkah berikutnya */
    html += '<div class="card" style="margin-top:16px"><div class="card-head">' +
      '<div><h3>Langkah berikutnya</h3><p>Setelah data benar, slip dibuat lalu diperiksa sebelum dikirim</p></div></div>' +
      '<div class="card-body"><div class="flow">' +
      flowStep(1, 'Input data payroll', 'Halaman ini', 'current') +
      flowStep(2, 'Kunci periode', 'Mencegah data berubah setelah slip dibuat', sh.locked ? 'done' : '') +
      flowStep(3, 'Buat slip', 'Slip PDF dibuat untuk seluruh karyawan', sh.generated ? 'done' : '') +
      flowStep(4, 'Periksa hasil', 'Pemeriksaan acak sebelum distribusi', '') +
      flowStep(5, 'Kirim', 'Serahkan ke batch distribusi', '') +
      '</div>' +
      '<div class="btn-row" style="margin-top:18px">' +
      '<a class="btn btn-sm btn-primary" href="#/generate">' + icon('file', 13) + 'Lanjut ke pembuatan slip</a>' +
      '</div></div></div>';

    return { html: html, mount: mountEntry };
  }

  function flowStep(n, title, note, state) {
    return '<div class="flow-step ' + (state || '') + '">' +
      '<i>' + (state === 'done' ? '✓' : n) + '</i>' +
      '<div><b>' + esc(title) + '</b><span>' + esc(note) + '</span></div></div>';
  }

  function mountEntry() {
    var sh = DB.entrySheets[entryPeriod];

    var sel = q('#entPeriod');
    if (sel) sel.addEventListener('change', function () {
      entryPeriod = this.value; entryPage = 1; App.rerender();
    });

    var sb = q('#entSearch');
    if (sb) sb.addEventListener('input', function () {
      var caret = this.selectionStart;
      entrySearch = this.value; entryPage = 1;
      App.rerender();
      var again = q('#entSearch');
      if (again) { again.focus(); try { again.setSelectionRange(caret, caret); } catch (e) {} }
    });

    qa('[data-epage]').forEach(function (b) {
      b.addEventListener('click', function () { entryPage = Number(this.dataset.epage); App.rerender(); });
    });

    /* Sel yang diketik memperbarui baris seketika, tanpa menggambar ulang
       seluruh halaman — supaya fokus tidak lompat saat HR mengetik cepat. */
    qa('.entry-table input[data-key]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var row = sh.rows.filter(function (r) { return r.code === this.dataset.code; }.bind(this))[0];
        if (!row) return;
        row.values[this.dataset.key] = Number(this.value) || 0;
        var tr = this.closest('tr');
        var t = DB.entryTotals(row);
        q('[data-sum="bruto"]', tr).textContent = UI.rupiah(t.bruto);
        q('[data-sum="potongan"]', tr).textContent = UI.rupiah(t.potongan);
        var thp = q('[data-sum="thp"]', tr);
        thp.textContent = UI.rupiah(t.thp);
        thp.classList.toggle('neg', t.thp < 0);
      });
    });

    var imp = q('#entImport');
    if (imp) imp.addEventListener('click', function () {
      UI.modal({
        title: 'Impor dari berkas Excel',
        sub: 'Periode ' + entryPeriod,
        body: '<p style="font-size:13px">Sistem membaca berkas payroll dan memetakan kolomnya ke tabel ini ' +
          'berdasarkan ID karyawan, bukan nama.</p>' +
          '<div class="table-scroll" style="border:1px solid var(--line);border-radius:var(--r-sm)">' +
          '<table class="data"><thead><tr><th>Kolom di Excel</th><th>Dipetakan ke</th></tr></thead><tbody>' +
          DB.entryColumns.map(function (c) {
            return '<tr><td class="col-code">' + esc(c.label.toUpperCase()) + '</td><td>' + esc(c.label) + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
          '<div style="margin-top:14px">' +
          UI.notice('n-warn', 'Berkas wajib memuat kolom ID karyawan',
            'Tanpa kolom ID, pemetaan harus mengandalkan nama — dan nama bisa kembar atau salah ketik. ' +
            'Sistem akan menolak berkas yang tidak punya kolom ID.') + '</div>',
        confirm: 'Pilih berkas',
        onConfirm: function (close) {
          close();
          UI.toast('Prototype tidak membaca berkas', 'Di sistem sungguhan berkas Excel akan diunggah dan dipetakan di sini.', 'info');
        }
      });
    });

    var auto = q('#entAuto');
    if (auto) auto.addEventListener('click', function () {
      UI.modal({
        title: 'Hitung potongan otomatis',
        sub: entryPeriod + ' · ' + sh.rows.length + ' karyawan',
        body: '<p style="font-size:13px">Sistem akan mengisi kolom <b>JHT</b>, <b>BPJS Kesehatan</b>, dan <b>PPH 21</b> ' +
          'berdasarkan tarif di halaman pengaturan. Kolom penghasilan tidak disentuh.</p>' +
          '<p style="font-size:13px;color:var(--muted)">Nilai yang sudah Anda isi manual akan tertimpa. ' +
          'Setelah terisi, setiap sel tetap bisa diubah satu per satu.</p>' +
          UI.notice('n-warn', 'Hasilnya tetap harus diperiksa',
            'Tarif yang dipakai masih berstatus belum diverifikasi. Selama itu, anggap hasil hitung ini ' +
            'sebagai bantuan pengisian, bukan angka final.'),
        confirm: 'Isi otomatis',
        onConfirm: function (close) {
          var r = DB.rates;
          var base = r.bpjsBase === 'umk' ? r.umkWage : null;
          sh.rows.forEach(function (row) {
            var e = DB.byCode[row.code];
            var upah = base !== null ? base
              : (r.bpjsBase === 'pokok' ? row.values.pokok : row.values.pokok + row.values.tunjKehadiran);
            row.values.jht = Math.round(upah * r.jhtEmployee / 100);
            row.values.bpjsKes = Math.round(Math.min(upah, r.kesWageCap) * r.kesEmployee / 100);
            var bruto = DB.entryTotals(row).bruto;
            row.values.pph = e ? Math.round(bruto * terRateFor(e.ptkp, bruto)) : 0;
          });
          DB.audit.unshift({
            ts: '2026-09-23 10:22', actor: App.user.name, role: App.user.role,
            action: 'Potongan dihitung otomatis', object: entryPeriod, result: 'Berhasil',
            desc: sh.rows.length + ' baris diisi ulang untuk JHT, BPJS Kesehatan, dan PPh 21'
          });
          close();
          UI.toast('Potongan terisi', sh.rows.length + ' baris diperbarui.', 'ok');
          App.rerender();
        }
      });
    });

    var lock = q('#entLock');
    if (lock) lock.addEventListener('click', function () {
      var blk = DB.sheetIssues(sh).filter(function (i) { return i.severity === 'BLOCKING'; });
      if (blk.length) {
        UI.modal({
          title: 'Periode belum bisa dikunci',
          body: UI.notice('n-bad', blk.length + ' baris masih bermasalah',
            'Perbaiki dulu baris berikut sebelum periode dikunci:' +
            blk.map(function (i) { return '<div style="margin-top:4px">' + esc(i.code + ' ' + i.name + ' — ' + i.message) + '</div>'; }).join('')),
          cancel: 'Mengerti'
        });
        return;
      }
      UI.modal({
        title: 'Kunci periode ' + entryPeriod,
        body: '<p style="font-size:13px">Setelah dikunci, tabel tidak bisa diubah dan slip bisa mulai dibuat. ' +
          'Kunci dapat dibuka lagi, tetapi setiap pembukaan tercatat di jejak audit.</p>' +
          '<div class="defs" style="margin-top:14px">' +
          '<div class="def"><span>Karyawan</span><b>' + sh.rows.length + '</b></div>' +
          '<div class="def"><span>Total take home pay</span><b>' + UI.rupiah(DB.sheetTotals(sh).thp) + '</b></div>' +
          '</div>',
        confirm: 'Kunci periode',
        onConfirm: function (close) {
          sh.locked = true;
          sh.lockedBy = App.user.name;
          sh.lockedAt = '2026-09-23 10:30';
          DB.audit.unshift({
            ts: '2026-09-23 10:30', actor: App.user.name, role: App.user.role,
            action: 'Periode payroll dikunci', object: entryPeriod, result: 'Berhasil',
            desc: sh.rows.length + ' baris dikunci, total take home pay ' + UI.rupiah(DB.sheetTotals(sh).thp)
          });
          close();
          UI.toast('Periode dikunci', 'Slip sekarang bisa dibuat.', 'ok');
          App.go('#/generate');
        }
      });
    });

    var unlock = q('#entUnlock');
    if (unlock) unlock.addEventListener('click', function () {
      UI.modal({
        title: 'Buka kunci periode ' + entryPeriod,
        body: UI.notice('n-warn', 'Slip yang sudah dibuat akan dianggap kedaluwarsa',
          'Kalau data diubah setelah slip dibuat, slip lama tidak lagi cocok dengan datanya. ' +
          'Sistem akan meminta slip dibuat ulang sebelum distribusi bisa dijalankan.'),
        confirm: 'Buka kunci',
        danger: true,
        onConfirm: function (close) {
          sh.locked = false; sh.generated = false;
          DB.audit.unshift({
            ts: '2026-09-23 10:34', actor: App.user.name, role: App.user.role,
            action: 'Kunci periode dibuka', object: entryPeriod, result: 'Berhasil',
            desc: 'Slip yang sudah dibuat ditandai kedaluwarsa dan harus dibuat ulang'
          });
          close();
          UI.toast('Kunci dibuka', 'Slip perlu dibuat ulang setelah data diubah.', 'info');
          App.rerender();
        }
      });
    });
  }

  function terRateFor(ptkp, bruto) {
    var cat = DB.terCategory(ptkp);
    var tbl = DB.terTable[cat];
    for (var i = 0; i < tbl.length; i++) if (bruto <= tbl[i][0]) return tbl[i][1];
    return tbl[tbl.length - 1][1];
  }

  /* =======================================================================
     12 · DATA GAJI & PERHITUNGAN
     ======================================================================= */
  function payrolldata() {
    if (!can('salaryDetail')) {
      return {
        html: '<div class="card"><div class="empty">' + icon('lock', 34) +
          '<b>Halaman ini tidak tersedia untuk peran Anda</b>' +
          '<p>Rincian gaji per karyawan hanya dapat dibuka oleh HR Admin. ' +
          'Angka gabungan tingkat perusahaan tetap dapat Anda lihat di ruang kendali.</p>' +
          '<div style="margin-top:14px"><a class="btn btn-sm" href="#/dashboard">Kembali ke ruang kendali</a></div>' +
          '</div></div>'
      };
    }

    var t = DB.payrollTotals(DB.payroll);
    var flagged = DB.payroll.filter(function (p) { return p.flagged; });

    var tbl = UI.dataTable({
      rows: DB.payroll,
      pageSize: 15,
      searchPlaceholder: 'Cari nama atau ID karyawan…',
      searchOn: function (p) {
        var e = DB.byCode[p.code];
        return p.code + ' ' + (e ? e.name + ' ' + e.divisionName + ' ' + e.ptkp : '');
      },
      filters: [
        { key: 'div', label: 'Semua divisi', options: DB.divisions.map(function (d) { return { value: d.key, label: d.name }; }) },
        { key: 'ter', label: 'Semua kategori TER', options: [
          { value: 'A', label: 'TER A' }, { value: 'B', label: 'TER B' }, { value: 'C', label: 'TER C' }] },
        { key: 'flag', label: 'Semua baris', options: [
          { value: 'y', label: 'Hanya yang selisih' }, { value: 'n', label: 'Hanya yang cocok' }] }
      ],
      filterOn: function (p, k, v) {
        var e = DB.byCode[p.code];
        if (k === 'div') return e && e.division === v;
        if (k === 'ter') return p.calc.terCategory === v;
        if (k === 'flag') return v === 'y' ? p.flagged : !p.flagged;
        return true;
      },
      defaultSort: 'code',
      actions: '<button class="btn btn-sm" data-export>' + icon('download', 13) + 'Unduh rekap</button>',
      columns: [
        { key: 'code', label: 'ID', cls: 'col-code', value: function (p) { return p.code; }, render: function (p) { return esc(p.code); } },
        { key: 'name', label: 'Nama', cls: 'col-name', value: function (p) { return (DB.byCode[p.code] || {}).name; },
          render: function (p) { return esc((DB.byCode[p.code] || {}).name || '—'); } },
        { key: 'ptkp', label: 'PTKP', value: function (p) { return (DB.byCode[p.code] || {}).ptkp; },
          render: function (p) {
            return '<span class="chip">' + esc((DB.byCode[p.code] || {}).ptkp) + ' · ' + p.calc.terCategory + '</span>';
          } },
        { key: 'pokok', label: 'Gaji pokok', cls: 'col-num', value: function (p) { return p.calc.pokok; },
          render: function (p) { return UI.rupiah(p.calc.pokok); } },
        { key: 'lembur', label: 'Lembur', cls: 'col-num', value: function (p) { return p.calc.lembur; },
          render: function (p) {
            return UI.rupiah(p.calc.lembur) + '<div style="font-size:10.5px;color:var(--faint)">' + p.calc.lemburJam + ' jam</div>';
          } },
        { key: 'bruto', label: 'Bruto', cls: 'col-num', value: function (p) { return p.calc.bruto; },
          render: function (p) { return '<b style="font-weight:600">' + UI.rupiah(p.calc.bruto) + '</b>'; } },
        { key: 'bpjs', label: 'BPJS', cls: 'col-num', value: function (p) { return p.calc.jht + p.calc.jp + p.calc.kes; },
          render: function (p) {
            return '<span style="color:var(--muted)">' + UI.rupiah(p.calc.jht + p.calc.jp + p.calc.kes) + '</span>';
          } },
        { key: 'pph', label: 'PPh 21', cls: 'col-num', value: function (p) { return p.calc.pph; },
          render: function (p) {
            if (!p.calc.pph) return '<span style="color:var(--faint)">—</span>';
            return '<span style="color:var(--muted)">' + UI.rupiah(p.calc.pph) +
              '<div style="font-size:10.5px">' + (p.calc.terRate * 100).toFixed(2) + '%</div></span>';
          } },
        { key: 'netto', label: 'Diterima', cls: 'col-num', value: function (p) { return p.calc.netto; },
          render: function (p) { return '<b style="font-weight:600">' + UI.rupiah(p.calc.netto) + '</b>'; } },
        { key: 'chk', label: 'Cek silang', value: function (p) { return p.flagged ? 0 : 1; },
          render: function (p) {
            if (!p.flagged) return '<span class="badge b-sent"><i class="dot"></i>COCOK</span>';
            return '<span class="badge b-failed"><i class="dot"></i>SELISIH ' + UI.pct(p.gapPct, 1) + '%</span>';
          } },
        { key: 'act', label: '', cls: 'col-actions', render: function (p) {
          return '<button class="btn btn-sm" data-open="' + p.code + '">Rincian</button>';
        } }
      ],
      onRowClick: function (p) { employeeDrawer(p.code); },
      onRender: function (root) {
        qa('[data-open]', root).forEach(function (b) {
          b.addEventListener('click', function () { employeeDrawer(this.dataset.open); });
        });
        var ex = q('[data-export]', root);
        if (ex) ex.addEventListener('click', function () {
          UI.toast('Rekap disiapkan', 'Di sistem sungguhan berkas Excel akan terunduh.', 'info');
        });
      }
    });

    var host = UI.el('<div></div>');
    var head =
      '<p class="view-intro">Komponen gaji, potongan BPJS, dan PPh 21 untuk seluruh karyawan. ' +
      '<b>Angka resmi tetap berasal dari berkas payroll perusahaan.</b> Sistem menghitung ulang secara mandiri ' +
      'lalu membandingkannya — kalau selisihnya melebihi ambang, barisnya ditandai supaya HR memeriksa rumus di berkas. ' +
      'Ini fungsi pemeriksa, bukan pengganti perhitungan payroll.</p>' +

      '<div class="grid g-4" style="margin-bottom:16px">' +
      UI.kpi('Bruto seluruh karyawan', UI.rupiahShort(t.bruto), num(t.count) + ' karyawan', 'main') +
      UI.kpi('PPh 21 dipotong', UI.rupiahShort(t.pph),
        num(DB.payroll.filter(function (p) { return p.calc.pph > 0; }).length) + ' karyawan kena pajak', '') +
      UI.kpi('BPJS ditanggung karyawan', UI.rupiahShort(t.bpjsEmployee), 'JHT, JP, dan Kesehatan', '') +
      UI.kpi('BPJS ditanggung perusahaan', UI.rupiahShort(t.bpjsEmployer), 'Di luar gaji karyawan', 'warn') +
      '</div>';

    if (flagged.length) {
      head += '<div style="margin-bottom:16px">' + UI.notice('n-bad',
        flagged.length + ' baris berselisih dari berkas payroll',
        'Sistem dan berkas Excel menghasilkan angka berbeda di ' + flagged.length + ' karyawan, di atas ambang ' +
        DB.rates.crossCheckTolerance + '%. Ini biasanya berarti ada rumus yang tidak tersalin saat berkas dibuat ' +
        'dari bulan sebelumnya. Periksa sebelum distribusi dijalankan.') + '</div>';
    } else {
      head += '<div style="margin-bottom:16px">' + UI.notice('n-ok',
        'Seluruh baris cocok dengan berkas payroll',
        'Tidak ada selisih di atas ambang ' + DB.rates.crossCheckTolerance + '%.') + '</div>';
    }

    if (!DB.rates.verified) {
      head += '<div style="margin-bottom:16px">' + UI.notice('n-warn',
        'Tarif potongan belum diverifikasi',
        'Sistem masih memakai tarif contoh. Sebelum dipakai sungguhan, HR wajib memeriksa dan mengisi ' +
        'tarif BPJS serta tabel TER PPh 21 yang berlaku di halaman pengaturan.') + '</div>';
    }

    host.innerHTML = head;
    host.appendChild(tbl.root);
    return { node: host };
  }

  /* =======================================================================
     3 · BATCH PAYROLL
     ======================================================================= */
  function batches() {
    var html = '<p class="view-intro">Setiap siklus distribusi dikemas sebagai satu batch. ' +
      'Batch tidak bisa dikirim sebelum lolos validasi dan disetujui orang kedua.</p>';

    html += '<div class="stack">';

    DB.batches.slice().reverse().forEach(function (b) {
      var isPending = b.status === 'VALIDATED';
      var s = b.id === 'PAY-SEP-2026' ? DB.summarise(DB.deliveries) : null;

      html += '<div class="card"><div class="card-head">' +
        '<div><h3>' + esc(b.id) + ' · ' + esc(b.label) + '</h3>' +
        '<p>' + (b.docType === 'PAYSLIP' ? 'Slip gaji' : 'Slip lembur') + ' · ' + b.total + ' karyawan · disiapkan oleh ' + esc(b.createdBy) + '</p></div>' +
        '<div class="spacer"></div>' + UI.badge(b.status) + '</div>';

      html += '<div class="card-body">';

      if (isPending && !b.validationClear) {
        html += UI.notice('n-warn', 'Empat kesalahan penghambat belum diselesaikan',
          'Tombol mulai distribusi terkunci sampai seluruh kesalahan penghambat selesai. ' +
          'Peringatan boleh dilewati, kesalahan penghambat tidak.') + '<div style="height:16px"></div>';
      } else if (isPending) {
        html += UI.notice('n-ok', 'Validasi bersih — batch siap dikirim',
          esc(b.note || 'Seluruh pemeriksaan penghambat lolos. Distribusi menunggu persetujuan.')) +
          '<div style="height:16px"></div>';
      }

      /* Nilai payroll batch, hanya untuk peran yang berhak */
      if (b.docType === 'PAYSLIP' && can('salaryDetail') && DB.periodTotals[b.period]) {
        var pt = DB.periodTotals[b.period];
        html += '<div class="metric-row" style="margin-bottom:16px;padding-bottom:16px;border-bottom:1px solid var(--line)">' +
          '<div class="metric"><span>Nilai payroll</span><b>' + UI.rupiahShort(pt.bruto) + '</b></div>' +
          '<div class="metric"><span>Dibayarkan</span><b>' + UI.rupiahShort(pt.netto) + '</b></div>' +
          '<div class="metric"><span>PPh 21</span><b>' + UI.rupiahShort(pt.pph) + '</b></div>' +
          '<div class="metric"><span>BPJS karyawan</span><b>' + UI.rupiahShort(pt.bpjsEmployee) + '</b></div>' +
          '</div>';
      }

      html += '<div class="metric-row" style="margin-bottom:14px">' +
        '<div class="metric"><span>Diproses</span><b>' + (s ? s.processed : b.processed) + '</b></div>' +
        '<div class="metric"><span>Berhasil</span><b style="color:var(--green)">' + (s ? s.delivered : b.sent) + '</b></div>' +
        '<div class="metric"><span>Gagal</span><b style="color:' + ((s ? s.failed : b.failed) ? 'var(--red)' : 'inherit') + '">' + (s ? s.failed : b.failed) + '</b></div>' +
        '<div class="metric"><span>Menunggu</span><b>' + (s ? s.pending : b.pending) + '</b></div>' +
        '<div class="metric"><span>Pengecualian</span><b>' + b.exception + '</b></div>' +
        '</div>';

      if (!isPending) {
        html += '<div class="defs" style="margin-bottom:14px">' +
          '<div class="def"><span>Mulai</span><b>' + UI.dateID(b.date) + ', ' + esc(b.start) + '</b></div>' +
          '<div class="def"><span>Selesai</span><b>' + esc(b.end) + '</b></div>' +
          '<div class="def"><span>Lama proses</span><b>' + b.durationMin + ' menit</b></div>' +
          '<div class="def"><span>Disetujui oleh</span><b>' + esc(b.approvedBy || '—') + '</b></div>' +
          '</div>';
      }

      html += '<div class="btn-row">';
      if (isPending) {
        html += '<a class="btn btn-sm" href="#/validation">' + icon('shield', 13) + 'Buka hasil validasi</a>';
        if (can('distribute')) {
          html += '<button class="btn btn-sm btn-primary" data-start="' + b.id + '"' +
            (b.validationClear ? '' : ' disabled title="Masih ada kesalahan penghambat"') + '>' +
            icon('send', 13) + (b.docType === 'PAYSLIP' ? 'Kirim slip gaji ke semua karyawan' : 'Kirim slip lembur ke semua karyawan') + '</button>';
          if (!b.validationClear) {
            html += '<button class="btn btn-sm" data-fix="' + b.id + '">Selesaikan kesalahan (demo)</button>';
          }
        } else {
          html += lockedBtn('Mulai distribusi', 'send');
        }
      } else {
        html += '<a class="btn btn-sm" href="#/tracking">' + icon('send', 13) + 'Lihat pengiriman</a>';
        if (b.failed && can('retry')) html += '<a class="btn btn-sm" href="#/failed">' + icon('refresh', 13) + 'Kirim ulang yang gagal</a>';
        html += '<button class="btn btn-sm" data-export="' + b.id + '">' + icon('download', 13) + 'Unduh laporan</button>';
      }
      html += '</div></div></div>';
    });

    html += '</div>';

    return {
      html: html,
      mount: function () {
        qa('[data-fix]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = this.dataset.fix;
            UI.modal({
              title: 'Tandai kesalahan sebagai selesai',
              sub: 'Langkah demo',
              body: '<p style="font-size:13px">Di sistem sungguhan, kesalahan penghambat diselesaikan dengan memperbaiki data sumber — ' +
                'mengunggah berkas yang hilang, memperbaiki penamaan, atau membetulkan periode — lalu menjalankan validasi ulang.</p>' +
                '<p style="font-size:13px;margin-bottom:0">Untuk keperluan demo, tombol ini melewati langkah tersebut supaya Anda bisa menunjukkan ' +
                'proses distribusi berjalan.</p>',
              confirm: 'Lanjutkan demo',
              onConfirm: function (close) {
                close();
                DB.validationIssues.forEach(function (i) { if (i.severity === 'BLOCKING') i.resolved = true; });
                var b = batchById(id);
                b.validationClear = true;
                UI.toast('Validasi bersih', 'Empat kesalahan penghambat ditandai selesai. Distribusi sekarang bisa dimulai.', 'ok');
                App.go('#/batches');
              }
            });
          });
        });

        qa('[data-start]').forEach(function (btn) {
          var b = batchById(btn.dataset.start);
          if (b && b.validationClear) {
            btn.disabled = false;
            btn.removeAttribute('title');
          }
          btn.addEventListener('click', function () { confirmDistribution(b); });
        });

        qa('[data-export]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            UI.toast('Laporan disiapkan', 'Di sistem sungguhan berkas Excel akan terunduh. Prototype tidak membuat berkas.', 'info');
          });
        });
      }
    };
  }

  /* ------------------------------------------- konfirmasi & distribusi -- */
  function confirmDistribution(b) {
    var target = b.total - b.exception;
    UI.modal({
      title: 'Konfirmasi distribusi',
      sub: b.id + ' · ' + b.label,
      body:
        UI.notice('n-warn', 'Anda akan mengirim ' + target + ' dokumen rahasia',
          'Email yang sudah terkirim tidak bisa ditarik kembali. Pastikan pemeriksaan acak sudah dilakukan ' +
          'dan validasi tidak menyisakan kesalahan penghambat.') +
        '<div style="margin-top:16px" class="defs">' +
        '<div class="def"><span>Penerima</span><b>' + target + ' karyawan</b></div>' +
        '<div class="def"><span>Pengecualian</span><b>' + b.exception + ' tanpa email</b></div>' +
        '<div class="def"><span>Pengirim</span><b>' + esc(DB.settings.sender) + '</b></div>' +
        '<div class="def"><span>Laju kirim</span><b>' + DB.settings.throttle + ' per menit</b></div>' +
        '</div>' +
        '<label style="display:flex;gap:9px;margin-top:18px;font-size:12.5px;align-items:flex-start;cursor:pointer">' +
        '<input type="checkbox" id="ackCheck" style="margin-top:2px;min-height:0"> ' +
        '<span>Saya sudah memeriksa lima slip secara acak dan memastikan isinya cocok dengan karyawan yang bersangkutan.</span></label>',
      confirm: 'Mulai distribusi',
      danger: false,
      onConfirm: function (close) {
        var ack = q('#ackCheck');
        if (!ack || !ack.checked) {
          UI.toast('Belum dikonfirmasi', 'Centang pernyataan pemeriksaan acak sebelum melanjutkan.', 'bad');
          return;
        }
        close();
        runDistribution(b);
      }
    });
  }

  function runDistribution(b) {
    var targets = DB.employees.filter(function (e) { return !!e.email; });
    var total = targets.length;

    var m = UI.modal({
      title: 'Distribusi berjalan',
      sub: b.id + ' · ' + b.label,
      wide: true,
      body:
        '<div class="run-stat">' +
        '<div><span>Terkirim</span><b id="rSent">0</b></div>' +
        '<div><span>Gagal</span><b id="rFail" style="color:var(--red)">0</b></div>' +
        '<div><span>Sisa antrian</span><b id="rLeft">' + total + '</b></div>' +
        '<div><span>Waktu berjalan</span><b id="rTime">0:00</b></div>' +
        '</div>' +
        '<div class="segbar" style="height:11px"><span class="seg-sent" id="rBarOk" style="width:0"></span>' +
        '<span class="seg-failed" id="rBarBad" style="width:0"></span></div>' +
        '<div class="board" id="runBoard" style="margin-top:14px">' +
        targets.map(function (t) { return '<i data-s="QUEUED" data-code="' + t.code + '"></i>'; }).join('') +
        '</div>' +
        '<div class="run-log" id="runLog"></div>',
      cancel: 'Jalankan di latar belakang'
    });

    var cells = qa('#runBoard i', m.root);
    var log = q('#runLog', m.root);
    var i = 0, sent = 0, failed = 0, t0 = Date.now();

    var clock = setInterval(function () {
      var s = Math.floor((Date.now() - t0) / 1000);
      var n1 = q('#rTime', m.root);
      if (n1) n1.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    }, 1000);

    var timer = setInterval(function () {
      var burst = 4;
      while (burst-- > 0 && i < total) {
        var emp = targets[i];
        var bad = (i % 61 === 47);
        cells[i].dataset.s = bad ? 'FAILED' : 'SENT';
        cells[i].classList.add('is-fresh');
        cells[i].title = emp.name + ' · ' + emp.code;
        if (bad) {
          failed++;
          log.insertAdjacentHTML('afterbegin',
            '<div class="l-bad">' + esc(emp.code) + ' — ditolak server penerima, masuk antrian kirim ulang</div>');
        } else {
          sent++;
          if (i % 7 === 0) {
            log.insertAdjacentHTML('afterbegin',
              '<div><b>' + esc(emp.code) + '</b> — diterima server tujuan</div>');
          }
        }
        i++;
      }

      var e1 = q('#rSent', m.root), e2 = q('#rFail', m.root), e3 = q('#rLeft', m.root);
      if (e1) e1.textContent = num(sent);
      if (e2) e2.textContent = num(failed);
      if (e3) e3.textContent = num(total - i);
      var b1 = q('#rBarOk', m.root), b2 = q('#rBarBad', m.root);
      if (b1) b1.style.width = (sent / total * 100) + '%';
      if (b2) b2.style.width = (failed / total * 100) + '%';

      if (i >= total) {
        clearInterval(timer);
        clearInterval(clock);
        finishDistribution(b, sent, failed, m);
      }
    }, 90);
  }

  function finishDistribution(b, sent, failed, m) {
    b.status = 'COMPLETED';
    b.processed = sent + failed;
    b.sent = sent;
    b.failed = failed;
    b.pending = 0;
    b.date = '2026-09-23';
    b.start = '09:14';
    b.end = '09:31';
    b.durationMin = 17;
    b.approvedBy = App.user.name;

    DB.audit.unshift({
      ts: '2026-09-23 09:31', actor: 'Sistem', role: 'Sistem',
      action: 'Distribusi selesai', object: b.id, result: 'Berhasil',
      desc: sent + ' terkirim · ' + failed + ' gagal pada percobaan pertama'
    });
    DB.audit.unshift({
      ts: '2026-09-23 09:14', actor: App.user.name, role: App.user.role,
      action: 'Distribusi disetujui', object: b.id, result: 'Berhasil',
      desc: 'Persetujuan diberikan setelah pemeriksaan acak lima slip'
    });

    var foot = q('.modal-foot', m.root);
    if (foot) {
      foot.innerHTML = '<button class="btn" data-close2>Tutup</button>' +
        '<a class="btn btn-primary" href="#/failed" data-close2>Tangani ' + failed + ' yang gagal</a>';
      qa('[data-close2]', foot).forEach(function (x) {
        x.addEventListener('click', function () { m.close(); });
      });
    }
    UI.toast('Distribusi selesai',
      sent + (b.docType === 'PAYSLIP' ? ' slip gaji' : ' slip lembur') +
      ' terkirim, ' + failed + ' perlu dikirim ulang.', 'ok');
  }

  /* =======================================================================
     4 · IMPOR & PENCOCOKAN
     ======================================================================= */
  function matching() {
    var mt = DB.matching;
    var html = '<p class="view-intro">Langkah pertama setiap batch: menghubungkan berkas slip dengan karyawan pemiliknya. ' +
      'Sistem mencocokkan berdasarkan ID karyawan pada nama berkas — bukan berdasarkan nama orang, karena nama bisa kembar dan salah ketik.</p>';

    html += '<div class="grid g-4" style="margin-bottom:14px">' +
      UI.kpi('Berkas diterima', num(mt.filesFound), 'Diunggah sebagai satu arsip', 'main') +
      UI.kpi('Berhasil dicocokkan', num(mt.matched), 'Berdasarkan ID pada nama berkas', 'good') +
      UI.kpi('Belum cocok', num(mt.unmatched), 'Perlu ditugaskan manual', 'bad') +
      UI.kpi('Berkas ganda', num(mt.duplicates), 'Satu berkas hanya boleh satu penerima', 'good') +
      '</div>';

    html += '<div class="grid g-1-1" style="margin-bottom:14px">';

    html += '<div class="card"><div class="card-head"><div><h3>Sumber data batch</h3>' +
      '<p>Dua sumber, keduanya hanya dibaca — sistem tidak pernah menulis balik</p></div></div>' +
      '<div class="checklist">' +
      '<div class="check-row"><span class="tick tick-ok">' + icon('check', 11) + '</span>' +
      '<div><b>Arsip slip lembur</b><span>250 berkas PDF, penamaan Slip_Lembur_&lt;ID&gt;_&lt;periode&gt;.pdf</span></div>' +
      UI.badge('READY') + '</div>' +
      '<div class="check-row"><span class="tick tick-ok">' + icon('check', 11) + '</span>' +
      '<div><b>Lembar kerja lembur</b><span>' + esc(DB.settings.sheetUrl) + ' · terakhir disinkronkan 07:45</span></div>' +
      UI.badge('READY') + '</div>' +
      '<div class="check-row"><span class="tick tick-ok">' + icon('check', 11) + '</span>' +
      '<div><b>Master karyawan</b><span>252 ID aktif, terakhir diperbarui 19 September</span></div>' +
      UI.badge('READY') + '</div>' +
      '</div></div>';

    html += '<div class="card"><div class="card-head"><h3>Kenapa pencocokan pakai ID, bukan nama</h3></div>' +
      '<div class="card-body">' +
      '<p style="font-size:12.5px;color:var(--muted)">Pada data lama, berkas dinamai dengan nama karyawan. ' +
      'Cara itu gagal pada tiga kondisi yang semuanya nyata di lapangan:</p>' +
      '<ul style="font-size:12.5px;color:var(--muted);margin:0;padding-left:18px;line-height:1.85">' +
      '<li>nama kembar antar divisi</li>' +
      '<li>selisih spasi, gelar, atau urutan nama</li>' +
      '<li>karakter yang hilang saat berkas disimpan</li></ul>' +
      '<div style="margin-top:14px">' +
      UI.notice('n-info', 'Satu berkas, satu penerima',
        'Sistem menolak melanjutkan bila ada berkas yang terpakai untuk dua karyawan, ' +
        'atau ada karyawan yang menerima dua berkas berbeda.') + '</div>' +
      '</div></div>';

    html += '</div>';

    html += '<div class="card"><div class="card-head"><div><h3>Berkas yang belum cocok</h3>' +
      '<p>Harus diselesaikan sebelum batch bisa dijalankan</p></div></div>' +
      '<div class="table-scroll"><table class="data"><thead><tr>' +
      '<th>Nama berkas</th><th>Masalah</th><th>Saran sistem</th><th class="col-actions">Tindakan</th>' +
      '</tr></thead><tbody>' +
      mt.rows.map(function (r, i) {
        return '<tr><td class="col-code">' + esc(r.file) + '</td>' +
          '<td>' + esc(r.reason) + '</td>' +
          '<td style="color:var(--muted)">' + (r.suggestion ? esc(r.suggestion) : '<span class="chip">tidak ada saran</span>') + '</td>' +
          '<td class="col-actions">' +
          (can('distribute')
            ? '<button class="btn btn-sm" data-assign="' + i + '">Tugaskan manual</button>'
            : lockedBtn('Tugaskan manual')) +
          '</td></tr>';
      }).join('') +
      '</tbody></table></div></div>';

    return {
      html: html,
      mount: function () {
        qa('[data-assign]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var r = DB.matching.rows[Number(this.dataset.assign)];
            UI.modal({
              title: 'Tugaskan berkas manual',
              sub: r.file,
              body: '<div class="field" style="margin-bottom:14px"><label>Pilih karyawan penerima</label>' +
                '<select style="width:100%"><option>— pilih karyawan —</option>' +
                DB.employees.slice(0, 40).map(function (e) {
                  return '<option>' + esc(e.code + ' · ' + e.name + ' · ' + e.divisionName) + '</option>';
                }).join('') + '</select></div>' +
                UI.notice('n-warn', 'Penugasan manual selalu dicatat',
                  'Nama Anda, berkas, dan karyawan tujuan akan tercatat permanen di jejak audit. ' +
                  'Sistem sengaja tidak menebak sendiri untuk kasus seperti ini.'),
              confirm: 'Tugaskan dan catat',
              onConfirm: function (close) {
                close();
                UI.toast('Penugasan tercatat', 'Prototype tidak mengubah data sumber.', 'info');
              }
            });
          });
        });
      }
    };
  }

  /* =======================================================================
     5 · VALIDASI
     ======================================================================= */
  function validation() {
    var rules = DB.validationRules;
    var issues = DB.validationIssues.filter(function (i) { return !i.resolved; });
    var blocking = issues.filter(function (i) { return i.severity === 'BLOCKING'; }).length;
    var warnings = issues.length - blocking;
    var ready = 252 - issues.length;

    var html = '<p class="view-intro">Pemeriksaan wajib sebelum batch boleh dikirim. ' +
      'Peringatan boleh dilanjutkan; kesalahan penghambat tidak — tombol distribusi tetap terkunci sampai selesai.</p>';

    html += '<div class="grid g-4" style="margin-bottom:14px">' +
      UI.kpi('Data diperiksa', '252', 'Seluruh karyawan aktif', 'main') +
      UI.kpi('Siap dikirim', num(ready), 'Lolos semua pemeriksaan', 'good') +
      UI.kpi('Kesalahan penghambat', num(blocking), blocking ? 'Distribusi terkunci' : 'Tidak ada penghambat', blocking ? 'bad' : 'good') +
      UI.kpi('Peringatan', num(warnings), 'Boleh dilanjutkan', 'warn') +
      '</div>';

    if (blocking) {
      html += '<div style="margin-bottom:14px">' + UI.notice('n-bad',
        'Distribusi terkunci — ' + blocking + ' kesalahan penghambat',
        'Perbaiki data sumber lalu jalankan validasi ulang. Sistem sengaja tidak menyediakan cara melewati langkah ini, ' +
        'karena inilah satu-satunya pengaman sebelum ' + (252 - 5) + ' dokumen rahasia terkirim.') + '</div>';
    } else {
      html += '<div style="margin-bottom:14px">' + UI.notice('n-ok',
        'Seluruh pemeriksaan penghambat lolos',
        'Batch siap disetujui. Persetujuan harus diberikan oleh orang yang berbeda dari penyiap batch.') + '</div>';
    }

    html += '<div class="grid g-1-1">';

    html += '<div class="card"><div class="card-head"><div><h3>Daftar pemeriksaan</h3>' +
      '<p>Dijalankan otomatis setiap batch dibuat atau diperbarui</p></div></div><div class="checklist">' +
      rules.map(function (r) {
        var live = r.failed;
        if (blocking === 0 && r.severity === 'BLOCKING') live = 0;
        var cls = live === 0 ? 'tick-ok' : (r.severity === 'BLOCKING' ? 'tick-bad' : 'tick-warn');
        var ico = live === 0 ? 'check' : (r.severity === 'BLOCKING' ? 'x' : 'bang');
        return '<div class="check-row"><span class="tick ' + cls + '">' + icon(ico, 11) + '</span>' +
          '<div><b>' + esc(r.label) + '</b><span>' + r.checked + ' data diperiksa · ' +
          (live === 0 ? 'semua lolos' : live + ' tidak lolos') + '</span></div>' +
          '<span class="chip">' + (r.severity === 'BLOCKING' ? 'penghambat' : 'peringatan') + '</span></div>';
      }).join('') + '</div></div>';

    html += '<div class="card"><div class="card-head"><div><h3>Temuan</h3>' +
      '<p>' + (issues.length ? issues.length + ' hal perlu dilihat' : 'Tidak ada temuan') + '</p></div></div>';
    if (!issues.length) {
      html += '<div class="empty">' + icon('check', 30) + '<b>Tidak ada temuan</b>' +
        '<p>Seluruh 252 data lolos pemeriksaan. Batch siap disetujui dan dikirim.</p></div>';
    } else {
      html += '<div class="table-scroll"><table class="data"><thead><tr>' +
        '<th>Karyawan</th><th>Temuan</th><th>Tingkat</th></tr></thead><tbody>' +
        issues.map(function (i) {
          return '<tr><td><b style="font-weight:500">' + esc(i.name) + '</b>' +
            '<div class="col-code">' + esc(i.code) + '</div></td>' +
            '<td style="color:var(--muted)">' + esc(i.message) + '</td>' +
            '<td>' + UI.badge(i.severity) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    html += '</div></div>';

    html += '<div class="card" style="margin-top:14px"><div class="card-head"><h3>Pemeriksaan acak sebelum kirim</h3></div>' +
      '<div class="card-body">' +
      '<p style="font-size:12.5px;color:var(--muted);max-width:74ch">Validasi otomatis memeriksa struktur data, bukan isi dokumen. ' +
      'Karena itu sistem mewajibkan HR membuka lima slip secara acak dan mencocokkannya sendiri sebelum distribusi dimulai. ' +
      'Langkah ini murah, memakan waktu kurang dari dua menit, dan merupakan satu-satunya kendali terhadap kesalahan isi dokumen.</p>' +
      '<div class="btn-row" style="margin-top:12px">' +
      '<button class="btn btn-sm" data-sample>' + icon('file', 13) + 'Ambil lima slip acak</button>' +
      '<a class="btn btn-sm" href="#/batches">Kembali ke batch</a></div>' +
      '</div></div>';

    return {
      html: html,
      mount: function () {
        var s = q('[data-sample]');
        if (s) s.addEventListener('click', function () {
          var picks = [];
          for (var i = 0; i < 5; i++) picks.push(DB.employees[(i * 47 + 13) % DB.employees.length]);
          UI.modal({
            title: 'Pemeriksaan acak',
            sub: 'Lima slip dipilih acak oleh sistem',
            body: '<div class="table-scroll"><table class="data"><thead><tr>' +
              '<th>ID</th><th>Nama</th><th>Berkas</th></tr></thead><tbody>' +
              picks.map(function (e) {
                return '<tr><td class="col-code">' + esc(e.code) + '</td><td>' + esc(e.name) + '</td>' +
                  '<td class="col-code">Slip_Lembur_' + esc(e.code) + '_202609.pdf</td></tr>';
              }).join('') + '</tbody></table></div>' +
              '<div style="margin-top:14px">' + UI.notice('n-info', 'Buka setiap berkas dan cocokkan',
                'Pastikan nama dan ID di dalam dokumen sama dengan baris di tabel ini. Hasil pemeriksaan tercatat di jejak audit.') + '</div>',
            confirm: 'Sudah saya periksa',
            onConfirm: function (close) {
              close();
              UI.toast('Pemeriksaan tercatat', 'Lima slip diperiksa dan dicatat di jejak audit.', 'ok');
            }
          });
        });
      }
    };
  }

  /* =======================================================================
     6 · PELACAKAN PENGIRIMAN
     ======================================================================= */
  function tracking() {
    var rows = DB.deliveries;
    var s = DB.summarise(rows);

    var t = UI.dataTable({
      rows: rows,
      pageSize: 15,
      searchPlaceholder: 'Cari nama, ID, atau email…',
      searchOn: function (r) {
        var e = DB.byCode[r.code];
        return r.code + ' ' + (e ? e.name + ' ' + e.divisionName : '') + ' ' + (r.email || '');
      },
      filters: [
        { key: 'div', label: 'Semua divisi', options: DB.divisions.map(function (d) { return { value: d.key, label: d.name }; }) },
        { key: 'st', label: 'Semua status', options: [
          { value: 'SENT', label: 'Terkirim' },
          { value: 'RETRY_SUCCESS', label: 'Berhasil setelah kirim ulang' },
          { value: 'PENDING', label: 'Menunggu' },
          { value: 'FAILED', label: 'Gagal' },
          { value: 'EXCEPTION', label: 'Pengecualian' }
        ] },
        { key: 'per', label: 'Periode September 2026', options: [{ value: 'SEP-2026', label: 'September 2026' }] }
      ],
      filterOn: function (r, k, v) {
        if (k === 'st') return r.status === v;
        if (k === 'div') { var e = DB.byCode[r.code]; return e && e.division === v; }
        return true;
      },
      defaultSort: 'code',
      columns: [
        { key: 'code', label: 'ID', cls: 'col-code', value: function (r) { return r.code; }, render: function (r) { return esc(r.code); } },
        { key: 'name', label: 'Nama', cls: 'col-name', value: function (r) { return (DB.byCode[r.code] || {}).name; },
          render: function (r) { return esc((DB.byCode[r.code] || {}).name || '—'); } },
        { key: 'div', label: 'Divisi', value: function (r) { return (DB.byCode[r.code] || {}).divisionName; },
          render: function (r) { return '<span style="color:var(--muted)">' + esc((DB.byCode[r.code] || {}).divisionName || '') + '</span>'; } },
        { key: 'email', label: 'Email', cls: 'col-email', value: function (r) { return r.email || 'zzz'; },
          render: function (r) { return r.email ? esc(r.email) : '<span class="chip">belum ada</span>'; } },
        { key: 'doc', label: 'Berkas', value: function (r) { return r.payslipStatus; }, render: function (r) { return UI.badge(r.payslipStatus); } },
        { key: 'mail', label: 'Email', value: function (r) { return r.emailStatus; }, render: function (r) { return UI.badge(r.emailStatus); } },
        { key: 'st', label: 'Pengiriman', value: function (r) { return r.status; }, render: function (r) { return UI.badge(r.status); } },
        { key: 'time', label: 'Waktu kirim', value: function (r) { return r.sentAt || 'zz'; },
          render: function (r) { return r.sentAt ? '<span class="col-code">' + esc(r.sentAt) + '</span>' : '<span style="color:var(--faint)">—</span>'; } },
        { key: 'try', label: 'Ulang', cls: 'col-num', value: function (r) { return r.retryCount; }, render: function (r) { return r.retryCount || '—'; } },
        { key: 'act', label: '', cls: 'col-actions', render: function (r) {
          var b = '<button class="btn btn-sm" data-view="' + r.code + '">Detail</button>';
          if (r.status === 'FAILED' && can('retry')) {
            b += ' <button class="btn btn-sm btn-primary" data-retry="' + r.code + '">Kirim ulang</button>';
          }
          return b;
        } }
      ],
      onRowClick: function (r) { employeeDrawer(r.code); },
      onRender: function (root) {
        qa('[data-view]', root).forEach(function (b) {
          b.addEventListener('click', function () { employeeDrawer(this.dataset.view); });
        });
        qa('[data-retry]', root).forEach(function (b) {
          b.addEventListener('click', function () { retryOne(this.dataset.retry); });
        });
      }
    });

    var host = UI.el('<div></div>');
    host.innerHTML =
      '<p class="view-intro">Satu baris untuk satu karyawan. Status di kolom pengiriman diambil dari jawaban server penerima, ' +
      'bukan dari asumsi sistem. Pengiriman yang dipantulkan akan berubah statusnya sendiri dalam beberapa menit sampai beberapa jam.</p>' +
      '<div class="grid g-4" style="margin-bottom:14px">' +
      UI.kpi('Terkirim', num(s.sent), 'Diterima server tujuan', 'good') +
      UI.kpi('Berhasil setelah ulang', num(s.retrySuccess), 'Gagal di percobaan pertama', 'good') +
      UI.kpi('Menunggu', num(s.pending), 'Masih dalam antrian', 'warn') +
      UI.kpi('Gagal', num(s.failed), 'Butuh tindakan HR', s.failed ? 'bad' : 'good') +
      '</div>';
    host.appendChild(t.root);
    return { html: host.innerHTML, node: host };
  }

  function retryOne(code) {
    var e = DB.byCode[code];
    UI.modal({
      title: 'Kirim ulang',
      sub: e.name + ' · ' + e.code,
      body: '<p style="font-size:13px">Sistem akan menyusun ulang pesan dan mengirimkannya sekali lagi ke <b>' + esc(e.email) + '</b>.</p>' +
        '<p style="font-size:13px;margin-bottom:0;color:var(--muted)">Percobaan kirim ulang punya batas ' + DB.settings.retryMax +
        ' kali dengan jeda ' + DB.settings.retryDelay + ' menit. Setelah itu kasusnya harus ditangani manual.</p>',
      confirm: 'Kirim ulang sekarang',
      onConfirm: function (close) {
        close();
        var row = DB.deliveries.filter(function (r) { return r.code === code; })[0];
        if (row) {
          row.status = 'RETRY_SUCCESS';
          row.emailStatus = 'ACCEPTED';
          row.retryCount++;
          row.sentAt = '09:47';
          row.sentDate = '2026-09-23';
          row.errorCode = null;
        }
        DB.audit.unshift({
          ts: '2026-09-23 09:47', actor: App.user.name, role: App.user.role,
          action: 'Kirim ulang dijalankan', object: code, result: 'Berhasil',
          desc: 'Satu pengiriman gagal dikirim ulang dan diterima server tujuan'
        });
        UI.toast('Berhasil dikirim ulang', e.name + ' sudah menerima slipnya.', 'ok');
        App.rerender();
      }
    });
  }

  /* =======================================================================
     7 · PUSAT KIRIM ULANG
     ======================================================================= */
  function failed() {
    var rows = DB.deliveries.filter(function (r) { return r.status === 'FAILED'; });

    if (!rows.length) {
      return {
        html: '<div class="card"><div class="empty">' + icon('check', 34) +
          '<b>Tidak ada pengiriman yang gagal</b>' +
          '<p>Seluruh slip pada batch berjalan sudah diterima server tujuan. ' +
          'Halaman ini akan terisi sendiri bila ada laporan pantulan yang masuk.</p>' +
          '<div style="margin-top:14px"><a class="btn btn-sm" href="#/tracking">Lihat seluruh pengiriman</a></div>' +
          '</div></div>'
      };
    }

    var grouped = {};
    rows.forEach(function (r) {
      var k = r.errorCode || 'UNKNOWN';
      grouped[k] = (grouped[k] || 0) + 1;
    });

    var html = '<p class="view-intro">Kegagalan dikelompokkan menurut penyebab, karena penanganannya berbeda. ' +
      'Kotak masuk penuh cukup dikirim ulang; berkas yang hilang harus diperbaiki di sumbernya dulu.</p>';

    html += '<div class="grid g-4" style="margin-bottom:14px">' +
      UI.kpi('Perlu ditangani', num(rows.length), 'Pada batch September', 'bad') +
      UI.kpi('Bisa langsung dikirim ulang', num(rows.filter(function (r) {
        return r.errorCode === 'MAILBOX_FULL' || r.errorCode === 'SYSTEM_ERROR' || r.errorCode === 'REJECTED';
      }).length), 'Penyebabnya sementara', 'warn') +
      UI.kpi('Butuh perbaikan data', num(rows.filter(function (r) {
        return r.errorCode === 'INVALID_EMAIL' || r.errorCode === 'PAYSLIP_MISSING' || r.errorCode === 'MISMATCH';
      }).length), 'Kirim ulang tidak akan menolong', 'bad') +
      UI.kpi('Sudah berhasil hari ini', num(DB.deliveries.filter(function (r) { return r.status === 'RETRY_SUCCESS'; }).length),
        'Lewat kirim ulang', 'good') +
      '</div>';

    html += '<div class="card"><div class="card-head"><div><h3>Daftar kegagalan</h3>' +
      '<p>Pilih beberapa baris untuk dikirim ulang sekaligus</p></div><div class="spacer"></div>' +
      (can('retry')
        ? '<button class="btn btn-sm" data-retry-sel>' + icon('refresh', 13) + 'Kirim ulang terpilih</button>' +
          '<button class="btn btn-sm btn-primary" data-retry-all>' + icon('refresh', 13) + 'Kirim ulang semua yang bisa</button>'
        : lockedBtn('Kirim ulang', 'refresh')) +
      '</div>';

    html += '<div class="table-scroll"><table class="data"><thead><tr>' +
      '<th style="width:32px"><input type="checkbox" data-all style="min-height:0"></th>' +
      '<th>Karyawan</th><th>Email</th><th>Penyebab</th><th>Percobaan</th><th>Terakhir dicoba</th>' +
      '<th class="col-actions">Tindakan</th></tr></thead><tbody>';

    rows.forEach(function (r) {
      var e = DB.byCode[r.code];
      var f = DB.failByCode[r.errorCode] || { label: r.errorCode, detail: '' };
      var fixable = ['MAILBOX_FULL', 'SYSTEM_ERROR', 'REJECTED'].indexOf(r.errorCode) > -1;
      html += '<tr>' +
        '<td><input type="checkbox" data-pick="' + r.code + '" style="min-height:0"' + (fixable ? '' : ' disabled') + '></td>' +
        '<td><b style="font-weight:500">' + esc(e.name) + '</b><div class="col-code">' + esc(e.code) + ' · ' + esc(e.divisionName) + '</div></td>' +
        '<td class="col-email">' + esc(r.email || '—') + '</td>' +
        '<td><b style="font-weight:500">' + esc(f.label) + '</b><div style="color:var(--muted);font-size:11.5px">' + esc(f.detail) + '</div></td>' +
        '<td class="col-num">' + r.retryCount + ' / ' + DB.settings.retryMax + '</td>' +
        '<td class="col-code">' + esc(r.lastAttempt || '—') + '</td>' +
        '<td class="col-actions">' +
        (can('retry')
          ? (fixable
            ? '<button class="btn btn-sm btn-primary" data-retry="' + r.code + '">Kirim ulang</button>'
            : '<button class="btn btn-sm" data-fixfirst="' + r.code + '">Perbaiki dulu</button>')
          : lockedBtn('Kirim ulang')) +
        '</td></tr>';
    });

    html += '</tbody></table></div></div>';

    return {
      html: html,
      mount: function () {
        var all = q('[data-all]');
        if (all) all.addEventListener('change', function () {
          var on = this.checked;
          qa('[data-pick]').forEach(function (c) { if (!c.disabled) c.checked = on; });
        });

        qa('[data-retry]').forEach(function (b) {
          b.addEventListener('click', function () { retryOne(this.dataset.retry); });
        });

        qa('[data-fixfirst]').forEach(function (b) {
          b.addEventListener('click', function () {
            var r = DB.deliveries.filter(function (x) { return x.code === b.dataset.fixfirst; })[0];
            var f = DB.failByCode[r.errorCode];
            UI.modal({
              title: 'Kirim ulang tidak akan menolong',
              sub: (DB.byCode[r.code] || {}).name,
              body: UI.notice('n-bad', f.label, '<span style="font-size:12.5px">' + esc(f.detail) + '</span>') +
                '<p style="font-size:13px;margin-top:14px">Penyebabnya ada di data, bukan di pengiriman. ' +
                'Mengirim ulang pesan yang sama akan gagal dengan cara yang sama.</p>' +
                '<p style="font-size:13px;margin-bottom:0;color:var(--muted)"><b>Langkah yang benar:</b> ' +
                (r.errorCode === 'INVALID_EMAIL' ? 'perbaiki alamat email karyawan di master, lalu jalankan validasi ulang.'
                  : r.errorCode === 'PAYSLIP_MISSING' ? 'unggah berkas slip yang hilang ke batch, lalu jalankan validasi ulang.'
                  : 'perbaiki penamaan atau isi berkas di sumbernya, lalu jalankan validasi ulang.') + '</p>',
              cancel: 'Mengerti'
            });
          });
        });

        var sel = q('[data-retry-sel]');
        if (sel) sel.addEventListener('click', function () {
          var picked = qa('[data-pick]').filter(function (c) { return c.checked; });
          if (!picked.length) { UI.toast('Belum ada yang dipilih', 'Centang minimal satu baris.', 'bad'); return; }
          bulkRetry(picked.map(function (c) { return c.dataset.pick; }));
        });

        var allBtn = q('[data-retry-all]');
        if (allBtn) allBtn.addEventListener('click', function () {
          var codes = qa('[data-pick]').filter(function (c) { return !c.disabled; }).map(function (c) { return c.dataset.pick; });
          if (!codes.length) { UI.toast('Tidak ada yang bisa dikirim ulang', 'Semua kegagalan butuh perbaikan data dulu.', 'bad'); return; }
          bulkRetry(codes);
        });
      }
    };
  }

  function bulkRetry(codes) {
    UI.modal({
      title: 'Kirim ulang ' + codes.length + ' pengiriman',
      body: '<p style="font-size:13px">Sistem akan mengirim ulang ke ' + codes.length +
        ' karyawan dengan jeda ' + DB.settings.retryDelay + ' menit antar percobaan bila kembali gagal.</p>' +
        '<div class="table-scroll" style="max-height:200px"><table class="data"><tbody>' +
        codes.map(function (c) {
          var e = DB.byCode[c];
          return '<tr><td>' + esc(e.name) + '</td><td class="col-email">' + esc(e.email) + '</td></tr>';
        }).join('') + '</tbody></table></div>',
      confirm: 'Kirim ulang semua',
      onConfirm: function (close) {
        close();
        codes.forEach(function (c) {
          var row = DB.deliveries.filter(function (r) { return r.code === c; })[0];
          if (row) {
            row.status = 'RETRY_SUCCESS';
            row.emailStatus = 'ACCEPTED';
            row.retryCount++;
            row.sentAt = '09:52';
            row.errorCode = null;
          }
        });
        DB.audit.unshift({
          ts: '2026-09-23 09:52', actor: App.user.name, role: App.user.role,
          action: 'Kirim ulang dijalankan', object: 'PAY-SEP-2026', result: 'Berhasil',
          desc: codes.length + ' pengiriman gagal dikirim ulang, semuanya diterima server tujuan'
        });
        UI.toast('Selesai', codes.length + ' pengiriman berhasil dikirim ulang.', 'ok');
        App.rerender();
      }
    });
  }

  /* =======================================================================
     8 · DAFTAR PENGECUALIAN
     ======================================================================= */
  function exceptions() {
    var rows = DB.deliveries.filter(function (r) { return r.status === 'EXCEPTION'; });

    var html = '<p class="view-intro">Karyawan yang tidak bisa dikirimi email. Mereka sengaja dipisahkan dari angka kegagalan, ' +
      'karena ini bukan kesalahan sistem — slipnya dicetak dan diserahkan langsung, lalu serah terimanya dicatat di sini. ' +
      'Tanpa pemisahan ini, tingkat keberhasilan akan selamanya terlihat buruk padahal seluruh karyawan sudah menerima slipnya.</p>';

    html += '<div class="grid g-3" style="margin-bottom:14px">' +
      UI.kpi('Masuk pengecualian', num(rows.length), 'Belum punya alamat email', 'warn') +
      UI.kpi('Sudah diserahkan', num(rows.length), 'Cetak dan serah terima tercatat', 'good') +
      UI.kpi('Potensi jika email dibuat', '100%', 'Tingkat keberhasilan naik dari ' +
        UI.pct(DB.summarise(DB.deliveries).rate) + '%', 'main') +
      '</div>';

    html += '<div class="card"><div class="card-head"><div><h3>Penanganan manual</h3>' +
      '<p>Setiap serah terima dicatat agar tetap ada jejak audit</p></div></div>' +
      '<div class="table-scroll"><table class="data"><thead><tr>' +
      '<th>Karyawan</th><th>Divisi</th><th>Alasan</th><th>Cara penyerahan</th><th>Status</th>' +
      '<th class="col-actions">Tindakan</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var e = DB.byCode[r.code];
        return '<tr><td><b style="font-weight:500">' + esc(e.name) + '</b>' +
          '<div class="col-code">' + esc(e.code) + '</div></td>' +
          '<td style="color:var(--muted)">' + esc(e.divisionName) + '</td>' +
          '<td>' + esc(e.exceptionReason || 'Tidak ada alamat email') + '</td>' +
          '<td>Cetak dan serahkan langsung</td>' +
          '<td><span class="badge b-sent"><i class="dot"></i>DISERAHKAN</span></td>' +
          '<td class="col-actions">' +
          '<button class="btn btn-sm" data-print="' + e.code + '">' + icon('print', 13) + 'Cetak ulang</button>' +
          '</td></tr>';
      }).join('') + '</tbody></table></div></div>';

    html += '<div style="margin-top:14px">' + UI.notice('n-info',
      'Rekomendasi untuk manajemen',
      'Kelima karyawan ini bekerja di divisi lapangan dan akunnya belum dibuat. ' +
      'Pembuatan lima akun email akan menghilangkan seluruh pekerjaan manual pada halaman ini ' +
      'dan menaikkan tingkat keberhasilan distribusi menjadi 100 persen.') + '</div>';

    return {
      html: html,
      mount: function () {
        qa('[data-print]').forEach(function (b) {
          b.addEventListener('click', function () {
            UI.toast('Slip disiapkan untuk dicetak', 'Serah terima akan dicatat setelah ditandatangani.', 'info');
          });
        });
      }
    };
  }

  /* =======================================================================
     9 · JEJAK AUDIT
     ======================================================================= */
  function audit() {
    var actions = [];
    DB.audit.forEach(function (a) { if (actions.indexOf(a.action) < 0) actions.push(a.action); });
    var actors = [];
    DB.audit.forEach(function (a) { if (actors.indexOf(a.actor) < 0) actors.push(a.actor); });

    var t = UI.dataTable({
      rows: DB.audit,
      pageSize: 20,
      searchPlaceholder: 'Cari tindakan, pelaku, atau objek…',
      searchOn: function (a) { return a.ts + ' ' + a.actor + ' ' + a.action + ' ' + a.object + ' ' + a.desc; },
      filters: [
        { key: 'act', label: 'Semua tindakan', options: actions },
        { key: 'who', label: 'Semua pelaku', options: actors },
        { key: 'res', label: 'Semua hasil', options: ['Berhasil', 'Gagal'] }
      ],
      filterOn: function (a, k, v) {
        if (k === 'act') return a.action === v;
        if (k === 'who') return a.actor === v;
        if (k === 'res') return a.result === v;
        return true;
      },
      columns: [
        { key: 'ts', label: 'Waktu', cls: 'col-code', value: function (a) { return a.ts; }, render: function (a) { return esc(a.ts); } },
        { key: 'actor', label: 'Pelaku', value: function (a) { return a.actor; },
          render: function (a) { return '<b style="font-weight:500">' + esc(a.actor) + '</b><div style="font-size:11px;color:var(--muted)">' + esc(a.role) + '</div>'; } },
        { key: 'action', label: 'Tindakan', value: function (a) { return a.action; }, render: function (a) { return esc(a.action); } },
        { key: 'obj', label: 'Objek', cls: 'col-code', value: function (a) { return a.object; }, render: function (a) { return esc(a.object); } },
        { key: 'res', label: 'Hasil', value: function (a) { return a.result; },
          render: function (a) { return '<span class="badge ' + (a.result === 'Berhasil' ? 'b-sent' : 'b-failed') + '"><i class="dot"></i>' + esc(a.result.toUpperCase()) + '</span>'; } },
        { key: 'desc', label: 'Keterangan', render: function (a) { return '<span style="color:var(--muted)">' + esc(a.desc) + '</span>'; } }
      ]
    });

    var host = UI.el('<div></div>');
    host.innerHTML =
      '<p class="view-intro">Catatan tidak bisa diubah atau dihapus dari antarmuka, termasuk oleh Super Admin. ' +
      'Inilah yang akan diminta auditor ketika menanyakan siapa mengirim apa, kepada siapa, dan kapan.</p>' +
      '<div style="margin-bottom:14px">' +
      UI.notice('n-info', 'Catatan disimpan 24 bulan',
        'Berkas slip sendiri dihapus otomatis setelah ' + DB.settings.retentionDocs +
        ' bulan, tetapi jejak auditnya tetap tersimpan jauh lebih lama.') + '</div>';
    host.appendChild(t.root);
    return { html: host.innerHTML, node: host };
  }

  /* =======================================================================
     10 · KESEHATAN SISTEM & DUKUNGAN
     ======================================================================= */
  function health() {
    var h = DB.health;
    var m = h.monthly;

    var html = '<p class="view-intro">Halaman ini memperlihatkan isi layanan bulanan: pemantauan siklus payroll, ' +
      'penanganan kegagalan, pemeliharaan, dan laporan. Angka di sini yang menjelaskan untuk apa biaya bulanan dibayarkan.</p>';

    html += '<div class="grid g-4" style="margin-bottom:14px">' +
      UI.kpi('Ketersediaan sistem', UI.pct(h.availability, 2) + '%', '30 hari terakhir', 'good') +
      UI.kpi('Email diproses', num(h.emailsProcessed), 'Siklus ' + esc(h.lastCycle), 'main') +
      UI.kpi('Masalah diselesaikan', num(h.resolvedIssues), h.openTickets + ' tiket masih terbuka', 'good') +
      UI.kpi('Cadangan terakhir', esc(h.lastBackup.split(',')[0]), 'Ukuran ' + esc(h.backupSize), 'good') +
      '</div>';

    html += '<div class="grid g-1-1" style="margin-bottom:14px">';

    html += '<div class="card"><div class="card-head"><h3>Pemeliharaan</h3></div><div class="card-body">' +
      '<div class="defs">' +
      '<div class="def"><span>Pemeliharaan terakhir</span><b>' + esc(h.lastMaintenance) + '</b></div>' +
      '<div class="def"><span>Pemeliharaan berikutnya</span><b>' + esc(h.nextMaintenance) + '</b></div>' +
      '<div class="def"><span>Uji pemulihan cadangan</span><b>' + esc(h.restoreTested) + '</b></div>' +
      '<div class="def"><span>Penggunaan penyimpanan</span><b>' + h.diskUsed + '%</b></div>' +
      '<div class="def"><span>Antrian pengiriman</span><b>' + h.queueDepth + ' pesan</b></div>' +
      '<div class="def"><span>Koneksi Google Workspace</span><b style="color:var(--green)">' + esc(DB.settings.connection) + '</b></div>' +
      '</div>' +
      '<div style="margin-top:14px">' + UI.notice('n-ok', 'Cadangan diuji, bukan hanya dibuat',
        'Cadangan yang tidak pernah diuji pemulihannya tidak bisa disebut cadangan. ' +
        'Uji pemulihan dijalankan sekali setiap bulan sebagai bagian dari layanan.') + '</div>' +
      '</div></div>';

    html += '<div class="card"><div class="card-head"><div><h3>Tiket dukungan</h3>' +
      '<p>Empat tiket dalam 30 hari terakhir</p></div></div>' +
      '<div class="activity">' +
      h.tickets.map(function (t) {
        return '<div class="act-row" style="grid-template-columns:1fr auto">' +
          '<div class="act-body"><b>' + esc(t.title) + '</b>' +
          '<span>' + esc(t.id) + ' · ' + esc(t.date) + ' · ditangani dalam ' + esc(t.sla) + '</span>' +
          '<span style="margin-top:3px">' + esc(t.note) + '</span></div>' +
          '<span class="badge ' + (t.status === 'Selesai' ? 'b-sent' : 'b-pending') + '"><i class="dot"></i>' + esc(t.status.toUpperCase()) + '</span>' +
          '</div>';
      }).join('') + '</div></div>';

    html += '</div>';

    html += '<div class="card"><div class="card-head"><div><h3>Laporan layanan bulanan · ' + esc(m.period) + '</h3>' +
      '<p>Dikirimkan otomatis ke manajemen setiap akhir bulan</p></div>' +
      '<div class="spacer"></div><button class="btn btn-sm" data-report>' + icon('download', 13) + 'Unduh PDF</button></div>' +
      '<div class="card-body">' +
      '<div class="metric-row" style="margin-bottom:18px">' +
      '<div class="metric"><span>Siklus payroll</span><b>' + m.cycles + '</b></div>' +
      '<div class="metric"><span>Dokumen terkirim</span><b>' + num(m.docsDelivered) + '</b></div>' +
      '<div class="metric"><span>Masalah ditemukan</span><b>' + m.issuesFound + '</b></div>' +
      '<div class="metric"><span>Masalah diselesaikan</span><b>' + m.issuesResolved + '</b></div>' +
      '<div class="metric"><span>Kirim ulang</span><b>' + m.retries + '</b></div>' +
      '</div>' +
      '<div class="grid g-1-1">' +
      '<div><h4 style="font-size:12.5px;margin-bottom:8px">Perubahan sistem bulan ini</h4>' +
      '<ul style="font-size:12.5px;color:var(--muted);margin:0;padding-left:18px;line-height:1.9">' +
      m.changes.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h4 style="font-size:12.5px;margin-bottom:8px">Rekomendasi</h4>' +
      '<ul style="font-size:12.5px;color:var(--muted);margin:0;padding-left:18px;line-height:1.9">' +
      m.recommendations.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') + '</ul></div>' +
      '</div></div></div>';

    return {
      html: html,
      mount: function () {
        var r = q('[data-report]');
        if (r) r.addEventListener('click', function () {
          UI.toast('Laporan disiapkan', 'Di sistem sungguhan laporan PDF akan terunduh dan terkirim ke manajemen.', 'info');
        });
      }
    };
  }

  /* =======================================================================
     11 · PENGATURAN
     ======================================================================= */
  function settings() {
    var s = DB.settings;
    var readOnly = !can('settings');

    var html = '';

    if (readOnly) {
      html += '<div style="margin-bottom:14px">' + UI.notice('n-warn', 'Hanya bisa dilihat',
        'Peran Anda tidak memiliki akses untuk mengubah pengaturan. Hubungi Super Admin bila ada yang perlu disesuaikan.') + '</div>';
    }

    html += '<div class="grid g-1-1">';

    /* Email */
    html += '<div class="card"><div class="card-head"><div><h3>Pengiriman email</h3>' +
      '<p>Terhubung ke Google Workspace milik perusahaan</p></div></div><div class="card-body">' +
      '<div class="defs" style="margin-bottom:16px">' +
      '<div class="def"><span>Alamat pengirim</span><b>' + esc(s.sender) + '</b></div>' +
      '<div class="def"><span>Nama pengirim</span><b>' + esc(s.senderName) + '</b></div>' +
      '<div class="def"><span>Layanan</span><b>' + esc(s.provider) + '</b></div>' +
      '<div class="def"><span>Status koneksi</span><b style="color:var(--green)">' + esc(s.connection) + '</b></div>' +
      '</div>' +
      '<div class="field" style="margin-bottom:14px"><label>Laju kirim maksimum (pesan per menit)</label>' +
      '<input type="number" value="' + s.throttle + '" style="width:110px"' + (readOnly ? ' disabled' : '') + '></div>' +
      '<div class="btn-row"><button class="btn btn-sm" data-test' + (readOnly ? ' disabled' : '') + '>' +
      icon('send', 13) + 'Kirim email uji</button>' +
      '<button class="btn btn-sm" data-preview>' + icon('inbox', 13) + 'Lihat templat email</button></div>' +
      '</div></div>';

    /* Jadwal */
    html += '<div class="card"><div class="card-head"><div><h3>Jadwal distribusi</h3>' +
      '<p>Siklus payroll berjalan tanggal 21 sampai 20</p></div></div><div class="card-body">' +
      '<div style="display:flex;gap:12px;margin-bottom:6px">' +
      '<div class="field"><label>Tanggal distribusi</label><input type="number" value="' + s.scheduleDay + '" style="width:80px"' + (readOnly ? ' disabled' : '') + '></div>' +
      '<div class="field"><label>Jam (WIT)</label><input type="time" value="' + esc(s.scheduleTime) + '"' + (readOnly ? ' disabled' : '') + '></div>' +
      '</div>' +
      '<div class="switch"><div class="switch-copy"><b>Distribusi otomatis</b>' +
      '<span>Kirim tanpa menunggu persetujuan manusia. Sangat tidak disarankan.</span></div>' +
      '<button class="toggle" aria-checked="' + s.autoDistribute + '" data-toggle="autoDistribute"' + (readOnly ? ' disabled' : '') + '></button></div>' +
      '<div class="switch"><div class="switch-copy"><b>Wajib persetujuan sebelum kirim</b>' +
      '<span>Penjadwal hanya menyiapkan dan memvalidasi batch.</span></div>' +
      '<button class="toggle" aria-checked="' + s.requireApproval + '" data-toggle="requireApproval"' + (readOnly ? ' disabled' : '') + '></button></div>' +
      '<div class="switch"><div class="switch-copy"><b>Persetujuan dua orang</b>' +
      '<span>Penyiap batch tidak boleh menyetujui batchnya sendiri.</span></div>' +
      '<button class="toggle" aria-checked="' + s.makerChecker + '" data-toggle="makerChecker"' + (readOnly ? ' disabled' : '') + '></button></div>' +
      '</div></div>';

    /* Password */
    html += '<div class="card"><div class="card-head"><div><h3>Password slip</h3>' +
      '<p>Acak, unik per karyawan, disimpan terenkripsi</p></div></div><div class="card-body">' +
      '<div class="defs" style="margin-bottom:14px">' +
      '<div class="def"><span>Panjang password</span><b>' + s.passwordLength + ' karakter</b></div>' +
      '<div class="def"><span>Pergantian</span><b>' + esc(s.passwordRotation) + '</b></div>' +
      '</div>' +
      UI.notice('n-info', 'Tidak memakai tanggal lahir atau NIK',
        'Password yang diturunkan dari data pribadi mudah ditebak rekan kerja, dan memaksa sistem menyimpan data ' +
        'yang seharusnya tidak perlu ada di sini.') +
      '</div></div>';

    /* Lembur */
    html += '<div class="card"><div class="card-head"><div><h3>Lembur</h3>' +
      '<p>Dibaca dari lembar kerja divisi, hanya satu arah</p></div></div><div class="card-body">' +
      '<div class="defs" style="margin-bottom:14px">' +
      '<div class="def"><span>Sumber data</span><b>' + esc(s.sheetUrl) + '</b></div>' +
      '<div class="def"><span>Sinkronisasi</span><b>Setiap jam</b></div>' +
      '</div>' +
      '<div class="field" style="margin-bottom:12px"><label>Ambang peringatan jam lembur per periode</label>' +
      '<input type="number" value="' + s.otCap + '" style="width:100px"' + (readOnly ? ' disabled' : '') + '></div>' +
      UI.notice('n-warn', 'Ambang ini hanya peringatan operasional',
        'Angkanya disetel HR dan tidak mewakili batas yang berlaku menurut peraturan. ' +
        'Penetapannya tetap menjadi keputusan HR dan bagian legal perusahaan.') +
      '</div></div>';

    /* Penyimpanan */
    html += '<div class="card"><div class="card-head"><div><h3>Penyimpanan data</h3>' +
      '<p>Semakin sedikit yang disimpan, semakin kecil risikonya</p></div></div><div class="card-body">' +
      '<div class="defs" style="margin-bottom:14px">' +
      '<div class="def"><span>Berkas slip disimpan</span><b>' + s.retentionDocs + ' bulan</b></div>' +
      '<div class="def"><span>Jejak audit disimpan</span><b>' + s.retentionAudit + ' bulan</b></div>' +
      '<div class="def"><span>Cadangan</span><b>Harian, pukul 17:00 WIT</b></div>' +
      '<div class="def"><span>Lokasi server</span><b>Indonesia</b></div>' +
      '</div>' +
      '<p style="font-size:12.5px;color:var(--muted);margin:0">Sistem tidak menyimpan nominal gaji, nomor rekening, NIK, NPWP, ' +
      'maupun nomor BPJS. Data itu tetap berada di berkas payroll milik klien.</p>' +
      '</div></div>';

    /* Pengguna */
    html += '<div class="card"><div class="card-head"><div><h3>Pengguna sistem</h3>' +
      '<p>Empat orang · masuk lewat akun Google perusahaan</p></div></div>' +
      '<div class="table-scroll"><table class="data"><thead><tr>' +
      '<th>Nama</th><th>Peran</th><th>Terakhir masuk</th></tr></thead><tbody>' +
      DB.users.map(function (u) {
        return '<tr><td><b style="font-weight:500">' + esc(u.name) + '</b>' +
          '<div style="font-size:11px;color:var(--muted)">' + esc(u.note) + '</div></td>' +
          '<td><span class="badge ' + (u.role === 'Super Admin' ? 'b-info' : 'b-sent') +
          '"><i class="dot"></i>' + esc(u.role.toUpperCase()) + '</span></td>' +
          '<td class="col-code">' + esc(u.lastSeen) + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="card-body" style="border-top:1px solid var(--line)">' +
      UI.notice('n-info', 'Super Admin tidak bisa menekan tombol kirim',
        'Peran Super Admin dipegang konsultan eksternal. Keputusan mengirim data gaji harus selalu diambil dan tercatat ' +
        'atas nama orang internal perusahaan.') + '</div></div>';

    /* Tarif potongan — inti dari fitur perhitungan */
    var r = DB.rates;
    html += '<div class="card" style="grid-column:1/-1"><div class="card-head"><div><h3>Tarif potongan</h3>' +
      '<p>Dipakai untuk menghitung estimasi BPJS dan PPh 21</p></div>' +
      '<div class="spacer"></div>' +
      (r.verified
        ? '<span class="badge b-sent"><i class="dot"></i>SUDAH DIVERIFIKASI</span>'
        : '<span class="badge b-pending"><i class="dot"></i>BELUM DIVERIFIKASI</span>') +
      '</div><div class="card-body">' +

      UI.notice('n-warn', 'Tarif tinggal di pengaturan, bukan di dalam kode',
        'Tarif iuran dan tabel pajak berubah dari waktu ke waktu. Karena itu semuanya dibuat dapat diubah HR ' +
        'tanpa perlu mengubah sistem. Angka yang terisi sekarang adalah <b>contoh</b> dan wajib diperiksa ' +
        'terhadap peraturan yang berlaku sebelum dipakai.') +

      '<h4 class="form-sep">BPJS Ketenagakerjaan</h4>' +
      '<div class="rate-grid">' +
      rateField('JHT — karyawan', r.jhtEmployee, '%', readOnly) +
      rateField('JHT — perusahaan', r.jhtEmployer, '%', readOnly) +
      rateField('Jaminan Pensiun — karyawan', r.jpEmployee, '%', readOnly) +
      rateField('Jaminan Pensiun — perusahaan', r.jpEmployer, '%', readOnly) +
      rateField('JKK', r.jkk, '%', readOnly, r.jkkNote) +
      rateField('JKM', r.jkm, '%', readOnly, 'Ditanggung perusahaan penuh') +
      rateField('Batas upah Jaminan Pensiun', r.jpWageCap, 'Rp', readOnly, 'Sumber berbeda-beda — konfirmasi ke BPJS') +
      '</div>' +

      '<h4 class="form-sep">BPJS Kesehatan</h4>' +
      '<div class="rate-grid">' +
      rateField('Karyawan', r.kesEmployee, '%', readOnly) +
      rateField('Perusahaan', r.kesEmployer, '%', readOnly) +
      rateField('Batas upah', r.kesWageCap, 'Rp', readOnly) +
      '</div>' +

      '<h4 class="form-sep">PPh 21 — tarif efektif bulanan</h4>' +
      '<p style="font-size:12.5px;color:var(--muted);max-width:76ch">Bruto bulanan dikalikan satu tarif sesuai kategori PTKP. ' +
      'Kategori A untuk TK/0, TK/1, dan K/0 · kategori B untuk TK/2, TK/3, K/1, dan K/2 · kategori C untuk K/3. ' +
      'Tabel di bawah menampilkan lapisan bawah yang relevan untuk sebaran gaji di site ini.</p>' +
      '<div class="table-scroll" style="margin-top:12px;border:1px solid var(--line);border-radius:var(--r-sm)">' +
      '<table class="data"><thead><tr><th>Bruto bulanan sampai dengan</th>' +
      '<th class="col-num">Kategori A</th><th class="col-num">Kategori B</th><th class="col-num">Kategori C</th>' +
      '</tr></thead><tbody>' +
      DB.terTable.A.slice(0, 9).map(function (rowA, i) {
        var bnd = DB.terTable.B[i], cnd = DB.terTable.C[i];
        return '<tr><td class="col-code">' + (isFinite(rowA[0]) ? UI.rupiah(rowA[0]) : 'di atas itu') + '</td>' +
          '<td class="col-num">' + (rowA[1] * 100).toFixed(2) + '%</td>' +
          '<td class="col-num">' + (bnd[1] * 100).toFixed(2) + '%</td>' +
          '<td class="col-num">' + (cnd[1] * 100).toFixed(2) + '%</td></tr>';
      }).join('') +
      '</tbody></table></div>' +
      '<div style="margin-top:12px">' +
      UI.notice('n-bad', 'Tabel ini belum lengkap',
        'Hanya sembilan lapisan pertama yang ditampilkan, dan angkanya perkiraan. Sebelum sistem dipakai, ' +
        'tabel resmi lengkap harus dimasukkan oleh HR atau konsultan pajak perusahaan. ' +
        'Selama belum, seluruh angka PPh di sistem ditandai sebagai estimasi.') + '</div>' +

      '<h4 class="form-sep">Lembur dan pemeriksaan silang</h4>' +
      '<div class="rate-grid">' +
      rateField('Pembagi jam kerja sebulan', r.overtimeDivisor, '', readOnly) +
      rateField('Pengali upah lembur', r.overtimeMultiplier, '×', readOnly) +
      rateField('Ambang selisih terhadap Excel', r.crossCheckTolerance, '%', readOnly,
        'Selisih di atas ini ditandai untuk diperiksa') +
      '</div>' +

      (readOnly ? '' :
        '<div class="btn-row" style="margin-top:18px">' +
        '<button class="btn btn-sm btn-primary" data-verify>' + icon('check', 13) + 'Tandai tarif sudah diverifikasi</button>' +
        '<a class="btn btn-sm" href="#/payrolldata">' + icon('layers', 13) + 'Lihat dampaknya ke 252 karyawan</a>' +
        '</div>') +

      '</div></div>';

    html += '</div>';

    return {
      html: html,
      mount: function () {
        qa('[data-toggle]').forEach(function (t) {
          t.addEventListener('click', function () {
            if (this.disabled) return;
            var key = this.dataset.toggle;
            var on = this.getAttribute('aria-checked') !== 'true';

            if (key === 'autoDistribute' && on) {
              UI.modal({
                title: 'Aktifkan distribusi otomatis?',
                body: UI.notice('n-bad', 'Ini menghapus satu-satunya pengaman terakhir',
                  'Bila berkas payroll keliru dan sistem mengirim otomatis pukul ' + esc(DB.settings.scheduleTime) + ', ' +
                  'ratusan slip yang salah tidak bisa ditarik kembali.') +
                  '<p style="font-size:13px;margin-top:14px;margin-bottom:0">Saran kami: biarkan penjadwal menyiapkan dan memvalidasi batch, ' +
                  'lalu biarkan HR yang menekan tombol kirim. Selisih waktunya dua menit, dan risikonya jauh berbeda.</p>',
                confirm: 'Tetap aktifkan',
                danger: true,
                onConfirm: function (close) {
                  close();
                  t.setAttribute('aria-checked', 'true');
                  DB.settings.autoDistribute = true;
                  UI.toast('Distribusi otomatis aktif', 'Perubahan ini tercatat di jejak audit.', 'bad');
                }
              });
              return;
            }

            this.setAttribute('aria-checked', String(on));
            DB.settings[key] = on;
            UI.toast('Pengaturan disimpan', 'Perubahan tercatat di jejak audit.', 'ok');
          });
        });

        var test = q('[data-test]');
        if (test) test.addEventListener('click', function () {
          UI.toast('Email uji dikirim', 'Prototype tidak terhubung ke server email mana pun.', 'info');
        });
        var prev = q('[data-preview]');
        if (prev) prev.addEventListener('click', function () { emailPreview(null); });

        var vf = q('[data-verify]');
        if (vf) vf.addEventListener('click', function () {
          UI.modal({
            title: 'Tandai tarif sudah diverifikasi',
            body: '<p style="font-size:13px">Dengan menandai ini, Anda menyatakan bahwa seluruh tarif BPJS dan tabel ' +
              'PPh 21 di halaman ini sudah dicocokkan dengan peraturan yang berlaku.</p>' +
              UI.notice('n-warn', 'Tanggung jawab tetap di perusahaan',
                'Sistem tidak memantau perubahan peraturan dan tidak memperbarui tarif dengan sendirinya. ' +
                'Peninjauan ulang perlu dijadwalkan HR setidaknya sekali setahun, dan setiap kali ada perubahan aturan.'),
            confirm: 'Saya sudah memverifikasi',
            onConfirm: function (close) {
              DB.rates.verified = true;
              DB.audit.unshift({
                ts: '2026-09-23 10:12', actor: App.user.name, role: App.user.role,
                action: 'Tarif potongan diverifikasi', object: 'Pengaturan', result: 'Berhasil',
                desc: 'Tarif BPJS dan tabel PPh 21 dinyatakan sudah dicocokkan dengan peraturan yang berlaku'
              });
              close();
              UI.toast('Tarif ditandai terverifikasi', 'Tercatat di jejak audit atas nama Anda.', 'ok');
              App.rerender();
            }
          });
        });
      }
    };
  }

  /* ===================================================================== */
  return {
    dashboard: dashboard,
    employees: employees,
    payrolldata: payrolldata,
    entry: entry,
    generate: generate,
    batches: batches,
    matching: matching,
    validation: validation,
    tracking: tracking,
    failed: failed,
    exceptions: exceptions,
    audit: audit,
    health: health,
    settings: settings,
    emailPreview: emailPreview,
    employeeDrawer: employeeDrawer
  };
})();
