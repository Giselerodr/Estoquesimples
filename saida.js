const produtos = JSON.parse(localStorage.getItem("produtos")) || [];

const produtoSelect = document.querySelector("#produto");

const formulario = document.querySelector("#formSaida");

const listaSaidas = document.querySelector("#listaSaidas");

let saidas = JSON.parse(localStorage.getItem("saidas")) || [];


// Mostrar produtos no campo de seleção

produtos.forEach(function(produto, index) {

    const opcao = document.createElement("option");

    opcao.value = index;

    opcao.textContent =
        produto.nome + " - Estoque: " + produto.quantidade;

    produtoSelect.appendChild(opcao);

});


// Registrar saída

formulario.addEventListener("submit", function(event) {

    event.preventDefault();


    const indiceProduto = produtoSelect.value;

    const quantidade = Number(
        document.querySelector("#quantidade").value
    );

    const data =
        document.querySelector("#data").value;


    // Verificar se os campos foram preenchidos

    if (
        indiceProduto === "" ||
        quantidade <= 0 ||
        data === ""
    ) {

        alert("Preencha todos os campos.");

        return;

    }


    const produto = produtos[indiceProduto];


    // Verificar se existe estoque suficiente

    if (quantidade > Number(produto.quantidade)) {

        alert(
            "Quantidade insuficiente em estoque."
        );

        return;

    }


    // Diminuir quantidade do estoque

    produto.quantidade =
        Number(produto.quantidade) - quantidade;


    // Criar registro da saída

    const saida = {

        produto: produto.nome,

        quantidade: quantidade,

        data: data

    };


    // Adicionar saída ao histórico

    saidas.push(saida);


    // Salvar produtos atualizados

    localStorage.setItem(
        "produtos",
        JSON.stringify(produtos)
    );


    // Salvar histórico de saídas

    localStorage.setItem(
        "saidas",
        JSON.stringify(saidas)
    );


    alert(
        "Saída registrada com sucesso!"
    );


    formulario.reset();


    mostrarSaidas();

});


// Mostrar histórico de saídas

function mostrarSaidas() {

    listaSaidas.innerHTML = "";


    saidas.forEach(function(saida) {

        const linha =
            document.createElement("tr");


        linha.innerHTML = `

            <td>${saida.produto}</td>

            <td>${saida.quantidade}</td>

            <td>${saida.data}</td>

        `;


        listaSaidas.appendChild(linha);

    });

}


mostrarSaidas();
