var purchasee_data = JSON.parse(localStorage.getItem("Purchases"));

var cont_employee = 0

let statusButton = {
    dangerActive: false,
    primaryActive: false,
    warningActive: false
}


var dangerActive = true;
let dangerButton= document.querySelector('#priority_danger')


let primaryActive = true
let primaryButton= document.querySelector('#priority_primary')

let warningActive = true
let warningButton= document.querySelector('#priority_warning')

window.addEventListener('load', function(){
    infoBoxes()
    information_table()
    renderTask()
});


function information_table() {
    
    // console.log(purchasee_data);
    
        
        for(let i = 0; i < purchasee_data.length; i++){

            // let code = purchasee_data[i].id;

            // var tableLine = document.querySelector('#line_table')
            
            var code_purchase = parseFloat(purchasee_data[i].productId-1)
            

            var infoTable = document.querySelector('#table')

            var tableLine = document.createElement('tr')

            var code = document.createElement('th')
            var nameTable = document.createElement('th')
            var priceTable = document.createElement('th')
            var quantTable = document.createElement('th')
            // var actionTable = document.createElement('th')

            
            code.setAttribute('id','code_table')
            nameTable.setAttribute('class','info-table')
            priceTable.setAttribute('class','info-table')
            quantTable.setAttribute('class','info-table')
            // actionTable.setAttribute('id','action_table')
            
            // var actionLocator = document.querySelector('#action_table')
            
            code.innerHTML = parseFloat(purchasee_data[i].productId)
            nameTable.innerHTML = purchasee_data[i].name
            priceTable.innerHTML = purchasee_data[i].price
            quantTable.innerHTML = purchasee_data[i].quant
            
            tableLine.appendChild(code)
            tableLine.appendChild(nameTable)
            tableLine.appendChild(priceTable)
            tableLine.appendChild(quantTable)
            // tableLine.appendChild(actionTable)
            
            infoTable.appendChild(tableLine)
            
            // var details = document.createElement('button')
            // details.setAttribute('id', 'detail_'+code_purchase)

            // details.setAttribute('class','btn-outline-secondary btn mt-1')
            // actionTable.appendChild(details)
            // details.innerHTML = 'Detalhes'
            
            // let detail = 'detail_'+ code_purchase;
            // console.log(detail)
            // addListeners(detail)
                                   
    }

    
}


function addListeners(selected){
    
    // var modal = document.querySelector('#modal')
    // var showModal = modal.setAttribute('class' , 'modal_background',)
    // showModal.setAttribute('class' , 'modal_showing')
    
    // document.querySelector('#' + selected).addEventListener("click", function(){ InfoPurchase(selected);showModal (selected) });
    document.querySelector('#' + selected).addEventListener("click", function(){InfoPurchase(selected)});
}

function InfoPurchase(param){
    // client = []
    var purchasee_data = JSON.parse(localStorage.getItem("Purchases"));
    
    var lastChar = param.substring(param.length -1, param.length);
    
    
    // console.log(lastChar)
    // console.log(typeOf(lastChar))
    
    console.log(purchasee_data[lastChar])
}

function hideModal () {
    var hide = document.querySelector('#modal')
    hide.setAttribute('class' , 'modal_hiding')
}

function showModal (param){
    var apper = document.querySelector('#modal')
    apper.setAttribute('class' , 'modal_background modal_showing')
    
    
    var purchasee_data = JSON.parse(localStorage.getItem("Funcionario"));
    var lastChar = param.substring(param.length -1, param.length);

    document.querySelector('#nomeFuncionario').innerHTML = purchasee_data[lastChar].name;
    document.querySelector('#email_employee').innerHTML = purchasee_data[lastChar].email;
    document.querySelector('#adress_employee').innerHTML = purchasee_data[lastChar].adress;
    document.querySelector('#phone_employee').innerHTML = purchasee_data[lastChar].phone;
}


function warningShow(){
    var showModal = document.querySelector('#modal')
    showModal.setAttribute('class' , 'modal_background modal_showing')
}


