let dismissalQueue = [];

let endingDismissal = false;
let dismissalEnding = false;

let totalAlerts = 0;
let totalRequestSeconds = 0;
let completedRequests = 0;
let START_SPOT = 3;
let END_SPOT = 10;
let CARS_DISPLAYED = 25;
let dismissalStartTime = null;
let SCHOOL_NAME = "School";
let rainyDay = false;
let showSpotsOnBoard = false;
let boardReleaseEnabled = false;

async function loadSettingsFromFirebase() {

    const settings =
        await window.loadSettingsFromFirestore();

    if (!settings) {
        return;
    }

    SCHOOL_NAME =
        settings.schoolName || "School";

    START_SPOT =
        settings.startSpot || 3;

    END_SPOT =
        settings.endSpot || 10;

    CARS_DISPLAYED =
        settings.carsDisplayed || 25;

    dismissalStartTime =
        settings.dismissalStartTime || null;

    dismissalEnding =
        settings.dismissalEnding || false;    

    showSpotsOnBoard =
        settings.showSpotsOnBoard || false;

    boardReleaseEnabled =
        settings.boardReleaseEnabled || false;    

    rainyDay =
        settings.rainyDay || false;    

    console.log(
        "Settings Loaded:",
        settings
    );

    return settings;
}

renderQueue();

function renderQueue() {

    let recentEntries =
        document.getElementById("recentEntries");

    if (!recentEntries) {
        return;
    }

    recentEntries.innerHTML = "";

    if (
        dismissalQueue.length === 0
    ) {

        recentEntries.innerHTML = `
            <div class="empty-queue">
                No recent entries yet.
            </div>
        `;

        return;
    }

    let tagCounts = {};

    dismissalQueue.forEach(student => {

        let tags =
            student.tag.split(" ");

        tags.forEach(tag => {

            tagCounts[tag] =
                (tagCounts[tag] || 0) + 1;

        });

    });

    for (
        let i = dismissalQueue.length - 1;
        i >= 0;
        i--
    ) {

        let student =
            dismissalQueue[i];

        let tagDisplay = "";

        if (
            student.editedFrom
        ) {

            let isDuplicate =
    dismissalQueue.some(
        item =>
            item.id !== student.id &&
            item.tag
                .split(" ")
                .includes(student.tag)
    );

let editedClass =
    isDuplicate
        ? "duplicate-tag edited-new"
        : "queue-tag edited-new";

            if (
                student.released
            ) {

                editedClass +=
                    " released-tag";

            }
            else if (
                student.needsStudent
            ) {

                editedClass +=
                    " alert-tag";

            }

            if (
                student.pending
            ) {

                editedClass +=
                    " pending-tag";

            }

            tagDisplay = `
                <span class="queue-tag">
                    ${student.editedFrom}
                </span>

                →

                <span class="${editedClass}">
                    ${student.tag}
                </span>
            `;

        }
        else {

            let tags =
                student.tag.split(" ");

            tagDisplay =
                tags.map(tag => {

                    let cssClass =
                        student.pending
                            ? "queue-tag pending-tag"
                            : "queue-tag";

                    if (
                        student.released
                    ) {

                        cssClass =
                            student.pending
                                ? "queue-tag released-tag pending-tag"
                                : "queue-tag released-tag";

                    }
                    else if (
                        student.needsStudent
                    ) {

                        cssClass =
                            student.pending
                                ? "queue-tag alert-tag pending-tag"
                                : "queue-tag alert-tag";

                    }
                    else if (
                        tagCounts[tag] > 1
                    ) {

                        cssClass =
                            student.pending
                                ? "duplicate-tag pending-tag"
                                : "duplicate-tag";

                    }

                    return `
                        <span class="${cssClass}">
                            ${tag}
                        </span>
                    `;

                }).join("");

        }

        recentEntries.innerHTML += `
            <div class="queue-item">

                <span>

                    <span class="queue-position">
                        ${student.queuePosition}.
                    </span>

                    <span class="queue-status ${
                        student.pending
                            ? "status-saving"
                            : "status-saved"
                    }">

                        <i class="fa-solid ${
                            student.pending
                                ? "fa-arrows-rotate"
                                : "fa-check"
                        }"></i>

                    </span>

                    ${tagDisplay}

                </span>

                <div class="queue-actions">

                    <button
                        ${student.pending ? "disabled" : ""}
                        onclick="editVehicle(${i})">

                        <i class="fa-solid fa-pen"></i>

                    </button>

                    <button
                        ${student.pending ? "disabled" : ""}
                        onclick="deleteVehicle(${i})">

                        <i class="fa-solid fa-trash"></i>

                    </button>

                </div>

            </div>
        `;

    }

}

async function addVehicle() {

    let tagInput =
        document.getElementById(
            "tagInput"
        );

    let tagNumber =
        tagInput.value.trim();

    if (tagNumber === "") {
        return;
    }

    if (
        dismissalQueue.some(
            item => item.tag === tagNumber
        )
    ) {

let proceed =
    await showConfirmModal(
        '<i class="fa-solid fa-copy"></i> Duplicate Tag',
        tagNumber +
        " is already in the queue.\n\nDo you want to add it again?"
    );

        if (!proceed) {

            tagInput.focus();

            return;

        }

    }

    const spotCount =
        END_SPOT - START_SPOT + 1;

    const assignedSpot =
        START_SPOT +
        (dismissalQueue.length % spotCount);

    const nextQueuePosition =
        Math.max(
            ...dismissalQueue.map(
                item =>
                    item.queuePosition || 0
            ),
            0
        ) + 1;

    const studentRecord = {

        tag: tagNumber,

        queuePosition:
            nextQueuePosition,

        spot:
            assignedSpot,

        released: false,

        needsStudent: false,

        syncStatus: "saving"

    };

    addVehicleToFirebase(
        studentRecord
    );

    renderQueue();

    let recentCard =
        document.querySelector(
            ".recent-card"
        );

    if (recentCard) {

        recentCard.scrollTop =
            0;

    }

    tagInput.value = "";

    tagInput.focus();

}

async function deleteVehicleFirebase(student) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        await window.firebaseServices.deleteDoc(
            docRef
        );

        console.log(
            "Student deleted"
        );

    } catch (error) {

        console.error(error);

    }
}

async function deleteVehicle(index) {

    let student =
        dismissalQueue[index];

let proceed;

if (student.released) {

    proceed =
await showConfirmModal(

    '<i class="fa-solid fa-trash"></i> Delete Released Tag',

    "Tag " +
    student.tag +
    " has already been released.\n\n" +
    "Released tags should normally remain in the queue.\n\n" +
    "Delete anyway?",

    "Delete Tag",

    "modal-danger"

);

} else {

    proceed =
await showConfirmModal(

    '<i class="fa-solid fa-trash"></i> Delete Tag',

    "Remove tag " +
    student.tag +
    "?",

    "Delete",

    "modal-danger"

);

}

    if (!proceed) {
        return;
    }

    await deleteVehicleFirebase(
        student
    );

}

