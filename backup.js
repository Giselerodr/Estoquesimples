
"use strict";

// Dados que serão incluídos no backup
const CHAVES = [
    "produtos",
    "entradas",
    "saidas",
    "precosFinanceiros",
    "inventarios",
    "lotes",
    "conciliacoes"
];

let backupValidado = null;


// Ler informações armazenadas
function lerDados(chave) {
    const texto = localStorage.getItem(chave);

    if (texto === null) {
        return chave === "precosFinanceiros"
            ? {}
            : [];
    }

    return JSON.parse(texto);
}


// Atualizar resumo da página
function atualizarResumo() {
    try {
        const produtos = lerDados("produtos");
        const entradas = lerDados("entradas");
        const saidas = lerDados("saidas");

        document.getElementById("totalProdutos").textContent =
            Array.isArray(produtos)
                ? produtos.length
                : 0;

        document.getElementById("totalMovimentacoes").textContent =
            (Array.isArray(entradas) ? entradas.length : 0) +
            (Array.isArray(saidas) ? saidas.length : 0);

    } catch (erro) {
        mostrarMensagem(
            "mensagemExportacao",
            "Não foi possível ler os dados armazenados.",
            false
        );
    }
}


// Exibir mensagens
function mostrarMensagem(id, texto, sucesso) {
    const elemento = document.getElementById(id);

    elemento.textContent = texto;

    elemento.className =
        "mensagem " +
        (sucesso ? "sucesso" : "erro");
}


// Gerar estrutura do backup
function gerarBackup() {
    const dados = {};

    CHAVES.forEach(chave => {
        dados[chave] = lerDados(chave);
    });

    return {
        aplicativo: "Estoque Simples",
        versaoBackup: 1,
        criadoEm: new Date().toISOString(),
        dados
    };
}


// Exportar backup em JSON
function exportarBackup() {
    try {
        const backup = gerarBackup();

        const conteudo = JSON.stringify(
            backup,
            null,
            2
        );

        const arquivo = new Blob(
            [conteudo],
            {
                type: "application/json"
            }
        );

        const url = URL.createObjectURL(arquivo);
        const link = document.createElement("a");

        const data = new Date()
            .toISOString()
            .slice(0, 10);

        link.href = url;

        link.download =
            "estoque_simples_backup_" +
            data +
            ".json";

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);

        mostrarMensagem(
            "mensagemExportacao",
            "Arquivo de backup gerado com sucesso.",
            true
        );

    } catch (erro) {
        mostrarMensagem(
            "mensagemExportacao",
            "Erro ao gerar backup: " +
            erro.message,
            false
        );
    }
}


// Verificar se é um objeto válido
function objetoSimples(valor) {
    return valor !== null &&
        typeof valor === "object" &&
        !Array.isArray(valor);
}


// Validar arquivo de backup
function validarBackup(backup) {
    if (!objetoSimples(backup)) {
        throw new Error(
            "O arquivo não contém um backup válido."
        );
    }

    if (
        backup.aplicativo !== "Estoque Simples" ||
        backup.versaoBackup !== 1
    ) {
        throw new Error(
            "O arquivo não pertence a uma versão compatível."
        );
    }

    if (!objetoSimples(backup.dados)) {
        throw new Error(
            "Os dados do backup estão ausentes."
        );
    }

    // Compatibilidade com backups antigos
    // que ainda não tinham inventários
    if (!Object.prototype.hasOwnProperty.call(
        backup.dados,
        "inventarios"
    )) {
        backup.dados.inventarios = [];
    }

    // Compatibilidade com backups antigos
    // que ainda não tinham lotes
    if (!Object.prototype.hasOwnProperty.call(
        backup.dados,
        "lotes"
    )) {
        backup.dados.lotes = [];
    }

    // Compatibilidade com backups anteriores
    // à criação da conciliação de lotes
    if (!Object.prototype.hasOwnProperty.call(
        backup.dados,
        "conciliacoes"
    )) {
        backup.dados.conciliacoes = [];
    }

    // Conferir todas as propriedades
    for (const chave of CHAVES) {
        if (!Object.prototype.hasOwnProperty.call(
            backup.dados,
            chave
        )) {
            throw new Error(
                "O backup não contém: " + chave
            );
        }
    }

    // Validar as listas
    for (const chave of [
        "produtos",
        "entradas",
        "saidas",
        "inventarios",
        "lotes",
        "conciliacoes"
    ]) {
        const lista = backup.dados[chave];

        if (!Array.isArray(lista)) {
            throw new Error(
                "Formato inválido para: " + chave
            );
        }

        if (!lista.every(objetoSimples)) {
            throw new Error(
                "Existem registros inválidos em: " +
                chave
            );
        }
    }

    // Validar preços financeiros
    if (!objetoSimples(
        backup.dados.precosFinanceiros
    )) {
        throw new Error(
            "Os preços financeiros estão em formato inválido."
        );
    }

    // Validar data do backup
    const data = new Date(backup.criadoEm);

    if (
        !backup.criadoEm ||
        Number.isNaN(data.getTime())
    ) {
        throw new Error(
            "A data de criação do backup é inválida."
        );
    }

    return backup;
}


