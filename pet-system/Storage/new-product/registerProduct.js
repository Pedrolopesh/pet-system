var product_data = JSON.parse(localStorage.getItem("Products"));

// window.addEventListener("load", function(){ (employId()) }

window.addEventListener('load', function(){
    productId()
});

if (product_data == null){
    product_data = [];
}

function cancel() {
    document.location.reload(true)
}

function productId(){

    // var employee_id = product_data.length
    
    // var employee_id_text = 0
    
    if(product_data == ''){
        var productCode = document.querySelector('#procuct_code')
        productCode.innerHTML = 1
    }else{

    for (let i=0; i < product_data.length; i++){
        let product_id_text = parseFloat(product_data[i].id)+1;
        
        var productCode = document.querySelector('#procuct_code')
        productCode.innerHTML = product_id_text;

        console.log(product_data[i].id);
    }
}

}

function register(){

    var product_id = product_data.length + 1
    console.log(product_id)


    var productName = document.querySelector('#product_name').value
    var productPrice = document.querySelector('#product_price').value
    var productQuant = document.querySelector('#product_quant').value

    data_product = {
        id:product_id,
        name: productName,
        price: productPrice,
        quant: productQuant,
    }
    product_data.push(data_product)
    alert("Produto Registrado com sucesso")
    localStorage.setItem("Products", JSON.stringify(product_data));
    document.location.reload(true)
}
console.log(product_data)