async function editVehicle(index) {

    let student =
        dismissalQueue[index];

    let oldTag =
        student.tag;

    let newTag =
await showPromptModal(
    '<i class="fa-solid fa-pen"></i> Edit Tag Number',
    "Update the vehicle tag.",
    oldTag,
    "Save"
);

    if (
        newTag === null ||
        newTag.trim() === ""
    ) {
        return;
    }

    newTag =
        newTag.trim();

    if (
        dismissalQueue.some(
            item =>
                item.tag === newTag &&
                item.id !== student.id
        )
    ) {

let proceed =
    await showConfirmModal(

        '<i class="fa-solid fa-triangle-exclamation"></i> Duplicate Tag',

        newTag +
        " is already in the queue.\n\nDo you want to use it anyway?",

        "Use Tag",

        "modal-warning"

    );

        if (!proceed) {
            return;
        }

    }

    await editVehicleFirebase(
        student,
        newTag,
        oldTag
    );

}

function toggleRelease(tag) {

    tag.classList.toggle("released");

}

function renderDismissalBoard() {

    let board =
        document.getElementById("dismissalBoard");

    if (!board) {
        return;
    }

    board.innerHTML = "";

    let activeStudents =
        dismissalQueue.filter(
                student => !student.released
            );

    activeStudents.sort(function (a, b) {

        if (
            a.needsStudent &&
            !b.needsStudent
        ) {
            return -1;
        }

        if (
            !a.needsStudent &&
            b.needsStudent
        ) {
            return 1;
        }

        return 0;

    });

    activeStudents =
        activeStudents.slice(
            0,
            CARS_DISPLAYED
        );

let columns =
    Math.ceil(
        Math.sqrt(
            CARS_DISPLAYED
        )
    );

let rows =
    Math.ceil(
        CARS_DISPLAYED /
        columns
    );

    board.style.gridTemplateColumns =
        `repeat(${columns}, 1fr)`;

    board.style.gridTemplateRows =
        `repeat(${rows}, 1fr)`;    

    for (
        let i = 0;
        i < CARS_DISPLAYED;
        i++
    ) {

        if (activeStudents[i]) {

let tagDisplay =
    activeStudents[i].needsStudent
        ? `⚠ ${activeStudents[i].tag}`
        : activeStudents[i].tag;

if (showSpotsOnBoard) {

    tagDisplay = `
        ${activeStudents[i].needsStudent ? "⚠ " : ""}
        ${activeStudents[i].tag}

<span class="board-spot">
    #${
        START_SPOT +
        (i % (
            END_SPOT -
            START_SPOT +
            1
        ))
    }
</span>
    `;

}

let alertClass =
    activeStudents[i].needsStudent
        ? "board-alert"
        : "";

let fontClass =
    "board-large";

let displayLength =
    activeStudents[i].tag.length;

board.innerHTML += `
    <div class="
        board-tile
        ${alertClass}
        ${fontClass}
    "

    ${
        boardReleaseEnabled
            ? `onclick="releaseStudentFromBoard('${activeStudents[i].id}')"`
            : ""
    }

    >

        ${tagDisplay}

    </div>
`;

        } else {

            board.innerHTML += `
                <div class="
                    board-tile
                    board-empty
                ">
                </div>
            `;
        }
    }
}

function renderReleaseBoard() {

    let board =
        document.getElementById("releaseBoard");

    if (!board) {
        return;
    }

    board.innerHTML = "";

    let maxColumns = 25;

    for (
        let spot = START_SPOT;
        spot <= END_SPOT;
        spot++
    ) {

        let studentsForSpot =
            dismissalQueue.filter(
                student => student.spot === spot
            );

        if (
            studentsForSpot.length >
            maxColumns
        ) {
            maxColumns =
                studentsForSpot.length;
        }
    }

    let spotWidth =
        window.innerWidth <= 600
            ? 70
            : 90;

    board.style.gridTemplateColumns =
        `${spotWidth}px repeat(${maxColumns}, 140px)`;

    for (
        let spot = START_SPOT;
        spot <= END_SPOT;
        spot++
    ) {

        board.innerHTML += `
            <div class="spot-cell">
                ${spot}
            </div>
        `;

let activeStudents =
    [...dismissalQueue]
        .sort(
            (a, b) =>
                a.queuePosition -
                b.queuePosition
        );

let spotStudents =
    activeStudents.filter(
        (student, index) =>
            START_SPOT +
            (index % (
                END_SPOT -
                START_SPOT +
                1
            )) === spot
    );

        for (
            let col = 0;
            col < maxColumns;
            col++
        ) {

            if (spotStudents[col]) {

                let statusClass = "";

                if (spotStudents[col].released) {

                    statusClass = "released";

                }
                else if (
                    spotStudents[col].needsStudent
                ) {

                    statusClass =
                        "needs-student";
                }

board.innerHTML += `
    <div
        class="release-cell ${statusClass}"
        onclick="releaseStudent('${spotStudents[col].id}')">

        ${spotStudents[col].needsStudent ? "⚠ " : ""}
        ${spotStudents[col].tag}

        ${spotStudents[col].needsStudent &&
          spotStudents[col].requestedAt
            ? `<div class="spot-alert-age">
                ${getAlertAge(
                    spotStudents[col]
                )}
               </div>`
            : ""}

    </div>
`;

            } else {

                board.innerHTML += `
                    <div class="release-cell empty-cell"></div>
                `;
            }
        }
    }
}

function releaseStudent(studentId) {

let student =
    dismissalQueue.find(
        item => item.id === studentId
    );

    if (!student) {
        return;
    }

if (!dismissalStartTime) {

    dismissalStartTime =
        new Date().toISOString();

    updateDismissalStartTime(
        dismissalStartTime
    );

}

    releaseStudentFirebase(
        student
    );

}

async function loadSettings() {

    let schoolBox =
        document.getElementById("schoolName");

    let startBox =
        document.getElementById("startSpot");

    let endBox =
        document.getElementById("endSpot");

    let carsBox =
        document.getElementById("carsDisplayed");

    let spotsBoardBox =
        document.getElementById(
            "showSpotsOnBoard"
        );

    let boardReleaseBox =
        document.getElementById(
            "boardReleaseEnabled"
        );

    if (
        !schoolBox ||
        !startBox ||
        !endBox ||
        !carsBox ||
        !spotsBoardBox ||
        !boardReleaseBox
    ) {
        return;
    }

    const settings =
        await window.loadSettingsFromFirestore();

    if (!settings) {
        return;
    }

    schoolBox.value =
        settings.schoolName || "";

    startBox.value =
        settings.startSpot || 3;

    endBox.value =
        settings.endSpot || 10;

    carsBox.value =
        settings.carsDisplayed || 25;

    spotsBoardBox.checked =
        settings.showSpotsOnBoard || false;

    boardReleaseBox.checked =
        settings.boardReleaseEnabled || false;

}

