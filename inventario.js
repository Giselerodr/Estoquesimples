
"use strict";

let produtosCarregados = [];
let contagens = new Map();
let versaoProdutos = null;
let versaoLotes = null;

const $ = id => document.getElementById(id);

function lerLista(chave) {
    const texto = localStorage.getItem(chave);
    if (texto === null) return [];

    const dados = JSON.parse(texto);
    if (!Array.isArray(dados)) {
        throw new Error("Dados inválidos em: " + chave);
    }
    return dados;
}

function numero(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
}

function quantidadeAtual(p) {
    if (p.estoqueInicial !== undefined &&
        p.estoqueInicial !== null) {
        return numero(p.estoqueInicial) +
            numero(p.totalEntradas) -
            numero(p.totalSaidas);
    }
    return numero(p.quantidade);
}

function formatar(n) {
    return n.toLocaleString("pt-BR", {
        maximumFractionDigits: 3
    });
}

function mostrarMensagem(texto) {
    $("mensagem").textContent = texto;
}

function carregarProdutos() {
    try {
        versaoProdutos = localStorage.getItem("produtos");
        versaoLotes = localStorage.getItem("lotes");
        const lista = lerLista("produtos");

        produtosCarregados = lista
            .map((produto, indice) => ({ produto, indice }))
            .filter(item =>
                item.produto &&
                typeof item.produto === "object" &&
                item.produto.ativo !== false
            );

        contagens.clear();
        mostrarMensagem("");
        renderizar();
        renderizarHistorico();
    } catch (erro) {
        mostrarMensagem("Erro ao carregar: " + erro.message);
    }
}

function criarCelula(tr, texto) {
    const td = document.createElement("td");
    td.textContent = String(texto);
    tr.appendChild(td);
    return td;
}

function diferencaDoItem(item) {
    const texto = contagens.get(item.indice);
    if (texto === undefined || texto === "") return null;

    const contagem = Number(texto);
    if (!Number.isFinite(contagem) || contagem < 0) {
        return null;
    }

    return contagem - quantidadeAtual(item.produto);
}

function atualizarIndicadores() {
    let conferidos = 0;
    let divergencias = 0;
    let corretos = 0;

    produtosCarregados.forEach(item => {
        const diferenca = diferencaDoItem(item);
        if (diferenca === null) return;

        conferidos++;
        if (Math.abs(diferenca) > 0.000001) {
            divergencias++;
        } else {
            corretos++;
        }
    });

    $("totalProdutos").textContent = produtosCarregados.length;
    $("totalConferidos").textContent = conferidos;
    $("totalDivergencias").textContent = divergencias;
    $("totalCorretos").textContent = corretos;
}

function renderizar() {
    const tabela = $("tabelaInventario");
    tabela.replaceChildren();

    const pesquisa = $("pesquisa").value
        .trim().toLowerCase();

    const filtrados = produtosCarregados.filter(item => {
        const p = item.produto;
        return [p.nome, p.codigo, p.categoria]
            .join(" ").toLowerCase().includes(pesquisa);
    });

    if (filtrados.length === 0) {
        const tr = document.createElement("tr");
        const td = criarCelula(
            tr, "Nenhum produto encontrado."
        );
        td.colSpan = 6;
        tabela.appendChild(tr);
    }

    filtrados.forEach(item => {
        const p = item.produto;
        const tr = document.createElement("tr");
        const saldo = quantidadeAtual(p);

        criarCelula(tr, p.nome || "Sem nome");
        criarCelula(tr, p.codigo || "-");
        criarCelula(tr, formatar(saldo));

        const tdInput = document.createElement("td");
        const input = document.createElement("input");

        input.type = "number";
        input.min = "0";
        input.step = "any";
        input.placeholder = "Contagem";
        input.setAttribute(
            "aria-label",
            "Contagem física de " + (p.nome || "produto")
        );
        input.value = contagens.get(item.indice) ?? "";

        const tdDiferenca = document.createElement("td");
        const tdSituacao = document.createElement("td");

        function atualizarLinha() {
            const texto = input.value;

            if (texto === "") {
                contagens.delete(item.indice);
                tdDiferenca.textContent = "-";
                tdSituacao.textContent = "Não conferido";
                tdDiferenca.className = "";
            } else {
                contagens.set(item.indice, texto);
                const diferenca = diferencaDoItem(item);

                if (diferenca === null) {
                    tdDiferenca.textContent = "-";
                    tdSituacao.textContent = "Contagem inválida";
                    tdDiferenca.className = "falta";
                } else {
                    tdDiferenca.textContent =
                        (diferenca > 0 ? "+" : "") +
                        formatar(diferenca);

                    tdSituacao.textContent =
                        diferenca > 0 ? "Sobra" :
                        diferenca < 0 ? "Falta" : "Correto";

                    tdDiferenca.className =
                        diferenca > 0 ? "sobra" :
                        diferenca < 0 ? "falta" : "igual";
                }
            }

            atualizarIndicadores();
        }

        input.addEventListener("input", atualizarLinha);
        tdInput.appendChild(input);
        tr.appendChild(tdInput);
        tr.appendChild(tdDiferenca);
        tr.appendChild(tdSituacao);
        tabela.appendChild(tr);

        atualizarLinha();
    });

    atualizarIndicadores();
}

