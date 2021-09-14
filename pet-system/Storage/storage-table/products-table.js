var estorage_data = JSON.parse(localStorage.getItem("Products"));

var cont_employee = 0

window.addEventListener('load', function(){
    information_table()
});

function information_table() {
    
    // console.log(estorage_data);
    
        
        for(let i = 0; i < estorage_data.length; i++){

            // let code = estorage_data[i].id;

            // var tableLine = document.querySelector('#line_table')
            
            var product_code = parseFloat(estorage_data[i].id -1)
            

            var infoTable = document.querySelector('#table')

            var tableLine = document.createElement('tr')

            var code = document.createElement('th')
            var nameTable = document.createElement('th')
            var priceTable = document.createElement('th')
            var quantTable = document.createElement('th')
            var actionTable = document.createElement('th')

            
            code.setAttribute('id','code_table')
            nameTable.setAttribute('class','info-table')
            priceTable.setAttribute('class','info-table')
            quantTable.setAttribute('class','info-table')
            actionTable.setAttribute('id','action_table')
            
            // var actionLocator = document.querySelector('#action_table')
            
            code.innerHTML = parseFloat(estorage_data[i].id)
            nameTable.innerHTML = estorage_data[i].name
            priceTable.innerHTML = estorage_data[i].price
            quantTable.innerHTML = estorage_data[i].quant
            
            tableLine.appendChild(code)
            tableLine.appendChild(nameTable)
            tableLine.appendChild(priceTable)
            tableLine.appendChild(quantTable)
            tableLine.appendChild(actionTable)
            
            infoTable.appendChild(tableLine)
            
            var details = document.createElement('button')
            details.setAttribute('id', 'detail_'+product_code)

            details.setAttribute('class','btn-outline-secondary btn mt-1')
            actionTable.appendChild(details)
            details.innerHTML = 'Detalhes'
            
            let detail = 'detail_'+ product_code;

            addListeners(detail)
            
        }
        
        
    }
    
    
    function addListeners(selected){
    
        document.querySelector('#' + selected).addEventListener("click", function(){ InfoProducts(selected);showModal (selected)});
    }
    
    function InfoProducts(param){
        // client = []
        var estorage_data = JSON.parse(localStorage.getItem("Products"));
        
        var lastChar = param.substring(param.length -1, param.length);
        console.log(lastChar)
        
    }
    
    function hideModal() {
        var hide = document.querySelector('#modal')
        hide.setAttribute('class' , 'modal_hiding')
    }
    
    function showModal (param){
        var modalShow = document.querySelector('#modal')
    modalShow.setAttribute('class' , 'modal_showing modal_background')
    
    
    var estorage_data = JSON.parse(localStorage.getItem("Products"));
    var lastChar = param.substring(param.length -1, param.length);

    console.log(estorage_data)

    document.querySelector('#product_id').innerHTML = estorage_data[lastChar].id;
    document.querySelector('#product_name').innerHTML = estorage_data[lastChar].name;
    document.querySelector('#product_price').innerHTML = estorage_data[lastChar].price;
    document.querySelector('#product_quant').innerHTML = estorage_data[lastChar].quant;
}

function funcionario(){
    window.location.href = ("./funcionario.html")
}


function deleteItem(param) {

// var estorage_data = JSON.parse(localStorage.getItem("Funcionario"));

    // alert(param)

    if(confirm("Você deseja remover este registro?")){

        var lastChar = param.substring(param.length -5, param.length);
        console.log(lastChar)
        
        let newInfo_employee = estorage_data.filter(function (item) {
            return item.id != lastChar;
        });
        console.log(newInfo_employee)
        
            localStorage.setItem("Employee", JSON.stringify(newInfo_employee));
            document.location.reload(true)
        }

    
}