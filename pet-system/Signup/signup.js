var employee_data = JSON.parse(localStorage.getItem("Employee"));

// window.addEventListener("load", function(){ (employId()) }

window.addEventListener('load', function(){
    employId()
    // console.log('datas');
  });

if (employee_data == null){
    employee_data = [];
}

function cancel() {
    document.location.reload(true)
}

function employId(){
    // var employee_id = employee_data.length

    // var employee_id_text = 0

if(employee_data == ''){
    var employeCode = document.querySelector('#employ_code')
    employeCode.innerHTML = 1
}

else{
    for (let i=0; i <employee_data.length; i++){
        let employee_id_text = parseFloat(employee_data[i].id)+1;
        console.log(employee_id_text)
        var employeCode = document.querySelector('#employ_code')
        employeCode.innerHTML = (employee_id_text)
    }
}

}
console.log(employee_data)

function register() {

    var employee_id = employee_data.length + 1

    // if (employee_data.length < 1) {
    //     employee_id = '00000'
    // }else {
    //     previous_id = parseFloat(employee_data[employee_data.length - 1].id)
    //     employee_id = (previous_id + 1) + '';

    //     if(employee_id.length == 1){
    //         employee_id = '0000' + employee_id

    //     }else if(employee_id.length == 2){
    //         employee_id = '000' + employee_id

    //     }else if(employee_id.length == 3){
    //         employee_id = '00' + employee_id

    //     }else if(employee_id.length == 4){
    //         employee_id = '0' + employee_id
    //     }
    // }

    var nome_employee = document.querySelector('#employe_name').value
    var adress_employee = document.querySelector('#employe_adress').value
    var phone_employee = document.querySelector('#employe_phone').value
    var email_employee = document.querySelector('#employe_email').value
    var password_employee = document.querySelector('#employe_password').value
    var comfirmPassword_employee = document.querySelector('#employe_comfirmPassword').value

    data_employee = {
        name: nome_employee,
        adress: adress_employee,
        phone: phone_employee,
        email: email_employee,
        id: employee_id,
        pass: password_employee,
        confirmPass: comfirmPassword_employee,
    }

    

    employee_data.push(data_employee)
    
    
    
    localStorage.setItem("Employee", JSON.stringify(employee_data));
    alert("Cadastro realizado com sucesso!")
    window.location.href = ("../Login/login.html")
}
console.log(employee_data)