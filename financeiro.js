
"use strict";

// ELEMENTOS DA PÁGINA

const campoProduto = document.getElementById("produto");
const campoCusto = document.getElementById("custo");
const campoVenda = document.getElementById("venda");
const formulario = document.getElementById("formPrecos");

const campoMensagem = document.getElementById("mensagem");
const campoPesquisa = document.getElementById("pesquisa");
const campoSituacao = document.getElementById("filtroSituacao");
const corpoTabela = document.getElementById("tabelaFinanceira");

const indicadorEstoque = document.getElementById("valorEstoque");
const indicadorVenda = document.getElementById("valorVenda");
const indicadorMargem = document.getElementById("margemGeral");
const indicadorSaidas = document.getElementById("custoSaidas");

const avisoFinanceiro = document.getElementById("avisoFinanceiro");

// CHAVE EXCLUSIVA DO CONTROLE FINANCEIRO

const CHAVE_FINANCEIRA = "precosFinanceiros";

// LEITURA SEGURA DO LOCALSTORAGE

function lerJSON(chave, padrao) {
    try {
        const texto = localStorage.getItem(chave);

        if (!texto) {
            return padrao;
        }

        const resultado = JSON.parse(texto);

        return resultado === null ? padrao : resultado;

    } catch (erro) {
        console.error("Erro ao ler:", chave, erro);
        return padrao;
    }
}

function obterProdutos() {
    const dados = lerJSON("produtos", []);
    return Array.isArray(dados) ? dados : [];
}

function obterSaidas() {
    const dados = lerJSON("saidas", []);
    return Array.isArray(dados) ? dados : [];
}

function obterPrecos() {
    const dados = lerJSON(CHAVE_FINANCEIRA, {});

    if (
        typeof dados !== "object" ||
        Array.isArray(dados)
    ) {
        return {};
    }

    return dados;
}

// IDENTIFICADOR FINANCEIRO

function identificador(produto) {
    const codigo = String(
        produto.codigo || ""
    ).trim().toLowerCase();

    if (codigo) {
        return "codigo:" + codigo;
    }

    return "nome:" + String(
        produto.nome || produto.produto || ""
    ).trim().toLowerCase();
}

// FORMATAR VALORES

function moeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function numero(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        maximumFractionDigits: 3
    });
}

function porcentagem(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }) + "%";
}

// ESTOQUE DISPONÍVEL

function quantidadeAtual(produto) {
    const estoqueInicial = Number(
        produto.estoqueInicial ??
        produto.quantidade ??
        0
    );

    const entradas = Number(
        produto.totalEntradas || 0
    );

    const saidas = Number(
        produto.totalSaidas || 0
    );

    return estoqueInicial + entradas - saidas;
}

// PREÇOS CADASTRADOS

function precoDoProduto(produto) {
    const precos = obterPrecos();
    const chave = identificador(produto);

    if (!Object.prototype.hasOwnProperty.call(precos, chave)) {
        return null;
    }

    const registro = precos[chave];

    if (
        !registro ||
        !Number.isFinite(Number(registro.custo)) ||
        !Number.isFinite(Number(registro.venda))
    ) {
        return null;
    }

    return {
        custo: Number(registro.custo),
        venda: Number(registro.venda)
    };
}

// CARREGAR PRODUTOS NO FORMULÁRIO

function carregarListaProdutos() {
    const produtos = obterProdutos();
    const selecionado = campoProduto.value;

    campoProduto.innerHTML = "";

    const inicial = document.createElement("option");
    inicial.value = "";
    inicial.textContent = "Selecione um produto";
    campoProduto.appendChild(inicial);

    const produtosAtivos = produtos.filter(function(produto) {
        return produto.ativo !== false;
    });

    produtosAtivos.sort(function(a, b) {
        return String(a.nome || "").localeCompare(
            String(b.nome || ""),
            "pt-BR"
        );
    });

    produtosAtivos.forEach(function(produto) {
        const opcao = document.createElement("option");

        opcao.value = identificador(produto);
        opcao.textContent =
            produto.nome + " (" +
            (produto.codigo || "Sem código") + ")";

        campoProduto.appendChild(opcao);
    });

    const existe = Array.from(campoProduto.options)
        .some(function(opcao) {
            return opcao.value === selecionado;
        });

    campoProduto.value = existe ? selecionado : "";
}

// MOSTRAR PREÇOS AO SELECIONAR

function carregarPrecoSelecionado() {
    const chave = campoProduto.value;

    if (!chave) {
        campoCusto.value = "";
        campoVenda.value = "";
        return;
    }

    const precos = obterPrecos();
    const registro = precos[chave];

    campoCusto.value =
        registro && registro.custo !== undefined
            ? registro.custo
            : "";

    campoVenda.value =
        registro && registro.venda !== undefined
            ? registro.venda
            : "";

    campoMensagem.textContent = "";
}