function stateSelect(state){
 
    let newState = false;
    if(!statusButton[state + 'Active']){
        newState = true;
    }
    statusButton.dangerActive = false;
    statusButton.primaryActive = false;
    statusButton.warningActive = false;
    statusButton[state + 'Active'] = newState;
    renderStateTag(state)

}
function renderStateTag(state){

    if(!statusButton.dangerActive){
        dangerButton.classList.remove("btn-danger")
        dangerButton.classList.remove("cw")
    }
    if(!statusButton.primaryActive){
        primaryButton.classList.remove("btn-primary")
        primaryButton.classList.remove("cw")
    }
    if(!statusButton.dangerActive){
        warningButton.classList.remove("btn-warning")
        warningButton.classList.remove("cw")
    }
    
    if(statusButton[state + 'Active']){
         if(state == 'danger'){
            dangerButton.classList.add('btn-danger')
            dangerButton.classList.add('cw')
         }else if(state == 'warning'){
            warningButton.classList.add('btn-warning')
            warningButton.classList.add('cw')
         }else if(state == 'primary'){
            primaryButton.classList.add('btn-primary')
            primaryButton.classList.add('cw')
         }
    }

    // var someVarName_10 = "dangerButton";
    // console.log(someVarName_10)
    // console.log(window[someVarName_10])
    
}

let warningLine = document.querySelector('#newWarning')


let warningData = JSON.parse(localStorage.getItem("Task"))
if (warningData == null){
    warningData = [];
}


function printWarning(){
    
    if(statusButton.dangerActive){
        
        let containerLine = document.createElement('div')
        containerLine.setAttribute('class', 'p2 line-box')
        
        warningLine.appendChild(containerLine)
        
        
        let spanIcon = document.createElement('span')
        spanIcon.setAttribute('id', 'icon')
        
        containerLine.appendChild(spanIcon)
        
        spanIcon.innerHTML = `<svg class="circle-danger" aria-hidden="true" focusable="false" data-prefix="far" data-icon="circle" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200z" class=""></path></svg>`
        
        let textWarning = document.querySelector('#text').value
        let textspan = document.createElement('span')
        textspan.setAttribute('class', 'ml-3 mr-3')
        containerLine.appendChild(textspan)

        textspan.innerHTML = textWarning


        let objTask = {
            status: statusButton,
            text:textWarning
        }
        warningData.push(objTask)
        localStorage.setItem("Task", JSON.stringify(warningData));
    }


    if(statusButton.primaryActive){
        
        let containerLine = document.createElement('div')
        containerLine.setAttribute('class', 'p2 line-box')
        
        warningLine.appendChild(containerLine)
        
        
        let spanIcon = document.createElement('span')
        spanIcon.setAttribute('id', 'icon')
        
        containerLine.appendChild(spanIcon)
        
        spanIcon.innerHTML = `<svg class="circle-primary" aria-hidden="true" focusable="false" data-prefix="far" data-icon="circle" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200z" class=""></path></svg>`
        
        let textWarning = document.querySelector('#text').value
        let textspan = document.createElement('span')
        textspan.setAttribute('class', 'ml-3 mr-3')
        containerLine.appendChild(textspan)

        textspan.innerHTML = textWarning


        let objTask = {
            status: statusButton,
            text:textWarning
        }
        warningData.push(objTask)
        localStorage.setItem("Task", JSON.stringify(warningData));
    }


    if(statusButton.warningActive){
        
        let containerLine = document.createElement('div')
        containerLine.setAttribute('class', 'p2 line-box')
        
        warningLine.appendChild(containerLine)
        
        
        let spanIcon = document.createElement('span')
        spanIcon.setAttribute('id', 'icon')
        
        containerLine.appendChild(spanIcon)
        
        spanIcon.innerHTML = `<svg class="circle-warning" aria-hidden="true" focusable="false" data-prefix="far" data-icon="circle" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200z" class=""></path></svg>`
        
        let textWarning = document.querySelector('#text').value
        let textspan = document.createElement('span')
        textspan.setAttribute('class', 'ml-3 mr-3')
        containerLine.appendChild(textspan)

        textspan.innerHTML = textWarning


        let objTask = {
            status: statusButton,
            text:textWarning
        }
        warningData.push(objTask)
        localStorage.setItem("Task", JSON.stringify(warningData));
    }

    alert("Adicionado a Lista")
    document.location.reload(true)

}





