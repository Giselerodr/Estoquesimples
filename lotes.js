
"use strict";

// Selecionar elementos da página
const $ = id => document.getElementById(id);


// Ler listas salvas no navegador
function lerLista(chave) {
    const texto = localStorage.getItem(chave);

    if (texto === null) {
        return [];
    }

    const dados = JSON.parse(texto);

    if (!Array.isArray(dados)) {
        throw new Error("Dados inválidos em " + chave);
    }

    return dados;
}


// Padronizar códigos para comparação
function codigoNormalizado(valor) {
    return String(valor ?? "").trim().toLowerCase();
}


// Converter valores para números
function numero(valor) {
    const n = Number(valor);

    return Number.isFinite(n) ? n : 0;
}


// Formatar quantidades
function formatarNumero(valor) {
    return numero(valor).toLocaleString("pt-BR", {
        maximumFractionDigits: 3
    });
}


// Validar datas
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


// Formatar datas para o padrão brasileiro
function formatarData(texto) {
    const data = dataValida(texto);

    return data
        ? data.toLocaleDateString("pt-BR")
        : "-";
}


// Buscar produtos ativos
function produtosAtivos() {
    return lerLista("produtos").filter(produto =>
        produto &&
        typeof produto === "object" &&
        produto.ativo !== false &&
        String(produto.codigo ?? "").trim() !== ""
    );
}


// Encontrar produto pelo código
function encontrarProduto(codigo) {
    return produtosAtivos().find(produto =>
        codigoNormalizado(produto.codigo) ===
        codigoNormalizado(codigo)
    );
}


// Preencher lista de produtos
function preencherProdutos() {
    const select = $("produto");

    if (!select) {
        return;
    }

    select.replaceChildren();

    const inicial = document.createElement("option");

    inicial.value = "";
    inicial.textContent = "Selecione um produto";

    select.appendChild(inicial);

    const produtos = produtosAtivos().sort((a, b) =>
        String(a.nome || "").localeCompare(
            String(b.nome || ""),
            "pt-BR"
        )
    );

    produtos.forEach(produto => {
        const opcao = document.createElement("option");

        opcao.value = produto.codigo;

        opcao.textContent =
            (produto.nome || "Sem nome") +
            " — " +
            produto.codigo;

        select.appendChild(opcao);
    });
}


// Classificar situação do lote
function classificarLote(lote) {
    if (numero(lote.quantidade) <= 0) {
        return {
            tipo: "sem-estoque",
            texto: "Sem quantidade"
        };
    }

    const validade = dataValida(lote.validade);

    if (!validade) {
        return {
            tipo: "vencido",
            texto: "Data inválida"
        };
    }

    const hoje = new Date();

    hoje.setHours(0, 0, 0, 0);

    const limite = new Date(hoje);

    limite.setDate(limite.getDate() + 30);

    if (validade < hoje) {
        return {
            tipo: "vencido",
            texto: "Vencido"
        };
    }

    if (validade <= limite) {
        return {
            tipo: "proximo",
            texto: "Próximo do vencimento"
        };
    }

    return {
        tipo: "normal",
        texto: "Dentro da validade"
    };
}


// Bloquear cadastro direto de lotes
function cadastrarLote(evento) {
    evento.preventDefault();

    const mensagem = $("mensagemCadastro");

    if (mensagem) {
        mensagem.textContent =
            "O cadastro de lotes com quantidade deve " +
            "ser realizado pela página Entrada de " +
            "Mercadorias. Para corrigir lotes antigos, " +
            "utilize a página Conciliação de Lotes.";
    }
}


// Criar células nas tabelas
function criarCelula(linha, valor) {
    const celula = document.createElement("td");

    celula.textContent = String(valor ?? "");

    linha.appendChild(celula);

    return celula;
}


// Filtrar lotes pela pesquisa e situação
function lotesFiltrados(lotes) {
    const pesquisa = $("pesquisa")
        ? $("pesquisa").value.trim().toLowerCase()
        : "";

    const filtro = $("filtroSituacao")
        ? $("filtroSituacao").value
        : "todos";

    return lotes.filter(lote => {
        const produto = encontrarProduto(
            lote.codigoProduto
        );

        const nome = produto
            ? produto.nome
            : lote.nomeProduto;

        const conteudo = [
            nome,
            lote.codigoProduto,
            lote.codigoLote
        ].join(" ").toLowerCase();

        const situacao = classificarLote(lote);

        return (
            conteudo.includes(pesquisa) &&
            (
                filtro === "todos" ||
                situacao.tipo === filtro
            )
        );
    });
}


// Atualizar indicadores
function atualizarIndicadores(lotes) {
    $("totalLotes").textContent = lotes.length;

    $("totalVencidos").textContent =
        lotes.filter(lote =>
            classificarLote(lote).tipo === "vencido"
        ).length;

    $("totalProximos").textContent =
        lotes.filter(lote =>
            classificarLote(lote).tipo === "proximo"
        ).length;

    const total = lotes.reduce(
        (soma, lote) =>
            soma + numero(lote.quantidade),
        0
    );

    $("totalUnidades").textContent =
        formatarNumero(total);
}


