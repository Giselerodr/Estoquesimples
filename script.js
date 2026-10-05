const formulario = document.querySelector("form");
const listaProdutos = document.querySelector("#listaProdutos");
const listaAlertas = document.querySelector("#listaAlertas");

let produtos = JSON.parse(localStorage.getItem("produtos")) || [];

formulario.addEventListener("submit", function(event) {

    event.preventDefault();

    const nome = document.querySelector('input[name="nome"]').value;
    const categoria = document.querySelector('input[name="categoria"]').value;
    const codigo = document.querySelector('input[name="codigo"]').value;
    const quantidade = document.querySelector('input[name="quantidade"]').value;
    const estoqueMinimo = document.querySelector('input[name="estoqueMinimo"]').value;
    const validade = document.querySelector('input[name="validade"]').value;

    if (
        nome === "" ||
        categoria === "" ||
        codigo === "" ||
        quantidade === "" ||
        estoqueMinimo === "" ||
        validade === ""
    ) {
        alert("Preencha todos os campos.");
        return;
    }

    const produto = {

    nome: nome,

    categoria: categoria,

    codigo: codigo,

    quantidade: Number(quantidade),

    estoqueInicial: Number(quantidade),

    totalEntradas: 0,

    totalSaidas: 0,

    estoqueMinimo: Number(estoqueMinimo),

    validade: validade

};
    };

    produtos.push(produto);

    localStorage.setItem("produtos", JSON.stringify(produtos));

    alert("Produto cadastrado com sucesso!");

    formulario.reset();

    mostrarProdutos();
});

function mostrarProdutos() {

    listaProdutos.innerHTML = "";

    produtos.forEach(function(produto) {

        const linha = document.createElement("tr");

        const estoqueInicial =
            Number(produto.estoqueInicial || produto.quantidade);

        const entradas =
            Number(produto.totalEntradas || 0);

        const saidas =
            Number(produto.totalSaidas || 0);

        const quantidadeDisponivel =
            estoqueInicial + entradas - saidas;

        const estoqueMinimo =
            Number(produto.estoqueMinimo);

        let status = "";

        if (quantidadeDisponivel <= estoqueMinimo) {

            status = "Estoque baixo";

        } else {

            status = "Normal";

        }

        linha.innerHTML = `
            <td>${produto.nome}</td>

            <td>${produto.categoria}</td>

            <td>${estoqueInicial}</td>

            <td>${entradas}</td>

            <td>${saidas}</td>

            <td>${quantidadeDisponivel}</td>

            <td>${estoqueMinimo}</td>

            <td>${status}</td>

            <td>${produto.validade}</td>
        `;

        listaProdutos.appendChild(linha);

    });
}

mostrarProdutos();
