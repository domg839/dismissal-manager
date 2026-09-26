async function login() {

    const loginButton =
        document.getElementById(
            "loginBtn"
        );

    if (loginButton) {

        loginButton.disabled =
            true;

        loginButton.innerHTML =
            '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Signing In...';

    }

    let email =
        document.getElementById(
            "username"
        ).value.trim();

    let password =
        document.getElementById(
            "password"
        ).value;

    try {

        await window.firebaseServices
            .signInWithEmailAndPassword(

                window.firebaseServices.auth,

                email,

                password

            );

        localStorage.setItem(
            "lastUsername",
            email
        );

        const role =
            await window.getUserRole(
                email
            );

        console.log(
            "Role Found:",
            role
        );

        localStorage.setItem(
            "userRole",
            role
        );

        console.log(
            "Role Saved:",
            localStorage.getItem(
                "userRole"
            )
        );

        window.location.href =
            "home.html";

    }

    catch {

        if (loginButton) {

            loginButton.disabled =
                false;

            loginButton.innerHTML =
                '<i class="fa-solid fa-right-to-bracket"></i> Login';

        }

        await showAlertModal(

            '<i class="fa-solid fa-lock"></i> Login Failed',

            'Invalid email or password.'

        );

    }

}

function togglePassword() {

    const passwordBox =
        document.getElementById(
            "password"
        );

    const icon =
        document.getElementById(
            "passwordIcon"
        );

    if (
        passwordBox.type === "password"
    ) {

        passwordBox.type =
            "text";

        icon.className =
            "fa-solid fa-eye-slash";

    }
    else {

        passwordBox.type =
            "password";

        icon.className =
            "fa-solid fa-eye";

    }

}

function handleLoginKey(event) {

    if (
        event.key === "Enter"
    ) {

        login();

    }

}

window.addEventListener(
    "load",
    () => {

        let savedUsername =
            localStorage.getItem(
                "lastUsername"
            );

        if (
            savedUsername
        ) {

            document.getElementById(
                "username"
            ).value =
                savedUsername;

            document.getElementById(
                "password"
            ).focus();

        }

        window.firebaseServices
            .onAuthStateChanged(

                window.firebaseServices.auth,

                (user) => {

                    if (user) {

                        window.location.href =
                            "home.html";

                    }

                }

            );

    }
);

const demoButton =
    document.getElementById(
        "demoModeBtn"
    );

if (demoButton) {

demoButton.addEventListener(
    "click",
    () => {

        sessionStorage.setItem(
            "demoMode",
            "true"
        );

        console.log(
            "Demo Mode Enabled"
        );

        window.location.href =
            "index.html";

    }
);

}