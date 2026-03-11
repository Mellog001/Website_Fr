// login

document.getElementById("loginForm")?.addEventListener("submit", function(e){

e.preventDefault()

window.location.href="dashboard.html"

})


// signup

document.getElementById("signupForm")?.addEventListener("submit", function(e){

e.preventDefault()

alert("Account created successfully!")

window.location.href="dashboard.html"

})