async function saveSettings() {

    let schoolBox =
        document.getElementById(
            "schoolName"
        );

    let startBox =
        document.getElementById(
            "startSpot"
        );

    let endBox =
        document.getElementById(
            "endSpot"
        );

    let carsBox =
        document.getElementById(
            "carsDisplayed"
        );

    let spotsBoardBox =
        document.getElementById(
            "showSpotsOnBoard"
        );

    let boardReleaseBox =
        document.getElementById(
            "boardReleaseEnabled"
        );

    let startValue =
        parseInt(
            startBox.value
        );

    let endValue =
        parseInt(
            endBox.value
        );

    let carsValue =
        parseInt(
            carsBox.value
        );

    if (
        isNaN(startValue) ||
        isNaN(endValue) ||
        isNaN(carsValue)
    ) {

await showAlertModal(
    '<i class="fa-solid fa-triangle-exclamation"></i> Invalid Settings',
            "Please enter valid values."
        );

        return;

    }

    await saveSettingsToFirebase({

        schoolName:
            schoolBox.value,

        startSpot:
            startValue,

        endSpot:
            endValue,

        carsDisplayed:
            carsValue,

        showSpotsOnBoard:
            spotsBoardBox.checked,

        boardReleaseEnabled:
            boardReleaseBox.checked

    });

    const saveButton =
        document.getElementById(
            "saveSettingsBtn"
        );

    if (saveButton) {

saveButton.innerHTML =
    '<i class="fa-solid fa-check"></i> Saved';

saveButton.classList.add(
    "settings-saved"
);

setTimeout(
    () => {

        saveButton.innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Save Settings';

        saveButton.classList.remove(
            "settings-saved"
        );

    },
    2000
);

    }

}

function renderSpotManager() {

    let board =
        document.getElementById("spotManagerBoard");

    if (!board) {
        return;
    }

    board.innerHTML = "";

    let maxColumns = 25;

    for (
        let spot = START_SPOT;
        spot <= END_SPOT;
        spot++
    ) {

        let studentsForSpot =
            dismissalQueue.filter(
                student => student.spot === spot
            );

        if (
            studentsForSpot.length >
            maxColumns
        ) {
            maxColumns =
                studentsForSpot.length;
        }
    }

    let spotWidth =
    window.innerWidth <= 600
        ? 70
        : 90;

board.style.gridTemplateColumns =
    `${spotWidth}px repeat(${maxColumns}, 140px)`;

    for (
        let spot = START_SPOT;
        spot <= END_SPOT;
        spot++
    ) {

        board.innerHTML += `
            <div class="spot-cell">
                ${spot}
            </div>
        `;

let activeStudents =
    [...dismissalQueue]
        .sort(
            (a, b) =>
                a.queuePosition -
                b.queuePosition
        );

let spotStudents =
    activeStudents.filter(
        (student, index) =>
            START_SPOT +
            (index % (
                END_SPOT -
                START_SPOT +
                1
            )) === spot
    );

        for (
            let col = 0;
            col < maxColumns;
            col++
        ) {

            if (spotStudents[col]) {

                let statusClass = "";

                if (spotStudents[col].released) {

                    statusClass = "released";

                } else if (
                    spotStudents[col].needsStudent
                ) {

                    statusClass = "needs-student";
                }

board.innerHTML += `
<div
    class="release-cell ${statusClass}"
    data-student-id="${spotStudents[col].id}"
    onclick="requestStudent('${spotStudents[col].id}')">

        ${spotStudents[col].needsStudent ? "⚠ " : ""}
        ${spotStudents[col].tag}

        ${spotStudents[col].needsStudent &&
          spotStudents[col].requestedAt
            ? `<div class="spot-alert-age">
${getAlertAge(
    spotStudents[col]
)}
               </div>`
            : ""}

    </div>
`;


            } else {

                board.innerHTML += `
                    <div class="release-cell empty-cell"></div>
                `;
            }
        }
    }
}

async function requestStudent(studentId) {

    let student =
        dismissalQueue.find(
            item => item.id === studentId
        );

    if (!student) {
        return;
    }

    if (student.released) {

await showAlertModal(
    '<i class="fa-solid fa-triangle-exclamation"></i> Student Already Released',
    "Tag " +
    student.tag +
    " has already been released."
);

return;}

    let message =
        student.needsStudent
            ? "Remove student needed alert for tag " +
              student.tag +
              "?"
            : "Send student needed alert for tag " +
              student.tag +
              "?";

let confirmed =
    await showConfirmModal(

student.needsStudent
    ? '<i class="fa-solid fa-user-minus"></i> Cancel Student Request'
    : '<i class="fa-solid fa-user-plus"></i> Request Student',

        message,

        student.needsStudent
            ? "Remove Alert"
            : "Request Student",

        student.needsStudent
            ? "modal-danger"
            : "modal-success"

    );

    if (!confirmed) {
        return;
    }

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        if (!student.needsStudent) {

            const settingsRef =
                window.firebaseServices.doc(
                    window.firebaseServices.db,
                    "settings",
                    "config"
                );

            const settings =
                await window.loadSettingsFromFirestore();

            await window.firebaseServices.updateDoc(
                settingsRef,
                {
                    totalAlerts:
                        (settings.totalAlerts || 0) + 1
                }
            );

        }

        await window.firebaseServices.updateDoc(
            docRef,
            {
                needsStudent:
                    !student.needsStudent,

                requestedAt:
                    !student.needsStudent
                        ? Date.now()
                        : null
            }
        );

        console.log(
            "Student alert updated"
        );

    } catch (error) {

        console.error(error);

    }

}