function itensConferidos() {
    const itens = [];

    for (const item of produtosCarregados) {
        if (!contagens.has(item.indice)) continue;

        const texto = contagens.get(item.indice);
        const valor = Number(texto);

        if (texto === "" || !Number.isFinite(valor) ||
            valor < 0) {
            throw new Error(
                "Contagem inválida para " + item.produto.nome
            );
        }

        itens.push({
            ...item,
            anterior: quantidadeAtual(item.produto),
            conferido: valor,
            diferenca: valor - quantidadeAtual(item.produto)
        });
    }

    return itens;
}

function confirmarInventario() {
    try {
        const itens = itensConferidos();

        if (itens.length === 0) {
            throw new Error(
                "Informe a contagem de pelo menos um produto."
            );
        }

        const responsavel = $("responsavel").value.trim();
        const justificativa = $("justificativa").value.trim();

        if (!responsavel) {
            throw new Error(
                "Informe o responsável pela conferência."
            );
        }

        const divergentes = itens.filter(
            i => Math.abs(i.diferenca) > 0.000001
        );

        if (divergentes.length > 0 && !justificativa) {
            throw new Error(
                "Informe a justificativa das divergências."
            );
        }

        if (localStorage.getItem("produtos") !==
            versaoProdutos) {
            throw new Error(
                "O estoque mudou desde o início da contagem. " +
                "Recarregue os produtos e confira novamente."
            );
        }

        // Evita alterar o estoque principal de produtos que possuem
        // lotes, sem atualizar a distribuição desses lotes.
        if (localStorage.getItem("lotes") !== versaoLotes) {
            throw new Error(
                "Os lotes mudaram durante a contagem. " +
                "Atualize a lista e confira novamente."
            );
        }

        const lotes = lerLista("lotes");
        const codigosComLotes = new Set(
            lotes.map(lote =>
                String(lote.codigoProduto ?? "").trim().toLowerCase()
            )
        );

        const bloqueados = divergentes.filter(item =>
            codigosComLotes.has(
                String(item.produto.codigo ?? "").trim().toLowerCase()
            )
        );

        if (bloqueados.length > 0) {
            throw new Error(
                "Ajuste bloqueado para produto(s) com lotes: " +
                bloqueados.map(item => item.produto.nome).join(", ") +
                ". Confira os lotes e resolva a divergência " +
                "antes de alterar o estoque principal. " +
                "Nenhum ajuste foi salvo."
            );
        }

        const mensagem =
            "Produtos conferidos: " + itens.length +
            "\nCom divergência: " + divergentes.length +
            "\n\nOs saldos divergentes serão substituídos " +
            "pelas quantidades contadas. Deseja confirmar?";

        if (!confirm(mensagem)) return;

        const produtosOriginais = lerLista("produtos");
        const historicoOriginal = lerLista("inventarios");

        const novosProdutos = produtosOriginais.map(p => ({ ...p }));
        const data = new Date().toISOString();

        const registros = itens.map(item => {
            const p = novosProdutos[item.indice];

            const entradas = numero(p.totalEntradas);
            const saidas = numero(p.totalSaidas);

            // Mantém os totais históricos de entrada e saída,
            // mas recalcula a base do estoque.
            p.estoqueInicial =
                item.conferido - entradas + saidas;

            p.quantidade = item.conferido;

            return {
                data,
                produto: p.nome || "",
                codigo: p.codigo || "",
                anterior: item.anterior,
                conferido: item.conferido,
                diferenca: item.diferenca,
                responsavel,
                justificativa: justificativa ||
                    "Conferência sem divergência"
            };
        });

        const textoProdutos = JSON.stringify(novosProdutos);
        const textoHistorico = JSON.stringify([
            ...historicoOriginal,
            ...registros
        ]);

        const backupProdutos = localStorage.getItem("produtos");
        const backupHistorico = localStorage.getItem("inventarios");

        try {
            localStorage.setItem("produtos", textoProdutos);
            localStorage.setItem("inventarios", textoHistorico);
        } catch (erro) {
            // Tenta desfazer a gravação parcial.
            try {
                if (backupProdutos === null) {
                    localStorage.removeItem("produtos");
                } else {
                    localStorage.setItem("produtos", backupProdutos);
                }

                if (backupHistorico === null) {
                    localStorage.removeItem("inventarios");
                } else {
                    localStorage.setItem("inventarios", backupHistorico);
                }
            } catch (falha) {
                console.error("Falha na recuperação:", falha);
            }

            throw new Error(
                "Não foi possível salvar. Verifique o espaço " +
                "do navegador e preserve seu backup."
            );
        }

        carregarProdutos();

        mostrarMensagem(
            "Inventário confirmado com sucesso!\n" +
            "Produtos conferidos: " + itens.length +
            "\nSaldos ajustados: " + divergentes.length
        );

    } catch (erro) {
        mostrarMensagem("Erro: " + erro.message);
    }
}

