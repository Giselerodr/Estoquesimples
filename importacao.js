
"use strict";

const CAMPOS = [
    "nome",
    "categoria",
    "codigo",
    "quantidade",
    "estoqueMinimo",
    "validade"
];

let analiseAtual = null;

const elemento = id => document.getElementById(id);

function mostrarMensagem(id, texto) {
    elemento(id).textContent = texto;
}

function lerProdutos() {
    const texto = localStorage.getItem("produtos");

    if (texto === null) return [];

    const dados = JSON.parse(texto);

    if (!Array.isArray(dados)) {
        throw new Error("O cadastro de produtos está inválido.");
    }

    return dados;
}

function normalizarCodigo(valor) {
    return String(valor ?? "").trim().toLowerCase();
}

function numeroCSV(valor) {
    const texto = String(valor ?? "").trim();

    if (!/^\d+(?:[.,]\d+)?$/.test(texto)) {
        return null;
    }

    const resultado = Number(texto.replace(",", "."));

    return Number.isFinite(resultado) ? resultado : null;
}

function dataISO(valor) {
    const texto = String(valor ?? "").trim();
    let ano, mes, dia;

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        [ano, mes, dia] = texto.split("-").map(Number);
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

    return [
        String(ano).padStart(4, "0"),
        String(mes).padStart(2, "0"),
        String(dia).padStart(2, "0")
    ].join("-");
}

// Leitor CSV com suporte a aspas, vírgulas,
// ponto e vírgula e campos com quebras de linha.

function analisarCSV(texto, separador) {
    const linhas = [];
    let linha = [];
    let campo = "";
    let entreAspas = false;

    for (let i = 0; i < texto.length; i++) {
        const caractere = texto[i];

        if (caractere === '"') {
            if (entreAspas && texto[i + 1] === '"') {
                campo += '"';
                i++;
            } else if (
                entreAspas ||
                campo.length === 0
            ) {
                entreAspas = !entreAspas;
            } else {
                throw new Error(
                    "Aspas em posição inválida no CSV."
                );
            }
        } else if (caractere === separador && !entreAspas) {
            linha.push(campo);
            campo = "";
        } else if (
            (caractere === "\n" || caractere === "\r") &&
            !entreAspas
        ) {
            linha.push(campo);

            if (linha.some(valor => valor.trim() !== "")) {
                linhas.push(linha);
            }

            linha = [];
            campo = "";

            if (caractere === "\r" && texto[i + 1] === "\n") {
                i++;
            }
        } else {
            campo += caractere;
        }
    }

    if (entreAspas) {
        throw new Error(
            "O arquivo possui aspas sem fechamento."
        );
    }

    linha.push(campo);

    if (linha.some(valor => valor.trim() !== "")) {
        linhas.push(linha);
    }

    return linhas;
}

function identificarSeparador(cabecalho) {
    const virgulas = (cabecalho.match(/,/g) || []).length;
    const pontos = (cabecalho.match(/;/g) || []).length;

    return pontos >= virgulas ? ";" : ",";
}

function lerPlanilha(texto) {
    const conteudo = texto.replace(/^\uFEFF/, "");
    const primeiraLinha = conteudo.split(/\r?\n/, 1)[0];

    const separador = identificarSeparador(primeiraLinha);
    const linhas = analisarCSV(conteudo, separador);

    if (linhas.length < 2) {
        throw new Error(
            "A planilha precisa conter cabeçalho e produtos."
        );
    }

    const cabecalho = linhas[0].map(
        campo => campo.trim()
    );

    if (
        cabecalho.length !== CAMPOS.length ||
        !CAMPOS.every(
            (campo, indice) => cabecalho[indice] === campo
        )
    ) {
        throw new Error(
            "As colunas devem estar nesta ordem: " +
            CAMPOS.join(", ")
        );
    }

    return linhas.slice(1).map((valores, indice) => {
        const registro = {};

        CAMPOS.forEach((campo, posicao) => {
            registro[campo] = String(
                valores[posicao] ?? ""
            ).trim();
        });

        return {
            linha: indice + 2,
            registro,
            colunasCorretas: valores.length === CAMPOS.length
        };
    });
}

function validarRegistro(item) {
    const p = item.registro;
    const erros = [];

    if (!item.colunasCorretas) {
        erros.push("Quantidade incorreta de colunas");
    }

    if (!p.nome) erros.push("Nome obrigatório");
    if (!p.categoria) erros.push("Categoria obrigatória");
    if (!p.codigo) erros.push("Código obrigatório");

    const quantidade = numeroCSV(p.quantidade);
    const minimo = numeroCSV(p.estoqueMinimo);
    const validade = dataISO(p.validade);

    if (quantidade === null) {
        erros.push("Quantidade inválida");
    }

    if (minimo === null) {
        erros.push("Estoque mínimo inválido");
    }

    if (!validade) {
        erros.push("Data de validade inválida");
    }

    return {
        ...item,
        codigoNormalizado: normalizarCodigo(p.codigo),
        quantidade,
        minimo,
        validade,
        erros
    };
}

