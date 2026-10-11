
"use strict";

// ELEMENTOS DA PÁGINA

const filtroPeriodo = document.getElementById("periodo");
const filtroProduto = document.getElementById("produto");
const filtroInicio = document.getElementById("inicio");
const filtroFim = document.getElementById("fim");

const campoEntradas = document.getElementById("totalEntradas");
const campoSaidas = document.getElementById("totalSaidas");
const campoSaldo = document.getElementById("saldo");
const campoRegistros = document.getElementById("totalRegistros");
const mensagemDados = document.getElementById("mensagemDados");

let graficoMovimentacoes = null;
let graficoDistribuicao = null;
let graficoRanking = null;

// CORES DO ESTOQUE SIMPLES

const CORES = {
    azul: "#0C0A29",
    azulClaro: "#BFDCFF",
    verde: "#24784C",
    vermelho: "#B42318",
    bege: "#F5F5DC"
};

// LER DADOS DO NAVEGADOR

function lerDados(chave) {
    try {
        const dados = JSON.parse(
            localStorage.getItem(chave) || "[]"
        );

        return Array.isArray(dados) ? dados : [];
    } catch (erro) {
        console.error("Erro ao ler " + chave, erro);
        return [];
    }
}

// IDENTIFICAR UM PRODUTO

function chaveProduto(item) {
    const codigo = String(item.codigo || "").trim();
    const nome = String(item.produto || "").trim();

    if (codigo) {
        return "codigo:" + codigo.toLowerCase();
    }

    return "nome:" + nome.toLowerCase();
}

// JUNTAR ENTRADAS E SAÍDAS

function obterMovimentacoes() {
    const entradas = lerDados("entradas");
    const saidas = lerDados("saidas");

    const listaEntradas = entradas.map(function(item) {
        return {
            produto: String(item.produto || "Não informado"),
            codigo: String(
                item.codigo || item.produtoCodigo || ""
            ),
            quantidade: Number(item.quantidade),
            data: String(item.data || ""),
            tipo: "Entrada"
        };
    });

    const listaSaidas = saidas.map(function(item) {
        return {
            produto: String(item.produto || "Não informado"),
            codigo: String(
                item.codigo || item.produtoCodigo || ""
            ),
            quantidade: Number(item.quantidade),
            data: String(item.data || ""),
            tipo: "Saída"
        };
    });

    return [...listaEntradas, ...listaSaidas].filter(
        function(item) {
            return Number.isFinite(item.quantidade) &&
                   item.quantidade > 0;
        }
    );
}

// PREENCHER FILTRO DE PRODUTOS

function carregarProdutos() {
    const produtos = lerDados("produtos");
    const movimentos = obterMovimentacoes();

    const selecionado = filtroProduto.value;
    const opcoes = new Map();

    // Produtos atualmente cadastrados
    produtos.forEach(function(produto) {
        const item = {
            produto: produto.nome,
            codigo: produto.codigo || ""
        };

        const chave = chaveProduto(item);

        opcoes.set(chave, produto.nome);
    });

    // Produtos que aparecem no histórico
    movimentos.forEach(function(item) {
        const chave = chaveProduto(item);

        if (!opcoes.has(chave)) {
            opcoes.set(chave, item.produto);
        }
    });

    filtroProduto.innerHTML = "";

    const opcaoTodos = document.createElement("option");
    opcaoTodos.value = "todos";
    opcaoTodos.textContent = "Todos os produtos";
    filtroProduto.appendChild(opcaoTodos);

    Array.from(opcoes.entries())
        .sort(function(a, b) {
            return a[1].localeCompare(b[1], "pt-BR");
        })
        .forEach(function(par) {
            const opcao = document.createElement("option");

            opcao.value = par[0];
            opcao.textContent = par[1];

            filtroProduto.appendChild(opcao);
        });

    const existe = Array.from(filtroProduto.options)
        .some(function(opcao) {
            return opcao.value === selecionado;
        });

    filtroProduto.value = existe ? selecionado : "todos";
}

// FILTRAR MOVIMENTAÇÕES

function filtrarMovimentacoes() {
    const movimentos = obterMovimentacoes();

    const produtoSelecionado = filtroProduto.value;
    const inicio = filtroInicio.value;
    const fim = filtroFim.value;

    return movimentos.filter(function(item) {
        const chave = chaveProduto(item);

        const correspondeProduto =
            produtoSelecionado === "todos" ||
            chave === produtoSelecionado;

        const correspondeInicio =
            !inicio || item.data >= inicio;

        const correspondeFim =
            !fim || item.data <= fim;

        return correspondeProduto &&
               correspondeInicio &&
               correspondeFim;
    });
}

// FORMATAÇÃO

function formatarNumero(numero) {
    return numero.toLocaleString("pt-BR", {
        maximumFractionDigits: 2
    });
}

// AGRUPAR POR DIA, MÊS OU ANO

function obterPeriodo(data, tipo) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return null;
    }

    if (tipo === "ano") {
        return data.slice(0, 4);
    }

    if (tipo === "mes") {
        return data.slice(0, 7);
    }

    return data;
}

function formatarPeriodo(periodo, tipo) {
    if (tipo === "ano") {
        return periodo;
    }

    if (tipo === "mes") {
        const partes = periodo.split("-");
        return partes[1] + "/" + partes[0];
    }

    const partes = periodo.split("-");

    return partes[2] + "/" +
           partes[1] + "/" +
           partes[0];
}

// CALCULAR INDICADORES

