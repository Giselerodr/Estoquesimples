
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


// Verificar se o produto está ativo
function produtoAtivo(produto) {
    return produto.ativo !== false;
}


// Calcular a quantidade disponível
function calcularEstoque(produto) {

    const estoqueInicial = Number(
        produto.estoqueInicial ??
        produto.quantidade ??
        0
    );

    const totalEntradas =
        Number(produto.totalEntradas || 0);

    const totalSaidas =
        Number(produto.totalSaidas || 0);

    return estoqueInicial +
           totalEntradas -
           totalSaidas;
}


// Carregar produtos ativos
function atualizarProdutos() {

    produtos =
        JSON.parse(localStorage.getItem("produtos")) || [];

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
            produto.nome +
            " - Estoque: " +
            calcularEstoque(produto);

        produtoSelect.appendChild(opcao);

    });

}


// Registrar saída
formulario.addEventListener("submit", function(event) {

    event.preventDefault();

    // Buscar os dados mais recentes
    produtos =
        JSON.parse(localStorage.getItem("produtos")) || [];

    saidas =
        JSON.parse(localStorage.getItem("saidas")) || [];

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
        atualizarProdutos();
        return;
    }

    if (!produtoAtivo(produto)) {

        alert(
            "Este produto está desativado e " +
            "não pode receber novas saídas."
        );

        atualizarProdutos();
        return;
    }

    // Preservar estoque inicial de produtos antigos
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
            estoqueAtual -
            entradasAnteriores +
            saidasAnteriores;

    }

    const estoqueAtual = calcularEstoque(produto);

    // Impedir estoque negativo
    if (quantidade > estoqueAtual) {

        alert(
            "Quantidade insuficiente em estoque. " +
            "Disponível: " + estoqueAtual
        );

        return;
    }

    // Atualizar total de saídas
    produto.totalSaidas =
        Number(produto.totalSaidas || 0) + quantidade;

    // Atualizar campo de compatibilidade
    produto.quantidade = calcularEstoque(produto);

    // Registrar movimentação
    const saida = {
        produto: produto.nome,
        codigo: produto.codigo,
        quantidade: quantidade,
        data: data
    };

    saidas.push(saida);

    // Salvar alterações
    localStorage.setItem(
        "produtos",
        JSON.stringify(produtos)
    );

    localStorage.setItem(
        "saidas",
        JSON.stringify(saidas)
    );

    alert("Saída registrada com sucesso!");

    formulario.reset();

    atualizarProdutos();
    mostrarSaidas();

});


// Mostrar histórico de saídas
function mostrarSaidas() {

    listaSaidas.innerHTML = "";

    saidas.forEach(function(saida) {

        const linha =
            document.createElement("tr");

        const nome =
            document.createElement("td");

        const quantidade =
            document.createElement("td");

        const data =
            document.createElement("td");

        nome.textContent = saida.produto;
        quantidade.textContent = saida.quantidade;
        data.textContent = saida.data;

        linha.appendChild(nome);
        linha.appendChild(quantidade);
        linha.appendChild(data);

        listaSaidas.appendChild(linha);

    });

}


// Iniciar página
atualizarProdutos();
mostrarSaidas();
