
"use strict";

// LEITURA DOS DADOS

function lerJSON(chave, padrao) {
    try {
        const texto = localStorage.getItem(chave);
        return texto === null ? padrao : JSON.parse(texto);
    } catch (erro) {
        console.error("Erro ao ler " + chave, erro);
        return padrao;
    }
}

function lerLista(chave) {
    const dados = lerJSON(chave, []);
    return Array.isArray(dados) ? dados : [];
}

function numero(valor) {
    const n = Number(valor);
    return Number.isFinite(n) ? n : 0;
}

function moeda(valor) {
    return numero(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarNumero(valor) {
    return numero(valor).toLocaleString("pt-BR", {
        maximumFractionDigits: 3
    });
}

// CÁLCULO DO ESTOQUE

function quantidadeAtual(produto) {
    if (
        produto.estoqueInicial !== undefined &&
        produto.estoqueInicial !== null
    ) {
        return numero(produto.estoqueInicial) +
            numero(produto.totalEntradas) -
            numero(produto.totalSaidas);
    }

    return numero(produto.quantidade);
}

// TRATAMENTO DAS DATAS

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

function formatarData(valor) {
    const data = converterData(valor);

    return data
        ? data.toLocaleDateString("pt-BR")
        : "Não informada";
}

// CLASSIFICAÇÃO DOS PRODUTOS

function analisarProduto(produto) {
    const quantidade = quantidadeAtual(produto);
    const minimo = numero(produto.estoqueMinimo);

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + 30);

    const validade = converterData(produto.validade);

    const baixo = quantidade <= minimo;
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

    if (baixo) {
        situacoes.push("Estoque baixo");
    }

    if (situacoes.length === 0) {
        situacoes.push("Normal");
    }

    return {
        produto,
        quantidade,
        minimo,
        baixo,
        vencido,
        proximo,
        alerta: baixo || vencido || proximo,
        situacao: situacoes.join(" | ")
    };
}

// PREÇOS FINANCEIROS

function chavePreco(produto) {
    const codigo = String(
        produto.codigo || ""
    ).trim().toLowerCase();

    if (codigo) {
        return "codigo:" + codigo;
    }

    return "nome:" + String(
        produto.nome || ""
    ).trim().toLowerCase();
}

function obterPrecos() {
    const dados = lerJSON("precosFinanceiros", {});

    return dados &&
        typeof dados === "object" &&
        !Array.isArray(dados)
        ? dados
        : {};
}

// PREENCHIMENTO DOS INDICADORES

function preencherIndicadores(analises, entradas, saidas) {
    const precos = obterPrecos();

    let unidades = 0;
    let valorCusto = 0;
    let valorVenda = 0;
    let semPreco = 0;

    analises.forEach(item => {
        const quantidade = Math.max(0, item.quantidade);
        unidades += quantidade;

        const preco = precos[chavePreco(item.produto)];

        if (preco && typeof preco === "object") {
            valorCusto += quantidade * numero(preco.custo);
            valorVenda += quantidade * numero(preco.venda);
        } else {
            semPreco++;
        }
    });

    const unidadesMovimentadas = [
        ...entradas,
        ...saidas
    ].reduce((soma, movimento) => {
        if (!movimento || typeof movimento !== "object") {
            return soma;
        }

        return soma + Math.max(
            0,
            numero(movimento.quantidade)
        );
    }, 0);

    const indicadores = {
        totalProdutos: analises.length,
        totalUnidades: formatarNumero(unidades),
        totalBaixo: analises.filter(p => p.baixo).length,
        totalVencidos: analises.filter(p => p.vencido).length,
        totalProximos: analises.filter(p => p.proximo).length,
        totalAlertas: analises.filter(p => p.alerta).length,
        valorCusto: moeda(valorCusto),
        valorVenda: moeda(valorVenda),
        diferencaPotencial: moeda(valorVenda - valorCusto),
        totalEntradas: entradas.length,
        totalSaidas: saidas.length,
        unidadesMovimentadas: formatarNumero(
            unidadesMovimentadas
        )
    };

    Object.entries(indicadores).forEach(([id, valor]) => {
        document.getElementById(id).textContent = valor;
    });

    return { semPreco };
}

// TABELA DE PRODUTOS

function criarCelula(linha, valor) {
    const celula = document.createElement("td");
    celula.textContent = String(valor);
    linha.appendChild(celula);
}

function preencherTabela(analises) {
    const tabela = document.getElementById("tabelaProdutos");
    tabela.replaceChildren();

    if (analises.length === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = 6;
        celula.textContent = "Nenhum produto ativo cadastrado.";

        linha.appendChild(celula);
        tabela.appendChild(linha);
        return;
    }

    const ordenados = [...analises].sort((a, b) => {
        if (a.vencido !== b.vencido) {
            return a.vencido ? -1 : 1;
        }

        if (a.proximo !== b.proximo) {
            return a.proximo ? -1 : 1;
        }

        if (a.baixo !== b.baixo) {
            return a.baixo ? -1 : 1;
        }

        return String(a.produto.nome || "").localeCompare(
            String(b.produto.nome || ""),
            "pt-BR"
        );
    });

    ordenados.forEach(item => {
        const linha = document.createElement("tr");

        criarCelula(linha, item.produto.nome || "Sem nome");
        criarCelula(linha, item.produto.codigo || "-");
        criarCelula(linha, formatarNumero(item.quantidade));
        criarCelula(linha, formatarNumero(item.minimo));
        criarCelula(linha, formatarData(item.produto.validade));
        criarCelula(linha, item.situacao);

        tabela.appendChild(linha);
    });
}

// ANÁLISE AUTOMÁTICA

function preencherObservacoes(analises, semPreco) {
    const baixo = analises.filter(p => p.baixo).length;
    const vencidos = analises.filter(p => p.vencido).length;
    const proximos = analises.filter(p => p.proximo).length;

    const observacoes = [];

    if (vencidos > 0) {
        observacoes.push(
            vencidos + " produto(s) com validade vencida. " +
            "Recomenda-se separar esses itens para avaliação " +
            "e impedir sua comercialização."
        );
    }

    if (proximos > 0) {
        observacoes.push(
            proximos + " produto(s) com vencimento " +
            "nos próximos 30 dias. Recomenda-se " +
            "priorizar a conferência desses produtos."
        );
    }

    if (baixo > 0) {
        observacoes.push(
            baixo + " produto(s) com estoque igual ou " +
            "inferior ao mínimo cadastrado. " +
            "Recomenda-se avaliar a necessidade de reposição."
        );
    }

    if (semPreco > 0) {
        observacoes.push(
            semPreco + " produto(s) ativo(s) sem preços " +
            "financeiros cadastrados. Os valores apresentados " +
            "não representam necessariamente o estoque completo."
        );
    }

    if (observacoes.length === 0) {
        observacoes.push(
            "Nenhuma situação de atenção foi identificada " +
            "nos produtos ativos analisados."
        );
    }

    observacoes.push(
        "Os valores de venda são estimativas e não representam " +
        "receita realizada. Os dados dependem da atualização " +
        "dos registros no sistema."
    );

    const destino = document.getElementById("observacoes");
    destino.replaceChildren();

    observacoes.forEach(texto => {
        const paragrafo = document.createElement("p");
        paragrafo.textContent = texto;
        destino.appendChild(paragrafo);
    });
}

// GERAÇÃO DO RELATÓRIO

function gerarRelatorio() {
    const produtos = lerLista("produtos").filter(
        produto =>
            produto &&
            typeof produto === "object" &&
            !Array.isArray(produto) &&
            produto.ativo !== false
    );

    const entradas = lerLista("entradas");
    const saidas = lerLista("saidas");

    const analises = produtos.map(analisarProduto);

    const resultado = preencherIndicadores(
        analises,
        entradas,
        saidas
    );

    preencherTabela(analises);
    preencherObservacoes(analises, resultado.semPreco);

    document.getElementById("dataEmissao").textContent =
        new Date().toLocaleString("pt-BR");
}

// BOTÕES

document.getElementById("atualizarRelatorio")
    .addEventListener("click", gerarRelatorio);

document.getElementById("imprimirRelatorio")
    .addEventListener("click", function() {
        gerarRelatorio();
        window.print();
    });

window.addEventListener("pageshow", gerarRelatorio);

gerarRelatorio();
