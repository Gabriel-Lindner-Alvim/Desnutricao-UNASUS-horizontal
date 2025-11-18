/* ================== Config base ================== */
const unidade = "un4"; // <── altere conforme a unidade atual (ex: un1, un2, un3...)
const storageKey = `paginaAtual_${unidade}`; // chave exclusiva da unidade

const totalPaginas = 37;
const LAST_INDEX = totalPaginas;

// cada unidade agora mantém sua própria "paginaAtual"
let paginaAtual = parseInt(sessionStorage.getItem(storageKey)) || 0;
const cachePaginas = new Map();        // HTML cache
const svgCache = new Map();            // SVG cache
const imagensPrecarregadas = window.imagensPrecarregadas || new Set();
window.imagensPrecarregadas = imagensPrecarregadas;

const area = document.getElementById("area-principal");
const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const contador = document.getElementById("contador-slides");
const spanAtual = document.getElementById("pagina-atual");

const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

const rIC = window.requestIdleCallback || (cb => setTimeout(() => cb({ timeRemaining: () => 0 }), 1));

/* ================== Config por página ================== */
const configuracoesPagina = {
  0: { backgroundImage: "url(../img/header_titulo.svg)", backgroundSize: "cover" },
  1: { backgroundColor: "#027EC7" },
  2: { backgroundColor: "#d3efffff" },
  3: { backgroundImage: "url(../img/header_titulo.svg)", backgroundSize: "cover" },
  13: { backgroundImage: "url(../img/header_titulo.svg)", backgroundSize: "cover" },
  14: { backgroundImage: "url(../img/fundoqueimado.svg)", backgroundSize: "cover" },
  15: { backgroundImage: "url(../img/fundoqueimado.svg)", backgroundSize: "cover" },
  23: { backgroundImage: "url(../img/header_titulo.svg)", backgroundSize: "cover" },
  26: { backgroundImage: "url(./img/atendimento.svg)", backgroundSize: "cover" },

};

/* ================== Utilidades visuais ================== */
function aplicarEstiloDeFundo(numeroPagina) {
  const props = ["background","backgroundColor","backgroundImage","backgroundSize","backgroundRepeat","backgroundPosition","backgroundAttachment"];
  props.forEach(p => document.body.style[p] = "");

  const config = configuracoesPagina[numeroPagina];
  if (config) {
    for (const k in config) document.body.style[k] = config[k];
  }
  area.removeAttribute("style"); // limpa estilos inline do area, se usados por alguma página
}

function atualizarContadorSlides() {
  if (paginaAtual === 0) {
    contador.style.display = "none";
  } else {
    contador.style.display = "block";
    spanAtual.textContent = paginaAtual;
  }
}

function toAbsolute(url, baseHref) {
  try { return new URL(url, baseHref).href; } catch { return url; }
}
function coletarUrlsDeSrcset(srcset) {
  if (!srcset) return [];
  return srcset.split(',').map(p => p.trim().split(/\s+/)[0]).filter(Boolean);
}
function coletarUrlsDeCssTexto(cssText) {
  const urls = [];
  const re = /url\(\s*(?:'([^']*)'|"([^"]*)"|([^'")]+))\s*\)/g;
  let m; while ((m = re.exec(cssText)) !== null) {
    const u = m[1] || m[2] || m[3];
    if (u && !u.startsWith('data:')) urls.push(u.trim());
  }
  return urls;
}

function extractBackgroundUrlsFromConfig(config, baseHref = document.baseURI) {
  const urls = new Set();

  // Considera tanto 'backgroundImage' quanto 'background'
  ['backgroundImage', 'background'].forEach(prop => {
    const val = config?.[prop];
    if (val) {
      // Reaproveita o parser de url(...) que você já tem
      coletarUrlsDeCssTexto(String(val)).forEach(u => {
        urls.add(toAbsolute(u, baseHref));
      });
    }
  });

  return Array.from(urls);
}