function atualizarIndicadores(movimentos) {
    let entradas = 0;
    let saidas = 0;

    movimentos.forEach(function(item) {
        if (item.tipo === "Entrada") {
            entradas += item.quantidade;
        } else {
            saidas += item.quantidade;
        }
    });

    campoEntradas.textContent = formatarNumero(entradas);
    campoSaidas.textContent = formatarNumero(saidas);
    campoSaldo.textContent = formatarNumero(
        entradas - saidas
    );
    campoRegistros.textContent = movimentos.length;

    if (movimentos.length === 0) {
        mensagemDados.textContent =
            "Nenhuma movimentação encontrada para " +
            "os filtros selecionados.";
    } else {
        mensagemDados.textContent =
            "Exibindo " + movimentos.length +
            " movimentação(ões). Os indicadores mostram " +
            "os totais do período filtrado. O saldo " +
            "representa entradas menos saídas, não " +
            "o estoque disponível.";
    }
}

// GRÁFICO 1: ENTRADAS E SAÍDAS POR PERÍODO

function atualizarGraficoMovimentacoes(movimentos) {
    const tipo = filtroPeriodo.value;
    const agrupamento = {};

    movimentos.forEach(function(item) {
        const periodo = obterPeriodo(item.data, tipo);

        if (!periodo) return;

        if (!agrupamento[periodo]) {
            agrupamento[periodo] = {
                entradas: 0,
                saidas: 0
            };
        }

        if (item.tipo === "Entrada") {
            agrupamento[periodo].entradas += item.quantidade;
        } else {
            agrupamento[periodo].saidas += item.quantidade;
        }
    });

    const periodos = Object.keys(agrupamento).sort();

    const etiquetas = periodos.map(function(periodo) {
        return formatarPeriodo(periodo, tipo);
    });

    const entradas = periodos.map(function(periodo) {
        return agrupamento[periodo].entradas;
    });

    const saidas = periodos.map(function(periodo) {
        return agrupamento[periodo].saidas;
    });

    if (graficoMovimentacoes) {
        graficoMovimentacoes.destroy();
    }

    graficoMovimentacoes = new Chart(
        document.getElementById("graficoMovimentacoes"),
        {
            type: "bar",
            data: {
                labels: etiquetas,
                datasets: [
                    {
                        label: "Entradas",
                        data: entradas,
                        backgroundColor: CORES.verde,
                        borderRadius: 5
                    },
                    {
                        label: "Saídas",
                        data: saidas,
                        backgroundColor: CORES.vermelho,
                        borderRadius: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: "Quantidade"
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: "top"
                    }
                }
            }
        }
    );
}

// GRÁFICO 2: DISTRIBUIÇÃO DAS MOVIMENTAÇÕES

function atualizarGraficoDistribuicao(movimentos) {
    let entradas = 0;
    let saidas = 0;

    movimentos.forEach(function(item) {
        if (item.tipo === "Entrada") {
            entradas += item.quantidade;
        } else {
            saidas += item.quantidade;
        }
    });

    if (graficoDistribuicao) {
        graficoDistribuicao.destroy();
    }

    graficoDistribuicao = new Chart(
        document.getElementById("graficoDistribuicao"),
        {
            type: "doughnut",
            data: {
                labels: ["Entradas", "Saídas"],
                datasets: [{
                    data: [entradas, saidas],
                    backgroundColor: [
                        CORES.verde,
                        CORES.vermelho
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom"
                    }
                }
            }
        }
    );
}

// GRÁFICO 3: PRODUTOS COM MAIS SAÍDAS

function atualizarGraficoRanking(movimentos) {
    const ranking = new Map();

    movimentos.forEach(function(item) {
        if (item.tipo !== "Saída") return;

        const chave = chaveProduto(item);

        if (!ranking.has(chave)) {
            ranking.set(chave, {
                nome: item.produto,
                quantidade: 0
            });
        }

        ranking.get(chave).quantidade += item.quantidade;
    });

    const principais = Array.from(ranking.values())
        .sort(function(a, b) {
            return b.quantidade - a.quantidade;
        })
        .slice(0, 5);

    if (graficoRanking) {
        graficoRanking.destroy();
    }

    graficoRanking = new Chart(
        document.getElementById("graficoRanking"),
        {
            type: "bar",
            data: {
                labels: principais.map(function(item) {
                    return item.nome;
                }),
                datasets: [{
                    label: "Quantidade retirada",
                    data: principais.map(function(item) {
                        return item.quantidade;
                    }),
                    backgroundColor: CORES.azul,
                    borderRadius: 5
                }]
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        }
    );
}

// ATUALIZAR TODOS OS GRÁFICOS

function atualizarPainel() {
    const movimentos = filtrarMovimentacoes();

    atualizarIndicadores(movimentos);

    if (typeof Chart === "undefined") {
        mensagemDados.textContent =
            "Não foi possível carregar a biblioteca " +
            "de gráficos. Verifique sua conexão com a internet.";
        return;
    }

    atualizarGraficoMovimentacoes(movimentos);
    atualizarGraficoDistribuicao(movimentos);
    atualizarGraficoRanking(movimentos);
}

// EVENTOS DOS FILTROS

filtroPeriodo.addEventListener(
    "change",
    atualizarPainel
);

filtroProduto.addEventListener(
    "change",
    atualizarPainel
);

filtroInicio.addEventListener(
    "change",
    atualizarPainel
);

filtroFim.addEventListener(
    "change",
    atualizarPainel
);

// ATUALIZAR AO VOLTAR PARA A PÁGINA

window.addEventListener("pageshow", function() {
    carregarProdutos();
    atualizarPainel();
});

// INICIAR

carregarProdutos();
atualizarPainel();
