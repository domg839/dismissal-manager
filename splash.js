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

    const isDemoMode =
        sessionStorage.getItem(
            "demoMode"
        ) === "true";

    if (isDemoMode) {

        window.location.href =
            "home.html";

        return;

    }

    window.firebaseServices
        .onAuthStateChanged(

            window.firebaseServices.auth,

            (user) => {

                if (user) {

                    window.location.href =
                        "home.html";

                }
                else {

                    window.location.href =
                        "login.html";

                }

            }

        );

}, 2200);