function infoBoxes(){

    var client_box = document.querySelector('#total_clients')
    var client_data = JSON.parse(localStorage.getItem("Client"));
    // console.log(client_data)
    client_box.innerHTML = client_data.length
    
    var product_box = document.querySelector('#total_products')
    var product_data = JSON.parse(localStorage.getItem("Products"));
    // console.log(product_data)
    product_box.innerHTML = product_data.length
  
    var purchases_box = document.querySelector('#tatal_sells')
    var purchase_data = JSON.parse(localStorage.getItem("Purchases"));
    purchases_box.innerHTML = purchase_data.length
    
    
    var totalPurchase = JSON.parse(localStorage.getItem("Purchases"));
    var lucroVendas = document.querySelector('#tatal_return')
    
    total = 0
    for(i in totalPurchase){
        total = total + parseInt(totalPurchase[i].quant) * parseInt(totalPurchase[i].price) ;
    }
    lucroVendas.innerHTML = total

}

function renderTask(){

    var tasks = JSON.parse(localStorage.getItem("Task"));


    for(let i=0;i < tasks.length; i++){
        console.log(tasks[i].status)
    
        
        if(tasks[i].status.dangerActive){
        
            let containerLine = document.createElement('div')
            containerLine.setAttribute('class', 'p2 line-box')
            
            warningLine.appendChild(containerLine)
            
            
            let spanIcon = document.createElement('span')
            spanIcon.setAttribute('id', 'icon')
            
            containerLine.appendChild(spanIcon)
            
            spanIcon.innerHTML = `<svg class="circle-danger" aria-hidden="true" focusable="false" data-prefix="far" data-icon="circle" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200z" class=""></path></svg>`
            
            
            let textWarning = tasks[i].text
            let textspan = document.createElement('span')

            textspan.setAttribute('class', 'ml-3 mr-3')
            containerLine.appendChild(textspan)
            
            textspan.innerHTML = textWarning
        }

        if(tasks[i].status.primaryActive){
        
            let containerLine = document.createElement('div')
            containerLine.setAttribute('class', 'p2 line-box')
            
            warningLine.appendChild(containerLine)
            
            
            let spanIcon = document.createElement('span')
            spanIcon.setAttribute('id', 'icon')
            
            containerLine.appendChild(spanIcon)
            
            spanIcon.innerHTML = `<svg class="circle-primary" aria-hidden="true" focusable="false" data-prefix="far" data-icon="circle" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200z" class=""></path></svg>`
            
            
            let textWarning = tasks[i].text
            let textspan = document.createElement('span')

            textspan.setAttribute('class', 'ml-3 mr-3')
            containerLine.appendChild(textspan)
            
            textspan.innerHTML = textWarning
        }

        if(tasks[i].status.warningActive){
        
            let containerLine = document.createElement('div')
            containerLine.setAttribute('class', 'p2 line-box')
            
            warningLine.appendChild(containerLine)
            
            
            let spanIcon = document.createElement('span')
            spanIcon.setAttribute('id', 'icon')
            
            containerLine.appendChild(spanIcon)
            
            spanIcon.innerHTML = `<svg class="circle-warning" aria-hidden="true" focusable="false" data-prefix="far" data-icon="circle" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200z" class=""></path></svg>`
            
            
            let textWarning = tasks[i].text
            let textspan = document.createElement('span')

            textspan.setAttribute('class', 'ml-3 mr-3')
            containerLine.appendChild(textspan)
            
            textspan.innerHTML = textWarning
        }
            
    }
}