function preloadBackgroundImagesFromConfig(pageNumber, baseHref = document.baseURI) {
  const config = configuracoesPagina[pageNumber];
  if (!config) return [];

  const urls = extractBackgroundUrlsFromConfig(config, baseHref);

  urls.forEach(u => {
    if (!imagensPrecarregadas.has(u)) {
      const img = new Image();
      img.decoding = 'async';
      img.loading  = 'eager';
      img.src = u;
      imagensPrecarregadas.add(u);
    }
  });

  return urls;
}


/* ================== Pré-carregamento ================== */
// options.fetchExternalCSS: também busca <link rel="stylesheet"> e varre url() do CSS (use com parcimônia)
async function preloadImagens(html, baseHref = document.baseURI, options = { fetchExternalCSS: false }) {
  const temp = document.createElement('div');
  const base = document.createElement('base');
  base.href = baseHref;
  temp.appendChild(base);

  const content = document.createElement('div');
  content.innerHTML = html;
  temp.appendChild(content);

  const urls = new Set();

  content.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src'); if (src) urls.add(toAbsolute(src, baseHref));
    coletarUrlsDeSrcset(img.getAttribute('srcset')).forEach(u => urls.add(toAbsolute(u, baseHref)));
  });
  content.querySelectorAll('source[srcset]').forEach(s => {
    coletarUrlsDeSrcset(s.getAttribute('srcset')).forEach(u => urls.add(toAbsolute(u, baseHref)));
  });
  content.querySelectorAll('[data-src]').forEach(el => urls.add(toAbsolute(el.getAttribute('data-src'), baseHref)));
  content.querySelectorAll('[data-srcset]').forEach(el => {
    coletarUrlsDeSrcset(el.getAttribute('data-srcset')).forEach(u => urls.add(toAbsolute(u, baseHref)));
  });
  content.querySelectorAll('[style]').forEach(el => {
    coletarUrlsDeCssTexto(el.getAttribute('style') || '').forEach(u => urls.add(toAbsolute(u, baseHref)));
  });
  content.querySelectorAll('style').forEach(styleEl => {
    coletarUrlsDeCssTexto(styleEl.textContent || '').forEach(u => urls.add(toAbsolute(u, baseHref)));
  });
  content.querySelectorAll('svg image[href], svg image[xlink\\:href]').forEach(img => {
    const raw = img.getAttribute('href') || img.getAttribute('xlink:href');
    if (raw) urls.add(toAbsolute(raw, baseHref));
  });

  if (options.fetchExternalCSS) {
    const linkHrefs = Array.from(content.querySelectorAll('link[rel~="stylesheet"][href]'))
      .map(l => toAbsolute(l.getAttribute('href'), baseHref));
    const cssTexts = await Promise.allSettled(
      linkHrefs.map(href => fetch(href).then(r => r.ok ? r.text() : ''))
    );
    cssTexts.forEach(res => {
      if (res.status === 'fulfilled' && res.value) {
        coletarUrlsDeCssTexto(res.value).forEach(u => urls.add(toAbsolute(u, baseHref)));
      }
    });
  }

  urls.forEach(u => {
    if (!imagensPrecarregadas.has(u)) {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      img.src = u;
      imagensPrecarregadas.add(u);
    }
  });
  return Array.from(urls);
}

function preloadSVGs(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  tempDiv.querySelectorAll("[data-svg]").forEach(div => {
    const file = div.getAttribute("data-svg");
    if (file && !imagensPrecarregadas.has(file)) {
      fetch(file); // cache do navegador
      imagensPrecarregadas.add(file);
    }
  });
}

/* ================== SVG inline com cache ================== */
async function loadSVG(_svgFilePath, _id) {
  try {
    let svgCode = svgCache.get(_svgFilePath);
    if (!svgCode) {
      const response = await fetch(_svgFilePath);
      svgCode = await response.text();
      svgCache.set(_svgFilePath, svgCode);
    }
    const host = document.getElementById(_id);
    if (host) host.innerHTML = svgCode;
  } catch (error) {
    console.error("Erro ao carregar o arquivo SVG:", error);
  }
}

