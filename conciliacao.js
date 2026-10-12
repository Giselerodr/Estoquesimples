
"use strict";

const $ = id => document.getElementById(id);

const normalizar = valor =>
    String(valor ?? "").trim().toLowerCase();

const arredondar = valor =>
    Math.round((valor + Number.EPSILON) * 1000) / 1000;


// Ler dados do armazenamento
function lerLista(chave) {
    const valor = JSON.parse(
        localStorage.getItem(chave) || "[]"
    );

    if (!Array.isArray(valor)) {
        throw new Error("Formato inválido: " + chave);
    }

    return valor;
}


// Validar quantidade
function numeroValido(valor) {
    const numero = Number(valor);

    return Number.isFinite(numero) &&
        numero >= 0 &&
        Math.abs(
            numero * 1000 - Math.round(numero * 1000)
        ) < 0.000001;
}


// Validar data
function dataValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        return false;
    }

    const d = new Date(valor + "T12:00:00");

    return !Number.isNaN(d.getTime()) &&
        d.getFullYear() === Number(valor.slice(0, 4)) &&
        d.getMonth() + 1 === Number(valor.slice(5, 7)) &&
        d.getDate() === Number(valor.slice(8, 10));
}


// Calcular estoque principal
function estoque(produto) {
    const inicial = Number(
        produto.estoqueInicial ??
        produto.quantidade ??
        0
    );

    const entradas = Number(
        produto.totalEntradas ?? 0
    );

    const saidas = Number(
        produto.totalSaidas ?? 0
    );

    if (![inicial, entradas, saidas].every(Number.isFinite)) {
        throw new Error(
            "Saldo principal inválido: " + produto.nome
        );
    }

    return arredondar(inicial + entradas - saidas);
}


// Localizar lotes de um produto
function lotesDoProduto(lotes, produto) {
    return lotes.filter(lote =>
        normalizar(lote.codigoProduto) ===
        normalizar(produto.codigo)
    );
}


// Somar quantidades dos lotes
function totalLotes(lotes) {
    let total = 0;

    for (const lote of lotes) {
        if (!numeroValido(lote.quantidade)) {
            throw new Error(
                "Quantidade de lote inválida: " +
                lote.codigoLote
            );
        }

        total += Number(lote.quantidade);
    }

    return arredondar(total);
}


// Criar célula da tabela
function criarCelula(linha, texto) {
    const td = document.createElement("td");

    td.textContent = String(texto ?? "");

    linha.appendChild(td);
}


// Buscar produtos ativos
function produtosValidos() {
    return lerLista("produtos").filter(produto =>
        produto &&
        typeof produto === "object" &&
        produto.ativo !== false &&
        normalizar(produto.codigo)
    );
}


// Atualizar tabela de conferência
function atualizarTabela() {
    const produtos = produtosValidos();
    const lotes = lerLista("lotes");

    const tabela = $("tabelaConferencia");

    tabela.replaceChildren();

    for (const produto of produtos) {
        const principal = estoque(produto);

        const total = totalLotes(
            lotesDoProduto(lotes, produto)
        );

        const diferenca = arredondar(
            principal - total
        );

        const linha = document.createElement("tr");

        [
            produto.nome + " (" + produto.codigo + ")",
            principal,
            total,
            diferenca,
            Math.abs(diferenca) < 0.0005
                ? "Conferido"
                : "Divergente"
        ].forEach(valor => criarCelula(linha, valor));

        tabela.appendChild(linha);
    }

    if (produtos.length === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = 5;
        celula.textContent =
            "Nenhum produto ativo cadastrado.";

        linha.appendChild(celula);
        tabela.appendChild(linha);
    }
}


// Preencher seleção de produtos
function preencherProdutos() {
    const anterior = $("produto").value;

    $("produto").replaceChildren();

    $("produto").appendChild(
        new Option("Selecione um produto", "")
    );

    for (const produto of produtosValidos()) {
        $("produto").appendChild(
            new Option(
                produto.nome + " — " + produto.codigo,
                produto.codigo
            )
        );
    }

    if (
        [...$("produto").options].some(
            opcao => opcao.value === anterior
        )
    ) {
        $("produto").value = anterior;
    }

    preencherLotes();
}


