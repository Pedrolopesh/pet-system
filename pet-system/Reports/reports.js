var purchasee_data = JSON.parse(localStorage.getItem("Purchases"));

var cont_employee = 0

window.addEventListener('load', function(){
    infoBoxes()
    renderTask()
});

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


let warningLine = document.querySelector('#newWarning')


let warningData = JSON.parse(localStorage.getItem("Task"))
if (warningData == null){
    warningData = [];
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
  
    // var purchases_box = document.querySelector('#total_sells')
    // var purchase_data = JSON.parse(localStorage.getItem("Purchases"));
    // // console.log(purchase_data)
    // purchases_box.innerHTML = purchase_data.length

    var employees_box = document.querySelector('#tatal_employee')
    var employee_data = JSON.parse(localStorage.getItem("Employee"));
    // console.log(employee_data)
    employees_box.innerHTML = employee_data.length


    var totalPurchase = JSON.parse(localStorage.getItem("Purchases"));
    var lucroVendas = document.querySelector('#tatal_return')
            
    total = 0
    for(i in totalPurchase){
        total = total + parseFloat(totalPurchase[i].quant) * parseFloat(totalPurchase[i].price) ;
    }
    lucroVendas.innerHTML = total

}


function warningShow(){
    var showModal = document.querySelector('#modal')
    console.log(showModal)
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