/* ================== Navegação e carregamento ================== */
let loadToken = 0;               // garante que só o último load vale
let currentController = null;    // aborta fetch anterior

async function getPaginaHTML(numero, baseUrl = `paginas_unidade4/pagina${numero}.html`, signal) {
  if (cachePaginas.has(numero)) return cachePaginas.get(numero);
  const resp = await fetch(baseUrl, { signal });
  const html = await resp.text();
  cachePaginas.set(numero, html);
  return html;
}

async function carregarPagina(numero) {
  const myToken = ++loadToken;

  // aborta requisições anteriores
  currentController?.abort();
  currentController = new AbortController();

  try {
    preloadBackgroundImagesFromConfig(numero);

    aplicarEstiloDeFundo(numero);

    const html = await getPaginaHTML(numero, `paginas_unidade4/pagina${numero}.html`, currentController.signal);
    if (myToken !== loadToken) return; // carregamento ultrapassado

    area.innerHTML = html;

    
    // --- Força topo após carregar a página dinâmica ---
    setTimeout(() => {
      // volta pro topo da área
      area.scrollTop = 0;

      // volta pro topo da página inteira
      window.scrollTo(0, 0);
    }, 0);

    function ajustarAlturaFullBleed() {
      const fullBleed = document.querySelector('.full-bleed');
      if (!fullBleed) return;

      // remove altura extra antes de recalcular
      fullBleed.style.minHeight = "";  

      // posição inferior atual da div em relação ao topo da página
      const bottomDiv = fullBleed.getBoundingClientRect().bottom + window.scrollY;

      // altura total do body/documento
      const alturaPagina = document.body.scrollHeight;

      // quanto falta para o final da página
      const faltante = alturaPagina - bottomDiv;

      // aplica a nova altura mínima (conteúdo + espaço faltante)
      fullBleed.style.minHeight = (fullBleed.scrollHeight + Math.max(faltante, 0)) + "px";
    }

    // chama no load inicial
    window.addEventListener("load", ajustarAlturaFullBleed);
    // chama no resize (tela maior → menor ou menor → maior)
    window.addEventListener("resize", ajustarAlturaFullBleed);
    ajustarAlturaFullBleed();

    // Ativa animações adicionando classes (uma vez, no frame atual)
    area.querySelectorAll(".animar-slide-direita").forEach(el => el.classList.add("slide-in-right"));
    area.querySelectorAll(".animar-fade-in").forEach(el => el.classList.add("fade-in"));
    area.querySelectorAll(".animar-slide-esquerda").forEach(el => el.classList.add("slide-in-left"));

    // Marca card inicial ativo
    const cardInicial = area.querySelector('.img-3');
    if (cardInicial) cardInicial.classList.add('active');

    // Contador + botões
  
    atualizarContadorSlides();

    // Carrega SVGs declarados
    const svgContainers = area.querySelectorAll("[data-svg]");
    await Promise.all(Array.from(svgContainers).map(div => loadSVG(div.getAttribute("data-svg"), div.id)));


    const modal = document.getElementById("ModalCriancas");
    if (modal) {
    let currentPage = 1;

    // Verifica se a página HTML definiu o número total de páginas (via atributo data-total-pages)
    const totalPages = parseInt(modal.getAttribute("data-total-pages")) || 7;

    const showPage = (page) => {
        // Alterna as páginas
        for (let i = 1; i <= totalPages; i++) {
        const el = modal.querySelector(`#modalPage${i}`);
        if (el) el.classList.toggle("d-none", i !== page);
        }

        // Controla visibilidade das setas
        const prev = modal.querySelector("#modalPrev");
        const next = modal.querySelector("#modalNext");

        if (prev && next) {
        prev.style.display = (page === 1) ? "none" : "block";
        next.style.display = (page === totalPages) ? "none" : "block";
        }
    };

    // Eventos das setas
    modal.querySelector("#modalPrev")?.addEventListener("click", () => {
        if (currentPage > 1) {
        currentPage--;
        showPage(currentPage);
        }
    });

    modal.querySelector("#modalNext")?.addEventListener("click", () => {
        if (currentPage < totalPages) {
        currentPage++;
        showPage(currentPage);
        }
    });

    // Sempre que o modal for aberto, volta pra página 1
    modal.addEventListener("shown.bs.modal", () => {
        currentPage = 1;
        showPage(currentPage);
    });

    // 🔁 Sempre que a página for recarregada via carregarPagina(), reseta também o currentPage
    currentPage = 1;
    showPage(currentPage);
    }

    
    // === Interatividade das imagens clicáveis ===
    const imagens = area.querySelectorAll(".img-interativa");
    let imagemAtiva = null; // controle global para desativar outras

    imagens.forEach(img => {
      img.addEventListener("click", () => {
        // Se clicar novamente na mesma imagem → fecha tudo
        if (imagemAtiva === img) {
          img.src = img.dataset.inactive;
          const popup = img.parentElement.querySelector(".popup-dropright, .popup-dropleft");
          popup?.classList.add("d-none");
          imagemAtiva = null;
          return;
        }

        // Desativa qualquer outra imagem ativa
        if (imagemAtiva) {
          imagemAtiva.src = imagemAtiva.dataset.inactive;
          const popupAtivo = imagemAtiva.parentElement.querySelector(".popup-dropright, .popup-dropleft");
          popupAtivo?.classList.add("d-none");
        }

        // Ativa a nova imagem e mostra o popup correspondente
        img.src = img.dataset.active;
        const popup = img.parentElement.querySelector(".popup-dropright, .popup-dropleft");
        popup?.classList.remove("d-none");
        imagemAtiva = img;
      });
    });


    // === BLOCO NOVO: Quiz com várias questões e feedbacks individuais ===
    const quiz = area.querySelector('.quiz');
    if (quiz) {
      const questoes = quiz.querySelectorAll('.questao');
      const botao = quiz.querySelector('#enviar');

      // Esconde feedback sempre que usuário troca de alternativa
      questoes.forEach(q => {
        const feedback = q.querySelector('.feedback');
        const radios = q.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => {
          radio.addEventListener('change', () => {
            feedback.style.display = 'none';
          });
        });
      });

      // Ao clicar em "Submeter"
      botao.addEventListener('click', () => {
        questoes.forEach(q => {
          const selecionado = q.querySelector('input[type="radio"]:checked');
          const feedback = q.querySelector('.feedback');

          if (!selecionado) {
            feedback.textContent = "Selecione uma alternativa antes de responder.";
            feedback.className = "feedback errada";
          } else {
            const texto = selecionado.dataset.feedback || "";
            if (selecionado.value === "correta") {
              feedback.textContent = texto;
              feedback.className = "feedback correta";
            } else {
              feedback.textContent = texto;
              feedback.className = "feedback errada";
            }
          }
          feedback.style.display = "block";
        });
      });
    }


    // Prefetch da próxima página em idle (se existir)
    if (numero < LAST_INDEX) {
      rIC(async () => {
        try {
          const proxNum = numero + 1;
          if (!cachePaginas.has(proxNum)) {
            const respProx = await fetch(`paginas_unidade4/pagina${proxNum}.html`);
            if (!respProx.ok) return;
            const htmlProx = await respProx.text();
            cachePaginas.set(proxNum, htmlProx);
            // pré-carrega imagens e svgs da próxima página (sem duplicar)
            await preloadImagens(htmlProx, respProx.url, { fetchExternalCSS: true });
            preloadSVGs(htmlProx);
            preloadBackgroundImagesFromConfig(proxNum);
          }
        } catch (e) { /* silencioso em idle */ }
      });
    }
  } catch (erro) {
    if (erro?.name === 'AbortError') return; // navegação rápida, ignore
    area.innerHTML = "<p>Erro ao carregar a página.</p>";
    console.error("Erro ao carregar página:", erro);
  }
}

