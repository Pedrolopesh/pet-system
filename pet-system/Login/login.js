var employee_data = JSON.parse(localStorage.getItem("Employee"));
console.log(employee_data)

function validate() {
    var email = document.querySelector('#email').value
    var pass = document.querySelector('#password').value

    for(let i = 0; i < employee_data.length; i++){

        if (email == employee_data[i].email && pass == employee_data[i].pass){
            alert("Bem Vindo!")
            window.location.href = ("../Home/dasboard.html")
        } else {
            console.log("deu boa")
            // alert('Senha Incorreta ou login incorreto, Tente Novamente')
        }
    }
}



function hideModal () {
    var hide = document.querySelector('#modal')
    hide.setAttribute('class' , 'modal_hiding')
}

function showModal (){
    var showPurchaseModal = document.querySelector('#modal')
    showPurchaseModal.setAttribute('class' , 'modal_background modal_showing')
}

function defaultData() {
    const defaultData = localStorage.getItem("Employee");
    const defaultDataFormated = JSON.parse(defaultData) 
    console.log('defaultDataFormated', defaultDataFormated)
    const filterItem = defaultDataFormated.filter((item) => { return item.name === 'test'})
    if(filterItem.length === 0) {
        console.log('filterItem', filterItem)
        data_employee = {
            name: 'test',
            adress: 'test',
            phone: 'test',
            email: 'test',
            id: 'test',
            pass: 'test',
            confirmPass: 'test',
        }
        employee_data.push(data_employee)
        localStorage.setItem("Employee", JSON.stringify(employee_data));
    
    }
}

setTimeout(() => {
    defaultData()
}, 1000)