// Exibir lotes cadastrados
function carregarLotes() {
    try {
        const lotes = lerLista("lotes");

        atualizarIndicadores(lotes);

        const tabela = $("tabelaLotes");

        tabela.replaceChildren();

        const filtrados = lotesFiltrados(lotes).sort(
            (a, b) =>
                String(a.validade).localeCompare(
                    String(b.validade)
                )
        );

        if (filtrados.length === 0) {
            const linha = document.createElement("tr");

            const celula = criarCelula(
                linha,
                "Nenhum lote encontrado."
            );

            celula.colSpan = 7;

            tabela.appendChild(linha);

            $("mensagemLista").textContent = "";

            return;
        }

        filtrados.forEach(lote => {
            const linha = document.createElement("tr");

            const produto = encontrarProduto(
                lote.codigoProduto
            );

            criarCelula(
                linha,
                produto
                    ? produto.nome
                    : lote.nomeProduto
            );

            criarCelula(
                linha,
                lote.codigoLote
            );

            criarCelula(
                linha,
                formatarNumero(lote.quantidade)
            );

            criarCelula(
                linha,
                formatarData(lote.dataEntrada)
            );

            criarCelula(
                linha,
                formatarData(lote.validade)
            );

            // Situação da validade
            const tdSituacao =
                document.createElement("td");

            const etiqueta =
                document.createElement("span");

            const situacao = classificarLote(lote);

            etiqueta.className =
                "etiqueta " + situacao.tipo;

            etiqueta.textContent =
                situacao.texto;

            tdSituacao.appendChild(etiqueta);

            linha.appendChild(tdSituacao);

            // Botão de exclusão desativado
            const tdAcao =
                document.createElement("td");

            const botao =
                document.createElement("button");

            botao.type = "button";

            botao.textContent =
                "Exclusão bloqueada";

            botao.disabled = true;

            botao.title =
                "Utilize a conciliação para " +
                "regularizar quantidades.";

            tdAcao.appendChild(botao);

            linha.appendChild(tdAcao);

            tabela.appendChild(linha);
        });

        $("mensagemLista").textContent = "";

    } catch (erro) {
        $("mensagemLista").textContent =
            "Erro ao carregar lotes: " +
            erro.message;
    }
}


// Bloquear exclusão direta de lotes
function excluirLote(id) {
    $("mensagemLista").textContent =
        "A exclusão direta de lotes está " +
        "desativada para proteger o estoque. " +
        "Utilize a página de conciliação " +
        "para regularizar as quantidades.";
}


// Proteger células na exportação CSV
function protegerCSV(valor) {
    let texto = String(valor ?? "");

    if (/^\s*[=+\-@\t\r]/.test(texto)) {
        texto = "'" + texto;
    }

    return '"' +
        texto.replace(/"/g, '""') +
        '"';
}


// Exportar relatório de lotes em CSV
function exportarCSV() {
    try {
        const lotes = lotesFiltrados(
            lerLista("lotes")
        );

        if (lotes.length === 0) {
            throw new Error(
                "Não existem lotes para exportar."
            );
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
            const produto = encontrarProduto(
                lote.codigoProduto
            );

            linhas.push([
                produto
                    ? produto.nome
                    : lote.nomeProduto,
                lote.codigoProduto,
                lote.codigoLote,
                lote.quantidade,
                formatarData(lote.dataEntrada),
                formatarData(lote.validade),
                classificarLote(lote).texto
            ]);
        });

        const conteudo = "\uFEFF" +
            linhas.map(linha =>
                linha.map(protegerCSV).join(";")
            ).join("\r\n");

        const arquivo = new Blob(
            [conteudo],
            {
                type: "text/csv;charset=utf-8"
            }
        );

        const url = URL.createObjectURL(
            arquivo
        );

        const link = document.createElement("a");

        link.href = url;

        link.download =
            "relatorio_lotes.csv";

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

        $("mensagemLista").textContent =
            "Relatório CSV exportado com sucesso.";

    } catch (erro) {
        $("mensagemLista").textContent =
            "Erro: " + erro.message;
    }
}


// Ativar eventos da página
const formularioLote = $("formLote");

if (formularioLote) {
    formularioLote.addEventListener(
        "submit",
        cadastrarLote
    );
}

if ($("pesquisa")) {
    $("pesquisa").addEventListener(
        "input",
        carregarLotes
    );
}

if ($("filtroSituacao")) {
    $("filtroSituacao").addEventListener(
        "change",
        carregarLotes
    );
}

if ($("atualizarLista")) {
    $("atualizarLista").addEventListener(
        "click",
        () => {
            preencherProdutos();
            carregarLotes();
        }
    );
}

if ($("exportarCSV")) {
    $("exportarCSV").addEventListener(
        "click",
        exportarCSV
    );
}


// Iniciar a página
try {
    preencherProdutos();

    carregarLotes();

} catch (erro) {
    if ($("mensagemCadastro")) {
        $("mensagemCadastro").textContent =
            "Erro ao iniciar: " +
            erro.message;
    }
}
