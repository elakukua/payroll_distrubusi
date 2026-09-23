/* ==========================================================================
   APP — kerangka, navigasi, dan kendali peran
   Routing pakai hash (#/dashboard) supaya bisa dilayani GitHub Pages tanpa
   konfigurasi server apa pun.
   ========================================================================== */

var App = (function () {
  'use strict';

  var esc = UI.esc, icon = UI.icon, q = UI.q, qa = UI.qa;

  var ROUTES = [
    { path: 'dashboard', title: 'Ruang kendali', icon: 'gauge', page: 'dashboard', group: 'Pantau' },
    { path: 'tracking', title: 'Pelacakan pengiriman', icon: 'send', page: 'tracking', group: 'Pantau' },
    { path: 'failed', title: 'Pusat kirim ulang', icon: 'alert', page: 'failed', group: 'Pantau', badge: 'failed' },

    { path: 'entry', title: 'Input payroll', icon: 'grid', page: 'entry', group: 'Slip gaji' },
    { path: 'generate', title: 'Buat slip gaji', icon: 'file', page: 'generate', group: 'Slip gaji' },
    { path: 'otentry', title: 'Input lembur', icon: 'clock', page: 'otentry', group: 'Lembur' },
    { path: 'otgenerate', title: 'Buat slip lembur', icon: 'file', page: 'otgenerate', group: 'Lembur' },

    { path: 'batches', title: 'Batch distribusi', icon: 'layers', page: 'batches', group: 'Jalankan' },
    { path: 'matching', title: 'Impor & pencocokan', icon: 'link', page: 'matching', group: 'Jalankan' },

    { path: 'employees', title: 'Direktori karyawan', icon: 'people', page: 'employees', group: 'Kelola' },
    { path: 'payrolldata', title: 'Data gaji & perhitungan', icon: 'file', page: 'payrolldata', group: 'Kelola' },
    { path: 'settings', title: 'Pengaturan', icon: 'cog', page: 'settings', group: 'Kelola' }
  ];

  /* Peran — sengaja dibuat berbeda supaya bisa didemokan di depan klien.
     Perhatikan Super Admin tidak punya izin distribute maupun revealPassword:
     konsultan eksternal tidak boleh menjadi pihak yang menekan tombol kirim. */
  var ROLES = {
    'Super Admin': {
      name: 'Ahmad Fauzan',
      desc: 'Konsultan sistem',
      permits: { settings: true, distribute: false, retry: true, revealPassword: false, salaryDetail: true }
    },
    'HR Admin': {
      name: 'Rahayu Pertiwi',
      desc: 'Payroll Officer',
      permits: { settings: false, distribute: true, retry: true, revealPassword: true, salaryDetail: true }
    },
    'Viewer': {
      name: 'Dewi Kartika',
      desc: 'Manajemen',
      permits: { settings: false, distribute: false, retry: false, revealPassword: false, salaryDetail: false }
    }
  };

  var state = { role: 'HR Admin', route: 'dashboard' };
  var user = { name: ROLES['HR Admin'].name, role: 'HR Admin' };

  function permits(action) {
    var r = ROLES[state.role];
    return !!(r && r.permits[action]);
  }

  function counts() {
    return {
      failed: DB.allDeliveries().filter(function (r) { return r.status === 'FAILED'; }).length,
      blocking: 0
    };
  }

  /* ------------------------------------------------------------- rail -- */
  function renderRail() {
    var c = counts();
    var groups = [];
    ROUTES.forEach(function (r) {
      if (groups.indexOf(r.group) < 0) groups.push(r.group);
    });

    var nav = groups.map(function (g) {
      return '<div class="nav-group"><span>' + esc(g) + '</span>' +
        ROUTES.filter(function (r) { return r.group === g; }).map(function (r) {
          var n = r.badge ? c[r.badge] : 0;
          return '<a href="#/' + r.path + '" data-route="' + r.path + '"' +
            (state.route === r.path ? ' class="is-current"' : '') + '>' +
            icon(r.icon, 15) + '<span>' + esc(r.title) + '</span>' +
            (n ? '<span class="nav-count">' + n + '</span>' : '') + '</a>';
        }).join('') + '</div>';
    }).join('');

    var r = ROLES[state.role];

    q('#rail').innerHTML =
      '<div class="rail-head"><div class="logo-mark">PD</div>' +
      '<div><div class="rail-title">Payroll Distribution<br>Control Center</div>' +
      '<div class="rail-sub">' + esc(DB.company) + '</div></div></div>' +
      '<nav class="nav">' + nav + '</nav>' +
      '<div class="rail-foot">' +
      '<div class="rail-user"><div class="avatar">' + esc(UI.initials(r.name)) + '</div>' +
      '<div><b>' + esc(r.name) + '</b><span>' + esc(state.role) + ' · ' + esc(r.desc) + '</span></div></div>' +
      '<button data-signout>Keluar dari demo</button>' +
      '</div>';

    var so = q('[data-signout]');
    if (so) so.addEventListener('click', function () {
      q('#app').classList.remove('is-active');
      q('#signin').style.display = 'grid';
    });
  }

  /* ----------------------------------------------------------- topbar -- */
  function renderTopbar(route) {
    var s = DB.summarise(DB.allDeliveries());
    q('#topbar').innerHTML =
      '<h1>' + esc(route.title) + '</h1>' +
      '<span class="demo-flag"><i></i>Data contoh</span>' +
      '<div class="topbar-context' + (route.path === 'dashboard' ? ' control-context-hidden' : '') + '">' +
      '<div class="ctx-item"><span>Periode berjalan</span><b>September 2026</b></div>' +
      '<div class="ctx-item"><span>Siklus</span><b>21 Agu – 20 Sep</b></div>' +
      '<div class="ctx-item"><span>Tingkat keberhasilan</span><b>' + UI.pct(s.rate) + '%</b></div>' +
      '<div class="ctx-item"><span>Peran</span><b>' + esc(state.role) + '</b></div>' +
      '</div>';
  }

  /* ------------------------------------------------------------ render -- */
  function render() {
    var hash = (location.hash || '#/dashboard').replace('#/', '');
    var route = ROUTES.filter(function (r) { return r.path === hash; })[0] || ROUTES[0];
    state.route = route.path;

    renderRail();
    renderTopbar(route);

    var view = q('#view');
    var result = PAGES[route.page]();

    if (result.node) {
      view.innerHTML = '';
      view.appendChild(result.node);
    } else {
      view.innerHTML = result.html;
    }
    if (result.mount) result.mount();

    window.scrollTo(0, 0);
  }

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function rerender() { render(); }

  /* -------------------------------------------------------------- init -- */
  function start(role) {
    state.role = role || 'HR Admin';
    user = { name: ROLES[state.role].name, role: state.role };
    q('#signin').style.display = 'none';
    q('#app').classList.add('is-active');
    if (!location.hash) location.hash = '#/dashboard';
    render();
  }

  function init() {
    /* Papan hero di halaman depan memakai status yang sama persis dengan
       data di dalam sistem — bukan hiasan, melainkan pratinjau produknya.
       Selnya muncul bertahap sekali saja saat halaman dibuka. */
    var hero = q('#heroBoard');
    if (hero) {
      hero.innerHTML = DB.deliveries.map(function (r, i) {
        var e = DB.byCode[r.code];
        return '<i data-s="' + r.status + '" style="animation-delay:' + (i * 4) + 'ms" title="' +
          esc((e ? e.name : r.code) + ' — ' + (UI.STATUS[r.status] || {}).label) + '"></i>';
      }).join('');
    }

    window.addEventListener('hashchange', function () {
      if (q('#app').classList.contains('is-active')) render();
    });

    var picked = 'HR Admin';
    qa('.role-row button').forEach(function (b) {
      b.addEventListener('click', function () {
        qa('.role-row button').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        this.setAttribute('aria-pressed', 'true');
        picked = this.dataset.role;
      });
    });

    q('#signinBtn').addEventListener('click', function () { start(picked); });

    /* Pintasan keyboard untuk demo: 1–9 lompat antar halaman */
    document.addEventListener('keydown', function (e) {
      if (!q('#app').classList.contains('is-active')) return;
      if (e.target.matches('input, select, textarea')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var n = Number(e.key);
      if (n >= 1 && n <= ROUTES.length) go('#/' + ROUTES[n - 1].path);
    });
  }

  return {
    init: init,
    go: go,
    rerender: rerender,
    permits: permits,
    get user() { return user; },
    get role() { return state.role; }
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