// Preencher seleção de lotes
function preencherLotes() {
    const anterior = $("lote").value;

    $("lote").replaceChildren();

    $("lote").appendChild(
        new Option("Selecione um lote", "")
    );

    const produto = produtosValidos().find(p =>
        normalizar(p.codigo) ===
        normalizar($("produto").value)
    );

    if (produto) {
        const lotes = lotesDoProduto(
            lerLista("lotes"),
            produto
        );

        for (const lote of lotes) {
            $("lote").appendChild(
                new Option(
                    lote.codigoLote +
                    " — saldo " + lote.quantidade,
                    lote.id
                )
            );
        }

        $("lote").appendChild(
            new Option(
                "Novo lote (após contagem física)",
                "novo"
            )
        );
    }

    if (
        [...$("lote").options].some(
            opcao => opcao.value === anterior
        )
    ) {
        $("lote").value = anterior;
    }

    atualizarResumo();
}


// Mostrar diferença e quantidade necessária
function atualizarResumo() {
    const produto = produtosValidos().find(p =>
        normalizar(p.codigo) ===
        normalizar($("produto").value)
    );

    const lotes = lerLista("lotes");
    const selecionado = $("lote").value;

    $("camposNovo").hidden = selecionado !== "novo";

    if (!produto || !selecionado) {
        $("resumo").textContent =
            "Selecione o produto e o lote.";
        return;
    }

    const existentes = lotesDoProduto(lotes, produto);

    const lote = selecionado === "novo"
        ? null
        : existentes.find(item =>
            item.id === selecionado
        );

    if (selecionado !== "novo" && !lote) {
        $("resumo").textContent =
            "Lote não encontrado. Atualize a página.";
        return;
    }

    const principal = estoque(produto);

    const outros = totalLotes(
        existentes.filter(item => item !== lote)
    );

    const necessario = arredondar(
        principal - outros
    );

    $("resumo").textContent =
        "Estoque principal: " + principal +
        "\nTotal dos outros lotes: " + outros +
        "\nQuantidade necessária neste lote para conciliar: " +
        necessario +
        (
            necessario < 0
                ? "\nIMPOSSÍVEL: outros lotes já superam " +
                  "o estoque principal. Corrija outro lote primeiro."
                : "\nDigite essa quantidade somente se " +
                  "a contagem física confirmar o valor."
        );
}


