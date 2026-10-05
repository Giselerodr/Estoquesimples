const formulario = document.querySelector("form");

formulario.addEventListener("submit", function(event) {

    event.preventDefault();

    const nome = document.querySelector('input[name="nome"]').value;
    const categoria = document.querySelector('input[name="categoria"]').value;
    const codigo = document.querySelector('input[name="codigo"]').value;
    const quantidade = document.querySelector('input[name="quantidade"]').value;
    const estoqueMinimo = document.querySelector('input[name="estoqueMinimo"]').value;
    const validade = document.querySelector('input[name="validade"]').value;

    if (
        nome === "" ||
        categoria === "" ||
        codigo === "" ||
        quantidade === "" ||
        estoqueMinimo === "" ||
        validade === ""
    ) {
        alert("Preencha todos os campos.");
        return;
    }

    const produto = {
        nome: nome,
        categoria: categoria,
        codigo: codigo,
        quantidade: quantidade,
        estoqueMinimo: estoqueMinimo,
        validade: validade
    };

    localStorage.setItem("produto", JSON.stringify(produto));

    alert("Produto cadastrado com sucesso!");

    formulario.reset();
});