function construirAnalise(linhas, produtosAtuais) {
    const codigos = new Set();
    const existentes = new Map();

    produtosAtuais.forEach((produto, indice) => {
        const codigo = normalizarCodigo(produto.codigo);

        if (codigo && !existentes.has(codigo)) {
            existentes.set(codigo, indice);
        }
    });

    return linhas.map(linha => {
        const item = validarRegistro(linha);

        if (item.codigoNormalizado) {
            if (codigos.has(item.codigoNormalizado)) {
                item.erros.push(
                    "Código repetido na planilha"
                );
            }

            codigos.add(item.codigoNormalizado);
        }

        item.indiceExistente = existentes.has(
            item.codigoNormalizado
        ) ? existentes.get(item.codigoNormalizado) : -1;

        item.tipo = item.erros.length
            ? "erro"
            : item.indiceExistente >= 0
                ? "existente"
                : "novo";

        return item;
    });
}

function atualizarIndicadores(itens) {
    elemento("totalLinhas").textContent = itens.length;

    elemento("totalNovos").textContent =
        itens.filter(i => i.tipo === "novo").length;

    elemento("totalExistentes").textContent =
        itens.filter(i => i.tipo === "existente").length;

    elemento("totalErros").textContent =
        itens.filter(i => i.tipo === "erro").length;
}

function adicionarCelula(linha, valor) {
    const td = document.createElement("td");
    td.textContent = String(valor ?? "");
    linha.appendChild(td);
}

function mostrarTabela(itens) {
    const tabela = elemento("tabelaImportacao");
    tabela.replaceChildren();

    itens.forEach(item => {
        const tr = document.createElement("tr");
        const p = item.registro;

        adicionarCelula(tr, item.linha);
        adicionarCelula(tr, p.nome);
        adicionarCelula(tr, p.categoria);
        adicionarCelula(tr, p.codigo);
        adicionarCelula(tr, p.quantidade);
        adicionarCelula(tr, p.estoqueMinimo);
        adicionarCelula(tr, p.validade);

        const td = document.createElement("td");
        const etiqueta = document.createElement("span");

        etiqueta.className = "etiqueta " + item.tipo;

        etiqueta.textContent = item.tipo === "erro"
            ? item.erros.join("; ")
            : item.tipo === "existente"
                ? "Já cadastrado"
                : "Novo produto";

        td.appendChild(etiqueta);
        tr.appendChild(td);
        tabela.appendChild(tr);
    });
}

function invalidarAnalise() {
    analiseAtual = null;
    elemento("confirmarImportacao").disabled = true;
    mostrarMensagem("mensagemResultado", "");
}

async function analisarArquivo() {
    invalidarAnalise();

    const arquivo = elemento("arquivoCSV").files[0];

    if (!arquivo) {
        mostrarMensagem(
            "mensagemAnalise",
            "Selecione uma planilha CSV."
        );
        return;
    }

    if (!arquivo.name.toLowerCase().endsWith(".csv")) {
        mostrarMensagem(
            "mensagemAnalise",
            "Selecione um arquivo com extensão .csv."
        );
        return;
    }

    if (arquivo.size > 5 * 1024 * 1024) {
        mostrarMensagem(
            "mensagemAnalise",
            "O arquivo não pode ultrapassar 5 MB."
        );
        return;
    }

    try {
        const texto = await arquivo.text();
        const produtos = lerProdutos();
        const linhas = lerPlanilha(texto);
        const itens = construirAnalise(linhas, produtos);

        analiseAtual = {
            itens,
            versaoProdutos: localStorage.getItem("produtos")
        };

        atualizarIndicadores(itens);
        mostrarTabela(itens);

        const erros = itens.filter(i => i.tipo === "erro");
        const validos = itens.filter(i => i.tipo !== "erro");

        elemento("confirmarImportacao").disabled =
            erros.length > 0 || validos.length === 0;

        mostrarMensagem(
            "mensagemAnalise",
            erros.length > 0
                ? "Foram encontradas " + erros.length +
                  " linha(s) inválida(s). Corrija a planilha " +
                  "e analise novamente. Nenhum produto foi salvo."
                : "Planilha analisada com sucesso. " +
                  "Confira a tabela e confirme a importação."
        );
    } catch (erro) {
        atualizarIndicadores([]);
        mostrarTabela([]);
        mostrarMensagem(
            "mensagemAnalise",
            "Erro: " + erro.message
        );
    }
}

