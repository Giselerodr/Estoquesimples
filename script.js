const produto = {

    nome: nome,

    categoria: categoria,

    codigo: codigo,

    quantidade: Number(quantidade),

    estoqueInicial: Number(quantidade),

    totalEntradas: 0,

    totalSaidas: 0,

    estoqueMinimo: Number(estoqueMinimo),

    validade: validade

};

produtos.push(produto);

localStorage.setItem("produtos", JSON.stringify(produtos));

alert("Produto cadastrado com sucesso!");

formulario.reset();

mostrarProdutos();
