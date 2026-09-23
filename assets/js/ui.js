/* ==========================================================================
   UI — helper, ikon, dan komponen yang dipakai berulang
   ========================================================================== */

var UI = (function () {
  'use strict';

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(html) {
    var t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function num(n) { return Number(n).toLocaleString('id-ID'); }
  function pct(n, d) { return (Math.round(n * Math.pow(10, d || 1)) / Math.pow(10, d || 1)).toLocaleString('id-ID', { minimumFractionDigits: d === 0 ? 0 : 1 }); }

  function rupiah(n) { return 'Rp' + Number(Math.round(n)).toLocaleString('id-ID'); }

  /* Angka besar dipendekkan supaya muat di kartu KPI tanpa terpotong.
     Rp1.627.426.738 menjadi Rp1,63 M — lebih mudah dibaca manajemen. */
  function rupiahShort(n) {
    n = Number(n);
    if (Math.abs(n) >= 1e9) return 'Rp' + (n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M';
    if (Math.abs(n) >= 1e6) return 'Rp' + (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt';
    if (Math.abs(n) >= 1e3) return 'Rp' + Math.round(n / 1e3) + ' rb';
    return 'Rp' + Math.round(n);
  }

  function initials(name) {
    return name.split(' ').slice(0, 2).map(function (w) { return w[0]; }).join('').toUpperCase();
  }

  function dateID(iso) {
    if (!iso) return '—';
    var M = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    var p = iso.split(' ')[0].split('-');
    return Number(p[2]) + ' ' + M[Number(p[1]) - 1] + ' ' + p[0];
  }

  /* ------------------------------------------------------------- ikon --- */
  var ICONS = {
    gauge: '<path d="M8 1.5A6.5 6.5 0 0 0 2.6 11.6"/><path d="M13.4 11.6A6.5 6.5 0 0 0 8 1.5"/><path d="M8 8l3-2.2"/>',
    people: '<circle cx="6" cy="5" r="2.4"/><path d="M1.8 13.2c0-2.3 1.9-3.8 4.2-3.8s4.2 1.5 4.2 3.8"/><path d="M11 4.2a2.2 2.2 0 0 1 0 4.2"/><path d="M12.2 13.2c0-1.5-.5-2.5-1.3-3.2"/>',
    layers: '<path d="M8 1.6 1.8 4.7 8 7.8l6.2-3.1L8 1.6Z"/><path d="m1.8 8 6.2 3.1L14.2 8"/><path d="m1.8 11.3 6.2 3.1 6.2-3.1"/>',
    link: '<path d="M6.6 9.4a2.8 2.8 0 0 0 4 0l2-2a2.8 2.8 0 1 0-4-4l-1 1"/><path d="M9.4 6.6a2.8 2.8 0 0 0-4 0l-2 2a2.8 2.8 0 1 0 4 4l1-1"/>',
    shield: '<path d="M8 1.6 2.8 3.7v4c0 3 2.2 5.4 5.2 6.6 3-1.2 5.2-3.6 5.2-6.6v-4L8 1.6Z"/><path d="m6 7.9 1.5 1.5L10.4 6"/>',
    send: '<path d="M14.2 1.8 7.3 8.7"/><path d="M14.2 1.8 9.8 14.2 7.3 8.7 1.8 6.2 14.2 1.8Z"/>',
    alert: '<path d="M8 2.2 1.6 13.4h12.8L8 2.2Z"/><path d="M8 6.6v3"/><circle cx="8" cy="11.6" r=".6" fill="currentColor" stroke="none"/>',
    inbox: '<path d="M1.8 9.6h3.4l1 2h3.6l1-2h3.4"/><path d="M3.4 2.8h9.2l1.6 6.8v3.2H1.8V9.6l1.6-6.8Z"/>',
    scroll: '<path d="M3.4 2.2h9.2v11.6H3.4z"/><path d="M5.6 5.4h4.8M5.6 8h4.8M5.6 10.6h3"/>',
    pulse: '<path d="M1.6 8h3l1.6-4 2.4 8 1.6-4h4.2"/>',
    cog: '<circle cx="8" cy="8" r="2.2"/><path d="M8 1.6v1.8M8 12.6v1.8M14.4 8h-1.8M3.4 8H1.6M12.5 3.5l-1.3 1.3M4.8 11.2l-1.3 1.3M12.5 12.5l-1.3-1.3M4.8 4.8 3.5 3.5"/>',
    search: '<circle cx="7" cy="7" r="4.6"/><path d="m10.6 10.6 3 3"/>',
    close: '<path d="m3.6 3.6 8.8 8.8M12.4 3.6l-8.8 8.8"/>',
    check: '<path d="m3.6 8.4 2.8 2.8 6-6.4"/>',
    x: '<path d="m4.4 4.4 7.2 7.2M11.6 4.4l-7.2 7.2"/>',
    bang: '<path d="M8 4.2v4.4"/><circle cx="8" cy="11.4" r=".7" fill="currentColor" stroke="none"/>',
    file: '<path d="M9 1.8H4.2v12.4h7.6V4.6L9 1.8Z"/><path d="M9 1.8v2.8h2.8"/>',
    lock: '<rect x="3.6" y="7" width="8.8" height="6.4" rx="1"/><path d="M5.8 7V5.2a2.2 2.2 0 0 1 4.4 0V7"/>',
    clock: '<circle cx="8" cy="8" r="6.2"/><path d="M8 4.4V8l2.4 1.6"/>',
    download: '<path d="M8 2.2v8"/><path d="m4.8 7 3.2 3.2L11.2 7"/><path d="M2.6 13.4h10.8"/>',
    play: '<path d="M4.6 2.8 12.8 8l-8.2 5.2V2.8Z"/>',
    refresh: '<path d="M13.4 8a5.4 5.4 0 1 1-1.6-3.8"/><path d="M13.6 2v3.2h-3.2"/>',
    grid: '<rect x="2.2" y="2.2" width="4.6" height="4.6"/><rect x="9.2" y="2.2" width="4.6" height="4.6"/><rect x="2.2" y="9.2" width="4.6" height="4.6"/><rect x="9.2" y="9.2" width="4.6" height="4.6"/>',
    print: '<path d="M4.4 6V2.4h7.2V6"/><rect x="2.4" y="6" width="11.2" height="4.8" rx="1"/><path d="M4.4 9.6h7.2v4H4.4z"/>'
  };

  function icon(name, size) {
    var s = size || 16;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 16 16" fill="none" stroke="currentColor" ' +
      'stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (ICONS[name] || '') + '</svg>';
  }

  /* ------------------------------------------------------------ status -- */
  var STATUS = {
    SENT: { label: 'TERKIRIM', cls: 'b-sent' },
    RETRY_SUCCESS: { label: 'KIRIM ULANG OK', cls: 'b-sent' },
    PENDING: { label: 'MENUNGGU', cls: 'b-pending' },
    RETRYING: { label: 'MENGULANG', cls: 'b-retrying' },
    FAILED: { label: 'GAGAL', cls: 'b-failed' },
    QUEUED: { label: 'ANTRIAN', cls: 'b-neutral' },
    EXCEPTION: { label: 'PENGECUALIAN', cls: 'b-neutral' },
    READY: { label: 'SIAP', cls: 'b-sent' },
    MISSING: { label: 'TIDAK ADA', cls: 'b-failed' },
    ACCEPTED: { label: 'DITERIMA', cls: 'b-sent' },
    BOUNCED: { label: 'DIPANTULKAN', cls: 'b-failed' },
    NOT_SENT: { label: 'TIDAK DIKIRIM', cls: 'b-neutral' },
    NO_ADDRESS: { label: 'TANPA ALAMAT', cls: 'b-neutral' },
    COMPLETED: { label: 'SELESAI', cls: 'b-sent' },
    VALIDATED: { label: 'TERVALIDASI', cls: 'b-info' },
    DRAFT: { label: 'DRAF', cls: 'b-neutral' },
    SENDING: { label: 'MENGIRIM', cls: 'b-retrying' },
    BLOCKING: { label: 'PENGHAMBAT', cls: 'b-failed' },
    WARNING: { label: 'PERINGATAN', cls: 'b-pending' }
  };

  function badge(status) {
    var s = STATUS[status] || { label: status, cls: 'b-neutral' };
    return '<span class="badge ' + s.cls + '"><i class="dot"></i>' + esc(s.label) + '</span>';
  }

  /* ------------------------------------------------------------- toast -- */
  function toast(title, body, kind) {
    var host = q('#toasts');
    var t = el(
      '<div class="toast t-' + (kind || 'info') + '">' +
      '<div><b>' + esc(title) + '</b>' + (body ? '<span>' + esc(body) + '</span>' : '') + '</div>' +
      '</div>'
    );
    host.appendChild(t);
    setTimeout(function () {
      t.style.transition = 'opacity .25s';
      t.style.opacity = '0';
      setTimeout(function () { t.remove(); }, 260);
    }, 4200);
  }

  /* ------------------------------------------------------------- modal -- */
  function modal(opts) {
    var scrim = q('#scrim');
    var host = q('#modal');
    host.className = 'modal is-open' + (opts.wide ? ' wide' : '');
    host.innerHTML =
      '<div class="modal-head"><h3>' + esc(opts.title) + '</h3>' +
      (opts.sub ? '<p>' + esc(opts.sub) + '</p>' : '') + '</div>' +
      '<div class="modal-body">' + opts.body + '</div>' +
      '<div class="modal-foot">' +
      '<button class="btn" data-close>' + esc(opts.cancel || 'Tutup') + '</button>' +
      (opts.confirm ? '<button class="btn ' + (opts.danger ? 'btn-danger' : 'btn-primary') + '" data-confirm>' + esc(opts.confirm) + '</button>' : '') +
      '</div>';
    scrim.classList.add('is-open');

    function close() {
      host.className = 'modal';
      scrim.classList.remove('is-open');
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);

    qa('[data-close]', host).forEach(function (b) { b.addEventListener('click', close); });
    scrim.onclick = close;
    var ok = q('[data-confirm]', host);
    if (ok) {
      ok.addEventListener('click', function () {
        if (opts.onConfirm) opts.onConfirm(close);
        else close();
      });
      ok.focus();
    }
    return { close: close, root: host };
  }

  /* ------------------------------------------------------------ drawer -- */
  function drawer(opts) {
    var scrim = q('#scrim');
    var host = q('#drawer');
    host.className = 'drawer is-open';
    host.innerHTML =
      '<div class="drawer-head"><div><h3>' + esc(opts.title) + '</h3>' +
      (opts.sub ? '<p>' + esc(opts.sub) + '</p>' : '') + '</div>' +
      '<button class="icon-btn" data-close aria-label="Tutup">' + icon('close', 18) + '</button></div>' +
      '<div class="drawer-body">' + opts.body + '</div>';
    scrim.classList.add('is-open');

    function close() {
      host.className = 'drawer';
      scrim.classList.remove('is-open');
      document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    qa('[data-close]', host).forEach(function (b) { b.addEventListener('click', close); });
    scrim.onclick = close;
    if (opts.onReady) opts.onReady(host, close);
    return { close: close, root: host };
  }

  /* ------------------------------------------------- tabel serbaguna --- */
  /* Menangani pencarian, filter, urutan, dan paginasi dalam satu tempat.
     Dipakai oleh Delivery Tracking, Employee Directory, Audit, dll. */
  function dataTable(cfg) {
    var state = {
      search: '',
      filters: {},
      sort: cfg.defaultSort || null,
      dir: cfg.defaultDir || 'asc',
      page: 1,
      size: cfg.pageSize || 15
    };

    var root = el('<div class="card"></div>');

    function filtered() {
      var rows = cfg.rows.slice();
      if (state.search) {
        var s = state.search.toLowerCase();
        rows = rows.filter(function (r) { return cfg.searchOn(r).toLowerCase().indexOf(s) > -1; });
      }
      Object.keys(state.filters).forEach(function (k) {
        var v = state.filters[k];
        if (!v) return;
        rows = rows.filter(function (r) { return cfg.filterOn(r, k, v); });
      });
      if (state.sort) {
        var col = cfg.columns.filter(function (c) { return c.key === state.sort; })[0];
        if (col && col.value) {
          rows.sort(function (a, b) {
            var x = col.value(a), y = col.value(b);
            if (x === y) return 0;
            if (x === null || x === undefined) return 1;
            if (y === null || y === undefined) return -1;
            var r = x > y ? 1 : -1;
            return state.dir === 'asc' ? r : -r;
          });
        }
      }
      return rows;
    }

    function render() {
      var rows = filtered();
      var pages = Math.max(1, Math.ceil(rows.length / state.size));
      if (state.page > pages) state.page = pages;
      var slice = rows.slice((state.page - 1) * state.size, state.page * state.size);

      var head = '<div class="filters">';
      if (cfg.searchPlaceholder !== false) {
        head += '<div class="search-field">' + icon('search', 14) +
          '<input type="search" data-search placeholder="' + esc(cfg.searchPlaceholder || 'Cari…') + '" value="' + esc(state.search) + '"></div>';
      }
      (cfg.filters || []).forEach(function (f) {
        head += '<select data-filter="' + f.key + '"><option value="">' + esc(f.label) + '</option>' +
          f.options.map(function (o) {
            var val = typeof o === 'string' ? o : o.value;
            var lab = typeof o === 'string' ? o : o.label;
            return '<option value="' + esc(val) + '"' + (state.filters[f.key] === val ? ' selected' : '') + '>' + esc(lab) + '</option>';
          }).join('') + '</select>';
      });
      if (cfg.actions) head += '<div style="margin-left:auto;display:flex;gap:8px">' + cfg.actions + '</div>';
      head += '</div>';

      var thead = '<thead><tr>' + cfg.columns.map(function (c) {
        var sortable = c.value ? ' sortable' : '';
        var arrow = state.sort === c.key ? '<span class="arrow">' + (state.dir === 'asc' ? '▲' : '▼') + '</span>' : '';
        return '<th class="' + (c.cls || '') + sortable + '"' + (c.value ? ' data-sort="' + c.key + '"' : '') + '>' + esc(c.label) + arrow + '</th>';
      }).join('') + '</tr></thead>';

      var tbody;
      if (!slice.length) {
        tbody = '<tbody><tr><td colspan="' + cfg.columns.length + '">' +
          '<div class="empty">' + icon('search', 28) + '<b>Tidak ada data yang cocok</b>' +
          '<p>Ubah kata kunci pencarian atau kosongkan filter untuk melihat seluruh data.</p></div></td></tr></tbody>';
      } else {
        tbody = '<tbody>' + slice.map(function (r, i) {
          return '<tr' + (cfg.onRowClick ? ' class="clickable"' : '') + ' data-idx="' + rows.indexOf(r) + '">' +
            cfg.columns.map(function (c) {
              return '<td class="' + (c.cls || '') + '">' + c.render(r, i) + '</td>';
            }).join('') + '</tr>';
        }).join('') + '</tbody>';
      }

      var from = rows.length ? (state.page - 1) * state.size + 1 : 0;
      var to = Math.min(state.page * state.size, rows.length);
      var pager = '';
      if (pages > 1) {
        pager += '<button data-page="' + (state.page - 1) + '"' + (state.page === 1 ? ' disabled' : '') + '>‹</button>';
        var start = Math.max(1, Math.min(state.page - 2, pages - 4));
        var end = Math.min(pages, start + 4);
        for (var p = start; p <= end; p++) {
          pager += '<button data-page="' + p + '"' + (p === state.page ? ' aria-current="true"' : '') + '>' + p + '</button>';
        }
        pager += '<button data-page="' + (state.page + 1) + '"' + (state.page === pages ? ' disabled' : '') + '>›</button>';
      }

      root.innerHTML = head +
        '<div class="table-scroll"><table class="data">' + thead + tbody + '</table></div>' +
        '<div class="table-foot"><span>Menampilkan ' + num(from) + '–' + num(to) + ' dari ' + num(rows.length) + ' data</span>' +
        '<div class="pager">' + pager + '</div></div>';

      /* Pasang ulang event tiap render — tabelnya kecil, biaya tidak terasa */
      var sb = q('[data-search]', root);
      if (sb) {
        sb.addEventListener('input', function () {
          var caret = this.selectionStart;
          state.search = this.value;
          state.page = 1;
          render();
          /* Tabel digambar ulang seluruhnya, jadi fokus dan posisi kursor
             harus dikembalikan — tanpa ini kursor melompat ke akhir dan
             mengetik di tengah kata jadi mustahil. */
          var again = q('[data-search]', root);
          if (again) {
            again.focus();
            try { again.setSelectionRange(caret, caret); } catch (e) { /* abaikan */ }
          }
        });
      }
      qa('[data-filter]', root).forEach(function (sel) {
        sel.addEventListener('change', function () {
          state.filters[this.dataset.filter] = this.value;
          state.page = 1;
          render();
        });
      });
      qa('[data-sort]', root).forEach(function (th) {
        th.addEventListener('click', function () {
          var k = this.dataset.sort;
          if (state.sort === k) state.dir = state.dir === 'asc' ? 'desc' : 'asc';
          else { state.sort = k; state.dir = 'asc'; }
          render();
        });
      });
      qa('[data-page]', root).forEach(function (b) {
        b.addEventListener('click', function () { state.page = Number(this.dataset.page); render(); });
      });
      if (cfg.onRowClick) {
        qa('tbody tr[data-idx]', root).forEach(function (tr) {
          tr.addEventListener('click', function (e) {
            if (e.target.closest('button') || e.target.closest('a')) return;
            cfg.onRowClick(rows[Number(this.dataset.idx)]);
          });
        });
      }
      if (cfg.onRender) cfg.onRender(root, rows);
    }

    render();
    return { root: root, refresh: render, state: state };
  }

  /* ---------------------------------------------- papan sel karyawan --- */
  function board(rows, opts) {
    opts = opts || {};
    var cells = rows.map(function (r) {
      var e = DB.byCode[r.code];
      var t = (e ? e.name + ' · ' + e.code : r.code) + ' — ' + (STATUS[r.status] || {}).label;
      return '<i data-s="' + r.status + '" data-code="' + r.code + '" title="' + esc(t) + '"></i>';
    }).join('');
    return '<div class="board-wrap"><div class="board"' + (opts.id ? ' id="' + opts.id + '"' : '') + '>' + cells + '</div></div>' +
      '<div class="board-legend">' +
      legendItem('#2f8a63', 'Terkirim') +
      legendItem('#5fa98a', 'Berhasil setelah kirim ulang') +
      legendItem('#dfa14c', 'Menunggu') +
      legendItem('#b8474d', 'Gagal') +
      legendItem('#c3ced4', 'Belum diproses') +
      '<span><b style="background:repeating-linear-gradient(45deg,#b9c6cc 0 2px,#e4eaed 2px 4px)"></b>Pengecualian — tanpa email</span>' +
      '</div>';
  }
  function legendItem(color, label) {
    return '<span><b style="background:' + color + '"></b>' + esc(label) + '</span>';
  }

  /* ------------------------------------------------------- bar segmen --- */
  function segbar(s) {
    var t = s.total || 1;
    function w(v) { return (v / t * 100).toFixed(2) + '%'; }
    return '<div class="segbar">' +
      '<span class="seg-sent" style="width:' + w(s.sent) + '"></span>' +
      '<span class="seg-retry" style="width:' + w(s.retrySuccess) + '"></span>' +
      '<span class="seg-pending" style="width:' + w(s.pending) + '"></span>' +
      '<span class="seg-failed" style="width:' + w(s.failed) + '"></span>' +
      '</div>';
  }

  function kpi(label, value, foot, tone) {
    return '<div class="kpi' + (tone ? ' k-' + tone : '') + '">' +
      '<div class="kpi-label">' + esc(label) + '</div>' +
      '<div class="kpi-value">' + value + '</div>' +
      (foot ? '<div class="kpi-foot">' + foot + '</div>' : '') + '</div>';
  }

  /* Kotak keterangan yang bisa disembunyikan.
     Daftar temuan bisa panjang dan menutupi tabel, jadi setiap kotak punya
     tombol sembunyikan. Keadaannya diingat lewat kunci, sehingga pilihan
     pengguna bertahan saat halaman digambar ulang. */
  var noticeHidden = {};

  function noticeBox(key, kind, title, body, countLabel) {
    var hidden = !!noticeHidden[key];
    var ico = kind === 'n-ok' ? 'check' : (kind === 'n-info' ? 'bang' : 'alert');
    return '<div class="notice notice-box ' + kind + (hidden ? ' collapsed' : '') + '" data-nbox="' + esc(key) + '">' +
      icon(ico, 16) +
      '<div class="nb-main">' +
      '<div class="nb-head"><b>' + esc(title) + '</b>' +
      (countLabel ? '<span class="nb-count">' + esc(countLabel) + '</span>' : '') +
      '<button class="nb-toggle" type="button" data-nb="' + esc(key) + '">' +
      (hidden ? 'Tampilkan' : 'Sembunyikan') + '</button></div>' +
      '<div class="nb-body">' + body + '</div>' +
      '</div></div>';
  }

  function wireNoticeBoxes(root) {
    qa('[data-nb]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var box = this.closest('.notice-box');
        var hidden = box.classList.toggle('collapsed');
        noticeHidden[this.dataset.nb] = hidden;
        this.textContent = hidden ? 'Tampilkan' : 'Sembunyikan';
      });
    });
  }

  function notice(kind, title, body) {
    var ico = kind === 'n-ok' ? 'check' : (kind === 'n-info' ? 'bang' : 'alert');
    return '<div class="notice ' + kind + '">' + icon(ico, 16) +
      '<div><b>' + esc(title) + '</b>' + body + '</div></div>';
  }

  return {
    esc: esc, el: el, q: q, qa: qa, num: num, pct: pct, icon: icon,
    rupiah: rupiah, rupiahShort: rupiahShort,
    badge: badge, STATUS: STATUS, toast: toast, modal: modal, drawer: drawer,
    dataTable: dataTable, board: board, segbar: segbar, kpi: kpi,
    notice: notice, noticeBox: noticeBox, wireNoticeBoxes: wireNoticeBoxes,
    noticeHidden: noticeHidden, initials: initials, dateID: dateID
  };
})();
