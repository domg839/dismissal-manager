import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
    getFirestore,
    collection,
    getDocs,
    addDoc,
    onSnapshot,
    query,
    orderBy,
    doc,
    updateDoc,
    deleteDoc
}
from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB9iPtVU6fj2nOC-rtWzHKRJQnfg9zqO2M",
    authDomain: "dismissal-manager-8bcc9.firebaseapp.com",
    projectId: "dismissal-manager-8bcc9",
    storageBucket: "dismissal-manager-8bcc9.firebasestorage.app",
    messagingSenderId: "430939862123",
    appId: "1:430939862123:web:978558085b21662d816d2e"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

window.firebaseServices = {
    db,
    collection,
    getDocs,
    addDoc,
    query,
    orderBy,
    auth,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    doc,
    updateDoc,
    deleteDoc
};

console.log("Firebase Services Ready");

async function loadQueueFromFirestore() {

    const queueQuery =
        query(
            collection(
                db,
                "dismissalQueue"
            ),
            orderBy(
                "queuePosition"
            )
        );

    const querySnapshot =
        await getDocs(
            queueQuery
        );

    let records = [];

    querySnapshot.forEach((doc) => {

        records.push({
            id: doc.id,
            ...doc.data()
        });

    });

    window.dismissalQueue =
        records;

    console.log(
        "Loaded Queue:",
        records
    );

    return records;
}

window.loadQueueFromFirestore =
    loadQueueFromFirestore;

function watchDismissalQueue(callback) {

return onSnapshot(

    query(
        collection(
            db,
            "dismissalQueue"
        ),
        orderBy(
            "queuePosition"
        )
    ),

    {
        includeMetadataChanges: true
    },

    (snapshot) => {

            let records = [];

            snapshot.forEach((doc) => {

                records.push({
                    id: doc.id,
                    pending: doc.metadata.hasPendingWrites,
                    ...doc.data()
                });

            });

            console.log(
                "Realtime Queue:",
                records
            );

            console.log(
                records.map(record => ({
                    tag: record.tag,
                    pending: record.pending
                }))
            );

            callback(records);

        }

    );

}

window.watchDismissalQueue =
    watchDismissalQueue;

function watchDismissalHistory(callback) {

    return onSnapshot(

        collection(
            db,
            "dismissalHistory"
        ),

        (snapshot) => {

            let records = [];

            snapshot.forEach((doc) => {

                records.push({
                    id: doc.id,
                    ...doc.data()
                });

            });

            callback(records);

        }

    );
}

window.watchDismissalHistory =
    watchDismissalHistory;

async function loadSettingsFromFirestore() {

    const settingsQuery =
        await getDocs(
            collection(
                db,
                "settings"
            )
        );

    let settings = {};

    settingsQuery.forEach((doc) => {

        settings = {
            id: doc.id,
            ...doc.data()
        };

    });

    return settings;
}

window.loadSettingsFromFirestore =
    loadSettingsFromFirestore;

function watchSettings(callback) {

    return onSnapshot(

        doc(
            db,
            "settings",
            "config"
        ),

        (snapshot) => {

            if (snapshot.exists()) {

                callback({
                    id: snapshot.id,
                    ...snapshot.data()
                });

            }

        }

    );
}

window.watchSettings =
    watchSettings;

async function getUserRole(email) {

    const querySnapshot =
        await getDocs(

            collection(
                db,
                "users"
            )

        );

    let role =
        "staff";

    querySnapshot.forEach((doc) => {

        const user =
            doc.data();

        if (
            user.email === email
        ) {

            role =
                user.role;

        }

    });

    return role;

}

window.getUserRole =
    getUserRole;