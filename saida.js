
"use strict";

const produtoSelect = document.querySelector("#produto");
const formulario = document.querySelector("#formSaida");
const listaSaidas = document.querySelector("#listaSaidas");
const situacaoProduto = document.querySelector("#situacaoProduto");
const previaLotes = document.querySelector("#previaLotes");
const campoQuantidade = document.querySelector("#quantidade");
const campoData = document.querySelector("#data");

function lerLista(chave) {
    const dados = JSON.parse(localStorage.getItem(chave) || "[]");
    if (!Array.isArray(dados)) {
        throw new Error("Dados inválidos: " + chave);
    }
    return dados;
}

function numero(valor) {
    return Number(valor ?? 0);
}

function arredondar(valor) {
    return Math.round((valor + Number.EPSILON) * 1000) / 1000;
}

function normalizar(valor) {
    return String(valor ?? "").trim().toLowerCase();
}

function dataValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const data = new Date(valor + "T12:00:00");
    return !Number.isNaN(data.getTime()) &&
        data.getFullYear() === Number(valor.slice(0, 4)) &&
        data.getMonth() + 1 === Number(valor.slice(5, 7)) &&
        data.getDate() === Number(valor.slice(8, 10));
}

function hojeLocal() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return ano + "-" + mes + "-" + dia;
}

function estoqueAtual(produto) {
    return arredondar(
        numero(produto.estoqueInicial ?? produto.quantidade) +
        numero(produto.totalEntradas) -
        numero(produto.totalSaidas)
    );
}

function conferirLotes(produto, lotes) {
    const saldo = estoqueAtual(produto);

    const lotesProduto = lotes.filter(lote =>
        normalizar(lote.codigoProduto) ===
        normalizar(produto.codigo)
    );

    const total = arredondar(
        lotesProduto.reduce(
            (soma, lote) => soma + numero(lote.quantidade), 0
        )
    );

    return {
        saldo,
        total,
        correto: Number.isFinite(saldo) &&
            saldo >= 0 &&
            lotesProduto.every(lote =>
                Number.isFinite(numero(lote.quantidade)) &&
                numero(lote.quantidade) >= 0
            ) &&
            Math.abs(saldo - total) < 0.0005
    };
}

function selecionarLotes(lotes, codigoProduto, quantidade, data) {
    if (!dataValida(data)) {
        throw new Error("Informe uma data válida.");
    }

    if (!Number.isFinite(quantidade) || quantidade <= 0) {
        throw new Error("Informe uma quantidade válida.");
    }

    const disponiveis = lotes
        .filter(lote =>
            normalizar(lote.codigoProduto) ===
                normalizar(codigoProduto) &&
            numero(lote.quantidade) > 0 &&
            dataValida(lote.validade) &&
            lote.validade >= data
        )
        .sort((a, b) =>
            a.validade.localeCompare(b.validade) ||
            String(a.dataEntrada || "").localeCompare(
                String(b.dataEntrada || "")
            )
        );

    let restante = quantidade;
    const retiradas = [];

    for (const lote of disponiveis) {
        if (restante <= 0) break;

        const retirar = arredondar(
            Math.min(restante, numero(lote.quantidade))
        );

        if (retirar > 0) {
            retiradas.push({
                id: lote.id,
                codigoLote: lote.codigoLote,
                quantidade: retirar,
                validade: lote.validade
            });

            restante = arredondar(restante - retirar);
        }
    }

    if (restante > 0.0005) {
        throw new Error(
            "Quantidade insuficiente nos lotes não vencidos. " +
            "Faltam " + restante + " unidade(s)."
        );
    }

    return retiradas;
}

function salvarConjunto(alteracoes) {
    const anteriores = {};

    for (const chave of Object.keys(alteracoes)) {
        anteriores[chave] = localStorage.getItem(chave);
    }

    try {
        for (const [chave, valor] of Object.entries(alteracoes)) {
            localStorage.setItem(chave, JSON.stringify(valor));
        }
    } catch (erro) {
        for (const [chave, valor] of Object.entries(anteriores)) {
            if (valor === null) {
                localStorage.removeItem(chave);
            } else {
                localStorage.setItem(chave, valor);
            }
        }
        throw erro;
    }
}

function atualizarProdutos() {
    const produtos = lerLista("produtos");

    produtoSelect.innerHTML =
        '<option value="">Selecione um produto</option>';

    produtos.forEach((produto, indice) => {
        if (produto.ativo === false) return;

        const opcao = document.createElement("option");
        opcao.value = indice;
        opcao.textContent =
            produto.nome + " - Estoque: " + estoqueAtual(produto);
        produtoSelect.appendChild(opcao);
    });

    situacaoProduto.textContent = "";
    previaLotes.textContent =
        "Selecione um produto e informe a quantidade.";
}

