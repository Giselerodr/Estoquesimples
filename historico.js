
const listaHistorico =
    document.getElementById("listaHistorico");

const pesquisa =
    document.getElementById("pesquisa");

const filtroTipo =
    document.getElementById("tipo");

const dataInicio =
    document.getElementById("inicio");

const dataFim =
    document.getElementById("fim");

const totalEntradas =
    document.getElementById("totalEntradas");

const totalSaidas =
    document.getElementById("totalSaidas");

const totalMovimentacoes =
    document.getElementById("totalMovimentacoes");

const quantidadeRegistros =
    document.getElementById("quantidadeRegistros");

const botaoExportar =
    document.getElementById("exportar");


// Ler registros salvos no navegador
function lerRegistros(chave) {
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


// Juntar entradas e saídas
function obterHistorico() {
    const entradas = lerRegistros("entradas");
    const saidas = lerRegistros("saidas");

    const historicoEntradas = entradas.map(function(item) {
        return {
            produto: item.produto || "Não informado",
            codigo: item.codigo || item.produtoCodigo || "",
            quantidade: Number(item.quantidade || 0),
            data: item.data || "",
            tipo: "Entrada"
        };
    });

    const historicoSaidas = saidas.map(function(item) {
        return {
            produto: item.produto || "Não informado",
            codigo: item.codigo || item.produtoCodigo || "",
            quantidade: Number(item.quantidade || 0),
            data: item.data || "",
            tipo: "Saída"
        };
    });

    return [...historicoEntradas, ...historicoSaidas]
        .sort(function(a, b) {
            return b.data.localeCompare(a.data);
        });
}


// Formatar data para exibição
function formatarData(data) {
    if (!data) return "Não informada";

    const partes = data.split("-");

    if (partes.length !== 3) return data;

    return partes[2] + "/" +
           partes[1] + "/" +
           partes[0];
}


// Formatar quantidade
function formatarQuantidade(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        maximumFractionDigits: 2
    });
}


// Aplicar filtros
function obterRegistrosFiltrados() {
    const termo = pesquisa.value.trim().toLowerCase();
    const tipo = filtroTipo.value;
    const inicio = dataInicio.value;
    const fim = dataFim.value;

    return obterHistorico().filter(function(item) {

        const correspondePesquisa =
            item.produto.toLowerCase().includes(termo) ||
            item.codigo.toLowerCase().includes(termo);

        const correspondeTipo =
            tipo === "todos" || item.tipo === tipo;

        const correspondeInicio =
            !inicio || item.data >= inicio;

        const correspondeFim =
            !fim || item.data <= fim;

        return correspondePesquisa &&
               correspondeTipo &&
               correspondeInicio &&
               correspondeFim;
    });
}


// Criar célula com segurança
function criarCelula(linha, texto) {
    const celula = document.createElement("td");
    celula.textContent = String(texto);
    linha.appendChild(celula);
    return celula;
}


// Mostrar histórico na tabela
function mostrarHistorico() {
    const registros = obterRegistrosFiltrados();

    listaHistorico.innerHTML = "";

    let somaEntradas = 0;
    let somaSaidas = 0;

    registros.forEach(function(item) {
        const linha = document.createElement("tr");

        criarCelula(linha, formatarData(item.data));
        criarCelula(linha, item.produto);
        criarCelula(linha, item.codigo || "—");

        const celulaTipo = criarCelula(linha, item.tipo);

        celulaTipo.className =
            item.tipo === "Entrada" ? "entrada" : "saida";

        criarCelula(
            linha,
            formatarQuantidade(item.quantidade)
        );

        listaHistorico.appendChild(linha);

        if (item.tipo === "Entrada") {
            somaEntradas += item.quantidade;
        } else {
            somaSaidas += item.quantidade;
        }
    });

    totalEntradas.textContent =
        formatarQuantidade(somaEntradas);

    totalSaidas.textContent =
        formatarQuantidade(somaSaidas);

    totalMovimentacoes.textContent = registros.length;

    quantidadeRegistros.textContent =
        registros.length + " movimentação(ões) encontrada(s).";

    if (registros.length === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = 5;
        celula.textContent =
            "Nenhuma movimentação encontrada.";

        linha.appendChild(celula);
        listaHistorico.appendChild(linha);
    }
}


// Preparar valor para CSV
function campoCSV(valor) {
    let texto = String(valor ?? "");

    // Evitar interpretação como fórmula no Excel
    if (/^[\s]*[=+\-@\t\r]/.test(texto)) {
        texto = "'" + texto;
    }

    return '"' + texto.replace(/"/g, '""') + '"';
}


// Exportar registros filtrados
function exportarCSV() {
    const registros = obterRegistrosFiltrados();

    if (registros.length === 0) {
        alert("Não há movimentações para exportar.");
        return;
    }

    const linhas = [
        ["Data", "Produto", "Código", "Tipo", "Quantidade"]
    ];

    registros.forEach(function(item) {
        linhas.push([
            formatarData(item.data),
            item.produto,
            item.codigo,
            item.tipo,
            String(item.quantidade).replace(".", ",")
        ]);
    });

    const conteudo = linhas.map(function(linha) {
        return linha.map(campoCSV).join(";");
    }).join("\r\n");

    const arquivo = new Blob(
        ["\uFEFF" + conteudo],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");

    link.href = url;
    link.download = "historico_estoque.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}


// Atualizar ao modificar os filtros
pesquisa.addEventListener("input", mostrarHistorico);
filtroTipo.addEventListener("change", mostrarHistorico);
dataInicio.addEventListener("change", mostrarHistorico);
dataFim.addEventListener("change", mostrarHistorico);

botaoExportar.addEventListener("click", exportarCSV);


// Atualizar ao retornar para a página
window.addEventListener("pageshow", mostrarHistorico);


// Iniciar
mostrarHistorico();
