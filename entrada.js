
"use strict";

const produtoSelect = document.querySelector("#produto");
const formulario = document.querySelector("#formEntrada");
const listaEntradas = document.querySelector("#listaEntradas");
const situacaoProduto = document.querySelector("#situacaoProduto");

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

function estoqueAtual(produto) {
    return arredondar(
        numero(produto.estoqueInicial ?? produto.quantidade) +
        numero(produto.totalEntradas) -
        numero(produto.totalSaidas)
    );
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

function carregarProdutos() {
    const produtos = lerLista("produtos");

    produtoSelect.innerHTML =
        '<option value="">Selecione um produto</option>';

    produtos.forEach((produto, indice) => {
        if (produto.ativo === false) return;

        const opcao = document.createElement("option");
        opcao.value = indice;
        opcao.textContent =
            produto.nome + " - " + produto.codigo;
        produtoSelect.appendChild(opcao);
    });

    situacaoProduto.textContent = "";
}

function mostrarSituacao() {
    try {
        const produtos = lerLista("produtos");
        const lotes = lerLista("lotes");
        const produto = produtos[Number(produtoSelect.value)];

        if (produtoSelect.value === "" || !produto) {
            situacaoProduto.textContent = "";
            return;
        }

        const conferencia = conferirLotes(produto, lotes);

        situacaoProduto.textContent =
            "Estoque principal: " + conferencia.saldo +
            " | Total nos lotes: " + conferencia.total +
            (conferencia.correto
                ? " | Saldos conferidos."
                : " | ATENÇÃO: saldos divergentes. Corrija antes de registrar.");
    } catch (erro) {
        situacaoProduto.textContent = erro.message;
    }
}

formulario.addEventListener("submit", function(evento) {
    evento.preventDefault();

    try {
        const produtos = lerLista("produtos");
        const entradas = lerLista("entradas");
        const lotes = lerLista("lotes");

        const indice = Number(produtoSelect.value);
        const produto = produtos[indice];

        const quantidade = Number(
            document.querySelector("#quantidade").value
        );
        const data = document.querySelector("#data").value;
        const codigoLote =
            document.querySelector("#codigoLote").value.trim();
        const validade =
            document.querySelector("#validade").value;

        if (
            produtoSelect.value === "" ||
            !produto ||
            produto.ativo === false ||
            !Number.isFinite(quantidade) ||
            quantidade <= 0 ||
            Math.abs(quantidade * 1000 -
                Math.round(quantidade * 1000)) > 0.000001 ||
            !dataValida(data) ||
            !dataValida(validade) ||
            !codigoLote
        ) {
            alert("Preencha todos os campos corretamente.");
            return;
        }

        if (validade < data) {
            alert("A validade não pode ser anterior à entrada.");
            return;
        }

        const conferencia = conferirLotes(produto, lotes);

        if (!conferencia.correto) {
            alert(
                "Entrada bloqueada: o estoque principal possui " +
                conferencia.saldo + " unidade(s), mas os lotes " +
                "somam " + conferencia.total + ".\n\n" +
                "Confira os lotes existentes antes de continuar."
            );
            return;
        }

        const loteExistente = lotes.find(lote =>
            normalizar(lote.codigoProduto) ===
                normalizar(produto.codigo) &&
            normalizar(lote.codigoLote) ===
                normalizar(codigoLote)
        );

        if (loteExistente) {
            if (loteExistente.validade !== validade) {
                alert(
                    "Esse lote já existe com outra validade. " +
                    "Confira os dados informados."
                );
                return;
            }

            loteExistente.quantidade = arredondar(
                numero(loteExistente.quantidade) + quantidade
            );
        } else {
            lotes.push({
                id: "lote-" + Date.now() + "-" +
                    Math.random().toString(36).slice(2, 9),
                codigoProduto: produto.codigo,
                nomeProduto: produto.nome,
                codigoLote: codigoLote,
                quantidade: quantidade,
                dataEntrada: data,
                validade: validade,
                criadoEm: new Date().toISOString()
            });
        }

        if (produto.estoqueInicial == null) {
            produto.estoqueInicial =
                numero(produto.quantidade) -
                numero(produto.totalEntradas) +
                numero(produto.totalSaidas);
        }

        produto.totalEntradas = arredondar(
            numero(produto.totalEntradas) + quantidade
        );

        produto.quantidade = estoqueAtual(produto);

        entradas.push({
            produto: produto.nome,
            codigo: produto.codigo,
            codigoLote: loteExistente
                ? loteExistente.codigoLote
                : codigoLote,
            quantidade: quantidade,
            data: data
        });

        salvarConjunto({
            produtos: produtos,
            entradas: entradas,
            lotes: lotes
        });

        alert("Entrada e lote atualizados com sucesso!");
        formulario.reset();
        carregarProdutos();
        mostrarEntradas();

    } catch (erro) {
        alert("Não foi possível registrar a entrada: " + erro.message);
    }
});

function mostrarEntradas() {
    listaEntradas.innerHTML = "";

    lerLista("entradas").forEach(entrada => {
        const linha = document.createElement("tr");

        [
            entrada.produto,
            entrada.codigoLote || "Não informado",
            entrada.quantidade,
            entrada.data
        ].forEach(valor => {
            const celula = document.createElement("td");
            celula.textContent = valor ?? "";
            linha.appendChild(celula);
        });

        listaEntradas.appendChild(linha);
    });
}

produtoSelect.addEventListener("change", mostrarSituacao);

try {
    carregarProdutos();
    mostrarEntradas();
} catch (erro) {
    alert("Erro ao carregar a página: " + erro.message);
}
