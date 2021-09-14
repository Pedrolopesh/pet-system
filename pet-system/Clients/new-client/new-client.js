var client_data = JSON.parse(localStorage.getItem("Client"));

// window.addEventListener("load", function(){ (employId()) }

window.addEventListener('load', function(){
    console.log(client_data)
    clientId()
});

if (client_data == null){
    client_data = [];
}

function cancel() {
    document.location.reload(true)
}

function clientId(){
    if(client_data == ''){
        var clientCode = document.querySelector('#client_id')
        clientCode.innerHTML = 1
    }else{    

        for (let i=0; i <client_data.length; i++){
            let client_id_text = parseFloat(client_data[i].id)+1;
            var clientCode = document.querySelector('#client_id')
            clientCode.innerHTML = client_id_text
        }
}


// for (let i=0; i <employee_data.length; i++){
    
//     let employee_id_text = parseFloat(employee_data[i].id)+1;
    
//     console.log(employee_id_text)
//     var employeCode = document.querySelector('#employ_code')
//     employeCode.innerHTML = (employee_id_text)
// }


}

function register() {

    var client_id = client_data.length+1

    var name_client = document.querySelector('#client_name').value
    var adress_client = document.querySelector('#client_adress').value
    var phone_client = document.querySelector('#client_phone').value
    var email_client = document.querySelector('#client_email').value
    var password_client = document.querySelector('#client_password').value
    // var comfirmPassword_client = document.querySelector('#client_confirmPassword').value

    data_client = {
        name: name_client,
        adress: adress_client,
        phone: phone_client,
        email: email_client,
        id: client_id,
        pass: password_client,
        // confirmPass: comfirmPassword_client,
    }

    

    client_data.push(data_client)
    
    
    
    alert("Cliente Registrado com sucesso")
    

    localStorage.setItem("Client", JSON.stringify(client_data));
    document.location.reload(true)
}