// Limpar validação anterior
function limparValidacao() {
    backupValidado = null;

    document.getElementById(
        "restaurarBackup"
    ).disabled = true;

    document.getElementById(
        "informacoesBackup"
    ).hidden = true;

    document.getElementById(
        "mensagemRestauracao"
    ).textContent = "";
}


// Verificar arquivo selecionado
async function verificarArquivo() {
    limparValidacao();

    const input = document.getElementById(
        "arquivoBackup"
    );

    const arquivo = input.files[0];

    if (!arquivo) {
        mostrarMensagem(
            "mensagemRestauracao",
            "Selecione um arquivo JSON primeiro.",
            false
        );

        return;
    }

    if (arquivo.size > 10 * 1024 * 1024) {
        mostrarMensagem(
            "mensagemRestauracao",
            "O arquivo excede o limite de 10 MB.",
            false
        );

        return;
    }

    try {
        const texto = await arquivo.text();

        const backup = validarBackup(
            JSON.parse(texto)
        );

        backupValidado = backup;

        const dados = backup.dados;

        const informacoes = document.getElementById(
            "informacoesBackup"
        );

        const totalMovimentacoes =
            dados.entradas.length +
            dados.saidas.length;

        informacoes.textContent =
            "Backup criado em: " +
            new Date(backup.criadoEm)
                .toLocaleString("pt-BR") +

            "\nProdutos: " +
            dados.produtos.length +

            "\nMovimentações: " +
            totalMovimentacoes +

            "\nInventários registrados: " +
            dados.inventarios.length +

            "\nLotes cadastrados: " +
            dados.lotes.length +

            "\nConciliações registradas: " +
            dados.conciliacoes.length +

            "\nPreços cadastrados: " +
            Object.keys(
                dados.precosFinanceiros
            ).length;

        informacoes.style.whiteSpace =
            "pre-line";

        informacoes.hidden = false;

        document.getElementById(
            "restaurarBackup"
        ).disabled = false;

        mostrarMensagem(
            "mensagemRestauracao",
            "Arquivo verificado. Confira os dados antes de restaurar.",
            true
        );

    } catch (erro) {
        mostrarMensagem(
            "mensagemRestauracao",
            "Não foi possível validar o arquivo: " +
            erro.message,
            false
        );
    }
}


// Restaurar dados do backup
function restaurarDados() {
    if (!backupValidado) {
        return;
    }

    const confirmou = confirm(
        "ATENÇÃO: a restauração substituirá os dados " +
        "atuais do estoque.\n\n" +
        "Você já salvou um backup dos dados existentes?\n\n" +
        "Deseja continuar?"
    );

    if (!confirmou) {
        return;
    }

    const anteriores = {};

    try {
        const novosDados = {};

        // Preparar dados antes da gravação
        CHAVES.forEach(chave => {
            anteriores[chave] =
                localStorage.getItem(chave);

            novosDados[chave] =
                JSON.stringify(
                    backupValidado.dados[chave]
                );
        });

        // Restaurar todos os conjuntos
        CHAVES.forEach(chave => {
            localStorage.setItem(
                chave,
                novosDados[chave]
            );
        });

        backupValidado = null;

        document.getElementById(
            "restaurarBackup"
        ).disabled = true;

        atualizarResumo();

        mostrarMensagem(
            "mensagemRestauracao",
            "Dados restaurados com sucesso. " +
            "As outras páginas mostrarão os registros " +
            "restaurados quando forem abertas novamente.",
            true
        );

    } catch (erro) {
        // Tentar recuperar dados anteriores
        // caso ocorra uma falha
        try {
            CHAVES.forEach(chave => {
                if (!Object.prototype.hasOwnProperty.call(
                    anteriores,
                    chave
                )) {
                    return;
                }

                if (anteriores[chave] === null) {
                    localStorage.removeItem(chave);
                } else {
                    localStorage.setItem(
                        chave,
                        anteriores[chave]
                    );
                }
            });

        } catch (erroRecuperacao) {
            console.error(
                "Falha ao recuperar dados:",
                erroRecuperacao
            );
        }

        mostrarMensagem(
            "mensagemRestauracao",
            "Falha ao restaurar. Verifique o espaço " +
            "disponível no navegador e preserve " +
            "seu arquivo de backup.",
            false
        );
    }
}


// Eventos da página
document.getElementById("baixarBackup")
    .addEventListener(
        "click",
        exportarBackup
    );

document.getElementById("arquivoBackup")
    .addEventListener(
        "change",
        limparValidacao
    );

document.getElementById("verificarBackup")
    .addEventListener(
        "click",
        verificarArquivo
    );

document.getElementById("restaurarBackup")
    .addEventListener(
        "click",
        restaurarDados
    );

window.addEventListener(
    "pageshow",
    atualizarResumo
);

atualizarResumo();
