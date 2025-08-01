const totalPaginas = 24;
let paginaAtual = parseInt(sessionStorage.getItem("paginaAtual")) || 0;
const cachePaginas = {};
const imagensPrecarregadas = new Set();


// Configurações por página
const configuracoesPagina = {
  0: {
    backgroundImage: "url(../img/header_titulo.svg)",
    backgroundSize: "cover",
  },
  1: {
    backgroundColor: "#027EC7",
  },
  3: {
    backgroundImage: "url('img/un1/banana plate.png')",
    backgroundSize: "cover",
    backgroundPosition: "40%",
    backgroundAttachment: "fixed",
    areaPrincipal: {
      marginTop: "30vh"
    }
  },
  19: {
    backgroundImage: "url(img/un1/feijao.png)",
    backgroundSize: "cover",
  },
};

function aplicarEstiloDeFundo(numeroPagina) {
  // Reset estilos do body
  const propriedadesBody = [
    "background", "backgroundColor", "backgroundImage", 
    "backgroundSize", "backgroundRepeat", "backgroundPosition", "backgroundAttachment"
  ];
  propriedadesBody.forEach(prop => document.body.style[prop] = "");

  // Reset estilos do area-principal
  const area = document.getElementById("area-principal");
  if (area) {
    area.removeAttribute("style");
  }

  const config = configuracoesPagina[numeroPagina];

  if (config) {
    // Aplica estilos ao body
    for (const propriedade in config) {
      if (propriedade !== "areaPrincipal") {
        document.body.style[propriedade] = config[propriedade];
      }
    }

    // Aplica estilos ao area-principal, se existirem
    if (config.areaPrincipal && area) {
      for (const propriedade in config.areaPrincipal) {
        area.style[propriedade] = config.areaPrincipal[propriedade];
      }
    }
  }
}

async function carregarPagina(numero) {
  try {
    aplicarEstiloDeFundo(numero);

    let html;
    if (cachePaginas[numero]) {
      html = cachePaginas[numero];
    } else {
      const resposta = await fetch(`paginas_unidade1/pagina${numero}.html`);
      html = await resposta.text();
      cachePaginas[numero] = html;
    }

    const area = document.getElementById("area-principal");
    area.innerHTML = html;

    atualizarContadorSlides();

    const svgContainers = area.querySelectorAll("[data-svg]");
    const svgPromises = Array.from(svgContainers).map(div => {
      const file = div.getAttribute("data-svg");
      const id = div.id;
      return loadSVG(file, id);
    });

    await Promise.all(svgPromises);

    document.getElementById("nextBtn").hidden = numero === totalPaginas;
    document.getElementById("prevBtn").hidden = numero === 0;


    if (numero + 1 <= totalPaginas && !cachePaginas[numero + 1]) {
      const respostaProx = await fetch(`paginas_unidade1/pagina${numero + 1}.html`);
      const htmlProx = await respostaProx.text();
      cachePaginas[numero + 1] = htmlProx;

      preloadImagens(htmlProx);
      preloadSVGs(htmlProx);
    }

  } catch (erro) {
    document.getElementById("area-principal").innerHTML = "<p>Erro ao carregar a página.</p>";
    console.error("Erro ao carregar página:", erro);
  }
}


document.getElementById("prevBtn").addEventListener("click", () => {
  if (paginaAtual > 0) {
    paginaAtual--;
    sessionStorage.setItem("paginaAtual", paginaAtual);
    carregarPagina(paginaAtual);
  }
});

document.getElementById("nextBtn").addEventListener("click", () => {
  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    sessionStorage.setItem("paginaAtual", paginaAtual);
    carregarPagina(paginaAtual);
  }
});

carregarPagina(paginaAtual);

async function loadSVG(_svgFilePath, _id) {
  try {
    const response = await fetch(_svgFilePath);
    const svgCode = await response.text();
    document.getElementById(_id).innerHTML = svgCode;
  } catch (error) {
    console.error("Erro ao carregar o arquivo SVG:", error);
  }
}

async function goto(event, _selectorHide, _selectorShow){
  goto2(_selectorHide);
  goto3(_selectorShow);

  try {
   event.stopPropagation();
 } catch (exceptionVar) {
  return;
} finally {
  return;
}
};

function atualizarContadorSlides() {
  const contador = document.getElementById("contador-slides");
  const spanAtual = document.getElementById("pagina-atual");

  if (paginaAtual === 0) {
    contador.style.display = "none";
  } else {
    contador.style.display = "block";
    spanAtual.textContent = paginaAtual;
  }
}

function preloadImagens(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const imagens = tempDiv.querySelectorAll("img");

  imagens.forEach(img => {
    const src = img.getAttribute("src");
    if (src && !imagensPrecarregadas.has(src)) {
      const imagem = new Image();
      imagem.src = src;
      imagensPrecarregadas.add(src);
    }
  });
}

function preloadSVGs(html) {
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;
  const svgs = tempDiv.querySelectorAll("[data-svg]");

  svgs.forEach(div => {
    const file = div.getAttribute("data-svg");
    if (file && !imagensPrecarregadas.has(file)) {
      fetch(file); // navegador irá guardar no cache
      imagensPrecarregadas.add(file);
    }
  });
}