async function endDismissal() {

    if (!dismissalStartTime) {

await showAlertModal(
    '<i class="fa-solid fa-clock"></i> Dismissal Not Started',
    "Dismissal has not started yet."
);

        return;

    }

    let confirmed =
        await showConfirmModal(

            '<i class="fa-solid fa-flag-checkered"></i> End Dismissal',

            "Are you sure you want to end today's dismissal?\n\nThis will save today's dismissal history and clear the queue.",

            "End Dismissal",

            "modal-danger"

        );

    if (!confirmed) {
        return;
    }

    endingDismissal = true;

    dismissalEnding = true;

    const settingsRef =
        window.firebaseServices.doc(
            window.firebaseServices.db,
            "settings",
            "config"
        );

    await window.firebaseServices.updateDoc(
        settingsRef,
        {
            dismissalEnding: true
        }
    );

    let endButton =
        document.querySelector(
            ".btn-end-admin"
        );

    if (endButton) {

        endButton.disabled = true;

        endButton.innerHTML = `
            <i class="fa-solid fa-arrows-rotate"></i>
            <div>Ending</div>
        `;

    }

    renderCurrentDismissal();

    const currentQueue =
        await getCurrentQueueFromFirestore();

    let releasedCount =
        currentQueue.length;

    let startTime =
        new Date(
            dismissalStartTime
        );

    let endTime =
        new Date();

    let durationMinutes =
        (
            endTime - startTime
        ) / 60000;

    const currentSettings =
        await window.loadSettingsFromFirestore();

    let totalRequestSeconds =
        currentSettings.totalRequestSeconds || 0;

    let completedRequests =
        currentSettings.completedRequests || 0;

    for (const student of currentQueue) {

        if (
            !student.released &&
            student.requestedAt
        ) {

            const requestSeconds =
                Math.floor(
                    (
                        Date.now() -
                        student.requestedAt
                    ) / 1000
                );

            totalRequestSeconds +=
                requestSeconds;

            completedRequests++;

        }

    }

    const historyRecord = {

        date:
            endTime.toLocaleDateString(),

        startTime:
            startTime.toLocaleTimeString(),

        endTime:
            endTime.toLocaleTimeString(),

        carsReleased:
            releasedCount,

        duration:
            durationMinutes,

        carsPerMinute:
            (
                releasedCount /
                Math.max(
                    durationMinutes,
                    1
                )
            ).toFixed(1),

        rainyDay:
            rainyDay,

        totalAlerts:
            currentSettings.totalAlerts || 0,

        averageRequestTime:
            completedRequests > 0
                ? Math.round(
                    totalRequestSeconds /
                    completedRequests
                  )
                : null

    };

    await saveHistoryToFirebase(
        historyRecord
    );

    await clearFirebaseQueue();

    dismissalQueue = [];

    await updateDismissalStartTime(
        null
    );

    await window.firebaseServices.updateDoc(
        settingsRef,
        {
            rainyDay: false,

            dismissalEnding: false,

            totalAlerts: 0,
            totalRequestSeconds: 0,
            completedRequests: 0
        }
    );

    dismissalStartTime = null;

    rainyDay = false;

    dismissalEnding = false;

    let weatherButton =
        document.getElementById(
            "weatherToggle"
        );

    if (weatherButton) {

        weatherButton.innerHTML =
            '<i class="fa-solid fa-sun"></i>';

        weatherButton.classList.remove(
            "rain"
        );

        weatherButton.classList.add(
            "sun"
        );

    }

    location.reload();

}

function formatDuration(minutes) {

    let totalSeconds =
        Math.round(minutes * 60);

    let hours =
        Math.floor(totalSeconds / 3600);

    let mins =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    let seconds =
        totalSeconds % 60;

    if (hours > 0) {

        return `${hours}h ${mins}m ${seconds}s`;

    }

    return `${mins}m ${seconds}s`;
}

function renderHistory() {

renderHistoryDashboard();    

    let historyList =
        document.getElementById(
            "historyList"
        );

    if (!historyList) {
        return;
    }

let history =
    (window.dismissalHistory || [])
        .filter(
            item => !item.deleted
        );

    history.sort((a, b) => {

        let dateA = new Date(
            `${a.date} ${a.endTime}`
        );

        let dateB = new Date(
            `${b.date} ${b.endTime}`
        );

        return dateB - dateA;

    });

    const fastestCPM =
    Math.max(
        ...history.map(
            item =>
                parseFloat(
                    item.carsPerMinute
                ) || 0
        )
    );

const busiestCars =
    Math.max(
        ...history.map(
            item =>
                item.carsReleased || 0
        )
    );


    historyList.innerHTML = "";

    if (history.length === 0) {

        historyList.innerHTML = `
            <div class="history-card">
                No dismissal history yet.
            </div>
        `;

        return;
    }

    for (
        let i = 0;
        i < history.length;
        i++
    ) {

        historyList.innerHTML += `

            <div
    id="history-record-${history[i].id}"
    class="history-card ${
                i === 0
                    ? "latest-history"
                    : ""
            }">

<div class="history-header">

    <div>

        <div class="history-date-group">

            <h2>
                ${history[i].date}
            </h2>

        </div>

        <div class="history-badges">

${i === 0 ? `
    <span class="latest-badge">
        <i class="fa-solid fa-star"></i>
        Latest
    </span>
` : ""}

${parseFloat(history[i].carsPerMinute) === fastestCPM ? `
    <span class="fastest-badge">
        <i class="fa-solid fa-bolt"></i>
        Fastest
    </span>
` : ""}

${history[i].carsReleased === busiestCars ? `
    <span class="busiest-badge">
        <i class="fa-solid fa-car"></i>
        Busiest
    </span>
` : ""}

${history[i].rainyDay ? `
    <span class="rain-badge">
        <i class="fa-solid fa-cloud-rain"></i>
        Rain
    </span>
` : ""}

${history[i].lastEdited ? `
    <span class="edited-badge">
       <i class="fa-solid fa-pen"></i>
       Edited
    </span>
` : ""}

        </div>

    </div>

    <div class="history-actions">

        <button
            class="edit-history"
            onclick="editHistory('${history[i].id}')">

            <i class="fa-solid fa-pen"></i>

        </button>

        <button
            class="delete-history"
            onclick="deleteHistory('${history[i].id}')">

            <i class="fa-solid fa-trash"></i>

        </button>

    </div>

</div>

                <p>
                    Cars Released:
                    <strong>
                        ${history[i].carsReleased}
                    </strong>
                </p>

                <p>
                    Start Time:
                    <strong>
                        ${history[i].startTime}
                    </strong>
                </p>

                <p>
                    End Time:
                    <strong>
                        ${history[i].endTime}
                    </strong>
                </p>

                <p>
                    Duration:
                    <strong>
                        ${formatDuration(
                            history[i].duration
                        )}
                    </strong>
                </p>

                <p>
                    Cars Per Minute:
                    <strong>
                        ${history[i].carsPerMinute}
                    </strong>
                </p>
<p>
    Alerts:
    <strong>
        ${history[i].totalAlerts ?? 0}
    </strong>
</p>

<p>
    Avg Request Time:
    <strong>
        ${
            history[i].averageRequestTime
                ? formatDuration(
                    history[i].averageRequestTime / 60
                  )
                : "None"
        }
    </strong>
</p>

${history[i].lastEdited ? `
    <p class="history-edited">
        Last Edited:
        <strong>
            ${history[i].lastEdited}
        </strong>
    </p>
` : ""}
            </div>

        `;
    }
}



async function deleteHistory(documentId) {

let confirmDelete =
await showConfirmModal(
    '<i class="fa-solid fa-trash"></i> Delete History Record',
    "Move this dismissal record to Recently Deleted?",
    "Move To Deleted",
    "modal-danger"
);

    if (!confirmDelete) {
        return;
    }

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalHistory",
                documentId
            );

        await window.firebaseServices.updateDoc(
            docRef,
            {
                deleted: true,
                deletedAt: Date.now()
            }
        );

        console.log(
            "History record moved to Recently Deleted"
        );

showToast(
    '<i class="fa-solid fa-trash"></i> Moved To Recently Deleted',
    "warning"
);  

    } catch (error) {

        console.error(error);

    }

}

function renderSchoolName() {

    let title =
        document.getElementById(
            "schoolTitle"
        );

    if (!title) {
        return;
    }

    title.innerText =
        SCHOOL_NAME;
}

