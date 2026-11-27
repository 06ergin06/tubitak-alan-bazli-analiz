(function () {
  'use strict';

  const D = window.YETKINLIK;
  if (!D) {
    document.body.innerHTML = '<p style="padding:24px">Veri yüklenemedi (assets/data.js bulunamadı).</p>';
    return;
  }

  const META = D.meta;
  const A = D.alan;       // cols: alan, alt, uni, kalite, hacim
  const U = D.universite; // cols: uni, alan, alt, kalite, hacim
  const $ = (id) => document.getElementById(id);

  const fmt = (x) => (x == null || isNaN(x) ? '–' : Number(x).toFixed(2));

  function median(arr) {
    if (!arr.length) return null;
    const s = arr.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function fillSelect(sel, items, placeholder) {
    sel.innerHTML = '';
    if (placeholder != null) sel.add(new Option(placeholder, ''));
    for (const it of items) sel.add(new Option(it, it));
  }

  const PLOT_CFG = {
    responsive: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
  };

  function baseLayout() {
    return {
      margin: { l: 64, r: 26, t: 18, b: 60 },
      xaxis: {
        title: { text: 'Kalite (0–60)', font: { size: 13 } },
        range: [0, 60],
        gridcolor: '#e8ecf3',
        zeroline: false,
      },
      yaxis: {
        title: { text: 'Hacım (0–40)', font: { size: 13 } },
        range: [0, 40],
        gridcolor: '#e8ecf3',
        zeroline: false,
      },
      font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#2b3445' },
      showlegend: false,
      hovermode: 'closest',
      plot_bgcolor: '#ffffff',
      paper_bgcolor: '#ffffff',
      shapes: [],
    };
  }

  function medianShapes(medK, medH) {
    const shapes = [];
    if (medK != null) {
      shapes.push({
        type: 'line', xref: 'x', yref: 'paper',
        x0: medK, x1: medK, y0: 0, y1: 1,
        line: { color: '#98a2b3', width: 1, dash: 'dot' },
      });
    }
    if (medH != null) {
      shapes.push({
        type: 'line', xref: 'paper', yref: 'y',
        x0: 0, x1: 1, y0: medH, y1: medH,
        line: { color: '#98a2b3', width: 1, dash: 'dot' },
      });
    }
    return shapes;
  }

  // ---------- tablo (sıralanabilir) ----------
  const tableState = new WeakMap();

  function renderTable(el, headers, rows, opts) {
    opts = opts || {};
    let state = tableState.get(el);
    if (!state) {
      state = { sortCol: opts.defaultSort != null ? opts.defaultSort : null, sortDir: -1 };
    }

    let data = rows.slice();
    if (state.sortCol != null) {
      const c = state.sortCol;
      data.sort((a, b) => {
        const va = a[c], vb = b[c];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * state.sortDir;
        return String(va).localeCompare(String(vb), 'tr') * state.sortDir;
      });
    }

    el.innerHTML = '';
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const htr = document.createElement('tr');

    headers.forEach((h, i) => {
      const th = document.createElement('th');
      let arrow = '';
      if (state.sortCol === i) arrow = state.sortDir === 1 ? ' ▲' : ' ▼';
      th.textContent = h + arrow;
      th.title = 'Sıralamak için tıklayın';
      th.addEventListener('click', () => {
        if (state.sortCol === i) {
          state.sortDir *= -1;
        } else {
          state.sortCol = i;
          const sample = rows[0] ? rows[0][i] : null;
          state.sortDir = typeof sample === 'number' ? -1 : 1;
        }
        tableState.set(el, state);
        renderTable(el, headers, rows, opts);
      });
      htr.appendChild(th);
    });

    thead.appendChild(htr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const r of data) {
      const tr = document.createElement('tr');
      r.forEach((v, i) => {
        const td = document.createElement('td');
        if (typeof v === 'number') {
          const signed = opts.signed && opts.signed.indexOf(i) >= 0 && v > 0 ? '+' : '';
          td.textContent = signed + fmt(v);
          td.className = 'num';
        } else {
          td.textContent = v == null ? '–' : v;
        }
        if (typeof opts.cellClass === 'function') {
          const cls = opts.cellClass(r, i);
          if (cls) td.className = (td.className ? td.className + ' ' : '') + cls;
        }
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    el.appendChild(table);

    tableState.set(el, state);
    el._data = data;
  }

  function downloadCSV(filename, headers, rows) {
    const esc = (v) => {
      const s = String(v == null ? '' : v);
      return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const body = [headers].concat(rows).map((r) => r.map(esc).join(';')).join('\r\n');
    const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function slug(s) {
    return String(s)
      .toLocaleLowerCase('tr')
      .replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ğ/g, 'g')
      .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
  }

  function shortName(u) {
    return String(u).replace(/\s*ÜNİVERSİTESİ\s*$/, '');
  }

  // ---------- ALAN BAZLI ----------
  function populateAlanSelects() {
    fillSelect($('alanSel'), META.ana_alanlar);
    fillSelect($('uniSel'), META.universiteler, '— seçiniz (isteğe bağlı) —');
    syncAltSelect();
  }

  function syncAltSelect() {
    const alan = $('alanSel').value;
    fillSelect($('altSel'), META.alt_alanlar[alan] || []);
  }

  function renderAlan() {
    const alan = $('alanSel').value;
    const alt = $('altSel').value;
    const uni = $('uniSel').value;
    const rows = A.rows.filter((r) => r[0] === alan && r[1] === alt);

    const medK = median(rows.map((r) => r[3]));
    const medH = median(rows.map((r) => r[4]));
    const showLabels = $('alanLabels').checked;

    const trace = {
      type: 'scatter',
      mode: showLabels ? 'markers+text' : 'markers',
      x: rows.map((r) => r[3]),
      y: rows.map((r) => r[4]),
      text: rows.map((r) => shortName(r[2])),
      textposition: 'top center',
      textfont: { size: 8, color: '#475467' },
      hovertext: rows.map(
        (r) => '<b>' + r[2] + '</b><br>Kalite: ' + fmt(r[3]) + '<br>Hacım: ' + fmt(r[4])
      ),
      hoverinfo: 'text',
      marker: {
        size: rows.map((r) => (uni && r[2] === uni ? 16 : 9)),
        color: rows.map((r) => (uni && r[2] === uni ? '#e8590c' : '#1d4ed8')),
        line: { width: 1, color: '#ffffff' },
        opacity: 0.88,
      },
    };

    const layout = baseLayout();
    layout.shapes = medianShapes(medK, medH);
    Plotly.react('chartAlan', [trace], layout, PLOT_CFG);

    $('alanInfo').textContent =
      rows.length + ' üniversite · Medyan kalite ' + fmt(medK) + ' · Medyan hacım ' + fmt(medH) +
      (uni ? ' · Vurgulanan: ' + uni : '');

    renderTable(
      $('alanTable'),
      ['Üniversite', 'Kalite', 'Hacım'],
      rows.map((r) => [r[2], r[3], r[4]]),
      { defaultSort: 2 }
    );
    $('alanTable')._csvHeaders = ['Üniversite', 'Kalite', 'Hacım'];
    $('alanTable')._csvName = 'yetkinlik_' + slug(alan) + '_' + slug(alt) + '.csv';
  }

  // ---------- ÜNİVERSİTE BAZLI ----------
  function populateUniSelects() {
    fillSelect($('uniSel2'), META.universite_grafik);
    fillSelect($('alanSel2'), META.ana_alanlar, 'Tümü');
    fillSelect($('altSel2'), [], 'Tümü');
  }

  function syncAltSelect2() {
    const alan = $('alanSel2').value;
    const alts = alan ? (META.alt_alanlar[alan] || []) : [];
    fillSelect($('altSel2'), alts, 'Tümü');
  }

  function renderUni() {
    const uni = $('uniSel2').value;
    const alan = $('alanSel2').value;
    const alt = $('altSel2').value;

    let rows = U.rows.filter((r) => r[0] === uni);
    if (alan) rows = rows.filter((r) => r[1] === alan);
    if (alt) rows = rows.filter((r) => r[2] === alt);

    const medK = median(rows.map((r) => r[3]));
    const medH = median(rows.map((r) => r[4]));
    const showLabels = $('uniLabels').checked;

    const trace = {
      type: 'scatter',
      mode: showLabels ? 'markers+text' : 'markers',
      x: rows.map((r) => r[3]),
      y: rows.map((r) => r[4]),
      text: rows.map((r) => r[2]),
      textposition: 'top center',
      textfont: { size: 9, color: '#475467' },
      hovertext: rows.map(
        (r) =>
          '<b>' + r[2] + '</b><br>' + r[1] +
          '<br>Kalite: ' + fmt(r[3]) + '<br>Hacım: ' + fmt(r[4])
      ),
      hoverinfo: 'text',
      marker: {
        size: 10,
        color: '#0f766e',
        line: { width: 1, color: '#ffffff' },
        opacity: 0.9,
      },
    };

    const layout = baseLayout();
    layout.shapes = medianShapes(medK, medH);
    Plotly.react('chartUni', [trace], layout, PLOT_CFG);

    $('uniInfo').textContent =
      uni + ' · ' + rows.length + ' alt alan · Medyan kalite ' + fmt(medK) +
      ' · Medyan hacım ' + fmt(medH);

    renderTable(
      $('uniTable'),
      ['Alt Alan', 'Ana Alan', 'Kalite', 'Hacım'],
      rows.map((r) => [r[2], r[1], r[3], r[4]]),
      { defaultSort: 3 }
    );
    $('uniTable')._csvHeaders = ['Alt Alan', 'Ana Alan', 'Kalite', 'Hacım'];
    $('uniTable')._csvName = 'yetkinlik_' + slug(uni) + '.csv';
  }

  // ---------- ÜNİVERSİTE KARŞILAŞTIRMA ----------
  const EPS = 0.005;

  function populateCmpSelects() {
    fillSelect($('cmpUni1'), META.universite_grafik);
    fillSelect($('cmpUni2'), META.universite_grafik);

    const uniItu = 'İSTANBUL TEKNİK ÜNİVERSİTESİ';
    const uniOdtu = 'ORTA DOĞU TEKNİK ÜNİVERSİTESİ';
    if (META.universite_grafik.indexOf(uniItu) >= 0) $('cmpUni1').value = uniItu;
    if (META.universite_grafik.indexOf(uniOdtu) >= 0) $('cmpUni2').value = uniOdtu;

    fillSelect($('cmpAlan'), META.ana_alanlar);
    syncCmpAlt();
  }

  function syncCmpAlt() {
    const alan = $('cmpAlan').value;
    fillSelect($('cmpAlt'), META.alt_alanlar[alan] || [], 'Tümü');
  }

  function clearCmpChart() {
    try { Plotly.purge('chartCmp'); } catch (err) { /* yoksay */ }
    $('chartCmp').innerHTML = '';
  }

  function showCmpEmpty(msg) {
    clearCmpChart();
    $('chartCmp').innerHTML = '<div class="empty">' + msg + '</div>';
    $('cmpScore').innerHTML = '';
    $('cmpInfo').textContent = '';
    renderTable($('cmpTable'), ['Üniversite', 'Kalite', 'Hacım'], [], { defaultSort: 1 });
    $('cmpTable')._csvHeaders = ['Üniversite', 'Kalite', 'Hacım'];
    $('cmpTable')._csvName = 'yetkinlik_karsilastirma.csv';
  }

  function cardHtml(uni, s, isWinner, altWins) {
    if (!s) {
      return '<div class="score-card">' +
        '<div class="uni">' + shortName(uni) + '</div>' +
        '<div class="total">–</div>' +
        '<div class="sub">Bu alanda veri yok</div>' +
        '</div>';
    }
    return '<div class="score-card' + (isWinner ? ' win' : '') + '">' +
      '<div class="uni">' + shortName(uni) + '</div>' +
      '<div class="total">' + fmt(s.total) + '</div>' +
      '<div class="sub">Kalite ' + fmt(s.k) + ' · Hacım ' + fmt(s.h) + '</div>' +
      (altWins ? '<div class="sub">' + altWins + ' alt alanda önde</div>' : '') +
      (isWinner ? '<span class="badge">Toplamda önde</span>' : '') +
      '</div>';
  }

  function renderScoreboard(uni1, uni2, s1, s2, altWins) {
    let lead = 0;
    if (s1 && s2) {
      lead = s1.total > s2.total + EPS ? 1 : s2.total > s1.total + EPS ? 2 : 0;
    }

    let v;
    if (!s1 || !s2) {
      v = '<b>' + shortName(s1 ? uni1 : uni2) + '</b> bu alanda veriye sahip; ' +
          'diğer üniversitenin bu alanda verisi yok, karşılaştırma yapılamıyor.';
    } else {
      if (lead === 0) {
        v = 'Toplam puanlar eşit: <b>' + fmt(s1.total) + ' – ' + fmt(s2.total) + '</b>.';
      } else {
        const w = lead === 1 ? uni1 : uni2;
        const wt = lead === 1 ? s1.total : s2.total;
        const lt = lead === 1 ? s2.total : s1.total;
        v = '<b>' + shortName(w) + '</b> toplam puanda önde: <b>' + fmt(wt) + '</b> – ' +
            fmt(lt) + ' (+' + fmt(wt - lt) + ').';
      }

      const leadK = s1.k > s2.k + EPS ? 1 : s2.k > s1.k + EPS ? 2 : 0;
      const leadH = s1.h > s2.h + EPS ? 1 : s2.h > s1.h + EPS ? 2 : 0;
      if (leadK && leadK === leadH) {
        v += ' Kalite ve hacımda da önde.';
      } else if (leadK || leadH) {
        v += ' Kalite: ' + (leadK ? shortName(leadK === 1 ? uni1 : uni2) : 'eşit') +
             ' · Hacım: ' + (leadH ? shortName(leadH === 1 ? uni1 : uni2) : 'eşit') + '.';
      }
      if (altWins) {
        v += ' ' + altWins.total + ' alt alanın ' + altWins.w1 + '\u2019inde ' + shortName(uni1) +
             ', ' + altWins.w2 + '\u2019inde ' + shortName(uni2) + ' önde' +
             (altWins.tie ? ', ' + altWins.tie + '\u2019inde eşit' : '') + '.';
      }
    }

    $('cmpScore').innerHTML =
      '<div class="scoreboard">' +
        cardHtml(uni1, s1, lead === 1, altWins ? altWins.w1 : 0) +
        '<div class="vs">VS</div>' +
        cardHtml(uni2, s2, lead === 2, altWins ? altWins.w2 : 0) +
        '<p class="verdict">' + v + '</p>' +
      '</div>';
  }

  function renderCompare() {
    const uni1 = $('cmpUni1').value;
    const uni2 = $('cmpUni2').value;
    const alan = $('cmpAlan').value;
    const alt = $('cmpAlt').value;

    if (!uni1 || !uni2) {
      showCmpEmpty('Karşılaştırma için iki üniversite seçin.');
      return;
    }
    if (uni1 === uni2) {
      showCmpEmpty('Lütfen iki farklı üniversite seçin.');
      return;
    }

    if (!alt) {
      renderCompareAll(uni1, uni2, alan);
    } else {
      renderCompareOne(uni1, uni2, alan, alt);
    }
  }

  // Alt alan = Tümü: alt alan bazında toplam puan farkı (kim önde?)
  function renderCompareAll(uni1, uni2, alan) {
    const rows1 = A.rows.filter((r) => r[0] === alan && r[2] === uni1);
    const rows2 = A.rows.filter((r) => r[0] === alan && r[2] === uni2);
    const order = META.alt_alanlar[alan] || [];
    const alts = order.filter(
      (a) => rows1.some((r) => r[1] === a) || rows2.some((r) => r[1] === a)
    );

    if (!alts.length) {
      showCmpEmpty('Seçilen üniversitelerin bu ana alanda verisi yok.');
      return;
    }

    const items = alts.map((a) => {
      const r1 = rows1.find((r) => r[1] === a);
      const r2 = rows2.find((r) => r[1] === a);
      return {
        alt: a,
        k1: r1 ? r1[3] : null, h1: r1 ? r1[4] : null,
        k2: r2 ? r2[3] : null, h2: r2 ? r2[4] : null,
        t1: r1 ? r1[3] + r1[4] : null,
        t2: r2 ? r2[3] + r2[4] : null,
      };
    });

    const sum = (key) => items.reduce((s, it) => s + (it[key] == null ? 0 : it[key]), 0);
    const s1 = { k: sum('k1'), h: sum('h1'), total: sum('t1') };
    const s2 = { k: sum('k2'), h: sum('h2'), total: sum('t2') };

    const both = items.filter((it) => it.t1 != null && it.t2 != null);
    let w1 = 0, w2 = 0, tie = 0;
    for (const it of both) {
      if (it.t1 > it.t2 + EPS) w1++;
      else if (it.t2 > it.t1 + EPS) w2++;
      else tie++;
    }
    renderScoreboard(uni1, uni2, s1, s2, { total: both.length, w1, w2, tie });

    // Fark grafiği: sağa = 1. üniversite önde, sola = 2. üniversite önde
    const chartItems = both.slice().sort((a, b) => (a.t1 - a.t2) - (b.t1 - b.t2));
    const diffs = chartItems.map((it) => it.t1 - it.t2);
    const maxAbs = Math.max(1, ...diffs.map((d) => Math.abs(d))) * 1.2;

    clearCmpChart();
    Plotly.newPlot('chartCmp', [{
      type: 'bar',
      orientation: 'h',
      y: chartItems.map((it) => it.alt),
      x: diffs,
      marker: { color: diffs.map((d) => (d >= 0 ? '#1d4ed8' : '#e8590c')) },
      text: diffs.map((d) => (d > 0 ? '+' : '') + d.toFixed(1)),
      textposition: 'outside',
      cliponaxis: false,
      hovertemplate: '<b>%{y}</b><br>Toplam fark: %{x:.2f}<extra></extra>',
    }], {
      margin: { l: 10, r: 24, t: 34, b: 58 },
      xaxis: {
        range: [-maxAbs, maxAbs],
        title: { text: 'Toplam puan farkı (1. üniversite − 2. üniversite)', font: { size: 12 } },
        zeroline: true,
        zerolinecolor: '#94a3b8',
        zerolinewidth: 1.5,
        gridcolor: '#e8ecf3',
      },
      yaxis: { automargin: true, tickfont: { size: 11 } },
      font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#2b3445' },
      plot_bgcolor: '#ffffff',
      paper_bgcolor: '#ffffff',
      showlegend: false,
      annotations: [
        {
          x: -maxAbs * 0.52, y: 1.035, xref: 'x', yref: 'paper',
          text: '← ' + shortName(uni2) + ' önde', showarrow: false,
          font: { size: 11, color: '#e8590c' },
        },
        {
          x: maxAbs * 0.52, y: 1.035, xref: 'x', yref: 'paper',
          text: shortName(uni1) + ' önde →', showarrow: false,
          font: { size: 11, color: '#1d4ed8' },
        },
      ],
    }, PLOT_CFG);

    const h1 = shortName(uni1);
    const h2 = shortName(uni2);
    const headers = ['Alt Alan', h1 + ' · Toplam', h2 + ' · Toplam', 'Fark'];
    const tableRows = items.map((it) => [
      it.alt, it.t1, it.t2, it.t1 != null && it.t2 != null ? it.t1 - it.t2 : null,
    ]);

    renderTable($('cmpTable'), headers, tableRows, {
      defaultSort: 3,
      signed: [3],
      cellClass: (row, col) => {
        if (col === 1 && row[1] != null && row[2] != null) {
          return row[1] > row[2] + EPS ? 'win-cell' : row[2] > row[1] + EPS ? 'lose-cell' : '';
        }
        if (col === 2 && row[1] != null && row[2] != null) {
          return row[2] > row[1] + EPS ? 'win-cell' : row[1] > row[2] + EPS ? 'lose-cell' : '';
        }
        if (col === 3 && row[3] != null) {
          return row[3] > EPS ? 'diff-pos' : row[3] < -EPS ? 'diff-neg' : '';
        }
        return '';
      },
    });
    $('cmpTable')._csvHeaders = headers;
    $('cmpTable')._csvName = 'yetkinlik_' + slug(alan) + '_karsilastirma.csv';

    $('cmpInfo').textContent =
      alan + ' · ' + items.length + ' alt alan · ' +
      shortName(uni1) + ' toplam ' + fmt(s1.total) + ' vs ' +
      shortName(uni2) + ' toplam ' + fmt(s2.total);
  }

  // Alt alan = belirli bir alan: toplam puan barları (kalite + hacım)
  function renderCompareOne(uni1, uni2, alan, alt) {
    const r1 = A.rows.find((r) => r[0] === alan && r[1] === alt && r[2] === uni1);
    const r2 = A.rows.find((r) => r[0] === alan && r[1] === alt && r[2] === uni2);

    if (!r1 && !r2) {
      showCmpEmpty('Seçilen üniversitelerin bu alt alanda verisi yok.');
      return;
    }

    const s1 = r1 ? { k: r1[3], h: r1[4], total: r1[3] + r1[4] } : null;
    const s2 = r2 ? { k: r2[3], h: r2[4], total: r2[3] + r2[4] } : null;

    renderScoreboard(uni1, uni2, s1, s2, null);

    const present = [];
    if (s1) present.push({ uni: uni1, s: s1 });
    if (s2) present.push({ uni: uni2, s: s2 });

    const labels = present.map((p) => shortName(p.uni));

    clearCmpChart();
    Plotly.newPlot('chartCmp', [
      {
        type: 'bar',
        orientation: 'h',
        name: 'Kalite',
        y: labels,
        x: present.map((p) => p.s.k),
        marker: { color: '#1d4ed8' },
        text: present.map((p) => p.s.k.toFixed(1)),
        textposition: 'inside',
        insidetextanchor: 'middle',
        textfont: { color: '#ffffff', size: 12 },
        hovertemplate: '%{y}<br>Kalite: %{x:.2f}<extra></extra>',
      },
      {
        type: 'bar',
        orientation: 'h',
        name: 'Hacım',
        y: labels,
        x: present.map((p) => p.s.h),
        marker: { color: '#0f766e' },
        text: present.map((p) => p.s.h.toFixed(1)),
        textposition: 'inside',
        insidetextanchor: 'middle',
        textfont: { color: '#ffffff', size: 12 },
        hovertemplate: '%{y}<br>Hacım: %{x:.2f}<extra></extra>',
      },
    ], {
      barmode: 'stack',
      margin: { l: 10, r: 70, t: 26, b: 52 },
      xaxis: {
        range: [0, 100],
        title: { text: 'Toplam puan (Kalite + Hacım)', font: { size: 12 } },
        gridcolor: '#e8ecf3',
      },
      yaxis: { automargin: true, autorange: 'reversed', tickfont: { size: 12 } },
      legend: { orientation: 'h', y: 1.16, x: 0 },
      font: { family: 'Inter, system-ui, sans-serif', size: 12, color: '#2b3445' },
      plot_bgcolor: '#ffffff',
      paper_bgcolor: '#ffffff',
      showlegend: true,
      annotations: present.map((p) => ({
        x: p.s.total,
        y: shortName(p.uni),
        text: '<b>' + fmt(p.s.total) + '</b>',
        showarrow: false,
        xanchor: 'left',
        xshift: 8,
        font: { size: 13, color: '#0b2545' },
      })),
    }, PLOT_CFG);

    const headers = ['Üniversite', 'Kalite', 'Hacım', 'Toplam'];
    const tableRows = present.map((p) => [p.uni, p.s.k, p.s.h, p.s.total]);
    renderTable($('cmpTable'), headers, tableRows, {
      defaultSort: 3,
      cellClass: (row, col) => {
        if (col < 1 || col > 3 || !s1 || !s2) return '';
        const other = row[0] === uni1 ? s2 : s1;
        const key = col === 1 ? 'k' : col === 2 ? 'h' : 'total';
        const mine = row[col];
        return mine > other[key] + EPS ? 'win-cell' : mine < other[key] - EPS ? 'lose-cell' : '';
      },
    });
    $('cmpTable')._csvHeaders = headers;
    $('cmpTable')._csvName = 'yetkinlik_' + slug(alt) + '_karsilastirma.csv';

    $('cmpInfo').textContent = alan + ' / ' + alt;
  }

  // ---------- olaylar ----------
  function bind() {
    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach((b) => {
          const active = b === btn;
          b.classList.toggle('active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.querySelectorAll('section.tab').forEach((s) => {
          s.classList.toggle('active', s.id === 'tab-' + btn.dataset.tab);
        });
        // gizli sekmede çizilen grafiği görünür olunca yeniden boyutlandır
        try {
          const chartId = btn.dataset.tab === 'alan'
            ? 'chartAlan'
            : btn.dataset.tab === 'universite'
              ? 'chartUni'
              : 'chartCmp';
          Plotly.Plots.resize(chartId);
        } catch (err) { /* yoksay */ }
        if (window.history && history.replaceState) {
          history.replaceState(null, '', '#' + btn.dataset.tab);
        }
      });
    });

    $('alanSel').addEventListener('change', () => { syncAltSelect(); renderAlan(); });
    $('altSel').addEventListener('change', renderAlan);
    $('uniSel').addEventListener('change', renderAlan);
    $('alanLabels').addEventListener('change', renderAlan);
    $('alanDl').addEventListener('click', () => {
      const el = $('alanTable');
      downloadCSV(el._csvName || 'yetkinlik_alan.csv', el._csvHeaders, el._data);
    });

    $('uniSel2').addEventListener('change', renderUni);
    $('alanSel2').addEventListener('change', () => { syncAltSelect2(); renderUni(); });
    $('altSel2').addEventListener('change', renderUni);
    $('uniLabels').addEventListener('change', renderUni);
    $('uniDl').addEventListener('click', () => {
      const el = $('uniTable');
      downloadCSV(el._csvName || 'yetkinlik_universite.csv', el._csvHeaders, el._data);
    });

    $('cmpUni1').addEventListener('change', renderCompare);
    $('cmpUni2').addEventListener('change', renderCompare);
    $('cmpAlan').addEventListener('change', () => { syncCmpAlt(); renderCompare(); });
    $('cmpAlt').addEventListener('change', renderCompare);
    $('cmpDl').addEventListener('click', () => {
      const el = $('cmpTable');
      downloadCSV(el._csvName || 'yetkinlik_karsilastirma.csv', el._csvHeaders, el._data);
    });

    const chart = $('chartAlan');
    if (chart && typeof chart.on === 'function') {
      chart.on('plotly_click', (e) => {
        const p = e.points && e.points[0];
        if (!p) return;
        const ht = (p.data && p.data.hovertext && p.data.hovertext[p.pointNumber]) || '';
        const m = ht.match(/<b>(.*?)<\/b>/);
        if (!m) return;
        const full = m[1];
        const sel = $('uniSel');
        const opt = Array.prototype.find.call(sel.options, (o) => o.value === full);
        if (opt) {
          sel.value = full;
          renderAlan();
        }
      });
    }
  }

  // ---------- başlat ----------
  populateAlanSelects();
  renderAlan();
  populateUniSelects();
  renderUni();
  populateCmpSelects();
  renderCompare();
  bind();

  // URL hash ile sekme açma: #alan, #universite, #karsilastirma
  if (location.hash) {
    const name = location.hash.replace('#', '');
    const btn = document.querySelector('.tab-btn[data-tab="' + name + '"]');
    if (btn) btn.click();
  }
})();
