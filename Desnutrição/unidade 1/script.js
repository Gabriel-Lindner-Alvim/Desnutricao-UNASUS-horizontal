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
  2: {
    backgroundColor: "#f0f0f0"
  },
  3: {
    backgroundImage: "url('img/un1/banana plate.svg')",
    backgroundSize: "cover",
    backgroundPosition: "40%",
    backgroundAttachment: "fixed"
  }
  // ...adicione mais conforme necessário
};

// Aplica o estilo de fundo com base no número da página
function aplicarEstiloDeFundo(numeroPagina) {
  // Limpa estilos anteriores
  document.body.style.background = "";
  document.body.style.backgroundColor = "";
  document.body.style.backgroundImage = "";
  document.body.style.backgroundSize = "";
  document.body.style.backgroundRepeat = "";
  document.body.style.backgroundPosition = "";
  document.body.style.backgroundAttachment = "";

  const config = configuracoesPagina[numeroPagina];

  if (config) {
    for (const propriedade in config) {
      document.body.style[propriedade] = config[propriedade];
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