function renderizarHistorico() {
    const tabela = $("tabelaHistorico");
    tabela.replaceChildren();

    let registros;

    try {
        registros = lerLista("inventarios");
    } catch (erro) {
        mostrarMensagem(
            "Não foi possível ler o histórico de inventários."
        );
        return;
    }

    if (registros.length === 0) {
        const tr = document.createElement("tr");
        const td = criarCelula(tr, "Nenhum inventário registrado.");
        td.colSpan = 7;
        tabela.appendChild(tr);
        return;
    }

    [...registros].reverse().slice(0, 100).forEach(r => {
        const tr = document.createElement("tr");

        criarCelula(
            tr,
            new Date(r.data).toLocaleString("pt-BR")
        );
        criarCelula(tr, r.produto || "-");
        criarCelula(tr, formatar(numero(r.anterior)));
        criarCelula(tr, formatar(numero(r.conferido)));
        criarCelula(tr, formatar(numero(r.diferenca)));
        criarCelula(tr, r.responsavel || "-");
        criarCelula(tr, r.justificativa || "-");

        tabela.appendChild(tr);
    });
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
        const itens = itensConferidos();

        if (itens.length === 0) {
            throw new Error(
                "Faça uma contagem antes de exportar."
            );
        }

        const linhas = [[
            "Produto",
            "Código",
            "Saldo no sistema",
            "Contagem física",
            "Diferença",
            "Situação"
        ]];

        itens.forEach(item => {
            linhas.push([
                item.produto.nome || "",
                item.produto.codigo || "",
                item.anterior,
                item.conferido,
                item.diferenca,
                item.diferenca > 0 ? "Sobra" :
                item.diferenca < 0 ? "Falta" : "Correto"
            ]);
        });

        const csv = "\uFEFF" + linhas.map(
            linha => linha.map(protegerCSV).join(";")
        ).join("\r\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "conferencia_estoque.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

    } catch (erro) {
        mostrarMensagem("Erro: " + erro.message);
    }
}

$("pesquisa").addEventListener("input", renderizar);
$("atualizarLista").addEventListener("click", () => {
    if (contagens.size > 0 &&
        !confirm("Descartar a contagem atual?")) {
        return;
    }
    carregarProdutos();
});

$("limparContagem").addEventListener("click", () => {
    if (contagens.size > 0 &&
        !confirm("Limpar todas as contagens preenchidas?")) {
        return;
    }
    contagens.clear();
    renderizar();
    mostrarMensagem("");
});

$("confirmarAjustes").addEventListener(
    "click", confirmarInventario
);

$("exportarCSV").addEventListener("click", exportarCSV);

carregarProdutos();