function renderCurrentDismissal() {

    let stats =
        document.getElementById(
            "currentDismissalStats"
        );

    if (!stats) {
        return;
    }

if (
    endingDismissal ||
    dismissalEnding
) {

    stats.innerHTML = `
        <p>
            <i class="fa-solid fa-arrows-rotate"></i>
            Ending dismissal...
        </p>
    `;

    return;

}

    if (!dismissalStartTime) {

        stats.innerHTML = `
    <p>No active dismissal.</p>
    <p class="helper-text">
        Release a student to begin.
    </p>
`;

        return;

    }

    let startTime =
        new Date(
            dismissalStartTime
        );

    let elapsedText =
        getElapsedTime();

    stats.innerHTML = `

        <div class="current-stats">

            <p>
                <strong>
                    Dismissal In Progress
                </strong>
            </p>

            <p>
                Started:
                ${startTime.toLocaleTimeString()}
            </p>

            <p>
                Elapsed:
                ${elapsedText}
            </p>

        </div>

    `;

}

function getElapsedTime() {

    if (!dismissalStartTime) {
        return "Not Started";
    }

    let start =
        new Date(dismissalStartTime);

    let now =
        new Date();

    let seconds =
        Math.floor(
            (now - start) / 1000
        );

    let hours =
        Math.floor(seconds / 3600);

    let minutes =
        Math.floor(
            (seconds % 3600) / 60
        );

    let remainingSeconds =
        seconds % 60;

    if (hours > 0) {

        return `${hours}h ${minutes}m ${remainingSeconds}s`;

    }

    return `${minutes}m ${remainingSeconds}s`;
}

async function addVehicleToFirebase(student) {

    try {

        await window.firebaseServices.addDoc(

            window.firebaseServices.collection(
                window.firebaseServices.db,
                "dismissalQueue"
            ),

            student

        );

        console.log(
            "Student saved to Firestore"
        );

    } catch (error) {

        console.error(error);

    }

}

async function releaseStudentFirebase(student) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        const newReleasedState =
            !student.released;

        if (
            newReleasedState &&
            student.requestedAt
        ) {

            const requestSeconds =
                Math.floor(
                    (Date.now() -
                    student.requestedAt) / 1000
                );

            const settings =
                await window.loadSettingsFromFirestore();

            const settingsRef =
                window.firebaseServices.doc(
                    window.firebaseServices.db,
                    "settings",
                    "config"
                );

            await window.firebaseServices.updateDoc(
                settingsRef,
                {
                    totalRequestSeconds:
                        (settings.totalRequestSeconds || 0) +
                        requestSeconds,

                    completedRequests:
                        (settings.completedRequests || 0) + 1
                }
            );

        }

        await window.firebaseServices.updateDoc(
            docRef,
            {
                released: newReleasedState,

                releasedAt:
                    newReleasedState
                        ? Date.now()
                        : null
            }
        );

        if (
            student.released &&
            dismissalStartTime
        ) {

            const remainingReleased =
                dismissalQueue.filter(
                    item =>
                        item.released &&
                        item.id !== student.id
                ).length;

            if (remainingReleased === 0) {

                await updateDismissalStartTime(
                    null
                );

                dismissalStartTime = null;

                console.log(
                    "Dismissal start time cleared"
                );

            }

        }

        console.log(
            "Student released"
        );


    } catch (error) {

        console.error(error);

    }

}

async function requestStudentFirebase(student) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        await window.firebaseServices.updateDoc(
            docRef,
            {
                needsStudent: true
            }
        );

        console.log(
            "Student alert saved"
        );

    } catch (error) {

        console.error(error);

    }
}

async function clearFirebaseQueue() {

    const queueRecords =
        await window.loadQueueFromFirestore();

    for (const student of queueRecords) {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        await window.firebaseServices.deleteDoc(
            docRef
        );
    }
}

async function saveHistoryToFirebase(historyRecord) {

    try {

        await window.firebaseServices.addDoc(

            window.firebaseServices.collection(
                window.firebaseServices.db,
                "dismissalHistory"
            ),

            historyRecord

        );

        console.log(
            "History saved to Firestore"
        );

    } catch (error) {

        console.error(error);

    }
}

async function getCurrentQueueFromFirestore() {

    const records =
        await window.loadQueueFromFirestore();

    return records || [];
}

async function saveSettingsToFirebase(settings) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "settings",
                "config"
            );

        await window.firebaseServices.updateDoc(
            docRef,
            settings
        );

        console.log(
            "Settings saved to Firestore"
        );

    } catch (error) {

        console.error(error);

    }
}

async function updateDismissalStartTime(startTime) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "settings",
                "config"
            );

        await window.firebaseServices.updateDoc(
            docRef,
            {
                dismissalStartTime: startTime
            }
        );

    } catch (error) {

        console.error(error);

    }
}

async function editVehicleFirebase(
    student,
    newTag,
    oldTag
) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalQueue",
                student.id
            );

        await window.firebaseServices.updateDoc(
            docRef,
            {
                tag: newTag,
                editedFrom: oldTag
            }
        );

        console.log(
            "Student edited"
        );

    } catch (error) {

        console.error(error);

    }
}

function updateConnectionStatus() {

    let status =
        document.getElementById(
            "connectionStatus"
        );

    if (!status) {
        return;
    }

    if (!navigator.onLine) {

        status.innerHTML =
            "● Offline";

        status.classList.remove(
            "connection-online",
            "connection-syncing"
        );

        status.classList.add(
            "connection-offline"
        );

        return;

    }

    const syncing =
        dismissalQueue.some(
            student => student.pending
        );

    if (syncing) {

        status.innerHTML =
            "● Syncing";

        status.classList.remove(
            "connection-online",
            "connection-offline"
        );

        status.classList.add(
            "connection-syncing"
        );

    } else {

        status.innerHTML =
            "● Connected";

        status.classList.remove(
            "connection-syncing",
            "connection-offline"
        );

        status.classList.add(
            "connection-online"
        );

    }

}

function toggleFullscreen() {

    let button =
        document.getElementById(
            "fullscreenBtn"
        );

    if (
        !document.fullscreenElement
    ) {

        document.documentElement
            .requestFullscreen();

        button.innerHTML =
            '<i class="fa-solid fa-xmark"></i>';

    }
    else {

        document.exitFullscreen();

        button.innerHTML =
            '<i class="fa-solid fa-expand"></i>';

    }

}

document.addEventListener(
    "fullscreenchange",
    () => {

        let button =
            document.getElementById(
                "fullscreenBtn"
            );

        if (!button) {
            return;
        }

        button.innerHTML =
            document.fullscreenElement
                ? '<i class="fa-solid fa-xmark"></i>'
                : '<i class="fa-solid fa-expand"></i>';

    }
);

