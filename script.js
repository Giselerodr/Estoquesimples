const formulario = document.querySelector("form");

const listaProdutos = document.querySelector("#listaProdutos");

const listaAlertas = document.querySelector("#listaAlertas");

const listaValidades = document.querySelector("#listaValidades");

let produtos = JSON.parse(localStorage.getItem("produtos")) || [];


formulario.addEventListener("submit", function(event) {

    event.preventDefault();

    const nome =
        document.querySelector('input[name="nome"]').value;

    const categoria =
        document.querySelector('input[name="categoria"]').value;

    const codigo =
        document.querySelector('input[name="codigo"]').value;

    const quantidade =
        document.querySelector('input[name="quantidade"]').value;

    const estoqueMinimo =
        document.querySelector('input[name="estoqueMinimo"]').value;

    const validade =
        document.querySelector('input[name="validade"]').value;


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


    produtos.push(produto);


    localStorage.setItem(
        "produtos",
        JSON.stringify(produtos)
    );


    alert("Produto cadastrado com sucesso!");


    formulario.reset();


    mostrarProdutos();

    mostrarAlertas();

    mostrarValidades();

});


function calcularQuantidadeDisponivel(produto) {

    const estoqueInicial =
        Number(produto.estoqueInicial || produto.quantidade || 0);

    const entradas =
        Number(produto.totalEntradas || 0);

    const saidas =
        Number(produto.totalSaidas || 0);

    return estoqueInicial + entradas - saidas;
}


function mostrarProdutos() {

    listaProdutos.innerHTML = "";


    produtos.forEach(function(produto) {

        const linha = document.createElement("tr");


        const estoqueInicial =
            Number(produto.estoqueInicial || produto.quantidade || 0);


        const entradas =
            Number(produto.totalEntradas || 0);


        const saidas =
            Number(produto.totalSaidas || 0);


        const quantidadeDisponivel =
            calcularQuantidadeDisponivel(produto);


        const estoqueMinimo =
            Number(produto.estoqueMinimo || 0);


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


function mostrarAlertas() {

    listaAlertas.innerHTML = "";


    produtos.forEach(function(produto) {

        const quantidadeDisponivel =
            calcularQuantidadeDisponivel(produto);


        const estoqueMinimo =
            Number(produto.estoqueMinimo || 0);


        if (quantidadeDisponivel <= estoqueMinimo) {

            const linha =
                document.createElement("tr");


            linha.innerHTML = `

                <td>${produto.nome}</td>

                <td>${quantidadeDisponivel}</td>

                <td>${estoqueMinimo}</td>

                <td>Necessário repor estoque</td>

            `;


            listaAlertas.appendChild(linha);

        }

    });

}


function mostrarValidades() {

    listaValidades.innerHTML = "";


    const hoje = new Date();


    produtos.forEach(function(produto) {

        if (!produto.validade) {

            return;

        }


        const dataValidade =
            new Date(produto.validade + "T00:00:00");


        const diferenca =
            dataValidade - hoje;


        const diasRestantes =
            Math.ceil(
                diferenca / (1000 * 60 * 60 * 24)
            );


        if (
            diasRestantes >= 0 &&
            diasRestantes <= 7
        ) {

            const linha =
                document.createElement("tr");


            linha.innerHTML = `

                <td>${produto.nome}</td>

                <td>${produto.validade}</td>

                <td>Próximo do vencimento</td>

            `;


            listaValidades.appendChild(linha);

        }

    });

}


mostrarProdutos();

mostrarAlertas();

mostrarValidades();
