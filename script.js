
const formulario = document.getElementById("formProduto");
const listaProdutos = document.getElementById("listaProdutos");
const listaAlertas = document.getElementById("listaAlertas");
const listaValidades = document.getElementById("listaValidades");

const pesquisa = document.getElementById("pesquisa");
const filtroSituacao = document.getElementById("filtroSituacao");
const mensagem = document.getElementById("mensagem");

const tituloFormulario = document.getElementById("tituloFormulario");
const botaoSalvar = document.getElementById("botaoSalvar");
const botaoCancelar = document.getElementById("botaoCancelar");
const avisoEdicao = document.getElementById("avisoEdicao");

let produtos = JSON.parse(localStorage.getItem("produtos")) || [];
let indiceEdicao = null;

// Salvar produtos no navegador
function salvarProdutos() {
    localStorage.setItem("produtos", JSON.stringify(produtos));
}

// Compatibilidade com produtos já cadastrados
function estoqueInicial(produto) {
    if (produto.estoqueInicial !== undefined &&
        produto.estoqueInicial !== null) {
        return Number(produto.estoqueInicial);
    }

    return Number(produto.quantidade || 0);
}

// Calcular estoque disponível
function calcularQuantidadeDisponivel(produto) {
    return estoqueInicial(produto)
        + Number(produto.totalEntradas || 0)
        - Number(produto.totalSaidas || 0);
}

// Verificar se produto está ativo
function produtoAtivo(produto) {
    return produto.ativo !== false;
}

// Criar células de texto com segurança
function criarCelula(linha, valor) {
    const celula = document.createElement("td");
    celula.textContent = String(valor);
    linha.appendChild(celula);
    return celula;
}

// Mostrar mensagem
function mostrarMensagem(texto) {
    mensagem.textContent = texto;
}

