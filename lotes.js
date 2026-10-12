
"use strict";

const $ = id => document.getElementById(id);

function lerLista(chave) {
    const texto = localStorage.getItem(chave);
    if (texto === null) return [];

    const dados = JSON.parse(texto);

    if (!Array.isArray(dados)) {
        throw new Error("Dados inválidos em " + chave);
    }

    return dados;
}

function codigoNormalizado(valor) {
    return String(valor ?? "").trim().toLowerCase();
}

function numero(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
}

function formatarNumero(valor) {
    return numero(valor).toLocaleString("pt-BR", {
        maximumFractionDigits: 3
    });
}

function dataValida(texto) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return null;
    }

    const [ano, mes, dia] = texto.split("-").map(Number);
    const data = new Date(ano, mes - 1, dia);

    if (
        data.getFullYear() !== ano ||
        data.getMonth() !== mes - 1 ||
        data.getDate() !== dia
    ) {
        return null;
    }

    data.setHours(0, 0, 0, 0);
    return data;
}

function formatarData(texto) {
    const data = dataValida(texto);
    return data ? data.toLocaleDateString("pt-BR") : "-";
}

function produtosAtivos() {
    return lerLista("produtos").filter(p =>
        p &&
        typeof p === "object" &&
        p.ativo !== false &&
        String(p.codigo ?? "").trim() !== ""
    );
}

function encontrarProduto(codigo) {
    return produtosAtivos().find(
        p => codigoNormalizado(p.codigo) ===
             codigoNormalizado(codigo)
    );
}

function preencherProdutos() {
    const select = $("produto");
    select.replaceChildren();

    const inicial = document.createElement("option");
    inicial.value = "";
    inicial.textContent = "Selecione um produto";
    select.appendChild(inicial);

    const produtos = produtosAtivos().sort((a, b) =>
        String(a.nome || "").localeCompare(
            String(b.nome || ""), "pt-BR"
        )
    );

    produtos.forEach(p => {
        const option = document.createElement("option");
        option.value = p.codigo;
        option.textContent =
            (p.nome || "Sem nome") + " — " + p.codigo;
        select.appendChild(option);
    });
}

function classificarLote(lote) {
    if (numero(lote.quantidade) <= 0) {
        return {
            tipo: "sem-estoque",
            texto: "Sem quantidade"
        };
    }

    const validade = dataValida(lote.validade);

    if (!validade) {
        return { tipo: "vencido", texto: "Data inválida" };
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 30);

    if (validade < hoje) {
        return { tipo: "vencido", texto: "Vencido" };
    }

    if (validade <= limite) {
        return {
            tipo: "proximo",
            texto: "Próximo do vencimento"
        };
    }

    return { tipo: "normal", texto: "Dentro da validade" };
}

function cadastrarLote(evento) {
    evento.preventDefault();

    try {
        const codigoProduto = $("produto").value.trim();
        const codigoLote = $("codigoLote").value.trim();
        const quantidadeTexto = $("quantidade").value.trim();
        const quantidade = Number(quantidadeTexto);
        const entrada = $("dataEntrada").value;
        const validade = $("validade").value;

        const produto = encontrarProduto(codigoProduto);

        if (!produto) {
            throw new Error("Selecione um produto ativo.");
        }

        if (!codigoLote) {
            throw new Error("Informe o código do lote.");
        }

        if (
            quantidadeTexto === "" ||
            !Number.isFinite(quantidade) ||
            quantidade < 0
        ) {
            throw new Error("Informe uma quantidade válida.");
        }

        const dataEntrada = dataValida(entrada);
        const dataVencimento = dataValida(validade);

        if (!dataEntrada || !dataVencimento) {
            throw new Error("Informe datas válidas.");
        }

        if (dataVencimento < dataEntrada) {
            throw new Error(
                "A validade não pode ser anterior à entrada."
            );
        }

        const lotes = lerLista("lotes");

        const duplicado = lotes.some(lote =>
            codigoNormalizado(lote.codigoProduto) ===
                codigoNormalizado(codigoProduto) &&
            codigoNormalizado(lote.codigoLote) ===
                codigoNormalizado(codigoLote)
        );

        if (duplicado) {
            throw new Error(
                "Esse código de lote já existe para o produto."
            );
        }

        lotes.push({
            id: "lote-" + Date.now() + "-" +
                Math.random().toString(36).slice(2),
            codigoProduto: produto.codigo,
            nomeProduto: produto.nome,
            codigoLote,
            quantidade,
            dataEntrada: entrada,
            validade,
            criadoEm: new Date().toISOString()
        });

        localStorage.setItem("lotes", JSON.stringify(lotes));

        $("formLote").reset();

        $("mensagemCadastro").textContent =
            "Lote cadastrado com sucesso.";

        carregarLotes();

    } catch (erro) {
        $("mensagemCadastro").textContent =
            "Erro: " + erro.message;
    }
}

function criarCelula(tr, valor) {
    const td = document.createElement("td");
    td.textContent = String(valor ?? "");
    tr.appendChild(td);
    return td;
}

function lotesFiltrados(lotes) {
    const pesquisa = $("pesquisa").value
        .trim().toLowerCase();

    const filtro = $("filtroSituacao").value;

    return lotes.filter(lote => {
        const produto = encontrarProduto(lote.codigoProduto);
        const nome = produto
            ? produto.nome
            : lote.nomeProduto;

        const conteudo = [
            nome,
            lote.codigoProduto,
            lote.codigoLote
        ].join(" ").toLowerCase();

        const situacao = classificarLote(lote);

        return conteudo.includes(pesquisa) &&
            (filtro === "todos" || situacao.tipo === filtro);
    });
}