/* ================== Delegação de eventos ================== */
area.addEventListener('click', (ev) => {
  const btn = ev.target.closest('.accordion-button');
  if (btn) {
    const wrapper = btn.closest('.accordion-with-image');
    const imgWrap = wrapper?.querySelector('.accordion-footer-img');
    if (imgWrap) imgWrap.classList.toggle('is-open'); // use CSS .is-open { display:block } por exemplo
    return;
  }

  const trigger = ev.target.closest('#img-reveal');
  if (trigger) {
    const targetSel = trigger.getAttribute('data-target');
    const target = area.querySelector(targetSel);
    if (target) {
      target.classList.toggle('is-open');
      const open = target.classList.contains('is-open');
      target.setAttribute('aria-hidden', String(!open));
      trigger.style.display = "none";
    }
    return;
  }

  const card = ev.target.closest('.thecard');
  if (card) {
    card.classList.toggle('flipped');
    return;
  }

  const imgCard = ev.target.closest('.img-hover-effect');
  if (imgCard) {
    area.querySelectorAll('.img-hover-effect.active').forEach(c => c.classList.remove('active'));
    imgCard.classList.add('active');
    return;
  }
}, { passive: true });

/* “Flip” automático quando a animação da esquerda terminar */
area.addEventListener('animationend', (e) => {
  if (!e.target.classList?.contains('animar-slide-esquerda')) return;
  if (e.animationName !== 'slideInFromLeft') return;
  if (reduceMotion) return;
  const card = e.target.querySelector?.('.thecard');
  if (!card || card.dataset.autoflipped) return;
  setTimeout(() => {
    card.classList.add('flipped');
    card.dataset.autoflipped = '1';
  }, 1500);
}, { passive: true });