// Registrar conciliação
function registrar(evento) {
    evento.preventDefault();

    try {
        const produtos = produtosValidos();

        const produto = produtos.find(p =>
            normalizar(p.codigo) ===
            normalizar($("produto").value)
        );

        if (!produto) {
            throw new Error(
                "Selecione um produto ativo."
            );
        }

        const id = $("lote").value;

        if (!id) {
            throw new Error("Selecione um lote.");
        }

        const lotes = lerLista("lotes");
        const historico = lerLista("conciliacoes");

        const existentes = lotesDoProduto(
            lotes,
            produto
        );

        const lote = id === "novo"
            ? null
            : existentes.find(item => item.id === id);

        if (id !== "novo" && !lote) {
            throw new Error("Lote não encontrado.");
        }

        const quantidadeTexto =
            $("quantidadeFisica").value.trim();

        if (
            quantidadeTexto === "" ||
            !numeroValido(quantidadeTexto)
        ) {
            throw new Error(
                "Quantidade inválida. Utilize até " +
                "três casas decimais."
            );
        }

        const quantidade = arredondar(
            Number(quantidadeTexto)
        );

        const responsavel =
            $("responsavel").value.trim();

        const justificativa =
            $("justificativa").value.trim();

        if (
            !responsavel ||
            justificativa.length < 10 ||
            !$("confirmacao").checked
        ) {
            throw new Error(
                "Informe o responsável, uma justificativa " +
                "com pelo menos 10 caracteres e confirme " +
                "a contagem física."
            );
        }

        const principal = estoque(produto);

        if (principal < 0) {
            throw new Error(
                "O estoque principal está negativo. " +
                "Corrija o cadastro primeiro."
            );
        }

        const outros = totalLotes(
            existentes.filter(item => item !== lote)
        );

        const esperado = arredondar(
            principal - outros
        );

        if (
            esperado < 0 ||
            Math.abs(esperado - quantidade) >= 0.0005
        ) {
            throw new Error(
                "A quantidade conferida não fecha o saldo. " +
                "Esperado: " + esperado +
                ". Revise a contagem e os outros lotes."
            );
        }

        let codigoLote;
        let antes;

        if (id === "novo") {
            codigoLote =
                $("codigoNovo").value.trim();

            const entrada =
                $("entradaNovo").value;

            const validade =
                $("validadeNovo").value;

            if (
                !codigoLote ||
                !dataValida(entrada) ||
                !dataValida(validade) ||
                validade < entrada
            ) {
                throw new Error(
                    "Informe código, data de entrada e " +
                    "validade válidos para o novo lote."
                );
            }

            if (
                existentes.some(item =>
                    normalizar(item.codigoLote) ===
                    normalizar(codigoLote)
                )
            ) {
                throw new Error(
                    "Já existe um lote com esse código " +
                    "para o produto."
                );
            }

            antes = 0;

            lotes.push({
                id: "lote-" + Date.now() + "-" +
                    Math.random().toString(36).slice(2, 9),
                codigoProduto: produto.codigo,
                nomeProduto: produto.nome,
                codigoLote: codigoLote,
                quantidade: quantidade,
                dataEntrada: entrada,
                validade: validade,
                criadoEm: new Date().toISOString()
            });

        } else {
            codigoLote = lote.codigoLote;
            antes = Number(lote.quantidade);

            lote.quantidade = quantidade;
        }

        historico.push({
            data: new Date().toISOString(),
            codigoProduto: produto.codigo,
            produto: produto.nome,
            codigoLote: codigoLote,
            quantidadeAnterior: antes,
            quantidadeNova: quantidade,
            responsavel: responsavel,
            justificativa: justificativa
        });

        const anteriorLotes =
            localStorage.getItem("lotes");

        const anteriorHistorico =
            localStorage.getItem("conciliacoes");

        try {
            localStorage.setItem(
                "lotes",
                JSON.stringify(lotes)
            );

            localStorage.setItem(
                "conciliacoes",
                JSON.stringify(historico)
            );

        } catch (erro) {
            try {
                if (anteriorLotes === null) {
                    localStorage.removeItem("lotes");
                } else {
                    localStorage.setItem(
                        "lotes",
                        anteriorLotes
                    );
                }

                if (anteriorHistorico === null) {
                    localStorage.removeItem(
                        "conciliacoes"
                    );
                } else {
                    localStorage.setItem(
                        "conciliacoes",
                        anteriorHistorico
                    );
                }

            } catch (recuperacao) {
                console.error(
                    "Falha na recuperação:",
                    recuperacao
                );
            }

            throw erro;
        }

        $("mensagem").textContent =
            "Conciliação registrada. " +
            "Estoque principal preservado.";

        $("mensagem").className = "ok";

        $("formConciliacao").reset();

        atualizarTudo();

    } catch (erro) {
        $("mensagem").textContent =
            "Erro: " + erro.message;

        $("mensagem").className = "erro";
    }
}


// Mostrar histórico
function mostrarHistorico() {
    const tabela = $("historico");

    tabela.replaceChildren();

    const historico = lerLista("conciliacoes")
        .slice()
        .reverse();

    for (const item of historico) {
        const linha = document.createElement("tr");

        [
            new Date(item.data).toLocaleString("pt-BR"),
            item.produto,
            item.codigoLote,
            item.quantidadeAnterior,
            item.quantidadeNova,
            item.responsavel,
            item.justificativa
        ].forEach(valor =>
            criarCelula(linha, valor)
        );

        tabela.appendChild(linha);
    }
}


// Atualizar todas as informações
function atualizarTudo() {
    atualizarTabela();
    preencherProdutos();
    mostrarHistorico();
}


// Eventos
$("atualizar").addEventListener("click", () => {
    try {
        atualizarTudo();
    } catch (erro) {
        alert(erro.message);
    }
});

$("produto").addEventListener(
    "change",
    preencherLotes
);

$("lote").addEventListener(
    "change",
    atualizarResumo
);

$("formConciliacao").addEventListener(
    "submit",
    registrar
);


// Iniciar página
try {
    atualizarTudo();
} catch (erro) {
    alert(
        "Erro ao iniciar: " + erro.message
    );
}