function mostrarPrevia() {
    try {
        const produtos = lerLista("produtos");
        const lotes = lerLista("lotes");

        if (produtoSelect.value === "") {
            situacaoProduto.textContent = "";
            previaLotes.textContent = "Selecione um produto.";
            return;
        }

        const produto = produtos[Number(produtoSelect.value)];

        if (!produto) {
            previaLotes.textContent = "Produto não encontrado.";
            return;
        }

        const conferencia = conferirLotes(produto, lotes);

        situacaoProduto.textContent =
            "Estoque principal: " + conferencia.saldo +
            " | Total nos lotes: " + conferencia.total;

        if (!conferencia.correto) {
            previaLotes.textContent =
                "Saldos divergentes. Confira os lotes antes " +
                "de registrar uma saída.";
            return;
        }

        const quantidade = Number(campoQuantidade.value);
        const data = campoData.value;

        if (!campoQuantidade.value || !data) {
            previaLotes.textContent =
                "Informe a quantidade e a data da saída.";
            return;
        }

        if (
            !Number.isFinite(quantidade) ||
            quantidade <= 0 ||
            Math.abs(quantidade * 1000 -
                Math.round(quantidade * 1000)) > 0.000001
        ) {
            previaLotes.textContent = "Quantidade inválida.";
            return;
        }

        if (quantidade > conferencia.saldo) {
            previaLotes.textContent =
                "Quantidade superior ao estoque principal.";
            return;
        }

        const retiradas = selecionarLotes(
            lotes, produto.codigo, quantidade, data
        );

        previaLotes.textContent = retiradas.map(item =>
            item.codigoLote + ": " + item.quantidade +
            " unidade(s), validade " + item.validade
        ).join(" | ");

    } catch (erro) {
        previaLotes.textContent = erro.message;
    }
}

formulario.addEventListener("submit", function(evento) {
    evento.preventDefault();

    try {
        const produtos = lerLista("produtos");
        const saidas = lerLista("saidas");
        const lotes = lerLista("lotes");

        if (produtoSelect.value === "") {
            alert("Selecione um produto.");
            return;
        }

        const produto = produtos[Number(produtoSelect.value)];
        const quantidade = Number(campoQuantidade.value);
        const data = campoData.value;

        if (
            !produto ||
            produto.ativo === false ||
            !Number.isFinite(quantidade) ||
            quantidade <= 0 ||
            Math.abs(quantidade * 1000 -
                Math.round(quantidade * 1000)) > 0.000001 ||
            !dataValida(data)
        ) {
            alert("Preencha os campos corretamente.");
            return;
        }

        if (data < hojeLocal()) {
            alert(
                "A data da saída não pode ser anterior à data " +
                "atual nesta versão do controle por lotes."
            );
            return;
        }

        const conferencia = conferirLotes(produto, lotes);

        if (!conferencia.correto) {
            alert(
                "Saída bloqueada: estoque principal = " +
                conferencia.saldo + ", total dos lotes = " +
                conferencia.total + ". Confira os saldos."
            );
            return;
        }

        if (quantidade > conferencia.saldo) {
            alert(
                "Estoque insuficiente. Disponível: " +
                conferencia.saldo
            );
            return;
        }

        const retiradas = selecionarLotes(
            lotes, produto.codigo, quantidade, data
        );

        for (const retirada of retiradas) {
            const lote = lotes.find(item =>
                item.id === retirada.id
            );

            if (!lote) {
                throw new Error("Lote não encontrado.");
            }

            lote.quantidade = arredondar(
                numero(lote.quantidade) - retirada.quantidade
            );
        }

        if (produto.estoqueInicial == null) {
            produto.estoqueInicial =
                numero(produto.quantidade) -
                numero(produto.totalEntradas) +
                numero(produto.totalSaidas);
        }

        produto.totalSaidas = arredondar(
            numero(produto.totalSaidas) + quantidade
        );

        produto.quantidade = estoqueAtual(produto);

        saidas.push({
            produto: produto.nome,
            codigo: produto.codigo,
            quantidade: quantidade,
            data: data,
            codigoLote: retiradas
                .map(item => item.codigoLote).join(", "),
            lotesUtilizados: retiradas
        });

        salvarConjunto({
            produtos: produtos,
            saidas: saidas,
            lotes: lotes
        });

        alert("Saída registrada e lotes atualizados!");

        formulario.reset();
        atualizarProdutos();
        mostrarSaidas();

    } catch (erro) {
        alert("Não foi possível registrar a saída: " + erro.message);
    }
});

function mostrarSaidas() {
    listaSaidas.innerHTML = "";

    lerLista("saidas").forEach(saida => {
        const linha = document.createElement("tr");

        [
            saida.produto,
            saida.codigoLote || "Não informado",
            saida.quantidade,
            saida.data
        ].forEach(valor => {
            const celula = document.createElement("td");
            celula.textContent = valor ?? "";
            linha.appendChild(celula);
        });

        listaSaidas.appendChild(linha);
    });
}

produtoSelect.addEventListener("change", mostrarPrevia);
campoQuantidade.addEventListener("input", mostrarPrevia);
campoData.addEventListener("change", mostrarPrevia);

try {
    atualizarProdutos();
    mostrarSaidas();
} catch (erro) {
    alert("Erro ao carregar a página: " + erro.message);
}
