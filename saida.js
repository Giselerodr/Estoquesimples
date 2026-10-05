let produtos =
    JSON.parse(localStorage.getItem("produtos")) || [];


const produtoSelect =
    document.querySelector("#produto");


const formulario =
    document.querySelector("#formSaida");


const listaSaidas =
    document.querySelector("#listaSaidas");


let saidas =
    JSON.parse(localStorage.getItem("saidas")) || [];


produtos.forEach(function(produto, index) {

    const opcao =
        document.createElement("option");


    opcao.value = index;


    opcao.textContent =
        produto.nome +
        " - Estoque: " +
        calcularEstoque(produto);


    produtoSelect.appendChild(opcao);

});


formulario.addEventListener("submit", function(event) {

    event.preventDefault();


    const indiceProduto =
        produtoSelect.value;


    const quantidade =
        Number(
            document.querySelector("#quantidade").value
        );


    const data =
        document.querySelector("#data").value;


    if (
        indiceProduto === "" ||
        quantidade <= 0 ||
        data === ""
    ) {

        alert("Preencha todos os campos.");

        return;

    }


    const produto =
        produtos[indiceProduto];


    const estoqueAtual =
        calcularEstoque(produto);


    if (quantidade > estoqueAtual) {

        alert(
            "Quantidade insuficiente em estoque."
        );

        return;

    }


    produto.totalSaidas =
        Number(produto.totalSaidas || 0) + quantidade;


    produto.quantidade =
        estoqueAtual - quantidade;


    const saida = {

        produto: produto.nome,

        quantidade: quantidade,

        data: data

    };


    saidas.push(saida);


    localStorage.setItem(
        "produtos",
        JSON.stringify(produtos)
    );


    localStorage.setItem(
        "saidas",
        JSON.stringify(saidas)
    );


    alert(
        "Saída registrada com sucesso!"
    );


    formulario.reset();


    atualizarProdutos();


    mostrarSaidas();

});


function calcularEstoque(produto) {

    const estoqueInicial =
        Number(
            produto.estoqueInicial ||
            produto.quantidade ||
            0
        );


    const entradas =
        Number(produto.totalEntradas || 0);


    const saidasRegistradas =
        Number(produto.totalSaidas || 0);


    return estoqueInicial +
           entradas -
           saidasRegistradas;

}


function atualizarProdutos() {

    produtos =
        JSON.parse(
            localStorage.getItem("produtos")
        ) || [];


    produtoSelect.innerHTML = `
        <option value="">
            Selecione um produto
        </option>
    `;


    produtos.forEach(function(produto, index) {

        const opcao =
            document.createElement("option");


        opcao.value = index;


        opcao.textContent =
            produto.nome +
            " - Estoque: " +
            calcularEstoque(produto);


        produtoSelect.appendChild(opcao);

    });

}


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
