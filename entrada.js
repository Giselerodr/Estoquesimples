let produtos =
    JSON.parse(localStorage.getItem("produtos")) || [];


const produtoSelect =
    document.querySelector("#produto");


const formulario =
    document.querySelector("#formEntrada");


const listaEntradas =
    document.querySelector("#listaEntradas");


let entradas =
    JSON.parse(localStorage.getItem("entradas")) || [];


produtos.forEach(function(produto, index) {

    const opcao =
        document.createElement("option");


    opcao.value = index;


    opcao.textContent =
        produto.nome;


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


    produto.totalEntradas =
        Number(produto.totalEntradas || 0) + quantidade;


    produto.quantidade =
        Number(produto.quantidade || 0) + quantidade;


    const entrada = {

        produto: produto.nome,

        quantidade: quantidade,

        data: data

    };


    entradas.push(entrada);


    localStorage.setItem(
        "produtos",
        JSON.stringify(produtos)
    );


    localStorage.setItem(
        "entradas",
        JSON.stringify(entradas)
    );


    alert("Entrada registrada com sucesso!");


    formulario.reset();


    mostrarEntradas();

});


function mostrarEntradas() {

    listaEntradas.innerHTML = "";


    entradas.forEach(function(entrada) {

        const linha =
            document.createElement("tr");


        linha.innerHTML = `

            <td>${entrada.produto}</td>

            <td>${entrada.quantidade}</td>

            <td>${entrada.data}</td>

        `;


        listaEntradas.appendChild(linha);

    });

}


mostrarEntradas();
