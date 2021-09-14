var all_info = [];
var cartArray = [];

var client_data = JSON.parse(localStorage.getItem("Client"));
var info_client_array =[]
// console.log(client_data)


window.addEventListener('load', function(){
    // information()
    allitens()
    // print ()
});

for(var i = 0; i < client_data.length; i++){
    info_client_array[i] = Object.values(client_data[i]);
}

// console.log(info_client_array)


for(var i = 0; i < info_client_array.length; i++){
    client_objects = {}
    client_objects.name = info_client_array[i][0]
    client_objects.adress = info_client_array[i][1]
    client_objects.phone = info_client_array[i][2]
    client_objects.email = info_client_array[i][3]
    client_objects.id = info_client_array[i][4]
    info_client_array[i] = client_objects;
}

// --------------------------------------------------------------------------------------------------------------------------------------------------------------


// adicionando opções de funcionários

var cartArray1 = [];
var all_info1 = [];

var employee_data = JSON.parse(localStorage.getItem("Employee"));
info_employee_array =[]
// console.log(employee_data)

for(var i = 0; i < employee_data.length; i++){
    info_employee_array[i] = Object.values(employee_data[i]);
}



for(var i = 0; i < info_employee_array.length; i++){
    employee_objects = {}
    employee_objects.name = info_employee_array[i][0]
    employee_objects.adress = info_employee_array[i][1]
    employee_objects.phone = info_employee_array[i][2]
    employee_objects.email = info_employee_array[i][3]
    employee_objects.id = info_employee_array[i][4]
    info_employee_array[i] = employee_objects;
}


// --------------------------------------------------------------------------------------------------------------------------------------------------------------
// adicionando opções do produto
var product_data = JSON.parse(localStorage.getItem("Products"));
var array_val = []


// console.log(product_data)


for(var i = 0; i < product_data.length; i++){
    array_val[i] = Object.values(product_data[i]);
}


for(var i = 0; i < array_val.length; i++){
    data_objects = {}
    data_objects.productId = array_val[i][0]
    data_objects.name = array_val[i][1]
    data_objects.price = array_val[i][2]
    data_objects.quant = array_val[i][3]
    array_val[i] = data_objects;
}


// console.log(data_objects)



function allitens() {
    // --------------------------------------------------------------------------------------------------------------------------------------------------------------
    // adicionando opções do produto
    
    var product_values = document.querySelector('#options_product');
    
    for(product in array_val){
        
        var productData = array_val[product];
        // console.log(productData)

        if(productData.quant > 0){
            
            // alert(productData.descricao)


            var item = document.createElement('option')
            item.setAttribute('value', productData.productId)
            item.innerHTML = productData.name
            product_values.appendChild(item)
            
        }
        
    }

    // --------------------------------------------------------------------------------------------------------------------------------------------------------------
    
    // adicionando opções de cliente
    
    var clients = document.querySelector('#options_client');
    
    for(i in info_client_array){
        
        var client_data = info_client_array[i];
        
        
        // alert(productData.descricao)
        
        var client_name = document.createElement('option')
        client_name.setAttribute('id', 'clientName')
        client_name.innerHTML = client_data.name
        clients.appendChild(client_name)
    }
    
    // adicionando opções de funcionário
    
    var employees = document.querySelector('#options_employee');
    
        for(i in info_employee_array){
    
            var employee_data = info_employee_array[i];
    
    
    
                var employee_name = document.createElement('option')
                employee_name.setAttribute('id', 'employeeName')
                employee_name.innerHTML = employee_data.name
                employees.appendChild(employee_name)
        }


// --------------------------------------------------------------------------------------------------------------------------------------------------------------

}

var array_val = []

for(var i = 0; i < product_data.length; i++){
    array_val[i] = Object.values(product_data[i]);
}


for(var i = 0; i < array_val.length; i++){
    data_objects = {}
    data_objects.productId = array_val[i][0]
    data_objects.name = array_val[i][1]
    data_objects.price = array_val[i][2]
    data_objects.quant = array_val[i][3]
    // data_objects.total = (data_objects.quant * data_objects.price)
    array_val[i] = data_objects;
    // alert(data_objects)
}



function getValues() {
    product = document.getElementById('employeeName').value
    product = document.getElementById('employeeName').value
    product = document.getElementById('clientName').value
    product = document.getElementById('employeeName').value
    // console.log(product)


    selectedProduct = document.querySelector('#options_product')
    
    
    let selectedProductData = array_val.filter(function (item) {
        return item.codigoProduto == selectedProduct.value;
    });

    
    for(let i = 0; i < selectedProductData.length; i++){
        
        quantcliente = parseFloat(document.getElementById('quantidade_produto').value)
        // console.log(selectedProductData[0].codigoProduto)
        // console.log(selectedProductData[i].codigoProduto)

    }
}