function criarProduto(item) {
    const p = item.registro;

    return {
        nome: p.nome,
        categoria: p.categoria,
        codigo: p.codigo,
        quantidade: item.quantidade,
        estoqueInicial: item.quantidade,
        totalEntradas: 0,
        totalSaidas: 0,
        estoqueMinimo: item.minimo,
        validade: item.validade,
        ativo: true
    };
}

function atualizarProduto(atual, item) {
    const entradas = Number(atual.totalEntradas) || 0;
    const saidas = Number(atual.totalSaidas) || 0;

    return {
        ...atual,
        nome: item.registro.nome,
        categoria: item.registro.categoria,
        codigo: atual.codigo,
        quantidade: item.quantidade,
        // Ajusta a base para manter o histórico
        // sem somar novamente as movimentações.
        estoqueInicial:
            item.quantidade - entradas + saidas,
        totalEntradas: entradas,
        totalSaidas: saidas,
        estoqueMinimo: item.minimo,
        validade: item.validade,
        ativo: atual.ativo !== false
    };
}

function confirmarImportacao() {
    if (!analiseAtual) return;

    try {
        if (
            localStorage.getItem("produtos") !==
            analiseAtual.versaoProdutos
        ) {
            throw new Error(
                "O cadastro foi alterado desde a análise. " +
                "Analise a planilha novamente."
            );
        }

        const itens = analiseAtual.itens;

        if (itens.some(item => item.tipo === "erro")) {
            throw new Error(
                "Existem linhas inválidas na planilha."
            );
        }

        const modo = elemento("modoImportacao").value;
        const produtos = lerProdutos();

        let novos = 0;
        let atualizados = 0;
        let ignorados = 0;

        itens.forEach(item => {
            if (item.tipo === "novo") {
                produtos.push(criarProduto(item));
                novos++;
            } else if (item.tipo === "existente") {
                if (modo === "atualizar") {
                    produtos[item.indiceExistente] =
                        atualizarProduto(
                            produtos[item.indiceExistente],
                            item
                        );

                    atualizados++;
                } else {
                    ignorados++;
                }
            }
        });

        if (modo === "atualizar" && atualizados > 0) {
            const confirmou = confirm(
                "Você escolheu atualizar " + atualizados +
                " produto(s) existente(s).\n\n" +
                "As quantidades da planilha substituirão " +
                "os saldos atuais.\n\n" +
                "Você já realizou um backup?\n" +
                "Deseja continuar?"
            );

            if (!confirmou) return;
        }

        localStorage.setItem(
            "produtos",
            JSON.stringify(produtos)
        );

        invalidarAnalise();

        mostrarMensagem(
            "mensagemResultado",
            "Importação concluída!\n" +
            "Novos produtos: " + novos + "\n" +
            "Produtos atualizados: " + atualizados + "\n" +
            "Produtos ignorados: " + ignorados
        );

        mostrarMensagem(
            "mensagemAnalise",
            "Importação finalizada. Para importar novamente, " +
            "selecione e analise a planilha."
        );
    } catch (erro) {
        mostrarMensagem(
            "mensagemResultado",
            "Não foi possível importar: " + erro.message
        );
    }
}

function baixarModelo() {
    const linhas = [
        CAMPOS,
        [
            "Arroz Branco 5kg",
            "Mercearia",
            "MER001",
            "100",
            "20",
            "2027-03-15"
        ],
        [
            "Feijão Carioca 1kg",
            "Mercearia",
            "MER002",
            "120",
            "15",
            "2027-03-15"
        ],
        [
            "Óleo de Soja 900ml",
            "Mercearia",
            "MER004",
            "8",
            "10",
            "2027-02-18"
        ]
    ];

    const conteudo = linhas.map(linha =>
        linha.map(valor =>
            '"' + String(valor).replace(/"/g, '""') + '"'
        ).join(";")
    ).join("\r\n");

    const arquivo = new Blob(
        ["\uFEFF" + conteudo],
        { type: "text/csv;charset=utf-8" }
    );

    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");

    link.href = url;
    link.download = "modelo_importacao_produtos.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

elemento("baixarModelo")
    .addEventListener("click", baixarModelo);

elemento("analisarArquivo")
    .addEventListener("click", analisarArquivo);

elemento("confirmarImportacao")
    .addEventListener("click", confirmarImportacao);

elemento("arquivoCSV")
    .addEventListener("change", invalidarAnalise);

elemento("modoImportacao")
    .addEventListener("change", invalidarAnalise);