// SALVAR PREÇOS

formulario.addEventListener("submit", function(evento) {
    evento.preventDefault();

    const chave = campoProduto.value;
    const custo = Number(campoCusto.value);
    const venda = Number(campoVenda.value);

    if (!chave) {
        campoMensagem.textContent =
            "Selecione um produto.";
        return;
    }

    if (
        campoCusto.value.trim() === "" ||
        campoVenda.value.trim() === "" ||
        !Number.isFinite(custo) ||
        !Number.isFinite(venda) ||
        custo < 0 ||
        venda < 0
    ) {
        campoMensagem.textContent =
            "Informe preços válidos e não negativos.";
        return;
    }

    const precos = obterPrecos();

    precos[chave] = {
        custo: custo,
        venda: venda,
        atualizadoEm: new Date().toISOString()
    };

    try {
        localStorage.setItem(
            CHAVE_FINANCEIRA,
            JSON.stringify(precos)
        );

        campoMensagem.textContent =
            "Preços salvos com sucesso.";

        atualizarFinanceiro();

    } catch (erro) {
        console.error(erro);

        campoMensagem.textContent =
            "Não foi possível salvar os preços.";
    }
});

// LIMPAR CAMPOS

document.getElementById("limparCampos")
    .addEventListener("click", function() {
        campoProduto.value = "";
        campoCusto.value = "";
        campoVenda.value = "";
        campoMensagem.textContent = "";
    });

// CÁLCULO DA MARGEM BRUTA

function calcularMargem(custo, venda) {
    if (venda <= 0) {
        return null;
    }

    return ((venda - custo) / venda) * 100;
}

// INDICADORES FINANCEIROS

function atualizarIndicadores() {
    const produtos = obterProdutos();
    const precos = obterPrecos();

    let valorCustoEstoque = 0;
    let valorVendaEstoque = 0;
    let custoSaidas = 0;
    let produtosSemPreco = 0;

    produtos.forEach(function(produto) {
        // Produtos inativos não entram no valor
        // do estoque atual.
        if (produto.ativo === false) {
            return;
        }

        const chave = identificador(produto);
        const registro = precos[chave];

        if (!registro) {
            produtosSemPreco++;
            return;
        }

        const custo = Number(registro.custo);
        const venda = Number(registro.venda);

        if (
            !Number.isFinite(custo) ||
            !Number.isFinite(venda) ||
            custo < 0 ||
            venda < 0
        ) {
            produtosSemPreco++;
            return;
        }

        const quantidade = quantidadeAtual(produto);

        valorCustoEstoque += quantidade * custo;
        valorVendaEstoque += quantidade * venda;
    });

    // Custo das saídas: estimativa baseada no
    // custo unitário atualmente cadastrado.
    // Inclui movimentos de produtos inativos
    // quando ainda existe identificação.
    const saidas = obterSaidas();

    saidas.forEach(function(saida) {
        const quantidade = Number(saida.quantidade);

        if (
            !Number.isFinite(quantidade) ||
            quantidade <= 0
        ) {
            return;
        }

        const chave = identificador({
            codigo: saida.codigo || saida.produtoCodigo,
            nome: saida.produto
        });

        let registro = precos[chave];

        // Compatibilidade com saídas antigas
        // que foram salvas sem código.
        if (!registro && !saida.codigo) {
            const produtoCorrespondente = produtos.find(
                function(produto) {
                    return String(produto.nome || "")
                        .trim().toLowerCase() ===
                        String(saida.produto || "")
                        .trim().toLowerCase();
                }
            );

            if (produtoCorrespondente) {
                registro = precos[
                    identificador(produtoCorrespondente)
                ];
            }
        }

        if (
            registro &&
            Number.isFinite(Number(registro.custo)) &&
            Number(registro.custo) >= 0
        ) {
            custoSaidas += quantidade *
                Number(registro.custo);
        }
    });

    indicadorEstoque.textContent =
        moeda(valorCustoEstoque);

    indicadorVenda.textContent =
        moeda(valorVendaEstoque);

    indicadorSaidas.textContent =
        moeda(custoSaidas);

    const margem = calcularMargem(
        valorCustoEstoque,
        valorVendaEstoque
    );

    indicadorMargem.textContent =
        margem === null ? "—" : porcentagem(margem);

    if (produtosSemPreco > 0) {
        avisoFinanceiro.textContent =
            "Atenção: " + produtosSemPreco +
            " produto(s) ativo(s) ainda não possuem " +
            "preços cadastrados. Os valores exibidos " +
            "são parciais. O custo das saídas é uma " +
            "estimativa com base nos preços atuais.";
    } else {
        avisoFinanceiro.textContent =
            "Os indicadores utilizam os preços atuais. " +
            "O custo das saídas é estimado e não " +
            "representa necessariamente o custo " +
            "histórico de cada compra. A margem " +
            "não considera impostos ou despesas.";
    }
}