/* ================== Controles prev/next ================== */
prevBtn.addEventListener("click", () => {
  if (paginaAtual > 0) {
    paginaAtual--;
    sessionStorage.setItem(storageKey, paginaAtual);
    carregarPagina(paginaAtual);
  } else if (paginaAtual === 0) {
    // Vai para unidade anterior
    const unidadeAnterior = "un3";
    const storageKeyAnterior = `paginaAtual_${unidadeAnterior}`;
    sessionStorage.setItem(storageKeyAnterior, 29); // ex: última página da un2
    window.location.href = `../unidade 3/${unidadeAnterior}.html`;
  }
});

nextBtn.addEventListener("click", () => {
  if (paginaAtual < LAST_INDEX) {
    paginaAtual++;
    sessionStorage.setItem(storageKey, paginaAtual);
    carregarPagina(paginaAtual);
  } else if (paginaAtual === LAST_INDEX) {
    window.location.href = "https://unasus-quali.moodle.ufsc.br/course/view.php?id=102";
  }
});


/* ================== Reset da página ao trocar de unidade ================== */
// Este bloco garante que qualquer link <a> com uma imagem ir_unX (ir_un1, ir_un2, etc.)
// sempre resete a paginaAtual antes do redirecionamento.
area.addEventListener('click', (ev) => {
  const linkUn = ev.target.closest('a.ir-unidade');
  if (linkUn && linkUn.querySelector("img[src*='ir_un']")) {
    // Detecta automaticamente o número da unidade alvo
    const href = linkUn.getAttribute('href');
    const match = href.match(/unidade\s*(\d+)/i);
    if (match) {
      const destino = `un${match[1]}`;
      const destinoKey = `paginaAtual_${destino}`;
      sessionStorage.setItem(destinoKey, 0); // reseta destino
    }

    currentController?.abort();
    return; // deixa o <a> seguir o fluxo normal
  }

  // (restante da sua delegação de eventos)
});

/* ================== Start ================== */
carregarPagina(paginaAtual);
