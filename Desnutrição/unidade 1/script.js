const totalPaginas = 22;
let paginaAtual = parseInt(localStorage.getItem("paginaAtual")) || 1;

async function carregarPagina(numero) {
  try {
    const resposta = await fetch(`paginas_unidade1/pagina${numero}.html`);
    const html = await resposta.text();
    const container = document.getElementById("conteudo");
    container.innerHTML = html;


    // Carregar SVGs após o conteúdo ser inserido
    const svgContainers = container.querySelectorAll("[data-svg]");
    svgContainers.forEach(div => {
      const file = div.getAttribute("data-svg");
      const id = div.id;
      if (file && id) {
        loadSVG(file, id);
      }
    });

    document.getElementById("nextBtn").hidden = numero === totalPaginas;
  } catch (erro) {
    document.getElementById("conteudo").innerHTML = "<p>Erro ao carregar a página.</p>";
    console.error("Erro ao carregar página:", erro);
  }
}

document.getElementById("prevBtn").addEventListener("click", () => {
  if (paginaAtual > 1) {
    paginaAtual--;
    localStorage.setItem("paginaAtual", paginaAtual); // salva página
    carregarPagina(paginaAtual);
  }
  if (paginaAtual === 1) {
    localStorage.setItem("paginaAtual", paginaAtual);
    voltarCapa()
  }
});

document.getElementById("nextBtn").addEventListener("click", () => {
  if (paginaAtual < totalPaginas) {
    paginaAtual++;
    localStorage.setItem("paginaAtual", paginaAtual); // salva página
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

function voltarCapa() {
  window.location.href = "capa.html";
}