async function editHistory(documentId) {

    let record =
        window.dismissalHistory.find(
            item => item.id === documentId
        );

    if (!record) {
        return;
    }

    const result =
        await showEditHistoryModal(
            record
        );

    if (!result) {
        return;
    }

    let startTime =
        result.startTime;

    let endTime =
        result.endTime;

    let carsReleased =
        result.carsReleased;

    let rainyDay =
        result.rainyDay;

    if (
        isNaN(carsReleased) ||
        carsReleased < 0
    ) {

await showAlertModal(
    '<i class="fa-solid fa-triangle-exclamation"></i> Invalid Value',
    "Cars Released must be 0 or greater."
);

        return;

    }

    let start =
        new Date(
            `${record.date} ${startTime}`
        );

    let end =
        new Date(
            `${record.date} ${endTime}`
        );

    let duration =
        (
            end - start
        ) / 60000;

    let carsPerMinute =
        (
            carsReleased /
            Math.max(duration, 1)
        ).toFixed(1);

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalHistory",
                documentId
            );

        await window.firebaseServices.updateDoc(
            docRef,
            {
                startTime,
                endTime,
                carsReleased,
                duration,
                carsPerMinute,
                rainyDay,

                lastEdited:
                    new Date()
                        .toLocaleString()
            }
        );

showToast(
    '<i class="fa-solid fa-circle-check"></i> History Updated',
    "success"
);

    } catch (error) {

        console.error(error);

await showAlertModal(
    '<i class="fa-solid fa-circle-xmark"></i> Update Failed',
    "Unable to update the dismissal record."
);

    }

}

async function toggleRainDay() {

    rainyDay = !rainyDay;

    let button =
        document.getElementById(
            "weatherToggle"
        );

    if (!button) {
        return;
    }

    if (rainyDay) {

        button.innerHTML =
            '<i class="fa-solid fa-cloud-rain"></i>';

        button.classList.remove(
            "sun"
        );

        button.classList.add(
            "rain"
        );

    } else {

        button.innerHTML =
            '<i class="fa-solid fa-sun"></i>';

        button.classList.remove(
            "rain"
        );

        button.classList.add(
            "sun"
        );

    }

    const settingsRef =
        window.firebaseServices.doc(
            window.firebaseServices.db,
            "settings",
            "config"
        );

    await window.firebaseServices.updateDoc(
        settingsRef,
        {
            rainyDay
        }
    );

}

function getAlertAge(student) {

    if (!student.requestedAt) {
        return "";
    }

    let endTime =
        student.released &&
        student.releasedAt
            ? student.releasedAt
            : Date.now();

    const elapsedSeconds =
        Math.floor(
            (endTime - student.requestedAt) /
            1000
        );

    const minutes =
        Math.floor(
            elapsedSeconds / 60
        );

    const seconds =
        elapsedSeconds % 60;

    return `${minutes}:${seconds
        .toString()
        .padStart(2, "0")}`;

}


async function releaseStudentFromBoard(studentId) {

    console.log(
        "releaseStudentFromBoard fired",
        studentId
    );

    if (!boardReleaseEnabled) {
        return;
    }

    let student =
        dismissalQueue.find(
            item => item.id === studentId
        );

    if (!student) {
        return;
    }

let confirmed =
await showConfirmModal(
    '<i class="fa-solid fa-person-walking-arrow-right"></i> Release Student',

    student.tag + " → Spot " + student.spot,

    "Release",

    "modal-success"
);

    if (!confirmed) {
        return;
    }

    if (!dismissalStartTime) {

        dismissalStartTime =
            new Date().toISOString();

        await updateDismissalStartTime(
            dismissalStartTime
        );

    }

    releaseStudentFirebase(
        student
    );

}

async function locateStudent() {

let tag =
await showPromptModal(
    '<i class="fa-solid fa-magnifying-glass"></i> Locate Student',
    "Enter a tag number.",
    "",
    "Search"
);

    if (
        tag === null ||
        tag.trim() === ""
    ) {
        return;
    }

    tag =
        tag.trim();

let searchTags =
    tag
        .trim()
        .toUpperCase()
        .split(" ")
        .filter(t => t !== "");

let student =
    dismissalQueue.find(
        item => {

            let itemTags =
                item.tag
                    .toUpperCase()
                    .split(" ")
                    .filter(t => t !== "");

            return searchTags.every(
                searchTag =>
                    itemTags.includes(
                        searchTag
                    )
            );

        }
    );

if (student) {

    await requestStudent(
        student.id
    );

    scrollToStudent(
        student.id
    );

    return;

}

let createAlert =
await showConfirmModal(
    '<i class="fa-solid fa-magnifying-glass"></i> Tag Not Found',

        "Tag " +
        tag +
        " was not found.\n\n" +
        "Create a requested student alert?",

        "Create Alert"
    );

    if (!createAlert) {
        return;
    }

    const nextQueuePosition =
        Math.max(
            ...dismissalQueue.map(
                item =>
                    item.queuePosition || 0
            ),
            0
        ) + 1;

    const spotCount =
        END_SPOT -
        START_SPOT +
        1;

    const assignedSpot =
        START_SPOT +
        (
            dismissalQueue.length %
            spotCount
        );

    const studentRecord = {

        tag: tag,

        queuePosition:
            nextQueuePosition,

        spot:
            assignedSpot,

        released: false,

        needsStudent: true,

        requestedAt:
            Date.now(),

        syncStatus:
            "saving"

    };

    await addVehicleToFirebase(
        studentRecord
    );

setTimeout(() => {

    const createdStudent =
        dismissalQueue.find(
            item =>
                item.tag === tag
        );

    if (createdStudent) {

        scrollToStudent(
            createdStudent.id
        );

    }

}, 1000);    

}

function scrollToStudent(studentId) {

    setTimeout(() => {

        const element =
            document.querySelector(
                `[data-student-id="${studentId}"]`
            );

        if (!element) {
            return;
        }

        const wrapper =
            document.querySelector(
                ".release-board-wrapper"
            );

        if (!wrapper) {
            return;
        }

const targetLeft =
    element.offsetLeft
    - (wrapper.clientWidth / 2)
    + (element.clientWidth / 2);

wrapper.scrollTo({

    left:
        Math.max(0, targetLeft),

    behavior: "smooth"

});

    }, 100);

}

async function restoreHistory(documentId) {

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalHistory",
                documentId
            );

        await window.firebaseServices.updateDoc(
            docRef,
            {
                deleted: false,
                deletedAt: null
            }
        );

console.log(
    "History record restored"
);

showToast(
    '<i class="fa-solid fa-clock-rotate-left"></i> Restored From Recently Deleted',
    "success"
);

    } catch (error) {

        console.error(error);

    }

}

async function deleteHistoryForever(documentId) {

    let confirmed =
        await showConfirmModal(

            '<i class="fa-solid fa-trash-can"></i> Delete Forever',

            "Permanently delete this history record?\n\nThis action cannot be undone.",

            "Delete Forever",

            "modal-danger"

        );

    if (!confirmed) {
        return;
    }

    try {

        const docRef =
            window.firebaseServices.doc(
                window.firebaseServices.db,
                "dismissalHistory",
                documentId
            );

        await window.firebaseServices.deleteDoc(
            docRef
        );

console.log(
    "History record permanently deleted"
);

showToast(
    '<i class="fa-solid fa-trash-can"></i> Permanently Deleted',
    "danger"
);

    } catch (error) {

        console.error(error);

    }

}

