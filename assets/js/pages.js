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

  function emptyInputRow(columns, searching) {
    return '<tr><td colspan="' + columns + '"><div class="empty">' + icon('search', 28) +
      '<b>' + (searching ? 'Tidak ada data yang cocok' : 'Belum ada data pada periode ini') + '</b>' +
      '<p>' + (searching ? 'Kosongkan pencarian atau ubah kata kunci.' : 'Isi tabel atau impor berkas CSV untuk memulai.') +
      '</p></div></td></tr>';
  }

  /* Periode yang sedang dilihat di ruang kendali. Disimpan di luar fungsi
     supaya pilihan filter bertahan saat halaman digambar ulang. */
  var dashPeriod = 'SEP-2026';


  /* =======================================================================
     1 · RUANG KENDALI
     ======================================================================= */
  function dashboard() {
    var period = DB.periods.filter(function (p) { return p.code === dashPeriod; })[0];
    var hasIssues = false, waiting = false;
    var cards = [
      { type: 'PAYSLIP', title: 'Slip gaji', rows: DB.deliveries },
      { type: 'OVERTIME', title: 'Slip lembur', rows: DB.otDeliveries }
    ].map(function (doc) {
      var batch = DB.batches.filter(function (b) {
        return b.period === dashPeriod && b.docType === doc.type;
      })[0];
      var rows = doc.rows.filter(function (r) { return r.period === dashPeriod; });
      var summary = rows.length ? DB.summarise(rows) : null;
      var historical = !summary && batch && batch.status === 'COMPLETED';
      var sent = summary ? summary.delivered : (historical ? batch.sent : 0);
      var target = summary ? summary.processed : (batch ? batch.processed : 0);
      var failed = summary ? summary.failed : (historical ? batch.failed : 0);
      var pending = summary ? summary.pending + summary.queued : (historical ? batch.pending : 0);
      var exceptions = summary ? summary.exception : (batch ? batch.exception : 0);
      var started = !!summary || historical;
      var issue = failed + pending > 0;
      hasIssues = hasIssues || issue;
      waiting = waiting || (!!batch && !started);
      var status = !started ? (batch ? 'Belum dikirim' : 'Belum ada batch')
        : (issue ? 'Perlu ditindaklanjuti' : 'Pengiriman selesai');

      return '<section class="card control-document">' +
        '<div class="control-document-head"><h2>' + doc.title + '</h2>' +
        '<span class="badge ' + (!started ? 'b-neutral' : (issue ? 'b-pending' : 'b-sent')) + '">' +
        '<i class="dot"></i>' + status + '</span></div>' +
        '<div class="control-total">' +
        (started ? '<strong>' + num(sent) + '</strong><span>dari ' + num(target) + ' slip diproses telah terkirim</span>'
          : '<strong class="control-idle">—</strong><span>' +
            (batch ? 'Menunggu kesiapan dan persetujuan batch' : 'Belum disiapkan untuk periode ini') + '</span>') +
        '</div>' +
        (started ? '<dl class="control-counts">' +
          '<div><dt>Gagal</dt><dd' + (failed ? ' class="control-alert"' : '') + '>' + num(failed) + '</dd></div>' +
          '<div><dt>Menunggu</dt><dd>' + num(pending) + '</dd></div>' +
          '<div><dt>Tanpa email</dt><dd>' + num(exceptions) + '</dd></div></dl>'
          : '<p class="control-note">' + (batch && exceptions
            ? num(exceptions) + ' karyawan tanpa email perlu penyerahan manual.'
            : 'Status pengiriman akan muncul setelah distribusi dimulai.') + '</p>') +
        '<div class="control-document-foot">' +
        '<span>' + (batch ? esc(batch.id) : 'Tidak ada batch') + '</span>' +
        (historical ? '<span>Ringkasan arsip</span>' : '') +
        '</div></section>';
    }).join('');

    return {
      html: '<div class="control-center"><div class="control-heading">' +
        '<div><p class="control-eyebrow">Ringkasan distribusi</p>' +
        '<p class="control-caption">Status slip dan tindak lanjut untuk periode terpilih.</p></div>' +
        '<div class="period-pick"><label for="periodSel">Periode</label><select id="periodSel">' +
        DB.periods.map(function (p) {
          return '<option value="' + esc(p.code) + '"' + (p.code === dashPeriod ? ' selected' : '') + '>' +
            esc(p.label) + '</option>';
        }).join('') + '</select></div></div>' +
        '<p class="control-range">' + esc(period.range) + '</p>' +
        '<div class="control-documents">' + cards + '</div>' +
        '<div class="control-next"><div><h3>' +
        (hasIssues ? 'Tindak lanjuti pengiriman' : (waiting ? 'Tinjau kesiapan batch' : 'Lihat rincian distribusi')) +
        '</h3><p>' + (hasIssues ? 'Periksa status dan kendala pada batch periode ini. ' : '') +
        'Pengiriman tetap memerlukan pemeriksaan acak dan persetujuan manusia.</p></div>' +
        '<a class="btn btn-primary" href="#/batches">Buka batch distribusi →</a>' +
        '</div></div>',
      mount: function () {
        var sel = q('#periodSel');
        if (sel) sel.addEventListener('change', function () {
          dashPeriod = this.value;
          App.rerender();
        });
      }
    };
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
      '<p class="view-intro">Data karyawan untuk pencocokan penerima slip. Rincian gaji hanya tersedia bagi peran yang berhak.</p>' +
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
      sub: 'Contoh pesan yang diterima karyawan',
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
          'Pratinjau saja; tidak terhubung ke server email.') +
        '</div>',
      cancel: 'Tutup'
    });
  }

  /* =======================================================================
     ALUR PAYROLL — stepper yang dipakai bersama oleh halaman input,
     pembuatan slip, dan batch.

     Prinsipnya: semua langkah mekanis boleh diotomatiskan, tetapi alur
     berhenti di dua gerbang yang harus dilewati manusia — pemeriksaan acak
     dan persetujuan distribusi. Itu bukan keterbatasan, itu rancangan.
     ======================================================================= */

  function payrollSteps(code) {
    var sh = DB.entrySheets[code];
    var b = DB.batches.filter(function (x) { return x.period === code && x.docType === 'PAYSLIP'; })[0];
    var issues = DB.sheetIssues(sh).filter(function (i) { return i.severity === 'BLOCKING'; });

    return [
      { n: 1, key: 'input', title: 'Isi data payroll', note: sh.rows.length + ' karyawan',
        done: sh.locked || (!issues.length && sh.rows.length > 0),
        blocked: issues.length ? issues.length + ' baris bermasalah' : null,
        href: '#/entry', action: 'Buka tabel input' },
      { n: 2, key: 'lock', title: 'Kunci periode', note: 'Mencegah data berubah setelah slip dibuat',
        done: sh.locked, auto: true },
      { n: 3, key: 'generate', title: 'Buat slip gaji', note: 'Satu berkas terkunci per karyawan',
        done: sh.generated, auto: true },
      { n: 4, key: 'sample', title: 'Pemeriksaan acak', note: 'Wajib dilakukan manusia — tidak diotomatiskan',
        done: !!sh.sampleChecked, gate: true },
      { n: 5, key: 'handoff', title: 'Serahkan ke distribusi', note: 'Slip dilampirkan ke batch',
        done: !!sh.handedOff },
      { n: 6, key: 'send', title: 'Setujui dan kirim', note: 'Persetujuan oleh orang kedua',
        done: !!(b && b.status === 'COMPLETED'), gate: true, href: '#/batches' }
    ];
  }

  function firstIncompleteStep(steps) {
    return steps.filter(function (step) { return !step.done; })[0] || null;
  }

  function currentStep(code) {
    return firstIncompleteStep(payrollSteps(code));
  }

  /* Tampilan bersama; status dan tindakan tiap jenis slip tetap eksplisit. */
  function renderWorkflow(code, steps, options) {
    var cur = firstIncompleteStep(steps);
    var period = DB.periods.filter(function (p) { return p.code === code; })[0];
    return '<div class="card stepper-card"><div class="card-head">' +
      '<div><h3>Alur ' + esc(options.name) + ' ' + esc(period ? period.label : code) + '</h3>' +
      '<p>' + (cur ? 'Langkah berjalan: ' + esc(cur.title) : 'Seluruh langkah selesai') + '</p></div>' +
      '<div class="spacer"></div>' +
      (cur && !cur.gate && cur.key !== 'input' && options.allowAuto
        ? '<button class="btn btn-sm btn-primary" ' + options.autoAttr + '="' + esc(code) + '">' +
          icon('play', 13) + 'Jalankan sampai siap diperiksa</button>' : '') +
      '</div><div class="card-body"><div class="steps">' +
      steps.map(function (step) {
        var state = step.done ? 'done' : (cur && cur.n === step.n ? 'current' : 'idle');
        return '<div class="step ' + state + (step.gate ? ' gate' : '') + '"' +
          (state === 'current' ? ' aria-current="step"' : '') + '>' +
          '<div class="step-mark"><i>' + (step.done ? '✓' : step.n) + '</i></div>' +
          '<div class="step-body"><b>' + esc(step.title) + '</b><span>' +
          esc(step.blocked && state === 'current' ? step.blocked : step.note) + '</span>' +
          (step.gate ? '<em class="step-gate">' + icon('lock', 10) + ' gerbang manusia</em>' : '') +
          '</div></div>';
      }).join('') + '</div>' +
      (cur ? '<div class="step-next"><div class="step-next-inner">' +
        '<div><b>Langkah berikutnya</b><span>' + esc(cur.blocked || cur.note) + '</span></div>' +
        (cur.blocked ? '<a class="btn btn-sm" href="' + options.inputHref + '">Perbaiki dulu</a>'
          : '<button class="btn btn-sm btn-primary" ' + options.stepAttr + '="' + cur.key +
            '" data-period="' + esc(code) + '">' + esc(options.labels[cur.key]) + ' →</button>') +
        '</div></div>' : '') + '</div></div>';
  }

  function stepperHTML(code) {
    return renderWorkflow(code, payrollSteps(code), {
      name: 'payroll', allowAuto: true, autoAttr: 'data-autorun',
      stepAttr: 'data-step', inputHref: '#/entry',
      labels: {
        input: 'Buka tabel input', lock: 'Kunci periode sekarang',
        generate: 'Buat slip gaji', sample: 'Mulai pemeriksaan acak',
        handoff: 'Serahkan ke batch distribusi', send: 'Buka batch untuk menyetujui'
      }
    });
  }

  function wireStepper() {
    qa('[data-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        runStep(this.dataset.period, this.dataset.step);
      });
    });
    qa('[data-autorun]').forEach(function (btn) {
      btn.addEventListener('click', function () { autoRun(this.dataset.autorun); });
    });
  }

  function runStep(code, key) {
    var sh = DB.entrySheets[code];
    entryPeriod = code;
    if (key === 'input') { App.go('#/entry'); return; }
    if (key === 'lock') { App.go('#/entry'); setTimeout(function () { var b = q('#entLock'); if (b) b.click(); }, 140); return; }
    if (key === 'generate') { App.go('#/generate'); setTimeout(function () { var b = q('#genRun'); if (b) b.click(); }, 140); return; }
    if (key === 'sample') { App.go('#/generate'); setTimeout(function () { sampleCheck(sh); }, 140); return; }
    if (key === 'handoff') { App.go('#/generate'); setTimeout(function () { handoff(sh); }, 140); return; }
    if (key === 'send') { App.go('#/batches'); return; }
  }

  /* Menjalankan seluruh langkah mekanis berturut-turut, lalu berhenti.
     Pemeriksaan acak sengaja tidak ikut dijalankan. */
  function autoRun(code) {
    var sh = DB.entrySheets[code];
    var issues = DB.sheetIssues(sh).filter(function (i) { return i.severity === 'BLOCKING'; });
    if (issues.length) {
      UI.modal({
        title: 'Belum bisa dijalankan',
        body: UI.notice('n-bad', issues.length + ' baris masih bermasalah',
          'Perbaiki dulu di tabel input sebelum alur bisa dilanjutkan otomatis.'),
        cancel: 'Mengerti'
      });
      return;
    }

    var willLock = !sh.locked, willGen = !sh.generated;
    if (!willLock && !willGen) {
      UI.toast('Tidak ada yang perlu dijalankan', 'Langkah berikutnya butuh tindakan manusia.', 'info');
      return;
    }

    UI.modal({
      title: 'Jalankan langkah otomatis',
      sub: code + ' · ' + sh.rows.length + ' karyawan',
      body: '<p style="font-size:13px">Sistem akan menjalankan berturut-turut:</p>' +
        '<div class="auto-list">' +
        (willLock ? '<div>' + icon('check', 13) + 'Kunci periode</div>' : '') +
        (willGen ? '<div>' + icon('check', 13) + 'Buat ' + sh.rows.length + ' slip gaji terkunci password</div>' : '') +
        '</div>' +
        UI.notice('n-warn', 'Alur berhenti sebelum pemeriksaan acak',
          'Pemeriksaan isi slip dan persetujuan pengiriman tidak pernah diotomatiskan. ' +
          'Keduanya harus dilakukan manusia, dan tercatat atas nama orang yang melakukannya.'),
      confirm: 'Jalankan',
      onConfirm: function (close) {
        close();
        if (willLock) {
          sh.locked = true;
          sh.lockedBy = App.user.name;
          sh.lockedAt = '2026-09-23 11:02';
          DB.audit.unshift({
            ts: '2026-09-23 11:02', actor: App.user.name, role: App.user.role,
            action: 'Periode payroll dikunci', object: code, result: 'Berhasil',
            desc: 'Dikunci lewat alur otomatis, total take home pay ' + UI.rupiah(DB.sheetTotals(sh).thp)
          });
        }
        entryPeriod = code;
        if (willGen) {
          App.go('#/generate');
          setTimeout(function () { runGenerate(sh); }, 160);
        } else {
          UI.toast('Periode dikunci', 'Lanjut ke pembuatan slip.', 'ok');
          App.go('#/generate');
        }
      }
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

    var html = '<p class="view-intro">Buat slip dari payroll terkunci, lalu periksa sampelnya sebelum diserahkan ke batch distribusi.</p>';

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

    /* Hasil — daftar per orang */
    if (sh.generated) {
      var ready = sh.rows.filter(function (r) { var e = DB.byCode[r.code]; return e && e.email; });
      var manual = sh.rows.length - ready.length;

      html += '<div class="grid g-4" style="margin-bottom:16px">' +
        UI.kpi('Slip dibuat', num(sh.rows.length), 'Semuanya terkunci password', 'main') +
        UI.kpi('Siap kirim via email', num(ready.length), 'Punya alamat email terdaftar', 'good') +
        UI.kpi('Diserahkan manual', num(manual), 'Tanpa email — dicetak HR', manual ? 'warn' : 'good') +
        UI.kpi('Total take home pay', UI.rupiahShort(totals.thp), 'Sesuai data terkunci', '') +
        '</div>';

      html += '<div class="card"><div class="card-head">' +
        '<div><h3>Slip per karyawan</h3><p>Dibuat ' + esc(sh.generatedAt || '') +
        ' · klik baris mana pun untuk melihat isi slipnya</p></div>' +
        '<div class="spacer"></div>' +
        '<div class="view-toggle"><button data-gview="table" class="on">' + icon('scroll', 13) + 'Tabel</button>' +
        '<button data-gview="cards">' + icon('grid', 13) + 'Kartu</button></div>' +
        '</div>';

      html += '<div class="filters">' +
        '<div class="search-field">' + icon('search', 14) +
        '<input type="search" id="genSearch" placeholder="Cari nama, ID, atau nama berkas…"></div>' +
        '<select id="genFilter">' +
        '<option value="">Semua tujuan</option>' +
        '<option value="email">Kirim via email</option>' +
        '<option value="print">Diserahkan manual</option>' +
        '</select>' +
        '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">' +
        '<button class="btn btn-sm" id="genSample">' + icon('search', 13) +
        (sh.sampleChecked ? 'Periksa acak lagi' : 'Pemeriksaan acak') + '</button>' +
        '<button class="btn btn-sm" id="genPrintAll">' + icon('print', 13) + 'Cetak semua</button>' +
        '<button class="btn btn-sm btn-primary" id="genHandoff"' +
        (sh.sampleChecked ? '' : ' disabled title="Lakukan pemeriksaan acak terlebih dahulu"') + '>' +
        icon('send', 13) + 'Serahkan ke distribusi</button>' +
        '</div></div>';

      if (!sh.sampleChecked) {
        html += '<div style="padding:0 16px 14px">' + UI.notice('n-warn',
          'Pemeriksaan acak belum dilakukan',
          'Tombol serahkan terkunci sampai lima slip dibuka dan dicocokkan. ' +
          'Validasi otomatis memeriksa struktur data, bukan isi dokumen — hanya manusia yang bisa melakukan itu.') + '</div>';
      } else {
        html += '<div style="padding:0 16px 14px">' + UI.notice('n-ok',
          'Pemeriksaan acak selesai',
          'Seluruh ' + sh.rows.length + ' slip siap diserahkan ke batch distribusi. ' +
          'Pengiriman masih menunggu persetujuan terpisah.') + '</div>';
      }

      /* Tabel per orang */
      html += '<div id="genTable" class="table-scroll" style="max-height:66vh;overflow:auto">' +
        '<table class="data"><thead><tr>' +
        '<th>ID</th><th>Karyawan</th><th>Divisi</th><th>Nama berkas</th>' +
        '<th>Proteksi</th><th class="col-num">Take home pay</th>' +
        '<th>Tujuan</th><th>Status</th><th class="col-actions"></th>' +
        '</tr></thead><tbody>' +
        sh.rows.map(function (r) {
          var e = DB.byCode[r.code] || {};
          var t = DB.entryTotals(r);
          var dest = e.email ? 'email' : 'print';
          return '<tr class="clickable gen-row" data-slip="' + r.code + '" data-dest="' + dest + '" data-find="' +
            esc((r.code + ' ' + r.name + ' ' + (e.email || '')).toLowerCase()) + '">' +
            '<td class="col-code">' + esc(r.code) + '</td>' +
            '<td><b style="font-weight:500">' + esc(r.name) + '</b>' +
            '<div style="font-size:10.5px;color:var(--muted)">' + esc(r.position) + '</div></td>' +
            '<td style="color:var(--muted)">' + esc(e.divisionName || '—') + '</td>' +
            '<td class="col-code">Slip_Gaji_' + esc(r.code) + '_' + esc(entryPeriod.replace('-', '')) + '.pdf</td>' +
            '<td><span class="badge b-info"><i class="dot"></i>TERKUNCI</span></td>' +
            '<td class="col-num"><b style="font-weight:600">' + UI.rupiah(t.thp) + '</b></td>' +
            '<td>' + (e.email
              ? '<span style="font-size:11.5px;color:var(--muted)">' + esc(e.email) + '</span>'
              : '<span class="chip">cetak manual</span>') + '</td>' +
            '<td>' + (sh.handedOff
              ? '<span class="badge b-sent"><i class="dot"></i>DI BATCH</span>'
              : sh.sampleChecked
                ? '<span class="badge b-sent"><i class="dot"></i>SIAP KIRIM</span>'
                : '<span class="badge b-pending"><i class="dot"></i>MENUNGGU PERIKSA</span>') + '</td>' +
            '<td class="col-actions"><button class="btn btn-sm" data-slip2="' + r.code + '">Lihat slip</button></td>' +
            '</tr>';
        }).join('') +
        '</tbody></table></div>';

      /* Kartu */
      html += '<div class="card-body" id="genCards" style="display:none"><div class="gen-grid">' +
        sh.rows.map(function (r) {
          var e = DB.byCode[r.code] || {};
          var t = DB.entryTotals(r);
          var dest = e.email ? 'email' : 'print';
          return '<button class="gen-card" data-slip="' + r.code + '" data-dest="' + dest + '" data-find="' +
            esc((r.code + ' ' + r.name).toLowerCase()) + '">' +
            '<span class="gen-code">' + esc(r.code) + '</span>' +
            '<span class="gen-name">' + esc(r.name) + '</span>' +
            '<span class="gen-thp">' + UI.rupiah(t.thp) + '</span>' +
            '<span class="gen-mark ' + (e.email ? 'ok' : 'warn') + '">' +
            (e.email ? icon('lock', 11) + ' siap kirim' : icon('print', 11) + ' cetak manual') + '</span>' +
            '</button>';
        }).join('') +
        '</div></div>';

      html += '<div class="table-foot"><span>' + num(sh.rows.length) + ' slip · ' +
        num(ready.length) + ' via email · ' + num(manual) + ' cetak manual</span></div></div>';
    } else {
      html += '<div class="card"><div class="empty">' + icon('file', 34) +
        '<b>Belum ada slip untuk periode ini</b>' +
        '<p>Setelah data dikunci dan prasyarat terpenuhi, slip untuk seluruh karyawan akan dibuat di sini ' +
        'lengkap dengan tata letak resmi, proteksi password, dan status kesiapan kirim per orang.</p></div></div>';
    }

    html += '<div style="margin-top:16px">' + stepperHTML(entryPeriod) + '</div>';

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
    UI.wireNoticeBoxes();
    var sh = DB.entrySheets[entryPeriod];

    var sel = q('#genPeriod');
    if (sel) sel.addEventListener('change', function () { entryPeriod = this.value; App.rerender(); });

    var run = q('#genRun');
    if (run) run.addEventListener('click', function () { runGenerate(sh); });

    qa('[data-slip]').forEach(function (c) {
      c.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-slip2]')) return;
        slipPreview(this.dataset.slip);
      });
    });
    qa('[data-slip2]').forEach(function (c) {
      c.addEventListener('click', function (ev) {
        ev.stopPropagation();
        slipPreview(this.dataset.slip2);
      });
    });

    function applyFilter() {
      var gs = q('#genSearch'), gf = q('#genFilter');
      var v = gs ? gs.value.toLowerCase() : '';
      var d = gf ? gf.value : '';
      qa('[data-find]').forEach(function (c) {
        var okText = !v || c.dataset.find.indexOf(v) > -1;
        var okDest = !d || c.dataset.dest === d;
        c.style.display = okText && okDest ? '' : 'none';
      });
    }
    var gs = q('#genSearch');
    if (gs) gs.addEventListener('input', function () {
      var caret = this.selectionStart;
      applyFilter();
      this.focus();
      try { this.setSelectionRange(caret, caret); } catch (e) {}
    });
    var gf = q('#genFilter');
    if (gf) gf.addEventListener('change', applyFilter);

    qa('[data-gview]').forEach(function (b) {
      b.addEventListener('click', function () {
        var mode = this.dataset.gview;
        qa('[data-gview]').forEach(function (x) { x.classList.toggle('on', x === b); });
        var tb = q('#genTable'), cd = q('#genCards');
        if (tb) tb.style.display = mode === 'table' ? '' : 'none';
        if (cd) cd.style.display = mode === 'cards' ? '' : 'none';
      });
    });

    wireStepper();

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
        sh.sampleChecked = true;
        DB.audit.unshift({
          ts: '2026-09-23 10:46', actor: App.user.name, role: App.user.role,
          action: 'Pemeriksaan acak', object: entryPeriod, result: 'Berhasil',
          desc: '5 slip dibuka acak dan dicocokkan manual: ' + picks.map(function (r) { return r.code; }).join(', ')
        });
        close();
        UI.toast('Pemeriksaan tercatat', 'Seluruh slip kini bertanda siap kirim.', 'ok');
        App.rerender();
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
        sh.handedOff = true;
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

    var html = '<p class="view-intro">Isi atau impor payroll. Total penghasilan, potongan, dan gaji bersih dihitung saat Anda mengetik.</p>';

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
      html += '<div style="margin-bottom:16px">' + UI.noticeBox('pay-blk-' + entryPeriod, 'n-bad',
        'Baris yang menghalangi pembuatan slip', 
        blocking.map(function (i) {
          return '<div class="nb-item"><b>' + esc(i.code) + ' ' + esc(i.name) + '</b> — ' + esc(i.message) + '</div>';
        }).join(''), blocking.length + ' baris') + '</div>';
    }
    if (warnings.length) {
      html += '<div style="margin-bottom:16px">' + UI.noticeBox('pay-wrn-' + entryPeriod, 'n-warn',
        'Perlu diperiksa, tetapi tidak menghalangi',
        warnings.map(function (i) {
          return '<div class="nb-item"><b>' + esc(i.code) + ' ' + esc(i.name) + '</b> — ' + esc(i.message) + '</div>';
        }).join(''), warnings.length + ' baris') + '</div>';
    }

    /* Tabel entri */
    html += '<div class="card"><div class="filters">' +
      '<div class="search-field">' + icon('search', 14) +
      '<input type="search" id="entSearch" placeholder="Cari nama, ID, atau jabatan…" value="' + esc(entrySearch) + '"></div>' +
      '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-sm" id="entNewPeriod">' + icon('layers', 13) + 'Buka periode baru</button>' +
      (sh.locked
        ? '<button class="btn btn-sm" id="entUnlock">' + icon('lock', 13) + 'Buka kunci untuk diedit</button>'
        : '<button class="btn btn-sm" id="entImport">' + icon('download', 13) + 'Impor dari Excel</button>' +
          '<button class="btn btn-sm" id="entBulk">' + icon('grid', 13) + 'Ubah massal</button>' +
          '<button class="btn btn-sm" id="entAuto">' + icon('refresh', 13) + 'Hitung potongan otomatis</button>' +
          '<button class="btn btn-sm btn-primary" id="entLock">' + icon('shield', 13) + 'Kunci periode</button>') +
      '</div></div>';

    if (sh.createdFrom) {
      html += '<div style="padding:0 16px 14px">' + UI.notice('n-info',
        'Periode ini dibuat dari ' + esc(sh.createdFrom),
        sh.createdMode === 'fixed'
          ? 'Komponen tetap seperti gaji pokok dan tunjangan dibawa dari periode sebelumnya. ' +
            'Lembur, rapel, kompensasi, dan potongan absen dikosongkan karena nilainya berubah tiap bulan.'
          : 'Seluruh nilai disalin apa adanya dari periode sebelumnya. Periksa kolom lembur dan rapel ' +
            'sebelum dikunci — nilai itu biasanya tidak boleh sama dengan bulan lalu.') + '</div>';
    }

    html += '<div class="table-scroll entry-scroll"><table class="data entry-table"><thead>' +
      '<tr class="entry-group"><th class="sticky-1"></th><th class="sticky-2"></th>' +
      '<th colspan="8" class="grp-in">Penghasilan</th>' +
      '<th colspan="4" class="grp-out">Potongan</th>' +
      '<th colspan="4" class="grp-sum">Hasil</th></tr>' +
      '<tr><th class="sticky-1">ID</th><th class="sticky-2">Nama &amp; jabatan</th>' +
      DB.entryColumns.map(function (c) {
        return '<th class="col-num ' + (c.group === 'in' ? 'c-in' : 'c-out') + '" style="min-width:' + c.w + 'px">' +
          esc(c.label) + '</th>';
      }).join('') +
      '<th class="col-num c-sum">Total penghasilan</th>' +
      '<th class="col-num c-sum">Total potongan</th>' +
      '<th class="col-num c-sum">Take home pay</th>' +
      '<th class="c-sum"></th></tr></thead><tbody>';

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
        '<td class="col-num sum-thp' + (t.thp < 0 ? ' neg' : '') + '" data-sum="thp">' + UI.rupiah(t.thp) + '</td>' +
        '<td class="col-actions"><button class="btn btn-sm" data-editrow="' + r.code + '">Edit</button></td>' +
        '</tr>';
    });

    if (!slice.length) html += emptyInputRow(DB.entryColumns.length + 6, !!entrySearch);
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
      '<td></td>' +
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

    /* Alur payroll — stepper bersama */
    html += '<div style="margin-top:16px">' + stepperHTML(entryPeriod) + '</div>';

    return { html: html, mount: mountEntry };
  }

  function flowStep(n, title, note, state) {
    return '<div class="flow-step ' + (state || '') + '">' +
      '<i>' + (state === 'done' ? '✓' : n) + '</i>' +
      '<div><b>' + esc(title) + '</b><span>' + esc(note) + '</span></div></div>';
  }

  function mountEntry() {
    UI.wireNoticeBoxes();
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
        DB.refreshPeriodTotals(entryPeriod);
      });
    });

    var imp = q('#entImport');
    if (imp) imp.addEventListener('click', function () { importForm(entryPeriod); });

    var auto = q('#entAuto');
    if (auto) auto.addEventListener('click', function () {
      UI.modal({
        title: 'Hitung potongan otomatis',
        sub: entryPeriod + ' · ' + sh.rows.length + ' karyawan',
        body: '<p style="font-size:13px">Sistem akan mengisi kolom <b>JHT</b>, <b>BPJS Kesehatan</b>, dan <b>PPH 21</b> ' +
          'berdasarkan tarif di halaman pengaturan. Kolom penghasilan tidak disentuh.</p>' +
          '<p style="font-size:13px;color:var(--muted)">Nilai yang sudah Anda isi manual akan tertimpa. ' +
          'Setelah terisi, setiap sel tetap bisa diubah satu per satu.</p>' +
          UI.notice('n-warn', 'Hasil hitung masih estimasi',
            'Tarif belum diverifikasi. Periksa hasil sebelum memakai angka ini sebagai nilai final.'),
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

    qa('[data-editrow]').forEach(function (b) {
      b.addEventListener('click', function () { editRow(this.dataset.editrow); });
    });

    var np = q('#entNewPeriod');
    if (np) np.addEventListener('click', newPeriodForm);

    var bulk = q('#entBulk');
    if (bulk) bulk.addEventListener('click', bulkEditForm);

    wireStepper();

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

  /* =======================================================================
     INPUT LEMBUR
     ======================================================================= */
  var otPeriod = 'SEP-2026';
  var otSheetKey = 'WHL';
  var otPage = 1;
  var otSearch = '';
  var OT_SIZE = 14;

  function otTime(v) { return v === null || v === undefined ? '' : DB.toTime(v); }

  function otentry() {
    if (!can('salaryDetail')) {
      return { html: '<div class="card"><div class="empty">' + icon('lock', 34) +
        '<b>Halaman ini tidak tersedia untuk peran Anda</b>' +
        '<p>Input lembur hanya dapat dibuka oleh HR Admin.</p></div></div>' };
    }

    var sh = DB.otSheets[otPeriod] || DB.createOtPeriod(otPeriod, null, 'blank');
    var period = DB.periods.filter(function (p) { return p.code === otPeriod; })[0] || { label: otPeriod, range: '' };
    var all = DB.otSheetTotals(sh);
    var t = DB.otSheetTotals(sh, otSheetKey);
    var issues = DB.otIssues(sh, otSheetKey);
    var blocking = issues.filter(function (i) { return i.severity === 'BLOCKING'; });
    var warnings = issues.filter(function (i) { return i.severity === 'WARNING'; });
    var badId = {};
    blocking.forEach(function (i) { badId[i.id] = 1; });

    var rows = DB.otEntriesOf(sh, otSheetKey);
    if (otSearch) {
      var qq = otSearch.toLowerCase();
      rows = rows.filter(function (e) {
        return (e.empCode + ' ' + e.name + ' ' + e.position + ' ' + e.notes).toLowerCase().indexOf(qq) > -1;
      });
    }
    rows = rows.slice().sort(function (a, b) {
      return a.name === b.name ? (a.date < b.date ? -1 : 1) : (a.name < b.name ? -1 : 1);
    });

    var pages = Math.max(1, Math.ceil(rows.length / OT_SIZE));
    if (otPage > pages) otPage = pages;
    var slice = rows.slice((otPage - 1) * OT_SIZE, otPage * OT_SIZE);

    var html = '<p class="view-intro">Satu baris per hari lembur, dikelompokkan menurut divisi. Jam dihitung otomatis, termasuk shift lintas tengah malam.</p>';

    html += '<div class="period-bar">' +
      '<div class="period-pick"><label for="otPeriodSel">Periode lembur</label>' +
      '<select id="otPeriodSel">' +
      DB.periods.map(function (p) {
        return '<option value="' + p.code + '"' + (p.code === otPeriod ? ' selected' : '') + '>' +
          esc(p.label) + ' · ' + esc(p.range) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="period-meta">' +
      (sh.locked ? '<span class="badge b-neutral"><i class="dot"></i>TERKUNCI</span>'
        : '<span class="badge b-info"><i class="dot"></i>SEDANG DIISI</span>') +
      '<span class="chip">' + num(all.rows) + ' baris · ' + num(all.people) + ' orang · ' +
      all.hours.toFixed(0) + ' jam</span>' +
      '</div></div>';

    html += '<div class="grid g-4" style="margin-bottom:16px">' +
      UI.kpi('Baris di lembar ini', num(t.rows), esc(sheetLabel(otSheetKey)), 'main') +
      UI.kpi('Karyawan', num(t.people), 'Punya catatan lembur', '') +
      UI.kpi('Total jam', t.hours.toFixed(0), 'Periode ' + esc(period.label), '') +
      UI.kpi('Perkiraan upah lembur', UI.rupiahShort(t.amount),
        t.overCap ? '<b>' + t.overCap + '</b> orang lewat ambang' : 'Tidak ada yang lewat ambang',
        t.overCap ? 'warn' : 'good') +
      '</div>';

    /* Tab per lembar divisi */
    html += '<div class="sheet-tabs">' +
      DB.otSheetDefs.map(function (d) {
        var st = DB.otSheetTotals(sh, d.key);
        var bad = DB.otIssues(sh, d.key).filter(function (i) { return i.severity === 'BLOCKING'; }).length;
        return '<button class="sheet-tab' + (d.key === otSheetKey ? ' on' : '') + '" data-otsheet="' + d.key + '">' +
          '<b>' + esc(d.label) + '</b>' +
          '<span>' + num(st.rows) + ' baris · ' + st.hours.toFixed(0) + ' jam</span>' +
          (bad ? '<i class="tab-bad">' + bad + '</i>' : '') +
          '</button>';
      }).join('') + '</div>';

    if (sh.createdFrom) {
      html += '<div style="margin-bottom:16px">' + UI.noticeBox('ot-src-' + otPeriod, 'n-info',
        'Periode ini disalin dari ' + esc(sh.createdFrom),
        'Seluruh baris dari periode sebelumnya disalin dan tanggalnya digeser otomatis ke rentang periode baru. ' +
        'Jam dan uraian pekerjaan ikut tersalin apa adanya — <b>wajib diperiksa</b>, karena lembur bulan lalu ' +
        'hampir tidak pernah sama dengan bulan ini.', 'perlu diperiksa') + '</div>';
    }

    if (blocking.length) {
      html += '<div style="margin-bottom:16px">' + UI.noticeBox('ot-blk-' + otPeriod + otSheetKey, 'n-bad',
        'Baris yang menghalangi pembuatan slip di lembar ' + sheetLabel(otSheetKey),
        blocking.slice(0, 10).map(function (i) {
          return '<div class="nb-item"><b>' + esc(i.who) + '</b> — ' + esc(i.message) + '</div>';
        }).join('') + (blocking.length > 10 ? '<div class="nb-item">dan ' + (blocking.length - 10) + ' lainnya</div>' : ''),
        blocking.length + ' baris') + '</div>';
    }
    if (warnings.length) {
      html += '<div style="margin-bottom:16px">' + UI.noticeBox('ot-wrn-' + otPeriod + otSheetKey, 'n-warn',
        'Perlu diperiksa, tetapi tidak menghalangi',
        warnings.slice(0, 10).map(function (i) {
          return '<div class="nb-item"><b>' + esc(i.who) + '</b> — ' + esc(i.message) + '</div>';
        }).join('') + (warnings.length > 10 ? '<div class="nb-item">dan ' + (warnings.length - 10) + ' lainnya</div>' : ''),
        warnings.length + ' hal') + '</div>';
    }

    /* Tabel */
    html += '<div class="card"><div class="filters">' +
      '<div class="search-field">' + icon('search', 14) +
      '<input type="search" id="otSearch" placeholder="Cari nama, ID, atau uraian pekerjaan…" value="' + esc(otSearch) + '"></div>' +
      '<div style="margin-left:auto;display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn btn-sm" id="otNewPeriod">' + icon('layers', 13) + 'Buka periode baru</button>' +
      '<button class="btn btn-sm" id="otRecap">' + icon('people', 13) + 'Rekap per karyawan</button>' +
      (sh.locked
        ? '<button class="btn btn-sm" id="otUnlock">' + icon('lock', 13) + 'Buka kunci untuk diedit</button>'
        : '<button class="btn btn-sm" id="otImport">' + icon('download', 13) + 'Impor dari Excel</button>' +
          '<button class="btn btn-sm" id="otAdd">' + icon('grid', 13) + 'Tambah baris</button>' +
          '<button class="btn btn-sm btn-primary" id="otLock">' + icon('shield', 13) + 'Kunci periode</button>') +
      '</div></div>';

    html += '<div class="table-scroll entry-scroll"><table class="data entry-table ot-table"><thead><tr>' +
      '<th class="sticky-1">ID</th><th class="sticky-2">Employee Name</th>' +
      '<th style="min-width:150px">Organization</th>' +
      DB.otColumns.map(function (c) {
        return '<th' + (c.type === 'time' || c.type === 'auto' || c.type === 'code' ? ' class="col-num"' : '') +
          ' style="min-width:' + c.w + 'px">' + esc(c.label) + '</th>';
      }).join('') +
      '<th class="col-actions"></th></tr></thead><tbody>';

    slice.forEach(function (e) {
      var h = DB.otHours(e);
      var cd = DB.otCodeBy[e.code];
      html += '<tr' + (badId[e.id] ? ' class="row-blocking"' : '') + ' data-ot="' + e.id + '">' +
        '<td class="sticky-1 col-code">' + esc(e.empCode) + '</td>' +
        '<td class="sticky-2"><b style="font-weight:500">' + esc(e.name) + '</b></td>' +
        '<td style="color:var(--muted)">' + esc(e.position) + '</td>' +
        '<td class="cell-num"><input type="date" data-ot="' + e.id + '" data-k="date" value="' + esc(e.date) + '"' +
        (sh.locked ? ' disabled' : '') + '></td>' +
        '<td data-day="' + e.id + '" style="color:var(--muted)">' + esc(DB.dayName(e.date)) + '</td>' +
        '<td class="cell-num"><select data-ot="' + e.id + '" data-k="code" class="code-sel ' +
        (cd ? cd.color : 'c0') + '"' + (sh.locked ? ' disabled' : '') + '>' +
        '<option value="0"' + (!cd ? ' selected' : '') + '>—</option>' +
        DB.otCodes.map(function (c) {
          return '<option value="' + c.code + '"' + (e.code === c.code ? ' selected' : '') + '>' + c.code + '</option>';
        }).join('') + '</select></td>' +
        ['m1', 'm2', 'a1', 'a2'].map(function (k) {
          return '<td class="cell-num"><input type="time" data-ot="' + e.id + '" data-k="' + k + '" value="' +
            esc(otTime(e[k])) + '"' + (sh.locked ? ' disabled' : '') + '></td>';
        }).join('') +
        '<td class="col-num sum-thp' + (h <= 0 || h > 16 ? ' neg' : '') + '" data-oth="' + e.id + '">' +
        h.toFixed(2) + '</td>' +
        '<td class="cell-num"><input type="text" data-ot="' + e.id + '" data-k="notes" value="' + esc(e.notes) + '"' +
        (sh.locked ? ' disabled' : '') + ' style="text-align:left"></td>' +
        '<td class="col-actions">' +
        (sh.locked ? '' : '<button class="btn btn-sm" data-otdel="' + e.id + '">Hapus</button>') +
        '</td></tr>';
    });

    if (!slice.length) html += emptyInputRow(13, !!otSearch);
    html += '</tbody><tfoot><tr>' +
      '<td class="sticky-1"></td><td class="sticky-2"><b>Total lembar ' + esc(sheetLabel(otSheetKey)) + '</b></td>' +
      '<td colspan="8"></td>' +
      '<td class="col-num sum-thp">' + t.hours.toFixed(2) + '</td>' +
      '<td colspan="2"></td>' +
      '</tr></tfoot></table></div>';

    var from = rows.length ? (otPage - 1) * OT_SIZE + 1 : 0;
    var to = Math.min(otPage * OT_SIZE, rows.length);
    var pager = '';
    if (pages > 1) {
      pager += '<button data-otpage="' + (otPage - 1) + '"' + (otPage === 1 ? ' disabled' : '') + '>‹</button>';
      var st = Math.max(1, Math.min(otPage - 2, pages - 4));
      var en = Math.min(pages, st + 4);
      for (var p = st; p <= en; p++) {
        pager += '<button data-otpage="' + p + '"' + (p === otPage ? ' aria-current="true"' : '') + '>' + p + '</button>';
      }
      pager += '<button data-otpage="' + (otPage + 1) + '"' + (otPage === pages ? ' disabled' : '') + '>›</button>';
    }
    html += '<div class="table-foot"><span>Menampilkan ' + num(from) + '–' + num(to) + ' dari ' + num(rows.length) +
      ' baris di lembar ' + esc(sheetLabel(otSheetKey)) + '</span><div class="pager">' + pager + '</div></div></div>';

    html += '<div style="margin-top:16px">' + otStepperHTML(otPeriod) + '</div>';

    return { html: html, mount: mountOtEntry };
  }

  function sheetLabel(key) {
    var d = DB.otSheetDefs.filter(function (x) { return x.key === key; })[0];
    return d ? d.label : key;
  }

  function mountOtEntry() {
    UI.wireNoticeBoxes();
    var sh = DB.otSheets[otPeriod];
    var byId = {};
    sh.entries.forEach(function (e) { byId[e.id] = e; });

    var ps = q('#otPeriodSel');
    if (ps) ps.addEventListener('change', function () {
      otPeriod = this.value;
      if (!DB.otSheets[otPeriod]) DB.createOtPeriod(otPeriod, null, 'blank');
      otPage = 1; App.rerender();
    });

    qa('[data-otsheet]').forEach(function (b) {
      b.addEventListener('click', function () { otSheetKey = this.dataset.otsheet; otPage = 1; App.rerender(); });
    });

    qa('[data-otpage]').forEach(function (b) {
      b.addEventListener('click', function () { otPage = Number(this.dataset.otpage); App.rerender(); });
    });

    var sb = q('#otSearch');
    if (sb) sb.addEventListener('input', function () {
      var caret = this.selectionStart;
      otSearch = this.value; otPage = 1;
      App.rerender();
      var again = q('#otSearch');
      if (again) { again.focus(); try { again.setSelectionRange(caret, caret); } catch (e) {} }
    });

    /* Sel diubah memperbarui baris seketika: hari, total jam, dan warna kode */
    qa('[data-k]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var e = byId[this.dataset.ot];
        if (!e) return;
        var k = this.dataset.k;
        if (k === 'notes') { e.notes = this.value; return; }
        if (k === 'date') {
          e.date = this.value;
          var dc = q('[data-day="' + e.id + '"]');
          if (dc) dc.textContent = DB.dayName(e.date);
          return;
        }
        if (k === 'code') {
          e.code = Number(this.value);
          var cd = DB.otCodeBy[e.code];
          this.className = 'code-sel ' + (cd ? cd.color : 'c0');
          return;
        }
        e[k] = this.value ? DB.toMin(this.value) : null;
        var h = DB.otHours(e);
        var cell = q('[data-oth="' + e.id + '"]');
        if (cell) {
          cell.textContent = h.toFixed(2);
          cell.classList.toggle('neg', h <= 0 || h > 16);
        }
      });
      inp.addEventListener('change', function () { if (this.dataset.k === 'code') App.rerender(); });
    });

    qa('[data-otdel]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = this.dataset.otdel;
        var e = byId[id];
        UI.modal({
          title: 'Hapus baris lembur',
          sub: e.name + ' · ' + UI.dateID(e.date),
          body: '<p style="font-size:13px">Baris ini akan dihapus dari lembar ' + esc(sheetLabel(e.sheet)) +
            '. Penghapusan tercatat di jejak audit.</p>',
          confirm: 'Hapus baris', danger: true,
          onConfirm: function (close) {
            sh.entries = sh.entries.filter(function (x) { return x.id !== id; });
            DB.audit.unshift({
              ts: '2026-09-23 11:48', actor: App.user.name, role: App.user.role,
              action: 'Baris lembur dihapus', object: e.empCode + ' · ' + e.date, result: 'Berhasil',
              desc: 'Dihapus dari lembar ' + sheetLabel(e.sheet) + ' periode ' + otPeriod
            });
            close();
            UI.toast('Baris dihapus', e.name + ' · ' + UI.dateID(e.date), 'ok');
            App.rerender();
          }
        });
      });
    });

    var add = q('#otAdd');
    if (add) add.addEventListener('click', otAddForm);

    var rec = q('#otRecap');
    if (rec) rec.addEventListener('click', function () { otRecapPanel(sh); });

    var imp = q('#otImport');
    if (imp) imp.addEventListener('click', function () { otImportForm(otPeriod); });

    var onp = q('#otNewPeriod');
    if (onp) onp.addEventListener('click', otNewPeriodForm);

    var lock = q('#otLock');
    if (lock) lock.addEventListener('click', function () { otLock(sh); });

    var unlock = q('#otUnlock');
    if (unlock) unlock.addEventListener('click', function () {
      UI.modal({
        title: 'Buka kunci lembur ' + otPeriod,
        body: UI.notice('n-warn', 'Slip lembur yang sudah dibuat dianggap kedaluwarsa',
          'Setelah data diubah, slip harus dibuat ulang sebelum distribusi bisa dijalankan.'),
        confirm: 'Buka kunci', danger: true,
        onConfirm: function (close) {
          sh.locked = false; sh.generated = false; sh.sampleChecked = false; sh.handedOff = false;
          DB.audit.unshift({
            ts: '2026-09-23 11:50', actor: App.user.name, role: App.user.role,
            action: 'Kunci lembur dibuka', object: otPeriod, result: 'Berhasil',
            desc: 'Slip lembur ditandai kedaluwarsa dan harus dibuat ulang'
          });
          close(); UI.toast('Kunci dibuka', 'Slip lembur perlu dibuat ulang.', 'info'); App.rerender();
        }
      });
    });

    wireOtStepper();
  }

  function otLock(sh) {
    var blk = DB.otIssues(sh).filter(function (i) { return i.severity === 'BLOCKING'; });
    if (blk.length) {
      UI.modal({
        title: 'Periode lembur belum bisa dikunci',
        body: UI.notice('n-bad', blk.length + ' baris masih bermasalah di seluruh lembar',
          blk.slice(0, 8).map(function (i) {
            return '<div style="margin-top:4px">' + esc(i.who + ' — ' + i.message) + '</div>';
          }).join('') + (blk.length > 8 ? '<div style="margin-top:4px">dan ' + (blk.length - 8) + ' lainnya</div>' : '')),
        cancel: 'Mengerti'
      });
      return;
    }
    var t = DB.otSheetTotals(sh);
    UI.modal({
      title: 'Kunci periode lembur ' + otPeriod,
      body: '<p style="font-size:13px">Setelah dikunci, seluruh lembar tidak bisa diubah dan slip lembur bisa mulai dibuat.</p>' +
        '<div class="defs" style="margin-top:14px">' +
        '<div class="def"><span>Baris lembur</span><b>' + num(t.rows) + '</b></div>' +
        '<div class="def"><span>Karyawan</span><b>' + num(t.people) + '</b></div>' +
        '<div class="def"><span>Total jam</span><b>' + t.hours.toFixed(0) + '</b></div>' +
        '<div class="def"><span>Perkiraan upah</span><b>' + UI.rupiah(t.amount) + '</b></div>' +
        '</div>',
      confirm: 'Kunci periode',
      onConfirm: function (close) {
        sh.locked = true; sh.lockedBy = App.user.name; sh.lockedAt = '2026-09-23 11:52';
        DB.audit.unshift({
          ts: '2026-09-23 11:52', actor: App.user.name, role: App.user.role,
          action: 'Periode lembur dikunci', object: otPeriod, result: 'Berhasil',
          desc: num(t.rows) + ' baris untuk ' + num(t.people) + ' karyawan, total ' + t.hours.toFixed(0) + ' jam'
        });
        close(); UI.toast('Periode lembur dikunci', 'Slip lembur sekarang bisa dibuat.', 'ok');
        App.go('#/otgenerate');
      }
    });
  }

  function otAddForm() {
    var sheetDef = DB.otSheetDefs.filter(function (d) { return d.key === otSheetKey; })[0];
    var pool = DB.employees.filter(function (e) { return sheetDef.divisions.indexOf(e.division) > -1; });
    var dates = DB.periodDates(otPeriod);

    UI.modal({
      title: 'Tambah baris lembur',
      sub: 'Lembar ' + sheetLabel(otSheetKey) + ' · periode ' + otPeriod,
      wide: true,
      body:
        '<div class="form-grid">' +
        '<div class="field" style="grid-column:1/-1"><label>Karyawan</label><select id="oaEmp">' +
        pool.map(function (e) {
          return '<option value="' + e.code + '">' + esc(e.code + ' · ' + e.name + ' · ' + e.position) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>Tanggal</label><select id="oaDate">' +
        dates.map(function (d) {
          return '<option value="' + d + '">' + UI.dateID(d) + ' · ' + DB.dayName(d) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>Kode lembur</label><select id="oaCode">' +
        DB.otCodes.map(function (c) {
          return '<option value="' + c.code + '">' + c.code + ' — ' + esc(c.label) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>Start (Morning)</label><input type="time" id="oaM1" value="13:00"></div>' +
        '<div class="field"><label>Finish</label><input type="time" id="oaM2" value="14:00"></div>' +
        '<div class="field"><label>Start (Afternoon)</label><input type="time" id="oaA1" value="17:00"></div>' +
        '<div class="field"><label>Finish</label><input type="time" id="oaA2" value="18:00"></div>' +
        '<div class="field" style="grid-column:1/-1"><label>Notes — uraian pekerjaan</label>' +
        '<input type="text" id="oaNote" placeholder="Misalnya: service 500 jam unit DT 07"></div>' +
        '</div>' +
        '<div id="oaCalc" style="margin-top:16px"></div>',
      confirm: 'Tambahkan baris',
      onConfirm: function (close) {
        var e = DB.addOtEntry(otPeriod, {
          empCode: q('#oaEmp').value,
          date: q('#oaDate').value,
          code: Number(q('#oaCode').value),
          m1: DB.toMin(q('#oaM1').value), m2: DB.toMin(q('#oaM2').value),
          a1: DB.toMin(q('#oaA1').value), a2: DB.toMin(q('#oaA2').value),
          notes: q('#oaNote').value.trim()
        });
        DB.audit.unshift({
          ts: '2026-09-23 11:55', actor: App.user.name, role: App.user.role,
          action: 'Baris lembur ditambahkan', object: e.empCode + ' · ' + e.date, result: 'Berhasil',
          desc: DB.otHours(e).toFixed(2) + ' jam pada lembar ' + sheetLabel(e.sheet)
        });
        close();
        UI.toast('Baris ditambahkan', e.name + ' · ' + DB.otHours(e).toFixed(2) + ' jam', 'ok');
        App.rerender();
      }
    });

    function calc() {
      var e = {
        m1: DB.toMin(q('#oaM1').value), m2: DB.toMin(q('#oaM2').value),
        a1: DB.toMin(q('#oaA1').value), a2: DB.toMin(q('#oaA2').value)
      };
      var h = DB.otHours(e);
      var emp = DB.byCode[q('#oaEmp').value];
      var cd = DB.otCodeBy[Number(q('#oaCode').value)];
      var amount = emp ? Math.round(h * (emp.pay.pokok / DB.rates.overtimeDivisor) * cd.mult) : 0;
      q('#oaCalc').innerHTML = UI.notice(h > 0 && h <= 16 ? 'n-info' : 'n-bad',
        h > 0 && h <= 16 ? 'Total ' + h.toFixed(2) + ' jam' : 'Durasi tidak wajar: ' + h.toFixed(2) + ' jam',
        'Perkiraan upah lembur <b>' + UI.rupiah(amount) + '</b> dengan pengali ' + cd.mult + '× ' +
        'dari upah per jam ' + UI.rupiah(emp ? emp.pay.pokok / DB.rates.overtimeDivisor : 0) + '. ' +
        'Jam yang melewati tengah malam dihitung benar.');
    }
    calc();
    ['oaEmp', 'oaCode', 'oaM1', 'oaM2', 'oaA1', 'oaA2'].forEach(function (id) {
      q('#' + id).addEventListener('change', calc);
      q('#' + id).addEventListener('input', calc);
    });
  }

  function otNewPeriodForm() {
    var next = DB.nextPeriod();
    var exists = DB.periods.filter(function (p) { return !!DB.otSheets[p.code]; }).map(function (p) { return p.code; });
    var candidates = DB.periods.filter(function (p) { return !DB.otSheets[p.code]; });
    if (!candidates.length) candidates = [next];
    var sources = DB.periods.filter(function (p) { return !!DB.otSheets[p.code]; }).reverse();

    UI.modal({
      title: 'Buka periode lembur baru',
      sub: 'Menyiapkan lima lembar divisi sekaligus',
      wide: true,
      body:
        '<div class="form-grid">' +
        '<div class="field"><label>Periode</label><select id="onpCode">' +
        candidates.map(function (p, i) {
          return '<option value="' + p.code + '|' + esc(p.label) + '"' + (i === 0 ? ' selected' : '') + '>' +
            esc(p.label) + ' · ' + esc(p.range) + '</option>';
        }).join('') +
        (DB.otSheets[next.code] ? '' :
          '<option value="' + next.code + '|' + esc(next.label) + '">' + esc(next.label) + ' · ' + esc(next.range) + '</option>') +
        '</select></div>' +
        '<div class="field"><label>Salin dari periode</label><select id="onpSrc">' +
        sources.map(function (p, i) {
          return '<option value="' + p.code + '"' + (i === 0 ? ' selected' : '') + '>' + esc(p.label) + '</option>';
        }).join('') + '</select></div>' +
        '</div>' +

        '<h4 class="form-sep">Cara penyiapan data</h4>' +
        '<div class="opt-list">' +

        '<label class="opt"><input type="radio" name="onpMode" value="blank" checked>' +
        '<div><b>Mulai kosong</b>' +
        '<span>Kelima lembar dibuka tanpa baris sama sekali. Baris ditambahkan lewat impor Excel ' +
        'atau diketik satu per satu.</span>' +
        '<em>Disarankan — lembur tiap bulan berbeda, jadi mulai bersih lebih aman</em></div></label>' +

        '<label class="opt"><input type="radio" name="onpMode" value="import">' +
        '<div><b>Mulai kosong lalu langsung impor</b>' +
        '<span>Periode dibuka kosong dan jendela impor terbuka seketika, ' +
        'supaya seluruh lembar bisa diisi dari satu berkas Excel.</span>' +
        '<em>Paling cepat kalau pencatatan lembur masih dikerjakan di Excel</em></div></label>' +

        '<label class="opt"><input type="radio" name="onpMode" value="copy">' +
        '<div><b>Salin dari periode sebelumnya</b>' +
        '<span>Seluruh baris disalin dan tanggalnya digeser otomatis ke rentang periode baru. ' +
        'Jam dan uraian pekerjaan ikut tersalin.</span>' +
        '<em>Hati-hati — hasilnya wajib diperiksa baris per baris sebelum dikunci</em></div></label>' +

        '</div>' +
        '<div style="margin-top:16px">' +
        UI.notice('n-info', 'Pembagian lembar mengikuti divisi karyawan',
          'Sistem menaruh tiap baris ke lembar yang benar berdasarkan divisi karyawan di master — ' +
          'WHL, GA &amp; GM, PLTD, PORT &amp; JETTY, atau KONSTRUKSI. HR tidak perlu memilih lembar saat mengisi.') +
        '</div>',
      confirm: 'Buka periode',
      onConfirm: function (close) {
        var parts = q('#onpCode').value.split('|');
        var code = parts[0];
        if (DB.otSheets[code]) {
          UI.toast('Periode sudah ada', parts[1] + ' sudah dibuka sebelumnya.', 'bad');
          return;
        }
        var mode = (qa('input[name="onpMode"]').filter(function (r) { return r.checked; })[0] || {}).value || 'blank';
        var src = q('#onpSrc').value;

        if (!DB.periods.filter(function (p) { return p.code === code; }).length) {
          var meta = DB.nextPeriod();
          DB.periods.push({ code: meta.code, label: meta.label, range: meta.range });
        }
        var sh = DB.createOtPeriod(code, src, mode === 'copy' ? 'copy' : 'blank');
        DB.audit.unshift({
          ts: '2026-09-23 12:30', actor: App.user.name, role: App.user.role,
          action: 'Periode lembur dibuka', object: code, result: 'Berhasil',
          desc: sh.entries.length + ' baris disiapkan dengan cara ' + mode
        });
        otPeriod = code; otPage = 1; otSearch = '';
        close();
        UI.toast('Periode lembur ' + parts[1] + ' dibuka',
          sh.entries.length ? sh.entries.length + ' baris disalin.' : 'Lima lembar siap diisi.', 'ok');
        App.rerender();
        if (mode === 'import') setTimeout(function () { otImportForm(code); }, 200);
      }
    });
  }

  function otRecapPanel(sh) {
    var per = DB.otByEmployee(sh, otSheetKey);
    UI.drawer({
      title: 'Rekap per karyawan',
      sub: 'Lembar ' + sheetLabel(otSheetKey) + ' · periode ' + otPeriod,
      body: '<div class="table-scroll"><table class="data"><thead><tr>' +
        '<th>Karyawan</th><th class="col-num">Baris</th><th class="col-num">Jam</th>' +
        '<th class="col-num">Perkiraan upah</th></tr></thead><tbody>' +
        per.map(function (p) {
          var over = p.hours > DB.otCap;
          return '<tr><td><b style="font-weight:500">' + esc(p.name) + '</b>' +
            '<div class="col-code">' + esc(p.code) + '</div></td>' +
            '<td class="col-num">' + p.rows + '</td>' +
            '<td class="col-num"' + (over ? ' style="color:var(--ochre);font-weight:600"' : '') + '>' +
            p.hours.toFixed(1) + '</td>' +
            '<td class="col-num">' + UI.rupiah(p.amount) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div style="margin-top:14px">' + UI.notice('n-warn', 'Ambang peringatan ' + DB.otCap + ' jam per periode',
          'Angka ini disetel HR di halaman pengaturan dan bukan batas menurut peraturan. ' +
          'Penetapannya tetap keputusan HR dan bagian legal perusahaan.') + '</div>'
    });
  }

  /* =======================================================================
     IMPOR LEMBUR
     ======================================================================= */
  var OT_CSV_HEAD = ['EMPLOYEE ID', 'EMPLOYEE NAME', 'ORGANIZATION', 'EFFECTIVE DATE',
    'DAY', 'CODE', 'START MORNING', 'FINISH MORNING', 'START AFTERNOON', 'FINISH AFTERNOON', 'NOTES'];

  function otCsvTemplate(periodCode, sheetKey) {
    var sh = DB.otSheets[periodCode];
    var rows = DB.otEntriesOf(sh, sheetKey);
    var lines = [OT_CSV_HEAD.join(';')];
    rows.forEach(function (e) {
      lines.push([e.empCode, e.name, e.position, e.date, DB.dayName(e.date), e.code,
        otTime(e.m1), otTime(e.m2), otTime(e.a1), otTime(e.a2), e.notes]
        .map(function (v) { v = String(v == null ? '' : v); return v.indexOf(';') > -1 ? '"' + v + '"' : v; })
        .join(';'));
    });
    if (rows.length === 0) {
      /* Lembar kosong tetap diberi contoh, satu per lembar kalau cakupannya
         semua, supaya HR melihat format yang benar untuk tiap kelompok. */
      var keys = sheetKey ? [sheetKey] : DB.otSheetDefs.map(function (d) { return d.key; });
      keys.forEach(function (k) {
        var sample = DB.employees.filter(function (x) { return DB.divToSheet[x.division] === k; })[0];
        if (!sample) return;
        lines.push([sample.code, sample.name, sample.position, DB.periodDates(periodCode)[0],
          DB.dayName(DB.periodDates(periodCode)[0]), 1, '13:00', '14:00', '17:00', '18:00',
          'Contoh baris lembar ' + k + ' — hapus sebelum diunggah'].join(';'));
      });
    }
    return '\uFEFF' + lines.join('\r\n');
  }

  function otImportForm(periodCode) {
    var sh = DB.otSheets[periodCode];
    var parsed = null;

    var m = UI.modal({
      title: 'Impor data lembur dari Excel',
      sub: 'Periode ' + periodCode + ' · lembar ' + sheetLabel(otSheetKey),
      wide: true,
      body:
        '<div class="imp-steps">' +
        '<div class="imp-step"><i>1</i><div><b>Pilih cakupan dan unduh template</b>' +
        '<span>Template berisi baris yang sudah ada beserta judul kolomnya. ' +
        'Kalau masih kosong, template berisi satu baris contoh sebagai acuan format.</span>' +
        '<div class="field" style="margin-top:10px;max-width:320px"><label>Cakupan impor</label>' +
        '<select id="oiScope">' +
        '<option value="' + esc(otSheetKey) + '">Hanya lembar ' + esc(sheetLabel(otSheetKey)) + '</option>' +
        '<option value="ALL">Semua lembar sekaligus — 5 lembar dalam satu berkas</option>' +
        '</select></div>' +
        '<div class="btn-row" style="margin-top:10px">' +
        '<button class="btn btn-sm" id="oiTpl">' + icon('download', 13) + 'Unduh template</button>' +
        '<button class="btn btn-sm btn-link" id="oiCols">Lihat aturan kolom</button></div></div></div>' +

        '<div class="imp-step"><i>2</i><div><b>Pilih berkas yang sudah diisi</b>' +
        '<span>Simpan dari Excel sebagai <b>CSV</b>. Baris lama pada cakupan yang dipilih akan ' +
        '<b>diganti seluruhnya</b> oleh isi berkas — beda dengan payroll yang hanya memperbarui nilai ' +
        'per karyawan, karena jumlah baris lembur berubah tiap bulan. ' +
        'Lembar tujuan tiap baris ditentukan sistem dari divisi karyawan, bukan dari berkas.</span>' +
        '<div style="margin-top:9px"><input type="file" id="oiFile" accept=".csv,.txt,text/csv"></div></div></div>' +

        '<div class="imp-step"><i>3</i><div><b>Periksa hasil pembacaan</b>' +
        '<span>Tidak ada yang tersimpan sebelum Anda menekan terapkan.</span>' +
        '<div id="oiResult" style="margin-top:11px"></div></div></div>' +
        '</div>',
      confirm: 'Ganti isi lembar',
      onConfirm: function (close) {
        if (!parsed || !parsed.ok.length) {
          UI.toast('Belum ada data terbaca', 'Pilih berkas CSV yang sudah diisi.', 'bad');
          return;
        }
        var scope = q('#oiScope').value;
        if (scope === 'ALL') sh.entries = [];
        else sh.entries = sh.entries.filter(function (e) { return e.sheet !== scope; });
        parsed.ok.forEach(function (rec) { DB.addOtEntry(periodCode, rec); });
        DB.audit.unshift({
          ts: '2026-09-23 12:02', actor: App.user.name, role: App.user.role,
          action: 'Impor data lembur',
          object: periodCode + ' · ' + (scope === 'ALL' ? 'semua lembar' : sheetLabel(scope)), result: 'Berhasil',
          desc: parsed.ok.length + ' baris dimuat dari ' + esc(parsed.filename) +
            (parsed.unknown.length ? ', ' + parsed.unknown.length + ' ID tidak dikenali' : '')
        });
        close();
        UI.toast('Impor selesai', parsed.ok.length + ' baris lembur dimuat.', 'ok');
        App.rerender();
      }
    });

    q('#oiTpl', m.root).addEventListener('click', function () {
      var scope = q('#oiScope', m.root).value;
      downloadFile('Template_Lembur_' + scope + '_' + periodCode + '.csv',
        otCsvTemplate(periodCode, scope === 'ALL' ? null : scope));
      UI.toast('Template terunduh',
        scope === 'ALL' ? 'Berisi baris dari kelima lembar.' : 'Buka dengan Excel, isi, simpan sebagai CSV.', 'ok');
    });

    q('#oiCols', m.root).addEventListener('click', function () {
      q('#oiResult', m.root).innerHTML =
        '<div class="table-scroll" style="border:1px solid var(--line);border-radius:var(--r-sm)">' +
        '<table class="data"><thead><tr><th>Kolom</th><th>Aturan</th></tr></thead><tbody>' +
        [['EMPLOYEE ID', 'Wajib. Dipakai mencocokkan ke master karyawan.'],
         ['EMPLOYEE NAME', 'Hanya rujukan. Diambil ulang dari master, bukan dari berkas.'],
         ['ORGANIZATION', 'Hanya rujukan.'],
         ['EFFECTIVE DATE', 'Wajib. Format YYYY-MM-DD atau DD/MM/YYYY. Harus dalam rentang periode.'],
         ['DAY', 'Diabaikan. Dihitung ulang dari tanggal.'],
         ['CODE', 'Wajib 1, 2, atau 3.'],
         ['START MORNING / FINISH MORNING', 'Format HH:MM atau HH.MM. Boleh kosong.'],
         ['START AFTERNOON / FINISH AFTERNOON', 'Format sama. Boleh kosong.'],
         ['NOTES', 'Uraian pekerjaan, bebas.']]
          .map(function (r) {
            return '<tr><td class="col-code">' + esc(r[0]) + '</td><td style="color:var(--muted)">' + esc(r[1]) + '</td></tr>';
          }).join('') + '</tbody></table></div>' +
        '<div style="margin-top:12px">' + UI.notice('n-info', 'Total Overtime tidak perlu diisi',
          'Kolom itu dihitung sistem dari empat kolom waktu, termasuk shift yang melewati tengah malam. ' +
          'Kalau ada di berkas Anda, kolomnya diabaikan.') + '</div>';
    });

    bindImportFile(q('#oiFile', m.root), q('#oiResult', m.root),
      function (text, filename) { return readOtImport(text, filename, periodCode); },
      renderOtImportResult, function (value) { parsed = value; });
  }

  function parseDateLoose(raw) {
    var t = String(raw || '').trim();
    if (!t) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    var m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (m) {
      var y = m[3].length === 2 ? '20' + m[3] : m[3];
      return y + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[1]).padStart(2, '0');
    }
    return null;
  }

  function readOtImport(text, filename, periodCode) {
    var rows = parseCSV(text);
    var out = { filename: filename, ok: [], unknown: [], badDate: [], badTime: [], error: null };
    if (rows.length < 2) { out.error = 'Berkas kosong atau hanya berisi judul kolom.'; return out; }

    var head = rows[0].map(function (h) { return String(h).trim().toUpperCase(); });
    function idx() {
      for (var i = 0; i < arguments.length; i++) {
        var j = head.indexOf(arguments[i]);
        if (j > -1) return j;
      }
      return -1;
    }
    var iId = idx('EMPLOYEE ID', 'ID KARYAWAN', 'ID');
    var iDate = idx('EFFECTIVE DATE', 'TANGGAL');
    var iCode = idx('CODE', 'KODE');
    if (iId < 0 || iDate < 0) {
      out.error = 'Kolom EMPLOYEE ID dan EFFECTIVE DATE wajib ada. ' +
        'Sistem menolak mencocokkan berdasarkan nama karena nama bisa kembar.';
      return out;
    }
    var iM1 = idx('START MORNING', 'START (MORNING)');
    var iM2 = idx('FINISH MORNING', 'FINISH');
    var iA1 = idx('START AFTERNOON', 'START (AFTERNOON)');
    var iA2 = idx('FINISH AFTERNOON');
    var iN = idx('NOTES', 'KETERANGAN');

    var validSet = {};
    DB.periodDates(periodCode).forEach(function (d) { validSet[d] = true; });

    for (var i = 1; i < rows.length; i++) {
      var r = rows[i];
      var code = String(r[iId] || '').trim().toUpperCase();
      if (!code) continue;
      if (!DB.byCode[code]) { out.unknown.push(code); continue; }

      var date = parseDateLoose(r[iDate]);
      if (!date) { out.badDate.push(code + ' · "' + String(r[iDate]).slice(0, 14) + '"'); continue; }
      if (!validSet[date]) { out.badDate.push(code + ' · ' + date + ' di luar periode'); continue; }

      var rec = {
        empCode: code, date: date,
        code: Number(String(r[iCode] || '1').trim()) || 1,
        m1: iM1 > -1 ? DB.toMin(String(r[iM1]).trim()) : null,
        m2: iM2 > -1 ? DB.toMin(String(r[iM2]).trim()) : null,
        a1: iA1 > -1 ? DB.toMin(String(r[iA1]).trim()) : null,
        a2: iA2 > -1 ? DB.toMin(String(r[iA2]).trim()) : null,
        notes: iN > -1 ? String(r[iN] || '').trim() : ''
      };
      var h = DB.otHours(rec);
      if (h <= 0 || h > 16) out.badTime.push(code + ' · ' + date + ' = ' + h.toFixed(1) + ' jam');
      rec.hours = h;
      rec.name = DB.byCode[code].name;
      out.ok.push(rec);
    }
    return out;
  }

  function renderOtImportResult(box, p) {
    if (p.error) { box.innerHTML = UI.notice('n-bad', 'Berkas ditolak', esc(p.error)); return; }

    var people = {}, hours = 0;
    p.ok.forEach(function (r) { people[r.empCode] = 1; hours += r.hours; });

    var html = '<div class="imp-stats">' +
      '<div><b>' + num(p.ok.length) + '</b><span>baris terbaca</span></div>' +
      '<div><b>' + num(Object.keys(people).length) + '</b><span>karyawan</span></div>' +
      '<div><b>' + hours.toFixed(0) + '</b><span>total jam</span></div>' +
      '<div class="' + (p.unknown.length ? 'bad' : '') + '"><b>' + num(p.unknown.length) + '</b><span>ID tak dikenal</span></div>' +
      '<div class="' + (p.badDate.length ? 'bad' : '') + '"><b>' + num(p.badDate.length) + '</b><span>tanggal ditolak</span></div>' +
      '</div>';

    if (p.unknown.length) {
      html += '<div style="margin-top:12px">' + UI.notice('n-bad', p.unknown.length + ' ID tidak dikenali',
        esc(p.unknown.slice(0, 8).join(', ')) + (p.unknown.length > 8 ? ', dan lainnya' : '') +
        '. Baris tersebut dilewati.') + '</div>';
    }
    if (p.badDate.length) {
      html += '<div style="margin-top:12px">' + UI.notice('n-bad', p.badDate.length + ' tanggal ditolak',
        esc(p.badDate.slice(0, 6).join(' · ')) + '. Gunakan format YYYY-MM-DD dan pastikan dalam rentang periode.') + '</div>';
    }
    if (p.badTime.length) {
      html += '<div style="margin-top:12px">' + UI.notice('n-warn', p.badTime.length + ' baris dengan durasi tidak wajar',
        esc(p.badTime.slice(0, 6).join(' · ')) + '. Baris tetap dimuat tetapi akan ditandai sebagai penghambat.') + '</div>';
    }

    if (p.ok.length) {
      html += '<div style="margin-top:12px" class="table-scroll imp-preview"><table class="data">' +
        '<thead><tr><th>ID</th><th>Nama</th><th>Tanggal</th><th class="col-num">Kode</th>' +
        '<th class="col-num">Jam</th></tr></thead><tbody>' +
        p.ok.slice(0, 40).map(function (r) {
          return '<tr><td class="col-code">' + esc(r.empCode) + '</td><td>' + esc(r.name) + '</td>' +
            '<td>' + UI.dateID(r.date) + '</td><td class="col-num">' + r.code + '</td>' +
            '<td class="col-num"' + (r.hours <= 0 || r.hours > 16 ? ' style="color:var(--red);font-weight:600"' : '') + '>' +
            r.hours.toFixed(2) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        (p.ok.length > 40 ? '<p style="font-size:11.5px;color:var(--muted);margin-top:8px">Menampilkan 40 dari ' +
          num(p.ok.length) + ' baris.</p>' : '');
    }
    box.innerHTML = html;
  }

  /* =======================================================================
     ALUR LEMBUR
     ======================================================================= */
  function otSteps(code) {
    var sh = DB.otSheets[code];
    var b = DB.batches.filter(function (x) { return x.period === code && x.docType === 'OVERTIME'; })[0];
    var blk = DB.otIssues(sh).filter(function (i) { return i.severity === 'BLOCKING'; });
    return [
      { n: 1, key: 'input', title: 'Isi data lembur', note: sh.entries.length + ' baris di 5 lembar',
        done: sh.locked || (!blk.length && sh.entries.length > 0),
        blocked: blk.length ? blk.length + ' baris bermasalah' : null },
      { n: 2, key: 'lock', title: 'Kunci periode', note: 'Seluruh lembar dikunci sekaligus', done: sh.locked },
      { n: 3, key: 'generate', title: 'Buat slip lembur', note: 'Satu slip berisi seluruh baris karyawan', done: sh.generated },
      { n: 4, key: 'sample', title: 'Pemeriksaan acak', note: 'Wajib dilakukan manusia', done: !!sh.sampleChecked, gate: true },
      { n: 5, key: 'handoff', title: 'Serahkan ke distribusi', note: 'Slip dilampirkan ke batch', done: !!sh.handedOff },
      { n: 6, key: 'send', title: 'Setujui dan kirim', note: 'Persetujuan oleh orang kedua',
        done: !!(b && b.status === 'COMPLETED'), gate: true }
    ];
  }

  function otStepperHTML(code) {
    return renderWorkflow(code, otSteps(code), {
      name: 'lembur', allowAuto: !DB.otSheets[code].generated, autoAttr: 'data-otauto',
      stepAttr: 'data-otstep', inputHref: '#/otentry',
      labels: {
        input: 'Buka tabel lembur', lock: 'Kunci periode', generate: 'Buat slip lembur',
        sample: 'Mulai pemeriksaan acak', handoff: 'Serahkan ke batch', send: 'Buka batch'
      }
    });
  }

  function wireOtStepper() {
    qa('[data-otstep]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = this.dataset.otstep, sh = DB.otSheets[otPeriod];
        if (k === 'input') App.go('#/otentry');
        else if (k === 'lock') { App.go('#/otentry'); setTimeout(function () { otLock(sh); }, 140); }
        else if (k === 'generate') { App.go('#/otgenerate'); setTimeout(function () { var x = q('#otGenRun'); if (x) x.click(); }, 160); }
        else if (k === 'sample') { App.go('#/otgenerate'); setTimeout(function () { otSampleCheck(sh); }, 160); }
        else if (k === 'handoff') { App.go('#/otgenerate'); setTimeout(function () { otHandoff(sh); }, 160); }
        else App.go('#/batches');
      });
    });
    qa('[data-otauto]').forEach(function (b) {
      b.addEventListener('click', function () {
        var sh = DB.otSheets[otPeriod];
        var blk = DB.otIssues(sh).filter(function (i) { return i.severity === 'BLOCKING'; });
        if (blk.length) {
          UI.modal({ title: 'Belum bisa dijalankan',
            body: UI.notice('n-bad', blk.length + ' baris masih bermasalah', 'Perbaiki dulu di tabel lembur.'),
            cancel: 'Mengerti' });
          return;
        }
        UI.modal({
          title: 'Jalankan langkah otomatis',
          sub: otPeriod + ' · ' + sh.entries.length + ' baris lembur',
          body: '<div class="auto-list">' +
            (!sh.locked ? '<div>' + icon('check', 13) + 'Kunci seluruh lembar</div>' : '') +
            '<div>' + icon('check', 13) + 'Buat slip lembur per karyawan</div></div>' +
            UI.notice('n-warn', 'Berhenti sebelum pemeriksaan acak',
              'Sama seperti payroll, dua langkah terakhir tidak pernah diotomatiskan.'),
          confirm: 'Jalankan',
          onConfirm: function (close) {
            close();
            if (!sh.locked) {
              sh.locked = true; sh.lockedBy = App.user.name; sh.lockedAt = '2026-09-23 12:08';
            }
            App.go('#/otgenerate');
            setTimeout(function () { otRunGenerate(sh); }, 180);
          }
        });
      });
    });
  }

  /* =======================================================================
     BUAT SLIP LEMBUR
     ======================================================================= */

  /* Tata letak slip lembur berbeda dari slip gaji: berupa tabel harian
     lengkap dengan uraian pekerjaan, ditutup satu baris total jam. */
  function otSlipHTML(empCode, periodCode) {
    var sh = DB.otSheets[periodCode];
    var e = DB.byCode[empCode] || {};
    var rows = sh.entries.filter(function (x) { return x.empCode === empCode; })
      .sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var total = rows.reduce(function (s, x) { return s + DB.otHours(x); }, 0);

    return '<div class="otslip">' +
      '<table class="otslip-table"><thead><tr>' +
      '<th>Employee Name</th><th>Organization</th><th>Effective date</th><th>Day</th><th>Code</th>' +
      '<th>Start<br>(Morning)</th><th>Finish</th><th>Start<br>(Afternoon)</th><th>Finish</th>' +
      '<th>Total<br>Overtime</th><th>Notes</th></tr></thead><tbody>' +
      rows.map(function (x) {
        var cd = DB.otCodeBy[x.code];
        return '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.position) + '</td>' +
          '<td>' + esc(otSlipDate(x.date)) + '</td><td>' + esc(DB.dayName(x.date)) + '</td>' +
          '<td class="ot-code ' + (cd ? cd.color : 'c0') + '">' + (x.code || '') + '</td>' +
          '<td>' + esc(otTime(x.m1)) + '</td><td>' + esc(otTime(x.m2)) + '</td>' +
          '<td>' + esc(otTime(x.a1)) + '</td><td>' + esc(otTime(x.a2)) + '</td>' +
          '<td>' + DB.otHours(x).toFixed(2) + '</td><td class="ot-notes">' + esc(x.notes) + '</td></tr>';
      }).join('') +
      '<tr class="otslip-total"><td colspan="9">TOTAL OVERTIME</td><td>' + total.toFixed(2) + '</td><td></td></tr>' +
      '</tbody></table></div>';
  }

  function otSlipDate(iso) {
    var p = iso.split('-');
    return p[2] + '-' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(p[1]) - 1] +
      '-' + p[0].slice(2);
  }

  function otgenerate() {
    if (!can('salaryDetail')) {
      return { html: '<div class="card"><div class="empty">' + icon('lock', 34) +
        '<b>Halaman ini tidak tersedia untuk peran Anda</b>' +
        '<p>Pembuatan slip lembur hanya dapat dijalankan oleh HR Admin.</p></div></div>' };
    }

    var sh = DB.otSheets[otPeriod] || DB.createOtPeriod(otPeriod, null, 'blank');
    var period = DB.periods.filter(function (p) { return p.code === otPeriod; })[0] || { label: otPeriod };
    var t = DB.otSheetTotals(sh);
    var blk = DB.otIssues(sh).filter(function (i) { return i.severity === 'BLOCKING'; });
    var per = DB.otByEmployee(sh);
    var withMail = per.filter(function (p) { var e = DB.byCode[p.code]; return e && e.email; }).length;

    var html = '<p class="view-intro">Buat satu slip per karyawan yang memiliki catatan lembur, berisi rincian harian dan total jam.</p>';

    html += '<div class="period-bar">' +
      '<div class="period-pick"><label for="otGenPeriod">Periode lembur</label>' +
      '<select id="otGenPeriod">' +
      DB.periods.map(function (p) {
        return '<option value="' + p.code + '"' + (p.code === otPeriod ? ' selected' : '') + '>' +
          esc(p.label) + ' · ' + esc(p.range) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="period-meta">' +
      (sh.generated ? '<span class="badge b-sent"><i class="dot"></i>SLIP SUDAH DIBUAT</span>'
        : sh.locked ? '<span class="badge b-info"><i class="dot"></i>SIAP DIBUAT</span>'
          : '<span class="badge b-pending"><i class="dot"></i>DATA BELUM DIKUNCI</span>') +
      '</div></div>';

    html += '<div class="grid g-1-1" style="margin-bottom:16px">';
    html += '<div class="card"><div class="card-head"><div><h3>Prasyarat</h3>' +
      '<p>Semua harus hijau sebelum slip lembur dibuat</p></div></div><div class="checklist">' +
      preReq('Data lembur terisi', num(t.rows) + ' baris untuk ' + num(t.people) + ' karyawan', t.rows > 0) +
      preReq('Tidak ada baris bermasalah',
        blk.length ? blk.length + ' baris masih menghalangi' : 'Seluruh baris lolos pemeriksaan', blk.length === 0) +
      preReq('Periode sudah dikunci',
        sh.locked ? 'Dikunci ' + esc(sh.lockedAt || '') + ' oleh ' + esc(sh.lockedBy || '') : 'Kunci dulu di halaman input lembur',
        sh.locked) +
      preReq('Pengali kode lembur diverifikasi',
        'Kode 1 ' + DB.otCodes[0].mult + '× · kode 2 ' + DB.otCodes[1].mult + '× · kode 3 ' + DB.otCodes[2].mult + '×',
        false, true) +
      '</div></div>';

    html += '<div class="card"><div class="card-head"><div><h3>Yang akan dihasilkan</h3></div></div><div class="card-body">' +
      '<div class="metric-row" style="margin-bottom:16px">' +
      '<div class="metric"><span>Slip lembur</span><b>' + num(per.length) + '</b></div>' +
      '<div class="metric"><span>Total jam</span><b>' + t.hours.toFixed(0) + '</b></div>' +
      '<div class="metric"><span>Perkiraan upah</span><b>' + UI.rupiahShort(t.amount) + '</b></div>' +
      '</div>' +
      '<div class="defs">' +
      '<div class="def"><span>Pola nama berkas</span><b style="font-family:var(--mono);font-size:11.5px">Slip_Lembur_&lt;ID&gt;_' +
      esc(otPeriod.replace('-', '')) + '.pdf</b></div>' +
      '<div class="def"><span>Dikirim via email</span><b>' + num(withMail) + ' dari ' + num(per.length) + '</b></div>' +
      '</div>' +
      '<div class="btn-row" style="margin-top:18px">' +
      '<button class="btn btn-sm btn-primary" id="otGenRun"' +
      (sh.locked && !blk.length && t.rows ? '' : ' disabled title="Prasyarat belum terpenuhi"') + '>' +
      icon('play', 13) + (sh.generated ? 'Buat ulang seluruh slip' : 'Buat ' + num(per.length) + ' slip lembur') + '</button>' +
      (sh.locked ? '' : '<a class="btn btn-sm" href="#/otentry">Kembali ke input lembur</a>') +
      '</div></div></div>';
    html += '</div>';

    if (sh.generated) {
      html += '<div class="grid g-4" style="margin-bottom:16px">' +
        UI.kpi('Slip dibuat', num(per.length), 'Semuanya terkunci password', 'main') +
        UI.kpi('Siap kirim via email', num(withMail), 'Punya alamat email', 'good') +
        UI.kpi('Diserahkan manual', num(per.length - withMail), 'Tanpa email — dicetak HR',
          per.length - withMail ? 'warn' : 'good') +
        UI.kpi('Perkiraan upah lembur', UI.rupiahShort(t.amount), t.hours.toFixed(0) + ' jam', '') +
        '</div>';

      html += '<div class="card"><div class="card-head">' +
        '<div><h3>Slip lembur per karyawan</h3><p>Dibuat ' + esc(sh.generatedAt || '') +
        ' · klik baris untuk melihat isi slipnya</p></div><div class="spacer"></div>' +
        '<button class="btn btn-sm" id="otSample">' + icon('search', 13) +
        (sh.sampleChecked ? 'Periksa acak lagi' : 'Pemeriksaan acak') + '</button>' +
        '<button class="btn btn-sm" id="otPrintAll">' + icon('print', 13) + 'Cetak semua</button>' +
        '<button class="btn btn-sm btn-primary" id="otHandoff"' +
        (sh.sampleChecked ? '' : ' disabled title="Lakukan pemeriksaan acak terlebih dahulu"') + '>' +
        icon('send', 13) + 'Serahkan ke distribusi</button></div>';

      html += '<div class="filters"><div class="search-field">' + icon('search', 14) +
        '<input type="search" id="otGenSearch" placeholder="Cari nama atau ID…"></div>' +
        '<select id="otGenSheet"><option value="">Semua lembar</option>' +
        DB.otSheetDefs.map(function (d) { return '<option value="' + d.key + '">' + esc(d.label) + '</option>'; }).join('') +
        '</select></div>';

      if (!sh.sampleChecked) {
        html += '<div style="padding:0 16px 14px">' + UI.notice('n-warn', 'Pemeriksaan acak belum dilakukan',
          'Tombol serahkan terkunci sampai lima slip dibuka dan dicocokkan.') + '</div>';
      }

      html += '<div class="table-scroll" style="max-height:62vh;overflow:auto"><table class="data"><thead><tr>' +
        '<th>ID</th><th>Karyawan</th><th>Lembar</th><th>Nama berkas</th>' +
        '<th class="col-num">Baris</th><th class="col-num">Jam</th><th class="col-num">Perkiraan upah</th>' +
        '<th>Tujuan</th><th>Status</th><th class="col-actions"></th></tr></thead><tbody>' +
        per.map(function (p) {
          var e = DB.byCode[p.code] || {};
          return '<tr class="clickable gen-row" data-otslip="' + p.code + '" data-sheet="' + p.sheet + '" data-find="' +
            esc((p.code + ' ' + p.name).toLowerCase()) + '">' +
            '<td class="col-code">' + esc(p.code) + '</td>' +
            '<td><b style="font-weight:500">' + esc(p.name) + '</b>' +
            '<div style="font-size:10.5px;color:var(--muted)">' + esc(p.position) + '</div></td>' +
            '<td><span class="chip">' + esc(sheetLabel(p.sheet)) + '</span></td>' +
            '<td class="col-code">Slip_Lembur_' + esc(p.code) + '_' + esc(otPeriod.replace('-', '')) + '.pdf</td>' +
            '<td class="col-num">' + p.rows + '</td>' +
            '<td class="col-num"' + (p.hours > DB.otCap ? ' style="color:var(--ochre);font-weight:600"' : '') + '>' +
            p.hours.toFixed(1) + '</td>' +
            '<td class="col-num">' + UI.rupiah(p.amount) + '</td>' +
            '<td>' + (e.email ? '<span style="font-size:11.5px;color:var(--muted)">' + esc(e.email) + '</span>'
              : '<span class="chip">cetak manual</span>') + '</td>' +
            '<td>' + (sh.handedOff ? '<span class="badge b-sent"><i class="dot"></i>DI BATCH</span>'
              : sh.sampleChecked ? '<span class="badge b-sent"><i class="dot"></i>SIAP KIRIM</span>'
                : '<span class="badge b-pending"><i class="dot"></i>MENUNGGU PERIKSA</span>') + '</td>' +
            '<td class="col-actions"><button class="btn btn-sm" data-otslip2="' + p.code + '">Lihat slip</button></td>' +
            '</tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="table-foot"><span>' + num(per.length) + ' slip · ' + num(withMail) + ' via email · ' +
        num(per.length - withMail) + ' cetak manual</span></div></div>';
    } else {
      html += '<div class="card"><div class="empty">' + icon('file', 34) +
        '<b>Belum ada slip lembur untuk periode ini</b>' +
        '<p>Setelah data lembur dikunci, satu slip dibuat untuk tiap karyawan yang punya catatan lembur, ' +
        'berisi seluruh baris hariannya beserta total jam.</p></div></div>';
    }

    html += '<div style="margin-top:16px">' + otStepperHTML(otPeriod) + '</div>';

    return { html: html, mount: mountOtGenerate };
  }

  function mountOtGenerate() {
    UI.wireNoticeBoxes();
    var sh = DB.otSheets[otPeriod];

    var sel = q('#otGenPeriod');
    if (sel) sel.addEventListener('change', function () {
      otPeriod = this.value;
      if (!DB.otSheets[otPeriod]) DB.createOtPeriod(otPeriod, null, 'blank');
      App.rerender();
    });

    var run = q('#otGenRun');
    if (run) run.addEventListener('click', function () { otRunGenerate(sh); });

    qa('[data-otslip]').forEach(function (r) {
      r.addEventListener('click', function (ev) {
        if (ev.target.closest('[data-otslip2]')) return;
        otSlipPreview(this.dataset.otslip);
      });
    });
    qa('[data-otslip2]').forEach(function (b) {
      b.addEventListener('click', function (ev) { ev.stopPropagation(); otSlipPreview(this.dataset.otslip2); });
    });

    function filt() {
      var s = q('#otGenSearch'), f = q('#otGenSheet');
      var v = s ? s.value.toLowerCase() : '', d = f ? f.value : '';
      qa('[data-find]').forEach(function (c) {
        c.style.display = (!v || c.dataset.find.indexOf(v) > -1) && (!d || c.dataset.sheet === d) ? '' : 'none';
      });
    }
    var s1 = q('#otGenSearch');
    if (s1) s1.addEventListener('input', function () {
      var c = this.selectionStart; filt(); this.focus();
      try { this.setSelectionRange(c, c); } catch (e) {}
    });
    var s2 = q('#otGenSheet');
    if (s2) s2.addEventListener('change', filt);

    var smp = q('#otSample');
    if (smp) smp.addEventListener('click', function () { otSampleCheck(sh); });
    var pr = q('#otPrintAll');
    if (pr) pr.addEventListener('click', function () { otPrintAll(sh); });
    var ho = q('#otHandoff');
    if (ho) ho.addEventListener('click', function () { otHandoff(sh); });

    wireOtStepper();
  }

  function otRunGenerate(sh) {
    var per = DB.otByEmployee(sh);
    var total = per.length;
    var m = UI.modal({
      title: 'Membuat slip lembur',
      sub: otPeriod + ' · ' + total + ' karyawan',
      wide: true,
      body: '<div class="run-stat">' +
        '<div><span>Slip dibuat</span><b id="ogDone">0</b></div>' +
        '<div><span>Baris diproses</span><b id="ogRows">0</b></div>' +
        '<div><span>Sisa</span><b id="ogLeft">' + total + '</b></div></div>' +
        '<div class="segbar" style="height:11px"><span class="seg-sent" id="ogBar" style="width:0"></span></div>' +
        '<div class="run-log" id="ogLog"></div>',
      cancel: 'Tutup'
    });

    var i = 0, rows = 0;
    var log = q('#ogLog', m.root);
    var timer = setInterval(function () {
      var burst = 5;
      while (burst-- > 0 && i < total) {
        var p = per[i];
        rows += p.rows;
        if (i % 7 === 0) {
          log.insertAdjacentHTML('afterbegin',
            '<div><b>Slip_Lembur_' + esc(p.code) + '_' + esc(otPeriod.replace('-', '')) + '.pdf</b> — ' +
            p.rows + ' baris, ' + p.hours.toFixed(1) + ' jam</div>');
        }
        i++;
      }
      var a = q('#ogDone', m.root), b = q('#ogRows', m.root), c = q('#ogLeft', m.root), bar = q('#ogBar', m.root);
      if (a) a.textContent = num(i);
      if (b) b.textContent = num(rows);
      if (c) c.textContent = num(total - i);
      if (bar) bar.style.width = (i / total * 100) + '%';

      if (i >= total) {
        clearInterval(timer);
        sh.generated = true;
        sh.generatedAt = '2026-09-23 12:14';
        DB.audit.unshift({
          ts: '2026-09-23 12:14', actor: App.user.name, role: App.user.role,
          action: 'Slip lembur dibuat', object: otPeriod, result: 'Berhasil',
          desc: total + ' slip dari ' + num(rows) + ' baris lembur, terkunci password per karyawan'
        });
        var foot = q('.modal-foot', m.root);
        if (foot) {
          foot.innerHTML = '<button class="btn" data-x>Tutup</button>' +
            '<button class="btn btn-primary" data-x2>Mulai pemeriksaan acak</button>';
          q('[data-x]', foot).addEventListener('click', function () { m.close(); App.rerender(); });
          q('[data-x2]', foot).addEventListener('click', function () {
            m.close(); App.rerender(); setTimeout(function () { otSampleCheck(sh); }, 120);
          });
        }
        UI.toast('Slip lembur selesai', total + ' berkas siap diperiksa.', 'ok');
      }
    }, 60);
  }

  function otSlipPreview(empCode) {
    var sh = DB.otSheets[otPeriod];
    var e = DB.byCode[empCode] || {};
    var p = DB.otByEmployee(sh).filter(function (x) { return x.code === empCode; })[0] || {};
    var period = DB.periods.filter(function (x) { return x.code === otPeriod; })[0] || {};

    UI.modal({
      title: 'Slip lembur · ' + (e.name || empCode),
      sub: 'Slip_Lembur_' + empCode + '_' + otPeriod.replace('-', '') + '.pdf · ' +
        (p.rows || 0) + ' baris · ' + (p.hours || 0).toFixed(2) + ' jam',
      wide: true,
      body: '<div class="otslip-head">' +
        '<h4>' + esc(DB.company.toUpperCase()) + '</h4>' +
        '<p>Lembur periode ' + esc((period.range || '').toUpperCase()) + '</p></div>' +
        '<div class="slip-frame" style="padding:0;overflow-x:auto">' + otSlipHTML(empCode, otPeriod) + '</div>' +
        '<div style="margin-top:14px">' +
        UI.notice(e.email ? 'n-info' : 'n-warn',
          e.email ? 'Akan dikirim ke ' + e.email : 'Tidak punya alamat email',
          e.email ? 'Berkas dilampirkan terkunci password, terpisah dari slip gaji.'
            : 'Slip ini dicetak dan diserahkan langsung.') + '</div>',
      cancel: 'Tutup',
      confirm: 'Cetak slip ini',
      onConfirm: function () { otPrintSlips([empCode]); }
    });
  }

  function otSampleCheck(sh) {
    var per = DB.otByEmployee(sh);
    var picks = [];
    for (var i = 0; i < Math.min(5, per.length); i++) picks.push(per[(i * 37 + 11) % per.length]);

    UI.modal({
      title: 'Pemeriksaan acak slip lembur',
      sub: 'Lima slip dipilih acak — cocokkan tanggal, jam, dan uraian pekerjaannya',
      wide: true,
      body: '<div class="slip-strip">' +
        picks.map(function (p) {
          return '<div><div class="otslip-mini-head">' + esc(p.name) + ' · ' + esc(p.code) + ' · ' +
            p.hours.toFixed(2) + ' jam</div>' +
            '<div style="overflow-x:auto">' + otSlipHTML(p.code, otPeriod) + '</div></div>';
        }).join('') + '</div>' +
        '<div style="margin-top:14px">' + UI.notice('n-warn', 'Yang perlu dicocokkan pada slip lembur',
          'Berbeda dari slip gaji, yang rawan salah di sini adalah tanggal dan jam. ' +
          'Periksa apakah ada tanggal ganda, shift malam yang terhitung dua kali, atau jam yang tidak masuk akal.') + '</div>',
      cancel: 'Batal',
      confirm: 'Sudah saya periksa, semua cocok',
      onConfirm: function (close) {
        sh.sampleChecked = true;
        DB.audit.unshift({
          ts: '2026-09-23 12:18', actor: App.user.name, role: App.user.role,
          action: 'Pemeriksaan acak slip lembur', object: otPeriod, result: 'Berhasil',
          desc: '5 slip dibuka acak: ' + picks.map(function (p) { return p.code; }).join(', ')
        });
        close();
        UI.toast('Pemeriksaan tercatat', 'Slip lembur kini bertanda siap kirim.', 'ok');
        App.rerender();
      }
    });
  }

  function otPrintSlips(codes) {
    var period = DB.periods.filter(function (x) { return x.code === otPeriod; })[0] || {};
    q('#printArea').innerHTML = codes.map(function (c) {
      var e = DB.byCode[c] || {};
      return '<div class="slip-page otslip-page">' +
        '<div class="otslip-head"><h4>' + esc(DB.company.toUpperCase()) + '</h4>' +
        '<p>Lembur periode ' + esc((period.range || '').toUpperCase()) + ' — ' + esc(e.name || c) + '</p></div>' +
        otSlipHTML(c, otPeriod) + '</div>';
    }).join('');
    document.body.classList.add('printing');
    setTimeout(function () { window.print(); document.body.classList.remove('printing'); }, 80);
  }

  function otPrintAll(sh) {
    var per = DB.otByEmployee(sh);
    UI.modal({
      title: 'Cetak ' + per.length + ' slip lembur',
      body: '<p style="font-size:13px">Setiap karyawan mendapat satu halaman berisi seluruh baris lemburnya. ' +
        'Dari dialog cetak bisa langsung disimpan sebagai PDF.</p>' +
        UI.notice('n-info', 'Dicetak melintang',
          'Slip lembur punya sebelas kolom, jadi pilih orientasi <b>landscape</b> di dialog cetak agar tidak terpotong.'),
      confirm: 'Buka dialog cetak',
      onConfirm: function (close) { close(); otPrintSlips(per.map(function (p) { return p.code; })); }
    });
  }

  function otHandoff(sh) {
    var b = DB.batches.filter(function (x) {
      return x.period === otPeriod && x.docType === 'OVERTIME';
    })[0];
    if (!b) {
      b = {
        id: 'OT-' + otPeriod, period: otPeriod, docType: 'OVERTIME',
        label: 'Slip lembur ' + ((DB.periods.filter(function (p) { return p.code === otPeriod; })[0] || {}).label || otPeriod),
        status: 'VALIDATED', date: null, start: null, end: null, durationMin: null,
        createdBy: App.user.name, approvedBy: null,
        total: DB.otByEmployee(sh).length, processed: 0, sent: 0, failed: 0, pending: 0, exception: 0
      };
      DB.batches.push(b);
    }
    var per = DB.otByEmployee(sh);
    var noMail = per.filter(function (p) { var e = DB.byCode[p.code]; return !e || !e.email; }).length;

    UI.modal({
      title: 'Serahkan slip lembur ke distribusi',
      sub: b.id + ' · ' + per.length + ' slip',
      body: '<p style="font-size:13px">Slip lembur dikirim sebagai dokumen terpisah dari slip gaji, ' +
        'dengan templat email sendiri. Pengiriman tetap menunggu persetujuan.</p>' +
        '<div class="defs" style="margin-top:14px">' +
        '<div class="def"><span>Batch tujuan</span><b>' + esc(b.id) + '</b></div>' +
        '<div class="def"><span>Dikirim via email</span><b>' + (per.length - noMail) + '</b></div>' +
        '<div class="def"><span>Cetak manual</span><b>' + noMail + '</b></div>' +
        '</div>',
      confirm: 'Serahkan',
      onConfirm: function (close) {
        sh.handedOff = true;
        b.validationClear = true;
        b.total = per.length;
        b.exception = noMail;
        b.note = per.length + ' slip lembur sudah dibuat dan lolos pemeriksaan acak.';
        DB.audit.unshift({
          ts: '2026-09-23 12:22', actor: App.user.name, role: App.user.role,
          action: 'Slip lembur diserahkan ke distribusi', object: b.id, result: 'Berhasil',
          desc: per.length + ' slip dilampirkan ke batch, menunggu persetujuan pengiriman'
        });
        close();
        UI.toast('Diserahkan ke ' + b.id, 'Buka batch distribusi untuk menyetujui.', 'ok');
        App.go('#/batches');
      }
    });
  }

  /* =======================================================================
     IMPOR DARI BERKAS EXCEL
     -----------------------------------------------------------------------
     Pertukaran data memakai CSV, bukan .xlsx. Alasannya praktis: CSV terbaca
     langsung oleh Excel tanpa pustaka tambahan apa pun, sehingga sistem tetap
     satu berkas dan tetap jalan tanpa internet. Di sisi HR tidak ada bedanya —
     berkasnya dibuka, diisi, dan disimpan lewat Excel seperti biasa.
     ======================================================================= */

  var CSV_FIXED = [
    { key: 'code', label: 'ID KARYAWAN' },
    { key: 'name', label: 'NAMA' },
    { key: 'position', label: 'JABATAN' }
  ];

  function csvTemplate(periodCode) {
    var sh = DB.entrySheets[periodCode];
    var head = CSV_FIXED.map(function (c) { return c.label; })
      .concat(DB.entryColumns.map(function (c) { return c.label.toUpperCase(); }));

    /* Titik koma dipakai sebagai pemisah karena Excel dengan format wilayah
       Indonesia memakai koma untuk desimal. */
    var lines = [head.join(';')];
    sh.rows.forEach(function (r) {
      lines.push([r.code, r.name, r.position]
        .concat(DB.entryColumns.map(function (c) { return Number(r.values[c.key]) || 0; }))
        .map(function (v) { return String(v).indexOf(';') > -1 ? '"' + v + '"' : v; })
        .join(';'));
    });
    return '\uFEFF' + lines.join('\r\n');
  }

  function downloadFile(name, content, mime) {
    var blob = new Blob([content], { type: mime || 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 400);
  }

  /* FileReader dan penanganan gagal sama; parser serta penerapan data berbeda. */
  function bindImportFile(input, result, parse, render, setParsed) {
    var revision = 0;
    input.addEventListener('change', function () {
      var selected = ++revision;
      var file = this.files && this.files[0];
      setParsed(null);
      result.innerHTML = '';
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        if (selected !== revision) return;
        var parsed = parse(String(reader.result), file.name);
        setParsed(parsed);
        render(result, parsed);
      };
      reader.onerror = function () {
        if (selected !== revision) return;
        result.innerHTML = UI.notice('n-bad', 'Berkas tidak bisa dibaca',
          'Pastikan berkas disimpan sebagai CSV, bukan .xlsx atau .xls.');
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  /* Pembaca CSV sederhana yang menangani tanda kutip dan baris ganda */
  function parseCSV(text) {
    text = text.replace(/^\uFEFF/, '');
    var first = text.split(/\r?\n/)[0] || '';
    var delim = (first.split(';').length > first.split(',').length) ? ';' : ',';

    var rows = [], cur = [], val = '', quoted = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (quoted) {
        if (ch === '"') {
          if (text[i + 1] === '"') { val += '"'; i++; }
          else quoted = false;
        } else val += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === delim) { cur.push(val); val = ''; }
      else if (ch === '\n') { cur.push(val); rows.push(cur); cur = []; val = ''; }
      else if (ch !== '\r') val += ch;
    }
    if (val.length || cur.length) { cur.push(val); rows.push(cur); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); });
  }

  /* Angka dari Excel Indonesia bisa datang sebagai 3.550.000 atau 3550000,50.
     Titik diperlakukan sebagai pemisah ribuan hanya bila tidak ada koma. */
  function parseNumberID(raw) {
    var t = String(raw == null ? '' : raw).trim();
    if (!t || t === '-') return 0;
    t = t.replace(/[Rp\s]/gi, '');
    var neg = /^\(.*\)$/.test(t) || t.indexOf('-') === 0;
    t = t.replace(/[()\-]/g, '');
    if (t.indexOf(',') > -1) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/\./g, '');
    var n = parseFloat(t);
    if (isNaN(n)) return null;
    return Math.round(neg ? -n : n);
  }

  function importForm(periodCode, onDone) {
    var sh = DB.entrySheets[periodCode];
    var parsed = null;

    var m = UI.modal({
      title: 'Impor data payroll dari Excel',
      sub: 'Periode ' + periodCode + ' · ' + sh.rows.length + ' karyawan',
      wide: true,
      body:
        '<div class="imp-steps">' +

        '<div class="imp-step"><i>1</i><div>' +
        '<b>Unduh template</b>' +
        '<span>Berkas sudah berisi ID, nama, dan jabatan seluruh karyawan beserta kolom yang perlu diisi. ' +
        'Buka dengan Excel, isi angkanya, lalu simpan.</span>' +
        '<div class="btn-row" style="margin-top:9px">' +
        '<button class="btn btn-sm" id="impTpl">' + icon('download', 13) + 'Unduh template</button>' +
        '<button class="btn btn-sm btn-link" id="impCols">Lihat daftar kolom</button>' +
        '</div></div></div>' +

        '<div class="imp-step"><i>2</i><div>' +
        '<b>Pilih berkas yang sudah diisi</b>' +
        '<span>Simpan dari Excel sebagai <b>CSV</b> lalu pilih di sini. ' +
        'Pencocokan memakai kolom ID karyawan — urutan baris boleh berubah, baris boleh dihapus.</span>' +
        '<div style="margin-top:9px"><input type="file" id="impFile" accept=".csv,.txt,text/csv"></div>' +
        '</div></div>' +

        '<div class="imp-step"><i>3</i><div>' +
        '<b>Periksa hasil pembacaan</b>' +
        '<span>Sistem menampilkan apa yang akan berubah sebelum apa pun disimpan.</span>' +
        '<div id="impResult" style="margin-top:11px"></div>' +
        '</div></div>' +

        '</div>',
      confirm: 'Terapkan ke tabel',
      onConfirm: function (close) {
        if (!parsed || !parsed.ok.length) {
          UI.toast('Belum ada data terbaca', 'Pilih berkas CSV yang sudah diisi terlebih dahulu.', 'bad');
          return;
        }
        var byCode = {};
        sh.rows.forEach(function (r) { byCode[r.code] = r; });
        parsed.ok.forEach(function (rec) {
          var row = byCode[rec.code];
          if (!row) return;
          DB.entryColumns.forEach(function (c) {
            if (rec.values[c.key] !== null && rec.values[c.key] !== undefined) {
              row.values[c.key] = rec.values[c.key];
            }
          });
        });
        DB.refreshPeriodTotals(periodCode);
        DB.audit.unshift({
          ts: '2026-09-23 11:34', actor: App.user.name, role: App.user.role,
          action: 'Impor data payroll', object: periodCode, result: 'Berhasil',
          desc: parsed.ok.length + ' baris diperbarui dari berkas ' + esc(parsed.filename) +
            (parsed.unknown.length ? ', ' + parsed.unknown.length + ' ID tidak dikenali dan dilewati' : '')
        });
        close();
        UI.toast('Impor selesai', parsed.ok.length + ' baris diperbarui.', 'ok');
        if (onDone) onDone();
        App.rerender();
      }
    });

    q('#impTpl', m.root).addEventListener('click', function () {
      downloadFile('Template_Payroll_' + periodCode + '.csv', csvTemplate(periodCode));
      UI.toast('Template terunduh', 'Buka dengan Excel, isi, lalu simpan sebagai CSV.', 'ok');
    });

    q('#impCols', m.root).addEventListener('click', function () {
      var box = q('#impResult', m.root);
      box.innerHTML = '<div class="table-scroll" style="border:1px solid var(--line);border-radius:var(--r-sm)">' +
        '<table class="data"><thead><tr><th>Judul kolom di berkas</th><th>Isi</th></tr></thead><tbody>' +
        CSV_FIXED.map(function (c) {
          return '<tr><td class="col-code">' + esc(c.label) + '</td><td style="color:var(--muted)">' +
            (c.key === 'code' ? 'Wajib — dipakai untuk mencocokkan baris' : 'Hanya rujukan, tidak diubah sistem') +
            '</td></tr>';
        }).join('') +
        DB.entryColumns.map(function (c) {
          return '<tr><td class="col-code">' + esc(c.label.toUpperCase()) + '</td><td style="color:var(--muted)">' +
            (c.group === 'in' ? 'Penghasilan' : 'Potongan') + '</td></tr>';
        }).join('') +
        '</tbody></table></div>';
    });

    bindImportFile(q('#impFile', m.root), q('#impResult', m.root),
      function (text, filename) { return readImport(text, filename, sh); },
      renderImportResult, function (value) { parsed = value; });
  }

  function readImport(text, filename, sh) {
    var rows = parseCSV(text);
    var out = { filename: filename, ok: [], unknown: [], missing: [], badCells: [], header: null, error: null };
    if (rows.length < 2) { out.error = 'Berkas kosong atau hanya berisi judul kolom.'; return out; }

    var head = rows[0].map(function (h) { return String(h).trim().toUpperCase(); });
    var idIdx = head.indexOf('ID KARYAWAN');
    if (idIdx < 0) idIdx = head.indexOf('ID');
    if (idIdx < 0) {
      out.error = 'Kolom ID KARYAWAN tidak ditemukan. Sistem menolak mencocokkan berdasarkan nama ' +
        'karena nama bisa kembar atau berbeda penulisan.';
      return out;
    }
    out.header = head;

    var colIdx = {};
    DB.entryColumns.forEach(function (c) {
      var i = head.indexOf(c.label.toUpperCase());
      if (i > -1) colIdx[c.key] = i;
    });
    if (!Object.keys(colIdx).length) {
      out.error = 'Tidak ada satu pun kolom nilai yang dikenali. Gunakan template yang disediakan sistem.';
      return out;
    }

    var known = {};
    sh.rows.forEach(function (r) { known[r.code] = r; });
    var seen = {};

    for (var i = 1; i < rows.length; i++) {
      var raw = rows[i];
      var code = String(raw[idIdx] || '').trim().toUpperCase();
      if (!code) continue;
      if (!known[code]) { out.unknown.push(code); continue; }
      if (seen[code]) { out.unknown.push(code + ' (ganda)'); continue; }
      seen[code] = true;

      var values = {}, changed = 0;
      Object.keys(colIdx).forEach(function (key) {
        var n = parseNumberID(raw[colIdx[key]]);
        if (n === null) {
          out.badCells.push(code + ' · ' + key + ' = "' + String(raw[colIdx[key]]).slice(0, 16) + '"');
          return;
        }
        values[key] = n;
        if (n !== (Number(known[code].values[key]) || 0)) changed++;
      });
      out.ok.push({ code: code, name: known[code].name, values: values, changed: changed });
    }

    sh.rows.forEach(function (r) { if (!seen[r.code]) out.missing.push(r.code); });
    out.cols = Object.keys(colIdx).length;
    return out;
  }

  function renderImportResult(box, p) {
    if (p.error) {
      box.innerHTML = UI.notice('n-bad', 'Berkas ditolak', esc(p.error));
      return;
    }

    var changedRows = p.ok.filter(function (r) { return r.changed > 0; });
    var html = '<div class="imp-stats">' +
      '<div><b>' + num(p.ok.length) + '</b><span>baris cocok</span></div>' +
      '<div><b>' + num(changedRows.length) + '</b><span>nilainya berubah</span></div>' +
      '<div><b>' + num(p.cols) + '</b><span>kolom terbaca</span></div>' +
      '<div class="' + (p.unknown.length ? 'bad' : '') + '"><b>' + num(p.unknown.length) + '</b><span>ID tak dikenal</span></div>' +
      '<div class="' + (p.missing.length ? 'warn' : '') + '"><b>' + num(p.missing.length) + '</b><span>tidak ada di berkas</span></div>' +
      '</div>';

    if (p.unknown.length) {
      html += '<div style="margin-top:12px">' + UI.notice('n-bad',
        p.unknown.length + ' ID tidak dikenali dan akan dilewati',
        esc(p.unknown.slice(0, 8).join(', ')) + (p.unknown.length > 8 ? ', dan lainnya' : '') +
        '. Periksa apakah karyawan ini sudah terdaftar di master.') + '</div>';
    }
    if (p.missing.length) {
      html += '<div style="margin-top:12px">' + UI.notice('n-warn',
        p.missing.length + ' karyawan tidak ada di berkas',
        'Nilai mereka di tabel dibiarkan apa adanya, tidak dikosongkan. ' +
        'Kalau seharusnya ikut terisi, lengkapi berkasnya lalu impor ulang.') + '</div>';
    }
    if (p.badCells.length) {
      html += '<div style="margin-top:12px">' + UI.notice('n-warn',
        p.badCells.length + ' sel tidak terbaca sebagai angka',
        esc(p.badCells.slice(0, 5).join(' · ')) + (p.badCells.length > 5 ? ' dan lainnya' : '') +
        '. Sel tersebut dilewati, nilai lamanya dipertahankan.') + '</div>';
    }

    if (changedRows.length) {
      html += '<div style="margin-top:12px" class="table-scroll imp-preview">' +
        '<table class="data"><thead><tr><th>ID</th><th>Nama</th><th class="col-num">Kolom berubah</th>' +
        '<th class="col-num">Take home pay baru</th></tr></thead><tbody>' +
        changedRows.slice(0, 40).map(function (r) {
          var t = DB.entryTotals({ values: r.values });
          return '<tr><td class="col-code">' + esc(r.code) + '</td><td>' + esc(r.name) + '</td>' +
            '<td class="col-num">' + r.changed + '</td>' +
            '<td class="col-num"' + (t.thp < 0 ? ' style="color:var(--red);font-weight:600"' : '') + '>' +
            UI.rupiah(t.thp) + '</td></tr>';
        }).join('') +
        '</tbody></table></div>' +
        (changedRows.length > 40 ? '<p style="font-size:11.5px;color:var(--muted);margin-top:8px">' +
          'Menampilkan 40 baris pertama dari ' + num(changedRows.length) + '.</p>' : '');
    } else {
      html += '<div style="margin-top:12px">' + UI.notice('n-info', 'Tidak ada nilai yang berubah',
        'Isi berkas sama persis dengan yang sudah ada di tabel.') + '</div>';
    }

    box.innerHTML = html;
  }

  function terRateFor(ptkp, bruto) {
    var cat = DB.terCategory(ptkp);
    var tbl = DB.terTable[cat];
    for (var i = 0; i < tbl.length; i++) if (bruto <= tbl[i][0]) return tbl[i][1];
    return tbl[tbl.length - 1][1];
  }

  /* -------------------------------------------- buka periode baru --- */
  function newPeriodForm() {
    var next = DB.nextPeriod();
    var sources = DB.periods.slice().reverse();

    UI.modal({
      title: 'Buka periode payroll baru',
      sub: 'Data bulan baru disiapkan dari periode sebelumnya',
      wide: true,
      body:
        '<div class="form-grid">' +
        '<div class="field"><label>Periode</label>' +
        '<select id="npCode">' +
        [next, DB.periodMeta(next.year, next.monthIdx === 11 ? 0 : next.monthIdx + 1)]
          .map(function (m, i) {
            return '<option value="' + m.code + '|' + esc(m.label) + '|' + esc(m.range) + '"' +
              (i === 0 ? ' selected' : '') + '>' + esc(m.label) + '</option>';
          }).join('') + '</select></div>' +
        '<div class="field"><label>Salin dari periode</label>' +
        '<select id="npSrc">' +
        sources.map(function (p, i) {
          return '<option value="' + p.code + '"' + (i === 0 ? ' selected' : '') + '>' + esc(p.label) + '</option>';
        }).join('') + '</select></div>' +
        '</div>' +

        '<h4 class="form-sep">Cara penyiapan data</h4>' +
        '<div class="opt-list">' +

        '<label class="opt"><input type="radio" name="npMode" value="fixed" checked>' +
        '<div><b>Bawa komponen tetap, kosongkan yang berubah</b>' +
        '<span>Gaji pokok, tunjangan kehadiran, tunjangan skill, JHT, dan BPJS dibawa dari periode sebelumnya. ' +
        'Lembur, rapel, kompensasi, dan potongan absen dikosongkan.</span>' +
        '<em>Disarankan — ini yang biasanya diinginkan HR tiap bulan</em></div></label>' +

        '<label class="opt"><input type="radio" name="npMode" value="full">' +
        '<div><b>Salin seluruh nilai apa adanya</b>' +
        '<span>Semua kolom sama dengan periode sebelumnya, termasuk lembur dan rapel.</span>' +
        '<em>Hati-hati — lembur bulan lalu ikut tersalin dan harus diperiksa satu per satu</em></div></label>' +

        '<label class="opt"><input type="radio" name="npMode" value="blank">' +
        '<div><b>Mulai kosong</b>' +
        '<span>Seluruh kolom nol, diisi manual dari awal.</span>' +
        '<em>Nama dan jabatan karyawan tetap terisi dari master</em></div></label>' +

        '<label class="opt"><input type="radio" name="npMode" value="import">' +
        '<div><b>Impor dari berkas Excel</b>' +
        '<span>Periode dibuka kosong, lalu jendela impor langsung terbuka. ' +
        'Unduh template, isi di Excel, unggah kembali — seluruh 252 baris terisi sekaligus.</span>' +
        '<em>Paling cepat kalau perhitungan payroll masih dikerjakan di Excel</em></div></label>' +

        '</div>' +

        '<div style="margin-top:16px">' +
        UI.notice('n-info', 'Karyawan baru ikut masuk otomatis',
          'Karyawan yang ditambahkan ke master setelah periode lalu akan muncul di tabel dengan penanda ' +
          '<b>baru</b> dan komponen gaji dari data kepegawaiannya, bukan dari periode sebelumnya.') +
        '</div>',
      confirm: 'Buka periode',
      onConfirm: function (close) {
        var parts = q('#npCode').value.split('|');
        var meta = { code: parts[0], label: parts[1], range: parts[2] };
        if (DB.entrySheets[meta.code]) {
          UI.toast('Periode sudah ada', meta.label + ' sudah dibuka sebelumnya.', 'bad');
          return;
        }
        var src = q('#npSrc').value;
        var mode = (qa('input[name="npMode"]').filter(function (r) { return r.checked; })[0] || {}).value || 'fixed';

        var sh = DB.createPeriod(meta, (mode === 'blank' || mode === 'import') ? null : src, mode);
        DB.refreshPeriodTotals(meta.code);
        DB.audit.unshift({
          ts: '2026-09-23 11:10', actor: App.user.name, role: App.user.role,
          action: 'Periode payroll dibuka', object: meta.code, result: 'Berhasil',
          desc: sh.rows.length + ' baris disiapkan dari ' + (mode === 'blank' ? 'lembar kosong' : src) +
            ' dengan cara ' + mode
        });

        entryPeriod = meta.code;
        entryPage = 1;
        close();
        UI.toast('Periode ' + meta.label + ' dibuka', sh.rows.length + ' baris siap diisi.', 'ok');
        App.rerender();
        if (mode === 'import') setTimeout(function () { importForm(meta.code); }, 200);
      }
    });
  }

  /* -------------------------------------------- edit satu karyawan --- */
  function editRow(code) {
    var sh = DB.entrySheets[entryPeriod];
    var row = sh.rows.filter(function (r) { return r.code === code; })[0];
    if (!row) return;
    var e = DB.byCode[code] || {};
    var prevSheet = sh.createdFrom ? DB.entrySheets[sh.createdFrom] : null;
    var prev = prevSheet ? prevSheet.rows.filter(function (r) { return r.code === code; })[0] : null;

    function fields(group) {
      return DB.entryColumns.filter(function (c) { return c.group === group; }).map(function (c) {
        var was = prev ? Number(prev.values[c.key]) || 0 : null;
        return '<div class="field"><label>' + esc(c.label) +
          (was !== null ? ' <em class="was">bulan lalu ' + UI.rupiah(was) + '</em>' : '') + '</label>' +
          '<input type="number" step="1000" data-ek="' + c.key + '" value="' + (row.values[c.key] || 0) + '"' +
          (sh.locked ? ' disabled' : '') + '></div>';
      }).join('');
    }

    var d = UI.drawer({
      title: row.name,
      sub: code + ' · ' + row.position + ' · periode ' + entryPeriod,
      body:
        (sh.locked
          ? UI.notice('n-warn', 'Periode sedang terkunci',
            'Nilai hanya bisa dilihat. Buka kunci di halaman input kalau perlu diubah — ' +
            'pembukaan kunci tercatat di jejak audit.') + '<div style="height:18px"></div>'
          : '') +
        (row.isNew
          ? UI.notice('n-info', 'Karyawan baru di periode ini',
            esc(row.note || 'Belum ada data periode sebelumnya sebagai pembanding.')) + '<div style="height:18px"></div>'
          : '') +

        '<h4 class="form-sep" style="margin-top:0">Penghasilan</h4>' +
        '<div class="form-grid">' + fields('in') + '</div>' +

        '<h4 class="form-sep">Potongan</h4>' +
        '<div class="form-grid">' + fields('out') + '</div>' +

        '<div class="edit-sum" id="editSum"></div>' +

        '<h4 class="form-sep">Catatan</h4>' +
        '<textarea id="editNote" rows="2" style="width:100%" placeholder="Alasan perubahan, misalnya koreksi absen atau rapel susulan"' +
        (sh.locked ? ' disabled' : '') + '>' + esc(row.note || '') + '</textarea>' +
        '<p style="font-size:11.5px;color:var(--muted);margin-top:6px">Catatan tersimpan bersama baris dan ikut terbaca saat audit.</p>' +

        (sh.locked ? '' :
          '<div class="btn-row" style="margin-top:20px">' +
          '<button class="btn btn-sm btn-primary" id="editSave">Simpan perubahan</button>' +
          (prev ? '<button class="btn btn-sm" id="editReset">Kembalikan ke nilai bulan lalu</button>' : '') +
          '<button class="btn btn-sm" id="editZero">Kosongkan variabel</button>' +
          '</div>'),
      onReady: function (root, close) {
        function readAll() {
          var v = {};
          qa('[data-ek]', root).forEach(function (i) { v[i.dataset.ek] = Number(i.value) || 0; });
          return v;
        }
        function paint() {
          var t = DB.entryTotals({ values: readAll() });
          q('#editSum', root).innerHTML =
            '<div><span>Total penghasilan</span><b>' + UI.rupiah(t.bruto) + '</b></div>' +
            '<div><span>Total potongan</span><b>' + UI.rupiah(t.potongan) + '</b></div>' +
            '<div class="big' + (t.thp < 0 ? ' neg' : '') + '"><span>Take home pay</span><b>' + UI.rupiah(t.thp) + '</b></div>';
        }
        paint();
        qa('[data-ek]', root).forEach(function (i) { i.addEventListener('input', paint); });

        var sv = q('#editSave', root);
        if (sv) sv.addEventListener('click', function () {
          var v = readAll();
          var t = DB.entryTotals({ values: v });
          if (t.thp < 0) {
            UI.toast('Take home pay minus', 'Potongan melebihi penghasilan. Periksa kolom potongan dulu.', 'bad');
            return;
          }
          DB.entryColumns.forEach(function (c) { row.values[c.key] = v[c.key] || 0; });
          row.note = q('#editNote', root).value.trim();
          DB.refreshPeriodTotals(entryPeriod);
          DB.audit.unshift({
            ts: '2026-09-23 11:16', actor: App.user.name, role: App.user.role,
            action: 'Baris payroll diubah', object: code + ' · ' + entryPeriod, result: 'Berhasil',
            desc: 'Take home pay menjadi ' + UI.rupiah(t.thp) + (row.note ? ' — ' + row.note : '')
          });
          close();
          UI.toast('Perubahan disimpan', row.name + ' diperbarui.', 'ok');
          App.rerender();
        });

        var rs = q('#editReset', root);
        if (rs) rs.addEventListener('click', function () {
          qa('[data-ek]', root).forEach(function (i) {
            i.value = Number(prev.values[i.dataset.ek]) || 0;
          });
          paint();
          UI.toast('Nilai bulan lalu dimuat', 'Belum tersimpan — tekan simpan kalau sudah benar.', 'info');
        });

        var zr = q('#editZero', root);
        if (zr) zr.addEventListener('click', function () {
          qa('[data-ek]', root).forEach(function (i) {
            if (DB.variableKeys.indexOf(i.dataset.ek) > -1) i.value = 0;
          });
          paint();
          UI.toast('Kolom variabel dikosongkan', 'Lembur, rapel, kompensasi, dan absen dinolkan.', 'info');
        });
      }
    });
    return d;
  }

  /* ------------------------------------------------- ubah massal --- */
  function bulkEditForm() {
    var sh = DB.entrySheets[entryPeriod];

    UI.modal({
      title: 'Ubah massal',
      sub: 'Menerapkan satu nilai ke banyak baris sekaligus',
      wide: true,
      body:
        '<div class="form-grid">' +
        '<div class="field"><label>Kolom yang diubah</label><select id="bkCol">' +
        DB.entryColumns.map(function (c) {
          return '<option value="' + c.key + '">' + esc(c.label) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>Berlaku untuk</label><select id="bkScope">' +
        '<option value="all">Seluruh ' + sh.rows.length + ' karyawan</option>' +
        DB.divisions.map(function (d) {
          var n = DB.employees.filter(function (e) { return e.division === d.key; }).length;
          return '<option value="' + d.key + '">' + esc(d.name) + ' (' + n + ' orang)</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>Cara penerapan</label><select id="bkOp">' +
        '<option value="set">Ganti dengan nilai berikut</option>' +
        '<option value="add">Tambahkan sejumlah</option>' +
        '<option value="pct">Naikkan atau turunkan persen</option>' +
        '<option value="zero">Kosongkan menjadi nol</option>' +
        '</select></div>' +
        '<div class="field"><label>Nilai</label><input type="number" id="bkVal" value="0" step="1000"></div>' +
        '</div>' +
        '<div id="bkPreview" style="margin-top:16px"></div>',
      confirm: 'Terapkan',
      onConfirm: function (close) {
        var key = q('#bkCol').value, scope = q('#bkScope').value;
        var op = q('#bkOp').value, val = Number(q('#bkVal').value) || 0;
        var target = sh.rows.filter(function (r) {
          if (scope === 'all') return true;
          var e = DB.byCode[r.code];
          return e && e.division === scope;
        });
        target.forEach(function (r) {
          var cur = Number(r.values[key]) || 0;
          r.values[key] = op === 'set' ? val
            : op === 'add' ? cur + val
              : op === 'pct' ? Math.round(cur * (1 + val / 100))
                : 0;
          if (r.values[key] < 0) r.values[key] = 0;
        });
        DB.refreshPeriodTotals(entryPeriod);
        var colLabel = DB.entryColumns.filter(function (c) { return c.key === key; })[0].label;
        DB.audit.unshift({
          ts: '2026-09-23 11:20', actor: App.user.name, role: App.user.role,
          action: 'Ubah massal kolom payroll', object: entryPeriod, result: 'Berhasil',
          desc: colLabel + ' diubah pada ' + target.length + ' baris dengan cara ' + op
        });
        close();
        UI.toast('Diterapkan ke ' + target.length + ' baris', colLabel + ' diperbarui.', 'ok');
        App.rerender();
      }
    });

    function preview() {
      var key = q('#bkCol').value, scope = q('#bkScope').value;
      var op = q('#bkOp').value, val = Number(q('#bkVal').value) || 0;
      var target = sh.rows.filter(function (r) {
        if (scope === 'all') return true;
        var e = DB.byCode[r.code];
        return e && e.division === scope;
      });
      var before = 0, after = 0;
      target.forEach(function (r) {
        var cur = Number(r.values[key]) || 0;
        before += cur;
        after += op === 'set' ? val : op === 'add' ? cur + val
          : op === 'pct' ? Math.round(cur * (1 + val / 100)) : 0;
      });
      q('#bkPreview').innerHTML = UI.notice(
        Math.abs(after - before) > before * 0.5 && before > 0 ? 'n-warn' : 'n-info',
        target.length + ' baris akan berubah',
        'Jumlah kolom ini sekarang <b>' + UI.rupiah(before) + '</b> dan akan menjadi <b>' +
        UI.rupiah(after) + '</b>. Perubahan ini dicatat di jejak audit atas nama Anda.');
    }
    preview();
    ['bkCol', 'bkScope', 'bkOp', 'bkVal'].forEach(function (id) {
      q('#' + id).addEventListener('input', preview);
      q('#' + id).addEventListener('change', preview);
    });
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
      '<p class="view-intro">Bandingkan perhitungan sistem dengan payroll perusahaan. ' +
      '<b>Angka resmi tetap mengikuti berkas perusahaan.</b></p>' +

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
        'Selisih melebihi ambang ' + DB.rates.crossCheckTolerance + '%. Periksa data dan rumus sebelum distribusi.') + '</div>';
    } else {
      head += '<div style="margin-bottom:16px">' + UI.notice('n-ok',
        'Seluruh baris cocok dengan berkas payroll',
        'Tidak ada selisih di atas ambang ' + DB.rates.crossCheckTolerance + '%.') + '</div>';
    }

    if (!DB.rates.verified) {
      head += '<div style="margin-bottom:16px">' + UI.notice('n-warn',
        'Tarif potongan belum diverifikasi',
        'Hasil hitung masih estimasi. Periksa tarif BPJS dan TER PPh 21 di <a href="#/settings">Pengaturan</a>.') + '</div>';
    }

    host.innerHTML = head;
    host.appendChild(tbl.root);
    return { node: host };
  }

  /* =======================================================================
     3 · BATCH PAYROLL
     ======================================================================= */
  function batches() {
    var html = '<p class="view-intro">Pantau kesiapan dan pengiriman setiap batch.</p>';

    /* Alur periode yang sedang dikerjakan, supaya HR tahu posisinya */
    if (can('salaryDetail') && DB.entrySheets[entryPeriod]) {
      html += '<div style="margin-bottom:16px">' + stepperHTML(entryPeriod) + '</div>';
    }

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
        html += '<a class="btn btn-sm" href="#/entry">' + icon('grid', 13) + 'Buka tabel input</a>';
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
        wireStepper();
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
          'Prototipe ini hanya menyimulasikan pengiriman; tidak ada email sungguhan yang dikirim. ' +
          'Pada sistem produksi, email terkirim tidak bisa ditarik kembali. Pastikan pemeriksaan acak sudah dilakukan ' +
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
    var html = '<p class="view-intro">Cocokkan slip dengan penerima menggunakan ID karyawan pada nama berkas.</p>';

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
     6 · PELACAKAN PENGIRIMAN
     ======================================================================= */
  var trackDoc = '';

  function tracking() {
    var rows = DB.allDeliveries();
    if (trackDoc) rows = rows.filter(function (r) { return r.docType === trackDoc; });
    var s = DB.summarise(rows);

    var payS = DB.summarise(DB.deliveries);
    var otS = DB.summarise(DB.otDeliveries);

    var t = UI.dataTable({
      rows: rows,
      pageSize: 15,
      searchPlaceholder: 'Cari nama, ID, atau email…',
      searchOn: function (r) {
        var e = DB.byCode[r.code];
        return r.code + ' ' + (e ? e.name + ' ' + e.divisionName : '') + ' ' + (r.email || '') + ' ' + r.batchId;
      },
      filters: [
        { key: 'doc', label: 'Semua dokumen', options: [
          { value: 'PAYSLIP', label: 'Slip gaji' }, { value: 'OVERTIME', label: 'Slip lembur' }] },
        { key: 'div', label: 'Semua divisi', options: DB.divisions.map(function (d) { return { value: d.key, label: d.name }; }) },
        { key: 'st', label: 'Semua status', options: [
          { value: 'SENT', label: 'Terkirim' },
          { value: 'RETRY_SUCCESS', label: 'Berhasil setelah kirim ulang' },
          { value: 'PENDING', label: 'Menunggu' },
          { value: 'FAILED', label: 'Gagal' },
          { value: 'EXCEPTION', label: 'Pengecualian' }] },
        { key: 'per', label: 'Semua periode', options: DB.periods.map(function (p) { return { value: p.code, label: p.label }; }) }
      ],
      filterOn: function (r, k, v) {
        if (k === 'doc') return r.docType === v;
        if (k === 'st') return r.status === v;
        if (k === 'per') return r.period === v;
        if (k === 'div') { var e = DB.byCode[r.code]; return e && e.division === v; }
        return true;
      },
      defaultSort: 'code',
      columns: [
        { key: 'code', label: 'ID', cls: 'col-code', value: function (r) { return r.code; }, render: function (r) { return esc(r.code); } },
        { key: 'name', label: 'Nama', cls: 'col-name', value: function (r) { return (DB.byCode[r.code] || {}).name; },
          render: function (r) { return esc((DB.byCode[r.code] || {}).name || '—'); } },
        { key: 'doc', label: 'Dokumen', value: function (r) { return r.docType; },
          render: function (r) {
            return r.docType === 'PAYSLIP'
              ? '<span class="doc-tag d-pay">Slip gaji</span>'
              : '<span class="doc-tag d-ot">Slip lembur</span>';
          } },
        { key: 'per', label: 'Periode', value: function (r) { return r.period; },
          render: function (r) {
            var p = DB.periods.filter(function (x) { return x.code === r.period; })[0];
            return '<span style="color:var(--muted)">' + esc(p ? p.label : r.period) + '</span>';
          } },
        { key: 'div', label: 'Divisi', value: function (r) { return (DB.byCode[r.code] || {}).divisionName; },
          render: function (r) { return '<span style="color:var(--muted)">' + esc((DB.byCode[r.code] || {}).divisionName || '') + '</span>'; } },
        { key: 'email', label: 'Email', cls: 'col-email', value: function (r) { return r.email || 'zzz'; },
          render: function (r) { return r.email ? esc(r.email) : '<span class="chip">belum ada</span>'; } },
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
      '<p class="view-intro">Pantau status slip gaji dan lembur per penerima. Status pengiriman pada prototipe ini adalah simulasi.</p>' +

      '<div class="doc-split">' +
      '<div class="doc-card d-pay"><div class="doc-card-head"><span class="doc-tag d-pay">Slip gaji</span>' +
      '<b>' + UI.pct(payS.rate) + '%</b></div>' +
      UI.segbar(payS) +
      '<div class="doc-card-foot">' + num(payS.delivered) + ' terkirim · ' + num(payS.failed) + ' gagal · ' +
      num(payS.pending) + ' menunggu · ' + num(payS.exception) + ' pengecualian</div></div>' +

      '<div class="doc-card d-ot"><div class="doc-card-head"><span class="doc-tag d-ot">Slip lembur</span>' +
      '<b>' + UI.pct(otS.rate) + '%</b></div>' +
      UI.segbar(otS) +
      '<div class="doc-card-foot">' + num(otS.delivered) + ' terkirim · ' + num(otS.failed) + ' gagal · ' +
      num(otS.pending) + ' menunggu · ' + num(otS.exception) + ' pengecualian</div></div>' +
      '</div>' +

      '<div class="grid g-4" style="margin:16px 0">' +
      UI.kpi('Terkirim', num(s.sent), 'Diterima server tujuan', 'good') +
      UI.kpi('Berhasil setelah ulang', num(s.retrySuccess), 'Gagal di percobaan pertama', 'good') +
      UI.kpi('Menunggu', num(s.pending), 'Masih dalam antrian', s.pending ? 'warn' : 'good') +
      UI.kpi('Gagal', num(s.failed), 'Butuh tindakan HR', s.failed ? 'bad' : 'good') +
      '</div>';
    host.appendChild(t.root);
    return { node: host };
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
        var row = DB.allDeliveries().filter(function (r) { return r.code === code && r.status === 'FAILED'; })[0]
          || DB.allDeliveries().filter(function (r) { return r.code === code; })[0];
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
    var rows = DB.allDeliveries().filter(function (r) { return r.status === 'FAILED'; });

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

    var html = '<p class="view-intro">Tangani kegagalan berdasarkan penyebabnya; perbaiki data sumber bila diperlukan sebelum kirim ulang.</p>';

    html += '<div class="grid g-4" style="margin-bottom:14px">' +
      UI.kpi('Perlu ditangani', num(rows.length), 'Pada batch September', 'bad') +
      UI.kpi('Bisa langsung dikirim ulang', num(rows.filter(function (r) {
        return r.errorCode === 'MAILBOX_FULL' || r.errorCode === 'SYSTEM_ERROR' || r.errorCode === 'REJECTED';
      }).length), 'Penyebabnya sementara', 'warn') +
      UI.kpi('Butuh perbaikan data', num(rows.filter(function (r) {
        return r.errorCode === 'INVALID_EMAIL' || r.errorCode === 'PAYSLIP_MISSING' || r.errorCode === 'MISMATCH';
      }).length), 'Kirim ulang tidak akan menolong', 'bad') +
      UI.kpi('Sudah berhasil hari ini', num(DB.allDeliveries().filter(function (r) { return r.status === 'RETRY_SUCCESS'; }).length),
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
        '<td><b style="font-weight:500">' + esc(e.name) + '</b><div class="col-code">' + esc(e.code) + ' · ' + esc(e.divisionName) + '</div>' +
        '<div style="margin-top:3px">' + (r.docType === 'OVERTIME'
          ? '<span class="doc-tag d-ot">Slip lembur</span>' : '<span class="doc-tag d-pay">Slip gaji</span>') + '</div></td>' +
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
          var row = DB.allDeliveries().filter(function (r) { return r.code === c && r.status === 'FAILED'; })[0];
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

      UI.notice('n-warn', 'Periksa tarif sebelum digunakan',
        'Angka terisi adalah <b>contoh</b>. Cocokkan tarif BPJS dan tabel TER PPh 21 dengan peraturan yang berlaku.') +

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
    otentry: otentry,
    otgenerate: otgenerate,
    batches: batches,
    matching: matching,
    tracking: tracking,
    failed: failed,
    settings: settings,
    emailPreview: emailPreview,
    employeeDrawer: employeeDrawer
  };
})();
