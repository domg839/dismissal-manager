const statusText =
    document.getElementById(
        "splashStatus"
    );

let dots = 0;

setInterval(() => {

    dots++;

    if (
        dots > 3
    ) {

        dots = 1;

    }

    statusText.textContent =
        "Preparing Dismissal System" +
        ".".repeat(dots);

}, 500);

setTimeout(() => {

    document.body.classList.add(
        "fade-out"
    );

}, 1800);

setTimeout(() => {

    if (

        localStorage.getItem(
            "loggedIn"
        ) === "true"

    ) {

        window.location.href =
            "home.html";

    }
    else {

        window.location.href =
            "login.html";

    }

}, 2200);