// Formatar validade
function formatarData(data) {
    if (!data) return "Não informada";

    const partes = data.split("-");
    if (partes.length !== 3) return data;

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

// Cadastrar ou editar
formulario.addEventListener("submit", function(event) {
    event.preventDefault();

    const nome = document.getElementById("nome").value.trim();
    const categoria = document.getElementById("categoria").value.trim();
    const codigo = document.getElementById("codigo").value.trim();
    const quantidade = Number(
        document.getElementById("quantidade").value
    );
    const estoqueMinimo = Number(
        document.getElementById("estoqueMinimo").value
    );
    const validade = document.getElementById("validade").value;

    if (!nome || !categoria || !codigo) {
        mostrarMensagem("Preencha os campos obrigatórios.");
        return;
    }

    if (!Number.isFinite(quantidade) ||
        !Number.isFinite(estoqueMinimo) ||
        quantidade < 0 || estoqueMinimo < 0) {
        mostrarMensagem("Informe quantidades válidas.");
        return;
    }

    const codigoDuplicado = produtos.some(function(produto, indice) {
        return produto.codigo?.trim().toLowerCase() ===
            codigo.toLowerCase() && indice !== indiceEdicao;
    });

    if (codigoDuplicado) {
        mostrarMensagem("Já existe um produto com esse código.");
        return;
    }

    if (indiceEdicao === null) {
        // Novo produto
        const produto = {
            nome: nome,
            categoria: categoria,
            codigo: codigo,
            quantidade: quantidade,
            estoqueInicial: quantidade,
            totalEntradas: 0,
            totalSaidas: 0,
            estoqueMinimo: estoqueMinimo,
            validade: validade,
            ativo: true
        };

        produtos.push(produto);
        mostrarMensagem("Produto cadastrado com sucesso!");

    } else {
        // Produto existente: preservar movimentações
        const produto = produtos[indiceEdicao];

        produto.nome = nome;
        produto.categoria = categoria;

        // Não alterar código se houver movimentações
        produto.codigo = codigo;

        produto.estoqueMinimo = estoqueMinimo;
        produto.validade = validade;

        // Preserva o estoque inicial e as movimentações.
        // Quantidade não é alterada durante a edição.
        mostrarMensagem("Produto atualizado com sucesso!");
    }

    salvarProdutos();
    cancelarEdicao(false);
    atualizarTelas();
});

// Iniciar edição
function editarProduto(indice) {
    const produto = produtos[indice];

    if (!produto) return;

    indiceEdicao = indice;

    document.getElementById("nome").value = produto.nome || "";
    document.getElementById("categoria").value =
        produto.categoria || "";
    document.getElementById("codigo").value = produto.codigo || "";
    document.getElementById("quantidade").value =
        estoqueInicial(produto);
    document.getElementById("estoqueMinimo").value =
        produto.estoqueMinimo || 0;
    document.getElementById("validade").value =
        produto.validade || "";

    // Evita modificar a base dos cálculos históricos
    document.getElementById("quantidade").disabled = true;

    // Código pode ser usado para vincular movimentações
    document.getElementById("codigo").disabled = true;

    tituloFormulario.textContent = "Editar produto";
    botaoSalvar.textContent = "Salvar alterações";
    botaoCancelar.hidden = false;
    avisoEdicao.hidden = false;

    mostrarMensagem("Editando: " + produto.nome);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Cancelar edição
function cancelarEdicao(limparMensagem = true) {
    indiceEdicao = null;
    formulario.reset();

    document.getElementById("quantidade").disabled = false;
    document.getElementById("codigo").disabled = false;

    tituloFormulario.textContent = "Cadastrar produto";
    botaoSalvar.textContent = "Cadastrar produto";
    botaoCancelar.hidden = true;
    avisoEdicao.hidden = true;

    if (limparMensagem) {
        mostrarMensagem("");
    }
}

botaoCancelar.addEventListener("click", function() {
    cancelarEdicao();
});

// Desativar ou reativar
function alternarSituacao(indice) {
    const produto = produtos[indice];

    if (!produto) return;

    const estavaAtivo = produtoAtivo(produto);

    const pergunta = estavaAtivo
        ? "Deseja desativar este produto?"
        : "Deseja reativar este produto?";

    if (!confirm(pergunta)) return;

    produto.ativo = !estavaAtivo;

    salvarProdutos();
    cancelarEdicao();
    atualizarTelas();

    mostrarMensagem(
        produto.ativo
            ? "Produto reativado com sucesso!"
            : "Produto desativado com sucesso!"
    );
}

// Verificar movimentações registradas
function possuiMovimentacoes(produto) {
    const entradas = JSON.parse(
        localStorage.getItem("entradas") || "[]"
    );

    const saidas = JSON.parse(
        localStorage.getItem("saidas") || "[]"
    );

    // Não excluir se houver totais de movimentações
    if (Number(produto.totalEntradas || 0) !== 0 ||
        Number(produto.totalSaidas || 0) !== 0) {
        return true;
    }

    // Proteção adicional para registros armazenados
    const registros = [...entradas, ...saidas];

    return registros.some(function(registro) {
        return registro.codigo === produto.codigo ||
            registro.produtoCodigo === produto.codigo ||
            registro.produto === produto.codigo ||
            registro.produto === produto.nome ||
            registro.nome === produto.nome;
    });
}

// Excluir produto sem movimentações
function excluirProduto(indice) {
    const produto = produtos[indice];

    if (!produto) return;

    if (possuiMovimentacoes(produto)) {
        alert(
            "Este produto possui movimentações registradas. " +
            "Para preservar o histórico, desative-o em vez de excluir."
        );
        return;
    }

    if (!confirm(
        `Deseja excluir permanentemente "${produto.nome}"?`
    )) {
        return;
    }

    produtos.splice(indice, 1);

    salvarProdutos();
    cancelarEdicao();
    atualizarTelas();

    mostrarMensagem("Produto excluído com sucesso!");
}

// Criar botões das ações
function criarBotao(texto, classe, acao) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = texto;
    botao.className = classe;
    botao.addEventListener("click", acao);
    return botao;
}

// Mostrar produtos
function mostrarProdutos() {
    listaProdutos.innerHTML = "";

    const termo = pesquisa.value.trim().toLowerCase();
    const filtro = filtroSituacao.value;

    let encontrados = 0;

    produtos.forEach(function(produto, indice) {
        const disponivel = calcularQuantidadeDisponivel(produto);
        const minimo = Number(produto.estoqueMinimo || 0);
        const ativo = produtoAtivo(produto);
        const baixo = disponivel <= minimo;

        const correspondePesquisa = [
            produto.nome,
            produto.categoria,
            produto.codigo
        ].some(function(valor) {
            return String(valor || "").toLowerCase().includes(termo);
        });

        let correspondeFiltro = true;

        if (filtro === "ativos") correspondeFiltro = ativo;
        if (filtro === "inativos") correspondeFiltro = !ativo;
        if (filtro === "baixo") correspondeFiltro = ativo && baixo;

        if (!correspondePesquisa || !correspondeFiltro) return;

        encontrados++;

        const linha = document.createElement("tr");

        criarCelula(linha, produto.nome);
        criarCelula(linha, produto.categoria);
        criarCelula(linha, produto.codigo);
        criarCelula(linha, disponivel);
        criarCelula(linha, minimo);
        criarCelula(linha, formatarData(produto.validade));

        const situacao = criarCelula(
            linha,
            !ativo ? "Desativado" :
            baixo ? "Estoque baixo" : "Normal"
        );

        situacao.className = !ativo ? "inativo" :
            baixo ? "baixo" : "normal";

        const acoes = document.createElement("td");

        acoes.appendChild(criarBotao(
            "Editar",
            "secundario",
            function() { editarProduto(indice); }
        ));

        acoes.appendChild(criarBotao(
            ativo ? "Desativar" : "Reativar",
            "secundario",
            function() { alternarSituacao(indice); }
        ));

        acoes.appendChild(criarBotao(
            "Excluir",
            "perigo",
            function() { excluirProduto(indice); }
        ));

        linha.appendChild(acoes);
        listaProdutos.appendChild(linha);
    });

    if (encontrados === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");
        celula.colSpan = 8;
        celula.textContent = "Nenhum produto encontrado.";
        linha.appendChild(celula);
        listaProdutos.appendChild(linha);
    }
}

// Mostrar alertas de estoque
function mostrarAlertas() {
    listaAlertas.innerHTML = "";

    produtos.forEach(function(produto) {
        if (!produtoAtivo(produto)) return;

        const disponivel = calcularQuantidadeDisponivel(produto);
        const minimo = Number(produto.estoqueMinimo || 0);

        if (disponivel <= minimo) {
            const linha = document.createElement("tr");

            criarCelula(linha, produto.nome);
            criarCelula(linha, disponivel);
            criarCelula(linha, minimo);
            criarCelula(linha, "Necessário repor estoque");

            listaAlertas.appendChild(linha);
        }
    });
}

// Mostrar alertas de validade
function mostrarValidades() {
    listaValidades.innerHTML = "";

    const agora = new Date();
    const hoje = new Date(
        agora.getFullYear(),
        agora.getMonth(),
        agora.getDate()
    );

    produtos.forEach(function(produto) {
        if (!produtoAtivo(produto) || !produto.validade) return;

        const data = new Date(produto.validade + "T00:00:00");
        const dias = Math.round(
            (data - hoje) / (1000 * 60 * 60 * 24)
        );

        if (dias <= 7) {
            const linha = document.createElement("tr");

            criarCelula(linha, produto.nome);
            criarCelula(linha, formatarData(produto.validade));

            criarCelula(
                linha,
                dias < 0 ? "Produto vencido" :
                dias === 0 ? "Vence hoje" :
                "Próximo do vencimento"
            );

            listaValidades.appendChild(linha);
        }
    });
}

// Atualizar todas as listas
function atualizarTelas() {
    mostrarProdutos();
    mostrarAlertas();
    mostrarValidades();
}

pesquisa.addEventListener("input", mostrarProdutos);
filtroSituacao.addEventListener("change", mostrarProdutos);

atualizarTelas();