// RELATÓRIO POR PRODUTO

function gerarLinhasRelatorio() {
    const pesquisa = campoPesquisa.value
        .trim().toLowerCase();

    const situacao = campoSituacao.value;

    return obterProdutos()
        .filter(function(produto) {
            const ativo = produto.ativo !== false;

            if (situacao === "ativos" && !ativo) {
                return false;
            }

            if (situacao === "inativos" && ativo) {
                return false;
            }

            const texto = (
                String(produto.nome || "") + " " +
                String(produto.codigo || "")
            ).toLowerCase();

            return texto.includes(pesquisa);
        })
        .map(function(produto) {
            const precos = precoDoProduto(produto);
            const quantidade = quantidadeAtual(produto);

            const custo = precos ? precos.custo : null;
            const venda = precos ? precos.venda : null;

            const total = custo === null
                ? null
                : quantidade * custo;

            const margem = precos
                ? calcularMargem(custo, venda)
                : null;

            return {
                nome: String(produto.nome || ""),
                codigo: String(produto.codigo || ""),
                quantidade: quantidade,
                custo: custo,
                venda: venda,
                total: total,
                margem: margem
            };
        });
}

// CRIAR CÉLULA SEM INJETAR HTML

function adicionarCelula(linha, valor) {
    const celula = document.createElement("td");
    celula.textContent = valor;
    linha.appendChild(celula);
    return celula;
}

// ATUALIZAR TABELA

function atualizarTabela() {
    const linhas = gerarLinhasRelatorio();

    corpoTabela.innerHTML = "";

    if (linhas.length === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = 7;
        celula.textContent =
            "Nenhum produto encontrado.";

        linha.appendChild(celula);
        corpoTabela.appendChild(linha);
        return;
    }

    linhas.forEach(function(item) {
        const linha = document.createElement("tr");

        adicionarCelula(linha, item.nome);
        adicionarCelula(linha, item.codigo);
        adicionarCelula(linha, numero(item.quantidade));

        adicionarCelula(
            linha,
            item.custo === null
                ? "Não cadastrado"
                : moeda(item.custo)
        );

        adicionarCelula(
            linha,
            item.venda === null
                ? "Não cadastrado"
                : moeda(item.venda)
        );

        adicionarCelula(
            linha,
            item.total === null
                ? "—"
                : moeda(item.total)
        );

        const celulaMargem = adicionarCelula(
            linha,
            item.margem === null
                ? "—"
                : porcentagem(item.margem)
        );

        if (item.margem !== null) {
            celulaMargem.className =
                item.margem >= 0
                    ? "positivo"
                    : "negativo";
        }

        corpoTabela.appendChild(linha);
    });
}

// ATUALIZAR TUDO

function atualizarFinanceiro() {
    atualizarIndicadores();
    atualizarTabela();
}

// PESQUISA E FILTROS

campoPesquisa.addEventListener(
    "input",
    atualizarTabela
);

campoSituacao.addEventListener(
    "change",
    atualizarTabela
);

campoProduto.addEventListener(
    "change",
    carregarPrecoSelecionado
);

// EXPORTAÇÃO CSV

function protegerCSV(valor) {
    const texto = String(valor ?? "");

    // Evita interpretação como fórmula
    // por programas de planilhas.
    if (/^[\s]*[=+\-@\t\r]/.test(texto)) {
        return "'" + texto;
    }

    return texto;
}

function celulaCSV(valor) {
    const texto = protegerCSV(valor);

    return '"' + texto.replace(/"/g, '""') + '"';
}

document.getElementById("exportarCSV")
    .addEventListener("click", function() {

        const linhas = gerarLinhasRelatorio();

        const cabecalho = [
            "Produto",
            "Código",
            "Quantidade",
            "Custo unitário",
            "Venda unitária",
            "Valor em estoque",
            "Margem bruta (%)"
        ];

        const conteudo = [cabecalho];

        linhas.forEach(function(item) {
            conteudo.push([
                item.nome,
                item.codigo,
                item.quantidade,
                item.custo === null ? "" : item.custo,
                item.venda === null ? "" : item.venda,
                item.total === null ? "" : item.total,
                item.margem === null
                    ? ""
                    : item.margem.toFixed(2)
            ]);
        });

        const csv = "\uFEFF" + conteudo
            .map(function(linha) {
                return linha.map(celulaCSV).join(";");
            })
            .join("\r\n");

        const arquivo = new Blob([csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(arquivo);
        const link = document.createElement("a");

        link.href = url;
        link.download = "relatorio_financeiro.csv";

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);
    });

// ATUALIZAR AO VOLTAR PARA A PÁGINA

window.addEventListener("pageshow", function() {
    carregarListaProdutos();
    atualizarFinanceiro();
});

// INICIAR

carregarListaProdutos();
atualizarFinanceiro();