function print() {
    
    selectedProduct = document.querySelector('#options_product').value
    
    
    // var i;
    
    let selectedProductData = array_val.filter(function (item) {
        // console.log(selectedProduct.value)
        console.log(selectedProduct)
        return item.productId == selectedProduct;
    });
    
    
    
    for(let i = 0; i < selectedProductData.length; i++){
        
        // let code = selectedProductData[i].id;
        
        quantcliente = parseFloat(document.getElementById('quantidade_produto').value)
        // console.log(quantcliente)
        
        var code_employe = parseFloat(employee_data[i].id)
            

        var infoTable = document.querySelector('#table')

        var tableLine = document.createElement('tr')

        var code = document.createElement('th')
        var nameTable = document.createElement('th')
        var quantTable = document.createElement('th')
        var priceTable = document.createElement('th')
        // var actionTable = document.createElement('th')

        
        code.setAttribute('id','code_table')
        nameTable.setAttribute('class','info-table')
        quantTable.setAttribute('class','info-table')
        priceTable.setAttribute('class','info-table')
        // actionTable.setAttribute('id','action_table')
        
        // var actionLocator = document.querySelector('#action_table')
        
        // console.log("aqui"+selectedProductData[0].productId)

        code.innerHTML = selectedProductData[i].productId
        nameTable.innerHTML = selectedProductData[0].name
        quantTable.innerHTML = quantcliente
        priceTable.innerHTML = "R$ "+selectedProductData[0].price
        
        tableLine.appendChild(code)
        tableLine.appendChild(nameTable)
        tableLine.appendChild(quantTable)
        tableLine.appendChild(priceTable)
        // tableLine.appendChild(actionTable)
        
        infoTable.appendChild(tableLine)
        
        var details = document.createElement('button')
        details.setAttribute('id', 'detailModal_'+code_employe)

        details.setAttribute('class','badge badge-danger br-c btn mt-1 ac')
        // actionTable.appendChild(details)
        details.innerHTML = 'X'
        
        let detail = 'detail_'+ code_employe;
        
        
        // console.log(deleteClass)
        
        // addListeners(deleteClass)
        
        getTotal(selectedProductData[0], parseFloat(document.getElementById('quantidade_produto').value))
    }
}

function clean() {
    if(confirm("Cancelar compra?")){
            document.location.reload(true)
        }
    }




function getTotal(product, quant){

    var client_name = document.querySelector('#options_client').value
    var employeeName = document.querySelector('#options_employee').value
    
    
    var obj= Object.assign({}, product);
    obj.client = client_name;
    obj.employee = employeeName;
    obj.quant = quant;
    
    
    cartArray.push(obj)
    // console.log(cartArray)
    
    let total = 0;
    for(i in cartArray){
        total =  total + (parseFloat(cartArray[i].quant) * parseFloat(cartArray[i].price));
    }
    results = document.querySelector('#purchase_result').innerHTML = total.toFixed(2)
    
    
    // var purchaseTotal = Object.assign({}, product);
    // obj.totalPurchase = total;
    // cartArray.push(purchaseTotal)
    // console.log(cartArray[0])
    
    return results
}


function purchase(){
            // sellArray = []
            var sell_array = JSON.parse(localStorage.getItem("Purchases"));
            
            if (! sell_array){
                sell_array = []
            }
            
            for (i in cartArray) {
                sell_array.push(cartArray[i])
            }

    localStorage.setItem("Purchases", JSON.stringify(sell_array));
    // alert("Compra Efetuada :")
    // setTimeout(function(){ alert("Pagamento realizado com sucesso"); }, 2000)
    
    // var obj= Object.assign({}, sells);
    // obj.client = client_name;
    // obj.employee = employeeName;
    // obj.quant = quant;
    
    // cartArray.push(obj)
    // console.log(cartArray)
    
    
    // var total_sells_array = JSON.parse(localStorage.getItem("TotalSells"));
    // if (! total_sells_array){
        //     total_sells_array = []
        // }
        
        // for (i in cartArray) {
            //     total_sells_array.push(results)
            // }
            
            // localStorage.setItem("TotalSells", JSON.stringify(total_sells_array));
            
            addToSalesStorage(results)
       
}

var total_sells_array = JSON.parse(localStorage.getItem("TotalSells"));

function addToSalesStorage(param){

    var unformatedDate = new Date()
    var year = unformatedDate.getFullYear()
    var month = unformatedDate.getMonth()
    var day = unformatedDate.getDate()

    let purchaseDate = year + "," + (month+1) + "," + day
    
    if (! total_sells_array){
        total_sells_array = []
    }
    
    data_charts = {
        purchaseDay:purchaseDate,
        purchaseTotal:param,
    }
    
    
    total_sells_array.push(data_charts)
    
    localStorage.setItem("TotalSells", JSON.stringify(total_sells_array));
    console.log(data_charts)
    alert("Compra efetuada com sucesso!")
    document.location.reload(true)
    
}