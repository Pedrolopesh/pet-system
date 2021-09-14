var purchases_data = JSON.parse(localStorage.getItem("Purchases"));


window.addEventListener('load', function(){
    information_table()
});

function information_table() {
    
    console.log(purchases_data);
    
        
        for(let i = 0; i < purchases_data.length; i++){

            // let code = purchases_data[i].id;

            // var tableLine = document.querySelector('#line_table')
            
            var product_code = parseFloat(purchases_data[i].productId -1)
            
            console.log(product_code)

            var infoTable = document.querySelector('#table')

            var tableLine = document.createElement('tr')

            var code = document.createElement('th')
            var nameTable = document.createElement('th')
            var priceTable = document.createElement('th')
            var quantTable = document.createElement('th')
            var clientTable = document.createElement('th')
            var employeeTable = document.createElement('th')

            // var actionTable = document.createElement('th')

            
            code.setAttribute('id','code_table')
            nameTable.setAttribute('class','info-table')
            priceTable.setAttribute('class','info-table')
            quantTable.setAttribute('class','info-table')
            clientTable.setAttribute('class','info-table')
            employeeTable.setAttribute('class','info-table')

            // actionTable.setAttribute('id','action_table')
            
            // var actionLocator = document.querySelector('#action_table')
            
            code.innerHTML = parseFloat(purchases_data[i].productId)
            nameTable.innerHTML = purchases_data[i].name
            priceTable.innerHTML = purchases_data[i].price
            quantTable.innerHTML = purchases_data[i].quant
            clientTable.innerHTML = purchases_data[i].client
            employeeTable.innerHTML = purchases_data[i].employee
            
            tableLine.appendChild(code)
            tableLine.appendChild(nameTable)
            tableLine.appendChild(priceTable)
            tableLine.appendChild(quantTable)
            tableLine.appendChild(quantTable)
            tableLine.appendChild(clientTable)
            tableLine.appendChild(employeeTable)
            // tableLine.appendChild(actionTable)
            
            infoTable.appendChild(tableLine)
            
            // var details = document.createElement('button')
            // details.setAttribute('id', 'detail_'+product_code)

            // details.setAttribute('class','btn-outline-secondary btn mt-1')
            // actionTable.appendChild(details)
            // details.innerHTML = 'Detalhes'
            
            // let detail = 'detail_'+ product_code;

            // addListeners(detail)
                                   
    }

    
}


function addListeners(selected){
    
    // var modal = document.querySelector('#modal')
    // var showModal = modal.setAttribute('class' , 'modal_background',)
    // showModal.setAttribute('class' , 'modal_showing')
    console.log(selected)
    
    // document.querySelector('#' + selected).addEventListener("click", function(){ InfoClint(selected);showModal (selected) });
    document.querySelector('#' + selected).addEventListener("click", function(){ InfoSell(selected);showModal(selected)});
}

function InfoSell(param){
    // client = []
    var purchases_data = JSON.parse(localStorage.getItem("Purchases"));
    
    var lastChar = param.substring(param.length -1, param.length);
    
    // console.log(lastChar)
    // console.log(typeOf(lastChar))
    
    // console.log(purchases_data[lastChar])
}

function hideModal () {
    var hide = document.querySelector('#modal')
    hide.setAttribute('class' , 'modal_hiding')
}

function showModal (param){
    var showPurchaseModal = document.querySelector('#modal')
    showPurchaseModal.setAttribute('class' , 'modal_background modal_showing')
    
    
    var purchases_data = JSON.parse(localStorage.getItem("Purchases"));
    var lastChar = param.substring(param.length -1, param.length);

    document.querySelector('#purchase_id').innerHTML = purchases_data[lastChar].productId;
    document.querySelector('#purchase_name').innerHTML = purchases_data[lastChar].name;
    document.querySelector('#purchase_price').innerHTML = purchases_data[lastChar].price;
    document.querySelector('#purchase_quant').innerHTML = purchases_data[lastChar].quant;
    document.querySelector('#purchase_client').innerHTML = purchases_data[lastChar].client;
    document.querySelector('#purchase_employ').innerHTML = purchases_data[lastChar].employee;
}


function deleteItem(param) {

// var purchases_data = JSON.parse(localStorage.getItem("Funcionario"));

    // alert(param)

    if(confirm("Você deseja remover este registro?")){

        var lastChar = param.substring(param.length -5, param.length);
        console.log(lastChar)
        
        let newInfo_employee = purchases_data.filter(function (item) {
            return item.id != lastChar;
        });
        console.log(newInfo_employee)
        
            localStorage.setItem("Employee", JSON.stringify(newInfo_employee));
            document.location.reload(true)
        }

    
}