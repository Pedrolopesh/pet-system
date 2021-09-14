var employee_data = JSON.parse(localStorage.getItem("Employee"));

var cont_employee = 0

window.addEventListener('load', function(){
    information_table()
});

function information_table() {
    
    console.log(employee_data);
    
        
        for(let i = 0; i < employee_data.length; i++){

            // let code = employee_data[i].id;

            // var tableLine = document.querySelector('#line_table')
            
            var code_employe = parseFloat(employee_data[i].id -1)
            

            var infoTable = document.querySelector('#table')

            var tableLine = document.createElement('tr')

            var code = document.createElement('th')
            var nameTable = document.createElement('th')
            var emailTable = document.createElement('th')
            var phoneTable = document.createElement('th')
            var actionTable = document.createElement('th')

            
            code.setAttribute('id','code_table')
            nameTable.setAttribute('class','info-table')
            emailTable.setAttribute('class','info-table')
            phoneTable.setAttribute('class','info-table')
            actionTable.setAttribute('id','action_table')
            
            // var actionLocator = document.querySelector('#action_table')
            
            code.innerHTML = parseFloat(employee_data[i].id)
            nameTable.innerHTML = employee_data[i].name
            emailTable.innerHTML = employee_data[i].email
            phoneTable.innerHTML = employee_data[i].phone
            
            tableLine.appendChild(code)
            tableLine.appendChild(nameTable)
            tableLine.appendChild(emailTable)
            tableLine.appendChild(phoneTable)
            tableLine.appendChild(actionTable)
            
            infoTable.appendChild(tableLine)
            
            var details = document.createElement('button')
            details.setAttribute('id', 'detail_'+code_employe)

            details.setAttribute('class','btn-outline-secondary btn mt-1')
            actionTable.appendChild(details)
            details.innerHTML = 'Detalhes'
            
            let detail = 'detail_'+ code_employe;

            addListeners(detail)
                                   
    }

    
}


function addListeners(selected){
    
    // var modal = document.querySelector('#modal')
    // var showModal = modal.setAttribute('class' , 'modal_background',)
    // showModal.setAttribute('class' , 'modal_showing')
    console.log(selected)
    
    document.querySelector('#' + selected).addEventListener("click", function(){ infoEmployee(selected);showModal(selected) });
}

function infoEmployee(param){
    // client = []
    var employee_data = JSON.parse(localStorage.getItem("Employee"));
    
    var lastChar = param.substring(param.length -1, param.length);
    
    // console.log(lastChar)
    // console.log(typeOf(lastChar))
    
}

function hideModal () {
    var hide = document.querySelector('#modal')
    hide.setAttribute('class' , 'modal_hiding')
}

function showModal (param){
    var modalsowing = document.querySelector('#modal')
    modalsowing.setAttribute('class' , 'modal_background modal_showing')
    console.log(modalsowing)
    
    
    var employee_data = JSON.parse(localStorage.getItem("Employee"));
    var lastChar = param.substring(param.length -1, param.length);

    document.querySelector('#employe_id').innerHTML = employee_data[lastChar].id;
    document.querySelector('#employe_name').innerHTML = employee_data[lastChar].name;
    document.querySelector('#employe_email').innerHTML = employee_data[lastChar].email;
    document.querySelector('#employe_adress').innerHTML = employee_data[lastChar].adress;
    document.querySelector('#employe_phone').innerHTML = employee_data[lastChar].phone;
}