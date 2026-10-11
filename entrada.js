
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


// Verificar se o produto está ativo
function produtoAtivo(produto) {
    return produto.ativo !== false;
}


// Calcular a quantidade disponível
function calcularEstoque(produto) {
    const inicial = Number(
        produto.estoqueInicial ?? produto.quantidade ?? 0
    );

    const totalEntradas =
        Number(produto.totalEntradas || 0);

    const totalSaidas =
        Number(produto.totalSaidas || 0);

    return inicial + totalEntradas - totalSaidas;
}


// Carregar apenas produtos ativos
function carregarProdutos() {

    produtoSelect.innerHTML = "";

    const opcaoInicial =
        document.createElement("option");

    opcaoInicial.value = "";
    opcaoInicial.textContent = "Selecione um produto";

    produtoSelect.appendChild(opcaoInicial);

    produtos.forEach(function(produto, index) {

        if (!produtoAtivo(produto)) {
            return;
        }

        const opcao =
            document.createElement("option");

        opcao.value = index;

        opcao.textContent =
            produto.nome + " - " + produto.codigo;

        produtoSelect.appendChild(opcao);

    });

}


// Registrar entrada
formulario.addEventListener("submit", function(event) {

    event.preventDefault();

    // Atualizar os dados antes de registrar
    produtos =
        JSON.parse(localStorage.getItem("produtos")) || [];

    entradas =
        JSON.parse(localStorage.getItem("entradas")) || [];

    const indiceProduto = produtoSelect.value;

    const quantidade = Number(
        document.querySelector("#quantidade").value
    );

    const data =
        document.querySelector("#data").value;

    if (
        indiceProduto === "" ||
        !Number.isFinite(quantidade) ||
        quantidade <= 0 ||
        data === ""
    ) {
        alert("Preencha todos os campos corretamente.");
        return;
    }

    const produto = produtos[Number(indiceProduto)];

    if (!produto) {
        alert("Produto não encontrado.");
        carregarProdutos();
        return;
    }

    if (!produtoAtivo(produto)) {
        alert(
            "Este produto está desativado e não pode " +
            "receber novas entradas."
        );

        carregarProdutos();
        return;
    }

    // Preservar a base de cálculo dos produtos antigos
    if (
        produto.estoqueInicial === undefined ||
        produto.estoqueInicial === null
    ) {
        const estoqueAtual =
            Number(produto.quantidade || 0);

        const entradasAnteriores =
            Number(produto.totalEntradas || 0);

        const saidasAnteriores =
            Number(produto.totalSaidas || 0);

        produto.estoqueInicial =
            estoqueAtual - entradasAnteriores + saidasAnteriores;
    }

    // Atualizar total de entradas
    produto.totalEntradas =
        Number(produto.totalEntradas || 0) + quantidade;

    // Atualizar campo de compatibilidade
    produto.quantidade = calcularEstoque(produto);

    // Registrar movimentação
    const entrada = {
        produto: produto.nome,
        codigo: produto.codigo,
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

    carregarProdutos();
    mostrarEntradas();

});


// Exibir histórico de entradas
function mostrarEntradas() {

    listaEntradas.innerHTML = "";

    entradas.forEach(function(entrada) {

        const linha =
            document.createElement("tr");

        const nome =
            document.createElement("td");

        const quantidade =
            document.createElement("td");

        const data =
            document.createElement("td");

        nome.textContent = entrada.produto;
        quantidade.textContent = entrada.quantidade;
        data.textContent = entrada.data;

        linha.appendChild(nome);
        linha.appendChild(quantidade);
        linha.appendChild(data);

        listaEntradas.appendChild(linha);

    });

}


// Iniciar página
carregarProdutos();
mostrarEntradas();
