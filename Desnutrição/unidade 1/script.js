const totalPaginas = 22;
let paginaAtual = parseInt(localStorage.getItem("paginaAtual")) || 0;

// Configurações por página
const configuracoesPagina = {
  0: {
    backgroundImage: "url(../img/header_titulo.svg)",
    backgroundSize: "cover",
  },
  1: {
    backgroundImage: "url('../img/fundo1.jpg')",
    backgroundSize: "cover",
    backgroundRepeat: "no-repeat"
  },
  3: {
    backgroundImage: "url('img/un1/banana plate.svg')",
    backgroundSize: "cover",
    backgroundPosition: "40%",
    backgroundAttachment: "fixed",
    areaPrincipal: {
      marginTop: "30vh"
    }
  }
  // ...adicione mais conforme necessário
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
    aplicarEstiloDeFundo(numero); // Aplica o fundo aqui

    const resposta = await fetch(`paginas_unidade1/pagina${numero}.html`);
    const html = await resposta.text();
    const area = document.getElementById("area-principal");

    area.innerHTML = html;

    const svgContainers = area.querySelectorAll("[data-svg]");
    const svgPromises = Array.from(svgContainers).map(div => {
      const file = div.getAttribute("data-svg");
      const id = div.id;
      return loadSVG(file, id);
    });

    await Promise.all(svgPromises);

    document.getElementById("nextBtn").hidden = numero === totalPaginas;
    document.getElementById("prevBtn").hidden = numero === 0;
  } catch (erro) {
    document.getElementById("area-principal").innerHTML = "<p>Erro ao carregar a página.</p>";
    console.error("Erro ao carregar página:", erro);
  }
}

document.getElementById("prevBtn").addEventListener("click", () => {
  if (paginaAtual > 0) {
    paginaAtual--;
    localStorage.setItem("paginaAtual", paginaAtual);
    carregarPagina(paginaAtual);
  }
});

document.getElementById("nextBtn").addEventListener("click", () => {
  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    localStorage.setItem("paginaAtual", paginaAtual);
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

