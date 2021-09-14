var client_data = JSON.parse(localStorage.getItem("Client"));

var cont_employee = 0

window.addEventListener('load', function(){
    information_table()
});

function information_table() {
    // console.log(client_data);
    
        
        for(let i = 0; i < client_data.length; i++){

            // let code = client_data[i].id;

            // var tableLine = document.querySelector('#line_table')
            
            var code_client = parseFloat(client_data[i].id -1)
            

            var infoTable = document.querySelector('#table')

            var tableLine = document.createElement('tr')

            var code = document.createElement('th')
            var nameTable = document.createElement('th')
            var emailTable = document.createElement('th')
            var phoneTable = document.createElement('th')
            var adressTable = document.createElement('th')
            var actionTable = document.createElement('th')

            
            code.setAttribute('id','code_table')
            nameTable.setAttribute('class','info-table')
            emailTable.setAttribute('class','info-table')
            phoneTable.setAttribute('class','info-table')
            adressTable.setAttribute('class','info-table')
            actionTable.setAttribute('id','action_table')
            
            // var actionLocator = document.querySelector('#action_table')
            
            code.innerHTML = parseFloat(client_data[i].id)
            nameTable.innerHTML = client_data[i].name
            emailTable.innerHTML = client_data[i].email
            adressTable.innerHTML = client_data[i].adress
            phoneTable.innerHTML = client_data[i].phone
            
            tableLine.appendChild(code)
            tableLine.appendChild(nameTable)
            tableLine.appendChild(emailTable)
            tableLine.appendChild(phoneTable)
            tableLine.appendChild(adressTable)
            tableLine.appendChild(actionTable)
            
            infoTable.appendChild(tableLine)
            
            var details = document.createElement('button')
            details.setAttribute('id', 'detail_'+code_client)

            details.setAttribute('class','btn-outline-secondary btn mt-1')
            actionTable.appendChild(details)
            details.innerHTML = 'Detalhes'
            
            let detail = 'detail_'+ code_client;

            addListeners(detail)
                                   
    }

    
}


function addListeners(selected){
    
    // var modal = document.querySelector('#modal')
    // var showModal = modal.setAttribute('class' , 'modal_background',)
    // showModal.setAttribute('class' , 'modal_showing')
    console.log(selected)
    
    document.querySelector('#' + selected).addEventListener("click", function(){ infoClient(selected);showModal (selected) });
}

function infoClient(param){
    // client = []
    var client_data = JSON.parse(localStorage.getItem("Client"));
    
    var lastChar = param.substring(param.length -1, param.length);
    
    // console.log(lastChar)
    // console.log(typeOf(lastChar))
    
    console.log(client_data[lastChar])
}

function hideModal () {
    var hide = document.querySelector('#modal')
    hide.setAttribute('class' , 'modal_hiding')
}

function showModal (param){
    var showingModal = document.querySelector('#modal')
    showingModal.setAttribute('class' , 'modal_background modal_showing')
    
    
    var client_data = JSON.parse(localStorage.getItem("Client"));
    var lastChar = param.substring(param.length -1, param.length);
    
    document.querySelector('#client_id').innerHTML = client_data[lastChar].id;
    document.querySelector('#client_name').innerHTML = client_data[lastChar].name;
    document.querySelector('#client_email').innerHTML = client_data[lastChar].email;
    document.querySelector('#client_addres').innerHTML = client_data[lastChar].adress;
    document.querySelector('#client_phone').innerHTML = client_data[lastChar].phone;
}

function funcionario(){
    window.location.href = ("./funcionario.html")
}


function deleteItem(param) {

// var client_data = JSON.parse(localStorage.getItem("Funcionario"));

    // alert(param)

    if(confirm("Você deseja remover este registro?")){

        var lastChar = param.substring(param.length -5, param.length);
        console.log(lastChar)
        
        let newInfo_employee = client_data.filter(function (item) {
            return item.id != lastChar;
        });
        console.log(newInfo_employee)
        
            localStorage.setItem("Funcionario", JSON.stringify(newInfo_employee));
            document.location.reload(true)
        }

    
}