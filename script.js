// ==========================================
// ESTOQUE INTELIGENTE
// Controle de produtos e quantidade em estoque
// ==========================================


// Pega os produtos que já estão salvos
let produtos = JSON.parse(localStorage.getItem("produtos")) || [];


// ==========================================
// CADASTRAR PRODUTO
// ==========================================

function cadastrarProduto(event) {

    event.preventDefault();

    const nome = document.querySelector('[name="nome"]').value;
    const categoria = document.querySelector('[name="categoria"]').value;
    const codigo = document.querySelector('[name="codigo"]').value;
    const quantidade = Number(document.querySelector('[name="quantidade"]').value);
    const estoqueMinimo = Number(document.querySelector('[name="estoqueMinimo"]').value);
    const validade = document.querySelector('[name="validade"]').value;


    const produto = {
        id: Date.now(),
        nome: nome,
        categoria: categoria,
        codigo: codigo,
        quantidade: quantidade,
        estoqueMinimo: estoqueMinimo,
        validade: validade
    };


    produtos.push(produto);


    // Salva os produtos no navegador
    localStorage.setItem("produtos", JSON.stringify(produtos));


    alert("Produto cadastrado com sucesso!");


    // Limpa o formulário
    document.querySelector("form").reset();
}


// ==========================================
// MOSTRAR PRODUTOS
// ==========================================

function mostrarProdutos() {

    const lista = document.getElementById("listaProdutos");

    if (!lista) {
        return;
    }


    lista.innerHTML = "";


    produtos.forEach(function(produto) {

        let situacao = "";

        if (produto.quantidade <= produto.estoqueMinimo) {
            situacao = "ESTOQUE BAIXO";
        } else {
            situacao = "ESTOQUE NORMAL";
        }


        const item = document.createElement("div");

        item.innerHTML = `
            <h3>${produto.nome}</h3>

            <p>Categoria: ${produto.categoria}</p>

            <p>Código: ${produto.codigo}</p>

            <p>
                <strong>Quantidade em estoque:</strong>
                ${produto.quantidade}
            </p>

            <p>
                Estoque mínimo:
                ${produto.estoqueMinimo}
            </p>

            <p>
                Situação:
                <strong>${situacao}</strong>
            </p>

            <hr>
        `;


        lista.appendChild(item);
    });
}


// ==========================================
// ALTERAR QUANTIDADE DO ESTOQUE
// ==========================================

function entradaEstoque(id, quantidade) {

    const produto = produtos.find(function(item) {
        return item.id === id;
    });


    if (!produto) {
        alert("Produto não encontrado.");
        return;
    }


    produto.quantidade += Number(quantidade);


    localStorage.setItem("produtos", JSON.stringify(produtos));


    mostrarProdutos();
}


// ==========================================
// SAÍDA DE ESTOQUE
// ==========================================

function saidaEstoque(id, quantidade) {

    const produto = produtos.find(function(item) {
        return item.id === id;
    });


    if (!produto) {
        alert("Produto não encontrado.");
        return;
    }


    quantidade = Number(quantidade);


    // Não permite retirar mais do que existe
    if (quantidade > produto.quantidade) {

        alert("A quantidade de saída é maior que o estoque disponível.");

        return;
    }


    produto.quantidade -= quantidade;


    localStorage.setItem("produtos", JSON.stringify(produtos));


    mostrarProdutos();
}


// ==========================================
// INICIAR SISTEMA
// ==========================================

document.addEventListener("DOMContentLoaded", function() {

    const formulario = document.querySelector("form");


    if (formulario) {

        formulario.addEventListener(
            "submit",
            cadastrarProduto
        );

    }


    mostrarProdutos();

});