function renderDeletedHistory() {

    let historyList =
        document.getElementById(
            "deletedHistoryList"
        );

    if (!historyList) {
        return;
    }

    let history =
        (window.dismissalHistory || [])
            .filter(
                item => item.deleted
            );

    history.sort((a, b) => {

        return (
            (b.deletedAt || 0) -
            (a.deletedAt || 0)
        );

    });

    historyList.innerHTML = "";

    if (history.length === 0) {

        historyList.innerHTML = `
<div class="history-card empty-history-card">
    <i class="fa-solid fa-trash"></i>
    No deleted records.
</div>
        `;

        return;

    }

    history.forEach(record => {

        historyList.innerHTML += `

            <div class="history-card">

                <h2>
                    ${record.date}
                </h2>

                <p>
                    Cars Released:
                    <strong>
                        ${record.carsReleased}
                    </strong>
                </p>

                <p>
                    Start Time:
                    <strong>
                        ${record.startTime}
                    </strong>
                </p>

                <p>
                    End Time:
                    <strong>
                        ${record.endTime}
                    </strong>
                </p>

                <div
                    class="deleted-actions">

                    <button
                        class="restore-history-btn"
                        onclick="
                            restoreHistory(
                                '${record.id}'
                            )
                        ">

                        <i class="fa-solid fa-rotate-left"></i>
                        Restore

                    </button>

                    <button
                        class="delete-forever-btn"
                        onclick="
                            deleteHistoryForever(
                                '${record.id}'
                            )
                        ">

                        <i class="fa-solid fa-trash"></i>
                        Delete Forever

                    </button>

                </div>

            </div>

        `;

    });

}

function showPromptModal(
    titleText,
    messageText,
    defaultValue = "",
    confirmText = "Search"
) {

    return new Promise(
        (resolve) => {

            const modal =
                document.getElementById(
                    "appModal"
                );

            const title =
                document.getElementById(
                    "modalTitle"
                );

            const message =
                document.getElementById(
                    "modalMessage"
                );

            const input =
                document.getElementById(
                    "modalInput"
                );

            const confirmButton =
                document.getElementById(
                    "modalConfirm"
                );

            const cancelButton =
                document.getElementById(
                    "modalCancel"
                );

            title.innerHTML =
                 titleText;

            message.textContent =
                messageText;

            confirmButton.textContent =
                confirmText;

            confirmButton.className =
                 "modal-confirm";
  
            cancelButton.textContent =
                "Cancel";    

            input.value =
                defaultValue;

            input.onkeydown =
    (event) => {

        if (
            event.key === "Enter"
        ) {

            confirmButton.click();

        }

    };

modal.classList.remove(
    "hidden"
);

modal.onclick =
    (event) => {

        if (
            event.target === modal
        ) {

            modal.classList.add(
                "hidden"
            );

            document.onkeydown =
                null;
                
            resolve(
                null
            );

        }

    };

document.onkeydown =
    (event) => {

        if (
            event.key === "Escape"
        ) {

            modal.classList.add(
                "hidden"
            );

            document.onkeydown =
                null;

            resolve(
                null
            );

        }

    };

setTimeout(() => {

    input.focus();

}, 50);

            confirmButton.onclick =
                () => {

                    modal.classList.add(
                        "hidden"
                    );

                    document.onkeydown =
                        null;

                    resolve(
                        input.value
                    );

                };

            cancelButton.onclick =
                () => {

                    modal.classList.add(
                        "hidden"
                    );

                    document.onkeydown =
                        null;

                    resolve(
                        null
                    );

                };

        }

    );

}

function showConfirmModal(
    titleText,
    messageText,
    confirmText = "Confirm",
    confirmClass = "modal-confirm"
) {

    return new Promise(
        (resolve) => {

            const modal =
                document.getElementById(
                    "appModal"
                );

            const title =
                document.getElementById(
                    "modalTitle"
                );

            const message =
                document.getElementById(
                    "modalMessage"
                );

            const input =
                document.getElementById(
                    "modalInput"
                );

            const confirmButton =
                document.getElementById(
                    "modalConfirm"
                );

            const cancelButton =
                document.getElementById(
                    "modalCancel"
                );
  

            title.innerHTML =
                titleText;

            message.textContent =
                messageText;

            input.style.display =
                "none";

            confirmButton.textContent =
                confirmText;

            confirmButton.className =
                `modal-confirm ${confirmClass}`;

            cancelButton.textContent =
                "Cancel";

            modal.classList.remove(
                "hidden"
            );

            modal.onclick =
                (event) => {

                    if (
                        event.target === modal
                    ) {

                        modal.classList.add(
                            "hidden"
                        );

                        document.onkeydown =
                            null;

                        input.style.display =
                            "";

                        resolve(false);

                    }

                };

            document.onkeydown =
                (event) => {

                    if (
                        event.key === "Escape"
                    ) {

                        modal.classList.add(
                            "hidden"
                        );

                        document.onkeydown =
                            null;

                        input.style.display =
                            "";

                        resolve(false);

                    }

                };

            confirmButton.onclick =
                () => {

                    modal.classList.add(
                        "hidden"
                    );

                    document.onkeydown =
                        null;

                    input.style.display =
                        "";

                    resolve(true);

                };

            cancelButton.onclick =
                () => {

                    modal.classList.add(
                        "hidden"
                    );

                    document.onkeydown =
                        null;

                    input.style.display =
                        "";

                    resolve(false);

                };

        }

    );

}

function showAlertModal(
    titleText,
    messageText
) {

    return new Promise(
        (resolve) => {

            const modal =
                document.getElementById(
                    "appModal"
                );

            const title =
                document.getElementById(
                    "modalTitle"
                );

            const message =
                document.getElementById(
                    "modalMessage"
                );

            const input =
                document.getElementById(
                    "modalInput"
                );

            const confirmButton =
                document.getElementById(
                    "modalConfirm"
                );

            const cancelButton =
                document.getElementById(
                    "modalCancel"
                );

            title.innerHTML = 
                titleText;

            message.textContent =
                messageText;

            input.style.display =
                "none";

            cancelButton.style.display =
                "none";

            confirmButton.textContent =
                "OK";

            confirmButton.className =
                "modal-confirm modal-success";

            modal.classList.remove(
                "hidden"
            );

            document.onkeydown =
                (event) => {

                    if (
                        event.key === "Escape"
                    ) {

                        modal.classList.add(
                            "hidden"
                        );

                        document.onkeydown =
                            null;

                        input.style.display =
                            "";

                        cancelButton.style.display =
                            "";

                        confirmButton.className =
                            "modal-confirm";

                        resolve();

                    }

                };

            confirmButton.onclick =
                () => {

                    modal.classList.add(
                        "hidden"
                    );

                    document.onkeydown =
                        null;

                    input.style.display =
                        "";

                    cancelButton.style.display =
                        "";

                    confirmButton.className =
                        "modal-confirm";

                    resolve();

                };

        }

    );

}

function previewHistoryForm() {

    document.getElementById(
        "appModal"
    ).classList.remove(
        "hidden"
    );

    document.getElementById(
        "historyForm"
    ).style.display =
        "block";

}

