if (

    localStorage.getItem(
        "loggedIn"
    ) === "true"

) {

    window.location.href =
        "index.html";

}

async function login() {

    let username =
        document.getElementById(
            "username"
        ).value.trim();

    let password =
        document.getElementById(
            "password"
        ).value;

    if (
        username === "demo" &&
        password === "demo"
    ) {

        localStorage.setItem(
            "loggedIn",
            "true"
        );

        localStorage.setItem(
            "lastUsername",
            username
        );

        window.location.href =
            "index.html";

        return;

    }

    await showAlertModal(
        '<i class="fa-solid fa-lock"></i> Login Failed',
        'Invalid username or password.'
    );

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

    }
);