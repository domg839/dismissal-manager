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
    updateDoc
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

const db = getFirestore(app);

window.firebaseServices = {
    db,
    collection,
    addDoc,
    query,
    orderBy,
    doc,
    updateDoc
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

        (snapshot) => {

            let records = [];

            snapshot.forEach((doc) => {

                records.push({
                    id: doc.id,
                    ...doc.data()
                });

            });

            console.log(
    "Realtime Queue:",
    records
);

callback(records);

        }

    );
}

window.watchDismissalQueue =
    watchDismissalQueue;