function showEditHistoryModal(record) {

    return new Promise((resolve) => {

        const modal =
            document.getElementById(
                "appModal"
            );

        const historyForm =
            document.getElementById(
                "historyForm"
            );

        const title =
            document.getElementById(
                "modalTitle"
            );

        const message =
            document.getElementById(
                "modalMessage"
            );

        const input =
            document.getElementById(
                "modalInput"
            );

        const confirmButton =
            document.getElementById(
                "modalConfirm"
            );

        const cancelButton =
            document.getElementById(
                "modalCancel"
            );

        document.querySelector(
            ".history-form-date"
        ).textContent =
            record.date;

        document.getElementById(
            "historyStartTime"
        ).value =
            record.startTime || "";

        document.getElementById(
            "historyEndTime"
        ).value =
            record.endTime || "";

        document.getElementById(
            "historyCarsReleased"
        ).value =
            record.carsReleased || "";

        document.getElementById(
            "historyRainyDay"
        ).checked =
            record.rainyDay || false;

        title.style.display =
            "none";

        message.style.display =
            "none";

        input.style.display =
            "none";

        historyForm.style.display =
            "block";

        confirmButton.textContent =
            "Save Changes";

        confirmButton.className =
            "modal-confirm modal-success";

        modal.classList.remove(
            "hidden"
        );

        modal.onclick =
            (event) => {

                if (
                    event.target !== modal
                ) {
                    return;
                }

                modal.classList.add(
                    "hidden"
                );

                historyForm.style.display =
                    "none";

                title.style.display =
                    "";

                message.style.display =
                    "";

                input.style.display =
                    "";

                modal.onclick =
                    null;

                document.onkeydown =
                    null;

                resolve(null);

            };

        document.onkeydown =
            (event) => {

                if (
                    event.key === "Escape"
                ) {

                    modal.classList.add(
                        "hidden"
                    );

                    historyForm.style.display =
                        "none";

                    title.style.display =
                        "";

                    message.style.display =
                        "";

                    input.style.display =
                        "";

                    modal.onclick =
                        null;

                    document.onkeydown =
                        null;

                    resolve(null);

                }

            };

        confirmButton.onclick =
            () => {

                modal.classList.add(
                    "hidden"
                );

                historyForm.style.display =
                    "none";

                title.style.display =
                    "";

                message.style.display =
                    "";

                input.style.display =
                    "";

                modal.onclick =
                    null;

                document.onkeydown =
                    null;

                resolve({

                    startTime:
                        document.getElementById(
                            "historyStartTime"
                        ).value,

                    endTime:
                        document.getElementById(
                            "historyEndTime"
                        ).value,

                    carsReleased:
                        parseInt(
                            document.getElementById(
                                "historyCarsReleased"
                            ).value
                        ),

                    rainyDay:
                        document.getElementById(
                            "historyRainyDay"
                        ).checked

                });

            };

        cancelButton.onclick =
            () => {

                modal.classList.add(
                    "hidden"
                );

                historyForm.style.display =
                    "none";

                title.style.display =
                    "";

                message.style.display =
                    "";

                input.style.display =
                    "";

                modal.onclick =
                    null;

                document.onkeydown =
                    null;

                resolve(null);

            };

    });

}

function showToast(
    message,
    type = "info",
    duration = 2500
) {

    const toast =
        document.getElementById(
            "toast"
        );

    if (!toast) {
        return;
    }

    toast.className =
        `toast ${type}`;

    toast.innerHTML =
        message;

    toast.classList.remove(
        "hidden"
    );

    toast.classList.add(
        "show"
    );

    clearTimeout(
        toast.timeoutId
    );

    toast.timeoutId =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

                setTimeout(
                    () => {

                        toast.classList.add(
                            "hidden"
                        );

                    },
                    200
                );

            },
            duration
        );

}

function renderHistoryDashboard() {

    let dashboard =
        document.getElementById(
            "historyDashboard"
        );

    if (!dashboard) {
        return;
    }

    let history =
        (window.dismissalHistory || [])
            .filter(
                item => !item.deleted
            );

    if (history.length === 0) {

        dashboard.innerHTML = "";

        return;

    }

    const fastest =
        history.reduce(
            (best, current) =>
                parseFloat(
                    current.carsPerMinute
                ) >
                parseFloat(
                    best.carsPerMinute
                )
                    ? current
                    : best
        );

    const busiest =
        history.reduce(
            (best, current) =>
                (current.carsReleased || 0) >
                (best.carsReleased || 0)
                    ? current
                    : best
        );

    const rainyDays =
        history.filter(
            item => item.rainyDay
        ).length;

    const totalAlerts =
        history.reduce(
            (total, item) =>
                total +
                (item.totalAlerts || 0),
            0
        );

    dashboard.innerHTML = `

        <div class="history-dashboard">

           <div
    class="history-stat-card history-stat-fastest"
    onclick="scrollToHistoryRecord('${fastest.id}')">

               <div class="history-stat-label">
    <i class="fa-solid fa-bolt"></i>
    Fastest Day
</div>

<div class="history-stat-value">
    ${fastest.carsPerMinute}
</div>

<div class="history-stat-date">
    ${fastest.date}
</div>

            </div>

<div
    class="history-stat-card history-stat-busiest"
    onclick="scrollToHistoryRecord('${busiest.id}')">

    <div class="history-stat-label">
        <i class="fa-solid fa-car"></i>
        Busiest Day
    </div>

    <div class="history-stat-value">
        ${busiest.carsReleased}
    </div>

    <div class="history-stat-date">
        ${busiest.date}
    </div>

</div>

<div class="history-stat-card history-stat-rain">

    <div class="history-stat-label">
        <i class="fa-solid fa-cloud-rain"></i>
        Rain Days
    </div>

    <div class="history-stat-value">
        ${rainyDays}
    </div>

    <div class="history-stat-date">
        Across History
    </div>

</div>

<div class="history-stat-card history-stat-alerts">

    <div class="history-stat-label">
        <i class="fa-solid fa-triangle-exclamation"></i>
        Total Alerts
    </div>

    <div class="history-stat-value">
        ${totalAlerts}
    </div>

    <div class="history-stat-date">
        Across History
    </div>

</div>

    `;

}

function scrollToHistoryRecord(
    documentId
) {

    const card =
        document.getElementById(
            `history-record-${documentId}`
        );

    if (!card) {
        return;
    }

    card.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    card.classList.add(
        "history-card-highlight"
    );

    setTimeout(
        () => {

            card.classList.remove(
                "history-card-highlight"
            );

        },
        2000
    );

}

async function logout() {

    let confirmed =
        await showConfirmModal(

            '<i class="fa-solid fa-right-from-bracket"></i> Logout',

            'Are you sure you want to sign out?',

            'Logout',

            'modal-warning'

        );

    if (!confirmed) {

        return;

    }

    await window.firebaseServices.signOut(
        window.firebaseServices.auth
    );

    window.location.href =
        "login.html";

}


