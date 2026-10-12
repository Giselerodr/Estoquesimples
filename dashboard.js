
"use strict";

// LEITURA DOS DADOS

function lerJSON(chave, padrao) {
    try {
        const texto = localStorage.getItem(chave);
        return texto === null ? padrao : JSON.parse(texto);
    } catch (erro) {
        console.error("Erro ao ler:", chave, erro);
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

// QUANTIDADE DISPONÍVEL

function quantidadeAtual(produto) {
    if (produto.estoqueInicial !== undefined &&
        produto.estoqueInicial !== null) {
        return numero(produto.estoqueInicial) +
            numero(produto.totalEntradas) -
            numero(produto.totalSaidas);
    }

    return numero(produto.quantidade);
}

// CONTROLE DE VALIDADE

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

function analisarSituacao(produto) {
    const quantidade = quantidadeAtual(produto);
    const minimo = numero(produto.estoqueMinimo);
    const baixo = quantidade <= minimo;

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
        situacoes.push("Validade próxima");
    }

    if (baixo) {
        situacoes.push("Estoque baixo");
    }

    return {
        produto,
        quantidade,
        baixo,
        vencido,
        proximo,
        situacoes,
        prioridade: vencido ? 1 :
            proximo ? 2 :
            baixo ? 3 : 4
    };
}

// PREÇOS DO CONTROLE FINANCEIRO

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
    const precos = lerJSON("precosFinanceiros", {});

    return precos &&
        typeof precos === "object" &&
        !Array.isArray(precos)
        ? precos
        : {};
}

// INDICADORES

function atualizarIndicadores(produtos, entradas, saidas) {
    const analises = produtos.map(analisarSituacao);
    const precos = obterPrecos();

    let unidades = 0;
    let custoTotal = 0;
    let vendaTotal = 0;
    let semPreco = 0;

    analises.forEach(item => {
        const quantidade = Math.max(0, item.quantidade);
        const preco = precos[chavePreco(item.produto)];

        unidades += quantidade;

        if (preco && typeof preco === "object") {
            const custo = numero(preco.custo);
            const venda = numero(preco.venda);

            custoTotal += quantidade * custo;
            vendaTotal += quantidade * venda;
        } else {
            semPreco++;
        }
    });

    const dados = {
        totalProdutos: produtos.length,
        totalUnidades: formatarNumero(unidades),
        totalBaixo: analises.filter(p => p.baixo).length,
        totalValidade: analises.filter(
            p => p.vencido || p.proximo
        ).length,
        valorCusto: moeda(custoTotal),
        valorVenda: moeda(vendaTotal),
        totalEntradas: entradas.length,
        totalSaidas: saidas.length
    };

    Object.entries(dados).forEach(([id, valor]) => {
        document.getElementById(id).textContent = valor;
    });

    const aviso = document.getElementById("avisoPainel");

    aviso.textContent =
        "Os valores financeiros são estimativas baseadas " +
        "nos preços atuais cadastrados. " +
        (semPreco > 0
            ? semPreco + " produto(s) ativo(s) ainda não " +
              "possuem preços financeiros cadastrados. "
            : "") +
        "Os registros permanecem armazenados neste navegador.";

    return analises;
}

// GRÁFICO DOS PRODUTOS MAIS MOVIMENTADOS

function identificarMovimento(movimento) {
    const codigo = String(
        movimento.codigo || ""
    ).trim().toLowerCase();

    if (codigo) {
        return "codigo:" + codigo;
    }

    return "nome:" + String(
        movimento.produto || ""
    ).trim().toLowerCase();
}

