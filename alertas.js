
"use strict";

function lerProdutos() {
    try {
        const dados = JSON.parse(
            localStorage.getItem("produtos") || "[]"
        );

        return Array.isArray(dados) ? dados : [];
    } catch (erro) {
        console.error("Erro ao ler produtos:", erro);
        return [];
    }
}

function numero(valor) {
    const resultado = Number(valor);
    return Number.isFinite(resultado) ? resultado : 0;
}

function quantidadeAtual(produto) {
    // Produtos recentes podem guardar o estoque inicial
    // e os totais de movimentações separadamente.
    if (produto.estoqueInicial !== undefined &&
        produto.estoqueInicial !== null) {

        return numero(produto.estoqueInicial)
            + numero(produto.totalEntradas)
            - numero(produto.totalSaidas);
    }

    // Para produtos antigos, a quantidade cadastrada
    // é utilizada diretamente, evitando somar duas
    // vezes as movimentações já aplicadas.
    return numero(produto.quantidade);
}

function converterData(valor) {
    if (!valor) return null;

    const texto = String(valor).trim();
    let ano, mes, dia;

    if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
        [ano, mes, dia] = texto.slice(0, 10)
            .split("-").map(Number);
    } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
        [dia, mes, ano] = texto.split("/").map(Number);
    } else {
        return null;
    }

    const data = new Date(ano, mes - 1, dia);

    if (data.getFullYear() !== ano ||
        data.getMonth() !== mes - 1 ||
        data.getDate() !== dia) {
        return null;
    }

    data.setHours(0, 0, 0, 0);
    return data;
}

function formatarData(valor) {
    const data = converterData(valor);

    return data
        ? data.toLocaleDateString("pt-BR")
        : "Não informada";
}

function analisarProduto(produto) {
    const quantidade = quantidadeAtual(produto);
    const minimo = numero(produto.estoqueMinimo);

    const estoqueBaixo = quantidade <= minimo;
    const reposicao = Math.max(0, minimo - quantidade);

    const validade = converterData(produto.validade);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 30);

    const vencido = Boolean(
        validade && validade < hoje
    );

    const proximo = Boolean(
        validade &&
        validade >= hoje &&
        validade <= limite
    );

    const situacoes = [];

    if (vencido) {
        situacoes.push("Vencido");
    } else if (proximo) {
        situacoes.push("Próximo do vencimento");
    }

    if (estoqueBaixo) {
        situacoes.push("Estoque baixo");
    }

    if (situacoes.length === 0) {
        situacoes.push("Normal");
    }

    return {
        ...produto,
        quantidadeAtual: quantidade,
        minimoCalculado: minimo,
        reposicao,
        estoqueBaixo,
        vencido,
        proximo,
        possuiAlerta: estoqueBaixo || vencido || proximo,
        situacoes
    };
}

function obterAnalises() {
    return lerProdutos()
        .filter(produto => produto && produto.ativo !== false)
        .map(analisarProduto);
}

function atualizarIndicadores(produtos) {
    document.getElementById("totalBaixo").textContent =
        produtos.filter(p => p.estoqueBaixo).length;

    document.getElementById("totalVencidos").textContent =
        produtos.filter(p => p.vencido).length;

    document.getElementById("totalProximos").textContent =
        produtos.filter(p => p.proximo).length;

    document.getElementById("totalAlertas").textContent =
        produtos.filter(p => p.possuiAlerta).length;
}

function obterFiltrados(produtos) {
    const pesquisa = document.getElementById("pesquisa")
        .value.trim().toLowerCase();

    const filtro = document.getElementById("filtroSituacao")
        .value;

    return produtos.filter(produto => {
        const texto = [
            produto.nome,
            produto.codigo,
            produto.categoria
        ].join(" ").toLowerCase();

        if (!texto.includes(pesquisa)) return false;

        if (filtro === "baixo") return produto.estoqueBaixo;
        if (filtro === "vencido") return produto.vencido;
        if (filtro === "proximo") return produto.proximo;
        if (filtro === "normal") return !produto.possuiAlerta;

        return true;
    });
}

function criarCelula(linha, texto) {
    const celula = document.createElement("td");
    celula.textContent = String(texto);
    linha.appendChild(celula);
    return celula;
}

function preencherTabela(produtos) {
    const tabela = document.getElementById("tabelaAlertas");
    tabela.replaceChildren();

    if (produtos.length === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = 7;
        celula.textContent = "Nenhum produto encontrado.";
        linha.appendChild(celula);
        tabela.appendChild(linha);
        return;
    }

    produtos.forEach(produto => {
        const linha = document.createElement("tr");

        criarCelula(linha, produto.nome || "Sem nome");
        criarCelula(linha, produto.codigo || "-");
        criarCelula(linha, produto.quantidadeAtual);
        criarCelula(linha, produto.minimoCalculado);
        criarCelula(linha, formatarData(produto.validade));
        criarCelula(linha, produto.reposicao);

        const celula = document.createElement("td");
        const etiqueta = document.createElement("span");

        etiqueta.className = "situacao";

        if (produto.vencido) {
            etiqueta.classList.add("critico");
        } else if (produto.possuiAlerta) {
            etiqueta.classList.add("atencao");
        } else {
            etiqueta.classList.add("normal");
        }

        etiqueta.textContent = produto.situacoes.join(" | ");
        celula.appendChild(etiqueta);
        linha.appendChild(celula);

        tabela.appendChild(linha);
    });
}

function atualizarPagina() {
    const produtos = obterAnalises();

    atualizarIndicadores(produtos);
    preencherTabela(obterFiltrados(produtos));
}

function protegerCSV(valor) {
    let texto = String(valor ?? "");

    // Evita que valores iniciados por fórmulas
    // sejam interpretados como comandos na planilha.
    if (/^[\s]*[=+\-@\t\r]/.test(texto)) {
        texto = "'" + texto;
    }

    return '"' + texto.replace(/"/g, '""') + '"';
}

function exportarCSV() {
    const produtos = obterFiltrados(obterAnalises());

    const linhas = [
        [
            "Produto",
            "Categoria",
            "Código",
            "Quantidade",
            "Estoque mínimo",
            "Validade",
            "Reposição sugerida",
            "Situação"
        ]
    ];

    produtos.forEach(produto => {
        linhas.push([
            produto.nome || "",
            produto.categoria || "",
            produto.codigo || "",
            produto.quantidadeAtual,
            produto.minimoCalculado,
            formatarData(produto.validade),
            produto.reposicao,
            produto.situacoes.join(" | ")
        ]);
    });

    const conteudo = linhas
        .map(linha => linha.map(protegerCSV).join(";"))
        .join("\r\n");

    const arquivo = new Blob(
        ["\uFEFF" + conteudo],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");

    link.href = url;
    link.download = "alertas_estoque.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

document.getElementById("pesquisa")
    .addEventListener("input", atualizarPagina);

document.getElementById("filtroSituacao")
    .addEventListener("change", atualizarPagina);

document.getElementById("exportarCSV")
    .addEventListener("click", exportarCSV);

window.addEventListener("pageshow", atualizarPagina);

atualizarPagina();