function atualizarIndicadores(lotes) {
    $("totalLotes").textContent = lotes.length;

    $("totalVencidos").textContent = lotes.filter(
        lote => classificarLote(lote).tipo === "vencido"
    ).length;

    $("totalProximos").textContent = lotes.filter(
        lote => classificarLote(lote).tipo === "proximo"
    ).length;

    const total = lotes.reduce(
        (soma, lote) => soma + numero(lote.quantidade),
        0
    );

    $("totalUnidades").textContent = formatarNumero(total);
}

function carregarLotes() {
    try {
        const lotes = lerLista("lotes");
        atualizarIndicadores(lotes);

        const tabela = $("tabelaLotes");
        tabela.replaceChildren();

        const filtrados = lotesFiltrados(lotes).sort(
            (a, b) => String(a.validade).localeCompare(
                String(b.validade)
            )
        );

        if (filtrados.length === 0) {
            const tr = document.createElement("tr");
            const td = criarCelula(
                tr, "Nenhum lote encontrado."
            );
            td.colSpan = 7;
            tabela.appendChild(tr);
            return;
        }

        filtrados.forEach(lote => {
            const tr = document.createElement("tr");
            const produto = encontrarProduto(lote.codigoProduto);

            criarCelula(
                tr,
                produto ? produto.nome : lote.nomeProduto
            );
            criarCelula(tr, lote.codigoLote);
            criarCelula(tr, formatarNumero(lote.quantidade));
            criarCelula(tr, formatarData(lote.dataEntrada));
            criarCelula(tr, formatarData(lote.validade));

            const tdSituacao = document.createElement("td");
            const etiqueta = document.createElement("span");
            const situacao = classificarLote(lote);

            etiqueta.className = "etiqueta " + situacao.tipo;
            etiqueta.textContent = situacao.texto;

            tdSituacao.appendChild(etiqueta);
            tr.appendChild(tdSituacao);

            const tdAcao = document.createElement("td");
            const botao = document.createElement("button");

            botao.type = "button";
            botao.textContent = "Excluir";
            botao.addEventListener("click", () =>
                excluirLote(lote.id)
            );

            tdAcao.appendChild(botao);
            tr.appendChild(tdAcao);
            tabela.appendChild(tr);
        });

        $("mensagemLista").textContent = "";

    } catch (erro) {
        $("mensagemLista").textContent =
            "Erro ao carregar lotes: " + erro.message;
    }
}

function excluirLote(id) {
    try {
        const lotes = lerLista("lotes");
        const lote = lotes.find(item => item.id === id);

        if (!lote) {
            throw new Error("Lote não encontrado.");
        }

        if (!confirm(
            "Excluir o lote " + lote.codigoLote +
            "?\nEsta ação não pode ser desfeita."
        )) {
            return;
        }

        const restantes = lotes.filter(item => item.id !== id);

        localStorage.setItem(
            "lotes",
            JSON.stringify(restantes)
        );

        carregarLotes();

        $("mensagemLista").textContent =
            "Lote excluído com sucesso.";

    } catch (erro) {
        $("mensagemLista").textContent =
            "Erro: " + erro.message;
    }
}

function protegerCSV(valor) {
    let texto = String(valor ?? "");

    if (/^\s*[=+\-@\t\r]/.test(texto)) {
        texto = "'" + texto;
    }

    return '"' + texto.replace(/"/g, '""') + '"';
}

function exportarCSV() {
    try {
        const lotes = lotesFiltrados(lerLista("lotes"));

        if (lotes.length === 0) {
            throw new Error("Não existem lotes para exportar.");
        }

        const linhas = [[
            "Produto",
            "Código do produto",
            "Código do lote",
            "Quantidade",
            "Data de entrada",
            "Validade",
            "Situação"
        ]];

        lotes.forEach(lote => {
            const produto = encontrarProduto(lote.codigoProduto);

            linhas.push([
                produto ? produto.nome : lote.nomeProduto,
                lote.codigoProduto,
                lote.codigoLote,
                lote.quantidade,
                formatarData(lote.dataEntrada),
                formatarData(lote.validade),
                classificarLote(lote).texto
            ]);
        });

        const conteudo = "\uFEFF" + linhas.map(
            linha => linha.map(protegerCSV).join(";")
        ).join("\r\n");

        const arquivo = new Blob([conteudo], {
            type: "text/csv;charset=utf-8"
        });

        const url = URL.createObjectURL(arquivo);
        const link = document.createElement("a");

        link.href = url;
        link.download = "relatorio_lotes.csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        $("mensagemLista").textContent =
            "Relatório CSV exportado com sucesso.";

    } catch (erro) {
        $("mensagemLista").textContent =
            "Erro: " + erro.message;
    }
}

$("formLote").addEventListener("submit", cadastrarLote);
$("pesquisa").addEventListener("input", carregarLotes);
$("filtroSituacao").addEventListener("change", carregarLotes);
$("atualizarLista").addEventListener("click", () => {
    preencherProdutos();
    carregarLotes();
});
$("exportarCSV").addEventListener("click", exportarCSV);

try {
    preencherProdutos();
    carregarLotes();
} catch (erro) {
    $("mensagemCadastro").textContent =
        "Erro ao iniciar: " + erro.message;
}