function criarGrafico(produtos, entradas, saidas) {
    const destino = document.getElementById(
        "graficoMovimentacoes"
    );

    destino.replaceChildren();

    const mapa = new Map();
    const nomes = new Map();

    produtos.forEach(produto => {
        const chave = chavePreco(produto);

        nomes.set(chave, produto.nome || "Sem nome");

        const nomeChave = "nome:" + String(
            produto.nome || ""
        ).trim().toLowerCase();

        if (!nomes.has(nomeChave)) {
            nomes.set(nomeChave, produto.nome || "Sem nome");
        }
    });

    [...entradas, ...saidas].forEach(movimento => {
        if (!movimento || typeof movimento !== "object") {
            return;
        }

        const chave = identificarMovimento(movimento);

        if (chave === "nome:") return;

        const quantidade = numero(movimento.quantidade);

        if (quantidade <= 0) return;

        const anterior = mapa.get(chave) || 0;

        mapa.set(chave, anterior + quantidade);
    });

    const maiores = [...mapa.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (maiores.length === 0) {
        const mensagem = document.createElement("p");
        mensagem.className = "vazio";
        mensagem.textContent =
            "Ainda não existem movimentações para exibir.";
        destino.appendChild(mensagem);
        return;
    }

    const maiorValor = maiores[0][1];

    maiores.forEach(([chave, quantidade]) => {
        const item = document.createElement("div");
        item.className = "barra-item";

        const topo = document.createElement("div");
        topo.className = "barra-topo";

        const nome = document.createElement("span");
        nome.textContent = nomes.get(chave) ||
            chave.replace(/^(codigo|nome):/, "");

        const valor = document.createElement("strong");
        valor.textContent = formatarNumero(quantidade);

        topo.appendChild(nome);
        topo.appendChild(valor);

        const fundo = document.createElement("div");
        fundo.className = "barra-fundo";

        const preenchimento = document.createElement("div");
        preenchimento.className = "barra-preenchimento";

        preenchimento.style.width =
            (quantidade / maiorValor * 100) + "%";

        fundo.appendChild(preenchimento);
        item.appendChild(topo);
        item.appendChild(fundo);

        destino.appendChild(item);
    });
}

// TABELA DE PRIORIDADES

function criarCelula(linha, conteudo) {
    const celula = document.createElement("td");
    celula.textContent = String(conteudo);
    linha.appendChild(celula);
    return celula;
}

function atualizarPrioridades(analises) {
    const tabela = document.getElementById(
        "tabelaPrioridades"
    );

    tabela.replaceChildren();

    const prioridades = analises
        .filter(item => item.situacoes.length > 0)
        .sort((a, b) => a.prioridade - b.prioridade)
        .slice(0, 8);

    if (prioridades.length === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = 3;
        celula.textContent =
            "Nenhum produto com alerta no momento.";

        linha.appendChild(celula);
        tabela.appendChild(linha);
        return;
    }

    prioridades.forEach(item => {
        const linha = document.createElement("tr");

        criarCelula(
            linha,
            item.produto.nome || "Sem nome"
        );

        criarCelula(
            linha,
            formatarNumero(item.quantidade)
        );

        const celula = document.createElement("td");
        const etiqueta = document.createElement("span");

        etiqueta.className = "etiqueta " +
            (item.vencido ? "critico" : "atencao");

        etiqueta.textContent = item.situacoes.join(" | ");

        celula.appendChild(etiqueta);
        linha.appendChild(celula);
        tabela.appendChild(linha);
    });
}

// ATUALIZAÇÃO GERAL DO DASHBOARD

function atualizarDashboard() {
    const produtos = lerLista("produtos")
        .filter(produto =>
            produto &&
            typeof produto === "object" &&
            produto.ativo !== false
        );

    const entradas = lerLista("entradas");
    const saidas = lerLista("saidas");

    const analises = atualizarIndicadores(
        produtos,
        entradas,
        saidas
    );

    criarGrafico(produtos, entradas, saidas);
    atualizarPrioridades(analises);

    document.getElementById(
        "ultimaAtualizacao"
    ).textContent =
        "Última atualização: " +
        new Date().toLocaleString("pt-BR");
}

document.getElementById("atualizarPainel")
    .addEventListener("click", atualizarDashboard);

window.addEventListener(
    "pageshow",
    atualizarDashboard
);

atualizarDashboard();
