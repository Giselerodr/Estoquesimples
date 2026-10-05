// ==========================================
// ESTOQUE INTELIGENTE
// ==========================================


// Recupera os produtos salvos no navegador.
// Se ainda não existir nenhum produto,
// começa com uma lista vazia.
let produtos = JSON.parse(localStorage.getItem("produtos")) || [];


// ==========================================
// CADASTRAR PRODUTO
// ==========================================

function cadastrarProduto(event) {

    event.preventDefault();

    // Pega os valores digitados no formulário
    const nome = document.getElementById("nome").value;
    const categoria = document.getElementById("categoria").value;
    const codigo = document.getElementById("codigo").value;
    const quantidade = Number(document.getElementById("quantidade").value);
    const estoqueMinimo = Number(document.getElementById("estoqueMinimo").value);
    const validade = document.getElementById("validade").value;


    // Cria o produto
    const produto = {

        id: Date.now(),

        nome: nome,

        categoria: categoria,

        codigo: codigo,

        quantidade: quantidade,

        estoqueMinimo: estoqueMinimo,

        validade: validade

    };


    // Adiciona o produto à lista
    produtos.push(produto);


    // Salva no navegador
    localStorage.setItem(
        "produtos",
        JSON.stringify(produtos)
    );


    // Mensagem de confirmação
    alert("Produto cadastrado com sucesso!");


    // Limpa o formulário
    document.getElementById("formProduto").reset();


    // Atualiza a lista
    mostrarProdutos();
}


// ==========================================
// MOSTRAR PRODUTOS
// ==========================================

function mostrarProdutos() {

    const lista = document.getElementById("listaProdutos");


    // Se não existir essa área na página,
    // não faz nada.
    if (!lista) {
        return;
    }


    // Limpa a lista antes de mostrar novamente
    lista.innerHTML = "";


    // Se não houver produtos
    if (produtos.length === 0) {

        lista.innerHTML = "<p>Nenhum produto cadastrado.</p>";

        return;
    }


    // Percorre todos os produtos
    produtos.forEach(function(produto) {


        // Verifica o estoque
        let situacao;


        if (produto.quantidade <= produto.estoqueMinimo) {

            situacao = "ESTOQUE BAIXO";

        } else {

            situacao = "ESTOQUE NORMAL";

        }


        // Cria o bloco do produto
        const item = document.createElement("div");


        item.innerHTML = `

            <h3>${produto.nome}</h3>

            <p>
                <strong>Categoria:</strong>
                ${produto.categoria}
            </p>

            <p>
                <strong>Código:</strong>
                ${produto.codigo}
            </p>

            <p>
                <strong>Quantidade em estoque:</strong>
                ${produto.quantidade}
            </p>

            <p>
                <strong>Estoque mínimo:</strong>
                ${produto.estoqueMinimo}
            </p>

            <p>
                <strong>Validade:</strong>
                ${produto.validade || "Não informada"}
            </p>

            <p>
                <strong>Situação:</strong>
                ${situacao}
            </p>

            <hr>

        `;


        // Coloca o produto na página
        lista.appendChild(item);

    });

}


// ==========================================
// ENTRADA DE ESTOQUE
// ==========================================

function entradaEstoque(id, quantidade) {

    const produto = produtos.find(function(item) {

        return item.id === id;

    });


    if (!produto) {

        alert("Produto não encontrado.");

        return;

    }


    quantidade = Number(quantidade);


    if (quantidade <= 0) {

        alert("Informe uma quantidade válida.");

        return;

    }


    // Soma a quantidade que entrou
    produto.quantidade += quantidade;


    // Salva novamente
    localStorage.setItem(
        "produtos",
        JSON.stringify(produtos)
    );


    // Atualiza a tela
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


    if (quantidade <= 0) {

        alert("Informe uma quantidade válida.");

        return;

    }


    // Não permite retirar mais do que existe
    if (quantidade > produto.quantidade) {

        alert(
            "Não é possível realizar a saída. " +
            "A quantidade informada é maior que o estoque disponível."
        );

        return;

    }


    // Diminui a quantidade
    produto.quantidade -= quantidade;


    // Salva novamente
    localStorage.setItem(
        "produtos",
        JSON.stringify(produtos)
    );


    // Atualiza a tela
    mostrarProdutos();

}


// ==========================================
// INICIAR SISTEMA
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function() {


        // Localiza o formulário
        const formulario =
            document.getElementById("formProduto");


        // Quando clicar em cadastrar
        formulario.addEventListener(
            "submit",
            cadastrarProduto
        );


        // Mostra os produtos salvos
        mostrarProdutos();

    }
);
