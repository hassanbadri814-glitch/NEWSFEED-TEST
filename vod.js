/* ============================================================
   WAR DESK v1.0 — VOD (Stremio via Cinemeta)
   - Sidebar navigatie
   - Poster grid
   - Detail modal
   - Stremio deep link
   ============================================================ */

(function(){
  "use strict";

  var $ = function(id){ return document.getElementById(id); };
  var LOG = function(){ try{ console.log.apply(console, ["[VOD]"].concat(Array.prototype.slice.call(arguments))); }catch(e){} };
  LOG("v1.0 geladen");

  var VOD = {
    currentCatId: "movie/top",
    currentSkip: 0,
    currentItems: [],
    currentDetail: null,
    cache: {},
    renderLimit: 60,
    isLoading: false,
    _initialized: false
  };

  /* ============================================================
     Categorieën
     ============================================================ */
  var CATS = [
    { group: "Populair", items: [
      { id: "movie/top",     label: "Top films",    color: "#e0a857" },
      { id: "series/top",    label: "Top series",   color: "#e0a857" }
    ]},
    { group: "Film genres", items: [
      { id: "movie/genre=Action",      label: "Actie",        color: "#ef4444" },
      { id: "movie/genre=Comedy",      label: "Komedie",      color: "#f59e0b" },
      { id: "movie/genre=Drama",       label: "Drama",        color: "#a855f7" },
      { id: "movie/genre=Sci-Fi",      label: "Sci-Fi",       color: "#06b6d4" },
      { id: "movie/genre=Horror",      label: "Horror",       color: "#991b1b" },
      { id: "movie/genre=Thriller",    label: "Thriller",     color: "#8b5cf6" },
      { id: "movie/genre=Animation",   label: "Animatie",     color: "#ec4899" },
      { id: "movie/genre=Documentary", label: "Documentaire", color: "#10b981" }
    ]},
    { group: "Serie genres", items: [
      { id: "series/genre=Action",      label: "Actie",        color: "#ef4444" },
      { id: "series/genre=Comedy",      label: "Komedie",      color: "#f59e0b" },
      { id: "series/genre=Drama",       label: "Drama",        color: "#a855f7" },
      { id: "series/genre=Sci-Fi",      label: "Sci-Fi",       color: "#06b6d4" },
      { id: "series/genre=Horror",      label: "Horror",       color: "#991b1b" },
      { id: "series/genre=Thriller",    label: "Thriller",     color: "#8b5cf6" },
      { id: "series/genre=Animation",   label: "Animatie",     color: "#ec4899" },
      { id: "series/genre=Documentary", label: "Documentaire", color: "#10b981" }
    ]}
  ];

  /* ============================================================
     Fetch via proxy
     ============================================================ */
  function getProxies(){
    if(window.CONFIG && CONFIG.proxies && CONFIG.proxies.length){
      return CONFIG.proxies.slice();
    }
    return ["https://newsfeed2.hassanbadri814.workers.dev/?url="];
  }

  function fetchJsonDirect(url){
    return fetch(url, { method: "GET" })
      .then(function(r){
        if(!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
  }

  function fetchJsonViaProxy(url){
    var proxies = getProxies();
    var lastErr = null;
    function tryProxy(idx){
      if(idx >= proxies.length) return Promise.reject(lastErr || new Error("Alle proxies faalden"));
      var proxy = proxies[idx];
      var ctrl = new AbortController();
      var timer = setTimeout(function(){ ctrl.abort(); }, 15000);
      return fetch(proxy + encodeURIComponent(url), { method: "GET", signal: ctrl.signal })
        .then(function(r){
          clearTimeout(timer);
          if(!r.ok) throw new Error("HTTP " + r.status);
          return r.json();
        })
        .catch(function(e){
          clearTimeout(timer);
          lastErr = e;
          LOG("Proxy " + (idx + 1) + " faalde:", e.message);
          return tryProxy(idx + 1);
        });
    }
    return tryProxy(0);
  }

  function fetchJson(url){
    /* Probeer eerst direct (Cinemeta heeft CORS), val terug op proxy */
    return fetchJsonDirect(url).catch(function(){
      return fetchJsonViaProxy(url);
    });
  }

  /* ============================================================
     Build catalog URL
     ============================================================ */
  function buildCatalogUrl(catId, skip){
    /* catId format: "movie/top" of "movie/genre=Action" */
    var base = "https://v3-cinemeta.strem.io/catalog/" + catId;
    if(typeof skip === "number" && skip > 0){
      base += "/skip=" + skip;
    }
    return base + ".json";
  }

  function buildMetaUrl(type, id){
    return "https://v3-cinemeta.strem.io/meta/" + type + "/" + encodeURIComponent(id) + ".json";
  }

  /* ============================================================
     Sidebar renderen
     ============================================================ */
  function renderSidebar(){
    var wrap = $("vodSidebar");
    if(!wrap) return;
    var html = "";
    CATS.forEach(function(group){
      html += '<div class="vod-sidebar-group">';
      html += '<div class="vod-sidebar-title">' + group.group + '</div>';
      group.items.forEach(function(item){
        var isActive = VOD.currentCatId === item.id;
        html += '<button class="vod-sidebar-item ' + (isActive ? "active" : "") + '" data-cat="' + item.id + '">';
        html += '<span class="vod-sidebar-dot" style="background:' + item.color + '"></span>';
        html += '<span class="vod-sidebar-label">' + item.label + '</span>';
        html += '</button>';
      });
      html += '</div>';
    });
    wrap.innerHTML = html;

    if(!wrap._bound){
      wrap._bound = true;
      wrap.addEventListener("click", function(e){
        var btn = e.target.closest(".vod-sidebar-item");
        if(!btn) return;
        var catId = btn.dataset.cat;
        if(!catId || catId === VOD.currentCatId) return;
        VOD.currentCatId = catId;
        VOD.currentSkip = 0;
        VOD.currentItems = [];
        renderSidebar();
        loadCatalog(false);
      });
    }
  }

  /* ============================================================
     Catalog laden
     ============================================================ */
  async function loadCatalog(loadMore){
    if(VOD.isLoading) return;
    var grid = $("vodGrid");
    var loadingEl = $("vodLoading");
    if(!grid) return;

    if(!loadMore){
      VOD.currentSkip = 0;
      VOD.currentItems = [];
      grid.innerHTML = "";
    }

    var cacheKey = VOD.currentCatId + "::" + VOD.currentSkip;
    if(VOD.cache[cacheKey]){
      appendItems(VOD.cache[cacheKey]);
      return;
    }

    VOD.isLoading = true;
    if(loadingEl && !loadMore) loadingEl.style.display = "block";

    try{
      var url = buildCatalogUrl(VOD.currentCatId, VOD.currentSkip);
      LOG("Fetch:", url);
      var data = await fetchJson(url);
      var items = (data && data.metas) ? data.metas : [];
      LOG(items.length + " items ontvangen");

      VOD.cache[cacheKey] = items;
      appendItems(items);
    }catch(e){
      LOG("Fout:", e.message);
      if(!loadMore){
        grid.innerHTML = '<div class="vod-empty">Kon niets laden. Probeer opnieuw.</div>';
      }
    } finally {
      VOD.isLoading = false;
      if(loadingEl) loadingEl.style.display = "none";
    }
  }

  function appendItems(items){
    var grid = $("vodGrid");
    if(!grid) return;

    if(!items.length){
      if(!VOD.currentItems.length){
        grid.innerHTML = '<div class="vod-empty">Geen resultaten.</div>';
      }
      return;
    }

    var html = "";
    items.forEach(function(it, i){
      var idx = VOD.currentItems.length + i;
      var poster = it.poster || "";
      var name = it.name || "?";
      var year = it.releaseInfo || it.year || "";
      var rating = it.imdbRating ? "⭐ " + it.imdbRating : "";
      var initial = name.charAt(0).toUpperCase();

      html += '<button class="vod-poster" data-idx="' + idx + '">';
      if(poster){
        html += '<div class="vod-poster-img"><img src="' + esc(poster) + '" loading="lazy" alt="" onerror="this.parentNode.innerHTML=\'<span>' + esc(initial) + '</span>\'"></div>';
      } else {
        html += '<div class="vod-poster-img"><span>' + esc(initial) + '</span></div>';
      }
      html += '<div class="vod-poster-body">';
      html += '<div class="vod-poster-name">' + esc(name) + '</div>';
      html += '<div class="vod-poster-meta">' + esc(year) + (rating ? ' · ' + esc(rating) : '') + '</div>';
      html += '</div>';
      html += '</button>';
    });

    grid.insertAdjacentHTML("beforeend", html);
    VOD.currentItems = VOD.currentItems.concat(items);

    if(!grid._bound){
      grid._bound = true;
      grid.addEventListener("click", function(e){
        var btn = e.target.closest(".vod-poster");
        if(!btn) return;
        var idx = parseInt(btn.dataset.idx, 10);
        if(isNaN(idx)) return;
        var item = VOD.currentItems[idx];
        if(item) openDetail(item);
      });
    }

    updateLoadMore();
  }

  function updateLoadMore(){
    var wrap = $("vodLoadMoreWrap");
    if(!wrap) return;
    if(VOD.currentItems.length >= 60){
      wrap.innerHTML = '<button class="vod-load-more" id="vodLoadMoreBtn">Meer laden</button>';
      var btn = $("vodLoadMoreBtn");
      if(btn){
        btn.addEventListener("click", function(){
          VOD.currentSkip += 100;
          loadCatalog(true);
        });
      }
    } else {
      wrap.innerHTML = "";
    }
  }

  /* ============================================================
     Detail modal
     ============================================================ */
  async function openDetail(item){
    var modal = $("vodDetailModal");
    if(!modal) return;

    VOD.currentDetail = item;

    $("vodDetailTitle").textContent = item.name || "?";
    $("vodDetailMeta").textContent = "Laden...";
    $("vodDetailText").textContent = "";
    $("vodDetailPoster").innerHTML = item.poster ? '<img src="' + esc(item.poster) + '" alt="">' : "";

    modal.classList.add("show");

    var type = (item.type === "series" || (VOD.currentCatId || "").indexOf("series/") === 0) ? "series" : "movie";
    var metaUrl = buildMetaUrl(type, item.imdb_id || item.id);

    try{
      var data = await fetchJson(metaUrl);
      var meta = (data && data.meta) ? data.meta : null;
      if(meta){
        $("vodDetailTitle").textContent = meta.name || item.name;
        var metaParts = [];
        if(meta.releaseInfo) metaParts.push(meta.releaseInfo);
        if(meta.runtime) metaParts.push(meta.runtime);
        if(meta.imdbRating) metaParts.push("⭐ " + meta.imdbRating);
        if(meta.genres && meta.genres.length) metaParts.push(meta.genres.join(", "));
        $("vodDetailMeta").textContent = metaParts.join(" · ");
        $("vodDetailText").textContent = meta.description || meta.plot || item.description || "(geen beschrijving)";

        if(meta.poster){
          $("vodDetailPoster").innerHTML = '<img src="' + esc(meta.poster) + '" alt="">';
        }

        /* Deep link knop updaten */
        var dl = buildStremioLink(type, meta.imdb_id || meta.id, meta.name);
        var dlBtn = $("vodDetailOpenStremio");
        if(dlBtn){
          dlBtn.onclick = function(){
            try{ window.location.href = dl; }catch(e){
              if(window.showToast) window.showToast("Kon Stremio niet openen");
            }
          };
        }
      }
    }catch(e){
      LOG("Meta fout:", e.message);
      $("vodDetailMeta").textContent = "";
      $("vodDetailText").textContent = item.description || "(geen beschrijving)";
      /* Fallback deep link met basis info */
      var dl = buildStremioLink(type, item.imdb_id || item.id, item.name);
      var dlBtn = $("vodDetailOpenStremio");
      if(dlBtn){
        dlBtn.onclick = function(){
          try{ window.location.href = dl; }catch(e){}
        };
      }
    }
  }

  function buildStremioLink(type, id, name){
    /* Deep link naar Stremio detail pagina */
    if(!id) return "stremio:///";
    return "stremio:///detail/" + type + "/" + encodeURIComponent(id);
  }

  function closeDetail(){
    var modal = $("vodDetailModal");
    if(modal) modal.classList.remove("show");
    VOD.currentDetail = null;
  }

  function esc(s){
    return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
    });
  }

  /* ============================================================
     Init
     ============================================================ */
  function bindDetailModal(){
    var modal = $("vodDetailModal");
    if(!modal) return;
    var closeBtn = $("vodDetailClose");
    var closeBtn2 = $("vodDetailCloseBtn");
    if(closeBtn) closeBtn.addEventListener("click", closeDetail);
    if(closeBtn2) closeBtn2.addEventListener("click", closeDetail);
    modal.addEventListener("click", function(e){
      if(e.target === modal) closeDetail();
    });
  }

  async function init(){
    if(VOD._initialized) return;
    VOD._initialized = true;
    LOG("init");
    renderSidebar();
    bindDetailModal();
    /* Wacht even tot view zichtbaar is */
    setTimeout(function(){
      loadCatalog(false);
    }, 100);
  }

  window.__vodRefresh = function(){
    VOD.cache = {};
    loadCatalog(false);
  };
  window.__vodOpen = function(){
    init();
    /* Als al geïnitialiseerd, herlaad niet */
  };
  window.VODAPI = { init: init, state: VOD };

  /* Auto-init als de view al zichtbaar is */
  if(document.readyState !== "loading"){
    setTimeout(function(){
      var view = document.getElementById("viewVod");
      if(view && !view.hidden) init();
    }, 800);
  } else {
    document.addEventListener("DOMContentLoaded", function(){
      setTimeout(function(){
        var view = document.getElementById("viewVod");
        if(view && !view.hidden) init();
      }, 800);
    });
  }

  console.log("[WAR DESK] vod.js v1.0 geladen");
})();