document.addEventListener("DOMContentLoaded", function(){
    const token = sessionStorage.getItem("token");
const usuario = sessionStorage.getItem("usuario");
const expiration = sessionStorage.getItem("expiration");

const now = new Date().getTime();

if (!token || !usuario || !expiration) {
    sessionStorage.clear(); // Limpia todo para que no quede basura
    document.querySelector('body').style.display = "none";
    alert("Acceso Denegado. Inicia sesión nuevamente.");
    window.location.href = "/admin";
}else if(now > expiration){
    Swal.fire({
        title: "Sesion Expirada",
        text: "Por favor, vuelva a ingresar nuevamente",
        icon: "warning",
        showCancelButton: false,
        confirmButtonColor: "#d33",
        confirmButtonText: "OK"
    });
}


document.getElementById("alerta").addEventListener("click", function(){
    // e.defaultPrevented;
    let alert = document.getElementById("alert");
    alert.style.opacity = "0";
});

});
