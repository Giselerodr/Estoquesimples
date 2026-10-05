const formulario = document.querySelector("form");
const listaProdutos = document.querySelector("#listaProdutos");

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
        quantidade: quantidade,
        estoqueMinimo: estoqueMinimo,
        validade: validade
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

        linha.innerHTML = `
            <td>${produto.nome}</td>
            <td>${produto.categoria}</td>
            <td>${produto.codigo}</td>
            <td>${produto.quantidade}</td>
            <td>${produto.estoqueMinimo}</td>
            <td>${produto.validade}</td>
        `;

        listaProdutos.appendChild(linha);
    });
}

mostrarProdutos();
